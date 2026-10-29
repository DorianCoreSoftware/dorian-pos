begin;

/* ============================================================
 * FASE 17 · CAMBIOS, INTERCAMBIOS Y COBERTURAS DE TURNO
 * ============================================================
 *
 * Principios:
 * - El empleado solicita; nunca modifica el horario publicado.
 * - Un compañero puede ofrecer cobertura/intercambio.
 * - Administración tiene la aprobación final.
 * - Al aprobar, se crea una nueva revisión y se publica de inmediato.
 * - Coberturas se validan contra disponibilidad declarada,
 *   solapamientos y máximo semanal.
 */

/* ------------------------------------------------------------
 * 1. Disponibilidad voluntaria para coberturas
 * ------------------------------------------------------------ */
create table if not exists public.attendance_shift_coverage_availability (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  is_available boolean not null default false,
  start_time time not null default '08:00',
  end_time time not null default '23:00',
  updated_at timestamptz not null default now(),
  primary key (user_id, day_of_week),
  constraint attendance_shift_coverage_availability_time_check
    check (start_time <> end_time)
);

alter table public.attendance_shift_coverage_availability enable row level security;
revoke all on public.attendance_shift_coverage_availability from anon, authenticated;

/* ------------------------------------------------------------
 * 2. Solicitudes y ofertas
 * ------------------------------------------------------------ */
create table if not exists public.attendance_shift_change_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null
    check (request_type in ('change', 'release', 'swap')),
  status text not null default 'open'
    check (status in ('open', 'approved', 'rejected', 'cancelled')),
  requester_user_id uuid not null references public.profiles(id) on delete cascade,
  source_publication_id uuid not null
    references public.attendance_shift_publications(id) on delete cascade,
  source_publication_item_id uuid not null
    references public.attendance_shift_publication_items(id) on delete cascade,
  source_draft_id uuid not null
    references public.attendance_shift_drafts(id) on delete cascade,
  desired_start_time time,
  desired_end_time time,
  reason text not null,
  selected_offer_id uuid,
  admin_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_shift_change_reason_check
    check (length(trim(reason)) between 3 and 500),
  constraint attendance_shift_change_desired_times_check
    check (
      (
        request_type = 'change'
        and desired_start_time is not null
        and desired_end_time is not null
        and desired_start_time <> desired_end_time
      )
      or
      (
        request_type <> 'change'
        and desired_start_time is null
        and desired_end_time is null
      )
    )
);

create table if not exists public.attendance_shift_change_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null
    references public.attendance_shift_change_requests(id) on delete cascade,
  offered_by uuid not null references public.profiles(id) on delete cascade,
  offered_publication_item_id uuid
    references public.attendance_shift_publication_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (request_id, offered_by)
);

alter table public.attendance_shift_change_requests
  add constraint attendance_shift_change_selected_offer_fkey
  foreign key (selected_offer_id)
  references public.attendance_shift_change_offers(id)
  on delete set null;

create index if not exists attendance_shift_change_requests_status_idx
  on public.attendance_shift_change_requests(status, created_at desc);

alter table public.attendance_shift_change_requests enable row level security;
alter table public.attendance_shift_change_offers enable row level security;
revoke all on public.attendance_shift_change_requests from anon, authenticated;
revoke all on public.attendance_shift_change_offers from anon, authenticated;

alter table public.attendance_notifications
  add column if not exists shift_change_request_id uuid
    references public.attendance_shift_change_requests(id)
    on delete set null;

/* ------------------------------------------------------------
 * 3. Availability helpers
 * ------------------------------------------------------------ */
create or replace function public.attendance_shift_time_contains(
  p_window_start time,
  p_window_end time,
  p_shift_start time,
  p_shift_end time
)
returns boolean
language plpgsql
immutable
as $$
declare
  ws integer;
  we integer;
  ss integer;
  se integer;
begin
  ws := extract(epoch from p_window_start)::integer / 60;
  we := extract(epoch from p_window_end)::integer / 60;
  ss := extract(epoch from p_shift_start)::integer / 60;
  se := extract(epoch from p_shift_end)::integer / 60;

  if we <= ws then we := we + 1440; end if;
  if se <= ss then se := se + 1440; end if;

  if ss < ws then
    ss := ss + 1440;
    se := se + 1440;
  end if;

  return ss >= ws and se <= we;
end;
$$;

create or replace function public.attendance_shift_candidate_is_eligible(
  p_user_id uuid,
  p_work_date date,
  p_start_time time,
  p_end_time time,
  p_exclude_publication_item_id uuid default null,
  p_exclude_draft_item_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_av public.attendance_shift_coverage_availability%rowtype;
  v_week_start date;
  v_existing_minutes integer;
  v_new_minutes integer;
  v_max_weekly numeric;
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and coalesce(p.is_active, false) = true
  ) then
    return false;
  end if;

  select *
  into v_av
  from public.attendance_shift_coverage_availability a
  where a.user_id = p_user_id
    and a.day_of_week = extract(dow from p_work_date)::integer;

  if v_av.user_id is null
     or not v_av.is_available
     or not public.attendance_shift_time_contains(
       v_av.start_time,
       v_av.end_time,
       p_start_time,
       p_end_time
     ) then
    return false;
  end if;

  if exists (
    select 1
    from public.attendance_shift_publication_items spi
    join public.attendance_shift_publications sp
      on sp.id = spi.publication_id
    join public.attendance_shift_drafts d
      on d.id = sp.draft_id
     and d.latest_published_revision = sp.revision
    where spi.user_id = p_user_id
      and spi.work_date = p_work_date
      and (
        p_exclude_publication_item_id is null
        or spi.id <> p_exclude_publication_item_id
      )
  ) then
    return false;
  end if;

  v_week_start :=
    p_work_date - ((extract(dow from p_work_date)::integer + 6) % 7);

  select coalesce(sum(
    public.attendance_shift_minutes(spi.start_time, spi.end_time)
  ), 0)::integer
  into v_existing_minutes
  from public.attendance_shift_publication_items spi
  join public.attendance_shift_publications sp
    on sp.id = spi.publication_id
  join public.attendance_shift_drafts d
    on d.id = sp.draft_id
   and d.latest_published_revision = sp.revision
  where spi.user_id = p_user_id
    and spi.work_date between v_week_start and v_week_start + 6
    and (
      p_exclude_publication_item_id is null
      or spi.id <> p_exclude_publication_item_id
    );

  select max_weekly_hours
  into v_max_weekly
  from public.attendance_shift_draft_settings
  where id = 1;

  v_new_minutes :=
    public.attendance_shift_minutes(p_start_time, p_end_time);

  return (v_existing_minutes + v_new_minutes)
    <= coalesce(v_max_weekly, 48) * 60;
end;
$$;

/* ------------------------------------------------------------
 * 4. Employee availability CRUD
 * ------------------------------------------------------------ */
create or replace function public.attendance_my_get_coverage_availability()
returns table (
  day_of_week integer,
  is_available boolean,
  start_time time,
  end_time time
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

  return query
  select
    d.day_number,
    coalesce(a.is_available, false),
    coalesce(a.start_time, time '08:00'),
    coalesce(a.end_time, time '23:00')
  from generate_series(0, 6) d(day_number)
  left join public.attendance_shift_coverage_availability a
    on a.user_id = auth.uid()
   and a.day_of_week = d.day_number
  order by d.day_number;
end;
$$;

create or replace function public.attendance_my_save_coverage_availability(
  p_schedule jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_item jsonb;
  v_day integer;
  v_available boolean;
  v_start time;
  v_end time;
begin
  select *
  into v_profile
  from public.profiles p
  where p.id = auth.uid();

  if v_profile.id is null or not coalesce(v_profile.is_active, false) then
    raise exception 'Usuario no disponible.';
  end if;

  if jsonb_typeof(p_schedule) <> 'array' then
    raise exception 'La disponibilidad no es válida.';
  end if;

  for v_item in select value from jsonb_array_elements(p_schedule)
  loop
    v_day := (v_item ->> 'dayOfWeek')::integer;
    v_available := coalesce((v_item ->> 'isAvailable')::boolean, false);
    v_start := coalesce((v_item ->> 'startTime')::time, time '08:00');
    v_end := coalesce((v_item ->> 'endTime')::time, time '23:00');

    if v_day not between 0 and 6 or v_start = v_end then
      raise exception 'Uno de los días tiene una configuración inválida.';
    end if;

    insert into public.attendance_shift_coverage_availability (
      user_id, day_of_week, is_available, start_time, end_time, updated_at
    )
    values (
      auth.uid(), v_day, v_available, v_start, v_end, now()
    )
    on conflict (user_id, day_of_week) do update
    set
      is_available = excluded.is_available,
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      updated_at = now();
  end loop;
end;
$$;

/* ------------------------------------------------------------
 * 5. Create / cancel employee request
 * ------------------------------------------------------------ */
create or replace function public.attendance_my_create_shift_change_request(
  p_publication_item_id uuid,
  p_request_type text,
  p_reason text,
  p_desired_start_time time default null,
  p_desired_end_time time default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_item public.attendance_shift_publication_items%rowtype;
  v_publication public.attendance_shift_publications%rowtype;
  v_draft public.attendance_shift_drafts%rowtype;
  v_id uuid;
  v_admin uuid;
begin
  select *
  into v_profile
  from public.profiles p
  where p.id = auth.uid();

  if v_profile.id is null or not coalesce(v_profile.is_active, false) then
    raise exception 'Usuario no disponible.';
  end if;

  select *
  into v_item
  from public.attendance_shift_publication_items i
  where i.id = p_publication_item_id
    and i.user_id = auth.uid();

  if v_item.id is null then
    raise exception 'Ese turno no pertenece a tu horario publicado.';
  end if;

  select *
  into v_publication
  from public.attendance_shift_publications sp
  where sp.id = v_item.publication_id;

  select *
  into v_draft
  from public.attendance_shift_drafts d
  where d.id = v_publication.draft_id;

  if v_draft.latest_published_revision <> v_publication.revision then
    raise exception 'Ese turno pertenece a una versión anterior. Actualiza tu horario.';
  end if;

  if v_item.work_date < current_date then
    raise exception 'No se puede solicitar un cambio para un turno pasado.';
  end if;

  if p_request_type not in ('change', 'release', 'swap') then
    raise exception 'Tipo de solicitud inválido.';
  end if;

  if length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Escribe un motivo para la solicitud.';
  end if;

  if p_request_type = 'change' then
    if p_desired_start_time is null
       or p_desired_end_time is null
       or p_desired_start_time = p_desired_end_time then
      raise exception 'Indica el nuevo horario solicitado.';
    end if;
  elsif p_desired_start_time is not null
     or p_desired_end_time is not null then
    raise exception 'Este tipo de solicitud no usa un horario nuevo.';
  end if;

  if exists (
    select 1
    from public.attendance_shift_change_requests r
    where r.requester_user_id = auth.uid()
      and r.source_publication_item_id = p_publication_item_id
      and r.status = 'open'
  ) then
    raise exception 'Ya tienes una solicitud abierta para este turno.';
  end if;

  insert into public.attendance_shift_change_requests (
    request_type,
    requester_user_id,
    source_publication_id,
    source_publication_item_id,
    source_draft_id,
    desired_start_time,
    desired_end_time,
    reason
  )
  values (
    p_request_type,
    auth.uid(),
    v_publication.id,
    v_item.id,
    v_draft.id,
    case when p_request_type = 'change' then p_desired_start_time else null end,
    case when p_request_type = 'change' then p_desired_end_time else null end,
    trim(p_reason)
  )
  returning id into v_id;

  for v_admin in
    select p.id
    from public.profiles p
    where p.role = 'admin'::public.user_role
      and coalesce(p.is_active, false) = true
  loop
    insert into public.attendance_notifications (
      recipient_user_id,
      notification_type,
      title,
      message,
      severity,
      related_user_id,
      work_date,
      dedup_key,
      shift_change_request_id
    )
    values (
      v_admin,
      'shift_change_request_new',
      'Nueva solicitud de cambio de turno',
      coalesce(nullif(trim(concat_ws(' ', v_profile.first_name, v_profile.last_name)), ''), 'Un empleado')
        || ' solicitó ' ||
        case p_request_type
          when 'change' then 'un cambio de horario.'
          when 'release' then 'liberar un turno.'
          else 'intercambiar un turno.'
        end,
      'info',
      auth.uid(),
      v_item.work_date,
      'shift-change:new:' || v_id::text || ':admin:' || v_admin::text,
      v_id
    );
  end loop;

  return v_id;
end;
$$;

create or replace function public.attendance_my_cancel_shift_change_request(
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.attendance_shift_change_requests
  set status = 'cancelled', updated_at = now()
  where id = p_request_id
    and requester_user_id = auth.uid()
    and status = 'open';

  if not found then
    raise exception 'Solo puedes cancelar una solicitud abierta propia.';
  end if;
end;
$$;

/* ------------------------------------------------------------
 * 6. Shared request projection
 * ------------------------------------------------------------ */
create or replace function public.attendance_shift_change_request_rows(
  p_requester uuid default null,
  p_only_open boolean default false,
  p_exclude_requester uuid default null
)
returns table (
  id uuid,
  request_type text,
  status text,
  requester_user_id uuid,
  requester_name text,
  source_publication_id uuid,
  source_publication_item_id uuid,
  source_draft_id uuid,
  work_date date,
  start_time time,
  end_time time,
  desired_start_time time,
  desired_end_time time,
  reason text,
  admin_note text,
  selected_offer_id uuid,
  selected_offerer_name text,
  offers_count integer,
  created_at timestamptz,
  reviewed_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    r.id,
    r.request_type,
    r.status,
    r.requester_user_id,
    nullif(trim(concat_ws(' ', rp.first_name, rp.last_name)), ''),
    r.source_publication_id,
    r.source_publication_item_id,
    r.source_draft_id,
    spi.work_date,
    spi.start_time,
    spi.end_time,
    r.desired_start_time,
    r.desired_end_time,
    r.reason,
    coalesce(r.admin_note, ''),
    r.selected_offer_id,
    nullif(trim(concat_ws(' ', op.first_name, op.last_name)), ''),
    (
      select count(*)::integer
      from public.attendance_shift_change_offers o
      where o.request_id = r.id
    ),
    r.created_at,
    r.reviewed_at
  from public.attendance_shift_change_requests r
  join public.attendance_shift_publication_items spi
    on spi.id = r.source_publication_item_id
  join public.profiles rp
    on rp.id = r.requester_user_id
  left join public.attendance_shift_change_offers so
    on so.id = r.selected_offer_id
  left join public.profiles op
    on op.id = so.offered_by
  where (p_requester is null or r.requester_user_id = p_requester)
    and (not p_only_open or r.status = 'open')
    and (p_exclude_requester is null or r.requester_user_id <> p_exclude_requester)
  order by
    case when r.status = 'open' then 0 else 1 end,
    r.created_at desc;
$$;

create or replace function public.attendance_my_shift_change_requests()
returns table (
  id uuid,
  request_type text,
  status text,
  requester_user_id uuid,
  requester_name text,
  source_publication_id uuid,
  source_publication_item_id uuid,
  source_draft_id uuid,
  work_date date,
  start_time time,
  end_time time,
  desired_start_time time,
  desired_end_time time,
  reason text,
  admin_note text,
  selected_offer_id uuid,
  selected_offerer_name text,
  offers_count integer,
  created_at timestamptz,
  reviewed_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select *
  from public.attendance_shift_change_request_rows(auth.uid(), false, null);
$$;

create or replace function public.attendance_shift_change_marketplace()
returns table (
  id uuid,
  request_type text,
  status text,
  requester_user_id uuid,
  requester_name text,
  source_publication_id uuid,
  source_publication_item_id uuid,
  source_draft_id uuid,
  work_date date,
  start_time time,
  end_time time,
  desired_start_time time,
  desired_end_time time,
  reason text,
  admin_note text,
  selected_offer_id uuid,
  selected_offerer_name text,
  offers_count integer,
  created_at timestamptz,
  reviewed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
begin
  select * into v_profile
  from public.profiles p
  where p.id = auth.uid();

  if v_profile.id is null or not coalesce(v_profile.is_active, false) then
    raise exception 'Usuario no disponible.';
  end if;

  return query
  select *
  from public.attendance_shift_change_request_rows(
    null,
    true,
    auth.uid()
  ) r
  where r.request_type in ('release', 'swap')
    and r.work_date >= current_date;
end;
$$;

/* ------------------------------------------------------------
 * 7. Offer coverage / swap
 * ------------------------------------------------------------ */
create or replace function public.attendance_my_offer_shift_change(
  p_request_id uuid,
  p_offered_publication_item_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.attendance_shift_change_requests%rowtype;
  v_source public.attendance_shift_publication_items%rowtype;
  v_offer_item public.attendance_shift_publication_items%rowtype;
  v_offer_id uuid;
  v_requester uuid;
begin
  select *
  into v_request
  from public.attendance_shift_change_requests r
  where r.id = p_request_id
    and r.status = 'open';

  if v_request.id is null then
    raise exception 'La solicitud ya no está disponible.';
  end if;

  if v_request.requester_user_id = auth.uid() then
    raise exception 'No puedes cubrir tu propio turno.';
  end if;

  select *
  into v_source
  from public.attendance_shift_publication_items spi
  where spi.id = v_request.source_publication_item_id;

  if v_request.request_type = 'release' then
    if p_offered_publication_item_id is not null then
      raise exception 'Una cobertura no necesita ofrecer otro turno.';
    end if;

    if not public.attendance_shift_candidate_is_eligible(
      auth.uid(),
      v_source.work_date,
      v_source.start_time,
      v_source.end_time,
      null,
      null
    ) then
      raise exception 'Ese turno no cabe en tu disponibilidad o carga semanal.';
    end if;
  elsif v_request.request_type = 'swap' then
    if p_offered_publication_item_id is null then
      raise exception 'Selecciona el turno que deseas ofrecer.';
    end if;

    select spi.*
    into v_offer_item
    from public.attendance_shift_publication_items spi
    join public.attendance_shift_publications sp
      on sp.id = spi.publication_id
    join public.attendance_shift_drafts d
      on d.id = sp.draft_id
     and d.latest_published_revision = sp.revision
    where spi.id = p_offered_publication_item_id
      and spi.user_id = auth.uid();

    if v_offer_item.id is null then
      raise exception 'El turno ofrecido no pertenece a tu horario vigente.';
    end if;

    if v_offer_item.work_date < current_date then
      raise exception 'No puedes ofrecer un turno pasado.';
    end if;

    if not public.attendance_shift_candidate_is_eligible(
      auth.uid(),
      v_source.work_date,
      v_source.start_time,
      v_source.end_time,
      v_offer_item.id,
      null
    ) then
      raise exception 'El turno solicitado no cabe en tu disponibilidad.';
    end if;

    if not public.attendance_shift_candidate_is_eligible(
      v_request.requester_user_id,
      v_offer_item.work_date,
      v_offer_item.start_time,
      v_offer_item.end_time,
      v_source.id,
      null
    ) then
      raise exception 'Tu turno no cabe en la disponibilidad del solicitante.';
    end if;
  else
    raise exception 'Esta solicitud no acepta ofertas de compañeros.';
  end if;

  insert into public.attendance_shift_change_offers (
    request_id,
    offered_by,
    offered_publication_item_id
  )
  values (
    v_request.id,
    auth.uid(),
    p_offered_publication_item_id
  )
  on conflict (request_id, offered_by) do update
  set
    offered_publication_item_id = excluded.offered_publication_item_id,
    created_at = now()
  returning id into v_offer_id;

  v_requester := v_request.requester_user_id;

  insert into public.attendance_notifications (
    recipient_user_id,
    notification_type,
    title,
    message,
    severity,
    related_user_id,
    work_date,
    dedup_key,
    shift_change_request_id
  )
  values (
    v_requester,
    'shift_change_offer_new',
    'Tienes una propuesta para tu turno',
    'Un compañero se ofreció para ' ||
      case
        when v_request.request_type = 'swap'
          then 'intercambiar turnos contigo.'
        else 'cubrir tu turno.'
      end,
    'info',
    auth.uid(),
    v_source.work_date,
    'shift-change:offer:' || v_request.id::text || ':' || auth.uid()::text,
    v_request.id
  )
  on conflict (dedup_key) do nothing;

  return v_offer_id;
end;
$$;

/* ------------------------------------------------------------
 * 8. Admin queries
 * ------------------------------------------------------------ */
create or replace function public.attendance_admin_shift_change_requests()
returns table (
  id uuid,
  request_type text,
  status text,
  requester_user_id uuid,
  requester_name text,
  source_publication_id uuid,
  source_publication_item_id uuid,
  source_draft_id uuid,
  work_date date,
  start_time time,
  end_time time,
  desired_start_time time,
  desired_end_time time,
  reason text,
  admin_note text,
  selected_offer_id uuid,
  selected_offerer_name text,
  offers_count integer,
  created_at timestamptz,
  reviewed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.attendance_assert_active_admin();
  return query
  select *
  from public.attendance_shift_change_request_rows(null, false, null);
end;
$$;

create or replace function public.attendance_admin_shift_change_offers(
  p_request_id uuid
)
returns table (
  id uuid,
  request_id uuid,
  offered_by uuid,
  offerer_name text,
  offered_publication_item_id uuid,
  offered_work_date date,
  offered_start_time time,
  offered_end_time time,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.attendance_assert_active_admin();

  return query
  select
    o.id,
    o.request_id,
    o.offered_by,
    nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
    o.offered_publication_item_id,
    spi.work_date,
    spi.start_time,
    spi.end_time,
    o.created_at
  from public.attendance_shift_change_offers o
  join public.profiles p on p.id = o.offered_by
  left join public.attendance_shift_publication_items spi
    on spi.id = o.offered_publication_item_id
  where o.request_id = p_request_id
  order by o.created_at;
end;
$$;

/* ------------------------------------------------------------
 * 9. Admin approval / rejection
 * ------------------------------------------------------------ */
create or replace function public.attendance_admin_review_shift_change_request(
  p_request_id uuid,
  p_approve boolean,
  p_selected_offer_id uuid default null,
  p_admin_note text default null
)
returns table (
  draft_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.attendance_shift_change_requests%rowtype;
  v_source_pub_item public.attendance_shift_publication_items%rowtype;
  v_source_item public.attendance_shift_draft_items%rowtype;
  v_offer public.attendance_shift_change_offers%rowtype;
  v_offer_pub_item public.attendance_shift_publication_items%rowtype;
  v_offer_item public.attendance_shift_draft_items%rowtype;
  v_draft public.attendance_shift_drafts%rowtype;
  v_temp_date date;
  v_source_date date;
  v_source_start time;
  v_source_end time;
  v_offer_date date;
  v_offer_start time;
  v_offer_end time;
  v_recipient uuid;
begin
  perform public.attendance_assert_active_admin();

  select *
  into v_request
  from public.attendance_shift_change_requests r
  where r.id = p_request_id
  for update;

  if v_request.id is null then
    raise exception 'No se encontró la solicitud.';
  end if;

  if v_request.status <> 'open' then
    raise exception 'La solicitud ya fue resuelta.';
  end if;

  select *
  into v_source_pub_item
  from public.attendance_shift_publication_items spi
  where spi.id = v_request.source_publication_item_id;

  select *
  into v_draft
  from public.attendance_shift_drafts d
  where d.id = v_request.source_draft_id
  for update;

  if v_draft.id is null
     or v_draft.status <> 'approved'
     or v_draft.latest_published_revision = 0 then
    raise exception 'El plan de origen ya no está vigente.';
  end if;

  if not exists (
    select 1
    from public.attendance_shift_publications sp
    where sp.id = v_source_pub_item.publication_id
      and sp.draft_id = v_draft.id
      and sp.revision = v_draft.latest_published_revision
  ) then
    raise exception 'La solicitud corresponde a una versión anterior del horario.';
  end if;

  if not coalesce(p_approve, false) then
    update public.attendance_shift_change_requests
    set
      status = 'rejected',
      admin_note = nullif(trim(coalesce(p_admin_note, '')), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
    where id = v_request.id;

    insert into public.attendance_notifications (
      recipient_user_id,
      notification_type,
      title,
      message,
      severity,
      related_user_id,
      work_date,
      dedup_key,
      shift_change_request_id
    )
    values (
      v_request.requester_user_id,
      'shift_change_rejected',
      'Solicitud de turno rechazada',
      coalesce(
        nullif(trim(coalesce(p_admin_note, '')), ''),
        'Administración revisó la solicitud y no realizó cambios al horario.'
      ),
      'warning',
      v_request.requester_user_id,
      v_source_pub_item.work_date,
      'shift-change:rejected:' || v_request.id::text,
      v_request.id
    )
    on conflict (dedup_key) do nothing;

    return query select v_draft.id;
    return;
  end if;

  select *
  into v_source_item
  from public.attendance_shift_draft_items i
  where i.id = v_source_pub_item.source_item_id
    and i.draft_id = v_draft.id;

  if v_source_item.id is null then
    raise exception 'No se encontró el turno operativo del plan.';
  end if;

  if v_request.request_type = 'change' then
    if v_request.desired_start_time is null
       or v_request.desired_end_time is null
       or v_request.desired_start_time = v_request.desired_end_time then
      raise exception 'El nuevo horario no es válido.';
    end if;

    if exists (
      select 1
      from public.attendance_shift_draft_items i
      where i.draft_id = v_draft.id
        and i.user_id = v_request.requester_user_id
        and i.work_date = v_source_item.work_date
        and i.id <> v_source_item.id
    ) then
      raise exception 'El empleado ya tiene otro turno ese día.';
    end if;

    update public.attendance_shift_draft_items
    set
      start_time = v_request.desired_start_time,
      end_time = v_request.desired_end_time,
      rationale = coalesce(rationale, '') || ' · Cambio aprobado por Administración',
      updated_at = now()
    where id = v_source_item.id;

  elsif v_request.request_type = 'release' then
    if p_selected_offer_id is null then
      raise exception 'Selecciona quién cubrirá el turno.';
    end if;

    select *
    into v_offer
    from public.attendance_shift_change_offers o
    where o.id = p_selected_offer_id
      and o.request_id = v_request.id;

    if v_offer.id is null then
      raise exception 'La propuesta seleccionada no es válida.';
    end if;

    if not public.attendance_shift_candidate_is_eligible(
      v_offer.offered_by,
      v_source_item.work_date,
      v_source_item.start_time,
      v_source_item.end_time,
      null,
      null
    ) then
      raise exception 'La persona seleccionada ya no es elegible para cubrir este turno.';
    end if;

    update public.attendance_shift_draft_items
    set
      user_id = v_offer.offered_by,
      rationale = coalesce(rationale, '') || ' · Cobertura aprobada por Administración',
      updated_at = now()
    where id = v_source_item.id;

  elsif v_request.request_type = 'swap' then
    if p_selected_offer_id is null then
      raise exception 'Selecciona el intercambio que deseas aprobar.';
    end if;

    select *
    into v_offer
    from public.attendance_shift_change_offers o
    where o.id = p_selected_offer_id
      and o.request_id = v_request.id
      and o.offered_publication_item_id is not null;

    if v_offer.id is null then
      raise exception 'La propuesta de intercambio no es válida.';
    end if;

    select *
    into v_offer_pub_item
    from public.attendance_shift_publication_items spi
    where spi.id = v_offer.offered_publication_item_id;

    select *
    into v_offer_item
    from public.attendance_shift_draft_items i
    where i.id = v_offer_pub_item.source_item_id
      and i.draft_id = v_draft.id;

    if v_offer_item.id is null then
      raise exception 'El turno ofrecido ya no pertenece al mismo plan vigente.';
    end if;

    if not public.attendance_shift_candidate_is_eligible(
      v_offer.offered_by,
      v_source_item.work_date,
      v_source_item.start_time,
      v_source_item.end_time,
      v_offer_pub_item.id,
      v_offer_item.id
    ) then
      raise exception 'El compañero ya no puede tomar el turno solicitado.';
    end if;

    if not public.attendance_shift_candidate_is_eligible(
      v_request.requester_user_id,
      v_offer_item.work_date,
      v_offer_item.start_time,
      v_offer_item.end_time,
      v_source_pub_item.id,
      v_source_item.id
    ) then
      raise exception 'El solicitante ya no puede tomar el turno ofrecido.';
    end if;

    if exists (
      select 1
      from public.attendance_shift_draft_items i
      where i.draft_id = v_draft.id
        and i.user_id = v_request.requester_user_id
        and i.work_date = v_offer_item.work_date
        and i.id not in (v_source_item.id, v_offer_item.id)
    ) or exists (
      select 1
      from public.attendance_shift_draft_items i
      where i.draft_id = v_draft.id
        and i.user_id = v_offer.offered_by
        and i.work_date = v_source_item.work_date
        and i.id not in (v_source_item.id, v_offer_item.id)
    ) then
      raise exception 'El intercambio provocaría dos turnos el mismo día para un empleado.';
    end if;

    v_source_date := v_source_item.work_date;
    v_source_start := v_source_item.start_time;
    v_source_end := v_source_item.end_time;
    v_offer_date := v_offer_item.work_date;
    v_offer_start := v_offer_item.start_time;
    v_offer_end := v_offer_item.end_time;

    if v_source_date = v_offer_date then
      update public.attendance_shift_draft_items
      set
        start_time = v_offer_start,
        end_time = v_offer_end,
        rationale = coalesce(rationale, '') || ' · Intercambio aprobado',
        updated_at = now()
      where id = v_source_item.id;

      update public.attendance_shift_draft_items
      set
        start_time = v_source_start,
        end_time = v_source_end,
        rationale = coalesce(rationale, '') || ' · Intercambio aprobado',
        updated_at = now()
      where id = v_offer_item.id;
    else
      v_temp_date := v_draft.week_start - 10;

      update public.attendance_shift_draft_items
      set work_date = v_temp_date
      where id = v_source_item.id;

      update public.attendance_shift_draft_items
      set
        work_date = v_source_date,
        start_time = v_source_start,
        end_time = v_source_end,
        rationale = coalesce(rationale, '') || ' · Intercambio aprobado',
        updated_at = now()
      where id = v_offer_item.id;

      update public.attendance_shift_draft_items
      set
        work_date = v_offer_date,
        start_time = v_offer_start,
        end_time = v_offer_end,
        rationale = coalesce(rationale, '') || ' · Intercambio aprobado',
        updated_at = now()
      where id = v_source_item.id;
    end if;
  end if;

  update public.attendance_shift_drafts
  set current_revision = current_revision + 1
  where id = v_draft.id;

  update public.attendance_shift_change_requests
  set
    status = 'approved',
    selected_offer_id = p_selected_offer_id,
    admin_note = nullif(trim(coalesce(p_admin_note, '')), ''),
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  where id = v_request.id;

  /* Publicación inmediata de la nueva revisión. */
  perform public.attendance_admin_publish_shift_plan(v_draft.id);

  for v_recipient in
    select distinct user_id
    from (
      select v_request.requester_user_id as user_id
      union all
      select o.offered_by
      from public.attendance_shift_change_offers o
      where o.id = p_selected_offer_id
    ) recipients
    where user_id is not null
  loop
    insert into public.attendance_notifications (
      recipient_user_id,
      notification_type,
      title,
      message,
      severity,
      related_user_id,
      work_date,
      dedup_key,
      shift_change_request_id,
      shift_draft_id,
      shift_revision
    )
    values (
      v_recipient,
      'shift_change_approved',
      'Cambio de turno aprobado',
      'Administración aprobó el cambio. Tu horario publicado ya contiene la nueva versión.',
      'info',
      v_request.requester_user_id,
      v_source_pub_item.work_date,
      'shift-change:approved:' || v_request.id::text || ':' || v_recipient::text,
      v_request.id,
      v_draft.id,
      v_draft.current_revision + 1
    )
    on conflict (dedup_key) do nothing;
  end loop;

  return query select v_draft.id;
end;
$$;

/* ------------------------------------------------------------
 * 10. Extend published schedule to expose publication item ID
 * ------------------------------------------------------------ */
drop function if exists public.attendance_my_published_schedule(date, date);
create or replace function public.attendance_my_published_schedule(
  p_from_date date,
  p_to_date date
)
returns table (
  publication_id uuid,
  publication_item_id uuid,
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
    spi.id,
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

/* ------------------------------------------------------------
 * Grants
 * ------------------------------------------------------------ */
grant execute on function public.attendance_my_get_coverage_availability()
to authenticated;
grant execute on function public.attendance_my_save_coverage_availability(jsonb)
to authenticated;
grant execute on function public.attendance_my_create_shift_change_request(
  uuid, text, text, time, time
) to authenticated;
grant execute on function public.attendance_my_cancel_shift_change_request(uuid)
to authenticated;
grant execute on function public.attendance_my_shift_change_requests()
to authenticated;
grant execute on function public.attendance_shift_change_marketplace()
to authenticated;
grant execute on function public.attendance_my_offer_shift_change(uuid, uuid)
to authenticated;
grant execute on function public.attendance_admin_shift_change_requests()
to authenticated;
grant execute on function public.attendance_admin_shift_change_offers(uuid)
to authenticated;
grant execute on function public.attendance_admin_review_shift_change_request(
  uuid, boolean, uuid, text
) to authenticated;
grant execute on function public.attendance_my_published_schedule(date, date)
to authenticated;

commit;
