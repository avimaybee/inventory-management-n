import { drizzle } from 'drizzle-orm/d1';
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { eq, desc } from 'drizzle-orm';

const orders = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  partyName: text('party_name').notNull(),
  location: text('location').notNull(),
  status: text('status').notNull().default('pending'),
  totalWeight: real('total_weight').notNull(),
});

const orderLineItems = sqliteTable('order_line_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id').notNull().references(() => orders.id),
  brand: text('brand').notNull(),
  category: text('category').notNull(),
  feedType: text('feed_type').notNull(),
  product: text('product').notNull(),
  packaging: real('packaging').notNull(),
  quantity: integer('quantity').notNull(),
  weight: real('weight').notNull(),
});

function getDb(env: Record<string, any>) {
  if (!env.DB) {
    throw new Error('D1 database binding "DB" is not configured. Add it in Cloudflare Dashboard > Functions > D1 Database Bindings.');
  }
  return drizzle(env.DB);
}

export async function onRequestGet(context) {
  try {
    const env = context.env;
    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'DB binding missing' }), { status: 500 });
    }

    const db = drizzle(env.DB);
    const allOrders = await db.select().from(orders).orderBy(desc(orders.date));
    const allItems = await db.select().from(orderLineItems);

    const ordersWithItems = allOrders.map(o => ({
      ...o,
      items: allItems.filter(i => i.orderId === o.id)
    }));

    return new Response(JSON.stringify(ordersWithItems), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to fetch orders' }), { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const db = getDb(context.env);
    const { partyName, location, items } = await context.request.json();
    const totalWeight = items.reduce((sum: number, item: any) => sum + item.weightQuintals, 0);

    const newOrder = await db.insert(orders).values({
      date: new Date().toISOString(),
      partyName,
      location,
      totalWeight,
      status: 'pending'
    }).returning();

    const orderId = newOrder[0].id;

    for (const item of items) {
      await db.insert(orderLineItems).values({
        orderId,
        brand: item.brandName,
        category: item.categoryName,
        feedType: item.feedTypeName,
        product: item.productName,
        packaging: item.packagingWeightKg,
        quantity: item.quantity,
        weight: item.weightQuintals,
      });
    }

    if (context.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && context.env.GOOGLE_PRIVATE_KEY && context.env.SPREADSHEET_ID) {
      try {
        await syncToGoogleSheets(newOrder[0], items, context.env, db);
      } catch (err) {
        console.error('Google Sheets sync failed', err);
      }
    }

    return new Response(JSON.stringify({ success: true, orderId }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to save order' }), { status: 500 });
  }
}

async function syncToGoogleSheets(order: any, items: any[], env: Record<string, any>, db: any) {
  const { importPKCS8, SignJWT } = await import('jose');

  const pkcs8 = env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const key = await importPKCS8(pkcs8, 'RS256');

  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({
    iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .sign(key);

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json();

  const values = items.map((item: any) => [
    order.id,
    order.date,
    order.location,
    order.partyName,
    item.brandName,
    item.categoryName,
    item.feedTypeName,
    item.productName,
    item.packagingWeightKg,
    item.quantity,
    item.weightQuintals,
    order.totalWeight,
  ]);

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${env.SPREADSHEET_ID}/values/Sheet1!A:L:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  );

  if (!res.ok) {
    throw new Error(`Google Sheets API error: ${res.status}`);
  }

  await db.update(orders).set({ status: 'synced' }).where(eq(orders.id, order.id));
}
