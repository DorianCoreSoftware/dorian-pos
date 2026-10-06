import {
  supabase,
} from './supabase';

export type AccountRecoveryType =
  | 'rewards_pin'
  | 'pos_password';

interface RecoveryBasePayload {
  type: AccountRecoveryType;
  identifier: string;
}

interface RequestRecoveryResponse {
  success?: boolean;
  message?: string;
  error?: string;
}

interface VerifyRecoveryResponse {
  success?: boolean;
  completionToken?: string;
  expiresInSeconds?: number;
  error?: string;
}

interface CompleteRecoveryResponse {
  success?: boolean;
  message?: string;
  error?: string;
}

async function getFunctionErrorMessage(
  error: unknown,
  fallback: string,
): Promise<string> {
  if (
    error &&
    typeof error === 'object' &&
    'context' in error
  ) {
    try {
      const context =
        (error as {
          context?: Response;
        }).context;

      if (context) {
        const body =
          await context.clone().json() as {
            error?: string;
            message?: string;
          };

        return body.error ||
          body.message ||
          fallback;
      }
    } catch {
      // Ignoramos errores al leer el body y usamos el fallback.
    }
  }

  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return fallback;
}

export async function requestAccountRecovery(
  type: AccountRecoveryType,
  identifier: string,
): Promise<string> {
  const cleanIdentifier =
    identifier.trim();

  if (!cleanIdentifier) {
    throw new Error(
      type === 'rewards_pin'
        ? 'Ingresa el teléfono de tu cuenta Rewards.'
        : 'Ingresa tu correo o usuario.',
    );
  }

  const {
    data,
    error,
  } = await supabase.functions.invoke<RequestRecoveryResponse>(
    'request-account-recovery',
    {
      body: {
        type,
        identifier:
          cleanIdentifier,
      } satisfies RecoveryBasePayload,
    },
  );

  if (error) {
    throw new Error(
      await getFunctionErrorMessage(
        error,
        'No se pudo solicitar la recuperación.',
      ),
    );
  }

  return data?.message ??
    'Si encontramos una cuenta asociada, enviaremos un código de recuperación al correo registrado.';
}

export async function verifyAccountRecovery(
  type: AccountRecoveryType,
  identifier: string,
  code: string,
): Promise<string> {
  const cleanCode =
    code.replace(/\D/g, '');

  if (!/^\d{6}$/.test(cleanCode)) {
    throw new Error(
      'Ingresa el código de 6 dígitos que recibiste por correo.',
    );
  }

  const {
    data,
    error,
  } = await supabase.functions.invoke<VerifyRecoveryResponse>(
    'verify-account-recovery',
    {
      body: {
        type,
        identifier:
          identifier.trim(),
        code:
          cleanCode,
      },
    },
  );

  if (error) {
    throw new Error(
      await getFunctionErrorMessage(
        error,
        'No se pudo verificar el código.',
      ),
    );
  }

  if (
    !data?.success ||
    !data.completionToken
  ) {
    throw new Error(
      data?.error ??
      'El código no es válido o ya expiró.',
    );
  }

  return data.completionToken;
}

export async function completeAccountRecovery(
  type: AccountRecoveryType,
  identifier: string,
  completionToken: string,
  newSecret: string,
): Promise<string> {
  const cleanSecret =
    newSecret.trim();

  if (
    type === 'rewards_pin' &&
    !/^\d{6}$/.test(cleanSecret)
  ) {
    throw new Error(
      'El nuevo PIN debe tener exactamente 6 dígitos.',
    );
  }

  if (
    type === 'pos_password' &&
    cleanSecret.length < 8
  ) {
    throw new Error(
      'La nueva contraseña debe tener al menos 8 caracteres.',
    );
  }

  const {
    data,
    error,
  } = await supabase.functions.invoke<CompleteRecoveryResponse>(
    'complete-account-recovery',
    {
      body: {
        type,
        identifier:
          identifier.trim(),
        completionToken,
        newSecret:
          cleanSecret,
      },
    },
  );

  if (error) {
    throw new Error(
      await getFunctionErrorMessage(
        error,
        'No se pudo completar la recuperación.',
      ),
    );
  }

  if (!data?.success) {
    throw new Error(
      data?.error ??
      'No se pudo completar la recuperación.',
    );
  }

  return data.message ??
    'Tus credenciales fueron actualizadas correctamente.';
}
