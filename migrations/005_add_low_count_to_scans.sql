-- migrations/005_add_low_count_to_scans.sql
-- Additive migration: adds low_count to the scans table to fix the finalization bug.

ALTER TABLE scans ADD COLUMN IF NOT EXISTS low_count integer DEFAULT 0 NOT NULL;
