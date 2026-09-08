/*
 * ============================================================
 * BUZÓN DE SUGERENCIAS / COMENTARIOS
 * ============================================================
 */

create table if not exists public.customer_feedback (
  id uuid primary key default gen_random_uuid(),

  feedback_type text not null
    check (
      feedback_type in (
        'suggestion',
        'complaint',
        'compliment',
        'other'
      )
    ),

  customer_name text,
  customer_phone text,

  message text not null,

  status text not null default 'new'
    check (
      status in (
        'new',
        'reviewed',
        'resolved'
      )
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint customer_feedback_name_length_check
  check (
    customer_name is null
    or length(trim(customer_name)) between 1 and 80
  ),

  constraint customer_feedback_phone_length_check
  check (
    customer_phone is null
    or length(trim(customer_phone)) between 7 and 25
  ),

  constraint customer_feedback_message_length_check
  check (
    length(trim(message)) between 5 and 500
  )
);

create index if not exists
  customer_feedback_status_created_at_idx
on public.customer_feedback (
  status,
  created_at desc
);

alter table public.customer_feedback
enable row level security;


/*
 * El cliente web NO puede leer directamente la tabla.
 * Solo usuarios autenticados del POS.
 */

drop policy if exists
  "authenticated can read customer feedback"
on public.customer_feedback;

create policy
  "authenticated can read customer feedback"
on public.customer_feedback
for select
to authenticated
using (true);


drop policy if exists
  "authenticated can update customer feedback"
on public.customer_feedback;

create policy
  "authenticated can update customer feedback"
on public.customer_feedback
for update
to authenticated
using (true)
with check (true);


/*
 * RPC pública de inserción.
 *
 * Seguridad:
 * - el cliente no decide status
 * - no puede leer registros
 * - se limpian espacios
 * - se validan longitudes
 */

create or replace function public.submit_customer_feedback(
  p_feedback_type text,
  p_message text,
  p_customer_name text default null,
  p_customer_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text;
  v_message text;
  v_name text;
  v_phone text;
  v_id uuid;
begin
  v_type :=
    lower(
      trim(
        coalesce(
          p_feedback_type,
          ''
        )
      )
    );

  if
    v_type not in (
      'suggestion',
      'complaint',
      'compliment',
      'other'
    )
  then
    raise exception
      'Tipo de comentario inválido.';
  end if;

  v_message :=
    trim(
      coalesce(
        p_message,
        ''
      )
    );

  if
    length(v_message) <
    5
  then
    raise exception
      'Escribe un mensaje de al menos 5 caracteres.';
  end if;

  if
    length(v_message) >
    500
  then
    raise exception
      'El mensaje no puede superar 500 caracteres.';
  end if;

  v_name :=
    nullif(
      trim(
        coalesce(
          p_customer_name,
          ''
        )
      ),
      ''
    );

  if
    v_name is not null
    and length(v_name) >
      80
  then
    raise exception
      'El nombre no puede superar 80 caracteres.';
  end if;

  v_phone :=
    nullif(
      trim(
        coalesce(
          p_customer_phone,
          ''
        )
      ),
      ''
    );

  if
    v_phone is not null
    and (
      length(v_phone) <
        7
      or
      length(v_phone) >
        25
    )
  then
    raise exception
      'El teléfono no es válido.';
  end if;

  insert into public.customer_feedback (
    feedback_type,
    customer_name,
    customer_phone,
    message,
    status
  )
  values (
    v_type,
    v_name,
    v_phone,
    v_message,
    'new'
  )
  returning id
  into v_id;

  return v_id;
end;
$$;

revoke all
on function public.submit_customer_feedback(
  text,
  text,
  text,
  text
)
from public;

grant execute
on function public.submit_customer_feedback(
  text,
  text,
  text,
  text
)
to anon, authenticated;
