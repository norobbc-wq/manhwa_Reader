CREATE TABLE `reading_progress` (
	`user_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`chapter` text NOT NULL,
	`image` integer NOT NULL,
	`offset` real NOT NULL,
	`range_start` real NOT NULL,
	`range_end` real NOT NULL,
	`updated` integer NOT NULL,
	PRIMARY KEY(`user_id`, `slug`)
);
--> statement-breakpoint
CREATE INDEX `progress_user_updated` ON `reading_progress` (`user_id`,`updated`);