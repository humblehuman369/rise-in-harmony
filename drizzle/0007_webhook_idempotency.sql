ALTER TABLE `subscription_events` ADD `externalEventId` varchar(191);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscription_events_externalEventId_unique` ON `subscription_events` (`externalEventId`);
