import React, {
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';

import QRCode from 'qrcode';

import {
    getWebLoyaltyStatus,
    loginWebLoyaltyCustomer,
    registerWebLoyaltyCustomer,
    WebLoyaltyStatus,
} from '../services/webLoyaltyService';

import {
    clearSavedWebLoyaltyToken,
    getSavedWebLoyaltyToken,
    saveWebLoyaltyToken,
} from '../utils/webLoyaltyStorage';

import {
    useBusiness,
} from '../../context/BusinessContext';

import {
    AccountRecoveryModal,
} from '../../components/account-recovery/AccountRecoveryModal';

import styles from './WebLoyaltyScreen.styles';

interface Props {
    onBack: () => void;
}

type AuthMode =
    | 'login'
    | 'register';

function loadHtmlImage(
    src: string,
): Promise<HTMLImageElement> {
    return new Promise(
        (
            resolve,
            reject,
        ) => {
            const image =
                new window.Image();

            image.crossOrigin =
                'anonymous';

            image.onload =
                () => {
                    resolve(
                        image,
                    );
                };

            image.onerror =
                () => {
                    reject(
                        new Error(
                            'No se pudo cargar la imagen.',
                        ),
                    );
                };

            image.src =
                src;
        },
    );
}

function getLoyaltyTokenFromPath():
    string | null {
    if (
        typeof window ===
        'undefined'
    ) {
        return null;
    }

    const match =
        window.location.pathname.match(
            /^\/recompensas\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/?$/i,
        );

    return match?.[1] ??
        null;
}

export default function WebLoyaltyScreen({
    onBack,
}: Props) {
    const {
        business,
        theme,
    } = useBusiness();

    const businessName =
        business?.identity.businessName ??
        'Dorian POS';

    const shortName =
        business?.identity.shortName ??
        businessName;

    const logoUrl =
        business?.identity.logoUrl;

    const rewardsLabel =
        `${shortName} Rewards`;

    const safeBusinessName =
        shortName
            .trim()
            .toLowerCase()
            .normalize(
                'NFD',
            )
            .replace(
                /[\u0300-\u036f]/g,
                '',
            )
            .replace(
                /[^a-z0-9]+/g,
                '-',
            )
            .replace(
                /^-+|-+$/g,
                '',
            );

    const [
        authMode,
        setAuthMode,
    ] =
        useState<AuthMode>(
            'login',
        );

    const [
        name,
        setName,
    ] =
        useState('');

    const [
        phone,
        setPhone,
    ] =
        useState('');

    const [
        email,
        setEmail,
    ] =
        useState('');

    const [
        pin,
        setPin,
    ] =
        useState('');

    const [
        confirmPin,
        setConfirmPin,
    ] =
        useState('');

    const [
        status,
        setStatus,
    ] =
        useState<
            WebLoyaltyStatus | null
        >(null);

    const [
        qrDataUrl,
        setQrDataUrl,
    ] =
        useState<string | null>(
            null,
        );

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    const [
        saving,
        setSaving,
    ] =
        useState(false);

    const [
        errorMessage,
        setErrorMessage,
    ] =
        useState<string | null>(
            null,
        );

    const [
        showPinRecovery,
        setShowPinRecovery,
    ] =
        useState(false);

    const generateQr =
        async (
            token: string,
        ): Promise<void> => {
            const qrValue =
                `${window.location.origin}/recompensas/${token}`;

            const result =
                await QRCode.toDataURL(
                    qrValue,
                    {
                        width: 420,
                        margin: 2,
                        errorCorrectionLevel:
                            'H',
                    },
                );

            setQrDataUrl(
                result,
            );
        };

    const loadStatus =
        async (
            token: string,
        ): Promise<void> => {
            const result =
                await getWebLoyaltyStatus(
                    token,
                );

            setStatus(
                result,
            );

            await generateQr(
                result.customer.qrToken,
            );
        };

    useEffect(
        () => {
            const bootstrap =
                async (): Promise<void> => {
                    try {
                        const routeToken =
                            getLoyaltyTokenFromPath();

                        const savedToken =
                            getSavedWebLoyaltyToken();

                        const token =
                            routeToken ??
                            savedToken;

                        if (!token) {
                            return;
                        }

                        await loadStatus(
                            token,
                        );
                    } catch (error) {
                        console.error(
                            'Error restaurando Rewards:',
                            error,
                        );

                        setStatus(
                            null,
                        );

                        setQrDataUrl(
                            null,
                        );
                    } finally {
                        setLoading(
                            false,
                        );
                    }
                };

            void bootstrap();
        },
        [],
    );

    useEffect(
        () => {
            const token =
                status
                    ?.customer
                    .qrToken;

            if (!token) {
                return;
            }

            let refreshing =
                false;

            const refreshStatus =
                async (): Promise<void> => {
                    if (
                        refreshing
                    ) {
                        return;
                    }

                    try {
                        refreshing =
                            true;

                        const refreshed =
                            await getWebLoyaltyStatus(
                                token,
                            );

                        setStatus(
                            refreshed,
                        );
                    } catch (error) {
                        console.error(
                            'Error actualizando Rewards:',
                            error,
                        );
                    } finally {
                        refreshing =
                            false;
                    }
                };

            const handleFocus =
                (): void => {
                    void refreshStatus();
                };

            const handleVisibilityChange =
                (): void => {
                    if (
                        document.visibilityState ===
                        'visible'
                    ) {
                        void refreshStatus();
                    }
                };

            window.addEventListener(
                'focus',
                handleFocus,
            );

            document.addEventListener(
                'visibilitychange',
                handleVisibilityChange,
            );

            return () => {
                window.removeEventListener(
                    'focus',
                    handleFocus,
                );

                document.removeEventListener(
                    'visibilitychange',
                    handleVisibilityChange,
                );
            };
        },
        [
            status
                ?.customer
                .qrToken,
        ],
    );

    const nextReward =
        useMemo(
            () =>
                status?.rewards.find(
                    reward =>
                        reward.status ===
                        'locked',
                ) ??
                null,
            [
                status,
            ],
        );

    const availableRewards =
        useMemo(
            () =>
                status?.rewards.filter(
                    reward =>
                        reward.status ===
                        'available',
                ) ?? [],
            [
                status,
            ],
        );

    const clearAuthFields =
        (): void => {
            setName(
                '',
            );

            setPhone(
                '',
            );

            setEmail(
                '',
            );

            setPin(
                '',
            );

            setConfirmPin(
                '',
            );

            setErrorMessage(
                null,
            );
        };

    const changeAuthMode =
        (
            mode: AuthMode,
        ): void => {
            setAuthMode(
                mode,
            );

            clearAuthFields();
        };

    const handleLogin =
        async (): Promise<void> => {
            try {
                setSaving(
                    true,
                );

                setErrorMessage(
                    null,
                );

                const result =
                    await loginWebLoyaltyCustomer(
                        phone,
                        pin,
                    );

                saveWebLoyaltyToken(
                    result.qrToken,
                );

                if (
                    typeof window !==
                    'undefined'
                ) {
                    window.history.replaceState(
                        {},
                        '',
                        '/recompensas',
                    );
                }

                await loadStatus(
                    result.qrToken,
                );

                setPin(
                    '',
                );
            } catch (error) {
                console.error(
                    'Error iniciando sesión Rewards:',
                    error,
                );

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : 'No se pudo iniciar sesión.',
                );
            } finally {
                setSaving(
                    false,
                );
            }
        };

    const handleRegister =
        async (): Promise<void> => {
            if (
                pin !==
                confirmPin
            ) {
                setErrorMessage(
                    'Los PIN no coinciden.',
                );

                return;
            }

            if (
                !/^\d{6}$/.test(
                    pin,
                )
            ) {
                setErrorMessage(
                    'El PIN debe tener exactamente 6 dígitos.',
                );

                return;
            }

            try {
                setSaving(
                    true,
                );

                setErrorMessage(
                    null,
                );

                const result =
                    await registerWebLoyaltyCustomer(
                        name,
                        phone,
                        email,
                        pin,
                    );

                saveWebLoyaltyToken(
                    result.qrToken,
                );

                await loadStatus(
                    result.qrToken,
                );

                setPin(
                    '',
                );

                setConfirmPin(
                    '',
                );
            } catch (error) {
                console.error(
                    'Error registrando Rewards:',
                    error,
                );

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : 'No se pudo completar el registro.',
                );
            } finally {
                setSaving(
                    false,
                );
            }
        };

    const handleDownloadStyledQr =
        async (): Promise<void> => {
            if (
                !qrDataUrl ||
                !status
            ) {
                return;
            }

            try {
                setErrorMessage(
                    null,
                );

                const canvas =
                    document.createElement(
                        'canvas',
                    );

                const ctx =
                    canvas.getContext(
                        '2d',
                    );

                if (!ctx) {
                    throw new Error(
                        'No se pudo generar la imagen.',
                    );
                }

                const width =
                    1080;

                const height =
                    1350;

                canvas.width =
                    width;

                canvas.height =
                    height;

                // =========================================
                // FONDO
                // =========================================

                ctx.fillStyle =
                    '#F7F7F7';

                ctx.fillRect(
                    0,
                    0,
                    width,
                    height,
                );

                // =========================================
                // TARJETA
                // =========================================

                const cardX =
                    35;

                const cardY =
                    35;

                const cardWidth =
                    width - 70;

                const cardHeight =
                    height - 70;

                ctx.fillStyle =
                    '#FFFFFF';

                ctx.beginPath();

                ctx.roundRect(
                    cardX,
                    cardY,
                    cardWidth,
                    cardHeight,
                    38,
                );

                ctx.fill();

                ctx.strokeStyle =
                    '#DDDDDD';

                ctx.lineWidth =
                    3;

                ctx.stroke();

                // =========================================
                // HEADER
                // =========================================

                const headerX =
                    cardX;

                const headerY =
                    cardY;

                const headerWidth =
                    cardWidth;

                const headerHeight =
                    170;

                ctx.fillStyle =
                    theme.primary;

                ctx.beginPath();

                ctx.roundRect(
                    headerX,
                    headerY,
                    headerWidth,
                    headerHeight,
                    [
                        38,
                        38,
                        0,
                        0,
                    ],
                );

                ctx.fill();

                // =========================================
                // LOGO
                // =========================================

                if (logoUrl) {
                    try {
                        const logo =
                            await loadHtmlImage(
                                logoUrl,
                            );

                        const maxLogoWidth =
                            145;

                        const maxLogoHeight =
                            125;

                        const logoRatio =
                            Math.min(
                                maxLogoWidth /
                                    logo.naturalWidth,

                                maxLogoHeight /
                                    logo.naturalHeight,
                            );

                        const logoWidth =
                            logo.naturalWidth *
                            logoRatio;

                        const logoHeight =
                            logo.naturalHeight *
                            logoRatio;

                        const logoX =
                            headerX + 55;

                        const logoY =
                            headerY +
                            (
                                headerHeight -
                                logoHeight
                            ) / 2;

                        ctx.drawImage(
                            logo,
                            logoX,
                            logoY,
                            logoWidth,
                            logoHeight,
                        );
                    } catch (error) {
                        console.error(
                            'ERROR CARGANDO LOGO REWARDS:',
                            error,
                        );
                    }
                }

                // =========================================
                // TITULO
                // =========================================

                ctx.fillStyle =
                    '#111111';

                ctx.textAlign =
                    'center';

                ctx.textBaseline =
                    'middle';

                ctx.font =
                    '900 36px Arial';

                const titleStartX =
                    headerX + 235;

                const titleEndX =
                    headerX +
                    headerWidth -
                    40;

                const titleCenterX =
                    (
                        titleStartX +
                        titleEndX
                    ) / 2;

                ctx.fillText(
                    'PROGRAMA DE RECOMPENSAS',
                    titleCenterX,
                    headerY +
                    headerHeight / 2,
                );

                // =========================================
                // CLIENTE
                // =========================================

                ctx.textAlign =
                    'center';

                ctx.textBaseline =
                    'alphabetic';

                ctx.fillStyle =
                    '#111111';

                ctx.font =
                    '900 43px Arial';

                const customerName =
                    status.customer.name.length >
                        28
                        ? `${status.customer.name.slice(
                            0,
                            28,
                        )}...`
                        : status.customer.name;

                ctx.fillText(
                    customerName,
                    width / 2,
                    295,
                );

                ctx.fillStyle =
                    '#777777';

                ctx.font =
                    '500 23px Arial';

                ctx.fillText(
                    `Cliente ${rewardsLabel}`,
                    width / 2,
                    333,
                );

                // =========================================
                // SEPARADOR
                // =========================================

                ctx.strokeStyle =
                    '#EEEEEE';

                ctx.lineWidth =
                    2;

                ctx.beginPath();

                ctx.moveTo(
                    160,
                    415,
                );

                ctx.lineTo(
                    width - 160,
                    415,
                );

                ctx.stroke();

                // =========================================
                // QR
                // =========================================

                const qrImage =
                    await loadHtmlImage(
                        qrDataUrl,
                    );

                const qrSize =
                    610;

                const qrX =
                    width / 2 -
                    qrSize / 2;

                const qrY =
                    465;

                const qrPadding =
                    35;

                ctx.fillStyle =
                    '#F2F2F2';

                ctx.beginPath();

                ctx.roundRect(
                    qrX -
                    qrPadding,

                    qrY -
                    qrPadding,

                    qrSize +
                    qrPadding * 2,

                    qrSize +
                    qrPadding * 2,

                    28,
                );

                ctx.fill();

                ctx.fillStyle =
                    '#FFFFFF';

                ctx.fillRect(
                    qrX,
                    qrY,
                    qrSize,
                    qrSize,
                );

                ctx.drawImage(
                    qrImage,
                    qrX,
                    qrY,
                    qrSize,
                    qrSize,
                );

                // =========================================
                // TEXTO
                // =========================================

                ctx.fillStyle =
                    '#111111';

                ctx.font =
                    '900 29px Arial';

                ctx.fillText(
                    'Muéstralo en caja',
                    width / 2,
                    1170,
                );

                ctx.fillStyle =
                    '#666666';

                ctx.font =
                    '500 21px Arial';

                ctx.fillText(
                    'Escanéalo en cada visita para acumular recompensas',
                    width / 2,
                    1208,
                );

                // =========================================
                // FOOTER
                // =========================================

                ctx.fillStyle =
                    '#111111';

                ctx.beginPath();

                ctx.roundRect(
                    355,
                    1247,
                    370,
                    48,
                    24,
                );

                ctx.fill();

                ctx.fillStyle =
                    theme.primary;

                ctx.font =
                    '800 18px Arial';

                ctx.fillText(
                    rewardsLabel.toUpperCase(),
                    width / 2,
                    1278,
                );

                // =========================================
                // DESCARGA
                // =========================================

                const imageUrl =
                    canvas.toDataURL(
                        'image/png',
                    );

                const link =
                    document.createElement(
                        'a',
                    );

                link.href =
                    imageUrl;

                link.download =
                    'dorian-rewards.png';

                document.body.appendChild(
                    link,
                );

                link.click();

                document.body.removeChild(
                    link,
                );
            } catch (error) {
                console.error(
                    'Error generando QR personalizado:',
                    error,
                );

                setErrorMessage(
                    'No se pudo generar la imagen del QR.',
                );
            }
        };

    const handleReset =
        (): void => {
            clearSavedWebLoyaltyToken();

            if (
                typeof window !==
                'undefined'
            ) {
                window.history.replaceState(
                    {},
                    '',
                    '/recompensas',
                );
            }

            setStatus(
                null,
            );

            setQrDataUrl(
                null,
            );

            clearAuthFields();

            setAuthMode(
                'login',
            );
        };

    return (
        <ScrollView
            style={[
                styles.container,
                {
                    backgroundColor:
                        theme.background,
                },
            ]}
            contentContainerStyle={
                styles.contentContainer
            }
        >
            <View
                style={
                    styles.header
                }
            >
                <Pressable
                    style={
                        styles.backButton
                    }
                    onPress={
                        onBack
                    }
                >
                    <Text
                        style={[
                            styles.backButtonText,
                            { color: theme.primary },
                        ]}
                    >
                        ← Menú
                    </Text>
                </Pressable>

                <Text
                    style={[
                        styles.brand,
                        { color: theme.primary },
                    ]}
                >
                    {businessName}
                </Text>

                <Text
                    style={[
                        styles.title,
                        { color: theme.text },
                    ]}
                >
                    Rewards
                </Text>

                <Text
                    style={[
                        styles.subtitle,
                        { color: theme.textMuted },
                    ]}
                >
                    Acumula visitas y desbloquea premios.
                </Text>
            </View>

            {!status ? (
                <View
                    style={[
                            styles.registerCard,
                            {
                                backgroundColor: theme.surface,
                                borderColor: theme.border,
                            },
                        ]}
                >
                    <View
                        style={{
                            flexDirection:
                                'row',

                            borderWidth: 1,
                            borderColor:
                                theme.border,

                            borderRadius: 10,

                            overflow:
                                'hidden',

                            marginBottom: 20,
                        }}
                    >
                        <Pressable
                            style={{
                                flex: 1,
                                minHeight: 48,

                                alignItems:
                                    'center',

                                justifyContent:
                                    'center',

                                backgroundColor:
                                    authMode ===
                                        'login'
                                        ? theme.primary
                                        : theme.surfaceAlt,
                            }}
                            onPress={() =>
                                changeAuthMode(
                                    'login',
                                )
                            }
                        >
                            <Text
                                style={{
                                    color:
                                        authMode ===
                                            'login'
                                            ? theme.onPrimary
                                            : theme.textMuted,

                                    fontWeight:
                                        '900',
                                }}
                            >
                                Iniciar sesión
                            </Text>
                        </Pressable>

                        <Pressable
                            style={{
                                flex: 1,
                                minHeight: 48,

                                alignItems:
                                    'center',

                                justifyContent:
                                    'center',

                                backgroundColor:
                                    authMode ===
                                        'register'
                                        ? theme.primary
                                        : theme.surfaceAlt,
                            }}
                            onPress={() =>
                                changeAuthMode(
                                    'register',
                                )
                            }
                        >
                            <Text
                                style={{
                                    color:
                                        authMode ===
                                            'register'
                                            ? theme.onPrimary
                                            : theme.textMuted,

                                    fontWeight:
                                        '900',
                                }}
                            >
                                Registrarme
                            </Text>
                        </Pressable>
                    </View>

                    {authMode ===
                        'login'
                        ? (
                            <>
                                <Text
                                    style={[
                                styles.sectionTitle,
                                { color: theme.text },
                            ]}
                                >
                                    Bienvenido de nuevo
                                </Text>

                                <Text
                                    style={[
                                styles.sectionText,
                                { color: theme.textMuted },
                            ]}
                                >
                                    Ingresa con el teléfono y PIN que registraste en {rewardsLabel}.
                                </Text>

                                <Text
                                    style={[
                                styles.label,
                                { color: theme.textMuted },
                            ]}
                                >
                                    Teléfono
                                </Text>

                                <TextInput
                                    style={[
                                        styles.input,
                                        {
                                            borderColor: theme.border,
                                            backgroundColor: theme.background,
                                            color: theme.text,
                                        },
                                    ]}
                                    value={
                                        phone
                                    }
                                    onChangeText={
                                        setPhone
                                    }
                                    placeholder="10 dígitos"
                                    placeholderTextColor={theme.textMuted}
                                    keyboardType="phone-pad"
                                    maxLength={14}
                                />

                                <Text
                                    style={[
                                styles.label,
                                { color: theme.textMuted },
                            ]}
                                >
                                    PIN
                                </Text>

                                <TextInput
                                    style={[
                                        styles.input,
                                        {
                                            borderColor: theme.border,
                                            backgroundColor: theme.background,
                                            color: theme.text,
                                        },
                                    ]}
                                    value={
                                        pin
                                    }
                                    onChangeText={value =>
                                        setPin(
                                            value
                                                .replace(
                                                    /\D/g,
                                                    '',
                                                )
                                                .slice(
                                                    0,
                                                    6,
                                                ),
                                        )
                                    }
                                    placeholder="6 dígitos"
                                    placeholderTextColor={theme.textMuted}
                                    keyboardType="number-pad"
                                    secureTextEntry
                                    maxLength={6}
                                />

                                <Pressable
                                    onPress={() => {
                                        setShowPinRecovery(true);
                                    }}
                                    style={{
                                        alignSelf: 'flex-end',
                                        paddingVertical: 8,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: theme.primary,
                                            fontSize: 13,
                                            fontWeight: '700',
                                        }}
                                    >
                                        ¿Olvidaste tu PIN?
                                    </Text>
                                </Pressable>

                                {errorMessage ? (
                                    <Text
                                        style={[
                                styles.errorText,
                                { color: theme.danger },
                            ]}
                                    >
                                        {errorMessage}
                                    </Text>
                                ) : null}

                                <Pressable
                                    style={[
                                        styles.primaryButton,
                                        { backgroundColor: theme.primary },

                                        saving &&
                                        styles.buttonDisabled,
                                    ]}
                                    disabled={
                                        saving
                                    }
                                    onPress={() => {
                                        void handleLogin();
                                    }}
                                >
                                    {saving
                                        ? (
                                            <ActivityIndicator
                                                color={theme.onPrimary}
                                            />
                                        )
                                        : (
                                            <Text
                                                style={[
                                                        styles.primaryButtonText,
                                                        { color: theme.onPrimary },
                                                    ]}
                                            >
                                                Entrar a Rewards
                                            </Text>
                                        )}
                                </Pressable>
                            </>
                        )
                        : (
                            <>
                                <Text
                                    style={[
                                styles.sectionTitle,
                                { color: theme.text },
                            ]}
                                >
                                    Únete a {rewardsLabel}
                                </Text>

                                <Text
                                    style={[
                                styles.sectionText,
                                { color: theme.textMuted },
                            ]}
                                >
                                    Regístrate y recibe tu QR personal para acumular visitas y desbloquear premios.
                                </Text>

                                <Text
                                    style={[
                                styles.label,
                                { color: theme.textMuted },
                            ]}
                                >
                                    Nombre
                                </Text>

                                <TextInput
                                    style={[
                                        styles.input,
                                        {
                                            borderColor: theme.border,
                                            backgroundColor: theme.background,
                                            color: theme.text,
                                        },
                                    ]}
                                    value={
                                        name
                                    }
                                    onChangeText={
                                        setName
                                    }
                                    placeholder="Tu nombre"
                                    placeholderTextColor={theme.textMuted}
                                />

                                <Text
                                    style={[
                                styles.label,
                                { color: theme.textMuted },
                            ]}
                                >
                                    Teléfono
                                </Text>

                                <TextInput
                                    style={[
                                        styles.input,
                                        {
                                            borderColor: theme.border,
                                            backgroundColor: theme.background,
                                            color: theme.text,
                                        },
                                    ]}
                                    value={
                                        phone
                                    }
                                    onChangeText={
                                        setPhone
                                    }
                                    placeholder="10 dígitos"
                                    placeholderTextColor={theme.textMuted}
                                    keyboardType="phone-pad"
                                    maxLength={14}
                                />

                                <Text
                                    style={[
                                styles.label,
                                { color: theme.textMuted },
                            ]}
                                >
                                    Correo
                                </Text>

                                <TextInput
                                    style={[
                                        styles.input,
                                        {
                                            borderColor: theme.border,
                                            backgroundColor: theme.background,
                                            color: theme.text,
                                        },
                                    ]}
                                    value={
                                        email
                                    }
                                    onChangeText={
                                        setEmail
                                    }
                                    placeholder="Opcional"
                                    placeholderTextColor={theme.textMuted}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />

                                <Text
                                    style={[
                                styles.label,
                                { color: theme.textMuted },
                            ]}
                                >
                                    Crea un PIN
                                </Text>

                                <TextInput
                                    style={[
                                        styles.input,
                                        {
                                            borderColor: theme.border,
                                            backgroundColor: theme.background,
                                            color: theme.text,
                                        },
                                    ]}
                                    value={
                                        pin
                                    }
                                    onChangeText={value =>
                                        setPin(
                                            value
                                                .replace(
                                                    /\D/g,
                                                    '',
                                                )
                                                .slice(
                                                    0,
                                                    6,
                                                ),
                                        )
                                    }
                                    placeholder="6 dígitos"
                                    placeholderTextColor={theme.textMuted}
                                    keyboardType="number-pad"
                                    secureTextEntry
                                    maxLength={6}
                                />

                                <Text
                                    style={[
                                styles.label,
                                { color: theme.textMuted },
                            ]}
                                >
                                    Confirma tu PIN
                                </Text>

                                <TextInput
                                    style={[
                                        styles.input,
                                        {
                                            borderColor: theme.border,
                                            backgroundColor: theme.background,
                                            color: theme.text,
                                        },
                                    ]}
                                    value={
                                        confirmPin
                                    }
                                    onChangeText={value =>
                                        setConfirmPin(
                                            value
                                                .replace(
                                                    /\D/g,
                                                    '',
                                                )
                                                .slice(
                                                    0,
                                                    6,
                                                ),
                                        )
                                    }
                                    placeholder="Repite los 6 dígitos"
                                    placeholderTextColor={theme.textMuted}
                                    keyboardType="number-pad"
                                    secureTextEntry
                                    maxLength={6}
                                />

                                {errorMessage ? (
                                    <Text
                                        style={[
                                styles.errorText,
                                { color: theme.danger },
                            ]}
                                    >
                                        {errorMessage}
                                    </Text>
                                ) : null}

                                <Pressable
                                    style={[
                                        styles.primaryButton,
                                        { backgroundColor: theme.primary },

                                        saving &&
                                        styles.buttonDisabled,
                                    ]}
                                    disabled={
                                        saving
                                    }
                                    onPress={() => {
                                        void handleRegister();
                                    }}
                                >
                                    {saving
                                        ? (
                                            <ActivityIndicator
                                                color={theme.onPrimary}
                                            />
                                        )
                                        : (
                                            <Text
                                                style={[
                                                        styles.primaryButtonText,
                                                        { color: theme.onPrimary },
                                                    ]}
                                            >
                                                Crear mi cuenta Rewards
                                            </Text>
                                        )}
                                </Pressable>
                            </>
                        )}
                </View>
            ) : (
                <>
                    <View
                        style={[
                            styles.customerCard,
                            {
                                backgroundColor: theme.surface,
                                borderColor: theme.border,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.customerHello,
                                { color: theme.text },
                            ]}
                        >
                            Hola, {status.customer.name}
                        </Text>

                        <Text
                            style={[
                                styles.visitCount,
                                { color: theme.primary },
                            ]}
                        >
                            {status.customer.totalVisits}
                        </Text>

                        <Text
                            style={[
                                styles.visitLabel,
                                { color: theme.textMuted },
                            ]}
                        >
                            {status.customer.totalVisits ===
                                1
                                ? 'visita acumulada'
                                : 'visitas acumuladas'}
                        </Text>

                        {availableRewards.length >
                            0
                            ? (
                                <View
                                    style={[
                                            styles.availableBanner,
                                            {
                                                borderColor: theme.primary,
                                                backgroundColor: theme.surfaceAlt,
                                            },
                                        ]}
                                >
                                    <Text
                                        style={[
                                styles.availableBannerTitle,
                                { color: theme.primary },
                            ]}
                                    >
                                        🎁 Tienes recompensa
                                    </Text>

                                    <Text
                                        style={[
                                styles.availableBannerText,
                                { color: theme.text },
                            ]}
                                    >
                                        {availableRewards.length ===
                                            1
                                            ? 'Tienes 1 premio disponible para canjear.'
                                            : `Tienes ${availableRewards.length} premios disponibles para canjear.`}
                                    </Text>
                                </View>
                            )
                            : null}

                        {nextReward
                            ? (
                                <View
                                    style={[
                                            styles.progressCard,
                                            { borderTopColor: theme.border },
                                        ]}
                                >
                                    <Text
                                        style={[
                                styles.progressTitle,
                                { color: theme.textMuted },
                            ]}
                                    >
                                        Próxima recompensa
                                    </Text>

                                    <Text
                                        style={[
                                styles.progressReward,
                                { color: theme.text },
                            ]}
                                    >
                                        {nextReward.name}
                                    </Text>

                                    <Text
                                        style={[
                                styles.progressText,
                                { color: theme.textMuted },
                            ]}
                                    >
                                        Te faltan{' '}
                                        {
                                            nextReward.visitsRemaining
                                        }{' '}
                                        {nextReward.visitsRemaining ===
                                            1
                                            ? 'visita'
                                            : 'visitas'}
                                    </Text>

                                    <View
                                        style={[
                                            styles.progressTrack,
                                            { backgroundColor: theme.surfaceAlt },
                                        ]}
                                    >
                                        <View
                                            style={[
                                                styles.progressFill,
                                                { backgroundColor: theme.primary },
                                                {
                                                    width:
                                                        `${Math.min(
                                                            100,
                                                            Math.max(
                                                                0,
                                                                (
                                                                    status.customer.totalVisits /
                                                                    nextReward.requiredVisits
                                                                ) *
                                                                100,
                                                            ),
                                                        )}%`,
                                                },
                                            ]}
                                        />
                                    </View>

                                    <Text
                                        style={[
                                styles.progressCounter,
                                { color: theme.textMuted },
                            ]}
                                    >
                                        {
                                            status.customer.totalVisits
                                        }
                                        {' / '}
                                        {
                                            nextReward.requiredVisits
                                        }
                                    </Text>
                                </View>
                            )
                            : null}
                    </View>

                    <View
                        style={[
                            styles.qrCard,
                            {
                                backgroundColor: theme.surface,
                                borderColor: theme.border,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.sectionTitle,
                                { color: theme.text },
                            ]}
                        >
                            Tu QR
                        </Text>

                        <Text
                            style={[
                                styles.sectionText,
                                { color: theme.textMuted },
                            ]}
                        >
                            Muéstralo en {businessName} al realizar tu compra.
                        </Text>

                        {qrDataUrl
                            ? (
                                <View
                                    style={
                                        styles.qrContainer
                                    }
                                >
                                    <Image
                                        source={{
                                            uri:
                                                qrDataUrl,
                                        }}
                                        style={
                                            styles.qrImage
                                        }
                                        resizeMode="contain"
                                    />
                                </View>
                            )
                            : (
                                <ActivityIndicator
                                    color={theme.primary}
                                />
                            )}

                        <Pressable
                            style={[
                                styles.downloadQrButton,
                                { backgroundColor: theme.primary },

                                !qrDataUrl &&
                                styles.buttonDisabled,
                            ]}
                            disabled={
                                !qrDataUrl
                            }
                            onPress={() => {
                                void handleDownloadStyledQr();
                            }}
                        >
                            <Text
                                style={[
                                    styles.downloadQrButtonText,
                                    { color: theme.onPrimary },
                                ]}
                            >
                                Descargar mi QR
                            </Text>
                        </Pressable>

                        <Text
                            style={[
                                styles.downloadQrHint,
                                { color: theme.textMuted },
                            ]}
                        >
                            Guárdalo en tu galería para mostrarlo rápidamente en tu próxima visita.
                        </Text>
                    </View>

                    <View
                        style={[
                            styles.rewardsCard,
                            {
                                backgroundColor: theme.surface,
                                borderColor: theme.border,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.sectionTitle,
                                { color: theme.text },
                            ]}
                        >
                            Tus recompensas
                        </Text>

                        {status.rewards.map(
                            reward => {
                                const available =
                                    reward.status ===
                                    'available';

                                const redeemed =
                                    reward.status ===
                                    'redeemed';

                                return (
                                    <View
                                        key={
                                            reward.id
                                        }
                                        style={[
                                            styles.rewardRow,
                                            { borderColor: theme.border },

                                            available &&
                                            styles.rewardRowAvailable,

                                            available && {
                                                borderColor: theme.primary,
                                                backgroundColor: theme.surfaceAlt,
                                            },

                                            redeemed &&
                                            styles.rewardRowRedeemed,
                                        ]}
                                    >
                                        <View
                                            style={
                                                styles.rewardContent
                                            }
                                        >
                                            <Text
                                                style={[
                                styles.rewardName,
                                { color: theme.text },
                            ]}
                                            >
                                                {reward.name}
                                            </Text>

                                            {reward.description
                                                ? (
                                                    <Text
                                                        style={[
                                styles.rewardDescription,
                                { color: theme.textMuted },
                            ]}
                                                    >
                                                        {reward.description}
                                                    </Text>
                                                )
                                                : null}

                                            <Text
                                                style={[
                                styles.rewardRequirement,
                                { color: theme.primary },
                            ]}
                                            >
                                                {
                                                    reward.requiredVisits
                                                }{' '}
                                                {reward.requiredVisits ===
                                                    1
                                                    ? 'visita'
                                                    : 'visitas'}
                                            </Text>
                                        </View>

                                        <View
                                            style={
                                                styles.rewardStatusContainer
                                            }
                                        >
                                            <Text
                                                style={[
                                                    styles.rewardStatus,

                                                    available &&
                                                    styles.rewardStatusAvailable,

                                                    available && { color: theme.primary },

                                                    redeemed &&
                                                    styles.rewardStatusRedeemed,
                                                ]}
                                            >
                                                {reward.status ===
                                                    'available'
                                                    ? '🎁 Disponible'
                                                    : reward.status ===
                                                        'redeemed'
                                                        ? '✓ Canjeada'
                                                        : `🔒 Faltan ${reward.visitsRemaining}`}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            },
                        )}
                    </View>

                    <View
                        style={[
                            styles.howItWorksCard,
                            {
                                backgroundColor: theme.surface,
                                borderColor: theme.border,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.sectionTitle,
                                { color: theme.text },
                            ]}
                        >
                            ¿Cómo funciona?
                        </Text>

                        <Text
                            style={[
                                styles.stepText,
                                { color: theme.textMuted },
                            ]}
                        >
                            1. Haz tu compra en {businessName}.
                        </Text>

                        <Text
                            style={[
                                styles.stepText,
                                { color: theme.textMuted },
                            ]}
                        >
                            2. Muestra tu QR al momento de pagar.
                        </Text>

                        <Text
                            style={[
                                styles.stepText,
                                { color: theme.textMuted },
                            ]}
                        >
                            3. Acumula visitas y desbloquea premios.
                        </Text>

                        <Text
                            style={[
                                styles.stepText,
                                { color: theme.textMuted },
                            ]}
                        >
                            4. Cuando un premio esté disponible, solicítalo en el local.
                        </Text>
                    </View>

                    <Pressable
                        style={
                            styles.resetButton
                        }
                        onPress={
                            handleReset
                        }
                    >
                        <Text
                            style={[
                                styles.resetButtonText,
                                { color: theme.textMuted },
                            ]}
                        >
                            Usar otra cuenta
                        </Text>
                    </Pressable>
                </>
            )}

            <AccountRecoveryModal
                visible={showPinRecovery}
                type="rewards_pin"
                initialIdentifier={phone}
                onClose={() => {
                    setShowPinRecovery(false);
                }}
            />
        </ScrollView>
    );
}