CREATE TABLE `user_sounds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`freqL` float NOT NULL,
	`beatHz` float,
	`isoRate` float,
	`isoDuty` float,
	`waveform` varchar(32) NOT NULL,
	`mode` varchar(32) NOT NULL,
	`toneVolume` float NOT NULL DEFAULT 0.7,
	`backgroundType` varchar(32) NOT NULL DEFAULT 'none',
	`backgroundKey` varchar(256),
	`backgroundVolume` float NOT NULL DEFAULT 0.35,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_sounds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `user_sounds` ADD CONSTRAINT `user_sounds_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;