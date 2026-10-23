import React, {
  useEffect,
  useState,
} from 'react';

import {
  Image,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  useBusiness,
} from '../../../context/BusinessContext';

import {
  WebBanner,
} from '../../../services/webBannerService';

import styles, {
  setBrandPrimaryColor,
} from './WebBannerCarousel.styles';

interface WebBannerCarouselProps {
  banners: WebBanner[];
}

const AUTO_ADVANCE_MS =
  5_000;

export default function WebBannerCarousel({
  banners,
}: WebBannerCarouselProps) {
  const {
    theme,
  } = useBusiness();

  setBrandPrimaryColor(
    theme.primary,
  );

  const {
    width,
  } = useWindowDimensions();

  const [
    activeIndex,
    setActiveIndex,
  ] = useState(0);

  useEffect(
    () => {
      if (
        banners.length === 0
      ) {
        setActiveIndex(0);
        return;
      }

      setActiveIndex(
        current =>
          Math.min(
            current,
            banners.length - 1,
          ),
      );
    },
    [banners.length],
  );

  useEffect(
    () => {
      if (
        banners.length <= 1
      ) {
        return;
      }

      const intervalId =
        setInterval(
          () => {
            setActiveIndex(
              current =>
                (
                  current + 1
                ) %
                banners.length,
            );
          },
          AUTO_ADVANCE_MS,
        );

      return () => {
        clearInterval(
          intervalId,
        );
      };
    },
    [banners.length],
  );

  if (
    banners.length === 0
  ) {
    return null;
  }

  const activeBanner =
    banners[activeIndex] ??
    banners[0];

  const availableWidth =
    Math.min(
      width,
      1180,
    ) - 40;

 const bannerHeight =
  Math.min(
    640,
    Math.max(
      190,
      availableWidth *
      9 / 16,
    ),
  );

  const hasOverlayText =
    !!activeBanner.title ||
    !!activeBanner.description;

  function goPrevious():
    void {
    setActiveIndex(
      current =>
        (
          current - 1 +
          banners.length
        ) %
        banners.length,
    );
  }

  function goNext():
    void {
    setActiveIndex(
      current =>
        (
          current + 1
        ) %
        banners.length,
    );
  }

  function openBannerTarget():
    void {
    const targetUrl =
      activeBanner.targetUrl
        ?.trim();

    if (
      !targetUrl ||
      typeof window === 'undefined'
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
        'URL inválida en banner:',
        targetUrl,
      );
    }
  }

  return (
    <View
      style={
        styles.container
      }
    >
      <View
        style={[
          styles.frame,
          {
            height:
              bannerHeight,
          },
        ]}
      >
        <Pressable
          accessibilityRole={
            activeBanner.targetUrl
              ? 'link'
              : undefined
          }
          accessibilityLabel={
            activeBanner.targetUrl
              ? `Abrir ${activeBanner.title || 'publicidad'}`
              : undefined
          }
          disabled={
            !activeBanner.targetUrl
          }
          onPress={
            openBannerTarget
          }
          style={
            styles.bannerLink
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
            resizeMode="cover"
          />

          {hasOverlayText && (
            <View
              style={
                styles.overlay
              }
            >
              {!!activeBanner.title && (
                <Text
                  style={
                    styles.title
                  }
                >
                  {activeBanner.title}
                </Text>
              )}

              {!!activeBanner.description && (
                <Text
                  style={
                    styles.description
                  }
                >
                  {activeBanner.description}
                </Text>
              )}
            </View>
          )}
        </Pressable>

        {banners.length > 1 && (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Publicidad anterior"
              onPress={
                goPrevious
              }
              style={({
                pressed,
              }) => [
                  styles.arrowButton,
                  styles.arrowLeft,
                  pressed &&
                  styles.arrowPressed,
                ]}
            >
              <Text
                style={
                  styles.arrowText
                }
              >
                ‹
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Publicidad siguiente"
              onPress={
                goNext
              }
              style={({
                pressed,
              }) => [
                  styles.arrowButton,
                  styles.arrowRight,
                  pressed &&
                  styles.arrowPressed,
                ]}
            >
              <Text
                style={
                  styles.arrowText
                }
              >
                ›
              </Text>
            </Pressable>
          </>
        )}
      </View>

      {banners.length > 1 && (
        <View
          style={
            styles.indicators
          }
        >
          {banners.map(
            (banner, index) => (
              <Pressable
                key={
                  banner.id
                }
                accessibilityRole="button"
                accessibilityLabel={`Ir a publicidad ${index + 1}`}
                onPress={() =>
                  setActiveIndex(
                    index,
                  )
                }
                style={[
                  styles.indicator,
                  index ===
                    activeIndex &&
                  styles.indicatorActive,
                ]}
              />
            ),
          )}
        </View>
      )}
    </View>
  );
}
