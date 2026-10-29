begin;

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  clock_in timestamptz not null default now(),
  clock_out timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_records_user_id_fkey
    foreign key (user_id)
    references public.profiles(id)
    on delete cascade,
  constraint attendance_records_clock_order_check
    check (clock_out is null or clock_out > clock_in)
);

create index if not exists attendance_records_clock_idx
  on public.attendance_records (clock_in desc);

create index if not exists attendance_records_user_clock_idx
  on public.attendance_records (user_id, clock_in desc);

create unique index if not exists attendance_records_one_open_per_user_idx
  on public.attendance_records (user_id)
  where clock_out is null;

create table if not exists public.attendance_corrections (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null
    references public.attendance_records(id)
    on delete cascade,
  corrected_by uuid not null
    references public.profiles(id),
  reason text not null,
  previous_clock_in timestamptz not null,
  previous_clock_out timestamptz null,
  new_clock_in timestamptz not null,
  new_clock_out timestamptz null,
  created_at timestamptz not null default now(),
  constraint attendance_corrections_reason_check
    check (length(trim(reason)) > 0),
  constraint attendance_corrections_clock_order_check
    check (new_clock_out is null or new_clock_out > new_clock_in)
);

create index if not exists attendance_corrections_attendance_idx
  on public.attendance_corrections (attendance_id, created_at desc);

create or replace function public.attendance_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_attendance_touch_updated_at
  on public.attendance_records;

create trigger trg_attendance_touch_updated_at
before update on public.attendance_records
for each row
execute function public.attendance_touch_updated_at();

alter table public.attendance_records enable row level security;
alter table public.attendance_corrections enable row level security;

revoke all on public.attendance_records from anon;
revoke all on public.attendance_corrections from anon;

revoke insert, update, delete on public.attendance_records from authenticated;
revoke insert, update, delete on public.attendance_corrections from authenticated;

grant select on public.attendance_records to authenticated;
grant select on public.attendance_corrections to authenticated;

drop policy if exists attendance_records_select_own_or_admin
  on public.attendance_records;

create policy attendance_records_select_own_or_admin
on public.attendance_records
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.profiles viewer
    where viewer.id = auth.uid()
      and viewer.role = 'admin'::public.user_role
      and viewer.is_active = true
  )
);

drop policy if exists attendance_corrections_select_admin
  on public.attendance_corrections;

create policy attendance_corrections_select_admin
on public.attendance_corrections
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles viewer
    where viewer.id = auth.uid()
      and viewer.role = 'admin'::public.user_role
      and viewer.is_active = true
  )
);

create or replace function public.attendance_clock_in()
returns public.attendance_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_record public.attendance_records%rowtype;
begin
  select *
  into v_profile
  from public.profiles
  where id = auth.uid();

  if v_profile.id is null then
    raise exception 'No se encontró el perfil del usuario.';
  end if;

  if not coalesce(v_profile.is_active, false) then
    raise exception 'Tu usuario está inactivo.';
  end if;

  if exists (
    select 1
    from public.attendance_records
    where user_id = auth.uid()
      and clock_out is null
  ) then
    raise exception 'Ya tienes una asistencia abierta.';
  end if;

  insert into public.attendance_records (
    user_id,
    clock_in
  )
  values (
    auth.uid(),
    now()
  )
  returning * into v_record;

  return v_record;
end;
$$;

grant execute on function public.attendance_clock_in() to authenticated;

create or replace function public.attendance_clock_out()
returns public.attendance_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_record public.attendance_records%rowtype;
begin
  select *
  into v_profile
  from public.profiles
  where id = auth.uid();

  if v_profile.id is null then
    raise exception 'No se encontró el perfil del usuario.';
  end if;

  if not coalesce(v_profile.is_active, false) then
    raise exception 'Tu usuario está inactivo.';
  end if;

  select *
  into v_record
  from public.attendance_records
  where user_id = auth.uid()
    and clock_out is null
  order by clock_in desc
  limit 1
  for update;

  if v_record.id is null then
    raise exception 'No tienes una asistencia abierta.';
  end if;

  update public.attendance_records
  set clock_out = now()
  where id = v_record.id
  returning * into v_record;

  return v_record;
end;
$$;

grant execute on function public.attendance_clock_out() to authenticated;

create or replace function public.attendance_admin_list(
  p_limit integer default 250
)
returns table (
  id uuid,
  user_id uuid,
  clock_in timestamptz,
  clock_out timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  employee_name text,
  employee_role text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
begin
  select *
  into v_profile
  from public.profiles
  where profiles.id = auth.uid();

  if v_profile.id is null
     or v_profile.role <> 'admin'::public.user_role
     or not coalesce(v_profile.is_active, false) then
    raise exception 'Solo un administrador activo puede consultar este historial.';
  end if;

  return query
  select
    ar.id,
    ar.user_id,
    ar.clock_in,
    ar.clock_out,
    ar.created_at,
    ar.updated_at,
    trim(concat_ws(' ', p.first_name, p.last_name)) as employee_name,
    p.role::text as employee_role
  from public.attendance_records ar
  join public.profiles p
    on p.id = ar.user_id
  order by ar.clock_in desc
  limit greatest(1, least(coalesce(p_limit, 250), 1000));
end;
$$;

grant execute on function public.attendance_admin_list(integer) to authenticated;

create or replace function public.attendance_admin_correct(
  p_attendance_id uuid,
  p_clock_in timestamptz,
  p_clock_out timestamptz,
  p_reason text
)
returns table (
  id uuid,
  user_id uuid,
  clock_in timestamptz,
  clock_out timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  employee_name text,
  employee_role text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.profiles%rowtype;
  v_existing public.attendance_records%rowtype;
  v_updated public.attendance_records%rowtype;
begin
  select *
  into v_admin
  from public.profiles
  where profiles.id = auth.uid();

  if v_admin.id is null
     or v_admin.role <> 'admin'::public.user_role
     or not coalesce(v_admin.is_active, false) then
    raise exception 'Solo un administrador activo puede corregir asistencias.';
  end if;

  if p_clock_in is null then
    raise exception 'La hora de entrada es obligatoria.';
  end if;

  if p_clock_out is not null and p_clock_out <= p_clock_in then
    raise exception 'La salida debe ser posterior a la entrada.';
  end if;

  if length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'El motivo de la corrección es obligatorio.';
  end if;

  select *
  into v_existing
  from public.attendance_records
  where attendance_records.id = p_attendance_id
  for update;

  if v_existing.id is null then
    raise exception 'No se encontró la asistencia.';
  end if;

  if exists (
    select 1
    from public.attendance_records other
    where other.user_id = v_existing.user_id
      and other.id <> v_existing.id
      and tstzrange(
        other.clock_in,
        coalesce(other.clock_out, 'infinity'::timestamptz),
        '[)'
      ) && tstzrange(
        p_clock_in,
        coalesce(p_clock_out, 'infinity'::timestamptz),
        '[)'
      )
  ) then
    raise exception 'La corrección se traslapa con otra asistencia del empleado.';
  end if;

  update public.attendance_records
  set
    clock_in = p_clock_in,
    clock_out = p_clock_out
  where attendance_records.id = p_attendance_id
  returning * into v_updated;

  insert into public.attendance_corrections (
    attendance_id,
    corrected_by,
    reason,
    previous_clock_in,
    previous_clock_out,
    new_clock_in,
    new_clock_out
  )
  values (
    v_existing.id,
    auth.uid(),
    trim(p_reason),
    v_existing.clock_in,
    v_existing.clock_out,
    v_updated.clock_in,
    v_updated.clock_out
  );

  return query
  select
    v_updated.id,
    v_updated.user_id,
    v_updated.clock_in,
    v_updated.clock_out,
    v_updated.created_at,
    v_updated.updated_at,
    trim(concat_ws(' ', p.first_name, p.last_name)),
    p.role::text
  from public.profiles p
  where p.id = v_updated.user_id;
end;
$$;

grant execute on function public.attendance_admin_correct(uuid, timestamptz, timestamptz, text)
  to authenticated;

commit;
