-- Safe additive schema changes for connected_repos
-- Ensures token saving and reconnects do not drop data

alter table connected_repos
add column if not exists github_user_id bigint;

alter table connected_repos
add column if not exists github_login text;

alter table connected_repos
add column if not exists github_token text;

alter table connected_repos
add column if not exists token_scope text;

alter table connected_repos
add column if not exists connected_at timestamptz default now();

alter table connected_repos
add column if not exists updated_at timestamptz default now();

create unique index if not exists connected_repos_user_id_unique
on connected_repos(user_id);
