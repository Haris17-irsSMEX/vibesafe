-- 016_add_scan_engine_to_scans.sql

alter table scans
add column if not exists scan_engine text;
