-- Phase 2B: adds safe workflow categories. Workflow metadata stays in the
-- existing system_test_runs.summary JSONB column for backwards compatibility.

alter table system_test_findings
  drop constraint if exists system_test_findings_category_check;

alter table system_test_findings
  add constraint system_test_findings_category_check
  check (category in (
    'broken_page', 'broken_link', 'console_error', 'network_error',
    'dead_button', 'runtime_error', 'accessibility_basic', 'performance_basic',
    'workflow_failure', 'missing_element', 'expectation_failed', 'safety_skipped'
  ));
