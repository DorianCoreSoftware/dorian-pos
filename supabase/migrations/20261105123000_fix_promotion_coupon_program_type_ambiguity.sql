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
    from public.orders as o
    where o.id = p_order_id
  ) then
    raise exception 'La orden no existe.';
  end if;

  select pc.*
  into v_existing
  from public.promo_coupons as pc
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
    from public.promotion_programs as p
    where p.id = v_existing.program_id;

    return;
  end if;

  for v_program in
    select program.*
    from public.promotion_programs as program
    where program.program_type in ('collect_reward', 'order_refund')
      and public.is_promotion_program_active(
        program.id,
        current_date
      )
    order by
      program.priority asc,
      program.created_at asc
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
      from public.promo_coupons as pc
      where pc.code = v_code
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
