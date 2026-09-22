-- ============================================================
-- BURGER KONG
-- RECUPERACIÓN DE CUENTAS
--
-- Tipos:
--   rewards_pin
--   pos_password
--
-- Esta tabla NO debe ser accesible directamente
-- desde anon/authenticated.
-- Las Edge Functions accederán usando service_role.
-- ============================================================


-- ============================================================
-- 1. TABLA
-- ============================================================

create table if not exists public.account_recovery_codes (
    id uuid
        primary key
        default gen_random_uuid(),

    recovery_type text
        not null,

    subject_id uuid
        not null,

    email text
        not null,

    code_hash text
        not null,

    expires_at timestamptz
        not null,

    verified_at timestamptz
        null,

    used_at timestamptz
        null,

    attempt_count integer
        not null
        default 0,

    max_attempts integer
        not null
        default 5,

    completion_token_hash text
        null,

    completion_expires_at timestamptz
        null,

    created_at timestamptz
        not null
        default now(),

    constraint account_recovery_codes_type_check
        check (
            recovery_type in (
                'rewards_pin',
                'pos_password'
            )
        ),

    constraint account_recovery_codes_attempt_count_check
        check (
            attempt_count >= 0
        ),

    constraint account_recovery_codes_max_attempts_check
        check (
            max_attempts > 0
        )
);


-- ============================================================
-- 2. ÍNDICES
-- ============================================================

create index if not exists
account_recovery_codes_subject_idx
on public.account_recovery_codes (
    recovery_type,
    subject_id,
    created_at desc
);


create index if not exists
account_recovery_codes_email_idx
on public.account_recovery_codes (
    lower(email),
    created_at desc
);


create index if not exists
account_recovery_codes_expires_idx
on public.account_recovery_codes (
    expires_at
);


create index if not exists
account_recovery_codes_unused_idx
on public.account_recovery_codes (
    recovery_type,
    subject_id,
    expires_at
)
where used_at is null;


-- ============================================================
-- 3. RLS
-- ============================================================

alter table public.account_recovery_codes
enable row level security;


-- Nadie desde el cliente puede consultar,
-- insertar, modificar o borrar recuperaciones.

revoke all
on table public.account_recovery_codes
from anon;

revoke all
on table public.account_recovery_codes
from authenticated;


-- ============================================================
-- 4. FUNCIÓN DE LIMPIEZA
--
-- Borra solicitudes viejas.
-- La podremos llamar manualmente o luego programarla.
-- ============================================================

create or replace function public.cleanup_account_recovery_codes()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    v_deleted integer;
begin
    delete from public.account_recovery_codes
    where created_at <
        now() - interval '24 hours';

    get diagnostics
        v_deleted =
            row_count;

    return v_deleted;
end;
$$;


revoke all
on function public.cleanup_account_recovery_codes()
from public;

revoke all
on function public.cleanup_account_recovery_codes()
from anon;

revoke all
on function public.cleanup_account_recovery_codes()
from authenticated;


-- ============================================================
-- 5. COMENTARIOS
-- ============================================================

comment on table public.account_recovery_codes
is
'OTP temporales para recuperación de PIN Rewards y contraseña POS. Acceso exclusivo mediante backend/service_role.';


comment on column public.account_recovery_codes.subject_id
is
'ID del loyalty_customer o auth.users dependiendo de recovery_type.';


comment on column public.account_recovery_codes.code_hash
is
'Hash del código OTP. Nunca se almacena el código en texto plano.';


comment on column public.account_recovery_codes.completion_token_hash
is
'Hash del token temporal entregado después de verificar correctamente el OTP.';