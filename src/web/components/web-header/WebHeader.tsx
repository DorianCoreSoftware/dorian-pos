import React, { useState } from 'react';

import {
  Image,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import styles from './WebHeader.styles';
import { useBusiness } from '../../../context/BusinessContext';
import { WebHeaderProps } from '../../models/web-header/web-header-props';

export default function WebHeader({
  onRewardsPress,
  onAccountPress,
}: WebHeaderProps) {

  const [
    logoFailed,
    setLogoFailed,
  ] = useState(false);

  const {
    business,
    theme,
  } = useBusiness();

  const businessName =
    business?.identity.businessName ??
    'Dorian POS';

  const logoUrl =
    business?.identity.logoUrl;

  const showLogo =
    !!logoUrl &&
    !logoFailed;

  const {
    width,
  } = useWindowDimensions();

  const isMobile =
    width < 640;

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor:
            theme.surface,

          borderBottomColor:
            theme.border,
        },
      ]}
    >
      <View
        style={
          styles.inner
        }
      >
        {showLogo ? (
          <Image
            source={{
              uri:
                logoUrl,
            }}
            style={
              styles.logo
            }
            resizeMode="contain"
            onError={() =>
              setLogoFailed(true)
            }
          />
        ) : (
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
                    theme.primary,
                },
              ]}
            >
              {businessName}
            </Text>

            <Text
              style={[
                styles.subtitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              Ordena en línea
            </Text>
          </View>
        )}

        <View
          style={
            styles.actions
          }
        >
          {onRewardsPress &&
            business?.features.loyaltyEnabled ? (
            <Pressable
              style={[
                styles.rewardsButton,
                isMobile &&
                styles.mobileButton,
                {
                  borderColor:
                    theme.primary,
                },
              ]}
              onPress={
                onRewardsPress
              }
            >
              <Text
                style={[
                  styles.rewardsButtonText,
                  isMobile &&
                  styles.mobileButtonText,
                  {
                    color:
                      theme.primary,
                  },
                ]}
              >
                🎁 Recompensas
              </Text>
            </Pressable>
          ) : null}

          {onAccountPress ? (
            <Pressable
              style={[
                styles.accountButton,
                isMobile &&
                styles.mobileButton,
                {
                  backgroundColor:
                    theme.primary,
                },
              ]}
              onPress={
                onAccountPress
              }
            >
              <Text
                style={[
                  styles.accountButtonText,
                  isMobile &&
                  styles.mobileButtonText,
                  {
                    color:
                      theme.onPrimary,
                  },
                ]}
              >
                👤 Mi cuenta
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}