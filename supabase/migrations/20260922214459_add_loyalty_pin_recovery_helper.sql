create or replace function public.set_loyalty_customer_pin(
    p_customer_id uuid,
    p_pin text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
    if p_customer_id is null then
        raise exception
            'Cliente inválido';
    end if;

    if coalesce(
        p_pin,
        ''
    ) !~ '^[0-9]{6}$' then
        raise exception
            'El PIN debe tener 6 dígitos';
    end if;

    update public.loyalty_customers
    set
        pin_hash =
            extensions.crypt(
                p_pin,
                extensions.gen_salt(
                    'bf'
                )
            ),

        failed_login_attempts =
            0,

        locked_until =
            null,

        updated_at =
            now()

    where id =
        p_customer_id
      and is_active =
        true;

    if not found then
        raise exception
            'Cliente inválido';
    end if;
end;
$$;


revoke all
on function public.set_loyalty_customer_pin(
    uuid,
    text
)
from public;

revoke all
on function public.set_loyalty_customer_pin(
    uuid,
    text
)
from anon;

revoke all
on function public.set_loyalty_customer_pin(
    uuid,
    text
)
from authenticated;