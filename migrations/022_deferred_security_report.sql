-- Keeps the scan lifecycle independent from optional Security Officer Report
-- generation. All fields are additive and nullable for existing scans.

alter table scans
  add column if not exists report_status text;

alter table scans
  add column if not exists report_error text;

alter table scans
  add column if not exists analysis_warnings jsonb;

alter table scans
  drop constraint if exists scans_report_status_check;

alter table scans
  add constraint scans_report_status_check
  check (report_status is null or report_status in ('not_generated', 'generating', 'generated', 'failed'));
