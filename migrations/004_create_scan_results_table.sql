-- migrations/004_create_scan_results_table.sql
-- Additive migration: creates scan_results for DeepSeek findings.

CREATE TABLE IF NOT EXISTS scan_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  check_name text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  category text NOT NULL,
  file_path text NOT NULL,
  line_number integer,
  cwe_id text,
  description text NOT NULL,
  why_it_matters text NOT NULL,
  vulnerable_code text,
  fix_code text,
  fix_prompt text,
  effort_minutes integer,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'ignored')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for quick lookups by scan
CREATE INDEX IF NOT EXISTS scan_results_scan_id_idx ON scan_results(scan_id);

-- Enable Row-Level Security
ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;

-- Allow users to read only their own findings
CREATE POLICY "Users can view their own scan results"
  ON scan_results
  FOR SELECT
  USING (auth.uid() = user_id);
