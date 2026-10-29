begin;

/* ============================================================
 * FASE 19 · INDICADORES DE CONFIABILIDAD OPERATIVA
 * ============================================================
 *
 * No genera sanciones, bloqueos ni decisiones automáticas.
 * El índice es explicable y se deriva exclusivamente de ejecución de
 * turnos publicados ya reconciliados por Fase 18.
 *
 * Pesos:
 *   35% asistencia
 *   20% puntualidad
 *   20% finalización del turno
 *   10% consistencia de horas
 *   15% cumplimiento de coberturas/intercambios
 *
 * Si no hubo asignaciones de cobertura/intercambio, ese 15% se elimina
 * del denominador y el resto se normaliza a 100.
 *
 * Horas extra NO afectan el índice.
 */

/* ------------------------------------------------------------
 * 1. Resumen por empleado
 * ------------------------------------------------------------ */
create or replace function public.attendance_admin_employee_reliability_summary(
  p_start_date date,
  p_end_date date
)
returns table (
  user_id uuid,
  employee_name text,
  employee_role text,
  evaluated_shifts integer,
  attended_shifts integer,
  completed_shifts integer,
  absence_count integer,
  late_count integer,
  early_leave_count integer,
  outside_shift_count integer,
  open_shift_count integer,
  overtime_minutes integer,
  coverage_assignments integer,
  coverage_fulfilled integer,
  attendance_rate numeric,
  punctuality_rate numeric,
  completion_rate numeric,
  coverage_rate numeric,
  consistency_rate numeric,
  reliability_index numeric
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

  if (p_end_date - p_start_date) > 44 then
    raise exception 'El rango máximo para estos indicadores es de 45 días.';
  end if;

  perform public.attendance_sync_shift_execution_alerts();

  return query
  with base as (
    select
      e.*,
      (
        e.execution_status <> 'pending'
        or e.attendance_record_id is not null
      ) as is_evaluated,
      (e.attendance_record_id is not null) as did_attend,
      (
        e.clock_out is not null
        and e.execution_status not in (
          'early_leave',
          'late_early_leave',
          'open_shift',
          'outside_shift'
        )
      ) as did_complete,
      (
        e.attendance_record_id is not null
        and e.execution_status not in ('late', 'late_early_leave')
      ) as was_punctual,
      (
        e.clock_out is not null
        and abs(e.variance_minutes) <= 60
      ) as was_consistent,
      (e.change_kind in ('coverage', 'swap')) as is_coverage,
      (
        e.change_kind in ('coverage', 'swap')
        and e.attendance_record_id is not null
        and e.execution_status not in ('missing_clock_in', 'absent')
      ) as coverage_ok
    from public.attendance_shift_execution e
    where e.work_date between p_start_date and p_end_date
  ),
  grouped as (
    select
      b.user_id,
      count(*) filter (where b.is_evaluated)::integer as evaluated_shifts,
      count(*) filter (where b.is_evaluated and b.did_attend)::integer as attended_shifts,
      count(*) filter (where b.is_evaluated and b.did_complete)::integer as completed_shifts,
      count(*) filter (
        where b.is_evaluated
          and b.execution_status in ('missing_clock_in', 'absent')
      )::integer as absence_count,
      count(*) filter (
        where b.is_evaluated
          and b.execution_status in ('late', 'late_early_leave')
      )::integer as late_count,
      count(*) filter (
        where b.is_evaluated
          and b.execution_status in ('early_leave', 'late_early_leave')
      )::integer as early_leave_count,
      count(*) filter (
        where b.is_evaluated and b.execution_status = 'outside_shift'
      )::integer as outside_shift_count,
      count(*) filter (
        where b.is_evaluated and b.execution_status = 'open_shift'
      )::integer as open_shift_count,
      coalesce(sum(b.overtime_minutes) filter (where b.is_evaluated), 0)::integer
        as overtime_minutes,
      count(*) filter (
        where b.is_evaluated and b.is_coverage
      )::integer as coverage_assignments,
      count(*) filter (
        where b.is_evaluated and b.coverage_ok
      )::integer as coverage_fulfilled,
      count(*) filter (
        where b.is_evaluated and b.did_attend and b.was_punctual
      )::integer as punctual_shifts,
      count(*) filter (
        where b.is_evaluated
          and b.did_attend
          and b.clock_out is not null
      )::integer as finished_attended_shifts,
      count(*) filter (
        where b.is_evaluated
          and b.did_attend
          and b.clock_out is not null
          and b.was_consistent
      )::integer as consistent_shifts
    from base b
    group by b.user_id
  ),
  rates as (
    select
      g.*,
      case
        when g.evaluated_shifts = 0 then 0::numeric
        else round(g.attended_shifts::numeric * 100 / g.evaluated_shifts, 2)
      end as attendance_rate,
      case
        when g.attended_shifts = 0 then 0::numeric
        else round(g.punctual_shifts::numeric * 100 / g.attended_shifts, 2)
      end as punctuality_rate,
      case
        when g.finished_attended_shifts = 0 then 0::numeric
        else round(g.completed_shifts::numeric * 100 / g.finished_attended_shifts, 2)
      end as completion_rate,
      case
        when g.coverage_assignments = 0 then null::numeric
        else round(g.coverage_fulfilled::numeric * 100 / g.coverage_assignments, 2)
      end as coverage_rate,
      case
        when g.finished_attended_shifts = 0 then 0::numeric
        else round(g.consistent_shifts::numeric * 100 / g.finished_attended_shifts, 2)
      end as consistency_rate
    from grouped g
  )
  select
    p.id,
    nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
    p.role::text,
    coalesce(r.evaluated_shifts, 0),
    coalesce(r.attended_shifts, 0),
    coalesce(r.completed_shifts, 0),
    coalesce(r.absence_count, 0),
    coalesce(r.late_count, 0),
    coalesce(r.early_leave_count, 0),
    coalesce(r.outside_shift_count, 0),
    coalesce(r.open_shift_count, 0),
    coalesce(r.overtime_minutes, 0),
    coalesce(r.coverage_assignments, 0),
    coalesce(r.coverage_fulfilled, 0),
    coalesce(r.attendance_rate, 0),
    coalesce(r.punctuality_rate, 0),
    coalesce(r.completion_rate, 0),
    r.coverage_rate,
    coalesce(r.consistency_rate, 0),
    case
      when coalesce(r.evaluated_shifts, 0) = 0 then 0::numeric
      when coalesce(r.coverage_assignments, 0) > 0 then
        round(
          (
            coalesce(r.attendance_rate, 0) * 35 +
            coalesce(r.punctuality_rate, 0) * 20 +
            coalesce(r.completion_rate, 0) * 20 +
            coalesce(r.consistency_rate, 0) * 10 +
            coalesce(r.coverage_rate, 0) * 15
          ) / 100,
          2
        )
      else
        round(
          (
            coalesce(r.attendance_rate, 0) * 35 +
            coalesce(r.punctuality_rate, 0) * 20 +
            coalesce(r.completion_rate, 0) * 20 +
            coalesce(r.consistency_rate, 0) * 10
          ) / 85,
          2
        )
    end
  from public.profiles p
  left join rates r on r.user_id = p.id
  where coalesce(p.is_active, false) = true
    and p.role <> 'admin'::public.user_role
  order by
    case when coalesce(r.evaluated_shifts, 0) = 0 then 1 else 0 end,
    20 desc nulls last,
    2;
end;
$$;

/* ------------------------------------------------------------
 * 2. Detalle trazable por empleado
 * ------------------------------------------------------------ */
create or replace function public.attendance_admin_employee_reliability_detail(
  p_user_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  publication_item_id uuid,
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
  alert_type text,
  alert_title text,
  alert_reviewed_at timestamptz
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

  if (p_end_date - p_start_date) > 44 then
    raise exception 'El rango máximo para estos indicadores es de 45 días.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
  ) then
    raise exception 'Empleado no encontrado.';
  end if;

  perform public.attendance_sync_shift_execution_alerts();

  return query
  select
    e.publication_item_id,
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
    a.alert_type,
    a.title,
    a.reviewed_at
  from public.attendance_shift_execution e
  left join lateral (
    select aa.*
    from public.attendance_shift_execution_alerts aa
    where aa.publication_item_id = e.publication_item_id
    order by aa.detected_at desc
    limit 1
  ) a on true
  where e.user_id = p_user_id
    and e.work_date between p_start_date and p_end_date
    and (
      e.execution_status <> 'pending'
      or e.attendance_record_id is not null
    )
  order by e.work_date desc, e.expected_start desc;
end;
$$;

grant execute on function public.attendance_admin_employee_reliability_summary(
  date, date
) to authenticated;

grant execute on function public.attendance_admin_employee_reliability_detail(
  uuid, date, date
) to authenticated;

commit;
