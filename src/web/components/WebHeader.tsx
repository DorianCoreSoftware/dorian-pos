import React from 'react';

import {
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';

import styles from './WebHeader.styles';

interface Props {
  onRewardsPress?:
    () => void;
}

export default function WebHeader({
  onRewardsPress,
}: Props) {
  return (
    <View
      style={
        styles.header
      }
    >
      <View
        style={
          styles.inner
        }
      >
        <Image
          source={
            require(
              '../../../assets/BurgerKongWOFondo.png',
            )
          }
          style={
            styles.logo
          }
          resizeMode="contain"
        />

        <View
          style={
            styles.copy
          }
        >
          <Text
            style={
              styles.title
            }
          >
            Burger Kong
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Ordena en línea
          </Text>
        </View>

        {
          onRewardsPress
            ? (
              <Pressable
                style={
                  styles.rewardsButton
                }
                onPress={
                  onRewardsPress
                }
              >
                <Text
                  style={
                    styles.rewardsButtonText
                  }
                >
                  🎁 Rewards
                </Text>
              </Pressable>
            )
            : null
        }
      </View>
    </View>
  );
}