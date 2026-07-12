CREATE TABLE `feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`type` enum('bug','feature','suggestion','other') NOT NULL DEFAULT 'suggestion',
	`content` text NOT NULL,
	`contact` varchar(255),
	`status` enum('pending','reviewed','resolved','closed') NOT NULL DEFAULT 'pending',
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feedback_id` PRIMARY KEY(`id`)
);
