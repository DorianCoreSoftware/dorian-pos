alter table public.pos_push_devices
add column if not exists device_type text
not null
default 'pos';

alter table public.pos_push_devices
drop constraint if exists
pos_push_devices_device_type_check;

alter table public.pos_push_devices
add constraint
pos_push_devices_device_type_check
check (
  device_type in (
    'pos',
    'driver'
  )
);

create index if not exists
pos_push_devices_device_type_idx
on public.pos_push_devices(
  device_type,
  is_active
);