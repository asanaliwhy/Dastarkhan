CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`uuid` text NOT NULL,
	`name` text NOT NULL,
	`title` text NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`pack_amount` real NOT NULL,
	`pack_label` text NOT NULL,
	`kcal` real NOT NULL,
	`protein` real NOT NULL,
	`carbs` real NOT NULL,
	`fat` real NOT NULL,
	`category` text NOT NULL,
	`vegan` integer DEFAULT false NOT NULL,
	`allergens` text DEFAULT '[]' NOT NULL,
	`unit` text DEFAULT 'g' NOT NULL,
	`source` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product_offers` (
	`product_id` text NOT NULL,
	`store` text NOT NULL,
	`price` integer NOT NULL,
	`in_stock` integer DEFAULT true NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`product_id`, `store`),
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`config` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `meal_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`config` text NOT NULL,
	`days` text NOT NULL,
	`basket_total` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `product_offers_store_idx` ON `product_offers` (`store`);
--> statement-breakpoint
CREATE INDEX `meal_plans_user_idx` ON `meal_plans` (`user_id`, `created_at`);
