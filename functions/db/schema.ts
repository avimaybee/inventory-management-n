import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

export const orders = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  partyName: text('party_name').notNull(),
  location: text('location').notNull(),
  status: text('status').notNull().default('pending'),
  totalWeight: real('total_weight').notNull(),
}, (table) => ({
  dateIdx: index('orders_date_idx').on(table.date),
  partyNameIdx: index('orders_party_name_idx').on(table.partyName),
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
}, (table) => ({
  orderIdIdx: index('items_order_id_idx').on(table.orderId),
}));
