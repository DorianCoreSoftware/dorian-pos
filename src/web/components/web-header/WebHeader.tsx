import React, { useState } from 'react';

import {
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';

import styles from './WebHeader.styles';
import { useBusiness } from '../../../context/BusinessContext';

interface Props {
  onRewardsPress?:
  () => void;

  onAccountPress?:
  () => void;
}

export default function WebHeader({
  onRewardsPress,
  onAccountPress,
}: Props) {

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