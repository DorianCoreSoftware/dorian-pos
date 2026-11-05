/*
 * Fase 6 hotfix:
 * permitir pago anticipado antes de completar la preparación.
 *
 * payment_timing = 'final' conserva la regla histórica.
 * payment_timing = 'advance' omite únicamente la validación de preparación.
 */

alter table public.order_payments
  add column if not exists payment_timing text not null default 'final';

alter table public.order_payments
  drop constraint if exists order_payments_payment_timing_check;

alter table public.order_payments
  add constraint order_payments_payment_timing_check
  check (payment_timing in ('final', 'advance'));

create or replace function public.enforce_order_prepared_before_payment()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if coalesce(new.payment_timing, 'final') <> 'advance' then
    perform public.assert_order_fully_prepared(new.order_id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_order_payments_require_prepared_items
on public.order_payments;

create trigger trg_order_payments_require_prepared_items
before insert on public.order_payments
for each row
execute function public.enforce_order_prepared_before_payment();
