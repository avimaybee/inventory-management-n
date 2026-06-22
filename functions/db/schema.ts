import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

export const orders = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  partyName: text('party_name').notNull(),
  location: text('location').notNull(),
  status: text('status').notNull().default('draft'),
  totalWeight: real('total_weight').notNull(),
  totalValue: real('total_value').notNull().default(0),
  rejectionReason: text('rejection_reason'),
  adminRemarks: text('admin_remarks'),
  createdBy: text('created_by'),
  isArchived: integer('is_archived').notNull().default(0),
  snapshot: text('snapshot'), // frozen order snapshot JSON when approved
}, (table) => ({
  dateIdx: index('orders_date_idx').on(table.date),
  partyNameIdx: index('orders_party_name_idx').on(table.partyName),
  statusIdx: index('orders_status_idx').on(table.status),
}));

export const orderLineItems = sqliteTable('order_line_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id').notNull().references(() => orders.id),
  brand: text('brand').notNull(),
  category: text('category').notNull(),
  feedType: text('feed_type').notNull(),
  product: text('product').notNull(),
  packaging: real('packaging').notNull(),
  quantity: integer('quantity').notNull(),
  weight: real('weight').notNull(),
  pricingBasis: text('pricing_basis').notNull().default('per_bag'), // 'per_bag' or 'per_quintal'
  enteredRate: real('entered_rate').notNull().default(0),
  calculatedBagRate: real('calculated_bag_rate').notNull().default(0),
  calculatedLineValue: real('calculated_line_value').notNull().default(0),
}, (table) => ({
  orderIdIdx: index('items_order_id_idx').on(table.orderId),
}));

export const orderAuditLogs = sqliteTable('order_audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id').notNull().references(() => orders.id),
  userEmail: text('user_email').notNull(),
  action: text('action').notNull(), // 'CREATED', 'STATUS_CHANGE', 'PRICE_MODIFIED', 'DELETED', etc.
  timestamp: text('timestamp').notNull(),
  details: text('details'), // JSON string with extra details
}, (table) => ({
  orderIdIdx: index('audit_order_id_idx').on(table.orderId),
}));

