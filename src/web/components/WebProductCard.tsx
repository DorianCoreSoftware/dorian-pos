import React from 'react';

import {
  DimensionValue,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';

import {
  Product,
} from '../../types';

import styles from './WebProductCard.styles';

import {
  useBusiness,
} from '../../context/BusinessContext';

import {
  useCurrency,
} from '../../hooks/useCurrency';

interface WebProductCardProps {
  product: Product;

  width:
    DimensionValue;

  onPress:
    (product: Product) => void;
}

export default function WebProductCard({
  product,
  width,
  onPress,
}: WebProductCardProps) {
  const {
    business,
  } = useBusiness();

  const {
    formatCurrency,
  } = useCurrency();

  const placeholderText =
    business?.identity.shortName
      ?.trim()
      .slice(0, 2)
      .toUpperCase() ||
    'DP';

  return (
    <Pressable
      onPress={() =>
        onPress(
          product,
        )
      }
      style={({ pressed }) => [
        styles.card,

        {
          width,
        },

        pressed
          ? styles.cardPressed
          : null,
      ]}
    >
      <View
        style={
          styles.imageBox
        }
      >
        {product.image_url ? (
          <Image
            source={{
              uri:
                product.image_url,
            }}
            style={
              styles.image
            }
            resizeMode="cover"
          />
        ) : (
          <View
            style={
              styles.imagePlaceholder
            }
          >
            <Text
              style={
                styles.placeholderText
              }
            >
              {placeholderText}
            </Text>
          </View>
        )}
      </View>

      <View
        style={
          styles.body
        }
      >
        <View
          style={
            styles.nameBox
          }
        >
          <Text
            style={
              styles.name
            }
            numberOfLines={
              2
            }
          >
            {product.name}
          </Text>
        </View>

        <View
          style={
            styles.descriptionBox
          }
        >
          {!!product.description && (
            <Text
              style={
                styles.description
              }
              numberOfLines={
                3
              }
            >
              {
                product.description
              }
            </Text>
          )}
        </View>

        <View
          style={
            styles.footer
          }
        >
          <Text
            style={
              styles.price
            }
          >
            {formatCurrency(
              Number(
                product.price,
              ),
            )}
          </Text>

          <View
            style={
              styles.addButton
            }
          >
            <Text
              style={
                styles.addButtonText
              }
            >
              Agregar
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}