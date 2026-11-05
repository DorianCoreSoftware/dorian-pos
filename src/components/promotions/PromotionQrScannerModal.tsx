import React, {
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from 'expo-camera';

import {
  useBusiness,
} from '../../context/BusinessContext';

interface PromotionQrScannerModalProps {
  visible: boolean;
  title?: string;
  helperText?: string;
  onClose: () => void;
  onScanned: (
    value: string,
  ) => void;
}

export function PromotionQrScannerModal({
  visible,
  title = 'Escanear cupón',
  helperText = 'Apunta la cámara al código QR impreso en el ticket.',
  onClose,
  onScanned,
}: PromotionQrScannerModalProps) {
  const {
    theme,
  } = useBusiness();

  const [
    permission,
    requestPermission,
  ] = useCameraPermissions();

  const [
    scanned,
    setScanned,
  ] = useState(false);

  useEffect(
    () => {
      if (visible) {
        setScanned(false);
      }
    },
    [
      visible,
    ],
  );

  const handleScanned = (
    result:
      BarcodeScanningResult,
  ): void => {
    if (scanned) {
      return;
    }

    const value =
      result.data
        ?.trim();

    if (!value) {
      return;
    }

    setScanned(true);

    onScanned(
      value,
    );
  };

  const handleClose =
    (): void => {
      setScanned(false);
      onClose();
    };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={
        visible
      }
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={
        handleClose
      }
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor:
              theme.background,
          },
        ]}
      >
        {!permission ? (
          <View
            style={
              styles.center
            }
          >
            <ActivityIndicator
              size="large"
              color={
                theme.primary
              }
            />

            <Text
              style={[
                styles.helper,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Verificando cámara...
            </Text>
          </View>
        ) : !permission.granted ? (
          <View
            style={
              styles.center
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
              Cámara requerida
            </Text>

            <Text
              style={[
                styles.helper,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Permite el acceso a la cámara para escanear cupones promocionales.
            </Text>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                {
                  backgroundColor:
                    theme.primary,
                },
              ]}
              onPress={() => {
                void requestPermission();
              }}
            >
              <Text
                style={[
                  styles.primaryButtonText,
                  {
                    color:
                      theme.onPrimary,
                  },
                ]}
              >
                PERMITIR CÁMARA
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                {
                  borderColor:
                    theme.border,
                },
              ]}
              onPress={
                handleClose
              }
            >
              <Text
                style={{
                  color:
                    theme.text,
                  fontWeight:
                    '700',
                }}
              >
                CANCELAR
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <CameraView
              style={
                styles.camera
              }
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: [
                  'qr',
                ],
              }}
              onBarcodeScanned={
                scanned
                  ? undefined
                  : handleScanned
              }
            />

            <View
              pointerEvents="none"
              style={
                styles.overlay
              }
            >
              <View
                style={
                  styles.topOverlay
                }
              />

              <View
                style={
                  styles.middle
                }
              >
                <View
                  style={
                    styles.sideOverlay
                  }
                />

                <View
                  style={[
                    styles.scanArea,
                    {
                      borderColor:
                        theme.primary,
                    },
                  ]}
                />

                <View
                  style={
                    styles.sideOverlay
                  }
                />
              </View>

              <View
                style={
                  styles.bottomOverlay
                }
              >
                <Text
                  style={
                    styles.cameraTitle
                  }
                >
                  {title}
                </Text>

                <Text
                  style={
                    styles.cameraHelper
                  }
                >
                  {helperText}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.closeButton,
                {
                  backgroundColor:
                    theme.surface,
                  borderColor:
                    theme.border,
                },
              ]}
              onPress={
                handleClose
              }
            >
              <Text
                style={{
                  color:
                    theme.text,
                  fontWeight:
                    '800',
                }}
              >
                CERRAR
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
    },

    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
    },

    title: {
      fontSize: 22,
      fontWeight: '900',
      textAlign: 'center',
    },

    helper: {
      marginTop: 10,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },

    primaryButton: {
      minWidth: 220,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      marginTop: 22,
      paddingHorizontal: 18,
    },

    primaryButtonText: {
      fontWeight: '900',
    },

    secondaryButton: {
      minWidth: 220,
      minHeight: 46,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderRadius: 10,
      marginTop: 10,
      paddingHorizontal: 18,
    },

    camera: {
      flex: 1,
    },

    overlay: {
      ...StyleSheet.absoluteFillObject,
    },

    topOverlay: {
      flex: 1,
      backgroundColor:
        'rgba(0,0,0,0.58)',
    },

    middle: {
      flexDirection: 'row',
      height: 260,
    },

    sideOverlay: {
      flex: 1,
      backgroundColor:
        'rgba(0,0,0,0.58)',
    },

    scanArea: {
      width: 260,
      height: 260,
      borderWidth: 3,
      borderRadius: 18,
    },

    bottomOverlay: {
      flex: 1.25,
      alignItems: 'center',
      paddingTop: 30,
      paddingHorizontal: 24,
      backgroundColor:
        'rgba(0,0,0,0.58)',
    },

    cameraTitle: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '900',
      textAlign: 'center',
    },

    cameraHelper: {
      color: '#DDDDDD',
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
      marginTop: 8,
      maxWidth: 360,
    },

    closeButton: {
      position: 'absolute',
      left: 24,
      right: 24,
      bottom: 28,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderRadius: 12,
    },
  });
