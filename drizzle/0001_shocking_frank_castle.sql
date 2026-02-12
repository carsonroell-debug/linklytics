CREATE TABLE `apiKeys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`key` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`isActive` boolean NOT NULL DEFAULT true,
	CONSTRAINT `apiKeys_id` PRIMARY KEY(`id`),
	CONSTRAINT `apiKeys_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `clicks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`linkId` int NOT NULL,
	`clickedAt` timestamp NOT NULL DEFAULT (now()),
	`country` varchar(100),
	`city` varchar(255),
	`region` varchar(255),
	`latitude` varchar(50),
	`longitude` varchar(50),
	`device` varchar(100),
	`browser` varchar(100),
	`os` varchar(100),
	`referrer` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	CONSTRAINT `clicks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`slug` varchar(255) NOT NULL,
	`originalUrl` text NOT NULL,
	`title` varchar(500),
	`description` text,
	`password` varchar(255),
	`expiresAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`clickCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `links_id` PRIMARY KEY(`id`),
	CONSTRAINT `links_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionTier` enum('free','paid') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `stripeSubscriptionId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionStatus` enum('active','canceled','past_due','trialing');--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionEndsAt` timestamp;--> statement-breakpoint
CREATE INDEX `userId_idx` ON `apiKeys` (`userId`);--> statement-breakpoint
CREATE INDEX `key_idx` ON `apiKeys` (`key`);--> statement-breakpoint
CREATE INDEX `linkId_idx` ON `clicks` (`linkId`);--> statement-breakpoint
CREATE INDEX `clickedAt_idx` ON `clicks` (`clickedAt`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `links` (`userId`);--> statement-breakpoint
CREATE INDEX `slug_idx` ON `links` (`slug`);