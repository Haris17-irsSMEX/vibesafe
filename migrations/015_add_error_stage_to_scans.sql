-- 015_add_error_stage_to_scans.sql

alter table scans
add column if not exists error_stage text;
