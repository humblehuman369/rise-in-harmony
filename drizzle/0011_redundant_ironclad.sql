-- Delta only: prior migrations 0007–0010 already create convert_jobs,
-- program tables, and related user/alarm columns. This migration solely
-- adds the retry counter used by stale-job requeue-once recovery.
ALTER TABLE `convert_jobs` ADD `retryCount` int NOT NULL DEFAULT 0;
