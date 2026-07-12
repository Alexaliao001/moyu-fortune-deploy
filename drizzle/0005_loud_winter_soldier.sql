CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('feedback_reply','system','reward') NOT NULL DEFAULT 'system',
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`relatedId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `feedback` ADD `adminReply` text;--> statement-breakpoint
ALTER TABLE `feedback` ADD `repliedAt` timestamp;