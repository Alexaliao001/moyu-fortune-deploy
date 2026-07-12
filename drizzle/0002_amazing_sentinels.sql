CREATE TABLE `daily_draw_count` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`drawDate` date NOT NULL,
	`count` int NOT NULL DEFAULT 0,
	CONSTRAINT `daily_draw_count_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fortune_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`level` varchar(16) NOT NULL,
	`emoji` varchar(16) NOT NULL,
	`percent` int NOT NULL,
	`message` text,
	`suggestedTime` varchar(32),
	`avatar` varchar(16),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fortune_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inviterId` int NOT NULL,
	`inviteeId` int NOT NULL,
	`rewardDays` int NOT NULL DEFAULT 3,
	`rewardClaimed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `bonusDays` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `inviteCode` varchar(16);--> statement-breakpoint
ALTER TABLE `users` ADD `invitedBy` int;--> statement-breakpoint
ALTER TABLE `users` ADD `unlockedAvatars` text;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_inviteCode_unique` UNIQUE(`inviteCode`);