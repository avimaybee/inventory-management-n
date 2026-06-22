CREATE TABLE `order_audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`user_email` text NOT NULL,
	`action` text NOT NULL,
	`timestamp` text NOT NULL,
	`details` text,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_order_id_idx` ON `order_audit_logs` (`order_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`party_name` text NOT NULL,
	`location` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`total_weight` real NOT NULL,
	`total_value` real DEFAULT 0 NOT NULL,
	`rejection_reason` text,
	`admin_remarks` text,
	`created_by` text,
	`is_archived` integer DEFAULT 0 NOT NULL,
	`snapshot` text
);
--> statement-breakpoint
INSERT INTO `__new_orders`("id", "date", "party_name", "location", "status", "total_weight", "total_value", "rejection_reason", "admin_remarks", "created_by", "is_archived", "snapshot") SELECT "id", "date", "party_name", "location", "status", "total_weight", "total_value", "rejection_reason", "admin_remarks", "created_by", "is_archived", "snapshot" FROM `orders`;--> statement-breakpoint
DROP TABLE `orders`;--> statement-breakpoint
ALTER TABLE `__new_orders` RENAME TO `orders`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `orders_date_idx` ON `orders` (`date`);--> statement-breakpoint
CREATE INDEX `orders_party_name_idx` ON `orders` (`party_name`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
ALTER TABLE `order_line_items` ADD `pricing_basis` text DEFAULT 'per_bag' NOT NULL;--> statement-breakpoint
ALTER TABLE `order_line_items` ADD `entered_rate` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `order_line_items` ADD `calculated_bag_rate` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `order_line_items` ADD `calculated_line_value` real DEFAULT 0 NOT NULL;