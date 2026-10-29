begin;

/* ============================================================
 * FASE 18 · EJECUCIÓN REAL VS TURNO PUBLICADO
 * ============================================================
 *
 * Crea un resultado operativo por turno publicado y alertas persistentes
 * únicamente cuando existe una desviación relevante.
 */

/* ------------------------------------------------------------
 * 1. Ejecución actual por turno publicado
 * ------------------------------------------------------------ */
create table if not exists public.attendance_shift_execution (
  publication_item_id uuid primary key
    references public.attendance_shift_publication_items(id)
    on delete cascade,
  publication_id uuid not null
    references public.attendance_shift_publications(id)
    on delete cascade,
  draft_id uuid not null
    references public.attendance_shift_drafts(id)
    on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_date date not null,
  expected_start timestamptz not null,
  expected_end timestamptz not null,
  attendance_record_id uuid
    references public.attendance_records(id)
    on delete set null,
  clock_in timestamptz,
  clock_out timestamptz,
  execution_status text not null,
  late_minutes integer not null default 0,
  early_leave_minutes integer not null default 0,
  overtime_minutes integer not null default 0,
  planned_minutes integer not null default 0,
  worked_minutes integer not null default 0,
  variance_minutes integer not null default 0,
  change_kind text
    check (change_kind is null or change_kind in ('coverage', 'swap')),
  updated_at timestamptz not null default now()
);

create index if not exists attendance_shift_execution_date_idx
  on public.attendance_shift_execution(work_date desc, execution_status);

alter table public.attendance_shift_execution enable row level security;
revoke all on public.attendance_shift_execution from anon, authenticated;

/* ------------------------------------------------------------
 * 2. Alertas operativas
 * ------------------------------------------------------------ */
create table if not exists public.attendance_shift_execution_alerts (
  id uuid primary key default gen_random_uuid(),
  publication_item_id uuid not null
    references public.attendance_shift_publication_items(id)
    on delete cascade,
  publication_id uuid not null
    references public.attendance_shift_publications(id)
    on delete cascade,
  draft_id uuid not null
    references public.attendance_shift_drafts(id)
    on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_date date not null,
  alert_type text not null
    check (
      alert_type in (
        'missing_clock_in',
        'absence',
        'late',
        'early_leave',
        'late_early_leave',
        'overtime',
        'open_shift',
        'outside_shift',
        'coverage_no_show',
        'swap_no_show'
      )
    ),
  severity text not null default 'warning'
    check (severity in ('info', 'warning', 'critical')),
  title text not null,
  message text not null,
  attendance_record_id uuid
    references public.attendance_records(id)
    on delete set null,
  detected_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  admin_note text,
  resolved_at timestamptz,
  resolution_note text
);

create unique index if not exists attendance_shift_execution_alert_active_unique
  on public.attendance_shift_execution_alerts(publication_item_id, alert_type)
  where resolved_at is null;

create index if not exists attendance_shift_execution_alert_date_idx
  on public.attendance_shift_execution_alerts(work_date desc, resolved_at);

alter table public.attendance_shift_execution_alerts enable row level security;
revoke all on public.attendance_shift_execution_alerts from anon, authenticated;

alter table public.attendance_notifications
  add column if not exists execution_alert_id uuid
    references public.attendance_shift_execution_alerts(id)
    on delete set null;

/* ------------------------------------------------------------
 * 3. Sincronización
 * ------------------------------------------------------------ */
create or replace function public.attendance_sync_shift_execution_alerts()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_timezone text;
  v_local_now timestamp;
  v_today date;
  v_late_tolerance integer;
  v_early_tolerance integer;
  v_overtime_tolerance integer;
  v_early_clock integer;
  v_after_close integer;

  rec record;
  v_start_local timestamp;
  v_end_local timestamp;
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_att public.attendance_records%rowtype;

  v_status text;
  v_alert_type text;
  v_severity text;
  v_title text;
  v_message text;
  v_change_kind text;

  v_late integer;
  v_early integer;
  v_overtime integer;
  v_planned integer;
  v_worked integer;
  v_variance integer;

  v_alert_id uuid;
  v_is_new boolean;
  v_admin uuid;
begin
  select *
  into v_profile
  from public.profiles p
  where p.id = auth.uid();

  if v_profile.id is null or not coalesce(v_profile.is_active, false) then
    raise exception 'Usuario no disponible.';
  end if;

  select coalesce(bs.timezone, 'America/Mexico_City')
  into v_timezone
  from public.business_settings bs
  where bs.id = 1;

  v_timezone := coalesce(v_timezone, 'America/Mexico_City');
  v_local_now := timezone(v_timezone, now());
  v_today := v_local_now::date;

  select
    coalesce(s.late_tolerance_minutes, 10),
    coalesce(s.early_leave_tolerance_minutes, 10),
    coalesce(s.overtime_tolerance_minutes, 10),
    coalesce(s.early_clock_in_minutes, 60),
    coalesce(s.after_close_grace_minutes, 60)
  into
    v_late_tolerance,
    v_early_tolerance,
    v_overtime_tolerance,
    v_early_clock,
    v_after_close
  from public.attendance_settings s
  where s.id = 1;

  for rec in
    select
      spi.id as publication_item_id,
      spi.publication_id,
      sp.draft_id,
      spi.source_item_id,
      spi.user_id,
      spi.work_date,
      spi.start_time,
      spi.end_time,
      d.latest_published_revision,
      sp.revision,
      coalesce(di.rationale, spi.rationale, '') as rationale
    from public.attendance_shift_publication_items spi
    join public.attendance_shift_publications sp
      on sp.id = spi.publication_id
    join public.attendance_shift_drafts d
      on d.id = sp.draft_id
     and d.latest_published_revision = sp.revision
    left join public.attendance_shift_draft_items di
      on di.id = spi.source_item_id
    where spi.work_date between (v_today - 45) and v_today
  loop
    v_start_local := rec.work_date + rec.start_time;

    if rec.end_time > rec.start_time then
      v_end_local := rec.work_date + rec.end_time;
    else
      v_end_local := (rec.work_date + 1) + rec.end_time;
    end if;

    v_start_at := v_start_local at time zone v_timezone;
    v_end_at := v_end_local at time zone v_timezone;

    v_planned :=
      greatest(
        0,
        floor(extract(epoch from (v_end_at - v_start_at)) / 60)::integer
      );

    select ar.*
    into v_att
    from public.attendance_records ar
    where ar.user_id = rec.user_id
      and (
        ar.schedule_date = rec.work_date
        or (
          ar.clock_in >= v_start_at - interval '12 hours'
          and ar.clock_in <= v_end_at + interval '12 hours'
        )
      )
    order by
      case when ar.schedule_date = rec.work_date then 0 else 1 end,
      abs(extract(epoch from (ar.clock_in - v_start_at)))
    limit 1;

    v_late := 0;
    v_early := 0;
    v_overtime := 0;
    v_worked := 0;
    v_variance := -v_planned;
    v_status := 'pending';
    v_alert_type := null;
    v_severity := 'warning';
    v_title := null;
    v_message := null;
    v_change_kind := null;

    if rec.rationale ilike '%Cobertura aprobada%' then
      v_change_kind := 'coverage';
    elsif rec.rationale ilike '%Intercambio aprobado%' then
      v_change_kind := 'swap';
    end if;

    if v_att.id is null then
      if now() < v_start_at then
        v_status := 'pending';
      elsif now() <= v_start_at + make_interval(mins => v_late_tolerance) then
        v_status := 'pending';
      elsif now() <= v_end_at + make_interval(mins => v_after_close) then
        v_status := 'missing_clock_in';

        if v_change_kind = 'coverage' then
          v_alert_type := 'coverage_no_show';
          v_severity := 'critical';
          v_title := 'Cobertura aprobada sin entrada';
          v_message := 'La persona asignada como cobertura aún no registra entrada.';
        elsif v_change_kind = 'swap' then
          v_alert_type := 'swap_no_show';
          v_severity := 'critical';
          v_title := 'Intercambio aprobado sin entrada';
          v_message := 'El empleado asignado por intercambio aún no registra entrada.';
        else
          v_alert_type := 'missing_clock_in';
          v_severity := 'warning';
          v_title := 'Entrada pendiente';
          v_message := 'El empleado no ha registrado entrada después de la tolerancia.';
        end if;
      else
        v_status := 'absent';

        if v_change_kind = 'coverage' then
          v_alert_type := 'coverage_no_show';
          v_severity := 'critical';
          v_title := 'Cobertura no cumplida';
          v_message := 'Terminó la ventana del turno y la cobertura aprobada no registró asistencia.';
        elsif v_change_kind = 'swap' then
          v_alert_type := 'swap_no_show';
          v_severity := 'critical';
          v_title := 'Intercambio no cumplido';
          v_message := 'Terminó la ventana del turno y el intercambio aprobado no registró asistencia.';
        else
          v_alert_type := 'absence';
          v_severity := 'critical';
          v_title := 'Ausencia en turno publicado';
          v_message := 'El empleado no registró asistencia para su turno publicado.';
        end if;
      end if;
    else
      v_late :=
        greatest(
          0,
          floor(extract(epoch from (v_att.clock_in - v_start_at)) / 60)::integer
        );

      if v_att.clock_out is not null then
        v_early :=
          greatest(
            0,
            floor(extract(epoch from (v_end_at - v_att.clock_out)) / 60)::integer
          );

        v_overtime :=
          greatest(
            0,
            floor(extract(epoch from (v_att.clock_out - v_end_at)) / 60)::integer
          );

        v_worked :=
          greatest(
            0,
            floor(extract(epoch from (v_att.clock_out - v_att.clock_in)) / 60)::integer
          );

        v_variance := v_worked - v_planned;
      else
        v_worked :=
          greatest(
            0,
            floor(extract(epoch from (now() - v_att.clock_in)) / 60)::integer
          );
        v_variance := v_worked - v_planned;
      end if;

      if
        v_att.clock_in < (
          v_start_at - make_interval(mins => v_early_clock)
        )
        or v_att.clock_in >= v_end_at
      then
        v_status := 'outside_shift';
        v_alert_type := 'outside_shift';
        v_severity := 'warning';
        v_title := 'Entrada fuera del turno publicado';
        v_message := 'La entrada registrada quedó fuera de la ventana del turno publicado.';
      elsif
        v_att.clock_out is null
        and now() > (
          v_end_at + make_interval(mins => v_after_close)
        )
      then
        v_status := 'open_shift';
        v_alert_type := 'open_shift';
        v_severity := 'critical';
        v_title := 'Salida pendiente';
        v_message := 'El turno publicado terminó y la jornada sigue abierta.';
      elsif v_att.clock_out is null then
        if v_late > v_late_tolerance then
          v_status := 'late';
          v_alert_type := 'late';
          v_severity := 'warning';
          v_title := 'Retardo en turno publicado';
          v_message := 'El empleado registró entrada después de la tolerancia.';
        else
          v_status := 'in_progress';
        end if;
      elsif
        v_late > v_late_tolerance
        and v_early > v_early_tolerance
      then
        v_status := 'late_early_leave';
        v_alert_type := 'late_early_leave';
        v_severity := 'warning';
        v_title := 'Retardo y salida anticipada';
        v_message := 'El turno tuvo retardo de entrada y salida antes del horario publicado.';
      elsif v_late > v_late_tolerance then
        v_status := 'late';
        v_alert_type := 'late';
        v_severity := 'warning';
        v_title := 'Retardo en turno publicado';
        v_message := 'La entrada superó la tolerancia configurada.';
      elsif v_early > v_early_tolerance then
        v_status := 'early_leave';
        v_alert_type := 'early_leave';
        v_severity := 'warning';
        v_title := 'Salida anticipada';
        v_message := 'La salida ocurrió antes del horario publicado.';
      elsif v_overtime > v_overtime_tolerance then
        v_status := 'overtime';
        v_alert_type := 'overtime';
        v_severity := 'info';
        v_title := 'Horas extra contra turno publicado';
        v_message := 'La jornada terminó después del turno publicado.';
      else
        v_status := 'completed';
      end if;
    end if;

    insert into public.attendance_shift_execution (
      publication_item_id,
      publication_id,
      draft_id,
      user_id,
      work_date,
      expected_start,
      expected_end,
      attendance_record_id,
      clock_in,
      clock_out,
      execution_status,
      late_minutes,
      early_leave_minutes,
      overtime_minutes,
      planned_minutes,
      worked_minutes,
      variance_minutes,
      change_kind,
      updated_at
    )
    values (
      rec.publication_item_id,
      rec.publication_id,
      rec.draft_id,
      rec.user_id,
      rec.work_date,
      v_start_at,
      v_end_at,
      v_att.id,
      v_att.clock_in,
      v_att.clock_out,
      v_status,
      v_late,
      v_early,
      v_overtime,
      v_planned,
      v_worked,
      v_variance,
      v_change_kind,
      now()
    )
    on conflict (publication_item_id) do update
    set
      publication_id = excluded.publication_id,
      draft_id = excluded.draft_id,
      user_id = excluded.user_id,
      work_date = excluded.work_date,
      expected_start = excluded.expected_start,
      expected_end = excluded.expected_end,
      attendance_record_id = excluded.attendance_record_id,
      clock_in = excluded.clock_in,
      clock_out = excluded.clock_out,
      execution_status = excluded.execution_status,
      late_minutes = excluded.late_minutes,
      early_leave_minutes = excluded.early_leave_minutes,
      overtime_minutes = excluded.overtime_minutes,
      planned_minutes = excluded.planned_minutes,
      worked_minutes = excluded.worked_minutes,
      variance_minutes = excluded.variance_minutes,
      change_kind = excluded.change_kind,
      updated_at = now();

    /* Resuelve cualquier alerta activa que ya no represente la condición actual. */
    update public.attendance_shift_execution_alerts a
    set
      resolved_at = now(),
      resolution_note = 'Resuelta automáticamente al cambiar el estado del turno.'
    where a.publication_item_id = rec.publication_item_id
      and a.resolved_at is null
      and (
        v_alert_type is null
        or a.alert_type <> v_alert_type
      );

    if v_alert_type is not null then
      select a.id
      into v_alert_id
      from public.attendance_shift_execution_alerts a
      where a.publication_item_id = rec.publication_item_id
        and a.alert_type = v_alert_type
        and a.resolved_at is null
      limit 1;

      v_is_new := v_alert_id is null;

      if v_is_new then
        insert into public.attendance_shift_execution_alerts (
          publication_item_id,
          publication_id,
          draft_id,
          user_id,
          work_date,
          alert_type,
          severity,
          title,
          message,
          attendance_record_id
        )
        values (
          rec.publication_item_id,
          rec.publication_id,
          rec.draft_id,
          rec.user_id,
          rec.work_date,
          v_alert_type,
          v_severity,
          v_title,
          v_message,
          v_att.id
        )
        returning id into v_alert_id;

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
            attendance_record_id,
            work_date,
            dedup_key,
            shift_draft_id,
            execution_alert_id
          )
          values (
            v_admin,
            'shift_execution_alert',
            v_title,
            v_message,
            case
              when v_severity = 'critical' then 'critical'
              when v_severity = 'warning' then 'warning'
              else 'info'
            end,
            rec.user_id,
            v_att.id,
            rec.work_date,
            'shift-execution:' || v_alert_id::text || ':admin:' || v_admin::text,
            rec.draft_id,
            v_alert_id
          )
          on conflict (dedup_key) do nothing;
        end loop;
      else
        update public.attendance_shift_execution_alerts
        set
          severity = v_severity,
          title = v_title,
          message = v_message,
          attendance_record_id = v_att.id,
          last_seen_at = now()
        where id = v_alert_id;
      end if;
    end if;
  end loop;
end;
$$;

/* ------------------------------------------------------------
 * 4. Dashboard Admin
 * ------------------------------------------------------------ */
create or replace function public.attendance_admin_shift_execution_dashboard(
  p_start_date date,
  p_end_date date,
  p_only_issues boolean default false
)
returns table (
  publication_item_id uuid,
  publication_id uuid,
  draft_id uuid,
  user_id uuid,
  employee_name text,
  employee_role text,
  work_date date,
  expected_start timestamptz,
  expected_end timestamptz,
  clock_in timestamptz,
  clock_out timestamptz,
  execution_status text,
  late_minutes integer,
  early_leave_minutes integer,
  overtime_minutes integer,
  planned_minutes integer,
  worked_minutes integer,
  variance_minutes integer,
  change_kind text,
  alert_id uuid,
  alert_type text,
  alert_severity text,
  alert_title text,
  alert_message text,
  alert_reviewed_at timestamptz,
  alert_reviewed_by_name text,
  alert_admin_note text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.attendance_assert_active_admin();

  if p_start_date is null
     or p_end_date is null
     or p_end_date < p_start_date then
    raise exception 'Rango inválido.';
  end if;

  if (p_end_date - p_start_date) > 60 then
    raise exception 'El rango máximo del monitor es de 61 días.';
  end if;

  perform public.attendance_sync_shift_execution_alerts();

  return query
  select
    e.publication_item_id,
    e.publication_id,
    e.draft_id,
    e.user_id,
    nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
    p.role::text,
    e.work_date,
    e.expected_start,
    e.expected_end,
    e.clock_in,
    e.clock_out,
    e.execution_status,
    e.late_minutes,
    e.early_leave_minutes,
    e.overtime_minutes,
    e.planned_minutes,
    e.worked_minutes,
    e.variance_minutes,
    e.change_kind,
    a.id,
    a.alert_type,
    a.severity,
    a.title,
    a.message,
    a.reviewed_at,
    nullif(trim(concat_ws(' ', rp.first_name, rp.last_name)), ''),
    a.admin_note
  from public.attendance_shift_execution e
  join public.profiles p
    on p.id = e.user_id
  left join lateral (
    select aa.*
    from public.attendance_shift_execution_alerts aa
    where aa.publication_item_id = e.publication_item_id
      and aa.resolved_at is null
    order by aa.detected_at desc
    limit 1
  ) a on true
  left join public.profiles rp
    on rp.id = a.reviewed_by
  where e.work_date between p_start_date and p_end_date
    and (
      not coalesce(p_only_issues, false)
      or a.id is not null
    )
  order by
    case when a.id is null then 1 else 0 end,
    e.work_date desc,
    e.expected_start desc;
end;
$$;

/* ------------------------------------------------------------
 * 5. Admin marca alerta como revisada, sin borrar la evidencia
 * ------------------------------------------------------------ */
create or replace function public.attendance_admin_review_shift_execution_alert(
  p_alert_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.attendance_assert_active_admin();

  update public.attendance_shift_execution_alerts
  set
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    admin_note = nullif(trim(coalesce(p_note, '')), '')
  where id = p_alert_id;

  if not found then
    raise exception 'No se encontró la alerta.';
  end if;
end;
$$;

/* ------------------------------------------------------------
 * 6. Reconciliación inmediata al checar entrada/salida
 * ------------------------------------------------------------ */
create or replace function public.attendance_shift_execution_sync_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.attendance_sync_shift_execution_alerts();
  return null;
end;
$$;

drop trigger if exists trg_attendance_shift_execution_after_record
on public.attendance_records;

create trigger trg_attendance_shift_execution_after_record
after insert or update of clock_in, clock_out, schedule_date
on public.attendance_records
for each statement
execute function public.attendance_shift_execution_sync_trigger();

grant execute on function public.attendance_sync_shift_execution_alerts()
to authenticated;

grant execute on function public.attendance_admin_shift_execution_dashboard(
  date, date, boolean
)
to authenticated;

grant execute on function public.attendance_admin_review_shift_execution_alert(
  uuid, text
)
to authenticated;

commit;
