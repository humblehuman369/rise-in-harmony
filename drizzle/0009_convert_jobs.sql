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
	`quality` enum('standard','high') NOT NULL DEFAULT 'standard',
	`outputWavKey` varchar(512),
	`outputMp3Key` varchar(512),
	`errorCode` varchar(64),
	`errorMessage` text,
	`algorithmVersion` varchar(64),
	`processingMs` int,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `convert_jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `convert_jobs_publicId_unique` UNIQUE(`publicId`)
);
--> statement-breakpoint
ALTER TABLE `convert_jobs` ADD CONSTRAINT `convert_jobs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `convert_jobs_userId_idx` ON `convert_jobs` (`userId`);
--> statement-breakpoint
CREATE INDEX `convert_jobs_status_idx` ON `convert_jobs` (`status`);
