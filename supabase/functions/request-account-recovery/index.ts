import {
    serve,
} from 'https://deno.land/std@0.224.0/http/server.ts';

import {
    createClient,
} from 'https://esm.sh/@supabase/supabase-js@2';

interface RequestRecoveryPayload {
    type?:
    | 'rewards_pin'
    | 'pos_password';

    identifier?: string;
}

interface RecoverySubject {
    id: string;
    email: string;
}

const GENERIC_SUCCESS_MESSAGE =
    'Si encontramos una cuenta asociada, enviaremos un código de recuperación al correo registrado.';

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

function genericSuccess(): Response {
    return jsonResponse({
        success:
            true,

        message:
            GENERIC_SUCCESS_MESSAGE,
    });
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

function generateOtpCode(): string {
    const array =
        new Uint32Array(
            1,
        );

    crypto.getRandomValues(
        array,
    );

    return String(
        array[0] %
        1000000,
    ).padStart(
        6,
        '0',
    );
}

function bytesToHex(
    bytes:
        Uint8Array,
): string {
    return Array.from(
        bytes,
    )
        .map(
            byte =>
                byte
                    .toString(
                        16,
                    )
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

async function resolveRewardsCustomer(
    adminClient:
        ReturnType<
            typeof createClient
        >,

    identifier:
        string,
): Promise<
    RecoverySubject | null
> {
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
                email,
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

    const email =
        typeof data.email ===
            'string'
            ? data.email
                .trim()
                .toLowerCase()
            : '';

    if (!email) {
        return null;
    }

    return {
        id:
            data.id,

        email,
    };
}

async function resolvePosUser(
    adminClient:
        ReturnType<
            typeof createClient
        >,

    identifier:
        string,
): Promise<
    RecoverySubject | null
> {
    const normalized =
        normalizeIdentifier(
            identifier,
        );

    if (!normalized) {
        return null;
    }

    let userId:
        string | null =
        null;

    let email =
        '';

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

        userId =
            authUser.id;

        email =
            (
                authUser.email ??
                ''
            )
                .trim()
                .toLowerCase();
    } else {
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
            profile.is_active ===
            false
        ) {
            return null;
        }

        const {
            data:
            authUserData,
            error:
            authUserError,
        } =
            await adminClient
                .auth
                .admin
                .getUserById(
                    profile.id,
                );

        if (
            authUserError ||
            !authUserData.user
        ) {
            return null;
        }

        userId =
            authUserData.user.id;

        email =
            (
                authUserData.user.email ??
                ''
            )
                .trim()
                .toLowerCase();
    }

    if (
        !userId ||
        !email
    ) {
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
                userId,
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

    return {
        id:
            userId,

        email,
    };
}

async function sendRecoveryEmail(
    email: string,
    code: string,
    recoveryType:
        | 'rewards_pin'
        | 'pos_password',
): Promise<void> {
    const resendApiKey =
        Deno.env.get(
            'RESEND_API_KEY',
        );

    if (!resendApiKey) {
        throw new Error(
            'RESEND_API_KEY no está configurada.',
        );
    }

    const isRewards =
        recoveryType ===
        'rewards_pin';

    const subject =
        isRewards
            ? 'Recupera tu PIN de Burger Kong Rewards'
            : 'Recupera tu contraseña de Burger Kong POS';

    const title =
        isRewards
            ? 'Recuperación de PIN'
            : 'Recuperación de contraseña';

    const description =
        isRewards
            ? 'Usa este código para crear un nuevo PIN de Burger Kong Rewards.'
            : 'Usa este código para crear una nueva contraseña de Burger Kong POS.';

    const response =
        await fetch(
            'https://api.resend.com/emails',
            {
                method:
                    'POST',

                headers: {
                    Authorization:
                        `Bearer ${resendApiKey}`,

                    'Content-Type':
                        'application/json',
                },

                body:
                    JSON.stringify({
                        from:
                            'Burger Kong <onboarding@resend.dev>',

                        to: [
                            email,
                        ],

                        subject,

                        html: `
                            <div
                                style="
                                    font-family: Arial, sans-serif;
                                    background: #f5f5f5;
                                    padding: 32px 16px;
                                "
                            >
                                <div
                                    style="
                                        max-width: 520px;
                                        margin: 0 auto;
                                        background: #ffffff;
                                        border-radius: 14px;
                                        overflow: hidden;
                                        border: 1px solid #e5e5e5;
                                    "
                                >
                                    <div
                                        style="
                                            background: #FFB000;
                                            padding: 24px;
                                            text-align: center;
                                        "
                                    >
                                        <div
                                            style="
                                                font-size: 26px;
                                                font-weight: 900;
                                                color: #111111;
                                            "
                                        >
                                            BURGER KONG
                                        </div>
                                    </div>

                                    <div
                                        style="
                                            padding: 32px;
                                            text-align: center;
                                        "
                                    >
                                        <h2
                                            style="
                                                margin: 0 0 12px;
                                                color: #111111;
                                            "
                                        >
                                            ${title}
                                        </h2>

                                        <p
                                            style="
                                                color: #666666;
                                                line-height: 1.5;
                                                margin-bottom: 28px;
                                            "
                                        >
                                            ${description}
                                        </p>

                                        <div
                                            style="
                                                display: inline-block;
                                                background: #111111;
                                                color: #FFB000;
                                                font-size: 36px;
                                                font-weight: 900;
                                                letter-spacing: 8px;
                                                padding: 18px 24px;
                                                border-radius: 12px;
                                            "
                                        >
                                            ${code}
                                        </div>

                                        <p
                                            style="
                                                color: #777777;
                                                font-size: 14px;
                                                margin-top: 28px;
                                            "
                                        >
                                            Este código vence en 10 minutos.
                                        </p>

                                        <p
                                            style="
                                                color: #999999;
                                                font-size: 13px;
                                                margin-top: 20px;
                                            "
                                        >
                                            Si tú no solicitaste este cambio,
                                            puedes ignorar este correo.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        `,
                    }),
            },
        );

    const responseData =
        await response.json();

    if (!response.ok) {
        console.error(
            'Resend error:',
            responseData,
        );

        throw new Error(
            'No se pudo enviar el correo de recuperación.',
        );
    }

    console.log(
        'Correo de recuperación enviado:',
        responseData,
    );
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
                RequestRecoveryPayload;

            try {
                payload =
                    await request.json();
            } catch {
                return genericSuccess();
            }

            const recoveryType =
                payload.type;

            const identifier =
                (
                    payload.identifier ??
                    ''
                ).trim();

            if (
                recoveryType !==
                'rewards_pin' &&
                recoveryType !==
                'pos_password'
            ) {
                return genericSuccess();
            }

            if (!identifier) {
                return genericSuccess();
            }

            let subject:
                RecoverySubject | null =
                null;

            if (
                recoveryType ===
                'rewards_pin'
            ) {
                subject =
                    await resolveRewardsCustomer(
                        adminClient,
                        identifier,
                    );
            } else {
                subject =
                    await resolvePosUser(
                        adminClient,
                        identifier,
                    );
            }

            /**
             * Siempre regresamos la misma respuesta pública.
             * Así no confirmamos si la cuenta existe.
             */
            if (!subject) {
                return genericSuccess();
            }

            /**
             * Rate limit simple:
             * máximo una solicitud cada 60 segundos
             * para la misma cuenta.
             */
            const {
                data:
                recentRecovery,
                error:
                recentRecoveryError,
            } =
                await adminClient
                    .from(
                        'account_recovery_codes',
                    )
                    .select(`
                        id,
                        created_at
                    `)
                    .eq(
                        'recovery_type',
                        recoveryType,
                    )
                    .eq(
                        'subject_id',
                        subject.id,
                    )
                    .gte(
                        'created_at',
                        new Date(
                            Date.now() -
                            60_000,
                        ).toISOString(),
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
                recentRecoveryError
            ) {
                throw recentRecoveryError;
            }

            if (
                recentRecovery
            ) {
                return genericSuccess();
            }

            /**
             * Invalidamos recuperaciones anteriores
             * que todavía no hayan sido utilizadas.
             */
            const {
                error:
                invalidateError,
            } =
                await adminClient
                    .from(
                        'account_recovery_codes',
                    )
                    .update({
                        used_at:
                            new Date()
                                .toISOString(),
                    })
                    .eq(
                        'recovery_type',
                        recoveryType,
                    )
                    .eq(
                        'subject_id',
                        subject.id,
                    )
                    .is(
                        'used_at',
                        null,
                    );

            if (
                invalidateError
            ) {
                throw invalidateError;
            }

            const code =
                generateOtpCode();

            const codeHash =
                await hashValue(
                    code,
                );

            const expiresAt =
                new Date(
                    Date.now() +
                    10 *
                    60 *
                    1000,
                );

            const {
                error:
                insertError,
            } =
                await adminClient
                    .from(
                        'account_recovery_codes',
                    )
                    .insert({
                        recovery_type:
                            recoveryType,

                        subject_id:
                            subject.id,

                        email:
                            subject.email,

                        code_hash:
                            codeHash,

                        expires_at:
                            expiresAt
                                .toISOString(),

                        attempt_count:
                            0,

                        max_attempts:
                            5,
                    });

            if (
                insertError
            ) {
                throw insertError;
            }

            try {
                await sendRecoveryEmail(
                    subject.email,
                    code,
                    recoveryType,
                );
            } catch (error) {
                console.error(
                    'Error enviando correo de recuperación:',
                    error,
                );

                // Invalidamos este OTP porque nunca llegó
                // correctamente al usuario.
                const {
                    error:
                    invalidateFailedEmailError,
                } =
                    await adminClient
                        .from(
                            'account_recovery_codes',
                        )
                        .update({
                            used_at:
                                new Date()
                                    .toISOString(),
                        })
                        .eq(
                            'recovery_type',
                            recoveryType,
                        )
                        .eq(
                            'subject_id',
                            subject.id,
                        )
                        .eq(
                            'code_hash',
                            codeHash,
                        )
                        .is(
                            'used_at',
                            null,
                        );

                if (
                    invalidateFailedEmailError
                ) {
                    console.error(
                        'Error invalidando OTP cuyo correo falló:',
                        invalidateFailedEmailError,
                    );
                }

                return genericSuccess();
            }

            return genericSuccess();
        } catch (error) {
            console.error(
                'request-account-recovery error:',
                error,
            );

            /**
             * Incluso ante errores internos evitamos
             * revelar datos de la cuenta.
             */
            return genericSuccess();
        }
    },
);