-- Migration 0015: Add missing alarm columns (ambientId, ambientLabel, meditationId, meditationLabel)
-- These were supposed to be added by 0012 but the migration may have been marked as applied
-- even if the ADD COLUMN statements failed (e.g. due to enum MODIFY error on some MySQL versions).
-- The runner ignores "Duplicate column name" errors, so this is safe on DBs that already have them.

ALTER TABLE `alarms` ADD COLUMN `ambientId` varchar(128);
ALTER TABLE `alarms` ADD COLUMN `ambientLabel` varchar(128);
ALTER TABLE `alarms` ADD COLUMN `meditationId` varchar(128);
ALTER TABLE `alarms` ADD COLUMN `meditationLabel` varchar(128);
