-- Dorian POS
-- Reversión de beneficios derivados de órdenes devueltas.
--
-- Reglas V1:
-- 1. Cupón promocional emitido por una orden:
--    - solo se invalida cuando la orden queda totalmente reembolsada.
--    - si ya fue canjeado, NO se borra el canje; se marca el cupón como
--      invalidado y se conserva auditoría.
-- 2. Visita Rewards ligada a una orden:
--    - se revierte si la orden queda totalmente reembolsada; o
--    - si el saldo pagado remanente cae por debajo de
--      loyalty_settings.minimum_purchase_amount.
--    - la visita se copia a una tabla de auditoría y se elimina de
--      loyalty_visits para que TODAS las funciones actuales de Rewards
--      dejen de contarla sin tener que reescribir get_loyalty_status.
-- 3. Todo se evalúa con reembolsos acumulados completados.
--
-- Esta migración NO deshace premios ya entregados físicamente. Conserva
-- esos canjes como historial, pero evita que la compra devuelta siga
-- generando crédito para beneficios futuros.

alter table public.promo_coupons
  add column if not exists voided boolean not null default false,
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid,
  add column if not exists void_reason text,
  add column if not exists void_refund_id uuid;

create index if not exists idx_promo_coupons_order_voided
  on public.promo_coupons(order_id, voided);

create table if not exists public.promo_coupon_reversals (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null,
  order_id uuid not null,
  code text not null,
  program_id uuid not null,
  was_redeemed boolean not null,
  redemption_id uuid,
  refund_id uuid not null,
  reversed_by uuid,
  reason text not null,
  reversed_at timestamptz not null default now(),
  constraint promo_coupon_reversals_coupon_unique
    unique (coupon_id)
);

create table if not exists public.loyalty_visit_reversals (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null,
  customer_id uuid not null,
  order_id uuid,
  registered_by uuid,
  visited_at timestamptz not null,
  notes text,
  refund_id uuid not null,
  reversed_by uuid,
  reason text not null,
  reversed_at timestamptz not null default now(),
  constraint loyalty_visit_reversals_visit_unique
    unique (visit_id)
);

alter table public.promo_coupon_reversals
  enable row level security;

alter table public.loyalty_visit_reversals
  enable row level security;

drop policy if exists "Admins can read promo coupon reversals"
  on public.promo_coupon_reversals;

create policy "Admins can read promo coupon reversals"
on public.promo_coupon_reversals
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'admin'::public.user_role
      and coalesce(profile.is_active, true) = true
  )
);

drop policy if exists "Admins can read loyalty visit reversals"
  on public.loyalty_visit_reversals;

create policy "Admins can read loyalty visit reversals"
on public.loyalty_visit_reversals
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'admin'::public.user_role
      and coalesce(profile.is_active, true) = true
  )
);

-- Evita que cualquier flujo de canje marque como usado un cupón que
-- ya fue invalidado. Esto protege tanto collect_reward como order_refund
-- sin depender de reescribir cada RPC de canje.
create or replace function public.prevent_voided_coupon_redemption()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if
    old.voided = true
    and coalesce(old.redeemed, false) = false
    and coalesce(new.redeemed, false) = true
  then
    raise exception
      'Este cupón fue invalidado por una devolución de la compra original.';
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_prevent_voided_coupon_redemption
  on public.promo_coupons;

create trigger trg_prevent_voided_coupon_redemption
before update of redeemed
on public.promo_coupons
for each row
execute function public.prevent_voided_coupon_redemption();


-- Mantiene la regla de "un solo resultado por orden":
-- si la orden ya produjo un cupón invalidado por devolución,
-- NO genera otro cupón.
create or replace function public.create_or_get_order_promotion_coupon(
  p_order_id uuid
)
returns table(
  id uuid,
  order_id uuid,
  code text,
  program_id uuid,
  program_code text,
  program_name text,
  program_type text,
  code_prefix text,
  required_coupons integer,
  redeemed boolean,
  redeemed_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_existing public.promo_coupons%rowtype;
  v_program public.promotion_programs%rowtype;
  v_selected public.promotion_programs%rowtype;
  v_code text;
begin
  if p_order_id is null or not exists (
    select 1
    from public.orders o
    where o.id = p_order_id
  ) then
    raise exception 'La orden no existe.';
  end if;

  select *
  into v_existing
  from public.promo_coupons pc
  where pc.order_id = p_order_id
  limit 1;

  if found then
    if coalesce(v_existing.voided, false) then
      return;
    end if;

    return query
    select
      v_existing.id,
      v_existing.order_id,
      v_existing.code,
      p.id,
      p.code,
      p.display_name,
      p.program_type,
      p.code_prefix,
      p.required_coupons,
      v_existing.redeemed,
      v_existing.redeemed_at,
      v_existing.created_at
    from public.promotion_programs p
    where p.id = v_existing.program_id;

    return;
  end if;

  for v_program in
    select *
    from public.promotion_programs
    where is_enabled = true
    order by priority asc, created_at asc
  loop
    if
      v_program.issue_chance_denominator = 1
      or floor(
        random() *
        v_program.issue_chance_denominator
      )::integer = 0
    then
      v_selected := v_program;
      exit;
    end if;
  end loop;

  if v_selected.id is null then
    return;
  end if;

  loop
    v_code :=
      upper(trim(v_selected.code_prefix)) ||
      upper(
        substring(
          replace(
            gen_random_uuid()::text,
            '-',
            ''
          )
          from 1 for 7
        )
      );

    exit when not exists (
      select 1
      from public.promo_coupons pc
      where pc.code = v_code
    );
  end loop;

  insert into public.promo_coupons (
    order_id,
    code,
    coupon_type,
    program_id
  )
  values (
    p_order_id,
    v_code,
    v_selected.code,
    v_selected.id
  )
  returning *
  into v_existing;

  return query
  select
    v_existing.id,
    v_existing.order_id,
    v_existing.code,
    v_selected.id,
    v_selected.code,
    v_selected.display_name,
    v_selected.program_type,
    v_selected.code_prefix,
    v_selected.required_coupons,
    v_existing.redeemed,
    v_existing.redeemed_at,
    v_existing.created_at;
end;
$function$;


create or replace function public.reconcile_order_benefits_after_refund(
  p_order_id uuid,
  p_refund_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_paid_total numeric(12,2) := 0;
  v_refunded_total numeric(12,2) := 0;
  v_remaining_total numeric(12,2) := 0;
  v_minimum_purchase numeric(12,2);
  v_should_reverse_visit boolean := false;
  v_reason text;
  v_actor uuid;
  v_visit public.loyalty_visits%rowtype;
begin
  if p_order_id is null or p_refund_id is null then
    raise exception
      'La orden y la devolución son obligatorias.';
  end if;

  v_actor := auth.uid();

  select
    coalesce(
      sum(payment.total_amount),
      0
    )::numeric(12,2)
  into
    v_paid_total
  from public.order_payments payment
  where payment.order_id = p_order_id;

  select
    coalesce(
      sum(refund.refund_total),
      0
    )::numeric(12,2)
  into
    v_refunded_total
  from public.order_refunds refund
  where refund.order_id = p_order_id
    and refund.status = 'completed';

  v_remaining_total :=
    greatest(
      v_paid_total -
      v_refunded_total,
      0
    );

  /*
   * CUPÓN PROMOCIONAL
   *
   * No existe un monto mínimo para la emisión del cupón en el modelo
   * actual. Por ello, una devolución parcial conserva el cupón y una
   * devolución total lo invalida.
   */
  if
    v_paid_total > 0
    and v_remaining_total <= 0
  then
    insert into public.promo_coupon_reversals (
      coupon_id,
      order_id,
      code,
      program_id,
      was_redeemed,
      redemption_id,
      refund_id,
      reversed_by,
      reason
    )
    select
      coupon.id,
      coupon.order_id,
      coupon.code,
      coupon.program_id,
      coupon.redeemed,
      coupon.redemption_id,
      p_refund_id,
      v_actor,
      case
        when coupon.redeemed
          then 'Compra totalmente devuelta; el cupón ya había sido canjeado y se conserva el canje como historial.'
        else 'Compra totalmente devuelta; cupón invalidado antes de su canje.'
      end
    from public.promo_coupons coupon
    where coupon.order_id = p_order_id
      and coalesce(coupon.voided, false) = false
    on conflict (coupon_id)
    do nothing;

    update public.promo_coupons coupon
    set
      voided = true,
      voided_at = now(),
      voided_by = v_actor,
      void_refund_id = p_refund_id,
      void_reason =
        case
          when coupon.redeemed
            then 'Compra totalmente devuelta después del canje.'
          else 'Compra totalmente devuelta.'
        end
    where coupon.order_id = p_order_id
      and coalesce(coupon.voided, false) = false;
  end if;

  /*
   * REWARDS / VISITAS
   *
   * La visita se invalida al dejar de cumplirse la compra mínima.
   * Si no hay mínimo configurado, únicamente la devolución total
   * invalida la visita.
   */
  select
    settings.minimum_purchase_amount
  into
    v_minimum_purchase
  from public.loyalty_settings settings
  where settings.id = true;

  v_should_reverse_visit :=
    (
      v_paid_total > 0
      and v_remaining_total <= 0
    )
    or (
      v_minimum_purchase is not null
      and v_minimum_purchase > 0
      and v_remaining_total < v_minimum_purchase
    );

  if v_should_reverse_visit then
    if
      v_paid_total > 0
      and v_remaining_total <= 0
    then
      v_reason :=
        'Visita revertida por devolución total de la compra.';
    else
      v_reason :=
        'Visita revertida porque el importe remanente quedó por debajo de la compra mínima.';
    end if;

    for v_visit in
      select *
      from public.loyalty_visits visit
      where visit.order_id = p_order_id
      for update
    loop
      insert into public.loyalty_visit_reversals (
        visit_id,
        customer_id,
        order_id,
        registered_by,
        visited_at,
        notes,
        refund_id,
        reversed_by,
        reason
      )
      values (
        v_visit.id,
        v_visit.customer_id,
        v_visit.order_id,
        v_visit.registered_by,
        v_visit.visited_at,
        v_visit.notes,
        p_refund_id,
        v_actor,
        v_reason
      )
      on conflict (visit_id)
      do nothing;

      delete from public.loyalty_visits
      where id = v_visit.id;
    end loop;
  end if;
end;
$function$;

revoke all
on function public.reconcile_order_benefits_after_refund(uuid, uuid)
from public;

revoke all
on function public.reconcile_order_benefits_after_refund(uuid, uuid)
from anon;

revoke all
on function public.reconcile_order_benefits_after_refund(uuid, uuid)
from authenticated;


create or replace function public.handle_order_refund_benefit_reversal()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.status = 'completed' then
    perform public.reconcile_order_benefits_after_refund(
      new.order_id,
      new.id
    );
  end if;

  return new;
end;
$function$;

revoke all
on function public.handle_order_refund_benefit_reversal()
from public;

revoke all
on function public.handle_order_refund_benefit_reversal()
from anon;

revoke all
on function public.handle_order_refund_benefit_reversal()
from authenticated;

drop trigger if exists trg_order_refund_benefit_reversal
  on public.order_refunds;

create trigger trg_order_refund_benefit_reversal
after insert or update of status, refund_total
on public.order_refunds
for each row
when (new.status = 'completed')
execute function public.handle_order_refund_benefit_reversal();


-- Backfill idempotente para devoluciones completadas que pudieran existir
-- antes de aplicar esta migración (por ejemplo pruebas realizadas en DEV).
do $backfill$
declare
  v_refund record;
begin
  for v_refund in
    select distinct on (refund.order_id)
      refund.id,
      refund.order_id
    from public.order_refunds refund
    where refund.status = 'completed'
    order by
      refund.order_id,
      refund.created_at desc
  loop
    perform public.reconcile_order_benefits_after_refund(
      v_refund.order_id,
      v_refund.id
    );
  end loop;
end;
$backfill$;
