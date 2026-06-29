-- migrations/021_phase_8g_strict_audit_safe_columns.sql

alter table scans
add column if not exists audit_checklist jsonb;

alter table scans
add column if not exists security_posture text;

alter table scans
add column if not exists quick_wins jsonb;

alter table scans
add column if not exists what_is_done_right jsonb;

alter table scans
add column if not exists priority_plan jsonb;

alter table scans
add column if not exists audit_prompt_version text;

alter table scans
add column if not exists executive_summary text;

alter table scans
add column if not exists security_verdict text;

alter table scans
add column if not exists production_readiness text;

alter table scans
add column if not exists top_risks jsonb;

alter table scans
add column if not exists positive_findings jsonb;

alter table scans
add column if not exists remediation_plan jsonb;

alter table scans
add column if not exists business_impact text;

alter table scans
add column if not exists technical_summary text;

alter table scans
add column if not exists estimated_fix_effort text;

alter table scans
add column if not exists report_generated_at timestamptz;

alter table scans
add column if not exists scan_engine text;

alter table scans
add column if not exists error_stage text;
