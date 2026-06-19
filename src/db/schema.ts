import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
});

export const orders = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  partyName: text('party_name').notNull(),
  location: text('location').notNull(),
  status: text('status').notNull().default('pending'), // pending, synced
  totalWeight: real('total_weight').notNull(), // in quintals
});

export const orderLineItems = sqliteTable('order_line_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id').notNull().references(() => orders.id),
  brand: text('brand').notNull(),
  category: text('category').notNull(),
  feedType: text('feed_type').notNull(),
  product: text('product').notNull(),
  packaging: real('packaging').notNull(), // in kg
  quantity: integer('quantity').notNull(), // number of bags
  weight: real('weight').notNull(), // in quintals
});
