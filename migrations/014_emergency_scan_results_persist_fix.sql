-- 014_emergency_scan_results_persist_fix.sql

alter table scan_results
add column if not exists severity text;

alter table scan_results
add column if not exists check_name text;

alter table scan_results
add column if not exists category text;

alter table scan_results
add column if not exists description text;

alter table scan_results
add column if not exists file_path text;

alter table scan_results
add column if not exists line_number integer;

alter table scan_results
add column if not exists recommendation text;

alter table scan_results
add column if not exists cwe text;

alter table scan_results
add column if not exists owasp text;

alter table scan_results
add column if not exists confidence text;

alter table scan_results
add column if not exists evidence_snippet text;

alter table scan_results
add column if not exists fix_prompt text;

alter table scan_results
add column if not exists fix_prompt_generated_at timestamptz;

alter table scan_results
add column if not exists fix_prompt_model text;

alter table scan_results
add column if not exists created_at timestamptz default now();
