import { drizzle } from 'drizzle-orm/d1';
import { orders, orderLineItems } from '../../src/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function onRequestGet(context) {
  const db = drizzle(context.env.DB);
  try {
    const allOrders = await db.select().from(orders).orderBy(desc(orders.date));
    const allItems = await db.select().from(orderLineItems);

    const ordersWithItems = allOrders.map(o => ({
      ...o,
      items: allItems.filter(i => i.orderId === o.id)
    }));

    return new Response(JSON.stringify(ordersWithItems), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Failed to fetch orders' }), { status: 500 });
  }
}

export async function onRequestPost(context) {
  const db = drizzle(context.env.DB);
  try {
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

    let syncStatus = 'success';
    if (context.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && context.env.GOOGLE_PRIVATE_KEY && context.env.SPREADSHEET_ID) {
      try {
        await syncToGoogleSheets(newOrder[0], items, context.env, db);
      } catch (err) {
        console.error('Failed to sync to sheets', err);
        syncStatus = 'failed';
      }
    }

    return new Response(JSON.stringify({ success: true, orderId, syncStatus }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Failed to save order' }), { status: 500 });
  }
}

async function syncToGoogleSheets(order, items, env, db) {
  const token = await getAccessToken(env);

  const values = items.map(item => [
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
    order.totalWeight
  ]);

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${env.SPREADSHEET_ID}/values/Sheet1!A:L:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values })
    }
  );

  if (!res.ok) {
    throw new Error(`Google Sheets API error: ${res.status}`);
  }

  await db.update(orders).set({ status: 'synced' }).where(eq(orders.id, order.id));
}

async function getAccessToken(env) {
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

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await res.json();
  return data.access_token;
}
