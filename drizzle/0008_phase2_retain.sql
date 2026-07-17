ALTER TABLE `users` ADD `lastWeeklyInsightEmailAt` timestamp;
--> statement-breakpoint
ALTER TABLE `users` ADD `streakFreezesRemaining` int DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `users` ADD `streakFreezeMonthKey` varchar(7);
--> statement-breakpoint
ALTER TABLE `alarms` ADD `kind` enum('wake','wind_down') DEFAULT 'wake' NOT NULL;
--> statement-breakpoint
CREATE TABLE `user_programs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`programId` varchar(64) NOT NULL,
	`currentDay` int DEFAULT 1 NOT NULL,
	`startedAt` timestamp DEFAULT (now()) NOT NULL,
	`completedAt` timestamp,
	`abandonedAt` timestamp,
	CONSTRAINT `user_programs_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_programs_userId_programId_unique` UNIQUE(`userId`,`programId`)
);
--> statement-breakpoint
CREATE TABLE `program_day_completions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`programId` varchar(64) NOT NULL,
	`dayNumber` int NOT NULL,
	`completedAt` timestamp DEFAULT (now()) NOT NULL,
	`sessionId` int,
	`note` text,
	CONSTRAINT `program_day_completions_id` PRIMARY KEY(`id`),
	CONSTRAINT `program_day_completions_userId_programId_dayNumber_unique` UNIQUE(`userId`,`programId`,`dayNumber`)
);
--> statement-breakpoint
ALTER TABLE `user_programs` ADD CONSTRAINT `user_programs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `program_day_completions` ADD CONSTRAINT `program_day_completions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
