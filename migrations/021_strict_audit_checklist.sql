-- migrations/021_strict_audit_checklist.sql
--
-- Adds strict audit checklist and report columns to the scans table.
-- All columns are nullable — safe to add without touching existing rows.
-- Do NOT drop or alter any existing columns.

-- JSON array of checklist items: [{id, section, check, verdict, evidence, file_path}]
ALTER TABLE scans ADD COLUMN IF NOT EXISTS audit_checklist jsonb;

-- Values: critical | needs_work | acceptable | strong
ALTER TABLE scans ADD COLUMN IF NOT EXISTS security_posture text;

-- JSON array of quick win strings
ALTER TABLE scans ADD COLUMN IF NOT EXISTS quick_wins jsonb;

-- JSON array of what is done right strings
ALTER TABLE scans ADD COLUMN IF NOT EXISTS what_is_done_right jsonb;

-- JSON array of prioritized remediation plan strings
ALTER TABLE scans ADD COLUMN IF NOT EXISTS priority_plan jsonb;

-- Prompt version that was used for the audit
ALTER TABLE scans ADD COLUMN IF NOT EXISTS audit_prompt_version text;
