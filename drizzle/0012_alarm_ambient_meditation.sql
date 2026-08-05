-- Migration 0012: Add ambientId, ambientLabel, meditationId, meditationLabel to alarms
-- Also expands soundType enum to include 'ambient' and 'meditation' variants.

-- Step 1: Modify soundType enum to add new values
-- MySQL requires recreating the column to change enum values.
ALTER TABLE `alarms`
  MODIFY COLUMN `soundType` enum('frequency','studio_mix','ambient','meditation') NOT NULL DEFAULT 'frequency';

-- Step 2: Add ambient sound columns (nullable — only set when soundType = 'ambient')
ALTER TABLE `alarms`
  ADD COLUMN `ambientId` varchar(128),
  ADD COLUMN `ambientLabel` varchar(128);

-- Step 3: Add meditation track columns (nullable — only set when soundType = 'meditation')
ALTER TABLE `alarms`
  ADD COLUMN `meditationId` varchar(128),
  ADD COLUMN `meditationLabel` varchar(128);
