CREATE TABLE `healing_favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`frequencyId` varchar(64) NOT NULL,
	`hz` float NOT NULL,
	`name` varchar(128) NOT NULL,
	`category` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `healing_favorites_id` PRIMARY KEY(`id`),
	CONSTRAINT `healing_favorites_userId_frequencyId_unique` UNIQUE(`userId`,`frequencyId`)
);
--> statement-breakpoint
ALTER TABLE `healing_favorites` ADD CONSTRAINT `healing_favorites_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;