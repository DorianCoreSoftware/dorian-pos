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

interface WebProductCardProps {
  product: Product;

  width:
    DimensionValue;

  onPress:
    (product: Product) => void;
}

function formatPrice(
  price: number,
): string {
  return new Intl.NumberFormat(
    'es-MX',
    {
      style:
        'currency',

      currency:
        'MXN',
    },
  ).format(
    price,
  );
}

export default function WebProductCard({
  product,
  width,
  onPress,
}: WebProductCardProps) {
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
              BK
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
            {formatPrice(
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