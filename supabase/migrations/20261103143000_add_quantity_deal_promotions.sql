-- DorianCore
-- Promociones: "Compra X, paga Y" (2x1, 3x2, 4x3, etc.).
-- La configuración técnica sigue oculta al cliente.

alter table public.promotion_programs
  add column if not exists target_product_id uuid
    references public.products(id) on delete restrict,
  add column if not exists buy_quantity integer,
  add column if not exists pay_quantity integer;

alter table public.orders
  add column if not exists quantity_promotion_discount numeric(10,2)
    not null default 0;

create table if not exists public.order_quantity_promotion_discounts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null
    references public.orders(id) on delete cascade,
  program_id uuid not null
    references public.promotion_programs(id) on delete restrict,
  product_id uuid not null
    references public.products(id) on delete restrict,
  qualifying_quantity integer not null,
  free_quantity integer not null,
  discount_amount numeric(10,2) not null,
  created_at timestamptz not null default now(),
  constraint order_quantity_promotion_discount_positive
    check (discount_amount >= 0),
  constraint order_quantity_promotion_free_positive
    check (free_quantity >= 1),
  constraint uq_order_quantity_promotion
    unique(order_id, program_id)
);

create index if not exists idx_order_quantity_promotion_discounts_order
  on public.order_quantity_promotion_discounts(order_id);

alter table public.promotion_programs
  drop constraint if exists promotion_programs_type_check;

alter table public.promotion_programs
  add constraint promotion_programs_type_check
  check (
    program_type in (
      'collect_reward',
      'order_refund',
      'quantity_deal'
    )
  );

alter table public.promotion_programs
  drop constraint if exists promotion_programs_required_check;

alter table public.promotion_programs
  add constraint promotion_programs_required_check
  check (
    (
      program_type = 'collect_reward'
      and required_coupons is not null
      and required_coupons >= 1
      and target_product_id is null
      and buy_quantity is null
      and pay_quantity is null
    )
    or
    (
      program_type = 'order_refund'
      and required_coupons is null
      and target_product_id is null
      and buy_quantity is null
      and pay_quantity is null
    )
    or
    (
      program_type = 'quantity_deal'
      and required_coupons is null
      and target_product_id is not null
      and buy_quantity is not null
      and pay_quantity is not null
      and buy_quantity >= 2
      and pay_quantity >= 1
      and pay_quantity < buy_quantity
    )
  );

-- Devuelve una sola oferta efectiva por producto.
-- Si existen varias, se respeta la prioridad ya existente del sistema.
create or replace function public.get_active_quantity_promotions()
returns table (
  id uuid,
  display_name text,
  target_product_id uuid,
  product_name text,
  buy_quantity integer,
  pay_quantity integer,
  priority integer
)
language sql
security definer
set search_path = public
stable
as $$
  select distinct on (program.target_product_id)
    program.id,
    program.display_name,
    program.target_product_id,
    product.name,
    program.buy_quantity,
    program.pay_quantity,
    program.priority
  from public.promotion_programs program
  join public.products product
    on product.id = program.target_product_id
  where program.is_enabled = true
    and program.program_type = 'quantity_deal'
    and product.is_active = true
    and product.is_available = true
  order by
    program.target_product_id,
    program.priority asc,
    program.created_at asc;
$$;

revoke all on function public.get_active_quantity_promotions() from public;
grant execute on function public.get_active_quantity_promotions()
to anon, authenticated;

create or replace function public.recalculate_order_quantity_promotions(
  p_order_id uuid
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous_discount numeric(10,2) := 0;
  v_new_discount numeric(10,2) := 0;
  v_order_source text;
  v_order_kind text;
begin
  if p_order_id is null then
    return 0;
  end if;

  select
    coalesce(o.quantity_promotion_discount, 0),
    coalesce(o.order_source::text, 'pos'),
    coalesce(o.order_kind::text, 'regular')
  into
    v_previous_discount,
    v_order_source,
    v_order_kind
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    return 0;
  end if;

  delete from public.order_quantity_promotion_discounts d
  where d.order_id = p_order_id;

  if v_order_kind <> 'reward_redemption' then
    insert into public.order_quantity_promotion_discounts (
      order_id,
      program_id,
      product_id,
      qualifying_quantity,
      free_quantity,
      discount_amount
    )
    with selected_programs as (
      select distinct on (program.target_product_id)
        program.id,
        program.target_product_id,
        program.buy_quantity,
        program.pay_quantity
      from public.promotion_programs program
      where program.is_enabled = true
        and program.program_type = 'quantity_deal'
      order by
        program.target_product_id,
        program.priority asc,
        program.created_at asc
    ),
    item_totals as (
      select
        item.product_id,
        sum(item.quantity)::integer as total_quantity,
        min(item.price_at_purchase)::numeric as unit_price
      from public.order_items item
      where item.order_id = p_order_id
        and item.reward_source is null
      group by item.product_id
    )
    select
      p_order_id,
      program.id,
      program.target_product_id,
      (
        floor(
          item.total_quantity::numeric /
          program.buy_quantity::numeric
        )::integer *
        program.buy_quantity
      ),
      (
        floor(
          item.total_quantity::numeric /
          program.buy_quantity::numeric
        )::integer *
        (
          program.buy_quantity -
          program.pay_quantity
        )
      ),
      round(
        (
          floor(
            item.total_quantity::numeric /
            program.buy_quantity::numeric
          ) *
          (
            program.buy_quantity -
            program.pay_quantity
          ) *
          item.unit_price
        )::numeric,
        2
      )
    from selected_programs program
    join item_totals item
      on item.product_id =
        program.target_product_id
    where item.total_quantity >=
      program.buy_quantity;
  end if;

  select
    coalesce(
      sum(d.discount_amount),
      0
    )
  into v_new_discount
  from public.order_quantity_promotion_discounts d
  where d.order_id = p_order_id;

  update public.orders
  set
    quantity_promotion_discount =
      v_new_discount,

    -- POS ya manda el total visual con la promoción aplicada.
    -- WEB calcula el precio en servidor, así que ajustamos la diferencia aquí.
    total =
      case
        when v_order_source = 'web'
        then greatest(
          0,
          total +
          v_previous_discount -
          v_new_discount
        )
        else total
      end
  where id = p_order_id;

  return v_new_discount;
end;
$$;

create or replace function public.refresh_order_quantity_promotions_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
begin
  if tg_op = 'DELETE' then
    v_order_id := old.order_id;

    perform public.recalculate_order_quantity_promotions(
      v_order_id
    );

    return old;
  end if;

  v_order_id := new.order_id;

  perform public.recalculate_order_quantity_promotions(
    v_order_id
  );

  return new;
end;
$$;

drop trigger if exists trg_order_items_quantity_promotions
  on public.order_items;

create trigger trg_order_items_quantity_promotions
after insert or update or delete
on public.order_items
for each row
execute function public.refresh_order_quantity_promotions_trigger();

revoke all on function public.recalculate_order_quantity_promotions(uuid)
from public;

grant execute on function public.recalculate_order_quantity_promotions(uuid)
to authenticated;

alter table public.order_quantity_promotion_discounts
  enable row level security;

drop policy if exists "Authenticated users read quantity promotion discounts"
  on public.order_quantity_promotion_discounts;

create policy "Authenticated users read quantity promotion discounts"
on public.order_quantity_promotion_discounts
for select to authenticated
using (true);

grant select on public.order_quantity_promotion_discounts
to authenticated;

-- Importante: las promociones de cantidad no generan cupones.
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
      and program_type in (
        'collect_reward',
        'order_refund'
      )
    order by
      priority asc,
      created_at asc
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
      upper(
        trim(
          v_selected.code_prefix
        )
      ) ||
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

grant execute on function public.create_or_get_order_promotion_coupon(uuid)
to authenticated;
