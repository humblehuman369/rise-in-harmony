ALTER TABLE `users` ADD `welcomeEmailSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `lastStreakMilestoneEmailAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `lastStreakMilestoneDays` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `lastReEngagementEmailAt` timestamp;