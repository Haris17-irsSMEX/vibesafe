-- migrations/010_fix_prompt_for_findings.sql
-- Additive migration: Adds metadata columns for fix prompts to scan_results

-- fix_prompt already exists in scan_results from 004_create_scan_results_table.sql

ALTER TABLE scan_results
ADD COLUMN IF NOT EXISTS fix_prompt_generated_at timestamptz;

ALTER TABLE scan_results
ADD COLUMN IF NOT EXISTS fix_prompt_model text;
