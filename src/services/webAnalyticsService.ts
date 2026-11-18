import {
  supabase,
} from './supabase';

const VISITOR_STORAGE_KEY =
  'dorian_web_visitor_id_v1';

const SESSION_STORAGE_KEY =
  'dorian_web_visit_session_id_v1';

function createUuid(): string {
  if (
    typeof crypto !==
      'undefined' &&
    typeof crypto.randomUUID ===
      'function'
  ) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    .replace(
      /[xy]/g,
      char => {
        const random =
          Math.floor(
            Math.random() * 16,
          );

        const value =
          char === 'x'
            ? random
            : (
                random &
                0x3
              ) |
              0x8;

        return value.toString(
          16,
        );
      },
    );
}

export function getOrCreateWebVisitorId():
string {
  if (
    typeof window ===
    'undefined'
  ) {
    return createUuid();
  }

  try {
    const current =
      window.localStorage
        .getItem(
          VISITOR_STORAGE_KEY,
        )
        ?.trim();

    if (current) {
      return current;
    }

    const created =
      createUuid();

    window.localStorage.setItem(
      VISITOR_STORAGE_KEY,
      created,
    );

    return created;
  } catch {
    return createUuid();
  }
}

function getOrCreateVisitSessionId():
string {
  if (
    typeof window ===
    'undefined'
  ) {
    return createUuid();
  }

  try {
    const current =
      window.sessionStorage
        .getItem(
          SESSION_STORAGE_KEY,
        )
        ?.trim();

    if (current) {
      return current;
    }

    const created =
      createUuid();

    window.sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      created,
    );

    return created;
  } catch {
    return createUuid();
  }
}

export async function trackWebVisit():
Promise<void> {
  if (
    typeof window ===
    'undefined'
  ) {
    return;
  }

  const sessionId =
    getOrCreateVisitSessionId();

  const visitorId =
    getOrCreateWebVisitorId();

  const {
    error,
  } =
    await supabase.rpc(
      'register_web_visit',
      {
        p_session_id:
          sessionId,
        p_visitor_id:
          visitorId,
        p_path:
          window.location.pathname
            .slice(
              0,
              300,
            ),
        p_referrer:
          document.referrer
            ?.slice(
              0,
              500,
            ) ||
          null,
      },
    );

  if (error) {
    console.warn(
      'No se pudo registrar la visita web:',
      error.message,
    );
  }
}

export interface WebVisitStats {
  today: number;
  last7Days: number;
  last30Days: number;
  total: number;
  uniqueToday: number;
  unique7Days: number;
  unique30Days: number;
  uniqueTotal: number;
}

function toNumber(
  value: unknown,
): number {
  const parsed =
    Number(
      value ??
      0,
    );

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0;
}

export async function getWebVisitStats():
Promise<WebVisitStats> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'get_web_visit_stats',
    );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  const row =
    (
      Array.isArray(
        data,
      )
        ? data[0]
        : data
    ) as
      | Record<
          string,
          unknown
        >
      | null
      | undefined;

  return {
    today:
      toNumber(
        row?.today,
      ),
    last7Days:
      toNumber(
        row?.last_7_days,
      ),
    last30Days:
      toNumber(
        row?.last_30_days,
      ),
    total:
      toNumber(
        row?.total,
      ),
    uniqueToday:
      toNumber(
        row?.unique_today,
      ),
    unique7Days:
      toNumber(
        row?.unique_7_days,
      ),
    unique30Days:
      toNumber(
        row?.unique_30_days,
      ),
    uniqueTotal:
      toNumber(
        row?.unique_total,
      ),
  };
}
