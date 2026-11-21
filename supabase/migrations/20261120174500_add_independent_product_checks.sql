-- Independent Product Checks
create table if not exists public.product_check_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null, position integer not null default 0, is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.product_check_options (
  id uuid primary key default gen_random_uuid(), group_id uuid not null references public.product_check_groups(id) on delete cascade, name text not null, position integer not null default 0, is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.product_check_group_assignments (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade, group_id uuid not null references public.product_check_groups(id) on delete cascade, min_selections integer not null default 0, max_selections integer not null default 99, position integer not null default 0, is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(product_id,group_id), check(min_selections>=0), check(max_selections>=greatest(1,min_selections))
);
create table if not exists public.order_item_check_selections (
  id uuid primary key default gen_random_uuid(), order_item_id uuid not null references public.order_items(id) on delete cascade, group_id uuid not null, option_id uuid not null, group_name_applied text not null, option_name_applied text not null, created_at timestamptz not null default now()
);

alter table public.product_check_groups enable row level security;
alter table public.product_check_options enable row level security;
alter table public.product_check_group_assignments enable row level security;
alter table public.order_item_check_selections enable row level security;

drop policy if exists product_check_groups_public_read on public.product_check_groups;
create policy product_check_groups_public_read on public.product_check_groups for select to anon, authenticated using (is_active or auth.role()='authenticated');
drop policy if exists product_check_options_public_read on public.product_check_options;
create policy product_check_options_public_read on public.product_check_options for select to anon, authenticated using (is_active or auth.role()='authenticated');
drop policy if exists product_check_assignments_public_read on public.product_check_group_assignments;
create policy product_check_assignments_public_read on public.product_check_group_assignments for select to anon, authenticated using (is_active);
drop policy if exists product_check_groups_admin_write on public.product_check_groups;
create policy product_check_groups_admin_write on public.product_check_groups for all to authenticated using (true) with check (true);
drop policy if exists product_check_options_admin_write on public.product_check_options;
create policy product_check_options_admin_write on public.product_check_options for all to authenticated using (true) with check (true);
drop policy if exists product_check_assignments_admin_write on public.product_check_group_assignments;
create policy product_check_assignments_admin_write on public.product_check_group_assignments for all to authenticated using (true) with check (true);
drop policy if exists order_item_checks_read on public.order_item_check_selections;
create policy order_item_checks_read on public.order_item_check_selections for select to authenticated using (true);

create or replace function public.save_order_product_checks(p_order_id uuid, p_items jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare item jsonb; check_row jsonb; idx integer:=0; product_uuid uuid; occurrence integer; order_item_uuid uuid; g record; o record;
begin
  if p_items is null then return; end if;
  delete from public.order_item_check_selections where order_item_id in (select id from public.order_items where order_id=p_order_id);
  for item in select * from jsonb_array_elements(p_items) loop
    idx:=idx+1; product_uuid := (item->>'productId')::uuid;
    select count(*)+1 into occurrence from jsonb_array_elements(p_items) with ordinality x(value,ord) where ord < idx and (value->>'productId')::uuid=product_uuid;
    select id into order_item_uuid from (select id,row_number() over(order by created_at,id) rn from public.order_items where order_id=p_order_id and product_id=product_uuid) q where rn=occurrence;
    if order_item_uuid is null then continue; end if;
    for check_row in select * from jsonb_array_elements(coalesce(item->'checks','[]'::jsonb)) loop
      select * into g from public.product_check_groups where id=(check_row->>'groupId')::uuid and is_active=true;
      select * into o from public.product_check_options where id=(check_row->>'optionId')::uuid and group_id=g.id and is_active=true;
      if g.id is null or o.id is null then continue; end if;
      if not exists(select 1 from public.product_check_group_assignments a where a.product_id=product_uuid and a.group_id=g.id and a.is_active=true) then continue; end if;
      insert into public.order_item_check_selections(order_item_id,group_id,option_id,group_name_applied,option_name_applied) values(order_item_uuid,g.id,o.id,g.name,o.name);
    end loop;
  end loop;
end $$;
grant execute on function public.save_order_product_checks(uuid,jsonb) to anon,authenticated;

-- Retira el experimento anterior de checks dentro de modificadores.
alter table public.product_modifier_groups drop column if exists display_style;
