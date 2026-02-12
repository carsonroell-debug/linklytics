CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`color` varchar(7) DEFAULT '#3b82f6',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhookLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`webhookId` int NOT NULL,
	`linkId` int NOT NULL,
	`event` varchar(100) NOT NULL,
	`milestone` int,
	`status` enum('success','failed') NOT NULL,
	`response` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhookLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` text NOT NULL,
	`platform` enum('slack','discord','custom') NOT NULL,
	`events` text NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webhooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `links` ADD `campaignId` int;--> statement-breakpoint
ALTER TABLE `links` ADD `lastMilestone` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `userId_idx` ON `campaigns` (`userId`);--> statement-breakpoint
CREATE INDEX `webhookId_idx` ON `webhookLogs` (`webhookId`);--> statement-breakpoint
CREATE INDEX `linkId_idx` ON `webhookLogs` (`linkId`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `webhooks` (`userId`);