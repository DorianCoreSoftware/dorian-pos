-- ============================================================
-- DORIAN POS
-- EVENTOS - FASE 4
-- Lectura pública segura para cotizador de eventos
-- ============================================================

create or replace function public.get_public_events_status()
returns table (
  enabled boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce(bs.events_enabled, false)
    and coalesce(es.public_quote_enabled, false) as enabled
  from public.business_settings bs
  cross join public.event_settings es
  where bs.id = 1
    and es.id = 1;
$$;

revoke all on function public.get_public_events_status() from public;
grant execute on function public.get_public_events_status() to anon, authenticated;


create or replace function public.get_public_event_quote_catalog()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_enabled boolean := false;
  v_settings jsonb := '{}'::jsonb;
  v_types jsonb := '[]'::jsonb;
  v_packages jsonb := '[]'::jsonb;
  v_extras jsonb := '[]'::jsonb;
begin
  select
    coalesce(bs.events_enabled, false)
    and coalesce(es.public_quote_enabled, false)
  into v_enabled
  from public.business_settings bs
  cross join public.event_settings es
  where bs.id = 1
    and es.id = 1;

  if not coalesce(v_enabled, false) then
    return jsonb_build_object(
      'enabled', false,
      'settings', '{}'::jsonb,
      'types', '[]'::jsonb,
      'packages', '[]'::jsonb,
      'extras', '[]'::jsonb
    );
  end if;

  select jsonb_build_object(
    'minGuests', es.min_guests,
    'maxGuests', es.max_guests,
    'minAdvanceHours', es.min_advance_hours,
    'maxAdvanceDays', es.max_advance_days,
    'quoteDisclaimer', es.quote_disclaimer,
    'terms', es.terms
  )
  into v_settings
  from public.event_settings es
  where es.id = 1;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'description', coalesce(t.description, ''),
        'position', t.position
      )
      order by t.position, t.created_at, t.id
    ),
    '[]'::jsonb
  )
  into v_types
  from public.event_types t
  where t.is_active = true
    and exists (
      select 1
      from public.event_packages p
      where p.event_type_id = t.id
        and p.is_active = true
    );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'eventTypeId', p.event_type_id,
        'name', p.name,
        'description', coalesce(p.description, ''),
        'basePrice', p.base_price,
        'includedGuests', p.included_guests,
        'extraGuestPrice', p.extra_guest_price,
        'durationMinutes', p.duration_minutes,
        'extraIds', coalesce((
          select jsonb_agg(pe.extra_id order by e.position, e.created_at, e.id)
          from public.event_package_extras pe
          join public.event_extras e
            on e.id = pe.extra_id
          where pe.package_id = p.id
            and e.is_active = true
        ), '[]'::jsonb),
        'position', p.position
      )
      order by p.position, p.created_at, p.id
    ),
    '[]'::jsonb
  )
  into v_packages
  from public.event_packages p
  join public.event_types t
    on t.id = p.event_type_id
  where p.is_active = true
    and t.is_active = true;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'name', e.name,
        'description', coalesce(e.description, ''),
        'pricingType', e.pricing_type,
        'price', e.price,
        'position', e.position
      )
      order by e.position, e.created_at, e.id
    ),
    '[]'::jsonb
  )
  into v_extras
  from public.event_extras e
  where e.is_active = true
    and exists (
      select 1
      from public.event_package_extras pe
      join public.event_packages p
        on p.id = pe.package_id
      join public.event_types t
        on t.id = p.event_type_id
      where pe.extra_id = e.id
        and p.is_active = true
        and t.is_active = true
    );

  return jsonb_build_object(
    'enabled', true,
    'settings', v_settings,
    'types', v_types,
    'packages', v_packages,
    'extras', v_extras
  );
end;
$$;

revoke all on function public.get_public_event_quote_catalog() from public;
grant execute on function public.get_public_event_quote_catalog() to anon, authenticated;

comment on function public.get_public_event_quote_catalog() is
  'Returns only active Events quote configuration and catalog data when the DorianCore entitlement and the public quote switch are both enabled.';
