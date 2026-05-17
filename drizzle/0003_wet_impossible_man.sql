CREATE TABLE `platform_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`commissionPercentage` decimal(5,2) DEFAULT '10',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `digitalProducts` ADD `imageUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `users` ADD `balance` decimal(12,2) DEFAULT '0' NOT NULL;