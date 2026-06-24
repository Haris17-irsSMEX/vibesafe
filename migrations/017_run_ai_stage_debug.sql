-- migrations/017_run_ai_stage_debug.sql
-- Add error_stage and scan_engine if missing

alter table scans
add column if not exists error_stage text;

alter table scans
add column if not exists scan_engine text;
