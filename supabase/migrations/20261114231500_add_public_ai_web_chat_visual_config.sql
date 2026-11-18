-- ============================================================
-- DorianCore AI Orders - Phase 6 / Block 2 Hotfix 2
-- Public safe visual config for DORIAN Web
-- ============================================================

create or replace function
  public.get_public_ai_web_chat_config()
returns table (
  assistant_avatar_url text
)
language sql
stable
security definer
set search_path =
  public,
  pg_temp
as $$
  select
    nullif(
      trim(
        coalesce(
          s.assistant_avatar_url,
          ''
        )
      ),
      ''
    ) as
      assistant_avatar_url
  from
    public.ai_order_settings s
  where
    s.id =
      1
  limit
    1;
$$;

revoke all
on function
  public.get_public_ai_web_chat_config()
from public;

grant execute
on function
  public.get_public_ai_web_chat_config()
to
  anon,
  authenticated;

comment on function
  public.get_public_ai_web_chat_config()
is
  'Expone únicamente configuración visual segura del asistente web. No devuelve prompts, modelo ni parámetros internos.';
