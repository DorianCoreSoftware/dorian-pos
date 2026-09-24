import React from 'react';

import {
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';

import {
  useBusiness,
} from '../../context/BusinessContext';

import styles from './WebHeader.styles';

interface Props {
  onRewardsPress?:
    () => void;
}

export default function WebHeader({
  onRewardsPress,
}: Props) {
  const {
    business,
    theme,
  } = useBusiness();

  const businessName =
    business?.identity.businessName ??
    'Dorian POS';

  const logoUrl =
    business?.identity.logoUrl;

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
        {logoUrl ? (
          <Image
            source={{
              uri:
                logoUrl,
            }}
            style={
              styles.logo
            }
            resizeMode="contain"
          />
        ) : null}

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
              🎁 Rewards
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}