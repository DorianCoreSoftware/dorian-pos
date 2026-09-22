import {
    serve,
} from 'https://deno.land/std@0.224.0/http/server.ts';

import {
    createClient,
} from 'https://esm.sh/@supabase/supabase-js@2';

interface CompleteRecoveryPayload {
    type?:
        | 'rewards_pin'
        | 'pos_password';

    identifier?: string;

    completionToken?: string;

    newSecret?: string;
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
        data.is_active ===
            false
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
            profile.is_active ===
                false
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
                CompleteRecoveryPayload;

            try {
                payload =
                    await request.json();
            } catch {
                return jsonResponse(
                    {
                        success:
                            false,

                        error:
                            'Solicitud inválida.',
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

            const completionToken =
                (
                    payload.completionToken ??
                    ''
                ).trim();

            const newSecret =
                (
                    payload.newSecret ??
                    ''
                ).trim();

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
                            'Solicitud inválida.',
                    },
                    400,
                );
            }

            if (
                !identifier ||
                !completionToken ||
                !newSecret
            ) {
                return jsonResponse(
                    {
                        success:
                            false,

                        error:
                            'Faltan datos para completar la recuperación.',
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

                if (
                    !/^\d{6}$/.test(
                        newSecret,
                    )
                ) {
                    return jsonResponse(
                        {
                            success:
                                false,

                            error:
                                'El nuevo PIN debe tener 6 dígitos.',
                        },
                        400,
                    );
                }
            } else {
                subjectId =
                    await resolvePosUserId(
                        adminClient,
                        identifier,
                    );

                if (
                    newSecret.length <
                    8
                ) {
                    return jsonResponse(
                        {
                            success:
                                false,

                            error:
                                'La nueva contraseña debe tener al menos 8 caracteres.',
                        },
                        400,
                    );
                }
            }

            if (!subjectId) {
                return jsonResponse(
                    {
                        success:
                            false,

                        error:
                            'La recuperación no es válida.',
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
                        verified_at,
                        used_at,
                        completion_token_hash,
                        completion_expires_at
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
                            'La recuperación no es válida o ha expirado.',
                    },
                    400,
                );
            }

            if (
                !recovery.verified_at ||
                !recovery.completion_token_hash ||
                !recovery.completion_expires_at
            ) {
                return jsonResponse(
                    {
                        success:
                            false,

                        error:
                            'Primero debes verificar el código de recuperación.',
                    },
                    400,
                );
            }

            const completionExpiresAt =
                new Date(
                    recovery.completion_expires_at,
                );

            if (
                completionExpiresAt.getTime() <=
                Date.now()
            ) {
                return jsonResponse(
                    {
                        success:
                            false,

                        error:
                            'La recuperación ha expirado. Solicita un código nuevo.',
                    },
                    400,
                );
            }

            const submittedTokenHash =
                await hashValue(
                    completionToken,
                );

            if (
                submittedTokenHash !==
                recovery.completion_token_hash
            ) {
                return jsonResponse(
                    {
                        success:
                            false,

                        error:
                            'La recuperación no es válida.',
                    },
                    400,
                );
            }

            if (
                recoveryType ===
                'rewards_pin'
            ) {
                const {
                    error:
                        updatePinError,
                } =
                    await adminClient.rpc(
                        'set_loyalty_customer_pin',
                        {
                            p_customer_id:
                                subjectId,

                            p_pin:
                                newSecret,
                        },
                    );

                if (
                    updatePinError
                ) {
                    throw updatePinError;
                }
            } else {
                const {
                    error:
                        passwordError,
                } =
                    await adminClient
                        .auth
                        .admin
                        .updateUserById(
                            subjectId,
                            {
                                password:
                                    newSecret,
                            },
                        );

                if (
                    passwordError
                ) {
                    throw passwordError;
                }
            }

            const {
                error:
                    markUsedError,
            } =
                await adminClient
                    .from(
                        'account_recovery_codes',
                    )
                    .update({
                        used_at:
                            new Date()
                                .toISOString(),

                        completion_token_hash:
                            null,

                        completion_expires_at:
                            null,
                    })
                    .eq(
                        'id',
                        recovery.id,
                    )
                    .is(
                        'used_at',
                        null,
                    );

            if (
                markUsedError
            ) {
                throw markUsedError;
            }

            return jsonResponse({
                success:
                    true,

                message:
                    recoveryType ===
                    'rewards_pin'
                        ? 'Tu PIN fue actualizado correctamente.'
                        : 'Tu contraseña fue actualizada correctamente.',
            });
        } catch (error) {
            console.error(
                'complete-account-recovery error:',
                error,
            );

            return jsonResponse(
                {
                    success:
                        false,

                    error:
                        'No se pudo completar la recuperación.',
                },
                500,
            );
        }
    },
);