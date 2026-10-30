-- ============================================================
-- DORIAN POS
-- MARKETING HOTFIX
-- Corrige referencias ambiguas de tracking_code / tracking_token
-- en save_marketing_campaign_tracking_identifiers_admin
-- ============================================================

create or replace function public.save_marketing_campaign_tracking_identifiers_admin(
  p_campaign_id uuid,
  p_tracking_enabled boolean,
  p_tracking_code text
)
returns table(
  tracking_code text,
  tracking_token text,
  tracking_enabled boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text;
  v_token text;
begin
  perform public.require_marketing_admin();

  if not exists (
    select 1
    from public.marketing_campaigns mc
    where mc.id = p_campaign_id
  ) then
    raise exception
      'Campaña no encontrada.';
  end if;

  v_code :=
    nullif(
      upper(
        regexp_replace(
          btrim(
            coalesce(
              p_tracking_code,
              ''
            )
          ),
          '[^A-Za-z0-9_-]',
          '',
          'g'
        )
      ),
      ''
    );

  if coalesce(
    p_tracking_enabled,
    false
  ) and v_code is null then
    raise exception
      'Debes indicar un código de seguimiento.';
  end if;

  select mc.tracking_token
  into v_token
  from public.marketing_campaigns mc
  where mc.id =
    p_campaign_id;

  if v_token is null then
    v_token :=
      replace(
        gen_random_uuid()::text,
        '-',
        ''
      );
  end if;

  update public.marketing_campaigns as mc
  set
    tracking_enabled =
      coalesce(
        p_tracking_enabled,
        false
      ),
    tracking_code =
      case
        when coalesce(
          p_tracking_enabled,
          false
        )
        then v_code
        else mc.tracking_code
      end,
    tracking_token =
      v_token,
    updated_at =
      now()
  where mc.id =
    p_campaign_id;

  return query
  select
    mc.tracking_code,
    mc.tracking_token,
    mc.tracking_enabled
  from public.marketing_campaigns mc
  where mc.id =
    p_campaign_id;
end;
$$;

revoke all
on function public.save_marketing_campaign_tracking_identifiers_admin(
  uuid,
  boolean,
  text
)
from public;

grant execute
on function public.save_marketing_campaign_tracking_identifiers_admin(
  uuid,
  boolean,
  text
)
to authenticated;
