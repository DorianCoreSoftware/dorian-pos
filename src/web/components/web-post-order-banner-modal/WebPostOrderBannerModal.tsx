import React, {
  useEffect,
  useState,
} from 'react';

import {
  Image,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';

import {
  WebBanner,
} from '../../../services/webBannerService';

import {
  useBusiness,
} from '../../../context/BusinessContext';

import styles, {
  setBrandPrimaryColor,
} from './WebPostOrderBannerModal.styles';

interface WebPostOrderBannerModalProps {
  visible: boolean;
  banners: WebBanner[];
  onClose: () => void;
}

export default function WebPostOrderBannerModal({
  visible,
  banners,
  onClose,
}: WebPostOrderBannerModalProps) {
  const {
    theme,
  } = useBusiness();

  setBrandPrimaryColor(
    theme.primary,
  );

  const [
    activeIndex,
    setActiveIndex,
  ] = useState(0);

  useEffect(
    () => {
      if (visible) {
        setActiveIndex(0);
      }
    },
    [visible],
  );

  if (
    banners.length === 0
  ) {
    return null;
  }

  const activeBanner =
    banners[
      Math.min(
        activeIndex,
        banners.length - 1,
      )
    ];

  function openTarget():
    void {
    const targetUrl =
      activeBanner.targetUrl
        ?.trim();

    if (
      !targetUrl ||
      typeof window ===
        'undefined'
    ) {
      return;
    }

    if (
      targetUrl === '/' ||
      (
        targetUrl.startsWith('/') &&
        !targetUrl.startsWith('//')
      )
    ) {
      window.location.assign(
        targetUrl,
      );
      return;
    }

    try {
      const target =
        new URL(
          targetUrl,
          window.location.origin,
        );

      if (
        target.origin ===
        window.location.origin
      ) {
        window.location.assign(
          target.href,
        );
        return;
      }

      window.open(
        target.href,
        '_blank',
        'noopener,noreferrer',
      );
    } catch {
      console.warn(
        'URL inválida en publicidad post-pedido:',
        targetUrl,
      );
    }
  }

  const canPrevious =
    activeIndex > 0;

  const canNext =
    activeIndex <
    banners.length - 1;

  return (
    <Modal
      visible={
        visible
      }
      transparent
      animationType="fade"
      onRequestClose={
        onClose
      }
    >
      <View
        style={
          styles.backdrop
        }
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor:
                theme.surface,
              borderColor:
                theme.border,
            },
          ]}
        >
          <View
            style={
              styles.header
            }
          >
            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={[
                  styles.eyebrow,
                  {
                    color:
                      theme.primary,
                  },
                ]}
              >
                PARA TI
              </Text>

              <Text
                style={[
                  styles.title,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {activeBanner.title ||
                  'Antes de irte'}
              </Text>
            </View>

            <Pressable
              onPress={
                onClose
              }
              style={[
                styles.closeButton,
                {
                  borderColor:
                    theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.closeText,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                ×
              </Text>
            </Pressable>
          </View>

          <Pressable
            disabled={
              !activeBanner.targetUrl
            }
            onPress={
              openTarget
            }
            style={
              styles.imageButton
            }
          >
            <Image
              source={{
                uri:
                  activeBanner.imageUrl,
              }}
              style={
                styles.image
              }
              resizeMode="contain"
            />
          </Pressable>

          {!!activeBanner.description && (
            <Text
              style={[
                styles.description,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              {activeBanner.description}
            </Text>
          )}

          {banners.length >
            1 && (
            <View
              style={
                styles.pagination
              }
            >
              <Pressable
                disabled={
                  !canPrevious
                }
                onPress={() =>
                  setActiveIndex(
                    current =>
                      Math.max(
                        0,
                        current - 1,
                      ),
                  )
                }
                style={[
                  styles.navButton,
                  {
                    borderColor:
                      theme.border,
                  },
                  !canPrevious &&
                  styles.disabled,
                ]}
              >
                <Text
                  style={{
                    color:
                      theme.text,
                    fontWeight:
                      '800',
                  }}
                >
                  ‹ Anterior
                </Text>
              </Pressable>

              <Text
                style={[
                  styles.counter,
                  {
                    color:
                      theme.textMuted,
                  },
                ]}
              >
                {activeIndex + 1}
                {' / '}
                {banners.length}
              </Text>

              <Pressable
                disabled={
                  !canNext
                }
                onPress={() =>
                  setActiveIndex(
                    current =>
                      Math.min(
                        banners.length - 1,
                        current + 1,
                      ),
                  )
                }
                style={[
                  styles.navButton,
                  {
                    borderColor:
                      theme.border,
                  },
                  !canNext &&
                  styles.disabled,
                ]}
              >
                <Text
                  style={{
                    color:
                      theme.text,
                    fontWeight:
                      '800',
                  }}
                >
                  Siguiente ›
                </Text>
              </Pressable>
            </View>
          )}

          {!!activeBanner.targetUrl && (
            <Pressable
              onPress={
                openTarget
              }
              style={[
                styles.cta,
                {
                  backgroundColor:
                    theme.primary,
                },
              ]}
            >
              <Text
                style={
                  styles.ctaText
                }
              >
                Ver más
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={
              onClose
            }
            style={[
              styles.dismiss,
              {
                borderColor:
                  theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.dismissText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              Continuar
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
