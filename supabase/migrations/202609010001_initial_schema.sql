create extension if not exists pgcrypto;

create type public.connection_state as enum ('connected', 'disconnected', 'error', 'demo');
create type public.job_state as enum ('scheduled', 'running', 'succeeded', 'failed');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'analyst',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  industry text,
  logo_path text,
  account_manager_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brand_memberships (
  brand_id uuid not null references public.brands(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (brand_id, user_id)
);

create table public.channels (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade,
  youtube_channel_id text not null, title text not null, handle text, connection_state public.connection_state not null default 'disconnected',
  source text not null default 'youtube', last_synced_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (brand_id, youtube_channel_id)
);

create table public.channel_connections (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, channel_id uuid not null references public.channels(id) on delete cascade,
  provider text not null, encrypted_token_material jsonb not null default '{}'::jsonb, scopes text[] not null default '{}', state public.connection_state not null default 'disconnected',
  expires_at timestamptz, revoked_at timestamptz, last_synced_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (channel_id, provider)
);

create table public.videos (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, channel_id uuid not null references public.channels(id) on delete cascade,
  youtube_video_id text not null, title text not null, description text, format text not null, duration_seconds integer, published_at timestamptz not null, thumbnail_url text,
  source text not null default 'youtube', last_synced_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (channel_id, youtube_video_id)
);

create table public.channel_daily_metrics (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, channel_id uuid not null references public.channels(id) on delete cascade,
  metric_date date not null, views bigint, watch_minutes numeric, subscribers_gained integer, subscribers_lost integer, likes integer, comments integer, shares integer, avg_view_duration_seconds numeric,
  source text not null, last_synced_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (channel_id, metric_date, source)
);

create table public.video_daily_metrics (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, channel_id uuid not null references public.channels(id) on delete cascade, video_id uuid not null references public.videos(id) on delete cascade,
  metric_date date not null, views bigint, watch_minutes numeric, subscribers_gained integer, likes integer, comments integer, shares integer, estimated_minutes_watched numeric,
  source text not null, last_synced_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (video_id, metric_date, source)
);

create table public.traffic_source_metrics (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, channel_id uuid not null references public.channels(id) on delete cascade, video_id uuid references public.videos(id) on delete cascade,
  metric_date date not null, traffic_source text not null, views bigint, watch_minutes numeric, source text not null, last_synced_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (channel_id, video_id, metric_date, traffic_source, source)
);

create table public.search_query_metrics (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, channel_id uuid not null references public.channels(id) on delete cascade, video_id uuid references public.videos(id) on delete cascade,
  metric_date date not null, query text not null, views bigint, watch_minutes numeric, source text not null, last_synced_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.audience_metrics (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, channel_id uuid not null references public.channels(id) on delete cascade,
  metric_date date not null, dimension text not null, segment text not null, metric_name text not null, metric_value numeric, availability text not null default 'available',
  source text not null, last_synced_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.competitors (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, name text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (brand_id, name)
);

create table public.competitor_channels (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, competitor_id uuid not null references public.competitors(id) on delete cascade,
  youtube_channel_id text not null, title text not null, source text not null default 'youtube-public', last_synced_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (brand_id, youtube_channel_id)
);

create table public.competitor_snapshots (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, competitor_channel_id uuid not null references public.competitor_channels(id) on delete cascade,
  snapshot_date date not null, subscribers bigint, public_views bigint, upload_count integer, median_recent_views bigint, publishing_frequency numeric, source text not null default 'youtube-public', last_synced_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (competitor_channel_id, snapshot_date)
);

create table public.competitor_videos (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, competitor_channel_id uuid not null references public.competitor_channels(id) on delete cascade,
  youtube_video_id text not null, title text not null, published_at timestamptz not null, public_views bigint, duration_seconds integer, format text, breakout_ratio numeric,
  source text not null default 'youtube-public', last_synced_at timestamptz, provider_payload jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (competitor_channel_id, youtube_video_id)
);

create table public.content_tags (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, name text not null, color text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (brand_id, name)
);
create table public.video_tags (
  brand_id uuid not null references public.brands(id) on delete cascade, video_id uuid not null references public.videos(id) on delete cascade, tag_id uuid not null references public.content_tags(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (video_id, tag_id)
);
create table public.annotations (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, channel_id uuid references public.channels(id) on delete cascade,
  event_date date not null, event_type text not null, title text not null, description text, created_by uuid references public.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.goals (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, channel_id uuid not null references public.channels(id) on delete cascade,
  metric text not null, period_start date not null, period_end date not null, target_value numeric not null, current_value numeric, projected_value numeric, status text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.diagnostic_rules (
  id uuid primary key default gen_random_uuid(), brand_id uuid references public.brands(id) on delete cascade, name text not null, metric text not null, operator text not null, threshold numeric not null, comparison_basis text not null,
  minimum_sample integer not null default 400, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.video_diagnostics (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, video_id uuid not null references public.videos(id) on delete cascade, rule_id uuid references public.diagnostic_rules(id) on delete set null,
  label text not null, score integer check (score between 0 and 100), evidence jsonb not null default '[]'::jsonb, calculated_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, title text not null, opportunity_type text not null, priority text not null,
  score integer check (score between 0 and 100), recommended_format text, status text not null default 'open', summary text, source text not null default 'calculated', last_synced_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.opportunity_signals (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  signal_type text not null, normalized_score numeric check (normalized_score between 0 and 1), configured_weight numeric not null, evidence jsonb not null default '{}'::jsonb,
  source text not null, last_synced_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.content_ideas (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, opportunity_id uuid references public.opportunities(id) on delete set null,
  title text not null, brief text, status text not null default 'saved', assignee_id uuid references public.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.ai_insights (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, entity_type text not null, entity_id uuid,
  generated_payload jsonb not null, edited_payload jsonb, approval_state text not null default 'draft', approved_by uuid references public.users(id), approved_at timestamptz,
  provider text not null, model text, prompt_version text not null, source_period_start date, source_period_end date, evidence_refs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.alert_rules (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, channel_id uuid references public.channels(id) on delete cascade, video_id uuid references public.videos(id) on delete cascade,
  metric text not null, condition text not null, threshold numeric not null, evaluation_window text not null, comparison_window text, notification_channels text[] not null default '{in-app}', active boolean not null default true,
  created_by uuid references public.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.alert_events (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, rule_id uuid references public.alert_rules(id) on delete set null,
  severity text not null, reason text not null, observed_value numeric, comparison_value numeric, evidence jsonb not null default '{}'::jsonb, triggered_at timestamptz not null default now(), resolved_at timestamptz,
  resolved_by uuid references public.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.report_templates (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, name text not null, metric_config jsonb not null default '[]'::jsonb,
  commentary_enabled boolean not null default true, commentary_style text not null default 'Executive', branding_config jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (brand_id, name)
);
create table public.report_template_sections (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, template_id uuid not null references public.report_templates(id) on delete cascade,
  section_type text not null, position integer not null, settings jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (template_id, position)
);
create table public.report_runs (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, template_id uuid references public.report_templates(id) on delete set null,
  period_start date not null, period_end date not null, comparison_start date, comparison_end date, state public.job_state not null default 'scheduled', requested_by uuid references public.users(id),
  error_message text, started_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.report_artifacts (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, report_run_id uuid not null references public.report_runs(id) on delete cascade,
  format text not null, storage_path text not null, file_name text not null, size_bytes bigint, checksum text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (report_run_id, format)
);
create table public.report_recipients (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, name text, email text not null, cc boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (brand_id, email, cc)
);
create table public.report_schedules (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, template_id uuid not null references public.report_templates(id) on delete cascade,
  frequency text not null, cron_expression text, timezone text not null default 'Asia/Kolkata', recipients jsonb not null default '[]'::jsonb, subject text not null, message text, include_excel boolean not null default true, include_pdf boolean not null default true,
  active boolean not null default true, next_run_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.delivery_logs (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, report_run_id uuid references public.report_runs(id) on delete set null, schedule_id uuid references public.report_schedules(id) on delete set null,
  provider text not null, state public.job_state not null, recipients jsonb not null default '[]'::jsonb, provider_message_id text, error_message text, attempted_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.sync_jobs (
  id uuid primary key default gen_random_uuid(), brand_id uuid references public.brands(id) on delete cascade, channel_id uuid references public.channels(id) on delete cascade, provider text not null, job_type text not null,
  state public.job_state not null default 'scheduled', records_processed integer not null default 0, error_message text, scheduled_at timestamptz, started_at timestamptz, completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.integration_settings (
  id uuid primary key default gen_random_uuid(), brand_id uuid references public.brands(id) on delete cascade, provider text not null, state public.connection_state not null default 'disconnected', settings jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz, next_sync_at timestamptz, last_error text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (brand_id, provider)
);

create table public.internal_notes (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, entity_type text not null, entity_id uuid, body text not null,
  include_in_client_reports boolean not null default false, created_by uuid references public.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index channel_daily_metrics_lookup on public.channel_daily_metrics (brand_id, channel_id, metric_date);
create index video_daily_metrics_lookup on public.video_daily_metrics (brand_id, video_id, metric_date);
create index traffic_source_lookup on public.traffic_source_metrics (brand_id, channel_id, metric_date);
create index search_query_lookup on public.search_query_metrics (brand_id, channel_id, metric_date);
create index competitor_snapshot_lookup on public.competitor_snapshots (brand_id, competitor_channel_id, snapshot_date);
create index videos_channel_published on public.videos (brand_id, channel_id, published_at desc);
create index opportunities_priority on public.opportunities (brand_id, status, score desc);
create index alert_events_open on public.alert_events (brand_id, resolved_at, triggered_at desc);
create index report_runs_period on public.report_runs (brand_id, period_end desc);
create index sync_jobs_health on public.sync_jobs (brand_id, provider, created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
do $$ declare relation regclass; begin
  foreach relation in array array[
    'public.users'::regclass, 'public.brands'::regclass, 'public.channels'::regclass, 'public.channel_connections'::regclass,
    'public.videos'::regclass, 'public.channel_daily_metrics'::regclass, 'public.video_daily_metrics'::regclass, 'public.opportunities'::regclass,
    'public.alert_rules'::regclass, 'public.alert_events'::regclass, 'public.report_templates'::regclass, 'public.report_runs'::regclass,
    'public.report_schedules'::regclass, 'public.sync_jobs'::regclass, 'public.integration_settings'::regclass
  ] loop execute format('create trigger set_updated_at before update on %s for each row execute function public.set_updated_at()', relation); end loop;
end $$;
