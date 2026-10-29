begin;

/* ============================================================
 * FASE 21 · CIERRE ADMINISTRATIVO CONSOLIDADO
 * ============================================================
 *
 * Flujo:
 *  1) validar pendientes
 *  2) bloquear periodo con Fase 11
 *  3) generar snapshot inmutable
 *  4) exportarlo desde la app
 */

create table if not exists public.attendance_period_closure_snapshots (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),

  summary jsonb not null default '{}'::jsonb,
  employee_report jsonb not null default '[]'::jsonb,
  incidents jsonb not null default '[]'::jsonb,
  requests jsonb not null default '[]'::jsonb,
  shift_changes jsonb not null default '[]'::jsonb,
  execution_alerts jsonb not null default '[]'::jsonb,
  payroll_runs jsonb not null default '[]'::jsonb,
  audit_log jsonb not null default '[]'::jsonb,

  constraint attendance_period_closure_dates_check
    check (end_date >= start_date),

  unique (start_date, end_date)
);

alter table public.attendance_period_closure_snapshots
  enable row level security;

revoke all on public.attendance_period_closure_snapshots
from anon, authenticated;

/* ------------------------------------------------------------
 * 1. Readiness
 * ------------------------------------------------------------ */
create or replace function public.attendance_admin_period_closure_status(
  p_start_date date,
  p_end_date date
)
returns table (
  start_date date,
  end_date date,
  period_ended boolean,
  period_locked boolean,
  open_attendance_count integer,
  pending_incident_count integer,
  pending_request_count integer,
  open_shift_change_count integer,
  unresolved_execution_alert_count integer,
  ready_to_close boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timezone text;
  v_today date;
  v_ended boolean;
  v_locked boolean;
  v_open integer;
  v_incidents integer;
  v_requests integer;
  v_changes integer;
  v_alerts integer;
begin
  perform public.attendance_assert_active_admin();

  if p_start_date is null
     or p_end_date is null
     or p_end_date < p_start_date then
    raise exception 'Rango inválido.';
  end if;

  if (p_end_date - p_start_date) > 365 then
    raise exception 'El rango máximo es de 366 días.';
  end if;

  select coalesce(bs.timezone, 'America/Mexico_City')
  into v_timezone
  from public.business_settings bs
  where bs.id = 1;

  v_today := timezone(
    coalesce(v_timezone, 'America/Mexico_City'),
    now()
  )::date;

  v_ended := p_end_date < v_today;

  select exists (
    select 1
    from public.attendance_admin_list_period_locks() l
    where l.is_locked = true
      and l.start_date <= p_start_date
      and l.end_date >= p_end_date
  )
  into v_locked;

  select count(*)::integer
  into v_open
  from public.attendance_records ar
  where ar.clock_out is null
    and (
      ar.schedule_date between p_start_date and p_end_date
      or (
        ar.schedule_date is null
        and timezone(
          coalesce(v_timezone, 'America/Mexico_City'),
          ar.clock_in
        )::date between p_start_date and p_end_date
      )
    );

  select count(*)::integer
  into v_incidents
  from public.attendance_admin_list_incidents(
    p_start_date,
    p_end_date,
    null
  ) i
  where i.status = 'pending';

  select count(*)::integer
  into v_requests
  from public.attendance_admin_list_requests() r
  where r.status = 'pending'
    and daterange(
      r.start_date,
      r.end_date,
      '[]'
    ) && daterange(
      p_start_date,
      p_end_date,
      '[]'
    );

  select count(*)::integer
  into v_changes
  from public.attendance_shift_change_requests r
  join public.attendance_shift_publication_items spi
    on spi.id = r.source_publication_item_id
  where r.status = 'open'
    and spi.work_date between p_start_date and p_end_date;

  select count(*)::integer
  into v_alerts
  from public.attendance_shift_execution_alerts a
  where a.work_date between p_start_date and p_end_date
    and a.resolved_at is null;

  return query
  select
    p_start_date,
    p_end_date,
    v_ended,
    v_locked,
    v_open,
    v_incidents,
    v_requests,
    v_changes,
    v_alerts,
    (
      v_ended
      and v_locked
      and v_open = 0
      and v_incidents = 0
      and v_requests = 0
      and v_changes = 0
      and v_alerts = 0
    );
end;
$$;

/* ------------------------------------------------------------
 * 2. Crear snapshot final
 * ------------------------------------------------------------ */
create or replace function public.attendance_admin_create_period_closure_snapshot(
  p_start_date date,
  p_end_date date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status record;
  v_id uuid;

  v_employee_report jsonb;
  v_incidents jsonb;
  v_requests jsonb;
  v_shift_changes jsonb;
  v_execution_alerts jsonb;
  v_payroll_runs jsonb;
  v_audit jsonb;
  v_summary jsonb;

  v_scheduled_days integer;
  v_worked_days integer;
  v_absent_days integer;
  v_late_days integer;
  v_early_days integer;
  v_overtime_minutes integer;
  v_worked_minutes integer;
  v_scheduled_minutes integer;
begin
  perform public.attendance_assert_active_admin();

  select *
  into v_status
  from public.attendance_admin_period_closure_status(
    p_start_date,
    p_end_date
  );

  if not coalesce(v_status.ready_to_close, false) then
    raise exception
      'El periodo no está listo para cierre final. Revisa los pendientes y el bloqueo operativo.';
  end if;

  if exists (
    select 1
    from public.attendance_period_closure_snapshots s
    where s.start_date = p_start_date
      and s.end_date = p_end_date
  ) then
    raise exception
      'Ya existe un cierre administrativo para este mismo periodo.';
  end if;

  select coalesce(
    jsonb_agg(to_jsonb(r) order by r.employee_name),
    '[]'::jsonb
  )
  into v_employee_report
  from public.attendance_admin_period_report(
    p_start_date,
    p_end_date,
    null
  ) r;

  select
    coalesce(sum(r.scheduled_days), 0)::integer,
    coalesce(sum(r.worked_days), 0)::integer,
    coalesce(sum(r.absent_days), 0)::integer,
    coalesce(sum(r.late_days), 0)::integer,
    coalesce(sum(r.early_leave_days), 0)::integer,
    coalesce(sum(r.total_overtime_minutes), 0)::integer,
    coalesce(sum(r.total_worked_minutes), 0)::integer,
    coalesce(sum(r.total_scheduled_minutes), 0)::integer
  into
    v_scheduled_days,
    v_worked_days,
    v_absent_days,
    v_late_days,
    v_early_days,
    v_overtime_minutes,
    v_worked_minutes,
    v_scheduled_minutes
  from public.attendance_admin_period_report(
    p_start_date,
    p_end_date,
    null
  ) r;

  select coalesce(
    jsonb_agg(to_jsonb(i) order by i.start_date, i.employee_name),
    '[]'::jsonb
  )
  into v_incidents
  from public.attendance_admin_list_incidents(
    p_start_date,
    p_end_date,
    null
  ) i;

  select coalesce(
    jsonb_agg(to_jsonb(r) order by r.created_at),
    '[]'::jsonb
  )
  into v_requests
  from public.attendance_admin_list_requests() r
  where daterange(
    r.start_date,
    r.end_date,
    '[]'
  ) && daterange(
    p_start_date,
    p_end_date,
    '[]'
  );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'request_type', r.request_type,
        'status', r.status,
        'requester_user_id', r.requester_user_id,
        'requester_name',
          nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
        'work_date', spi.work_date,
        'start_time', spi.start_time,
        'end_time', spi.end_time,
        'reason', r.reason,
        'admin_note', r.admin_note,
        'created_at', r.created_at,
        'reviewed_at', r.reviewed_at
      )
      order by r.created_at
    ),
    '[]'::jsonb
  )
  into v_shift_changes
  from public.attendance_shift_change_requests r
  join public.attendance_shift_publication_items spi
    on spi.id = r.source_publication_item_id
  join public.profiles p
    on p.id = r.requester_user_id
  where spi.work_date between p_start_date and p_end_date;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'user_id', a.user_id,
        'employee_name',
          nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
        'work_date', a.work_date,
        'alert_type', a.alert_type,
        'severity', a.severity,
        'title', a.title,
        'message', a.message,
        'detected_at', a.detected_at,
        'reviewed_at', a.reviewed_at,
        'resolved_at', a.resolved_at,
        'admin_note', a.admin_note
      )
      order by a.detected_at
    ),
    '[]'::jsonb
  )
  into v_execution_alerts
  from public.attendance_shift_execution_alerts a
  join public.profiles p
    on p.id = a.user_id
  where a.work_date between p_start_date and p_end_date;

  select coalesce(
    jsonb_agg(to_jsonb(pr) order by pr.created_at),
    '[]'::jsonb
  )
  into v_payroll_runs
  from public.attendance_admin_list_payroll_runs(200) pr
  where daterange(
    pr.start_date,
    pr.end_date,
    '[]'
  ) && daterange(
    p_start_date,
    p_end_date,
    '[]'
  );

  select coalesce(
    jsonb_agg(to_jsonb(a) order by a.occurred_at),
    '[]'::jsonb
  )
  into v_audit
  from public.attendance_admin_audit_log(
    (p_start_date::timestamp at time zone 'UTC'),
    ((p_end_date + 1)::timestamp at time zone 'UTC'),
    null,
    null,
    1000
  ) a;

  v_summary := jsonb_build_object(
    'start_date', p_start_date,
    'end_date', p_end_date,
    'scheduled_days', v_scheduled_days,
    'worked_days', v_worked_days,
    'absent_days', v_absent_days,
    'late_days', v_late_days,
    'early_leave_days', v_early_days,
    'overtime_minutes', v_overtime_minutes,
    'worked_minutes', v_worked_minutes,
    'scheduled_minutes', v_scheduled_minutes,
    'employee_count', jsonb_array_length(v_employee_report),
    'incident_count', jsonb_array_length(v_incidents),
    'request_count', jsonb_array_length(v_requests),
    'shift_change_count', jsonb_array_length(v_shift_changes),
    'execution_alert_count', jsonb_array_length(v_execution_alerts),
    'payroll_run_count', jsonb_array_length(v_payroll_runs),
    'audit_entry_count', jsonb_array_length(v_audit)
  );

  insert into public.attendance_period_closure_snapshots (
    start_date,
    end_date,
    created_by,
    summary,
    employee_report,
    incidents,
    requests,
    shift_changes,
    execution_alerts,
    payroll_runs,
    audit_log
  )
  values (
    p_start_date,
    p_end_date,
    auth.uid(),
    v_summary,
    v_employee_report,
    v_incidents,
    v_requests,
    v_shift_changes,
    v_execution_alerts,
    v_payroll_runs,
    v_audit
  )
  returning id into v_id;

  return v_id;
end;
$$;

/* ------------------------------------------------------------
 * 3. Consultar snapshots
 * ------------------------------------------------------------ */
create or replace function public.attendance_admin_list_period_closure_snapshots()
returns table (
  id uuid,
  start_date date,
  end_date date,
  created_at timestamptz,
  created_by_name text,
  summary jsonb,
  employee_report jsonb,
  incidents jsonb,
  requests jsonb,
  shift_changes jsonb,
  execution_alerts jsonb,
  payroll_runs jsonb,
  audit_log jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.attendance_assert_active_admin();

  return query
  select
    s.id,
    s.start_date,
    s.end_date,
    s.created_at,
    nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
    s.summary,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  from public.attendance_period_closure_snapshots s
  join public.profiles p
    on p.id = s.created_by
  order by s.created_at desc
  limit 100;
end;
$$;

create or replace function public.attendance_admin_get_period_closure_snapshot(
  p_snapshot_id uuid
)
returns table (
  id uuid,
  start_date date,
  end_date date,
  created_at timestamptz,
  created_by_name text,
  summary jsonb,
  employee_report jsonb,
  incidents jsonb,
  requests jsonb,
  shift_changes jsonb,
  execution_alerts jsonb,
  payroll_runs jsonb,
  audit_log jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.attendance_assert_active_admin();

  return query
  select
    s.id,
    s.start_date,
    s.end_date,
    s.created_at,
    nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
    s.summary,
    s.employee_report,
    s.incidents,
    s.requests,
    s.shift_changes,
    s.execution_alerts,
    s.payroll_runs,
    s.audit_log
  from public.attendance_period_closure_snapshots s
  join public.profiles p
    on p.id = s.created_by
  where s.id = p_snapshot_id;
end;
$$;

grant execute on function public.attendance_admin_period_closure_status(
  date, date
) to authenticated;

grant execute on function public.attendance_admin_create_period_closure_snapshot(
  date, date
) to authenticated;

grant execute on function public.attendance_admin_list_period_closure_snapshots()
to authenticated;

grant execute on function public.attendance_admin_get_period_closure_snapshot(
  uuid
) to authenticated;

commit;
