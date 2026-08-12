-- Migration 0016: alarm dispatcher — delivery ledger, leases, heartbeats.
--
-- Additive only. Nothing is dropped, renamed, or re-keyed, so an API build from
-- before this migration keeps running against a database that has it applied.
--
-- push_subscriptions is NOT created here. It already exists from migration 0013
-- and is referenced as-is.
--
-- Every point-in-time column here is DATETIME, not TIMESTAMP:
--   * TIMESTAMP is stored as a 32-bit offset and overflows on 2038-01-19.
--     Alarms are scheduled into the future, so this is not a theoretical limit.
--   * TIMESTAMP is converted from the session time zone on write and back on
--     read, so the same row yields different instants on connections with
--     different time_zone settings. Alarm correctness depends on these instants
--     being stable regardless of which process reads them.
-- All DATETIME values here are UTC. The application formats and parses them as
-- UTC explicitly (server/alarm-dispatcher/utc.ts) and never relies on the
-- connection time zone.
--
-- createdAt/updatedAt remain TIMESTAMP so their server-side DEFAULT
-- CURRENT_TIMESTAMP / ON UPDATE behavior matches the rest of this schema. They
-- are bookkeeping columns, never used for scheduling decisions.
--
-- NOTE: server/lib/runMigrations.ts splits this file on semicolons before
-- stripping comments, and its splitter tracks single quotes. Apostrophes are
-- deliberately avoided in these comments so the split cannot be thrown off.

-- Device-local IANA zone captured at save time. Existing rows stay NULL and use
-- ALARM_DEFAULT_TIMEZONE until the client re-saves them.
ALTER TABLE `alarms` ADD COLUMN `timezone` varchar(64) NULL;

CREATE TABLE IF NOT EXISTS `alarm_delivery_attempts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `alarmId` int NOT NULL,
  `userId` int NOT NULL,
  `scheduledForUtc` datetime NOT NULL,
  `scheduledLocalKey` varchar(191) NOT NULL,
  `status` enum('pending','sent','terminal_failed','cancelled') NOT NULL DEFAULT 'pending',
  `attemptCount` int NOT NULL DEFAULT 0,
  `completedAt` datetime NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_alarm_delivery_attempt_occurrence` (`alarmId`,`scheduledLocalKey`),
  KEY `idx_alarm_delivery_attempt_status_due` (`status`,`scheduledForUtc`),
  CONSTRAINT `fk_alarm_delivery_attempt_alarm`
    FOREIGN KEY (`alarmId`) REFERENCES `alarms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_alarm_delivery_attempt_user`
    FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `alarm_delivery_targets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `deliveryAttemptId` int NOT NULL,
  `pushSubscriptionId` int NULL,
  `status` enum('pending','claimed','sending','sent','retryable_failed','terminal_failed','cancelled') NOT NULL DEFAULT 'pending',
  `attemptCount` int NOT NULL DEFAULT 0,
  `nextAttemptAt` datetime NULL,
  `claimedBy` varchar(191) NULL,
  `leaseExpiresAt` datetime NULL,
  `providerStatus` int NULL,
  `providerMessageId` varchar(512) NULL,
  `lastErrorCode` varchar(128) NULL,
  `lastErrorMessage` varchar(2000) NULL,
  `sentAt` datetime NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_alarm_delivery_target` (`deliveryAttemptId`,`pushSubscriptionId`),
  KEY `idx_alarm_delivery_target_claimable` (`status`,`nextAttemptAt`,`leaseExpiresAt`),
  CONSTRAINT `fk_alarm_delivery_target_attempt`
    FOREIGN KEY (`deliveryAttemptId`) REFERENCES `alarm_delivery_attempts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_alarm_delivery_target_subscription`
    FOREIGN KEY (`pushSubscriptionId`) REFERENCES `push_subscriptions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `dispatcher_leases` (
  `name` varchar(64) NOT NULL,
  `holderId` varchar(191) NOT NULL,
  `leaseExpiresAt` datetime NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `dispatcher_heartbeats` (
  `serviceName` varchar(64) NOT NULL,
  `instanceId` varchar(191) NOT NULL,
  `releaseSha` varchar(64) NULL,
  `lastStartedAt` datetime NULL,
  `lastSuccessAt` datetime NULL,
  `lastErrorAt` datetime NULL,
  `lastErrorSummary` varchar(2000) NULL,
  `summaryJson` json NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`serviceName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
