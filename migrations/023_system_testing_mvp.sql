-- Phase 2A: evidence-only System Testing MVP.
-- Additive tables only. All mutations happen through authenticated server routes
-- using the service role; RLS restricts client reads to the owning user.

create table if not exists system_test_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_url text not null,
  normalized_origin text not null,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed')),
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  summary jsonb,
  created_at timestamptz not null default now()
);

create index if not exists system_test_runs_user_created_idx
  on system_test_runs(user_id, created_at desc);

create table if not exists system_test_findings (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references system_test_runs(id) on delete cascade,
  severity text not null check (severity in ('high', 'medium', 'low', 'info')),
  category text not null check (category in (
    'broken_page', 'broken_link', 'console_error', 'network_error',
    'dead_button', 'runtime_error', 'accessibility_basic', 'performance_basic'
  )),
  title text not null,
  page_url text not null,
  action text,
  expected_result text,
  actual_result text not null,
  evidence jsonb not null,
  reproduction_steps jsonb not null default '[]'::jsonb,
  screenshot_url text,
  created_at timestamptz not null default now()
);

create index if not exists system_test_findings_run_created_idx
  on system_test_findings(run_id, created_at asc);

alter table system_test_runs enable row level security;
alter table system_test_findings enable row level security;

drop policy if exists "Users can read own system test runs" on system_test_runs;
create policy "Users can read own system test runs"
  on system_test_runs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own system test findings" on system_test_findings;
create policy "Users can read own system test findings"
  on system_test_findings for select
  using (
    exists (
      select 1 from system_test_runs
      where system_test_runs.id = system_test_findings.run_id
        and system_test_runs.user_id = auth.uid()
    )
  );

-- No public insert/update policies: authenticated API routes use the service role.
