alter table scan_results
add column if not exists line_number integer;

alter table scan_results
add column if not exists vulnerable_code text;

alter table scan_results
add column if not exists evidence_snippet text;

alter table scan_results
add column if not exists fix_prompt text;

alter table scan_results
add column if not exists fix_prompt_generated_at timestamptz;

alter table scan_results
add column if not exists fix_prompt_model text;

alter table scan_results
add column if not exists why_it_matters text default 'This issue may expose the application to security risk if left unresolved.';
