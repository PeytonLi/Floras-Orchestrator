-- ============================================================
-- Floras Orchestrator — Supabase schema (durable run mirror)
--
-- The orchestrator's in-memory Map is runtime truth; these tables
-- are a best-effort durable mirror so run history + accumulated
-- context survive restarts. `runs.context` is the single home for
-- the PipelineContext.
--
-- Hackathon posture: anon access, NO row-level security. Production
-- auth + RLS are deferred (see TODOS.md).
-- ============================================================

create table if not exists runs (
  id          text primary key,
  stage       text,
  error       text,
  -- full PipelineRun snapshot (agents, configs, input, ...)
  data        jsonb not null,
  -- single home for the accumulated PipelineContext
  context     jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists runs_created_at_idx on runs (created_at desc);
create index if not exists runs_stage_idx on runs (stage);

create table if not exists intake_forms (
  run_id      text primary key references runs (id) on delete cascade,
  form        jsonb not null,
  created_at  timestamptz not null default now()
);

create table if not exists artifacts (
  id          text primary key,
  run_id      text references runs (id) on delete cascade,
  type        text,
  file_name   text,
  storage_path text,
  agent_id    text,
  created_at  timestamptz not null default now()
);

create index if not exists artifacts_run_idx on artifacts (run_id);

-- Registry of pluggable remote agents (other teams' OpenCode agents).
-- The orchestrator can load these at startup and slot them into the
-- pipeline without code changes.
create table if not exists external_agents (
  id          text primary key,
  name        text not null,
  endpoint    text not null,
  auth_header text,
  stage       text,
  enabled     boolean not null default true,
  created_at  timestamptz not null default now()
);
