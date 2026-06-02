-- Phase 2A: Create scan_files table + add 'fetching' status
-- Run this in Supabase SQL Editor AFTER 001_create_scans_table.sql
-- This is additive only — no destructive operations

-- 1. Add 'fetching' to the scans status CHECK constraint
-- Drop the old constraint and recreate with the new value
ALTER TABLE scans DROP CONSTRAINT IF EXISTS scans_status_check;
ALTER TABLE scans ADD CONSTRAINT scans_status_check
  CHECK (status IN ('pending', 'fetching', 'scanning', 'completed', 'failed'));

-- 2. Create scan_files table
CREATE TABLE IF NOT EXISTS scan_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  file_path TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by scan
CREATE INDEX IF NOT EXISTS idx_scan_files_scan_id ON scan_files(scan_id);

-- RLS: users can only read scan_files for their own scans
ALTER TABLE scan_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own scan files"
  ON scan_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scans
      WHERE scans.id = scan_files.scan_id
        AND scans.user_id = auth.uid()
    )
  );

-- Service role inserts/deletes bypass RLS
-- No INSERT/DELETE policy for anon role — all writes go through service role
