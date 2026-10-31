/*
 * ============================================================
 * TRANSFERENCIAS + DATOS BANCARIOS
 * - Cuenta bancaria pública del negocio mediante RPC segura.
 * - Datos bancarios privados de empleados para nómina.
 * - Transferencia como método real de cobro POS.
 * - Intención de pago para pedidos web (sin marcar como pagado).
 * ============================================================
 */

create table if not exists public.business_transfer_settings (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default false,
  bank_name text,
  account_holder text,
  clabe text,
  account_number text,
  instructions text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.business_transfer_settings enable row level security;

insert into public.business_transfer_settings (id, enabled)
values (1, false)
on conflict (id) do nothing;

alter table public.business_transfer_settings
  drop constraint if exists business_transfer_settings_clabe_check;
alter table public.business_transfer_settings
  add constraint business_transfer_settings_clabe_check
  check (clabe is null or clabe ~ '^[0-9]{18}$');

alter table public.business_transfer_settings
  drop constraint if exists business_transfer_settings_account_number_check;
alter table public.business_transfer_settings
  add constraint business_transfer_settings_account_number_check
  check (account_number is null or account_number ~ '^[0-9]{4,20}$');

create table if not exists public.employee_bank_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  bank_name text,
  account_holder text,
  clabe text,
  account_number text,
  notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.employee_bank_accounts enable row level security;

alter table public.employee_bank_accounts
  drop constraint if exists employee_bank_accounts_clabe_check;
alter table public.employee_bank_accounts
  add constraint employee_bank_accounts_clabe_check
  check (clabe is null or clabe ~ '^[0-9]{18}$');

alter table public.employee_bank_accounts
  drop constraint if exists employee_bank_accounts_account_number_check;
alter table public.employee_bank_accounts
  add constraint employee_bank_accounts_account_number_check
  check (account_number is null or account_number ~ '^[0-9]{4,20}$');

-- El cliente web puede elegir cómo pretende pagar. Esto NO significa que ya pagó.
alter table public.orders
  add column if not exists requested_payment_method text;

alter table public.orders
  drop constraint if exists orders_requested_payment_method_check;
alter table public.orders
  add constraint orders_requested_payment_method_check
  check (requested_payment_method is null or requested_payment_method in ('cash','card','transfer'));

-- Referencia/folio del pago real en POS.
alter table public.order_payments
  add column if not exists payment_reference text;

alter table public.order_payments
  drop constraint if exists order_payments_payment_method_check;
alter table public.order_payments
  add constraint order_payments_payment_method_check
  check (payment_method in ('cash','card','transfer'));

alter table public.order_payments
  drop constraint if exists order_payments_cash_values_check;
alter table public.order_payments
  add constraint order_payments_cash_values_check
  check (
    (
      payment_method = 'cash'
      and amount_received is not null
      and change_amount is not null
      and amount_received >= total_amount
    )
    or
    (
      payment_method in ('card','transfer')
      and amount_received is null
      and change_amount is null
    )
  );

alter table public.order_payments
  drop constraint if exists order_payments_transfer_reference_check;
alter table public.order_payments
  add constraint order_payments_transfer_reference_check
  check (
    payment_method <> 'transfer'
    or length(trim(coalesce(payment_reference, ''))) >= 3
  );

create or replace function public.admin_get_business_transfer_settings()
returns table (
  enabled boolean,
  bank_name text,
  account_holder text,
  clabe text,
  account_number text,
  instructions text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_profile public.profiles%rowtype;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.id is null or v_profile.role::text <> 'admin' or not coalesce(v_profile.is_active,false) then
    raise exception 'Solo un administrador activo puede configurar los datos de transferencia del negocio.';
  end if;

  return query
  select
    s.enabled,
    s.bank_name,
    s.account_holder,
    s.clabe,
    s.account_number,
    s.instructions,
    s.updated_at
  from public.business_transfer_settings s
  where s.id = 1;
end;
$$;

revoke all on function public.admin_get_business_transfer_settings() from public;
grant execute on function public.admin_get_business_transfer_settings() to authenticated;

create or replace function public.admin_save_business_transfer_settings(
  p_enabled boolean,
  p_bank_name text,
  p_account_holder text,
  p_clabe text,
  p_account_number text,
  p_instructions text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_bank text := nullif(left(trim(coalesce(p_bank_name,'')),80),'');
  v_holder text := nullif(left(trim(coalesce(p_account_holder,'')),120),'');
  v_clabe text := nullif(regexp_replace(coalesce(p_clabe,''),'[^0-9]','','g'),'');
  v_account text := nullif(regexp_replace(coalesce(p_account_number,''),'[^0-9]','','g'),'');
  v_instructions text := nullif(left(trim(coalesce(p_instructions,'')),500),'');
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.id is null or v_profile.role::text <> 'admin' or not coalesce(v_profile.is_active,false) then
    raise exception 'Solo un administrador activo puede configurar los datos de transferencia del negocio.';
  end if;

  if coalesce(p_enabled,false) then
    if v_bank is null then raise exception 'Indica el banco.'; end if;
    if v_holder is null then raise exception 'Indica el titular de la cuenta.'; end if;
    if v_clabe is null or length(v_clabe) <> 18 then raise exception 'La CLABE debe contener exactamente 18 dígitos.'; end if;
  end if;

  if v_clabe is not null and length(v_clabe) <> 18 then
    raise exception 'La CLABE debe contener exactamente 18 dígitos.';
  end if;

  insert into public.business_transfer_settings(
    id,enabled,bank_name,account_holder,clabe,account_number,instructions,updated_at,updated_by
  ) values (
    1,coalesce(p_enabled,false),v_bank,v_holder,v_clabe,v_account,v_instructions,now(),auth.uid()
  )
  on conflict (id) do update set
    enabled = excluded.enabled,
    bank_name = excluded.bank_name,
    account_holder = excluded.account_holder,
    clabe = excluded.clabe,
    account_number = excluded.account_number,
    instructions = excluded.instructions,
    updated_at = now(),
    updated_by = auth.uid();
end;
$$;

revoke all on function public.admin_save_business_transfer_settings(boolean,text,text,text,text,text) from public;
grant execute on function public.admin_save_business_transfer_settings(boolean,text,text,text,text,text) to authenticated;

-- Información deliberadamente pública SOLO cuando transferencia está activa.
create or replace function public.get_public_business_transfer_settings()
returns table (
  enabled boolean,
  bank_name text,
  account_holder text,
  clabe text,
  account_number text,
  instructions text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    s.enabled,
    case when s.enabled then s.bank_name else null end,
    case when s.enabled then s.account_holder else null end,
    case when s.enabled then s.clabe else null end,
    case when s.enabled then s.account_number else null end,
    case when s.enabled then s.instructions else null end
  from public.business_transfer_settings s
  where s.id = 1;
$$;

revoke all on function public.get_public_business_transfer_settings() from public;
grant execute on function public.get_public_business_transfer_settings() to anon, authenticated;

create or replace function public.payroll_get_employee_bank_accounts()
returns table (
  user_id uuid,
  employee_name text,
  employee_role text,
  bank_name text,
  account_holder text,
  clabe text,
  account_number text,
  notes text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  perform public.attendance_assert_payroll_manager();

  return query
  select
    p.id,
    trim(concat_ws(' ',p.first_name,p.last_name)),
    p.role::text,
    e.bank_name,
    e.account_holder,
    e.clabe,
    e.account_number,
    e.notes,
    e.updated_at
  from public.profiles p
  left join public.employee_bank_accounts e on e.user_id = p.id
  where coalesce(p.is_active,false)
  order by trim(concat_ws(' ',p.first_name,p.last_name));
end;
$$;

revoke all on function public.payroll_get_employee_bank_accounts() from public;
grant execute on function public.payroll_get_employee_bank_accounts() to authenticated;

create or replace function public.payroll_save_employee_bank_account(
  p_user_id uuid,
  p_bank_name text,
  p_account_holder text,
  p_clabe text,
  p_account_number text,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bank text := nullif(left(trim(coalesce(p_bank_name,'')),80),'');
  v_holder text := nullif(left(trim(coalesce(p_account_holder,'')),120),'');
  v_clabe text := nullif(regexp_replace(coalesce(p_clabe,''),'[^0-9]','','g'),'');
  v_account text := nullif(regexp_replace(coalesce(p_account_number,''),'[^0-9]','','g'),'');
  v_notes text := nullif(left(trim(coalesce(p_notes,'')),300),'');
begin
  perform public.attendance_assert_payroll_manager();

  if not exists (select 1 from public.profiles p where p.id = p_user_id and coalesce(p.is_active,false)) then
    raise exception 'No se encontró el empleado activo.';
  end if;

  if v_bank is not null or v_holder is not null or v_clabe is not null or v_account is not null then
    if v_bank is null then raise exception 'Indica el banco del empleado.'; end if;
    if v_holder is null then raise exception 'Indica el titular de la cuenta.'; end if;
    if v_clabe is null or length(v_clabe) <> 18 then
      raise exception 'La CLABE debe contener exactamente 18 dígitos.';
    end if;
  end if;

  insert into public.employee_bank_accounts(
    user_id,bank_name,account_holder,clabe,account_number,notes,updated_at,updated_by
  ) values (
    p_user_id,v_bank,v_holder,v_clabe,v_account,v_notes,now(),auth.uid()
  )
  on conflict (user_id) do update set
    bank_name = excluded.bank_name,
    account_holder = excluded.account_holder,
    clabe = excluded.clabe,
    account_number = excluded.account_number,
    notes = excluded.notes,
    updated_at = now(),
    updated_by = auth.uid();
end;
$$;

revoke all on function public.payroll_save_employee_bank_account(uuid,text,text,text,text,text) from public;
grant execute on function public.payroll_save_employee_bank_account(uuid,text,text,text,text,text) to authenticated;

-- Solo permite asociar la intención a la orden web creada por el mismo request id.
create or replace function public.set_web_order_payment_intent(
  p_order_id uuid,
  p_client_request_id uuid,
  p_payment_method text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_payment_method not in ('cash','transfer') then
    raise exception 'Método de pago web inválido.';
  end if;

  if p_payment_method = 'transfer' and not exists (
    select 1 from public.business_transfer_settings s where s.id = 1 and s.enabled
  ) then
    raise exception 'Las transferencias no están habilitadas por el negocio.';
  end if;

  update public.orders o
  set requested_payment_method = p_payment_method
  where o.id = p_order_id
    and o.client_request_id = p_client_request_id
    and o.order_source = 'web';

  if not found then
    raise exception 'No se pudo asociar el método de pago al pedido web.';
  end if;
end;
$$;

revoke all on function public.set_web_order_payment_intent(uuid,uuid,text) from public;
grant execute on function public.set_web_order_payment_intent(uuid,uuid,text) to anon, authenticated;

comment on table public.business_transfer_settings is 'Datos bancarios públicos del negocio para recibir transferencias; escritura solo mediante RPC admin.';
comment on table public.employee_bank_accounts is 'Datos bancarios privados de empleados para pagos de nómina; acceso mediante RPC admin/accountant.';
comment on column public.orders.requested_payment_method is 'Intención de pago elegida por el cliente; no equivale a pago confirmado.';
