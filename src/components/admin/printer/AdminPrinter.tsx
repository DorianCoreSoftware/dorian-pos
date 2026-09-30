import { useBusiness } from '../../../context/BusinessContext';

import React, {
    useEffect,
    useState,
} from 'react';

import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import {
    BluetoothDevice,
} from 'react-native-bluetooth-classic';

import {
    PrinterSettings,
} from '../../../repositories/PrinterSettingsRepository';

import {
    getActivePrinterSettings,
    savePrinterSettings,
} from '../../../services/printerSettingsService';

import {
    getPairedBluetoothDevices,
    printTestTicket,
    resetPrinterConnection,
} from '../../../services/printerService';
import {
  styles,
  setBrandPrimaryColor,
} from './AdminPrinter.styles';



export function AdminPrinter() {
  const { theme: businessTheme } = useBusiness();
    setBrandPrimaryColor(businessTheme.primary);

    const [
        settings,
        setSettings,
    ] =
        useState<PrinterSettings | null>(
            null,
        );

    const [
        name,
        setName,
    ] =
        useState('');

    const [
        bluetoothAddress,
        setBluetoothAddress,
    ] =
        useState('');

    const [
        devices,
        setDevices,
    ] =
        useState<BluetoothDevice[]>(
            [],
        );

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    const [
        searching,
        setSearching,
    ] =
        useState(false);

    const [
        saving,
        setSaving,
    ] =
        useState(false);

    const [
        printing,
        setPrinting,
    ] =
        useState(false);

    useEffect(
        () => {
            void loadSettings();
        },
        [],
    );

    const loadSettings =
        async (): Promise<void> => {
            try {
                setLoading(
                    true,
                );

                const result =
                    await getActivePrinterSettings();

                setSettings(
                    result,
                );

                setName(
                    result?.name ?? '',
                );

                setBluetoothAddress(
                    result?.bluetoothAddress ??
                    '',
                );
            } catch (error) {
                Alert.alert(
                    'Error',
                    getErrorMessage(
                        error,
                    ),
                );
            } finally {
                setLoading(
                    false,
                );
            }
        };

    const searchDevices =
        async (): Promise<void> => {
            try {
                setSearching(
                    true,
                );

                const result =
                    await getPairedBluetoothDevices();

                setDevices(
                    result,
                );

                if (
                    result.length === 0
                ) {
                    Alert.alert(
                        'Sin dispositivos',
                        'No hay dispositivos Bluetooth emparejados.',
                    );
                }
            } catch (error) {
                Alert.alert(
                    'Bluetooth',
                    getErrorMessage(
                        error,
                    ),
                );
            } finally {
                setSearching(
                    false,
                );
            }
        };

    const selectDevice = (
        device: BluetoothDevice,
    ): void => {
        setName(
            device.name ||
            'Impresora Bluetooth',
        );

        setBluetoothAddress(
            device.address,
        );
    };

    const handleSave =
        async (): Promise<void> => {
            if (!settings) {
                Alert.alert(
                    'Configuración',
                    'No existe una configuración de impresora para actualizar.',
                );

                return;
            }

            try {
                setSaving(
                    true,
                );

                /*
                 * Desconectamos cualquier
                 * impresora previamente
                 * almacenada en memoria.
                 */
                await resetPrinterConnection();

                const updated =
                    await savePrinterSettings(
                        settings.id,
                        {
                            name,
                            connectionType:
                                'bluetooth',
                            bluetoothAddress,
                            ipAddress:
                                null,
                            port:
                                null,
                            isActive:
                                true,
                        },
                    );

                setSettings(
                    updated,
                );

                setName(
                    updated.name,
                );

                setBluetoothAddress(
                    updated.bluetoothAddress ??
                    '',
                );

                Alert.alert(
                    'Configuración guardada',
                    'La impresora se actualizó correctamente.',
                );
            } catch (error) {
                Alert.alert(
                    'Error',
                    getErrorMessage(
                        error,
                    ),
                );
            } finally {
                setSaving(
                    false,
                );
            }
        };

    const handleTest =
        async (): Promise<void> => {
            try {
                setPrinting(
                    true,
                );

                await printTestTicket();

                Alert.alert(
                    'Impresión enviada',
                    'La prueba se imprimió correctamente.',
                );
            } catch (error) {
                Alert.alert(
                    'Error de impresora',
                    getErrorMessage(
                        error,
                    ),
                );
            } finally {
                setPrinting(
                    false,
                );
            }
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
                />

                <Text
                    style={
                        styles.loadingText
                    }
                >
                    Cargando configuración...
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
                styles.content
            }
        >
            <View
                style={
                    styles.card
                }
            >
                <Text
                    style={
                        styles.title
                    }
                >
                    Impresora de tickets
                </Text>

                <Text
                    style={
                        styles.subtitle
                    }
                >
                    Configura la impresora
                    utilizada por el punto de
                    venta.
                </Text>

                <Text
                    style={
                        styles.label
                    }
                >
                    Nombre
                </Text>

                <TextInput
                    value={
                        name
                    }
                    onChangeText={
                        setName
                    }
                    style={
                        styles.input
                    }
                    placeholder="Nombre de la impresora"
                    placeholderTextColor="#666666"
                />

                <Text
                    style={
                        styles.label
                    }
                >
                    Tipo de conexión
                </Text>

                <View
                    style={
                        styles.readOnlyField
                    }
                >
                    <Text
                        style={
                            styles.readOnlyText
                        }
                    >
                        Bluetooth
                    </Text>
                </View>

                <Text
                    style={
                        styles.label
                    }
                >
                    Dirección Bluetooth
                </Text>

                <View
                    style={
                        styles.addressRow
                    }
                >
                    <TextInput
                        value={
                            bluetoothAddress
                        }
                        editable={
                            false
                        }
                        style={[
                            styles.input,
                            styles.addressInput,
                        ]}
                        placeholder="Sin dispositivo seleccionado"
                        placeholderTextColor="#666666"
                    />

                    <TouchableOpacity
                        style={
                            styles.searchButton
                        }
                        disabled={
                            searching
                        }
                        onPress={() => {
                            void searchDevices();
                        }}
                    >
                        <Text
                            style={
                                styles.searchButtonText
                            }
                        >
                            {searching
                                ? 'Buscando...'
                                : 'Buscar dispositivos'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {devices.length >
                    0 && (
                        <View
                            style={
                                styles.devicesContainer
                            }
                        >
                            <Text
                                style={
                                    styles.devicesTitle
                                }
                            >
                                Dispositivos emparejados
                            </Text>

                            {devices.map(
                                (
                                    device,
                                ) => {
                                    const selected =
                                        normalizeAddress(
                                            device.address,
                                        ) ===
                                        normalizeAddress(
                                            bluetoothAddress,
                                        );

                                    return (
                                        <TouchableOpacity
                                            key={
                                                device.address
                                            }
                                            style={[
                                                styles.deviceRow,

                                                selected &&
                                                styles.deviceRowSelected,
                                            ]}
                                            onPress={() =>
                                                selectDevice(
                                                    device,
                                                )
                                            }
                                        >
                                            <View
                                                style={
                                                    styles.deviceInfo
                                                }
                                            >
                                                <Text
                                                    style={
                                                        styles.deviceName
                                                    }
                                                >
                                                    {device.name ||
                                                        'Dispositivo Bluetooth'}
                                                </Text>

                                                <Text
                                                    style={
                                                        styles.deviceAddress
                                                    }
                                                >
                                                    {device.address}
                                                </Text>
                                            </View>

                                            {selected && (
                                                <Text
                                                    style={
                                                        styles.selectedText
                                                    }
                                                >
                                                    ✓
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    );
                                },
                            )}
                        </View>
                    )}

                <View
                    style={
                        styles.actions
                    }
                >
                    <TouchableOpacity
                        style={[
                            styles.testButton,

                            printing &&
                            styles.buttonDisabled,
                        ]}
                        disabled={
                            printing ||
                            saving
                        }
                        onPress={() => {
                            void handleTest();
                        }}
                    >
                        <Text
                            style={
                                styles.testButtonText
                            }
                        >
                            {printing
                                ? 'Imprimiendo...'
                                : '🖨️ Probar impresión'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.saveButton,

                            saving &&
                            styles.buttonDisabled,
                        ]}
                        disabled={
                            saving ||
                            printing
                        }
                        onPress={() => {
                            void handleSave();
                        }}
                    >
                        <Text
                            style={
                                styles.saveButtonText
                            }
                        >
                            {saving
                                ? 'Guardando...'
                                : 'Guardar cambios'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}

function normalizeAddress(
    value: string,
): string {
    return value
        .trim()
        .toUpperCase();
}

function getErrorMessage(
    error: unknown,
): string {
    return error instanceof Error
        ? error.message
        : 'Ocurrió un error inesperado.';
}