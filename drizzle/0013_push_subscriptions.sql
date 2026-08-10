-- Migration 0013: Add push_subscriptions table for Web Push alarm delivery
-- Stores per-device VAPID push subscriptions so the server can wake
-- a sleeping phone at alarm time even when the browser tab is closed.
CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `endpoint` text NOT NULL,
  `p256dh` varchar(512) NOT NULL,
  `auth` varchar(256) NOT NULL,
  `userAgent` varchar(512),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `push_subscriptions_userId_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

-- Index for fast lookup by userId (migration runner ignores "Duplicate key name" errors)
CREATE INDEX `push_subscriptions_userId_idx` ON `push_subscriptions` (`userId`);

-- Unique index on endpoint prefix (LEFT 512 chars) to prevent duplicate subscriptions
CREATE UNIQUE INDEX `push_subscriptions_endpoint_idx` ON `push_subscriptions` ((LEFT(`endpoint`, 512)));
