-- DorianCore
-- Promociones unificadas: vigencia + días + modificador + precio especial + compra mínima.

alter table public.promotion_programs
  add column if not exists target_modifier_id uuid
    references public.modifiers(id) on delete restrict,
  add column if not exists discount_amount numeric(10,2),
  add column if not exists fixed_price numeric(10,2),
  add column if not exists minimum_order_amount numeric(10,2),
  add column if not exists order_discount_kind text,
  add column if not exists order_discount_value numeric(10,2),
  add column if not exists starts_at date,
  add column if not exists ends_at date,
  add column if not exists active_weekdays smallint[]
    not null default array[0,1,2,3,4,5,6]::smallint[];

alter table public.orders
  add column if not exists pricing_promotion_discount numeric(10,2)
    not null default 0;

alter table public.promotion_programs
  drop constraint if exists promotion_programs_type_check,
  drop constraint if exists promotion_programs_required_check,
  drop constraint if exists promotion_programs_schedule_check,
  drop constraint if exists promotion_programs_order_discount_kind_check;

alter table public.promotion_programs
  add constraint promotion_programs_type_check
  check (
    program_type in (
      'collect_reward',
      'order_refund',
      'quantity_deal',
      'modifier_discount',
      'special_price',
      'minimum_spend_discount'
    )
  ),
  add constraint promotion_programs_schedule_check
  check (
    cardinality(active_weekdays) >= 1
    and active_weekdays <@ array[0,1,2,3,4,5,6]::smallint[]
    and (starts_at is null or ends_at is null or ends_at >= starts_at)
  ),
  add constraint promotion_programs_order_discount_kind_check
  check (
    order_discount_kind is null
    or order_discount_kind in ('percent', 'fixed')
  );

alter table public.promotion_programs
  add constraint promotion_programs_required_check
  check (
    (
      program_type = 'collect_reward'
      and required_coupons is not null
      and required_coupons >= 1
      and target_product_id is null
      and target_modifier_id is null
      and buy_quantity is null
      and pay_quantity is null
      and discount_amount is null
      and fixed_price is null
      and minimum_order_amount is null
      and order_discount_kind is null
      and order_discount_value is null
    )
    or
    (
      program_type = 'order_refund'
      and required_coupons is null
      and target_product_id is null
      and target_modifier_id is null
      and buy_quantity is null
      and pay_quantity is null
      and discount_amount is null
      and fixed_price is null
      and minimum_order_amount is null
      and order_discount_kind is null
      and order_discount_value is null
    )
    or
    (
      program_type = 'quantity_deal'
      and required_coupons is null
      and target_product_id is not null
      and target_modifier_id is null
      and buy_quantity is not null
      and pay_quantity is not null
      and buy_quantity >= 2
      and pay_quantity >= 1
      and pay_quantity < buy_quantity
      and discount_amount is null
      and fixed_price is null
      and minimum_order_amount is null
      and order_discount_kind is null
      and order_discount_value is null
    )
    or
    (
      program_type = 'modifier_discount'
      and required_coupons is null
      and target_product_id is null
      and target_modifier_id is not null
      and buy_quantity is null
      and pay_quantity is null
      and discount_amount is not null
      and discount_amount > 0
      and fixed_price is null
      and minimum_order_amount is null
      and order_discount_kind is null
      and order_discount_value is null
    )
    or
    (
      program_type = 'special_price'
      and required_coupons is null
      and target_product_id is not null
      and target_modifier_id is null
      and buy_quantity is null
      and pay_quantity is null
      and discount_amount is null
      and fixed_price is not null
      and fixed_price >= 0
      and minimum_order_amount is null
      and order_discount_kind is null
      and order_discount_value is null
    )
    or
    (
      program_type = 'minimum_spend_discount'
      and required_coupons is null
      and target_product_id is null
      and target_modifier_id is null
      and buy_quantity is null
      and pay_quantity is null
      and discount_amount is null
      and fixed_price is null
      and minimum_order_amount is not null
      and minimum_order_amount > 0
      and order_discount_kind in ('percent', 'fixed')
      and order_discount_value is not null
      and order_discount_value > 0
      and (
        order_discount_kind <> 'percent'
        or order_discount_value <= 100
      )
    )
  );

insert into public.promotion_programs (
  code,
  display_name,
  program_type,
  code_prefix,
  is_enabled,
  issue_chance_denominator,
  required_coupons,
  priority,
  target_modifier_id,
  discount_amount,
  starts_at,
  ends_at,
  active_weekdays
)
select
  'modifier_discount_legacy',
  coalesce(nullif(trim(settings.display_name), ''), 'Descuento en modificador'),
  'modifier_discount',
  'MOD-',
  settings.is_enabled,
  1,
  null,
  80,
  settings.modifier_id,
  settings.discount_amount,
  settings.starts_at,
  settings.ends_at,
  array[0,1,2,3,4,5,6]::smallint[]
from public.modifier_promotion_settings settings
where settings.modifier_id is not null
order by settings.updated_at desc
limit 1
on conflict (code) do update set
  display_name = excluded.display_name,
  is_enabled = excluded.is_enabled,
  target_modifier_id = excluded.target_modifier_id,
  discount_amount = excluded.discount_amount,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  updated_at = now();

update public.modifier_promotion_settings
set is_enabled = false,
    updated_at = now()
where is_enabled = true;

create or replace function public.is_promotion_program_active(
  p_program_id uuid,
  p_on_date date default current_date
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.promotion_programs program
    where program.id = p_program_id
      and program.is_enabled = true
      and (
        program.starts_at is null
        or p_on_date >= program.starts_at
      )
      and (
        program.ends_at is null
        or p_on_date <= program.ends_at
      )
      and extract(dow from p_on_date)::smallint = any(program.active_weekdays)
  );
$$;

revoke all on function public.is_promotion_program_active(uuid,date) from public;
grant execute on function public.is_promotion_program_active(uuid,date)
to anon, authenticated;

create or replace function public.get_active_modifier_promotion()
returns table (
  id uuid,
  display_name text,
  modifier_id uuid,
  modifier_name text,
  discount_amount numeric,
  starts_at date,
  ends_at date
)
language sql
stable
security definer
set search_path = public
as $$
  select
    program.id,
    program.display_name,
    program.target_modifier_id,
    modifier.name,
    program.discount_amount,
    program.starts_at,
    program.ends_at
  from public.promotion_programs program
  join public.modifiers modifier
    on modifier.id = program.target_modifier_id
  where program.program_type = 'modifier_discount'
    and modifier.is_available = true
    and public.is_promotion_program_active(program.id, current_date)
  order by program.priority asc, program.updated_at desc
  limit 1;
$$;

revoke all on function public.get_active_modifier_promotion() from public;
grant execute on function public.get_active_modifier_promotion()
to anon, authenticated;

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
  where program.program_type = 'quantity_deal'
    and product.is_active = true
    and product.is_available = true
    and public.is_promotion_program_active(program.id, current_date)
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
      where program.program_type = 'quantity_deal'
        and public.is_promotion_program_active(program.id, current_date)
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
      floor(item.total_quantity::numeric / program.buy_quantity::numeric)::integer * program.buy_quantity,
      floor(item.total_quantity::numeric / program.buy_quantity::numeric)::integer * (program.buy_quantity - program.pay_quantity),
      round(
        (
          floor(item.total_quantity::numeric / program.buy_quantity::numeric)
          * (program.buy_quantity - program.pay_quantity)
          * item.unit_price
        )::numeric,
        2
      )
    from selected_programs program
    join item_totals item
      on item.product_id = program.target_product_id
    where item.total_quantity >= program.buy_quantity;
  end if;

  select coalesce(sum(d.discount_amount), 0)
  into v_new_discount
  from public.order_quantity_promotion_discounts d
  where d.order_id = p_order_id;

  update public.orders
  set
    quantity_promotion_discount = v_new_discount,
    total = case
      when v_order_source = 'web'
      then greatest(0, total + v_previous_discount - v_new_discount)
      else total
    end
  where id = p_order_id;

  return v_new_discount;
end;
$$;

create table if not exists public.order_pricing_promotion_discounts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  program_id uuid not null references public.promotion_programs(id) on delete restrict,
  product_id uuid references public.products(id) on delete restrict,
  promotion_name text not null,
  discount_amount numeric(10,2) not null,
  created_at timestamptz not null default now(),
  constraint order_pricing_promotion_discount_positive check (discount_amount >= 0)
);

create unique index if not exists uq_order_pricing_promotion
on public.order_pricing_promotion_discounts(
  order_id,
  program_id,
  coalesce(product_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

create index if not exists idx_order_pricing_promotion_discounts_order
  on public.order_pricing_promotion_discounts(order_id);

alter table public.order_pricing_promotion_discounts enable row level security;

drop policy if exists "Authenticated users read pricing promotion discounts"
  on public.order_pricing_promotion_discounts;

create policy "Authenticated users read pricing promotion discounts"
on public.order_pricing_promotion_discounts
for select to authenticated
using (true);

grant select on public.order_pricing_promotion_discounts to authenticated;

create or replace function public.get_active_pricing_promotions()
returns table (
  id uuid,
  display_name text,
  program_type text,
  target_product_id uuid,
  product_name text,
  fixed_price numeric,
  minimum_order_amount numeric,
  order_discount_kind text,
  order_discount_value numeric,
  priority integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    program.id,
    program.display_name,
    program.program_type,
    program.target_product_id,
    product.name,
    program.fixed_price,
    program.minimum_order_amount,
    program.order_discount_kind,
    program.order_discount_value,
    program.priority
  from public.promotion_programs program
  left join public.products product
    on product.id = program.target_product_id
  where program.program_type in ('special_price', 'minimum_spend_discount')
    and public.is_promotion_program_active(program.id, current_date)
    and (
      program.program_type <> 'special_price'
      or (
        product.is_active = true
        and product.is_available = true
      )
    )
  order by program.priority asc, program.created_at asc;
$$;

revoke all on function public.get_active_pricing_promotions() from public;
grant execute on function public.get_active_pricing_promotions()
to anon, authenticated;

create or replace function public.recalculate_order_pricing_promotions(
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
  v_special_discount numeric(10,2) := 0;
  v_minimum_discount numeric(10,2) := 0;
  v_product_subtotal numeric(10,2) := 0;
  v_quantity_discount numeric(10,2) := 0;
  v_order_source text;
  v_order_kind text;
  v_minimum_program public.promotion_programs%rowtype;
  v_eligible numeric(10,2) := 0;
begin
  if p_order_id is null then
    return 0;
  end if;

  select
    coalesce(o.pricing_promotion_discount, 0),
    coalesce(o.quantity_promotion_discount, 0),
    coalesce(o.order_source::text, 'pos'),
    coalesce(o.order_kind::text, 'regular')
  into
    v_previous_discount,
    v_quantity_discount,
    v_order_source,
    v_order_kind
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    return 0;
  end if;

  delete from public.order_pricing_promotion_discounts d
  where d.order_id = p_order_id;

  select coalesce(sum(item.price_at_purchase * item.quantity), 0)
  into v_product_subtotal
  from public.order_items item
  where item.order_id = p_order_id
    and item.reward_source is null;

  if v_order_kind <> 'reward_redemption' then
    insert into public.order_pricing_promotion_discounts (
      order_id,
      program_id,
      product_id,
      promotion_name,
      discount_amount
    )
    with selected_programs as (
      select distinct on (program.target_product_id)
        program.id,
        program.target_product_id,
        program.display_name,
        program.fixed_price
      from public.promotion_programs program
      where program.program_type = 'special_price'
        and public.is_promotion_program_active(program.id, current_date)
        and not exists (
          select 1
          from public.promotion_programs quantity_program
          where quantity_program.program_type = 'quantity_deal'
            and quantity_program.target_product_id = program.target_product_id
            and public.is_promotion_program_active(quantity_program.id, current_date)
        )
      order by program.target_product_id, program.priority asc, program.created_at asc
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
      program.display_name,
      round(greatest(0, item.unit_price - program.fixed_price) * item.total_quantity, 2)
    from selected_programs program
    join item_totals item
      on item.product_id = program.target_product_id
    where item.unit_price > program.fixed_price;

    select coalesce(sum(d.discount_amount), 0)
    into v_special_discount
    from public.order_pricing_promotion_discounts d
    where d.order_id = p_order_id;

    select program.*
    into v_minimum_program
    from public.promotion_programs program
    where program.program_type = 'minimum_spend_discount'
      and program.minimum_order_amount <= v_product_subtotal
      and public.is_promotion_program_active(program.id, current_date)
    order by program.priority asc, program.created_at asc
    limit 1;

    if v_minimum_program.id is not null then
      v_eligible := greatest(0, v_product_subtotal - v_quantity_discount - v_special_discount);

      if v_minimum_program.order_discount_kind = 'percent' then
        v_minimum_discount := round(
          v_eligible * (v_minimum_program.order_discount_value / 100.0),
          2
        );
      else
        v_minimum_discount := least(v_eligible, v_minimum_program.order_discount_value);
      end if;

      if v_minimum_discount > 0 then
        insert into public.order_pricing_promotion_discounts (
          order_id,
          program_id,
          product_id,
          promotion_name,
          discount_amount
        ) values (
          p_order_id,
          v_minimum_program.id,
          null,
          v_minimum_program.display_name,
          v_minimum_discount
        );
      end if;
    end if;
  end if;

  select coalesce(sum(d.discount_amount), 0)
  into v_new_discount
  from public.order_pricing_promotion_discounts d
  where d.order_id = p_order_id;

  update public.orders
  set
    pricing_promotion_discount = v_new_discount,
    total = case
      when v_order_source = 'web'
      then greatest(0, total + v_previous_discount - v_new_discount)
      else total
    end
  where id = p_order_id;

  return v_new_discount;
end;
$$;

create or replace function public.refresh_order_pricing_promotions_trigger()
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
    perform public.recalculate_order_pricing_promotions(v_order_id);
    return old;
  end if;

  v_order_id := new.order_id;
  perform public.recalculate_order_pricing_promotions(v_order_id);
  return new;
end;
$$;

drop trigger if exists trg_order_items_pricing_promotions
  on public.order_items;
drop trigger if exists trg_order_items_zz_pricing_promotions
  on public.order_items;

-- El prefijo zz hace que este trigger corra después del de quantity_deal.
create trigger trg_order_items_zz_pricing_promotions
after insert or update or delete
on public.order_items
for each row
execute function public.refresh_order_pricing_promotions_trigger();

revoke all on function public.recalculate_order_pricing_promotions(uuid) from public;
grant execute on function public.recalculate_order_pricing_promotions(uuid)
to authenticated;

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
    select 1 from public.orders o where o.id = p_order_id
  ) then
    raise exception 'La orden no existe.';
  end if;

  select * into v_existing
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
    where program_type in ('collect_reward', 'order_refund')
      and public.is_promotion_program_active(id, current_date)
    order by priority asc, created_at asc
  loop
    if
      v_program.issue_chance_denominator = 1
      or floor(random() * v_program.issue_chance_denominator)::integer = 0
    then
      v_selected := v_program;
      exit;
    end if;
  end loop;

  if v_selected.id is null then
    return;
  end if;

  loop
    v_code := upper(trim(v_selected.code_prefix)) ||
      upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 7));

    exit when not exists (
      select 1 from public.promo_coupons pc where pc.code = v_code
    );
  end loop;

  insert into public.promo_coupons (
    order_id,
    code,
    coupon_type,
    program_id
  ) values (
    p_order_id,
    v_code,
    v_selected.code,
    v_selected.id
  )
  returning * into v_existing;

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
