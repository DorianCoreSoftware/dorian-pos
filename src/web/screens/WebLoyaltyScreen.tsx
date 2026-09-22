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

import {
    Asset,
} from 'expo-asset';

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

async function getBundledAssetDataUrl(
    assetModule: number,
): Promise<string> {
    const asset =
        Asset.fromModule(
            assetModule,
        );

    await asset.downloadAsync();

    const uri =
        asset.localUri ??
        asset.uri;

    if (!uri) {
        throw new Error(
            'No se pudo resolver el logo.',
        );
    }

    const response =
        await fetch(
            uri,
        );

    if (!response.ok) {
        throw new Error(
            `No se pudo cargar el logo: ${response.status}`,
        );
    }

    const blob =
        await response.blob();

    return new Promise(
        (
            resolve,
            reject,
        ) => {
            const reader =
                new FileReader();

            reader.onloadend =
                () => {
                    if (
                        typeof reader.result ===
                        'string'
                    ) {
                        resolve(
                            reader.result,
                        );

                        return;
                    }

                    reject(
                        new Error(
                            'No se pudo convertir el logo.',
                        ),
                    );
                };

            reader.onerror =
                () => {
                    reject(
                        new Error(
                            'No se pudo leer el logo.',
                        ),
                    );
                };

            reader.readAsDataURL(
                blob,
            );
        },
    );
}

export default function WebLoyaltyScreen({
    onBack,
}: Props) {
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
                        const savedToken =
                            getSavedWebLoyaltyToken();

                        if (!savedToken) {
                            return;
                        }

                        await loadStatus(
                            savedToken,
                        );
                    } catch (error) {
                        console.error(
                            'Error restaurando Rewards:',
                            error,
                        );

                        clearSavedWebLoyaltyToken();

                        setStatus(
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
                    '#FFB000';

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

                try {
                    const logoDataUrl =
                        await getBundledAssetDataUrl(
                            require(
                                '../../../assets/BurgerKongWOFondo.png',
                            ),
                        );

                    const logo =
                        await loadHtmlImage(
                            logoDataUrl,
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
                        ) /
                        2;

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
                    'Cliente Burger Kong Rewards',
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
                    '#FFB000';

                ctx.font =
                    '800 18px Arial';

                ctx.fillText(
                    'BURGER KONG REWARDS',
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
                    'burger-kong-rewards.png';

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

    if (loading) {
        return (
            <View
                style={
                    styles.loadingContainer
                }
            >
                <ActivityIndicator
                    size="large"
                    color="#FFB000"
                />

                <Text
                    style={
                        styles.loadingText
                    }
                >
                    Cargando Rewards...
                </Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={
                styles.container
            }
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
                        style={
                            styles.backButtonText
                        }
                    >
                        ← Menú
                    </Text>
                </Pressable>

                <Text
                    style={
                        styles.brand
                    }
                >
                    Burger Kong
                </Text>

                <Text
                    style={
                        styles.title
                    }
                >
                    Rewards
                </Text>

                <Text
                    style={
                        styles.subtitle
                    }
                >
                    Acumula visitas y desbloquea premios.
                </Text>
            </View>

            {!status ? (
                <View
                    style={
                        styles.registerCard
                    }
                >
                    <View
                        style={{
                            flexDirection:
                                'row',

                            borderWidth: 1,
                            borderColor:
                                '#3A3A3A',

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
                                        ? '#FFB000'
                                        : '#151515',
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
                                            ? '#111111'
                                            : '#BBBBBB',

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
                                        ? '#FFB000'
                                        : '#151515',
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
                                            ? '#111111'
                                            : '#BBBBBB',

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
                                    style={
                                        styles.sectionTitle
                                    }
                                >
                                    Bienvenido de nuevo
                                </Text>

                                <Text
                                    style={
                                        styles.sectionText
                                    }
                                >
                                    Ingresa con el teléfono y PIN que registraste en Burger Kong Rewards.
                                </Text>

                                <Text
                                    style={
                                        styles.label
                                    }
                                >
                                    Teléfono
                                </Text>

                                <TextInput
                                    style={
                                        styles.input
                                    }
                                    value={
                                        phone
                                    }
                                    onChangeText={
                                        setPhone
                                    }
                                    placeholder="10 dígitos"
                                    placeholderTextColor="#777777"
                                    keyboardType="phone-pad"
                                    maxLength={14}
                                />

                                <Text
                                    style={
                                        styles.label
                                    }
                                >
                                    PIN
                                </Text>

                                <TextInput
                                    style={
                                        styles.input
                                    }
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
                                    placeholderTextColor="#777777"
                                    keyboardType="number-pad"
                                    secureTextEntry
                                    maxLength={6}
                                />

                                {errorMessage ? (
                                    <Text
                                        style={
                                            styles.errorText
                                        }
                                    >
                                        {errorMessage}
                                    </Text>
                                ) : null}

                                <Pressable
                                    style={[
                                        styles.primaryButton,

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
                                                color="#111111"
                                            />
                                        )
                                        : (
                                            <Text
                                                style={
                                                    styles.primaryButtonText
                                                }
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
                                    style={
                                        styles.sectionTitle
                                    }
                                >
                                    Únete a Burger Kong Rewards
                                </Text>

                                <Text
                                    style={
                                        styles.sectionText
                                    }
                                >
                                    Regístrate y recibe tu QR personal para acumular visitas y desbloquear premios.
                                </Text>

                                <Text
                                    style={
                                        styles.label
                                    }
                                >
                                    Nombre
                                </Text>

                                <TextInput
                                    style={
                                        styles.input
                                    }
                                    value={
                                        name
                                    }
                                    onChangeText={
                                        setName
                                    }
                                    placeholder="Tu nombre"
                                    placeholderTextColor="#777777"
                                />

                                <Text
                                    style={
                                        styles.label
                                    }
                                >
                                    Teléfono
                                </Text>

                                <TextInput
                                    style={
                                        styles.input
                                    }
                                    value={
                                        phone
                                    }
                                    onChangeText={
                                        setPhone
                                    }
                                    placeholder="10 dígitos"
                                    placeholderTextColor="#777777"
                                    keyboardType="phone-pad"
                                    maxLength={14}
                                />

                                <Text
                                    style={
                                        styles.label
                                    }
                                >
                                    Correo
                                </Text>

                                <TextInput
                                    style={
                                        styles.input
                                    }
                                    value={
                                        email
                                    }
                                    onChangeText={
                                        setEmail
                                    }
                                    placeholder="Opcional"
                                    placeholderTextColor="#777777"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />

                                <Text
                                    style={
                                        styles.label
                                    }
                                >
                                    Crea un PIN
                                </Text>

                                <TextInput
                                    style={
                                        styles.input
                                    }
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
                                    placeholderTextColor="#777777"
                                    keyboardType="number-pad"
                                    secureTextEntry
                                    maxLength={6}
                                />

                                <Text
                                    style={
                                        styles.label
                                    }
                                >
                                    Confirma tu PIN
                                </Text>

                                <TextInput
                                    style={
                                        styles.input
                                    }
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
                                    placeholderTextColor="#777777"
                                    keyboardType="number-pad"
                                    secureTextEntry
                                    maxLength={6}
                                />

                                {errorMessage ? (
                                    <Text
                                        style={
                                            styles.errorText
                                        }
                                    >
                                        {errorMessage}
                                    </Text>
                                ) : null}

                                <Pressable
                                    style={[
                                        styles.primaryButton,

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
                                                color="#111111"
                                            />
                                        )
                                        : (
                                            <Text
                                                style={
                                                    styles.primaryButtonText
                                                }
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
                        style={
                            styles.customerCard
                        }
                    >
                        <Text
                            style={
                                styles.customerHello
                            }
                        >
                            Hola, {status.customer.name}
                        </Text>

                        <Text
                            style={
                                styles.visitCount
                            }
                        >
                            {status.customer.totalVisits}
                        </Text>

                        <Text
                            style={
                                styles.visitLabel
                            }
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
                                    style={
                                        styles.availableBanner
                                    }
                                >
                                    <Text
                                        style={
                                            styles.availableBannerTitle
                                        }
                                    >
                                        🎁 Tienes recompensa
                                    </Text>

                                    <Text
                                        style={
                                            styles.availableBannerText
                                        }
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
                                    style={
                                        styles.progressCard
                                    }
                                >
                                    <Text
                                        style={
                                            styles.progressTitle
                                        }
                                    >
                                        Próxima recompensa
                                    </Text>

                                    <Text
                                        style={
                                            styles.progressReward
                                        }
                                    >
                                        {nextReward.name}
                                    </Text>

                                    <Text
                                        style={
                                            styles.progressText
                                        }
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
                                        style={
                                            styles.progressTrack
                                        }
                                    >
                                        <View
                                            style={[
                                                styles.progressFill,
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
                                        style={
                                            styles.progressCounter
                                        }
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
                        style={
                            styles.qrCard
                        }
                    >
                        <Text
                            style={
                                styles.sectionTitle
                            }
                        >
                            Tu QR
                        </Text>

                        <Text
                            style={
                                styles.sectionText
                            }
                        >
                            Muéstralo en Burger Kong al realizar tu compra.
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
                                    color="#FFB000"
                                />
                            )}

                        <Pressable
                            style={[
                                styles.downloadQrButton,

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
                                style={
                                    styles.downloadQrButtonText
                                }
                            >
                                Descargar mi QR
                            </Text>
                        </Pressable>

                        <Text
                            style={
                                styles.downloadQrHint
                            }
                        >
                            Guárdalo en tu galería para mostrarlo rápidamente en tu próxima visita.
                        </Text>
                    </View>

                    <View
                        style={
                            styles.rewardsCard
                        }
                    >
                        <Text
                            style={
                                styles.sectionTitle
                            }
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

                                            available &&
                                            styles.rewardRowAvailable,

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
                                                style={
                                                    styles.rewardName
                                                }
                                            >
                                                {reward.name}
                                            </Text>

                                            {reward.description
                                                ? (
                                                    <Text
                                                        style={
                                                            styles.rewardDescription
                                                        }
                                                    >
                                                        {reward.description}
                                                    </Text>
                                                )
                                                : null}

                                            <Text
                                                style={
                                                    styles.rewardRequirement
                                                }
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
                        style={
                            styles.howItWorksCard
                        }
                    >
                        <Text
                            style={
                                styles.sectionTitle
                            }
                        >
                            ¿Cómo funciona?
                        </Text>

                        <Text
                            style={
                                styles.stepText
                            }
                        >
                            1. Haz tu compra en Burger Kong.
                        </Text>

                        <Text
                            style={
                                styles.stepText
                            }
                        >
                            2. Muestra tu QR al momento de pagar.
                        </Text>

                        <Text
                            style={
                                styles.stepText
                            }
                        >
                            3. Acumula visitas y desbloquea premios.
                        </Text>

                        <Text
                            style={
                                styles.stepText
                            }
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
                            style={
                                styles.resetButtonText
                            }
                        >
                            Usar otra cuenta
                        </Text>
                    </Pressable>
                </>
            )}
        </ScrollView>
    );
}