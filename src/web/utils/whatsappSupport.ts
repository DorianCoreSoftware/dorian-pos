export function buildWhatsAppSupportUrl(
  configuredValue:
    | string
    | null
    | undefined,
  message: string,
): string | null {
  const raw =
    configuredValue?.trim();

  if (!raw) {
    return null;
  }

  const phone =
    extractWhatsAppPhone(
      raw,
    );

  if (!phone) {
    return null;
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(
    message,
  )}`;
}

export function openWhatsAppSupport(
  configuredValue:
    | string
    | null
    | undefined,
  message: string,
): boolean {
  if (
    typeof window ===
    'undefined'
  ) {
    return false;
  }

  const url =
    buildWhatsAppSupportUrl(
      configuredValue,
      message,
    );

  if (!url) {
    return false;
  }

  window.open(
    url,
    '_blank',
    'noopener,noreferrer',
  );

  return true;
}

function extractWhatsAppPhone(
  value: string,
): string | null {
  try {
    if (
      /^https?:\/\//i.test(
        value,
      )
    ) {
      const url =
        new URL(
          value,
        );

      const host =
        url.hostname
          .toLocaleLowerCase();

      if (
        host === 'wa.me' ||
        host.endsWith(
          '.wa.me',
        )
      ) {
        const digits =
          url.pathname.replace(
            /\D/g,
            '',
          );

        return digits || null;
      }

      if (
        host.includes(
          'whatsapp.com',
        )
      ) {
        const queryPhone =
          url.searchParams.get(
            'phone',
          );

        const digits =
          queryPhone?.replace(
            /\D/g,
            '',
          ) ??
          '';

        return digits || null;
      }
    }
  } catch {
    // Si no es una URL válida, intentamos tratarlo como número.
  }

  const digits =
    value.replace(
      /\D/g,
      '',
    );

  return digits || null;
}
