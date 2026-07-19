CREATE TABLE `convert_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`status` enum('queued','processing','completed','failed','expired') NOT NULL DEFAULT 'queued',
	`stage` varchar(64) NOT NULL DEFAULT 'queued',
	`progressPct` int NOT NULL DEFAULT 0,
	`sourceKey` varchar(512) NOT NULL,
	`sourceFilename` varchar(256) NOT NULL,
	`sourceDurationSec` float,
	`sourceFormat` varchar(32),
	`sourcePitchA` float NOT NULL DEFAULT 440,
	`targetPitchA` float NOT NULL,
	`pitchRatio` float NOT NULL,
	`cents` float NOT NULL,
	`hybridEnabled` boolean NOT NULL DEFAULT false,
	`hybridHz` float,
	`hybridGainDb` float DEFAULT -18,
	`formantPreserve` boolean NOT NULL DEFAULT false,
	`quality` enum('standard','high') NOT NULL DEFAULT 'standard',
	`outputWavKey` varchar(512),
	`outputMp3Key` varchar(512),
	`errorCode` varchar(64),
	`errorMessage` text,
	`retryCount` int NOT NULL DEFAULT 0,
	`algorithmVersion` varchar(64),
	`processingMs` int,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `convert_jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `convert_jobs_publicId_unique` UNIQUE(`publicId`)
);
--> statement-breakpoint
CREATE TABLE `program_day_completions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`programId` varchar(64) NOT NULL,
	`dayNumber` int NOT NULL,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	`sessionId` int,
	`note` text,
	CONSTRAINT `program_day_completions_id` PRIMARY KEY(`id`),
	CONSTRAINT `program_day_completions_userId_programId_dayNumber_unique` UNIQUE(`userId`,`programId`,`dayNumber`)
);
--> statement-breakpoint
CREATE TABLE `user_programs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`programId` varchar(64) NOT NULL,
	`currentDay` int NOT NULL DEFAULT 1,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`abandonedAt` timestamp,
	CONSTRAINT `user_programs_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_programs_userId_programId_unique` UNIQUE(`userId`,`programId`)
);
--> statement-breakpoint
ALTER TABLE `alarms` ADD `kind` enum('wake','wind_down') DEFAULT 'wake' NOT NULL;--> statement-breakpoint
ALTER TABLE `subscription_events` ADD `externalEventId` varchar(191);--> statement-breakpoint
ALTER TABLE `users` ADD `lastWeeklyInsightEmailAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `streakFreezesRemaining` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `streakFreezeMonthKey` varchar(7);--> statement-breakpoint
ALTER TABLE `convert_jobs` ADD CONSTRAINT `convert_jobs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `program_day_completions` ADD CONSTRAINT `program_day_completions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_programs` ADD CONSTRAINT `user_programs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;