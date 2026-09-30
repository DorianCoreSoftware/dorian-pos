import React, {
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Modal,
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

import {
  styles,
  setBrandPrimaryColor,
} from './LoyaltyQrScannerModal.styles';


interface Props {
  visible: boolean;

  onClose: () => void;

  onScanned: (
    value: string,
  ) => void;
}

export function LoyaltyQrScannerModal({
  visible,
  onClose,
  onScanned,
}: Props) {
  const { theme: businessTheme } = useBusiness();
    setBrandPrimaryColor(businessTheme.primary);

  const {
    business,
  } = useBusiness();

  const businessName =
    business?.identity.businessName ??
    'Dorian POS';

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

  const handleBarcodeScanned =
    (
      result:
        BarcodeScanningResult,
    ): void => {
      if (scanned) {
        return;
      }

      const value =
        result.data?.trim();

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
        style={
          styles.container
        }
      >
        {!permission ? (
          <View
            style={
              styles.centerContent
            }
          >
            <ActivityIndicator
              size="large"
              color={businessTheme.primary}
            />

            <Text
              style={
                styles.permissionText
              }
            >
              Verificando cámara...
            </Text>
          </View>
        ) : !permission.granted ? (
          <View
            style={
              styles.centerContent
            }
          >
            <Text
              style={
                styles.permissionTitle
              }
            >
              Cámara requerida
            </Text>

            <Text
              style={
                styles.permissionText
              }
            >
              {businessName} necesita
              acceso a la cámara para
              escanear el QR del cliente.
            </Text>

            <TouchableOpacity
              style={
                styles.permissionButton
              }
              onPress={() => {
                void requestPermission();
              }}
            >
              <Text
                style={
                  styles.permissionButtonText
                }
              >
                Permitir cámara
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={
                styles.cancelButton
              }
              onPress={
                handleClose
              }
            >
              <Text
                style={
                  styles.cancelButtonText
                }
              >
                Cancelar
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
                  : handleBarcodeScanned
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
                  styles.middleRow
                }
              >
                <View
                  style={
                    styles.sideOverlay
                  }
                />

                <View
                  style={
                    styles.scanArea
                  }
                >
                  <View
                    style={[
                      styles.corner,
                      styles.topLeft,
                    ]}
                  />

                  <View
                    style={[
                      styles.corner,
                      styles.topRight,
                    ]}
                  />

                  <View
                    style={[
                      styles.corner,
                      styles.bottomLeft,
                    ]}
                  />

                  <View
                    style={[
                      styles.corner,
                      styles.bottomRight,
                    ]}
                  />
                </View>

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
                    styles.instructions
                  }
                >
                  Coloca el QR del cliente
                  dentro del recuadro
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={
                styles.closeButton
              }
              onPress={
                handleClose
              }
            >
              <Text
                style={
                  styles.closeButtonText
                }
              >
                ✕
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );
}