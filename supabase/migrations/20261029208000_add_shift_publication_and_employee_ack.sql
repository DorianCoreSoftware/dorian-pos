begin;

/* ============================================================
 * FASE 16 · PUBLICACIÓN Y COMUNICACIÓN DE TURNOS
 * ============================================================
 * Separa:
 *   aprobación interna -> publicación a empleados -> confirmación de lectura.
 *
 * Las publicaciones son snapshots inmutables. Si Admin modifica un plan
 * aprobado, el horario que ya vio el empleado NO cambia hasta republicar.
 */

/* ------------------------------------------------------------
 * 1. Preferencia de push específica para turnos
 * ------------------------------------------------------------ */
alter table public.attendance_notification_preferences
  add column if not exists shift_updates boolean not null default true;

drop function if exists public.attendance_get_notification_preferences();
create or replace function public.attendance_get_notification_preferences()
returns table (
  clock_reminders boolean,
  request_updates boolean,
  payroll_updates boolean,
  shift_updates boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.profiles%rowtype;
begin
  select *
  into v_user
  from public.profiles p
  where p.id = auth.uid();

  if v_user.id is null or not coalesce(v_user.is_active, false) then
    raise exception 'Usuario no disponible.';
  end if;

  return query
  select
    coalesce(pref.clock_reminders, true),
    coalesce(pref.request_updates, true),
    coalesce(pref.payroll_updates, true),
    coalesce(pref.shift_updates, true)
  from (select 1) seed
  left join public.attendance_notification_preferences pref
    on pref.user_id = auth.uid();
end;
$$;

drop function if exists public.attendance_save_notification_preferences(
  boolean, boolean, boolean
);
create or replace function public.attendance_save_notification_preferences(
  p_clock_reminders boolean,
  p_request_updates boolean,
  p_payroll_updates boolean,
  p_shift_updates boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.profiles%rowtype;
begin
  select *
  into v_user
  from public.profiles p
  where p.id = auth.uid();

  if v_user.id is null or not coalesce(v_user.is_active, false) then
    raise exception 'Usuario no disponible.';
  end if;

  insert into public.attendance_notification_preferences (
    user_id,
    clock_reminders,
    request_updates,
    payroll_updates,
    shift_updates,
    updated_at,
    updated_by
  )
  values (
    auth.uid(),
    coalesce(p_clock_reminders, true),
    coalesce(p_request_updates, true),
    coalesce(p_payroll_updates, true),
    coalesce(p_shift_updates, true),
    now(),
    auth.uid()
  )
  on conflict (user_id) do update
  set
    clock_reminders = excluded.clock_reminders,
    request_updates = excluded.request_updates,
    payroll_updates = excluded.payroll_updates,
    shift_updates = excluded.shift_updates,
    updated_at = now(),
    updated_by = auth.uid();
end;
$$;

grant execute on function public.attendance_get_notification_preferences()
to authenticated;

grant execute on function public.attendance_save_notification_preferences(
  boolean, boolean, boolean, boolean
)
to authenticated;

/* ------------------------------------------------------------
 * 2. Revisión de planes aprobados y snapshots publicados
 * ------------------------------------------------------------ */
alter table public.attendance_shift_drafts
  add column if not exists current_revision integer not null default 1,
  add column if not exists latest_published_revision integer not null default 0,
  add column if not exists latest_published_at timestamptz,
  add column if not exists latest_published_by uuid references public.profiles(id);

create table if not exists public.attendance_shift_publications (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null
    references public.attendance_shift_drafts(id)
    on delete cascade,
  revision integer not null check (revision > 0),
  published_at timestamptz not null default now(),
  published_by uuid not null references public.profiles(id),
  unique (draft_id, revision)
);

create table if not exists public.attendance_shift_publication_items (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null
    references public.attendance_shift_publications(id)
    on delete cascade,
  source_item_id uuid
    references public.attendance_shift_draft_items(id)
    on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_date date not null,
  start_time time not null,
  end_time time not null,
  rationale text,
  created_at timestamptz not null default now(),
  constraint attendance_shift_publication_items_times_check
    check (start_time <> end_time),
  unique (publication_id, user_id, work_date)
);

create table if not exists public.attendance_shift_publication_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null
    references public.attendance_shift_publications(id)
    on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  unique (publication_id, user_id)
);

create index if not exists attendance_shift_publication_items_user_date_idx
  on public.attendance_shift_publication_items(user_id, work_date);

alter table public.attendance_shift_publications enable row level security;
alter table public.attendance_shift_publication_items enable row level security;
alter table public.attendance_shift_publication_acknowledgements enable row level security;

revoke all on public.attendance_shift_publications from anon, authenticated;
revoke all on public.attendance_shift_publication_items from anon, authenticated;
revoke all on public.attendance_shift_publication_acknowledgements from anon, authenticated;

/* ------------------------------------------------------------
 * 3. Relación entre notificación y publicación
 * ------------------------------------------------------------ */
alter table public.attendance_notifications
  add column if not exists shift_draft_id uuid
    references public.attendance_shift_drafts(id)
    on delete set null,
  add column if not exists shift_revision integer;

/* ------------------------------------------------------------
 * 4. Estado de publicación para Admin
 * ------------------------------------------------------------ */
drop function if exists public.attendance_admin_get_shift_publication_status(uuid);
create or replace function public.attendance_admin_get_shift_publication_status(
  p_draft_id uuid
)
returns table (
  current_revision integer,
  published_revision integer,
  published_at timestamptz,
  published_by_name text,
  employees_count integer,
  acknowledged_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft public.attendance_shift_drafts%rowtype;
  v_publication_id uuid;
begin
  perform public.attendance_assert_active_admin();

  select *
  into v_draft
  from public.attendance_shift_drafts d
  where d.id = p_draft_id;

  if v_draft.id is null then
    raise exception 'No se encontró el plan semanal.';
  end if;

  select sp.id
  into v_publication_id
  from public.attendance_shift_publications sp
  where sp.draft_id = p_draft_id
    and sp.revision = v_draft.latest_published_revision
  limit 1;

  return query
  select
    v_draft.current_revision,
    v_draft.latest_published_revision,
    v_draft.latest_published_at,
    nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
    (
      select count(distinct i.user_id)::integer
      from public.attendance_shift_draft_items i
      where i.draft_id = p_draft_id
    ),
    (
      select count(*)::integer
      from public.attendance_shift_publication_acknowledgements a
      where a.publication_id = v_publication_id
    )
  from (select 1) seed
  left join public.profiles p
    on p.id = v_draft.latest_published_by;
end;
$$;

/* ------------------------------------------------------------
 * 5. Edición de un plan APROBADO.
 *    Sube revisión pero no cambia lo que ya se publicó.
 * ------------------------------------------------------------ */
drop function if exists public.attendance_admin_update_approved_shift_item(
  uuid, time, time, text
);
create or replace function public.attendance_admin_update_approved_shift_item(
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
  v_item public.attendance_shift_draft_items%rowtype;
begin
  perform public.attendance_assert_active_admin();

  select i.*
  into v_item
  from public.attendance_shift_draft_items i
  where i.id = p_item_id;

  if v_item.id is null then
    raise exception 'No se encontró el turno.';
  end if;

  select d.*
  into v_draft
  from public.attendance_shift_drafts d
  where d.id = v_item.draft_id;

  if v_draft.status <> 'approved' then
    raise exception 'Este cambio solo aplica a un plan aprobado.';
  end if;

  if v_item.work_date < current_date then
    raise exception 'No se puede modificar un turno pasado.';
  end if;

  if p_start_time = p_end_time then
    raise exception 'Entrada y salida no pueden ser iguales.';
  end if;

  update public.attendance_shift_draft_items
  set
    start_time = p_start_time,
    end_time = p_end_time,
    rationale = coalesce(nullif(trim(p_rationale), ''), rationale),
    updated_at = now()
  where id = p_item_id;

  update public.attendance_shift_drafts
  set current_revision = current_revision + 1
  where id = v_draft.id;
end;
$$;

/* ------------------------------------------------------------
 * 6. Publicar snapshot vigente
 * ------------------------------------------------------------ */
drop function if exists public.attendance_admin_publish_shift_plan(uuid);
create or replace function public.attendance_admin_publish_shift_plan(
  p_draft_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft public.attendance_shift_drafts%rowtype;
  v_publication_id uuid;
  v_type text;
  v_title text;
  v_user uuid;
  v_name text;
begin
  perform public.attendance_assert_active_admin();

  select *
  into v_draft
  from public.attendance_shift_drafts d
  where d.id = p_draft_id
  for update;

  if v_draft.id is null then
    raise exception 'No se encontró el plan semanal.';
  end if;

  if v_draft.status <> 'approved' then
    raise exception 'Solo se puede publicar un plan aprobado.';
  end if;

  if v_draft.week_end < current_date then
    raise exception 'No se puede publicar una semana que ya terminó.';
  end if;

  if v_draft.latest_published_revision = v_draft.current_revision then
    raise exception 'La revisión vigente ya está publicada.';
  end if;

  insert into public.attendance_shift_publications (
    draft_id,
    revision,
    published_by
  )
  values (
    v_draft.id,
    v_draft.current_revision,
    auth.uid()
  )
  returning id into v_publication_id;

  insert into public.attendance_shift_publication_items (
    publication_id,
    source_item_id,
    user_id,
    work_date,
    start_time,
    end_time,
    rationale
  )
  select
    v_publication_id,
    i.id,
    i.user_id,
    i.work_date,
    i.start_time,
    i.end_time,
    i.rationale
  from public.attendance_shift_draft_items i
  where i.draft_id = v_draft.id;

  v_type :=
    case
      when v_draft.latest_published_revision = 0
        then 'shift_schedule_published'
      else 'shift_schedule_updated'
    end;

  v_title :=
    case
      when v_draft.latest_published_revision = 0
        then 'Tu horario fue publicado'
      else 'Tu horario fue actualizado'
    end;

  for v_user, v_name in
    select distinct
      i.user_id,
      nullif(trim(concat_ws(' ', p.first_name, p.last_name)), '')
    from public.attendance_shift_draft_items i
    join public.profiles p on p.id = i.user_id
    where i.draft_id = v_draft.id
  loop
    if not exists (
      select 1
      from public.attendance_notifications n
      where n.dedup_key =
        'shift:' || v_draft.id::text ||
        ':r' || v_draft.current_revision::text ||
        ':u' || v_user::text
    ) then
      insert into public.attendance_notifications (
        recipient_user_id,
        notification_type,
        title,
        message,
        severity,
        related_user_id,
        work_date,
        dedup_key,
        shift_draft_id,
        shift_revision
      )
      values (
        v_user,
        v_type,
        v_title,
        case
          when v_type = 'shift_schedule_updated'
            then 'Hay cambios en tu horario de ' ||
                 v_draft.week_start::text || ' a ' ||
                 v_draft.week_end::text ||
                 '. Revísalo y confirma la nueva versión.'
          else 'Ya está disponible tu horario de ' ||
               v_draft.week_start::text || ' a ' ||
               v_draft.week_end::text ||
               '. Revísalo y confirma que lo leíste.'
        end,
        'info',
        v_user,
        v_draft.week_start,
        'shift:' || v_draft.id::text ||
        ':r' || v_draft.current_revision::text ||
        ':u' || v_user::text,
        v_draft.id,
        v_draft.current_revision
      );
    end if;
  end loop;

  update public.attendance_shift_drafts
  set
    latest_published_revision = current_revision,
    latest_published_at = now(),
    latest_published_by = auth.uid()
  where id = v_draft.id;

  return v_draft.current_revision;
end;
$$;

/* ------------------------------------------------------------
 * 7. Horario publicado del empleado
 * ------------------------------------------------------------ */
drop function if exists public.attendance_my_published_schedule(date, date);
create or replace function public.attendance_my_published_schedule(
  p_from_date date,
  p_to_date date
)
returns table (
  publication_id uuid,
  draft_id uuid,
  revision integer,
  published_at timestamptz,
  week_start date,
  week_end date,
  work_date date,
  start_time time,
  end_time time,
  planned_minutes integer,
  rationale text,
  acknowledged_at timestamptz
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
  from public.profiles p
  where p.id = auth.uid();

  if v_profile.id is null or not coalesce(v_profile.is_active, false) then
    raise exception 'Usuario no disponible.';
  end if;

  if p_from_date is null or p_to_date is null or p_to_date < p_from_date then
    raise exception 'Rango inválido.';
  end if;

  if (p_to_date - p_from_date) > 180 then
    raise exception 'El rango máximo es de 181 días.';
  end if;

  return query
  select
    sp.id,
    sp.draft_id,
    sp.revision,
    sp.published_at,
    d.week_start,
    d.week_end,
    spi.work_date,
    spi.start_time,
    spi.end_time,
    public.attendance_shift_minutes(spi.start_time, spi.end_time),
    coalesce(spi.rationale, ''),
    ack.acknowledged_at
  from public.attendance_shift_publications sp
  join public.attendance_shift_drafts d
    on d.id = sp.draft_id
   and d.latest_published_revision = sp.revision
  join public.attendance_shift_publication_items spi
    on spi.publication_id = sp.id
   and spi.user_id = auth.uid()
  left join public.attendance_shift_publication_acknowledgements ack
    on ack.publication_id = sp.id
   and ack.user_id = auth.uid()
  where spi.work_date between p_from_date and p_to_date
  order by spi.work_date, spi.start_time;
end;
$$;

drop function if exists public.attendance_my_acknowledge_shift_publication(uuid);
create or replace function public.attendance_my_acknowledge_shift_publication(
  p_publication_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
begin
  select *
  into v_profile
  from public.profiles p
  where p.id = auth.uid();

  if v_profile.id is null or not coalesce(v_profile.is_active, false) then
    raise exception 'Usuario no disponible.';
  end if;

  if not exists (
    select 1
    from public.attendance_shift_publication_items spi
    where spi.publication_id = p_publication_id
      and spi.user_id = auth.uid()
  ) then
    raise exception 'Esta publicación no corresponde a tu usuario.';
  end if;

  insert into public.attendance_shift_publication_acknowledgements (
    publication_id,
    user_id,
    acknowledged_at
  )
  values (
    p_publication_id,
    auth.uid(),
    now()
  )
  on conflict (publication_id, user_id) do update
  set acknowledged_at = excluded.acknowledged_at;
end;
$$;

/* ------------------------------------------------------------
 * 8. El snapshot operativo para nuevas checadas usa la última
 *    versión PUBLICADA, no cambios internos aún no comunicados.
 * ------------------------------------------------------------ */
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
  select
    true,
    spi.start_time,
    spi.end_time,
    'published_weekly_plan'::text,
    sp.draft_id
  from public.attendance_shift_publications sp
  join public.attendance_shift_drafts d
    on d.id = sp.draft_id
   and d.status = 'approved'
   and d.latest_published_revision = sp.revision
  join public.attendance_shift_publication_items spi
    on spi.publication_id = sp.id
  where spi.user_id = p_user_id
    and spi.work_date = p_date
  order by sp.revision desc
  limit 1;
$$;

grant execute on function public.attendance_admin_get_shift_publication_status(uuid)
to authenticated;
grant execute on function public.attendance_admin_update_approved_shift_item(uuid,time,time,text)
to authenticated;
grant execute on function public.attendance_admin_publish_shift_plan(uuid)
to authenticated;
grant execute on function public.attendance_my_published_schedule(date,date)
to authenticated;
grant execute on function public.attendance_my_acknowledge_shift_publication(uuid)
to authenticated;
grant execute on function public.attendance_approved_shift_for_date(uuid,date)
to authenticated;

commit;
