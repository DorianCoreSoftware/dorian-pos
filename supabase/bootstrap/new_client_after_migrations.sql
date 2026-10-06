-- ============================================================
-- DORIAN POS - BOOTSTRAP PARA CLIENTE NUEVO
-- EJECUTAR SOLO DESPUÉS DE db push EN UN SUPABASE NUEVO/VACÍO.
-- NO ES UNA MIGRACIÓN.
-- ============================================================

do $bootstrap$
declare
  v_operational_rows bigint;
begin
  -- Guardia fuerte: no ejecutar sobre Burger Kong ni un negocio operativo.
  select
    (select count(*) from public.orders)
    + (select count(*) from public.promo_coupons)
    + (select count(*) from public.promo_redemptions)
  into v_operational_rows;

  if v_operational_rows > 0 then
    raise exception
      'Bootstrap cancelado: la base contiene órdenes/cupones/redenciones. Este script es solo para clientes nuevos.';
  end if;

  -- La historia de migraciones crea programas Burger Kong para preservar
  -- compatibilidad al migrar instalaciones antiguas. En un cliente nuevo
  -- no deben quedar como configuración inicial.
  delete from public.promotion_rewards
  where program_id in (
    select id
    from public.promotion_programs
    where code in ('collect_reward', 'order_refund')
      and (
        display_name in ('Kong', 'Dorian de la Suerte')
        or code_prefix in ('BK-K', 'BK-D')
      )
  );

  delete from public.promotion_programs
  where code in ('collect_reward', 'order_refund')
    and (
      display_name in ('Kong', 'Dorian de la Suerte')
      or code_prefix in ('BK-K', 'BK-D')
    );

  -- Estado inicial seguro: configurar el negocio antes de abrir canales.
  update public.business_settings
  set
    business_name = 'Dorian POS',
    short_name = 'Dorian POS',
    web_orders_enabled = false,
    delivery_enabled = false,
    loyalty_enabled = false,
    promotions_enabled = false,
    kitchen_enabled = true,
    updated_at = now()
  where id = 1;
end;
$bootstrap$;

-- Verificación final visible.
select
  business_name,
  short_name,
  web_orders_enabled,
  delivery_enabled,
  loyalty_enabled,
  promotions_enabled,
  kitchen_enabled,
  timezone
from public.business_settings
where id = 1;

select
  code,
  display_name,
  code_prefix,
  is_enabled
from public.promotion_programs
order by priority, display_name;
