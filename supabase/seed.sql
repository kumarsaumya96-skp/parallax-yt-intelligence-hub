insert into public.brands (id, name, industry) values
('00000000-0000-4000-8000-000000000001', 'Aster Finance', 'BFSI'),
('00000000-0000-4000-8000-000000000002', 'Nova Mobility', 'Automotive'),
('00000000-0000-4000-8000-000000000003', 'Luma Skin', 'Beauty'),
('00000000-0000-4000-8000-000000000004', 'Vertex Learning', 'Education'),
('00000000-0000-4000-8000-000000000005', 'HomeHarvest', 'Consumer')
on conflict (id) do nothing;

insert into public.channels (brand_id, youtube_channel_id, title, handle, connection_state, source)
select id, 'demo-' || right(id::text, 4), name || ' India', '@' || lower(replace(name, ' ', '')), 'demo', 'seeded-demo'
from public.brands
on conflict (brand_id, youtube_channel_id) do nothing;

insert into public.diagnostic_rules (name, metric, operator, threshold, comparison_basis, minimum_sample) values
('Breakout', 'first_7_day_views', '>=', 1.5, 'comparable_recent_video_median', 400),
('Underperforming', 'first_7_day_views', '<=', 0.6, 'comparable_recent_video_median', 400),
('Resurging', 'last_14_day_views', '>=', 1.5, 'previous_14_days', 750),
('Strong Search', 'search_share', '>=', 0.34, 'channel_median', 400)
on conflict do nothing;
