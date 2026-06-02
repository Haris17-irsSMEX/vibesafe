-- Phase 2B: Scan lifecycle hardening
-- Run this in Supabase SQL Editor AFTER 002_create_scan_files_table.sql
-- Additive only — no destructive operations

-- 1. Expand scans status CHECK constraint to include 'complete'
--    (keeping 'completed' for backward compat — both are valid terminal states)
ALTER TABLE scans DROP CONSTRAINT IF EXISTS scans_status_check;
ALTER TABLE scans ADD CONSTRAINT scans_status_check
  CHECK (status IN ('pending', 'fetching', 'scanning', 'complete', 'completed', 'failed'));

-- 2. Add error_message column to scans (stores safe failure reason)
ALTER TABLE scans ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 3. Add unique constraint on scan_files (scan_id, file_path)
--    Prevents duplicate file rows on concurrent / repeated fetches
ALTER TABLE scan_files DROP CONSTRAINT IF EXISTS scan_files_scan_id_file_path_key;
ALTER TABLE scan_files ADD CONSTRAINT scan_files_scan_id_file_path_key
  UNIQUE (scan_id, file_path);
