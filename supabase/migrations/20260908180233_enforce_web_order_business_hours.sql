/*
 * ============================================================
 * BLOQUEO DE PEDIDOS WEB FUERA DE HORARIO
 * ============================================================
 *
 * Se aplica en la tabla orders para que la validación no dependa
 * únicamente del frontend ni de un RPC concreto.
 *
 * - POS: no se bloquea.
 * - WEB: solo permite INSERT cuando is_business_open() = true.
 * - Los reintentos idempotentes de una orden ya existente siguen
 *   funcionando porque no generan un nuevo INSERT.
 */

create or replace function public.enforce_web_order_business_hours()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if
    new.order_source = 'web'
    and not public.is_business_open()
  then
    raise exception
      'Actualmente estamos fuera del horario de atención.';
  end if;

  return new;
end;
$$;


drop trigger if exists
  trg_enforce_web_order_business_hours
on public.orders;


create trigger
  trg_enforce_web_order_business_hours
before insert
on public.orders
for each row
execute function
  public.enforce_web_order_business_hours();
