import { drizzle } from 'drizzle-orm/d1';
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { eq, desc } from 'drizzle-orm';
import { verifyToken, extractToken, checkOrigin, checkRateLimit, SHEET_ID_REGEX } from '../utils/auth';

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
    throw new Error('DB binding not configured');
  }
  return drizzle(env.DB);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, private',
    },
  });
}

function unauthorized(message = 'Unauthorized') {
  return json({ error: message }, 401);
}

function tooManyRequests(retryAfter: number) {
  return new Response(JSON.stringify({ error: 'Too many requests' }), {
    status: 429,
    headers: {
      'Retry-After': String(retryAfter),
      'Cache-Control': 'no-store, private',
    },
  });
}

async function authenticate(request: Request) {
  const token = extractToken(request);
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

export async function onRequestGet(context) {
  try {
    const user = await authenticate(context.request);
    if (!user) return unauthorized();

    if (!checkOrigin(context.request)) return json({ error: 'Forbidden' }, 403);

    const rlKey = `get:${user.uid}`;
    const rl = checkRateLimit(rlKey);
    if (!rl.allowed) return tooManyRequests(rl.retryAfter!);

    const env = context.env;
    if (!env.DB) return json({ error: 'Service unavailable' }, 500);

    const db = drizzle(env.DB);
    const allOrders = await db.select().from(orders).orderBy(desc(orders.date));
    const allItems = await db.select().from(orderLineItems);

    const ordersWithItems = allOrders.map(o => ({
      ...o,
      items: allItems.filter(i => i.orderId === o.id),
    }));

    return json(ordersWithItems);
  } catch {
    return json({ error: 'Internal error' }, 500);
  }
}

export async function onRequestPost(context) {
  try {
    const user = await authenticate(context.request);
    if (!user) return unauthorized();

    if (!checkOrigin(context.request)) return json({ error: 'Forbidden' }, 403);

    const rlKey = `post:${user.uid}`;
    const rl = checkRateLimit(rlKey);
    if (!rl.allowed) return tooManyRequests(rl.retryAfter!);

    const env = context.env;
    if (!env.DB) return json({ error: 'Service unavailable' }, 500);

    const contentType = context.request.headers.get('Content-Type') || '';
    if (!contentType.startsWith('application/json')) {
      return json({ error: 'Content-Type must be application/json' }, 415);
    }

    const contentLength = parseInt(context.request.headers.get('Content-Length') || '0', 10);
    if (contentLength > 1_048_576) {
      return json({ error: 'Request body too large' }, 413);
    }

    let body: any;
    try {
      body = await context.request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const { partyName, location, items } = body;

    if (typeof partyName !== 'string' || partyName.length === 0 || partyName.length > 200) {
      return json({ error: 'partyName must be a non-empty string (max 200)' }, 400);
    }
    if (typeof location !== 'string' || location.length === 0 || location.length > 200) {
      return json({ error: 'location must be a non-empty string (max 200)' }, 400);
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > 200) {
      return json({ error: 'items must be a non-empty array (max 200)' }, 400);
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (typeof item.brandName !== 'string' || !item.brandName) {
        return json({ error: `items[${i}].brandName is required` }, 400);
      }
      if (typeof item.categoryName !== 'string' || !item.categoryName) {
        return json({ error: `items[${i}].categoryName is required` }, 400);
      }
      if (typeof item.feedTypeName !== 'string' || !item.feedTypeName) {
        return json({ error: `items[${i}].feedTypeName is required` }, 400);
      }
      if (typeof item.productName !== 'string' || !item.productName) {
        return json({ error: `items[${i}].productName is required` }, 400);
      }
      if (typeof item.packagingWeightKg !== 'number' || item.packagingWeightKg <= 0) {
        return json({ error: `items[${i}].packagingWeightKg must be a positive number` }, 400);
      }
      if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 100000) {
        return json({ error: `items[${i}].quantity must be an integer between 1 and 100000` }, 400);
      }
      if (typeof item.weightQuintals !== 'number' || item.weightQuintals <= 0 || item.weightQuintals > 100000) {
        return json({ error: `items[${i}].weightQuintals must be a positive number (max 100000)` }, 400);
      }
    }

    const totalWeight = items.reduce((sum: number, item: any) => sum + item.weightQuintals, 0);
    const db = getDb(env);

    const newOrder = await db
      .insert(orders)
      .values({
        date: new Date().toISOString(),
        partyName,
        location,
        totalWeight,
        status: 'pending',
      })
      .returning();

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

    if (env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_PRIVATE_KEY && env.SPREADSHEET_ID) {
      if (!SHEET_ID_REGEX.test(env.SPREADSHEET_ID)) {
        console.error('Invalid SPREADSHEET_ID format');
      } else {
        try {
          await syncToGoogleSheets(newOrder[0], items, env, db);
        } catch (err) {
          console.error('Google Sheets sync failed', err);
        }
      }
    }

    return json({ success: true, orderId });
  } catch (err) {
    console.error(err);
    return json({ error: 'Internal error' }, 500);
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
    },
  );

  if (!res.ok) {
    throw new Error(`Google Sheets API error: ${res.status}`);
  }

  await db.update(orders).set({ status: 'synced' }).where(eq(orders.id, order.id));
}
