begin;

/* ============================================================
 * FASE 20 · TENDENCIAS Y EVOLUCIÓN
 * ============================================================
 *
 * Compara un periodo actual contra el periodo inmediatamente anterior
 * del mismo tamaño.
 *
 * No genera sanciones ni decisiones automáticas.
 */

/* ------------------------------------------------------------
 * Helper de métricas por rango
 * ------------------------------------------------------------ */
create or replace function public.attendance_trend_range_metrics(
  p_start_date date,
  p_end_date date,
  p_user_id uuid default null
)
returns table (
  evaluated_shifts integer,
  attended_shifts integer,
  punctual_shifts integer,
  absence_count integer,
  late_count integer,
  early_leave_count integer,
  overtime_minutes integer,
  attendance_rate numeric,
  punctuality_rate numeric
)
language sql
security definer
set search_path = public
stable
as $$
  with base as (
    select
      e.*,
      (
        e.execution_status <> 'pending'
        or e.attendance_record_id is not null
      ) as is_evaluated,
      (e.attendance_record_id is not null) as did_attend,
      (
        e.attendance_record_id is not null
        and e.execution_status not in ('late', 'late_early_leave')
      ) as was_punctual
    from public.attendance_shift_execution e
    where e.work_date between p_start_date and p_end_date
      and (p_user_id is null or e.user_id = p_user_id)
  ),
  agg as (
    select
      count(*) filter (where is_evaluated)::integer as evaluated_shifts,
      count(*) filter (where is_evaluated and did_attend)::integer as attended_shifts,
      count(*) filter (where is_evaluated and did_attend and was_punctual)::integer as punctual_shifts,
      count(*) filter (
        where is_evaluated
          and execution_status in ('missing_clock_in', 'absent')
      )::integer as absence_count,
      count(*) filter (
        where is_evaluated
          and execution_status in ('late', 'late_early_leave')
      )::integer as late_count,
      count(*) filter (
        where is_evaluated
          and execution_status in ('early_leave', 'late_early_leave')
      )::integer as early_leave_count,
      coalesce(sum(overtime_minutes) filter (where is_evaluated), 0)::integer
        as overtime_minutes
    from base
  )
  select
    a.evaluated_shifts,
    a.attended_shifts,
    a.punctual_shifts,
    a.absence_count,
    a.late_count,
    a.early_leave_count,
    a.overtime_minutes,
    case
      when a.evaluated_shifts = 0 then 0::numeric
      else round(a.attended_shifts::numeric * 100 / a.evaluated_shifts, 2)
    end,
    case
      when a.attended_shifts = 0 then 0::numeric
      else round(a.punctual_shifts::numeric * 100 / a.attended_shifts, 2)
    end
  from agg a;
$$;

/* ------------------------------------------------------------
 * 1. Evolución global del equipo
 * ------------------------------------------------------------ */
create or replace function public.attendance_admin_team_trend_summary(
  p_start_date date,
  p_end_date date
)
returns table (
  current_evaluated_shifts integer,
  previous_evaluated_shifts integer,
  current_attendance_rate numeric,
  previous_attendance_rate numeric,
  attendance_delta numeric,
  current_punctuality_rate numeric,
  previous_punctuality_rate numeric,
  punctuality_delta numeric,
  current_absences integer,
  previous_absences integer,
  absence_delta integer,
  current_late_count integer,
  previous_late_count integer,
  late_delta integer,
  current_early_leave_count integer,
  previous_early_leave_count integer,
  early_leave_delta integer,
  current_overtime_minutes integer,
  previous_overtime_minutes integer,
  overtime_delta_minutes integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer;
  v_previous_start date;
  v_previous_end date;
  v_current record;
  v_previous record;
begin
  perform public.attendance_assert_active_admin();

  if p_start_date is null
     or p_end_date is null
     or p_end_date < p_start_date then
    raise exception 'Rango inválido.';
  end if;

  v_days := (p_end_date - p_start_date) + 1;

  if v_days < 7 or v_days > 45 then
    raise exception 'El periodo debe tener entre 7 y 45 días.';
  end if;

  v_previous_end := p_start_date - 1;
  v_previous_start := v_previous_end - (v_days - 1);

  perform public.attendance_sync_shift_execution_alerts();

  select *
  into v_current
  from public.attendance_trend_range_metrics(
    p_start_date,
    p_end_date,
    null
  );

  select *
  into v_previous
  from public.attendance_trend_range_metrics(
    v_previous_start,
    v_previous_end,
    null
  );

  return query
  select
    v_current.evaluated_shifts,
    v_previous.evaluated_shifts,
    v_current.attendance_rate,
    case
      when v_previous.evaluated_shifts = 0 then null::numeric
      else v_previous.attendance_rate
    end,
    case
      when v_previous.evaluated_shifts = 0 then null::numeric
      else round(v_current.attendance_rate - v_previous.attendance_rate, 2)
    end,
    v_current.punctuality_rate,
    case
      when v_previous.attended_shifts = 0 then null::numeric
      else v_previous.punctuality_rate
    end,
    case
      when v_previous.attended_shifts = 0 then null::numeric
      else round(v_current.punctuality_rate - v_previous.punctuality_rate, 2)
    end,
    v_current.absence_count,
    case
      when v_previous.evaluated_shifts = 0 then null::integer
      else v_previous.absence_count
    end,
    case
      when v_previous.evaluated_shifts = 0 then null::integer
      else v_current.absence_count - v_previous.absence_count
    end,
    v_current.late_count,
    case
      when v_previous.evaluated_shifts = 0 then null::integer
      else v_previous.late_count
    end,
    case
      when v_previous.evaluated_shifts = 0 then null::integer
      else v_current.late_count - v_previous.late_count
    end,
    v_current.early_leave_count,
    case
      when v_previous.evaluated_shifts = 0 then null::integer
      else v_previous.early_leave_count
    end,
    case
      when v_previous.evaluated_shifts = 0 then null::integer
      else v_current.early_leave_count - v_previous.early_leave_count
    end,
    v_current.overtime_minutes,
    case
      when v_previous.evaluated_shifts = 0 then null::integer
      else v_previous.overtime_minutes
    end,
    case
      when v_previous.evaluated_shifts = 0 then null::integer
      else v_current.overtime_minutes - v_previous.overtime_minutes
    end;
end;
$$;

/* ------------------------------------------------------------
 * 2. Evolución por empleado
 * ------------------------------------------------------------ */
create or replace function public.attendance_admin_employee_trends(
  p_start_date date,
  p_end_date date
)
returns table (
  user_id uuid,
  employee_name text,
  employee_role text,
  current_evaluated_shifts integer,
  previous_evaluated_shifts integer,
  current_attendance_rate numeric,
  previous_attendance_rate numeric,
  attendance_delta numeric,
  current_punctuality_rate numeric,
  previous_punctuality_rate numeric,
  punctuality_delta numeric,
  current_absence_count integer,
  previous_absence_count integer,
  absence_delta integer,
  current_late_count integer,
  previous_late_count integer,
  late_delta integer,
  trend_direction text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer;
  v_previous_start date;
  v_previous_end date;
begin
  perform public.attendance_assert_active_admin();

  if p_start_date is null
     or p_end_date is null
     or p_end_date < p_start_date then
    raise exception 'Rango inválido.';
  end if;

  v_days := (p_end_date - p_start_date) + 1;

  if v_days < 7 or v_days > 45 then
    raise exception 'El periodo debe tener entre 7 y 45 días.';
  end if;

  v_previous_end := p_start_date - 1;
  v_previous_start := v_previous_end - (v_days - 1);

  perform public.attendance_sync_shift_execution_alerts();

  return query
  with employees as (
    select p.id, p.first_name, p.last_name, p.role
    from public.profiles p
    where coalesce(p.is_active, false) = true
      and p.role <> 'admin'::public.user_role
  ),
  current_metrics as (
    select
      e.id as user_id,
      m.*
    from employees e
    cross join lateral public.attendance_trend_range_metrics(
      p_start_date,
      p_end_date,
      e.id
    ) m
  ),
  previous_metrics as (
    select
      e.id as user_id,
      m.*
    from employees e
    cross join lateral public.attendance_trend_range_metrics(
      v_previous_start,
      v_previous_end,
      e.id
    ) m
  )
  select
    e.id,
    nullif(trim(concat_ws(' ', e.first_name, e.last_name)), ''),
    e.role::text,
    c.evaluated_shifts,
    p.evaluated_shifts,
    c.attendance_rate,
    case
      when p.evaluated_shifts = 0 then null::numeric
      else p.attendance_rate
    end,
    case
      when p.evaluated_shifts = 0 then null::numeric
      else round(c.attendance_rate - p.attendance_rate, 2)
    end,
    c.punctuality_rate,
    case
      when p.attended_shifts = 0 then null::numeric
      else p.punctuality_rate
    end,
    case
      when p.attended_shifts = 0 then null::numeric
      else round(c.punctuality_rate - p.punctuality_rate, 2)
    end,
    c.absence_count,
    case
      when p.evaluated_shifts = 0 then null::integer
      else p.absence_count
    end,
    case
      when p.evaluated_shifts = 0 then null::integer
      else c.absence_count - p.absence_count
    end,
    c.late_count,
    case
      when p.evaluated_shifts = 0 then null::integer
      else p.late_count
    end,
    case
      when p.evaluated_shifts = 0 then null::integer
      else c.late_count - p.late_count
    end,
    case
      when c.evaluated_shifts = 0 or p.evaluated_shifts = 0
        then 'insufficient_data'
      when
        (
          (c.attendance_rate - p.attendance_rate) >= 5
          or (c.punctuality_rate - p.punctuality_rate) >= 5
          or c.absence_count < p.absence_count
          or c.late_count < p.late_count
        )
        and not (
          (c.attendance_rate - p.attendance_rate) <= -5
          or (c.punctuality_rate - p.punctuality_rate) <= -5
          or c.absence_count > p.absence_count
          or c.late_count > p.late_count
        )
        then 'improving'
      when
        (
          (c.attendance_rate - p.attendance_rate) <= -5
          or (c.punctuality_rate - p.punctuality_rate) <= -5
          or c.absence_count > p.absence_count
          or c.late_count > p.late_count
        )
        and not (
          (c.attendance_rate - p.attendance_rate) >= 5
          or (c.punctuality_rate - p.punctuality_rate) >= 5
          or c.absence_count < p.absence_count
          or c.late_count < p.late_count
        )
        then 'declining'
      else 'stable'
    end
  from employees e
  join current_metrics c on c.user_id = e.id
  join previous_metrics p on p.user_id = e.id
  order by
    case
      when c.evaluated_shifts = 0 or p.evaluated_shifts = 0 then 3
      when
        (
          (c.attendance_rate - p.attendance_rate) <= -5
          or (c.punctuality_rate - p.punctuality_rate) <= -5
          or c.absence_count > p.absence_count
          or c.late_count > p.late_count
        )
        and not (
          (c.attendance_rate - p.attendance_rate) >= 5
          or (c.punctuality_rate - p.punctuality_rate) >= 5
          or c.absence_count < p.absence_count
          or c.late_count < p.late_count
        ) then 0
      when
        (
          (c.attendance_rate - p.attendance_rate) >= 5
          or (c.punctuality_rate - p.punctuality_rate) >= 5
          or c.absence_count < p.absence_count
          or c.late_count < p.late_count
        )
        and not (
          (c.attendance_rate - p.attendance_rate) <= -5
          or (c.punctuality_rate - p.punctuality_rate) <= -5
          or c.absence_count > p.absence_count
          or c.late_count > p.late_count
        ) then 2
      else 1
    end,
    2;
end;
$$;

/* ------------------------------------------------------------
 * 3. Patrones por día de la semana
 * ------------------------------------------------------------ */
create or replace function public.attendance_admin_weekday_patterns(
  p_start_date date,
  p_end_date date
)
returns table (
  day_of_week integer,
  day_name text,
  evaluated_shifts integer,
  absence_count integer,
  late_count integer,
  early_leave_count integer,
  overtime_minutes integer,
  attendance_rate numeric,
  punctuality_rate numeric
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
    raise exception 'El rango máximo es de 45 días.';
  end if;

  perform public.attendance_sync_shift_execution_alerts();

  return query
  with days as (
    select
      d::integer as day_of_week,
      case d
        when 0 then 'Domingo'
        when 1 then 'Lunes'
        when 2 then 'Martes'
        when 3 then 'Miércoles'
        when 4 then 'Jueves'
        when 5 then 'Viernes'
        else 'Sábado'
      end as day_name
    from generate_series(0, 6) d
  ),
  base as (
    select
      extract(dow from e.work_date)::integer as day_of_week,
      e.*,
      (
        e.execution_status <> 'pending'
        or e.attendance_record_id is not null
      ) as is_evaluated,
      (e.attendance_record_id is not null) as did_attend,
      (
        e.attendance_record_id is not null
        and e.execution_status not in ('late', 'late_early_leave')
      ) as was_punctual
    from public.attendance_shift_execution e
    where e.work_date between p_start_date and p_end_date
  ),
  agg as (
    select
      b.day_of_week,
      count(*) filter (where b.is_evaluated)::integer as evaluated_shifts,
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
      coalesce(sum(b.overtime_minutes) filter (where b.is_evaluated), 0)::integer
        as overtime_minutes,
      count(*) filter (where b.is_evaluated and b.did_attend)::integer
        as attended_shifts,
      count(*) filter (
        where b.is_evaluated and b.did_attend and b.was_punctual
      )::integer as punctual_shifts
    from base b
    group by b.day_of_week
  )
  select
    d.day_of_week,
    d.day_name,
    coalesce(a.evaluated_shifts, 0),
    coalesce(a.absence_count, 0),
    coalesce(a.late_count, 0),
    coalesce(a.early_leave_count, 0),
    coalesce(a.overtime_minutes, 0),
    case
      when coalesce(a.evaluated_shifts, 0) = 0 then 0::numeric
      else round(
        coalesce(a.attended_shifts, 0)::numeric * 100 /
        a.evaluated_shifts,
        2
      )
    end,
    case
      when coalesce(a.attended_shifts, 0) = 0 then 0::numeric
      else round(
        coalesce(a.punctual_shifts, 0)::numeric * 100 /
        a.attended_shifts,
        2
      )
    end
  from days d
  left join agg a on a.day_of_week = d.day_of_week
  order by
    case d.day_of_week
      when 1 then 1
      when 2 then 2
      when 3 then 3
      when 4 then 4
      when 5 then 5
      when 6 then 6
      else 7
    end;
end;
$$;

grant execute on function public.attendance_admin_team_trend_summary(
  date, date
) to authenticated;

grant execute on function public.attendance_admin_employee_trends(
  date, date
) to authenticated;

grant execute on function public.attendance_admin_weekday_patterns(
  date, date
) to authenticated;

commit;
