-- ============================================================
-- DORIAN POS
-- Validación estricta del buzón / sugerencias web
-- ============================================================

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
  v_type := lower(trim(coalesce(p_feedback_type, '')));

  if v_type not in ('suggestion', 'complaint', 'compliment', 'other') then
    raise exception 'Tipo de comentario inválido.';
  end if;

  v_message := trim(coalesce(p_message, ''));

  if length(v_message) < 5 then
    raise exception 'Escribe un mensaje de al menos 5 caracteres.';
  end if;

  if length(v_message) > 500 then
    raise exception 'El mensaje no puede superar 500 caracteres.';
  end if;

  v_name := nullif(trim(coalesce(p_customer_name, '')), '');

  if v_name is not null and length(v_name) > 80 then
    raise exception 'El nombre no puede superar 80 caracteres.';
  end if;

  v_phone := nullif(
    regexp_replace(
      coalesce(p_customer_phone, ''),
      '\D',
      '',
      'g'
    ),
    ''
  );

  if v_phone is not null and length(v_phone) <> 10 then
    raise exception 'El teléfono debe tener exactamente 10 dígitos.';
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
  returning id into v_id;

  return v_id;
end;
$$;

revoke all
on function public.submit_customer_feedback(text, text, text, text)
from public;

grant execute
on function public.submit_customer_feedback(text, text, text, text)
to anon, authenticated;
