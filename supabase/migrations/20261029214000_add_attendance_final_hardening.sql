begin;

/* ============================================================
 * FASE 22 · HARDENING, ÍNDICES Y DIAGNÓSTICO FINAL
 * ============================================================
 *
 * No cambia reglas de negocio.
 * No corrige datos automáticamente.
 * Solo agrega índices defensivos y un diagnóstico de solo lectura.
 */

/* ------------------------------------------------------------
 * 1. Índices defensivos
 * ------------------------------------------------------------ */

create index if not exists
  attendance_notifications_pending_delivery_idx
on public.attendance_notifications (
  recipient_user_id,
  created_at
)
where pushed_at is null
  and push_skipped_at is null;

create index if not exists
  attendance_execution_alerts_active_work_date_idx
on public.attendance_shift_execution_alerts (
  work_date,
  detected_at
)
where resolved_at is null;

create index if not exists
  attendance_shift_changes_open_created_idx
on public.attendance_shift_change_requests (
  created_at
)
where status = 'open';

create index if not exists
  attendance_shift_drafts_approved_week_idx
on public.attendance_shift_drafts (
  week_start,
  week_end
)
where status = 'approved';

create index if not exists
  attendance_publication_items_user_date_idx_v22
on public.attendance_shift_publication_items (
  user_id,
  work_date
);

create index if not exists
  attendance_period_closure_dates_idx
on public.attendance_period_closure_snapshots (
  start_date,
  end_date,
  created_at desc
);

/* ------------------------------------------------------------
 * 2. Diagnóstico de salud del módulo
 * ------------------------------------------------------------ */
create or replace function public.attendance_admin_module_health()
returns table (
  check_key text,
  label text,
  status text,
  affected_count integer,
  detail text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timezone text;
  v_today date;
  v_count integer;
  v_missing integer;
begin
  perform public.attendance_assert_active_admin();

  select coalesce(bs.timezone, 'America/Mexico_City')
  into v_timezone
  from public.business_settings bs
  where bs.id = 1;

  v_timezone :=
    coalesce(v_timezone, 'America/Mexico_City');

  v_today :=
    timezone(v_timezone, now())::date;

  /* --------------------------------------------------------
   * Dependencias fundamentales
   * -------------------------------------------------------- */
  v_missing := 0;

  if to_regclass('public.attendance_records') is null then
    v_missing := v_missing + 1;
  end if;

  if to_regclass('public.attendance_notifications') is null then
    v_missing := v_missing + 1;
  end if;

  if to_regclass('public.attendance_shift_drafts') is null then
    v_missing := v_missing + 1;
  end if;

  if to_regclass('public.attendance_shift_execution') is null then
    v_missing := v_missing + 1;
  end if;

  if to_regclass(
    'public.attendance_period_closure_snapshots'
  ) is null then
    v_missing := v_missing + 1;
  end if;

  return query
  select
    'core_tables'::text,
    'Tablas fundamentales'::text,
    case when v_missing = 0 then 'ok' else 'error' end,
    v_missing,
    case
      when v_missing = 0
        then 'Las tablas fundamentales de Asistencia están disponibles.'
      else
        'Faltan una o más tablas fundamentales. Revisa las migraciones aplicadas.'
    end;

  v_missing := 0;

  if to_regprocedure(
    'public.attendance_clock_in()'
  ) is null then
    v_missing := v_missing + 1;
  end if;

  if to_regprocedure(
    'public.attendance_clock_out()'
  ) is null then
    v_missing := v_missing + 1;
  end if;

  if to_regprocedure(
    'public.attendance_sync_shift_execution_alerts()'
  ) is null then
    v_missing := v_missing + 1;
  end if;

  if to_regprocedure(
    'public.attendance_admin_period_report(date,date,uuid)'
  ) is null then
    v_missing := v_missing + 1;
  end if;

  if to_regprocedure(
    'public.attendance_admin_module_health()'
  ) is null then
    v_missing := v_missing + 1;
  end if;

  return query
  select
    'core_functions'::text,
    'RPC fundamentales'::text,
    case when v_missing = 0 then 'ok' else 'error' end,
    v_missing,
    case
      when v_missing = 0
        then 'Las funciones críticas del flujo de Asistencia están disponibles.'
      else
        'Faltan RPC críticas. Revisa el historial de migraciones del módulo.'
    end;

  /* --------------------------------------------------------
   * Jornadas abiertas anormalmente largas
   * -------------------------------------------------------- */
  select count(*)::integer
  into v_count
  from public.attendance_records ar
  where ar.clock_out is null
    and ar.clock_in < now() - interval '18 hours';

  return query
  select
    'very_long_open_attendance'::text,
    'Jornadas abiertas por más de 18 horas'::text,
    case when v_count = 0 then 'ok' else 'warning' end,
    v_count,
    case
      when v_count = 0
        then 'No hay jornadas anormalmente largas abiertas.'
      else
        'Hay jornadas abiertas por más de 18 horas. Revisa si falta registrar salida o una corrección administrativa.'
    end;

  /* --------------------------------------------------------
   * Backlog de notificaciones sin procesar
   * -------------------------------------------------------- */
  select count(*)::integer
  into v_count
  from public.attendance_notifications n
  where n.pushed_at is null
    and n.push_skipped_at is null
    and n.created_at < now() - interval '2 hours';

  return query
  select
    'pending_push_backlog'::text,
    'Notificaciones pendientes de entrega'::text,
    case
      when v_count = 0 then 'ok'
      when v_count <= 10 then 'warning'
      else 'error'
    end,
    v_count,
    case
      when v_count = 0
        then 'No hay notificaciones antiguas pendientes de procesamiento.'
      when v_count <= 10
        then 'Hay algunas notificaciones pendientes por más de 2 horas. Revisa el flujo de push.'
      else
        'Existe un backlog relevante de notificaciones. Revisa attendance-push y los dispositivos registrados.'
    end;

  /* --------------------------------------------------------
   * Alertas de ejecución activas demasiado antiguas
   * -------------------------------------------------------- */
  select count(*)::integer
  into v_count
  from public.attendance_shift_execution_alerts a
  where a.resolved_at is null
    and a.detected_at < now() - interval '48 hours';

  return query
  select
    'stale_execution_alerts'::text,
    'Alertas operativas activas por más de 48 horas'::text,
    case when v_count = 0 then 'ok' else 'warning' end,
    v_count,
    case
      when v_count = 0
        then 'No hay alertas operativas antiguas sin resolver.'
      else
        'Hay alertas antiguas que siguen activas. Revisa si requieren corrección, incidencia o resolución administrativa.'
    end;

  /* --------------------------------------------------------
   * Cambios de turno abiertos para fechas ya pasadas
   * -------------------------------------------------------- */
  select count(*)::integer
  into v_count
  from public.attendance_shift_change_requests r
  join public.attendance_shift_publication_items spi
    on spi.id = r.source_publication_item_id
  where r.status = 'open'
    and spi.work_date < v_today;

  return query
  select
    'expired_shift_change_requests'::text,
    'Solicitudes de cambio vencidas'::text,
    case when v_count = 0 then 'ok' else 'warning' end,
    v_count,
    case
      when v_count = 0
        then 'No hay solicitudes abiertas asociadas a turnos pasados.'
      else
        'Hay solicitudes de cambio todavía abiertas para fechas que ya pasaron. Deben cerrarse administrativamente.'
    end;

  /* --------------------------------------------------------
   * Plan aprobado con cambios internos aún no publicados
   * -------------------------------------------------------- */
  select count(*)::integer
  into v_count
  from public.attendance_shift_drafts d
  where d.status = 'approved'
    and d.week_end >= v_today
    and d.current_revision > d.latest_published_revision;

  return query
  select
    'approved_unpublished_revision'::text,
    'Planes aprobados con cambios sin publicar'::text,
    case when v_count = 0 then 'ok' else 'warning' end,
    v_count,
    case
      when v_count = 0
        then 'Todos los cambios de planes aprobados vigentes están publicados.'
      else
        'Hay planes aprobados cuya revisión actual todavía no fue publicada a los empleados.'
    end;

  /* --------------------------------------------------------
   * Usuarios inactivos con turnos futuros vigentes
   * -------------------------------------------------------- */
  select count(*)::integer
  into v_count
  from public.attendance_shift_publication_items spi
  join public.attendance_shift_publications sp
    on sp.id = spi.publication_id
  join public.attendance_shift_drafts d
    on d.id = sp.draft_id
   and d.latest_published_revision = sp.revision
  join public.profiles p
    on p.id = spi.user_id
  where spi.work_date >= v_today
    and coalesce(p.is_active, false) = false;

  return query
  select
    'inactive_user_future_shift'::text,
    'Usuarios inactivos con turnos futuros'::text,
    case when v_count = 0 then 'ok' else 'error' end,
    v_count,
    case
      when v_count = 0
        then 'No hay turnos futuros vigentes asignados a usuarios inactivos.'
      else
        'Hay turnos futuros asignados a usuarios inactivos. Reprograma esos turnos antes de operar.'
    end;

  /* --------------------------------------------------------
   * Más de un turno vigente para mismo empleado/fecha
   * -------------------------------------------------------- */
  select count(*)::integer
  into v_count
  from (
    select
      spi.user_id,
      spi.work_date
    from public.attendance_shift_publication_items spi
    join public.attendance_shift_publications sp
      on sp.id = spi.publication_id
    join public.attendance_shift_drafts d
      on d.id = sp.draft_id
     and d.latest_published_revision = sp.revision
    where spi.work_date >= v_today - 7
    group by spi.user_id, spi.work_date
    having count(*) > 1
  ) duplicates;

  return query
  select
    'duplicate_current_shift'::text,
    'Turnos vigentes duplicados por empleado/fecha'::text,
    case when v_count = 0 then 'ok' else 'error' end,
    v_count,
    case
      when v_count = 0
        then 'No se detectaron múltiples turnos vigentes para el mismo empleado y fecha.'
      else
        'Se detectaron empleados con más de un turno vigente en la misma fecha. Revisa publicaciones y cambios de turno.'
    end;

  /* --------------------------------------------------------
   * Integridad básica de snapshots de cierre
   * -------------------------------------------------------- */
  select count(*)::integer
  into v_count
  from public.attendance_period_closure_snapshots s
  where s.end_date < s.start_date
     or jsonb_typeof(s.summary) <> 'object'
     or jsonb_typeof(s.employee_report) <> 'array'
     or jsonb_typeof(s.incidents) <> 'array'
     or jsonb_typeof(s.requests) <> 'array'
     or jsonb_typeof(s.shift_changes) <> 'array'
     or jsonb_typeof(s.execution_alerts) <> 'array'
     or jsonb_typeof(s.payroll_runs) <> 'array'
     or jsonb_typeof(s.audit_log) <> 'array';

  return query
  select
    'closure_snapshot_integrity'::text,
    'Integridad de cierres administrativos'::text,
    case when v_count = 0 then 'ok' else 'error' end,
    v_count,
    case
      when v_count = 0
        then 'Los snapshots administrativos guardados tienen una estructura válida.'
      else
        'Se detectaron snapshots de cierre con estructura inesperada.'
    end;
end;
$$;

grant execute on function public.attendance_admin_module_health()
to authenticated;

commit;
