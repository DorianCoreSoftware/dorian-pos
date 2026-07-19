import React, {
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Product } from '../../types';

import { useAuth } from '../../context/AuthContext';

import {
  deleteProduct,
  updateProduct,
} from '../../services/products';

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
  onRefreshMenu,
}) => {
    const { user } = useAuth();

    const isAdmin =
      user?.role === 'admin';

    const [
      selectedProduct,
      setSelectedProduct,
    ] = useState<Product | null>(null);

    const [
      productName,
      setProductName,
    ] = useState('');

    const [
      productDescription,
      setProductDescription,
    ] = useState('');

    const [
      productPrice,
      setProductPrice,
    ] = useState('');

    const [
      isUpdating,
      setIsUpdating,
    ] = useState(false);

    const [
      isDeleting,
      setIsDeleting,
    ] = useState(false);

    const isProcessing =
      isUpdating || isDeleting;

    const handleOpenEditModal = (
      product: Product,
    ): void => {
      setSelectedProduct(product);
      setProductName(product.name);

      setProductDescription(
        product.description ?? '',
      );

      setProductPrice(
        String(product.price),
      );
    };

    const handleCloseEditModal =
      (): void => {
        if (isProcessing) {
          return;
        }

        setSelectedProduct(null);
        setProductName('');
        setProductDescription('');
        setProductPrice('');
      };

    const handleUpdateProduct =
      async (): Promise<void> => {
        if (!selectedProduct) {
          return;
        }

        const cleanName =
          productName.trim();

        const parsedPrice =
          Number(productPrice);

        if (!cleanName) {
          Alert.alert(
            'Campo requerido',
            'Por favor, ingresa el nombre del producto.',
          );

          return;
        }

        if (
          !Number.isFinite(parsedPrice) ||
          parsedPrice <= 0
        ) {
          Alert.alert(
            'Precio inválido',
            'Por favor, ingresa un número mayor a 0.',
          );

          return;
        }

        try {
          setIsUpdating(true);

          await updateProduct(
            selectedProduct.id,
            {
              name: cleanName,
              description:
                productDescription,
              price: parsedPrice,
            },
          );

          Alert.alert(
            'Éxito',
            `${cleanName} ha sido actualizado.`,
          );

          handleCloseEditModal();

          await onRefreshMenu?.();
        } catch (error) {
          console.error(
            'Error al actualizar el producto:',
            error,
          );

          Alert.alert(
            'Error',
            error instanceof Error
              ? error.message
              : 'No se pudo actualizar el producto.',
          );
        } finally {
          setIsUpdating(false);
        }
      };

    const handleDeleteProduct =
      (): void => {
        if (!selectedProduct) {
          return;
        }

        Alert.alert(
          'Eliminar producto',
          `¿Estás seguro de que deseas eliminar "${selectedProduct.name}"?`,
          [
            {
              text: 'Cancelar',
              style: 'cancel',
            },
            {
              text: 'Eliminar',
              style: 'destructive',
              onPress: async () => {
                try {
                  setIsDeleting(true);

                  await deleteProduct(
                    selectedProduct.id,
                  );

                  Alert.alert(
                    'Éxito',
                    'El producto ha sido eliminado.',
                  );

                  handleCloseEditModal();

                  await onRefreshMenu?.();
                } catch (error) {
                  console.error(
                    'Error al eliminar el producto:',
                    error,
                  );

                  Alert.alert(
                    'Error',
                    error instanceof Error
                      ? error.message
                      : 'No se pudo eliminar el producto.',
                  );
                } finally {
                  setIsDeleting(false);
                }
              },
            },
          ],
        );
      };

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
                style={styles.cardInfo}
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

                  {isAdmin && (
                    <TouchableOpacity
                      style={
                        styles.editPriceBadge
                      }
                      onPress={() =>
                        handleOpenEditModal(
                          item,
                        )
                      }
                    >
                      <Text
                        style={
                          styles.editPriceText
                        }
                      >
                        Editar
                      </Text>
                    </TouchableOpacity>
                  )}
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

        {selectedProduct && (
          <Modal
            visible
            transparent
            animationType="fade"
            onRequestClose={
              handleCloseEditModal
            }
          >
            <View
              style={
                styles.modalOverlay
              }
            >
              <View
                style={
                  styles.modalContent
                }
              >
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  Editar producto
                </Text>

                <Text
                  style={
                    styles.inputLabel
                  }
                >
                  Nombre del producto
                </Text>

                <TextInput
                  style={
                    styles.modalInput
                  }
                  value={productName}
                  onChangeText={
                    setProductName
                  }
                  placeholder="Ej. Hamburguesa Especial"
                  placeholderTextColor="#666"
                  editable={
                    !isProcessing
                  }
                />

                <Text
                  style={
                    styles.inputLabel
                  }
                >
                  Descripción
                </Text>

                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      height: 60,
                      textAlignVertical:
                        'top',
                    },
                  ]}
                  value={
                    productDescription
                  }
                  onChangeText={
                    setProductDescription
                  }
                  placeholder="Describe los ingredientes o tamaño..."
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={3}
                  editable={
                    !isProcessing
                  }
                />

                <Text
                  style={
                    styles.inputLabel
                  }
                >
                  Precio
                </Text>

                <TextInput
                  style={
                    styles.modalInput
                  }
                  keyboardType="decimal-pad"
                  value={productPrice}
                  onChangeText={
                    setProductPrice
                  }
                  placeholder="0.00"
                  placeholderTextColor="#666"
                  editable={
                    !isProcessing
                  }
                />

                <View
                  style={
                    styles.modalButtons
                  }
                >
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.cancelButton,
                    ]}
                    onPress={
                      handleCloseEditModal
                    }
                    disabled={
                      isProcessing
                    }
                  >
                    <Text
                      style={
                        styles.buttonText
                      }
                    >
                      Cancelar
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.deleteButton,
                    ]}
                    onPress={
                      handleDeleteProduct
                    }
                    disabled={
                      isProcessing
                    }
                  >
                    {isDeleting ? (
                      <ActivityIndicator
                        size="small"
                        color="#fff"
                      />
                    ) : (
                      <Text
                        style={[
                          styles.buttonText,
                          {
                            color: '#fff',
                          },
                        ]}
                      >
                        Eliminar
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.saveButton,
                    ]}
                    onPress={
                      handleUpdateProduct
                    }
                    disabled={
                      isProcessing
                    }
                  >
                    {isUpdating ? (
                      <ActivityIndicator
                        size="small"
                        color="#000"
                      />
                    ) : (
                      <Text
                        style={[
                          styles.buttonText,
                          {
                            color: '#000',
                          },
                        ]}
                      >
                        Guardar
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    );
  };