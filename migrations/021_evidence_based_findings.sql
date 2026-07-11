-- Additive, backwards-compatible fields for evidence-based CtrlCode findings.
-- Existing scan_results rows and the legacy lifecycle `status` column are unchanged.

alter table scan_results
  add column if not exists line_end integer,
  add column if not exists finding_status text,
  add column if not exists evidence text,
  add column if not exists attack_scenario text,
  add column if not exists verification_steps jsonb,
  add column if not exists false_positive_risk text;

alter table scan_results
  drop constraint if exists scan_results_finding_status_check;

alter table scan_results
  add constraint scan_results_finding_status_check
  check (finding_status is null or finding_status in ('confirmed', 'potential', 'needs_manual_verification'));

create index if not exists scan_results_finding_status_idx
  on scan_results(scan_id, finding_status);
