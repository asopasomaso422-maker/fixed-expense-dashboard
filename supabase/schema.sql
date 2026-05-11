create extension if not exists pgcrypto;

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  memo text,
  project text,
  status text,
  priority text,
  urgency text,
  impact text,
  source text default 'slack',
  slack_user_id text,
  slack_channel_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  due_date date
);
