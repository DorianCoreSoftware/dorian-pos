import { useBusiness } from '../../context/BusinessContext';

import React, {
  useMemo,
  useState,
} from 'react';

import {
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Product } from '../../types';
import {
  styles,
  setBrandPrimaryColor,
} from './MenuList.styles';
import { useCurrency } from '../../hooks/useCurrency';

export type MenuViewMode =
  | 'large'
  | 'medium'
  | 'compact'
  | 'list';

interface MenuListProps {
  products: Product[];

  onProductPress: (
    product: Product,
  ) => void;

  onRefreshMenu?:
  () => void | Promise<void>;
}

const VIEW_OPTIONS: Array<{
  mode: MenuViewMode;
  icon: string;
  label: string;
}> = [
    {
      mode: 'large',
      icon: '▦',
      label: 'Grandes',
    },
    {
      mode: 'medium',
      icon: '▦',
      label: 'Medianos',
    },
    {
      mode: 'compact',
      icon: '▦',
      label: 'Compactos',
    },
    {
      mode: 'list',
      icon: '☰',
      label: 'Lista',
    },
  ];

export const MenuList: React.FC<
  MenuListProps
> = ({
  products,
  onProductPress,
  onRefreshMenu,
}) => {
  const { theme: businessTheme } = useBusiness();
    setBrandPrimaryColor(businessTheme.primary);

    const {
      formatCurrency,
    } = useCurrency();

    const [
      viewMode,
      setViewMode,
    ] = useState<MenuViewMode>(
      'compact',
    );

    const visibleProducts =
      useMemo(
        () =>
          products.filter(
            (product) =>
              product.is_active !==
              false,
          ),
        [products],
      );

    const numColumns =
      getColumnsByView(
        viewMode,
      );

    const isList =
      viewMode === 'list';

    const showDescription = true;

    return (
      <View style={styles.container}>
        <View
          style={
            styles.viewToolbar
          }
        >
          <Text
            style={
              styles.viewToolbarLabel
            }
          >
            Vista
          </Text>

          <View
            style={
              styles.viewButtons
            }
          >
            {VIEW_OPTIONS.map(
              (option) => {
                const isSelected =
                  viewMode ===
                  option.mode;

                return (
                  <TouchableOpacity
                    key={
                      option.mode
                    }
                    style={[
                      styles.viewButton,

                      isSelected &&
                      styles.viewButtonSelected,
                    ]}
                    activeOpacity={
                      0.75
                    }
                    onPress={() =>
                      setViewMode(
                        option.mode,
                      )
                    }
                    accessibilityRole="button"
                    accessibilityLabel={
                      `Vista ${option.label}`
                    }
                  >
                    <Text
                      style={[
                        styles.viewButtonIcon,

                        isSelected &&
                        styles.viewButtonIconSelected,
                      ]}
                    >
                      {
                        option.icon
                      }
                    </Text>

                    <Text
                      style={[
                        styles.viewButtonText,

                        isSelected &&
                        styles.viewButtonTextSelected,
                      ]}
                      numberOfLines={
                        1
                      }
                    >
                      {
                        option.label
                      }
                    </Text>
                  </TouchableOpacity>
                );
              },
            )}
          </View>
        </View>

        <FlatList
          key={viewMode}
          data={
            visibleProducts
          }
          keyExtractor={
            (item) => item.id
          }
          numColumns={
            numColumns
          }
          columnWrapperStyle={
            isList
              ? undefined
              : styles.gridRow
          }
          contentContainerStyle={
            styles.menuList
          }
          refreshing={false}
          onRefresh={
            onRefreshMenu
              ? () => {
                void onRefreshMenu();
              }
              : undefined
          }
          renderItem={({
            item,
          }) => (
            <TouchableOpacity
              style={[
                styles.productCard,

                viewMode ===
                'large' &&
                styles.productCardLarge,

                viewMode ===
                'medium' &&
                styles.productCardMedium,

                viewMode ===
                'compact' &&
                styles.productCardCompact,

                isList &&
                styles.productCardList,
              ]}
              activeOpacity={0.7}
              onPress={() =>
                onProductPress(
                  item,
                )
              }
            >
              <ProductImage
                item={item}
                viewMode={
                  viewMode
                }
              />

              <View
                style={[
                  styles.cardInfo,

                  isList &&
                  styles.cardInfoList,
                ]}
              >
                <Text
                  style={[
                    styles.productName,

                    viewMode ===
                    'medium' &&
                    styles.productNameMedium,

                    viewMode ===
                    'compact' &&
                    styles.productNameCompact,
                  ]}
                  numberOfLines={
                    isList
                      ? 2
                      : viewMode ===
                        'compact'
                        ? 2
                        : 3
                  }
                >
                  {item.name}
                </Text>

                {showDescription ? (
                  <Text
                    style={[
                      styles.productDescription,

                      viewMode === 'medium' &&
                      styles.productDescriptionMedium,

                      viewMode === 'compact' &&
                      styles.productDescriptionCompact,
                    ]}
                    numberOfLines={
                      viewMode === 'compact'
                        ? 2
                        : 2
                    }
                  >
                    {item.description ||
                      'Producto del menú.'}
                  </Text>
                ) : null}

                {isList ? (
                  <View
                    style={
                      styles.listPriceRow
                    }
                  >
                    <Text
                      style={
                        styles.productPrice
                      }
                    >
                      {formatCurrency(
                        Number(
                          item.price,
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
                        +
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>

              {!isList ? (
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
                      style={[
                        styles.productPrice,

                        viewMode ===
                        'compact' &&
                        styles.productPriceCompact,
                      ]}
                    >
                      {formatCurrency(
                        Number(
                          item.price,
                        ),
                      )}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.addButton,

                      viewMode ===
                      'compact' &&
                      styles.addButtonCompact,
                    ]}
                  >
                    <Text
                      style={[
                        styles.addButtonText,

                        viewMode ===
                        'compact' &&
                        styles.addButtonTextCompact,
                      ]}
                    >
                      +
                    </Text>
                  </View>
                </View>
              ) : null}
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

function ProductImage({
  item,
  viewMode,
}: {
  item: Product;
  viewMode: MenuViewMode;
}) {
  const isList =
    viewMode === 'list';

  const imageStyle = [
    styles.productImage,

    viewMode ===
    'medium' &&
    styles.productImageMedium,

    viewMode ===
    'compact' &&
    styles.productImageCompact,

    isList &&
    styles.productImageList,
  ];

  if (item.image_url) {
    return (
      <Image
        source={{
          uri: item.image_url,
        }}
        style={imageStyle}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={[
        styles.productImagePlaceholder,

        viewMode ===
        'medium' &&
        styles.productImageMedium,

        viewMode ===
        'compact' &&
        styles.productImageCompact,

        isList &&
        styles.productImageList,
      ]}
    >
      <Text
        style={[
          styles.productImagePlaceholderText,

          viewMode ===
          'compact' &&
          styles.productImagePlaceholderTextCompact,

          isList &&
          styles.productImagePlaceholderTextList,
        ]}
      >
        🍔
      </Text>
    </View>
  );
}

function getColumnsByView(
  viewMode: MenuViewMode,
): number {
  switch (viewMode) {
    case 'medium':
      return 3;

    case 'compact':
      return 4;

    case 'list':
      return 1;

    case 'large':
    default:
      return 2;
  }
}