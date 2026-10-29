begin;

/* ============================================================
 * FASE 15 · BORRADORES DE TURNOS INTELIGENTES
 * ============================================================ */

create table if not exists public.attendance_shift_draft_settings (
  id smallint primary key default 1 check (id = 1),
  max_weekly_hours numeric(6,2) not null default 48
    check (max_weekly_hours between 1 and 168),
  max_daily_hours numeric(6,2) not null default 10
    check (max_daily_hours between 1 and 24),
  minimum_shift_hours numeric(6,2) not null default 4
    check (minimum_shift_hours between 1 and 24),
  maximum_shift_hours numeric(6,2) not null default 10
    check (maximum_shift_hours between 1 and 24),
  updated_at timestamptz not null default now(),
  updated_by uuid null references public.profiles(id),
  constraint attendance_shift_draft_settings_min_max_check
    check (minimum_shift_hours <= maximum_shift_hours)
);

insert into public.attendance_shift_draft_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.attendance_shift_drafts (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  week_end date not null,
  version integer not null,
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'discarded')),
  notes text,
  generated_at timestamptz not null default now(),
  generated_by uuid not null references public.profiles(id),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  discarded_at timestamptz,
  discarded_by uuid references public.profiles(id),
  constraint attendance_shift_drafts_week_check
    check (week_end = week_start + 6),
  unique (week_start, version)
);

create unique index if not exists attendance_shift_drafts_one_approved_week_idx
on public.attendance_shift_drafts (week_start)
where status = 'approved';

create table if not exists public.attendance_shift_draft_items (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.attendance_shift_drafts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_date date not null,
  start_time time not null,
  end_time time not null,
  demand_hours_covered numeric(8,2) not null default 0,
  rationale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_shift_draft_items_times_check
    check (start_time <> end_time),
  unique (draft_id, user_id, work_date)
);

alter table public.attendance_shift_draft_settings enable row level security;
alter table public.attendance_shift_drafts enable row level security;
alter table public.attendance_shift_draft_items enable row level security;

revoke all on public.attendance_shift_draft_settings from anon, authenticated;
revoke all on public.attendance_shift_drafts from anon, authenticated;
revoke all on public.attendance_shift_draft_items from anon, authenticated;

create or replace function public.attendance_shift_minutes(
  p_start time,
  p_end time
)
returns integer
language sql
immutable
as $$
  select case
    when p_end > p_start then
      extract(epoch from (p_end - p_start))::integer / 60
    else
      (extract(epoch from (time '24:00' - p_start))::integer / 60)
      + (extract(epoch from (p_end - time '00:00'))::integer / 60)
  end;
$$;

create or replace function public.attendance_admin_get_shift_draft_settings()
returns table (
  max_weekly_hours numeric,
  max_daily_hours numeric,
  minimum_shift_hours numeric,
  maximum_shift_hours numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.attendance_assert_active_admin();
  return query
  select s.max_weekly_hours, s.max_daily_hours,
         s.minimum_shift_hours, s.maximum_shift_hours
  from public.attendance_shift_draft_settings s
  where s.id = 1;
end;
$$;

create or replace function public.attendance_admin_save_shift_draft_settings(
  p_max_weekly_hours numeric,
  p_max_daily_hours numeric,
  p_minimum_shift_hours numeric,
  p_maximum_shift_hours numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.attendance_assert_active_admin();

  if p_max_weekly_hours <= 0 or p_max_weekly_hours > 168 then
    raise exception 'El máximo semanal debe estar entre 1 y 168 horas.';
  end if;
  if p_max_daily_hours <= 0 or p_max_daily_hours > 24 then
    raise exception 'El máximo diario debe estar entre 1 y 24 horas.';
  end if;
  if p_minimum_shift_hours <= 0 or p_maximum_shift_hours > 24
     or p_minimum_shift_hours > p_maximum_shift_hours then
    raise exception 'Los límites del turno no son válidos.';
  end if;

  update public.attendance_shift_draft_settings
  set max_weekly_hours = p_max_weekly_hours,
      max_daily_hours = p_max_daily_hours,
      minimum_shift_hours = p_minimum_shift_hours,
      maximum_shift_hours = p_maximum_shift_hours,
      updated_at = now(),
      updated_by = auth.uid()
  where id = 1;
end;
$$;

create or replace function public.attendance_admin_create_shift_draft(
  p_week_start date,
  p_notes text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_version integer;
  v_item jsonb;
  v_user uuid;
  v_date date;
  v_start time;
  v_end time;
  v_dow integer;
  v_base record;
begin
  perform public.attendance_assert_active_admin();

  if p_week_start is null then
    raise exception 'La semana es obligatoria.';
  end if;
  if extract(dow from p_week_start)::integer <> 1 then
    raise exception 'La semana debe iniciar en lunes.';
  end if;
  if p_week_start < current_date then
    raise exception 'No se puede crear un borrador para una semana pasada.';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El borrador debe contener al menos un turno.';
  end if;

  select coalesce(max(d.version), 0) + 1
  into v_version
  from public.attendance_shift_drafts d
  where d.week_start = p_week_start;

  insert into public.attendance_shift_drafts (
    week_start, week_end, version, status, notes, generated_by
  ) values (
    p_week_start, p_week_start + 6, v_version, 'draft', nullif(trim(coalesce(p_notes, '')), ''), auth.uid()
  ) returning id into v_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_user := (v_item ->> 'userId')::uuid;
    v_date := (v_item ->> 'workDate')::date;
    v_start := (v_item ->> 'startTime')::time;
    v_end := (v_item ->> 'endTime')::time;

    if v_date < p_week_start or v_date > p_week_start + 6 then
      raise exception 'Todos los turnos deben pertenecer a la semana del borrador.';
    end if;

    if not exists (
      select 1 from public.profiles p
      where p.id = v_user and coalesce(p.is_active, false) = true
    ) then
      raise exception 'Uno de los empleados ya no está activo.';
    end if;

    /*
     * La app genera dentro de la disponibilidad base.
     * Esta comprobación adicional usa el RPC vigente para evitar
     * guardar un día declarado no laborable.
     */
    v_dow := extract(dow from v_date)::integer;
    select * into v_base
    from public.attendance_admin_get_employee_schedule(v_user) s
    where s.day_of_week = v_dow
    limit 1;

    if v_base.day_of_week is null or not coalesce(v_base.is_working, false) then
      raise exception 'El empleado no tiene disponibilidad base para %.', v_date;
    end if;

    insert into public.attendance_shift_draft_items (
      draft_id, user_id, work_date, start_time, end_time,
      demand_hours_covered, rationale
    ) values (
      v_id, v_user, v_date, v_start, v_end,
      coalesce((v_item ->> 'demandHoursCovered')::numeric, 0),
      nullif(trim(coalesce(v_item ->> 'rationale', '')), '')
    );
  end loop;

  return v_id;
end;
$$;

create or replace function public.attendance_admin_list_shift_drafts()
returns table (
  id uuid,
  week_start date,
  week_end date,
  version integer,
  status text,
  generated_at timestamptz,
  generated_by_name text,
  approved_at timestamptz,
  approved_by_name text,
  discarded_at timestamptz,
  discarded_by_name text,
  notes text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.attendance_assert_active_admin();
  return query
  select d.id, d.week_start, d.week_end, d.version, d.status,
         d.generated_at,
         nullif(trim(concat_ws(' ', gp.first_name, gp.last_name)), ''),
         d.approved_at,
         nullif(trim(concat_ws(' ', ap.first_name, ap.last_name)), ''),
         d.discarded_at,
         nullif(trim(concat_ws(' ', dp.first_name, dp.last_name)), ''),
         coalesce(d.notes, '')
  from public.attendance_shift_drafts d
  left join public.profiles gp on gp.id = d.generated_by
  left join public.profiles ap on ap.id = d.approved_by
  left join public.profiles dp on dp.id = d.discarded_by
  order by d.week_start desc, d.version desc;
end;
$$;

create or replace function public.attendance_admin_get_shift_draft_items(
  p_draft_id uuid
)
returns table (
  id uuid,
  draft_id uuid,
  user_id uuid,
  employee_name text,
  employee_role text,
  work_date date,
  start_time time,
  end_time time,
  planned_minutes integer,
  demand_hours_covered numeric,
  rationale text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.attendance_assert_active_admin();
  return query
  select i.id, i.draft_id, i.user_id,
         nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
         p.role::text,
         i.work_date, i.start_time, i.end_time,
         public.attendance_shift_minutes(i.start_time, i.end_time),
         i.demand_hours_covered,
         coalesce(i.rationale, '')
  from public.attendance_shift_draft_items i
  join public.profiles p on p.id = i.user_id
  where i.draft_id = p_draft_id
  order by i.work_date, i.start_time, employee_name;
end;
$$;

create or replace function public.attendance_admin_update_shift_draft_item(
  p_item_id uuid,
  p_start_time time,
  p_end_time time,
  p_rationale text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft public.attendance_shift_drafts%rowtype;
begin
  perform public.attendance_assert_active_admin();

  select d.* into v_draft
  from public.attendance_shift_drafts d
  join public.attendance_shift_draft_items i on i.draft_id = d.id
  where i.id = p_item_id;

  if v_draft.id is null then
    raise exception 'No se encontró el turno.';
  end if;
  if v_draft.status <> 'draft' then
    raise exception 'Solo se pueden editar borradores.';
  end if;
  if p_start_time = p_end_time then
    raise exception 'Entrada y salida no pueden ser iguales.';
  end if;

  update public.attendance_shift_draft_items
  set start_time = p_start_time,
      end_time = p_end_time,
      rationale = coalesce(nullif(trim(p_rationale), ''), rationale),
      updated_at = now()
  where id = p_item_id;
end;
$$;

create or replace function public.attendance_admin_approve_shift_draft(
  p_draft_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft public.attendance_shift_drafts%rowtype;
  v_settings public.attendance_shift_draft_settings%rowtype;
  v_bad uuid;
begin
  perform public.attendance_assert_active_admin();

  select * into v_draft
  from public.attendance_shift_drafts
  where id = p_draft_id
  for update;

  if v_draft.id is null then
    raise exception 'No se encontró el borrador.';
  end if;
  if v_draft.status <> 'draft' then
    raise exception 'Solo se puede aprobar un borrador pendiente.';
  end if;
  if v_draft.week_start < current_date then
    raise exception 'No se puede aprobar una semana que ya comenzó en el pasado.';
  end if;
  if exists (
    select 1 from public.attendance_shift_drafts d
    where d.week_start = v_draft.week_start
      and d.status = 'approved'
      and d.id <> v_draft.id
  ) then
    raise exception 'Ya existe un plan aprobado para esa semana.';
  end if;

  select * into v_settings from public.attendance_shift_draft_settings where id = 1;

  select i.user_id into v_bad
  from public.attendance_shift_draft_items i
  where i.draft_id = p_draft_id
  group by i.user_id
  having sum(public.attendance_shift_minutes(i.start_time, i.end_time))
         > (v_settings.max_weekly_hours * 60)
  limit 1;

  if v_bad is not null then
    raise exception 'El borrador excede el máximo semanal de al menos un empleado.';
  end if;

  if exists (
    select 1
    from public.attendance_shift_draft_items i
    where i.draft_id = p_draft_id
      and public.attendance_shift_minutes(i.start_time, i.end_time)
          > (least(v_settings.max_daily_hours, v_settings.maximum_shift_hours) * 60)
  ) then
    raise exception 'El borrador contiene un turno que excede el máximo diario.';
  end if;

  update public.attendance_shift_drafts
  set status = 'approved', approved_at = now(), approved_by = auth.uid()
  where id = p_draft_id;
end;
$$;

create or replace function public.attendance_admin_discard_shift_draft(
  p_draft_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.attendance_assert_active_admin();
  update public.attendance_shift_drafts
  set status = 'discarded', discarded_at = now(), discarded_by = auth.uid()
  where id = p_draft_id and status = 'draft';
  if not found then
    raise exception 'Solo se puede descartar un borrador pendiente.';
  end if;
end;
$$;

create or replace function public.attendance_admin_list_approved_weekly_plan(
  p_start_date date,
  p_end_date date
)
returns table (
  id uuid,
  draft_id uuid,
  user_id uuid,
  employee_name text,
  employee_role text,
  work_date date,
  start_time time,
  end_time time,
  planned_minutes integer,
  demand_hours_covered numeric,
  rationale text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.attendance_assert_active_admin();
  return query
  select i.id, i.draft_id, i.user_id,
         nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
         p.role::text,
         i.work_date, i.start_time, i.end_time,
         public.attendance_shift_minutes(i.start_time, i.end_time),
         i.demand_hours_covered, coalesce(i.rationale, '')
  from public.attendance_shift_draft_items i
  join public.attendance_shift_drafts d on d.id = i.draft_id and d.status = 'approved'
  join public.profiles p on p.id = i.user_id
  where i.work_date between p_start_date and p_end_date
  order by i.work_date, i.start_time, employee_name;
end;
$$;

/*
 * Devuelve un turno semanal aprobado si existe. Este helper queda disponible
 * para el checador/reportes y permite priorizar el plan de una fecha concreta
 * sin destruir la plantilla semanal base del empleado.
 */
create or replace function public.attendance_approved_shift_for_date(
  p_user_id uuid,
  p_date date
)
returns table (
  is_planned boolean,
  start_time time,
  end_time time,
  source text,
  draft_id uuid
)
language sql
security definer
set search_path = public
stable
as $$
  select true, i.start_time, i.end_time, 'approved_weekly_plan'::text, i.draft_id
  from public.attendance_shift_draft_items i
  join public.attendance_shift_drafts d on d.id = i.draft_id
  where d.status = 'approved'
    and i.user_id = p_user_id
    and i.work_date = p_date
  order by d.version desc
  limit 1;
$$;

/*
 * Snapshot operativo: cuando una entrada sí pasa las reglas actuales del
 * checador y existe un plan semanal aprobado para esa fecha, ese plan tiene
 * prioridad para los campos de horario usados por métricas posteriores.
 * Como el generador solo trabaja dentro de disponibilidad base, no amplía
 * por sí mismo la ventana de entrada.
 */
create or replace function public.attendance_apply_approved_shift_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timezone text;
  v_date date;
  v_shift record;
  v_start_local timestamp;
  v_end_local timestamp;
begin
  select coalesce(bs.timezone, 'America/Mexico_City')
  into v_timezone
  from public.business_settings bs
  where bs.id = 1;
  v_timezone := coalesce(v_timezone, 'America/Mexico_City');
  v_date := timezone(v_timezone, new.clock_in)::date;

  select * into v_shift
  from public.attendance_approved_shift_for_date(new.user_id, v_date);

  if coalesce(v_shift.is_planned, false) then
    v_start_local := v_date + v_shift.start_time;
    if v_shift.end_time > v_shift.start_time then
      v_end_local := v_date + v_shift.end_time;
    else
      v_end_local := (v_date + 1) + v_shift.end_time;
    end if;

    new.schedule_date := v_date;
    new.scheduled_start := v_start_local at time zone v_timezone;
    new.scheduled_end := v_end_local at time zone v_timezone;
    new.schedule_source := 'approved_weekly_plan';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_attendance_apply_approved_shift_snapshot
on public.attendance_records;

create trigger trg_attendance_apply_approved_shift_snapshot
before insert on public.attendance_records
for each row
execute function public.attendance_apply_approved_shift_snapshot();

grant execute on function public.attendance_admin_get_shift_draft_settings() to authenticated;
grant execute on function public.attendance_admin_save_shift_draft_settings(numeric,numeric,numeric,numeric) to authenticated;
grant execute on function public.attendance_admin_create_shift_draft(date,text,jsonb) to authenticated;
grant execute on function public.attendance_admin_list_shift_drafts() to authenticated;
grant execute on function public.attendance_admin_get_shift_draft_items(uuid) to authenticated;
grant execute on function public.attendance_admin_update_shift_draft_item(uuid,time,time,text) to authenticated;
grant execute on function public.attendance_admin_approve_shift_draft(uuid) to authenticated;
grant execute on function public.attendance_admin_discard_shift_draft(uuid) to authenticated;
grant execute on function public.attendance_admin_list_approved_weekly_plan(date,date) to authenticated;
grant execute on function public.attendance_approved_shift_for_date(uuid,date) to authenticated;

commit;
