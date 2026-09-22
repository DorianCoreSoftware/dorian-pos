import {
    serve,
} from 'https://deno.land/std@0.224.0/http/server.ts';

import {
    createClient,
} from 'https://esm.sh/@supabase/supabase-js@2';

interface VerifyRecoveryPayload {
    type?:
        | 'rewards_pin'
        | 'pos_password';

    identifier?: string;

    code?: string;
}

function getCorsHeaders() {
    return {
        'Access-Control-Allow-Origin':
            '*',

        'Access-Control-Allow-Headers':
            'authorization, x-client-info, apikey, content-type',

        'Access-Control-Allow-Methods':
            'POST, OPTIONS',
    };
}

function jsonResponse(
    body: unknown,
    status = 200,
): Response {
    return new Response(
        JSON.stringify(
            body,
        ),
        {
            status,

            headers: {
                ...getCorsHeaders(),

                'Content-Type':
                    'application/json',
            },
        },
    );
}

function normalizePhone(
    value: string,
): string {
    return value.replace(
        /\D/g,
        '',
    );
}

function normalizeIdentifier(
    value: string,
): string {
    return value
        .trim()
        .toLowerCase();
}

function bytesToHex(
    bytes: Uint8Array,
): string {
    return Array.from(
        bytes,
    )
        .map(
            byte =>
                byte
                    .toString(16)
                    .padStart(
                        2,
                        '0',
                    ),
        )
        .join('');
}

async function hashValue(
    value: string,
): Promise<string> {
    const encoded =
        new TextEncoder()
            .encode(
                value,
            );

    const digest =
        await crypto.subtle.digest(
            'SHA-256',
            encoded,
        );

    return bytesToHex(
        new Uint8Array(
            digest,
        ),
    );
}

function createCompletionToken(): string {
    const bytes =
        new Uint8Array(
            32,
        );

    crypto.getRandomValues(
        bytes,
    );

    return bytesToHex(
        bytes,
    );
}

async function resolveRewardsCustomerId(
    adminClient:
        ReturnType<
            typeof createClient
        >,

    identifier:
        string,
): Promise<string | null> {
    const phone =
        normalizePhone(
            identifier,
        );

    if (
        phone.length !==
        10
    ) {
        return null;
    }

    const {
        data,
        error,
    } =
        await adminClient
            .from(
                'loyalty_customers',
            )
            .select(`
                id,
                is_active
            `)
            .eq(
                'phone',
                phone,
            )
            .maybeSingle();

    if (
        error ||
        !data ||
        data.is_active === false
    ) {
        return null;
    }

    return data.id;
}

async function resolvePosUserId(
    adminClient:
        ReturnType<
            typeof createClient
        >,

    identifier:
        string,
): Promise<string | null> {
    const normalized =
        normalizeIdentifier(
            identifier,
        );

    if (!normalized) {
        return null;
    }

    if (
        normalized.includes(
            '@',
        )
    ) {
        const {
            data:
                authUsersData,
            error:
                authUsersError,
        } =
            await adminClient
                .auth
                .admin
                .listUsers({
                    page:
                        1,

                    perPage:
                        1000,
                });

        if (
            authUsersError
        ) {
            throw authUsersError;
        }

        const authUser =
            authUsersData.users.find(
                user =>
                    (
                        user.email ??
                        ''
                    )
                        .trim()
                        .toLowerCase() ===
                    normalized,
            );

        if (!authUser) {
            return null;
        }

        const {
            data:
                profile,
            error:
                profileError,
        } =
            await adminClient
                .from(
                    'profiles',
                )
                .select(`
                    id,
                    is_active
                `)
                .eq(
                    'id',
                    authUser.id,
                )
                .maybeSingle();

        if (
            profileError ||
            !profile ||
            profile.is_active === false
        ) {
            return null;
        }

        return authUser.id;
    }

    const {
        data:
            profile,
        error:
            profileError,
    } =
        await adminClient
            .from(
                'profiles',
            )
            .select(`
                id,
                is_active
            `)
            .ilike(
                'username',
                normalized,
            )
            .maybeSingle();

    if (
        profileError ||
        !profile ||
        profile.is_active === false
    ) {
        return null;
    }

    return profile.id;
}

serve(
    async request => {
        if (
            request.method ===
            'OPTIONS'
        ) {
            return new Response(
                'ok',
                {
                    headers:
                        getCorsHeaders(),
                },
            );
        }

        if (
            request.method !==
            'POST'
        ) {
            return jsonResponse(
                {
                    error:
                        'Método no permitido.',
                },
                405,
            );
        }

        try {
            const supabaseUrl =
                Deno.env.get(
                    'SUPABASE_URL',
                );

            const serviceRoleKey =
                Deno.env.get(
                    'SUPABASE_SERVICE_ROLE_KEY',
                );

            if (
                !supabaseUrl ||
                !serviceRoleKey
            ) {
                throw new Error(
                    'Faltan variables de entorno de Supabase.',
                );
            }

            const adminClient =
                createClient(
                    supabaseUrl,
                    serviceRoleKey,
                    {
                        auth: {
                            autoRefreshToken:
                                false,

                            persistSession:
                                false,
                        },
                    },
                );

            let payload:
                VerifyRecoveryPayload;

            try {
                payload =
                    await request.json();
            } catch {
                return jsonResponse(
                    {
                        success:
                            false,

                        error:
                            'Código inválido o expirado.',
                    },
                    400,
                );
            }

            const recoveryType =
                payload.type;

            const identifier =
                (
                    payload.identifier ??
                    ''
                ).trim();

            const code =
                (
                    payload.code ??
                    ''
                )
                    .trim()
                    .replace(
                        /\D/g,
                        '',
                    );

            if (
                recoveryType !==
                    'rewards_pin' &&
                recoveryType !==
                    'pos_password'
            ) {
                return jsonResponse(
                    {
                        success:
                            false,

                        error:
                            'Código inválido o expirado.',
                    },
                    400,
                );
            }

            if (
                !identifier ||
                !/^\d{6}$/.test(
                    code,
                )
            ) {
                return jsonResponse(
                    {
                        success:
                            false,

                        error:
                            'Código inválido o expirado.',
                    },
                    400,
                );
            }

            let subjectId:
                string | null =
                null;

            if (
                recoveryType ===
                'rewards_pin'
            ) {
                subjectId =
                    await resolveRewardsCustomerId(
                        adminClient,
                        identifier,
                    );
            } else {
                subjectId =
                    await resolvePosUserId(
                        adminClient,
                        identifier,
                    );
            }

            if (!subjectId) {
                return jsonResponse(
                    {
                        success:
                            false,

                        error:
                            'Código inválido o expirado.',
                    },
                    400,
                );
            }

            const {
                data:
                    recovery,
                error:
                    recoveryError,
            } =
                await adminClient
                    .from(
                        'account_recovery_codes',
                    )
                    .select(`
                        id,
                        code_hash,
                        expires_at,
                        attempt_count,
                        max_attempts,
                        verified_at,
                        used_at
                    `)
                    .eq(
                        'recovery_type',
                        recoveryType,
                    )
                    .eq(
                        'subject_id',
                        subjectId,
                    )
                    .is(
                        'used_at',
                        null,
                    )
                    .order(
                        'created_at',
                        {
                            ascending:
                                false,
                        },
                    )
                    .limit(
                        1,
                    )
                    .maybeSingle();

            if (
                recoveryError ||
                !recovery
            ) {
                return jsonResponse(
                    {
                        success:
                            false,

                        error:
                            'Código inválido o expirado.',
                    },
                    400,
                );
            }

            const now =
                new Date();

            const expiresAt =
                new Date(
                    recovery.expires_at,
                );

            if (
                expiresAt.getTime() <=
                now.getTime()
            ) {
                return jsonResponse(
                    {
                        success:
                            false,

                        error:
                            'El código ha expirado. Solicita uno nuevo.',
                    },
                    400,
                );
            }

            if (
                recovery.attempt_count >=
                recovery.max_attempts
            ) {
                return jsonResponse(
                    {
                        success:
                            false,

                        error:
                            'Se agotaron los intentos. Solicita un código nuevo.',
                    },
                    429,
                );
            }

            const submittedHash =
                await hashValue(
                    code,
                );

            if (
                submittedHash !==
                recovery.code_hash
            ) {
                const nextAttemptCount =
                    recovery.attempt_count +
                    1;

                const {
                    error:
                        updateAttemptError,
                } =
                    await adminClient
                        .from(
                            'account_recovery_codes',
                        )
                        .update({
                            attempt_count:
                                nextAttemptCount,
                        })
                        .eq(
                            'id',
                            recovery.id,
                        );

                if (
                    updateAttemptError
                ) {
                    throw updateAttemptError;
                }

                const remaining =
                    Math.max(
                        0,
                        recovery.max_attempts -
                        nextAttemptCount,
                    );

                return jsonResponse(
                    {
                        success:
                            false,

                        error:
                            remaining > 0
                                ? `Código incorrecto. Te quedan ${remaining} intentos.`
                                : 'Se agotaron los intentos. Solicita un código nuevo.',
                    },
                    400,
                );
            }

            const completionToken =
                createCompletionToken();

            const completionTokenHash =
                await hashValue(
                    completionToken,
                );

            const completionExpiresAt =
                new Date(
                    Date.now() +
                    10 *
                    60 *
                    1000,
                );

            const {
                error:
                    verifyError,
            } =
                await adminClient
                    .from(
                        'account_recovery_codes',
                    )
                    .update({
                        verified_at:
                            now.toISOString(),

                        completion_token_hash:
                            completionTokenHash,

                        completion_expires_at:
                            completionExpiresAt
                                .toISOString(),
                    })
                    .eq(
                        'id',
                        recovery.id,
                    );

            if (
                verifyError
            ) {
                throw verifyError;
            }

            return jsonResponse({
                success:
                    true,

                completionToken,

                expiresInSeconds:
                    600,
            });
        } catch (error) {
            console.error(
                'verify-account-recovery error:',
                error,
            );

            return jsonResponse(
                {
                    success:
                        false,

                    error:
                        'No se pudo verificar el código.',
                },
                500,
            );
        }
    },
);