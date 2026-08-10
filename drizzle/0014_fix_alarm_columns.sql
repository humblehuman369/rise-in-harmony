-- Migration 0014: Ensure ambientId, ambientLabel, meditationId, meditationLabel exist on alarms
-- This is a safety re-run of 0012 statements that may have been skipped.
-- All statements are safe to run on a DB that already has these columns (errors are ignored by the runner).

-- Expand soundType enum (safe to re-run — runner ignores errors)
ALTER TABLE `alarms`
  MODIFY COLUMN `soundType` enum('frequency','studio_mix','ambient','meditation') NOT NULL DEFAULT 'frequency';

-- Add ambient columns (runner ignores "Duplicate column name" errors)
ALTER TABLE `alarms`
  ADD COLUMN IF NOT EXISTS `ambientId` varchar(128);

ALTER TABLE `alarms`
  ADD COLUMN IF NOT EXISTS `ambientLabel` varchar(128);

-- Add meditation columns
ALTER TABLE `alarms`
  ADD COLUMN IF NOT EXISTS `meditationId` varchar(128);

ALTER TABLE `alarms`
  ADD COLUMN IF NOT EXISTS `meditationLabel` varchar(128);
