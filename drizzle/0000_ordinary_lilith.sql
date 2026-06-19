CREATE TABLE `order_line_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`brand` text NOT NULL,
	`category` text NOT NULL,
	`feed_type` text NOT NULL,
	`product` text NOT NULL,
	`packaging` real NOT NULL,
	`quantity` integer NOT NULL,
	`weight` real NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`party_name` text NOT NULL,
	`location` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`total_weight` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);