-- Widen flood_reports bbox to match app polygon bounds
alter table public.flood_reports
  drop constraint if exists flood_reports_bojongsoang_bbox;

alter table public.flood_reports
  add constraint flood_reports_bojongsoang_bbox check (
    latitude between -7.015 and -6.961
    and longitude between 107.608 and 107.711
  );

-- Widen chat_messages bbox to match app polygon bounds
alter table public.chat_messages
  drop constraint if exists chat_messages_bojongsoang_bbox;

alter table public.chat_messages
  add constraint chat_messages_bojongsoang_bbox check (
    attached_lat is null
    or (
      attached_lat between -7.015 and -6.961
      and attached_lng between 107.608 and 107.711
    )
  );
