import React, {
    useEffect,
    useState,
} from 'react';

import {
    Pressable,
    Text,
    View,
} from 'react-native';

import {
    useBusiness,
} from '../../../context/BusinessContext';

import styles from './WebCookieNotice.styles';

export default function WebCookieNotice() {
    const {
        business,
        theme,
    } = useBusiness();

    const businessName =
        business?.identity.businessName ??
        'Dorian POS';

    const [
        visible,
        setVisible,
    ] = useState(false);

    const storageKey =
        `dorian_cookie_notice_acknowledged_${businessName}`;

    useEffect(
        () => {
            if (
                typeof window ===
                'undefined'
            ) {
                return;
            }

            try {
                const acknowledged =
                    window.localStorage.getItem(
                        storageKey,
                    );

                setVisible(
                    acknowledged !==
                    'true',
                );
            } catch {
                setVisible(true);
            }
        },
        [],
    );

    function handleAccept():
        void {
        if (
            typeof window !==
            'undefined'
        ) {
            try {
                window.localStorage.setItem(
                    storageKey,
                    'true',
                );
            } catch {
                // Sin localStorage, ocultamos
                // el aviso durante esta sesión.
            }
        }

        setVisible(false);
    }

    if (
        !visible
    ) {
        return null;
    }

    return (
        <View
            style={
                styles.wrapper
            }
        >
            <View
                style={[
                    styles.card,
                    {
                        backgroundColor:
                            theme.surface,

                        borderColor:
                            theme.primary,
                    },
                ]}
            >
                <View
                    style={
                        styles.copy
                    }
                >
                    <Text
                        style={[
                            styles.title,
                            {
                                color:
                                    theme.text,
                            },
                        ]}
                    >
                        {`Tu experiencia en ${businessName}`}
                    </Text>

                    <Text
                        style={[
                            styles.description,
                            {
                                color:
                                    theme.text,
                            },
                        ]}
                    >
                        Usamos almacenamiento esencial para mantener tu sesión,
                        carrito y preferencias durante tu visita.
                    </Text>
                </View>

                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Entendido"
                    onPress={
                        handleAccept
                    }
                    style={[
                        styles.button,
                        {
                            backgroundColor:
                                theme.primary,
                        },
                    ]}
                >
                    <Text
                        style={[
                            styles.buttonText,
                            {
                                color:
                                    theme.onPrimary,
                            },
                        ]}
                    >
                        Entendido
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}