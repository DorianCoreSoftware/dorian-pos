-- Dorian POS
-- Estado agregado de devoluciones por orden para la pantalla de Ventas.

create or replace function public.get_order_refund_statuses(
  p_order_ids uuid[]
)
returns table(
  order_id uuid,
  refunded_total numeric,
  original_total numeric,
  refund_status text
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if auth.uid() is null then
    raise exception 'Sesión no válida.';
  end if;

  if not exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'admin'::public.user_role
      and coalesce(profile.is_active, true) = true
  ) then
    raise exception 'No autorizado.';
  end if;

  if p_order_ids is null
     or cardinality(p_order_ids) = 0
  then
    return;
  end if;

  return query
  select
    r.order_id,
    round(sum(r.refund_total), 2)::numeric as refunded_total,
    max(r.original_total)::numeric as original_total,
    case
      when round(sum(r.refund_total), 2)
        >= round(max(r.original_total), 2)
      then 'full'
      else 'partial'
    end::text as refund_status
  from public.order_refunds r
  where r.status = 'completed'
    and r.order_id = any(p_order_ids)
  group by r.order_id;
end;
$function$;

revoke execute
on function public.get_order_refund_statuses(uuid[])
from public, anon;

grant execute
on function public.get_order_refund_statuses(uuid[])
to authenticated;
