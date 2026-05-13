alter table public.flood_reports
  add column if not exists water_depth text
  check (water_depth in ('ankle', 'calf', 'knee', 'thigh', 'waist', 'above_waist') or water_depth is null);
