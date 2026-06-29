CREATE TABLE `alarms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`label` varchar(128),
	`hour` int NOT NULL,
	`minute` int NOT NULL,
	`days` json NOT NULL,
	`isEnabled` boolean NOT NULL DEFAULT true,
	`soundType` enum('frequency','studio_mix') NOT NULL DEFAULT 'frequency',
	`frequencyHz` float,
	`frequencyName` varchar(128),
	`studioMixName` varchar(128),
	`wakeSequence` varchar(64) DEFAULT 'gentle',
	`fadeInMinutes` int NOT NULL DEFAULT 5,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastTriggeredAt` timestamp,
	CONSTRAINT `alarms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`frequencyHz` float NOT NULL,
	`frequencyName` varchar(128),
	`sessionType` enum('single','chakra_sequence','studio_mix','sleep_timer') NOT NULL DEFAULT 'single',
	`studioPresetName` varchar(128),
	`durationSeconds` int NOT NULL DEFAULT 0,
	`moodRating` int,
	`journalNote` text,
	`intention` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studio_presets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`frequencyHz` float NOT NULL,
	`frequencyVolume` float NOT NULL DEFAULT 0.7,
	`musicStyle` varchar(64),
	`musicVolume` float NOT NULL DEFAULT 0.4,
	`natureSound` varchar(64),
	`natureVolume` float NOT NULL DEFAULT 0.3,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studio_presets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`revenuecatUserId` varchar(128),
	`eventType` varchar(64) NOT NULL,
	`productId` varchar(128),
	`expiresAt` timestamp,
	`rawPayload` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subscription_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`onboardingGoal` varchar(64),
	`onboardingCompleted` boolean NOT NULL DEFAULT false,
	`subscriptionTier` enum('free','premium','lifetime') NOT NULL DEFAULT 'free',
	`subscriptionExpiresAt` timestamp,
	`revenuecatUserId` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
ALTER TABLE `alarms` ADD CONSTRAINT `alarms_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studio_presets` ADD CONSTRAINT `studio_presets_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_events` ADD CONSTRAINT `subscription_events_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;