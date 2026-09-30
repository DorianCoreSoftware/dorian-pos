-- =========================================================
-- DORIAN POS
-- PROMOTION PROGRAMS - GENERIC ENGINE
-- =========================================================

create table if not exists public.promotion_programs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  display_name text not null,
  program_type text not null,
  code_prefix text not null,
  is_enabled boolean not null default true,
  issue_chance_denominator integer not null default 1,
  required_coupons integer,
  priority integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotion_programs_code_not_empty check (length(trim(code)) > 0),
  constraint promotion_programs_name_not_empty check (length(trim(display_name)) > 0),
  constraint promotion_programs_prefix_not_empty check (length(trim(code_prefix)) > 0),
  constraint promotion_programs_type_check check (program_type in ('collect_reward', 'order_refund')),
  constraint promotion_programs_chance_check check (issue_chance_denominator >= 1),
  constraint promotion_programs_required_check check (
    (program_type = 'collect_reward' and required_coupons is not null and required_coupons >= 1)
    or
    (program_type = 'order_refund' and required_coupons is null)
  )
);

create table if not exists public.promotion_rewards (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.promotion_programs(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  display_name text not null,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotion_rewards_name_not_empty check (length(trim(display_name)) > 0)
);

create index if not exists promotion_rewards_program_idx
  on public.promotion_rewards(program_id, position);

alter table public.promo_coupons
  add column if not exists program_id uuid references public.promotion_programs(id) on delete restrict;

alter table public.promo_redemptions
  add column if not exists program_id uuid references public.promotion_programs(id) on delete restrict,
  add column if not exists reward_id uuid references public.promotion_rewards(id) on delete set null;

-- Legacy constraints were intentionally closed to Burger Kong concepts.
alter table public.promo_coupons
  drop constraint if exists promo_coupons_coupon_type_check;

alter table public.promo_redemptions
  drop constraint if exists promo_redemptions_reward_required_check,
  drop constraint if exists promo_redemptions_reward_value_check,
  drop constraint if exists promo_redemptions_type_check;

alter table public.promo_redemptions
  alter column redemption_type drop not null;

-- =========================================================
-- MIGRATE CURRENT CONFIGURATION
-- =========================================================

do $migration$
declare
  v_settings public.promo_settings%rowtype;
  v_collect_id uuid;
  v_refund_id uuid;
begin
  select *
  into v_settings
  from public.promo_settings
  where is_active = true
  order by updated_at desc
  limit 1;

  insert into public.promotion_programs (
    code,
    display_name,
    program_type,
    code_prefix,
    is_enabled,
    issue_chance_denominator,
    required_coupons,
    priority
  )
  values (
    'collect_reward',
    'Kong',
    'collect_reward',
    'BK-K',
    coalesce(v_settings.kong_enabled, true),
    1,
    coalesce(v_settings.required_kongs, 5),
    100
  )
  on conflict (code) do update set
    updated_at = now()
  returning id into v_collect_id;

  insert into public.promotion_programs (
    code,
    display_name,
    program_type,
    code_prefix,
    is_enabled,
    issue_chance_denominator,
    required_coupons,
    priority
  )
  values (
    'order_refund',
    'Dorian de la Suerte',
    'order_refund',
    'BK-D',
    coalesce(v_settings.lucky_dorian_enabled, true),
    greatest(coalesce(v_settings.lucky_dorian_chance, 100), 1),
    null,
    10
  )
  on conflict (code) do update set
    updated_at = now()
  returning id into v_refund_id;

  update public.promo_coupons
  set program_id = case
    when coupon_type = 'lucky_dorian' then v_refund_id
    else v_collect_id
  end
  where program_id is null;

  update public.promo_redemptions
  set program_id = case
    when redemption_type = 'lucky_dorian' then v_refund_id
    else v_collect_id
  end
  where program_id is null;

  insert into public.promotion_rewards(program_id, product_id, display_name, position)
  select v_collect_id,
         (
           select p.id from public.products p
           where lower(p.name) like '%hamburguesa%especial%'
           order by p.created_at asc nulls last
           limit 1
         ),
         'Hamburguesa especial',
         10
  where not exists (
    select 1 from public.promotion_rewards r
    where r.program_id = v_collect_id and r.display_name = 'Hamburguesa especial'
  );

  insert into public.promotion_rewards(program_id, product_id, display_name, position)
  select v_collect_id,
         (
           select p.id from public.products p
           where lower(p.name) like '%boneless%'
           order by p.created_at asc nulls last
           limit 1
         ),
         'Boneless 150 g',
         20
  where not exists (
    select 1 from public.promotion_rewards r
    where r.program_id = v_collect_id and r.display_name = 'Boneless 150 g'
  );

  insert into public.promotion_rewards(program_id, product_id, display_name, position)
  select v_collect_id,
         (
           select p.id from public.products p
           where lower(p.name) like '%alita%'
           order by p.created_at asc nulls last
           limit 1
         ),
         'Alitas 6 piezas',
         30
  where not exists (
    select 1 from public.promotion_rewards r
    where r.program_id = v_collect_id and r.display_name = 'Alitas 6 piezas'
  );

  insert into public.promotion_rewards(program_id, product_id, display_name, position)
  select v_collect_id,
         (
           select p.id from public.products p
           where lower(p.name) like '%papa%grande%'
           order by p.created_at asc nulls last
           limit 1
         ),
         'Papas grandes',
         40
  where not exists (
    select 1 from public.promotion_rewards r
    where r.program_id = v_collect_id and r.display_name = 'Papas grandes'
  );

  insert into public.promotion_rewards(program_id, product_id, display_name, position)
  select v_collect_id,
         (
           select p.id from public.products p
           where lower(p.name) like '%malteada%'
           order by p.created_at asc nulls last
           limit 1
         ),
         'Malteada',
         50
  where not exists (
    select 1 from public.promotion_rewards r
    where r.program_id = v_collect_id and r.display_name = 'Malteada'
  );
end;
$migration$;

-- New coupons must belong to a promotion program.
alter table public.promo_coupons
  alter column program_id set not null;

-- =========================================================
-- UPDATED_AT
-- =========================================================

create or replace function public.set_promotion_program_updated_at()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists promotion_programs_set_updated_at on public.promotion_programs;
create trigger promotion_programs_set_updated_at
before update on public.promotion_programs
for each row execute function public.set_promotion_program_updated_at();

drop trigger if exists promotion_rewards_set_updated_at on public.promotion_rewards;
create trigger promotion_rewards_set_updated_at
before update on public.promotion_rewards
for each row execute function public.set_promotion_program_updated_at();

-- =========================================================
-- GENERATE COUPON
-- First enabled program that wins by priority is issued.
-- denominator=1 means always.
-- =========================================================

create or replace function public.create_or_get_order_promotion_coupon(
  p_order_id uuid
)
returns table (
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
    if v_program.issue_chance_denominator = 1
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

  insert into public.promo_coupons(order_id, code, coupon_type, program_id)
  values (p_order_id, v_code, v_selected.code, v_selected.id)
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

-- =========================================================
-- COLLECT + REWARD REDEMPTION
-- =========================================================

create or replace function public.redeem_collect_promotion(
  p_program_id uuid,
  p_codes text[],
  p_reward_id uuid
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_program public.promotion_programs%rowtype;
  v_reward public.promotion_rewards%rowtype;
  v_codes text[];
  v_valid_count integer;
  v_redemption_id uuid;
begin
  select * into v_program
  from public.promotion_programs
  where id = p_program_id and program_type = 'collect_reward';

  if not found then
    raise exception 'La promoción seleccionada no es válida.';
  end if;

  select * into v_reward
  from public.promotion_rewards
  where id = p_reward_id
    and program_id = p_program_id
    and is_active = true;

  if not found then
    raise exception 'El premio seleccionado no es válido.';
  end if;

  select array_agg(upper(trim(code))) into v_codes
  from unnest(p_codes) as code;

  if v_codes is null or array_length(v_codes, 1) <> v_program.required_coupons then
    raise exception 'Se necesitan exactamente % códigos.', v_program.required_coupons;
  end if;

  if exists (select 1 from unnest(v_codes) code where code is null or trim(code) = '') then
    raise exception 'Todos los códigos son obligatorios.';
  end if;

  if (select count(distinct code) from unnest(v_codes) code) <> v_program.required_coupons then
    raise exception 'Todos los códigos deben ser diferentes.';
  end if;

  perform id
  from public.promo_coupons
  where code = any(v_codes)
    and program_id = p_program_id
    and redeemed = false
  for update;

  select count(*) into v_valid_count
  from public.promo_coupons
  where code = any(v_codes)
    and program_id = p_program_id
    and redeemed = false;

  if v_valid_count <> v_program.required_coupons then
    raise exception 'Uno o más códigos no existen, ya fueron canjeados o pertenecen a otra promoción.';
  end if;

  insert into public.promo_redemptions(
    redemption_type,
    reward,
    redeemed_by,
    program_id,
    reward_id
  ) values (
    'collect_reward',
    v_reward.display_name,
    auth.uid(),
    p_program_id,
    p_reward_id
  ) returning id into v_redemption_id;

  update public.promo_coupons
  set redeemed = true,
      redeemed_at = now(),
      redemption_id = v_redemption_id
  where code = any(v_codes);

  return v_redemption_id;
end;
$function$;

-- =========================================================
-- ORDER REFUND REDEMPTION
-- =========================================================

create or replace function public.redeem_order_refund_promotion(
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_coupon public.promo_coupons%rowtype;
  v_program public.promotion_programs%rowtype;
  v_payment public.order_payments%rowtype;
  v_cash_session_id uuid;
  v_redemption_id uuid;
  v_refund_id uuid;
begin
  if p_code is null or trim(p_code) = '' then
    raise exception 'El código es obligatorio.';
  end if;

  select pc.* into v_coupon
  from public.promo_coupons pc
  where pc.code = upper(trim(p_code))
  for update;

  if not found then
    raise exception 'El código no existe.';
  end if;

  select * into v_program
  from public.promotion_programs
  where id = v_coupon.program_id
    and program_type = 'order_refund';

  if not found then
    raise exception 'El código no corresponde a una promoción de reembolso.';
  end if;

  if v_coupon.redeemed then
    raise exception 'Este cupón ya fue canjeado.';
  end if;

  select id into v_cash_session_id
  from public.cash_sessions
  where status = 'open'
  order by opened_at desc
  limit 1;

  if not found then
    raise exception 'No hay una caja abierta para registrar el reembolso.';
  end if;

  select * into v_payment
  from public.order_payments
  where order_id = v_coupon.order_id
  limit 1;

  if not found then
    raise exception 'No se encontró el pago asociado a esta compra.';
  end if;

  if v_payment.payment_method not in ('cash', 'card') then
    raise exception 'La forma de pago original no es válida para reembolso.';
  end if;

  insert into public.promo_redemptions(
    redemption_type,
    reward,
    redeemed_by,
    program_id,
    reward_id
  ) values (
    'order_refund',
    null,
    auth.uid(),
    v_program.id,
    null
  ) returning id into v_redemption_id;

  insert into public.cash_refunds(
    order_id,
    promo_redemption_id,
    cash_session_id,
    payment_method,
    amount,
    refunded_by
  ) values (
    v_coupon.order_id,
    v_redemption_id,
    v_cash_session_id,
    v_payment.payment_method,
    v_payment.total_amount,
    auth.uid()
  ) returning id into v_refund_id;

  update public.promo_coupons
  set redeemed = true,
      redeemed_at = now(),
      redemption_id = v_redemption_id
  where id = v_coupon.id;

  return jsonb_build_object(
    'redemptionId', v_redemption_id,
    'refundId', v_refund_id,
    'orderId', v_coupon.order_id,
    'cashSessionId', v_cash_session_id,
    'paymentMethod', v_payment.payment_method,
    'amount', v_payment.total_amount,
    'programId', v_program.id,
    'programName', v_program.display_name
  );
end;
$function$;


-- =========================================================
-- REMOVE LEGACY PROMOTION API / SETTINGS
-- Historical migrations remain immutable, but the effective schema is generic.
-- =========================================================

drop function if exists public.create_or_get_order_promo_coupon(uuid);
drop function if exists public.redeem_kong_coupons(text[], text);
drop function if exists public.redeem_lucky_dorian(text);

drop table if exists public.promo_settings;
drop function if exists public.set_promo_settings_updated_at();

-- =========================================================
-- RLS
-- =========================================================

alter table public.promotion_programs enable row level security;
alter table public.promotion_rewards enable row level security;

drop policy if exists "Authenticated users read promotion programs" on public.promotion_programs;
create policy "Authenticated users read promotion programs"
on public.promotion_programs for select to authenticated using (true);

drop policy if exists "Admins manage promotion programs" on public.promotion_programs;
create policy "Admins manage promotion programs"
on public.promotion_programs for all to authenticated
using (((select profiles.role from public.profiles where profiles.id = (select auth.uid())) = 'admin'::public.user_role))
with check (((select profiles.role from public.profiles where profiles.id = (select auth.uid())) = 'admin'::public.user_role));

drop policy if exists "Authenticated users read promotion rewards" on public.promotion_rewards;
create policy "Authenticated users read promotion rewards"
on public.promotion_rewards for select to authenticated using (true);

drop policy if exists "Admins manage promotion rewards" on public.promotion_rewards;
create policy "Admins manage promotion rewards"
on public.promotion_rewards for all to authenticated
using (((select profiles.role from public.profiles where profiles.id = (select auth.uid())) = 'admin'::public.user_role))
with check (((select profiles.role from public.profiles where profiles.id = (select auth.uid())) = 'admin'::public.user_role));

grant select, insert, update, delete on public.promotion_programs to authenticated;
grant select, insert, update, delete on public.promotion_rewards to authenticated;
grant execute on function public.create_or_get_order_promotion_coupon(uuid) to authenticated;
grant execute on function public.redeem_collect_promotion(uuid, text[], uuid) to authenticated;
grant execute on function public.redeem_order_refund_promotion(text) to authenticated;
