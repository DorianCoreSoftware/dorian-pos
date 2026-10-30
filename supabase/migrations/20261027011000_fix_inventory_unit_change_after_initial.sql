-- ============================================================
-- DORIAN POS
-- INVENTARIO - HOTFIX CAMBIO DE UNIDAD BASE
-- Permite corregir la unidad mientras sólo exista el movimiento
-- automático de existencia inicial.
-- ============================================================

create or replace function public.update_inventory_item_admin(
  p_item_id uuid,
  p_name text,
  p_sku text,
  p_base_unit text,
  p_minimum_stock numeric,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
  v_sku text;
  v_notes text;
  v_minimum_stock numeric(14,3);
  v_existing_unit text;
begin
  perform public.require_inventory_admin();

  v_name := trim(coalesce(p_name, ''));
  v_sku := nullif(trim(coalesce(p_sku, '')), '');
  v_notes := trim(coalesce(p_notes, ''));
  v_minimum_stock := round(coalesce(p_minimum_stock, 0), 3);

  if v_name = '' then
    raise exception 'El nombre del insumo es obligatorio';
  end if;

  if length(v_name) > 100 then
    raise exception 'El nombre no puede superar 100 caracteres';
  end if;

  if v_sku is not null and length(v_sku) > 50 then
    raise exception 'El SKU no puede superar 50 caracteres';
  end if;

  if p_base_unit not in ('g', 'ml', 'piece') then
    raise exception 'La unidad base no es válida';
  end if;

  if v_minimum_stock < 0 then
    raise exception 'El stock mínimo no puede ser negativo';
  end if;

  if length(v_notes) > 500 then
    raise exception 'Las notas no pueden superar 500 caracteres';
  end if;

  select base_unit
  into v_existing_unit
  from public.inventory_items
  where id = p_item_id
  for update;

  if v_existing_unit is null then
    raise exception 'El insumo no existe';
  end if;

  /*
   * El movimiento "initial" se genera automáticamente al crear
   * un insumo con existencia inicial. No debe impedir corregir
   * una unidad capturada por error.
   *
   * Una vez que exista cualquier movimiento operativo real
   * (entrada, salida, merma o ajuste), la unidad queda bloqueada.
   */
  if
    v_existing_unit <> p_base_unit
    and exists (
      select 1
      from public.inventory_movements
      where inventory_item_id = p_item_id
        and movement_type <> 'initial'
    )
  then
    raise exception
      'No puedes cambiar la unidad base de un insumo que ya tiene movimientos de inventario';
  end if;

  update public.inventory_items
  set
    sku = v_sku,
    name = v_name,
    base_unit = p_base_unit,
    minimum_stock = v_minimum_stock,
    notes = v_notes,
    updated_at = now()
  where id = p_item_id;
exception
  when unique_violation then
    raise exception
      'Ya existe un insumo con ese nombre o SKU';
end;
$$;

revoke all
on function public.update_inventory_item_admin(
  uuid,
  text,
  text,
  text,
  numeric,
  text
)
from public;

grant execute
on function public.update_inventory_item_admin(
  uuid,
  text,
  text,
  text,
  numeric,
  text
)
to authenticated;
