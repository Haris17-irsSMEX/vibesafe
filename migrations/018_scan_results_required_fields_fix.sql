-- migrations/018_scan_results_required_fields_fix.sql

alter table scan_results
alter column why_it_matters drop not null;

alter table scan_results
alter column why_it_matters set default '';

alter table scan_results
alter column check_name set default 'Security finding';

alter table scan_results
alter column severity set default 'medium';

alter table scan_results
alter column category set default 'general';

alter table scan_results
alter column description set default 'Security issue detected.';
