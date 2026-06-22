import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, and } from 'drizzle-orm';
import { orders, orderLineItems, orderAuditLogs } from '../db/schema';
import { verifyToken, extractToken, checkOrigin, checkRateLimit, SHEET_ID_REGEX } from '../utils/auth';

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

function getDb(env: Record<string, any>) {
  if (!env.DB) throw new Error('DB binding not configured');
  return drizzle(env.DB);
}

// Recalculates packaging weights, bag rates, and line values to ensure mathematical consistency
function calculateRatesAndValues(items: any[]) {
  let totalWeight = 0;
  let totalValue = 0;

  const processedItems = items.map((item: any) => {
    const brand = item.brand || item.brandName;
    const category = item.category || item.categoryName;
    const feedType = item.feedType || item.feedTypeName;
    const product = item.product || item.productName;
    const packaging = Number(item.packaging || item.packagingWeightKg || 50);
    const quantity = Number(item.quantity || 0);
    const pricingBasis = item.pricingBasis || 'per_bag';
    const enteredRate = Number(item.enteredRate || 0);

    // Weight in quintals = (packaging_in_kg * quantity) / 100
    const weight = (packaging * quantity) / 100;
    totalWeight += weight;

    let calculatedBagRate = 0;
    if (pricingBasis === 'per_bag') {
      calculatedBagRate = enteredRate;
    } else {
      // per_quintal: rate per bag = enteredRate * (packaging / 100)
      calculatedBagRate = enteredRate * (packaging / 100);
    }

    const calculatedLineValue = calculatedBagRate * quantity;
    totalValue += calculatedLineValue;

    return {
      brand,
      category,
      feedType,
      product,
      packaging,
      quantity,
      weight,
      pricingBasis,
      enteredRate,
      calculatedBagRate,
      calculatedLineValue,
    };
  });

  return {
    processedItems,
    totalWeight,
    totalValue,
  };
}

// GET all orders
export async function onRequestGet(context) {
  try {
    const user = await authenticate(context.request);
    if (!user) return unauthorized();
    if (!checkOrigin(context.request)) return json({ error: 'Forbidden' }, 403);

    const rl = checkRateLimit(`get:${user.uid}`);
    if (!rl.allowed) return tooManyRequests(rl.retryAfter!);

    const env = context.env;
    const db = getDb(env);

    const isAdmin = user.email === 'info@neelamfeeds.in';
    const isSales = !!(user.email && user.email !== 'info@neelamfeeds.in');

    if (!isAdmin && !isSales) {
      return unauthorized('Access denied. Invalid user role.');
    }

    let allOrders;
    if (isAdmin) {
      // Admin sees everything
      allOrders = await db.select().from(orders).orderBy(desc(orders.date));
    } else {
      // Sales sees only active (non-archived) orders
      allOrders = await db.select().from(orders).where(eq(orders.isArchived, 0)).orderBy(desc(orders.date));
    }

    const allItems = await db.select().from(orderLineItems);
    const allLogs = isAdmin ? await db.select().from(orderAuditLogs).orderBy(desc(orderAuditLogs.timestamp)) : [];

    const ordersWithItems = allOrders.map(o => ({
      ...o,
      items: allItems.filter(i => i.orderId === o.id),
      auditLogs: isAdmin ? allLogs.filter(l => l.orderId === o.id) : undefined,
    }));

    return json(ordersWithItems);
  } catch (err: any) {
    console.error(err);
    return json({ error: err.message || 'Internal error' }, 500);
  }
}

// POST: Create a new order (usually 'draft' or 'submitted')
export async function onRequestPost(context) {
  try {
    const user = await authenticate(context.request);
    if (!user) return unauthorized();
    if (!checkOrigin(context.request)) return json({ error: 'Forbidden' }, 403);

    const rl = checkRateLimit(`post:${user.uid}`);
    if (!rl.allowed) return tooManyRequests(rl.retryAfter!);

    const env = context.env;
    const db = getDb(env);

    const isAdmin = user.email === 'info@neelamfeeds.in';
    const isSales = !!(user.email && user.email !== 'info@neelamfeeds.in');

    if (!isAdmin && !isSales) {
      return unauthorized('Access denied. Invalid user role.');
    }

    const contentType = context.request.headers.get('Content-Type') || '';
    if (!contentType.startsWith('application/json')) {
      return json({ error: 'Content-Type must be application/json' }, 415);
    }

    const body: any = await context.request.json();
    const { partyName, location, items, status } = body;

    // Validation
    if (typeof partyName !== 'string' || partyName.trim().length === 0 || partyName.length > 200) {
      return json({ error: 'Party Name must be a non-empty string (max 200)' }, 400);
    }
    if (typeof location !== 'string' || location.trim().length === 0 || location.length > 200) {
      return json({ error: 'Location must be a non-empty string (max 200)' }, 400);
    }
    if (!Array.isArray(items) || items.length === 0) {
      return json({ error: 'Order must contain at least one line item' }, 400);
    }

    // Determine initial status
    let initialStatus = status || 'draft';
    if (isSales && initialStatus !== 'draft' && initialStatus !== 'submitted') {
      initialStatus = 'draft';
    }

    // Process and calculate rates
    const { processedItems, totalWeight, totalValue } = calculateRatesAndValues(items);

    const [newOrder] = await db.insert(orders).values({
      date: new Date().toISOString(),
      partyName: partyName.trim(),
      location: location.trim(),
      totalWeight,
      totalValue,
      status: initialStatus,
      createdBy: user.email,
      isArchived: 0,
    }).returning();

    const orderId = newOrder.id;

    // Insert items
    await Promise.all(processedItems.map((item) =>
      db.insert(orderLineItems).values({
        orderId,
        brand: item.brand,
        category: item.category,
        feedType: item.feedType,
        product: item.product,
        packaging: item.packaging,
        quantity: item.quantity,
        weight: item.weight,
        pricingBasis: item.pricingBasis,
        enteredRate: item.enteredRate,
        calculatedBagRate: item.calculatedBagRate,
        calculatedLineValue: item.calculatedLineValue,
      })
    ));

    // Audit log
    await db.insert(orderAuditLogs).values({
      orderId,
      userEmail: user.email!,
      action: 'CREATED',
      timestamp: new Date().toISOString(),
      details: JSON.stringify({ status: initialStatus }),
    });

    return json({ success: true, orderId, order: { ...newOrder, items: processedItems } });
  } catch (err: any) {
    console.error(err);
    return json({ error: err.message || 'Internal error' }, 500);
  }
}

// PUT: Modify an existing order or perform status transition
export async function onRequestPut(context) {
  try {
    const user = await authenticate(context.request);
    if (!user) return unauthorized();
    if (!checkOrigin(context.request)) return json({ error: 'Forbidden' }, 403);

    const rl = checkRateLimit(`put:${user.uid}`);
    if (!rl.allowed) return tooManyRequests(rl.retryAfter!);

    const env = context.env;
    const db = getDb(env);

    const isAdmin = user.email === 'info@neelamfeeds.in';
    const isSales = !!(user.email && user.email !== 'info@neelamfeeds.in');

    if (!isAdmin && !isSales) {
      return unauthorized('Access denied. Invalid user role.');
    }

    const body: any = await context.request.json();
    const { id, partyName, location, items, status, rejectionReason, adminRemarks, isArchived } = body;

    if (!id) return json({ error: 'Order ID is required' }, 400);

    const [existingOrder] = await db.select().from(orders).where(eq(orders.id, id));
    if (!existingOrder) return json({ error: 'Order not found' }, 404);

    // Permission check for Sales
    if (isSales) {
      if (existingOrder.isArchived === 1) {
        return json({ error: 'Cannot modify archived order' }, 403);
      }
      if (existingOrder.status !== 'draft' && existingOrder.status !== 'clarification_needed') {
        return json({ error: 'Order is locked and cannot be modified' }, 403);
      }
      if (status && status !== 'draft' && status !== 'submitted') {
        return json({ error: 'Invalid status transition' }, 403);
      }
    }

    // Process variables
    let updateData: any = {};
    let auditLogAction = 'UPDATED';
    let auditLogDetails: any = {};

    // Handle soft-delete request
    if (isArchived === 1 || isArchived === true) {
      updateData.isArchived = 1;
      await db.update(orders).set(updateData).where(eq(orders.id, id));
      await db.insert(orderAuditLogs).values({
        orderId: id,
        userEmail: user.email!,
        action: 'DELETED',
        timestamp: new Date().toISOString(),
        details: JSON.stringify({ previousStatus: existingOrder.status }),
      });
      return json({ success: true, message: 'Order soft deleted' });
    }

    // If updating details/items
    let finalItems = items;
    if (items || partyName || location) {
      if (partyName) updateData.partyName = partyName.trim();
      if (location) updateData.location = location.trim();

      if (items) {
        const { processedItems, totalWeight, totalValue } = calculateRatesAndValues(items);
        updateData.totalWeight = totalWeight;
        updateData.totalValue = totalValue;
        finalItems = processedItems;

        // Verify if rates were changed by Admin
        if (isAdmin) {
          const originalItems = await db.select().from(orderLineItems).where(eq(orderLineItems.orderId, id));
          let pricingChanged = false;
          for (const item of processedItems) {
            const orig = originalItems.find(o => o.product === item.product);
            if (orig && (orig.enteredRate !== item.enteredRate || orig.pricingBasis !== item.pricingBasis)) {
              pricingChanged = true;
              break;
            }
          }
          if (pricingChanged) {
            auditLogAction = 'PRICE_MODIFIED';
          }
        }
      }
    }

    // Handle status changes
    if (status && status !== existingOrder.status) {
      updateData.status = status;
      auditLogAction = 'STATUS_CHANGE';
      auditLogDetails.from = existingOrder.status;
      auditLogDetails.to = status;

      if (status === 'rejected') {
        if (!rejectionReason) return json({ error: 'Rejection reason is required' }, 400);
        updateData.rejectionReason = rejectionReason;
        auditLogDetails.rejectionReason = rejectionReason;
      }
      if (status === 'clarification_needed') {
        if (!adminRemarks) return json({ error: 'Remarks are required for seeking clarification' }, 400);
        updateData.adminRemarks = adminRemarks;
        auditLogDetails.adminRemarks = adminRemarks;
      }
      if (status === 'approved') {
        updateData.adminRemarks = adminRemarks || null;
        updateData.rejectionReason = null;
      }
    }

    // Apply database updates for order header
    await db.update(orders).set(updateData).where(eq(orders.id, id));

    // Apply updates for line items if provided
    if (items) {
      await db.delete(orderLineItems).where(eq(orderLineItems.orderId, id));
      await Promise.all(finalItems.map((item: any) =>
        db.insert(orderLineItems).values({
          orderId: id,
          brand: item.brand,
          category: item.category,
          feedType: item.feedType,
          product: item.product,
          packaging: item.packaging,
          quantity: item.quantity,
          weight: item.weight,
          pricingBasis: item.pricingBasis,
          enteredRate: item.enteredRate,
          calculatedBagRate: item.calculatedBagRate,
          calculatedLineValue: item.calculatedLineValue,
        })
      ));
    }

    // If status transitioned to APPROVED, generate snapshot & sync to Google Sheets
    if (status === 'approved' && existingOrder.status !== 'approved') {
      const [updatedOrder] = await db.select().from(orders).where(eq(orders.id, id));
      const updatedItems = await db.select().from(orderLineItems).where(eq(orderLineItems.orderId, id));
      
      const frozenSnapshot = {
        order: updatedOrder,
        items: updatedItems,
        approvedAt: new Date().toISOString(),
        approvedBy: user.email,
      };

      // Save frozen snapshot
      await db.update(orders).set({
        snapshot: JSON.stringify(frozenSnapshot)
      }).where(eq(orders.id, id));

      // Trigger Google Sheets Sync
      if (env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_PRIVATE_KEY && env.SPREADSHEET_ID) {
        if (SHEET_ID_REGEX.test(env.SPREADSHEET_ID)) {
          try {
            await syncToGoogleSheets({ ...updatedOrder, totalWeight: updatedOrder.totalWeight }, updatedItems, env);
          } catch (err) {
            console.error('Google Sheets sync failed during approval:', err);
          }
        }
      }
    }

    // Save audit log
    await db.insert(orderAuditLogs).values({
      orderId: id,
      userEmail: user.email!,
      action: auditLogAction,
      timestamp: new Date().toISOString(),
      details: Object.keys(auditLogDetails).length > 0 ? JSON.stringify(auditLogDetails) : null,
    });

    return json({ success: true });
  } catch (err: any) {
    console.error(err);
    return json({ error: err.message || 'Internal error' }, 500);
  }
}

// DELETE: Alternate way to soft delete order (usually for drafts)
export async function onRequestDelete(context) {
  try {
    const user = await authenticate(context.request);
    if (!user) return unauthorized();
    if (!checkOrigin(context.request)) return json({ error: 'Forbidden' }, 403);

    const rl = checkRateLimit(`delete:${user.uid}`);
    if (!rl.allowed) return tooManyRequests(rl.retryAfter!);

    const env = context.env;
    const db = getDb(env);

    const isAdmin = user.email === 'info@neelamfeeds.in';
    const isSales = !!(user.email && user.email !== 'info@neelamfeeds.in');

    if (!isAdmin && !isSales) {
      return unauthorized('Access denied. Invalid user role.');
    }

    const url = new URL(context.request.url);
    const idStr = url.searchParams.get('id');
    if (!idStr) return json({ error: 'Order ID is required' }, 400);
    const id = parseInt(idStr, 10);

    const [existingOrder] = await db.select().from(orders).where(eq(orders.id, id));
    if (!existingOrder) return json({ error: 'Order not found' }, 404);

    if (isSales) {
      if (existingOrder.isArchived === 1) return json({ error: 'Order is already deleted' }, 400);
      if (existingOrder.status !== 'draft') {
        return json({ error: 'Only drafts can be deleted by Sales' }, 403);
      }
    }

    // Soft delete
    await db.update(orders).set({ isArchived: 1 }).where(eq(orders.id, id));

    // Audit log
    await db.insert(orderAuditLogs).values({
      orderId: id,
      userEmail: user.email!,
      action: 'DELETED',
      timestamp: new Date().toISOString(),
      details: JSON.stringify({ previousStatus: existingOrder.status }),
    });

    return json({ success: true, message: 'Order soft deleted' });
  } catch (err: any) {
    console.error(err);
    return json({ error: err.message || 'Internal error' }, 500);
  }
}

// Helper to sync order data to Google Sheets
async function syncToGoogleSheets(order: any, items: any[], env: Record<string, any>) {
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

  if (!tokenRes.ok) {
    console.error('Google OAuth token exchange failed in approval sync', await tokenRes.text());
    return;
  }

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    console.error('Google OAuth missing access_token in approval sync', tokenData);
    return;
  }

  // Row columns: Order ID, Date, Location, Party Name, Brand, Category, Feed Type, Product, Packaging, Quantity, Weight (Quintals), Total Weight, Pricing Basis, Rate, Calculated Bag Rate, Total Value
  const values = items.map((item: any) => [
    order.id,
    order.date,
    order.location,
    order.partyName,
    item.brand,
    item.category,
    item.feedType,
    item.product,
    item.packaging,
    item.quantity,
    item.weight,
    order.totalWeight,
    item.pricingBasis,
    item.enteredRate,
    item.calculatedBagRate,
    item.calculatedLineValue,
    order.totalValue,
  ]);

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${env.SPREADSHEET_ID}/values/Sheet1!A:Q:append?valueInputOption=USER_ENTERED`,
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
    throw new Error(`Google Sheets API error: ${res.status} - ${await res.text()}`);
  }
}
