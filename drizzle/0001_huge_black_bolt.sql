DROP TABLE `users`;--> statement-breakpoint
CREATE INDEX `items_order_id_idx` ON `order_line_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `orders_date_idx` ON `orders` (`date`);--> statement-breakpoint
CREATE INDEX `orders_party_name_idx` ON `orders` (`party_name`);