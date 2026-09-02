import React from 'react';

import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Product } from '../../types';

import { styles } from './MenuList.styles';

interface MenuListProps {
  products: Product[];

  onProductPress: (
    product: Product,
  ) => void;

  onRefreshMenu?:
    () => void | Promise<void>;
}

export const MenuList: React.FC<
  MenuListProps
> = ({
  products,
  onProductPress,
}) => {
  const visibleProducts =
    products.filter(
      (product) =>
        product.is_active !== false,
    );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={visibleProducts}
        keyExtractor={
          (item) => item.id
        }
        numColumns={2}
        columnWrapperStyle={
          styles.gridRow
        }
        contentContainerStyle={
          styles.menuList
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={
              styles.productCard
            }
            activeOpacity={0.7}
            onPress={() =>
              onProductPress(item)
            }
          >
            <View
              style={
                styles.cardInfo
              }
            >
              <Text
                style={
                  styles.productName
                }
              >
                {item.name}
              </Text>

              <Text
                style={
                  styles.productDescription
                }
                numberOfLines={2}
              >
                {item.description ||
                  'Receta tradicional de Burger Kong.'}
              </Text>
            </View>

            <View
              style={
                styles.cardPriceRow
              }
            >
              <View
                style={
                  styles.priceContainer
                }
              >
                <Text
                  style={
                    styles.productPrice
                  }
                >
                  $
                  {Number(
                    item.price,
                  ).toFixed(2)}
                </Text>
              </View>

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
                  +
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};