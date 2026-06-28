-- migrations/020_scan_security_report.sql
--
-- Adds repo-level security report columns to the scans table.
-- All columns are nullable with no defaults — safe to add without touching existing rows.
-- Do NOT drop or alter any existing columns.

alter table scans
  add column if not exists executive_summary     text;

alter table scans
  add column if not exists security_verdict      text;

-- Values: ready | needs_attention | not_ready | critical_risk
alter table scans
  add column if not exists production_readiness  text;

-- JSON array of top risk objects: [{title, severity, explanation, affected_area}]
alter table scans
  add column if not exists top_risks             jsonb;

-- JSON array of positive finding strings
alter table scans
  add column if not exists positive_findings     jsonb;

-- JSON array of remediation plan steps: [{priority, action, reason, estimated_effort}]
alter table scans
  add column if not exists remediation_plan      jsonb;

alter table scans
  add column if not exists business_impact       text;

alter table scans
  add column if not exists technical_summary     text;

alter table scans
  add column if not exists estimated_fix_effort  text;

alter table scans
  add column if not exists report_generated_at   timestamptz;
