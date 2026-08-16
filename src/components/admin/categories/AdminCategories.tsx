import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  createCategory,
  getAllCategories,
  setCategoryActive,
  updateCategory,
} from '../../../services/categoryService';

import {
  Category,
} from '../../../types';

import {
  styles,
} from './AdminCategories.styles';

interface AdminCategoriesProps {
  onCategoriesChanged:
    () => Promise<void>;
}

interface CategoryFormState {
  name: string;
  description: string;
}

const INITIAL_FORM:
  CategoryFormState = {
  name: '',
  description: '',
};

export function AdminCategories({
  onCategoriesChanged,
}: AdminCategoriesProps) {
  const [
    categories,
    setCategories,
  ] = useState<Category[]>([]);

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState<Category | null>(
    null,
  );

  const [
    form,
    setForm,
  ] = useState<CategoryFormState>(
    INITIAL_FORM,
  );

  const [
    searchText,
    setSearchText,
  ] = useState('');

  const [
    showInactive,
    setShowInactive,
  ] = useState(true);

  const [
    isModalVisible,
    setIsModalVisible,
  ] = useState(false);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isProcessing,
    setIsProcessing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null,
  );

  const loadData =
    useCallback(
      async (): Promise<void> => {
        try {
          setIsLoading(true);
          setErrorMessage(null);

          const data =
            await getAllCategories();

          setCategories(
            data,
          );
        } catch (error) {
          console.error(
            'Error cargando categorías:',
            error,
          );

          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar las categorías.',
          );
        } finally {
          setIsLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const visibleCategories =
    useMemo(() => {
      const normalizedSearch =
        normalizeText(
          searchText,
        );

      return categories
        .filter(
          (category) => {
            if (
              !showInactive &&
              category.is_active ===
                false
            ) {
              return false;
            }

            if (!normalizedSearch) {
              return true;
            }

            return normalizeText(
              category.name,
            ).includes(
              normalizedSearch,
            );
          },
        )
        .sort(
          (
            categoryA,
            categoryB,
          ) =>
            categoryA.name.localeCompare(
              categoryB.name,
              'es',
              {
                sensitivity:
                  'base',
              },
            ),
        );
    }, [
      categories,
      searchText,
      showInactive,
    ]);

  const openCreateModal =
    (): void => {
      setSelectedCategory(
        null,
      );

      setForm(
        INITIAL_FORM,
      );

      setIsModalVisible(
        true,
      );
    };

  const openEditModal = (
    category: Category,
  ): void => {
    setSelectedCategory(
      category,
    );

    setForm({
      name:
        category.name,

      description:
        category.description ??
        '',
    });

    setIsModalVisible(
      true,
    );
  };

  const closeModal =
    (): void => {
      if (isProcessing) {
        return;
      }

      setIsModalVisible(
        false,
      );

      setSelectedCategory(
        null,
      );

      setForm(
        INITIAL_FORM,
      );
    };

  const handleSave =
    async (): Promise<void> => {
      if (isProcessing) {
        return;
      }

      const cleanName =
        form.name.trim();

      if (!cleanName) {
        Alert.alert(
          'Campo requerido',
          'Ingresa el nombre de la categoría.',
        );

        return;
      }

      try {
        setIsProcessing(true);

        if (
          selectedCategory
        ) {
          await updateCategory(
            selectedCategory.id,
            {
              name:
                cleanName,

              description:
                form.description,
            },
          );

          Alert.alert(
            'Categoría actualizada',
            `${cleanName} fue actualizada correctamente.`,
          );
        } else {
          await createCategory({
            name:
              cleanName,

            description:
              form.description,
          });

          Alert.alert(
            'Categoría creada',
            `${cleanName} fue agregada correctamente.`,
          );
        }

        setIsModalVisible(
          false,
        );

        setSelectedCategory(
          null,
        );

        setForm(
          INITIAL_FORM,
        );

        await Promise.all([
          loadData(),
          onCategoriesChanged(),
        ]);
      } catch (error) {
        Alert.alert(
          'Error',
          error instanceof Error
            ? error.message
            : 'No se pudo guardar la categoría.',
        );
      } finally {
        setIsProcessing(false);
      }
    };

  const handleToggleActive = (
    category: Category,
  ): void => {
    const willActivate =
      category.is_active ===
      false;

    Alert.alert(
      willActivate
        ? 'Activar categoría'
        : 'Desactivar categoría',

      willActivate
        ? `¿Deseas volver a activar "${category.name}"?`
        : `¿Deseas desactivar "${category.name}"? Ya no aparecerá en el menú.`,

      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },

        {
          text:
            willActivate
              ? 'Activar'
              : 'Desactivar',

          style:
            willActivate
              ? 'default'
              : 'destructive',

          onPress: () => {
            void executeToggleActive(
              category,
              willActivate,
            );
          },
        },
      ],
    );
  };

  const executeToggleActive =
    async (
      category: Category,
      isActive: boolean,
    ): Promise<void> => {
      try {
        setIsProcessing(true);

        await setCategoryActive(
          category.id,
          isActive,
        );

        await Promise.all([
          loadData(),
          onCategoriesChanged(),
        ]);
      } catch (error) {
        Alert.alert(
          'Error',
          error instanceof Error
            ? error.message
            : 'No se pudo cambiar el estado de la categoría.',
        );
      } finally {
        setIsProcessing(false);
      }
    };

  const renderCategory = ({
    item,
  }: {
    item: Category;
  }) => {
    const isActive =
      item.is_active !==
      false;

    return (
      <View
        style={[
          styles.categoryCard,

          !isActive &&
            styles.categoryCardInactive,
        ]}
      >
        <View
          style={
            styles.categoryInfo
          }
        >
          <View
            style={
              styles.categoryTitleRow
            }
          >
            <Text
              style={
                styles.categoryName
              }
            >
              {item.name}
            </Text>

            <View
              style={[
                styles.statusBadge,

                isActive
                  ? styles.statusBadgeActive
                  : styles.statusBadgeInactive,
              ]}
            >
              <Text
                style={[
                  styles.statusText,

                  isActive
                    ? styles.statusTextActive
                    : styles.statusTextInactive,
                ]}
              >
                {isActive
                  ? 'ACTIVA'
                  : 'INACTIVA'}
              </Text>
            </View>
          </View>

          {item.description ? (
            <Text
              style={
                styles.descriptionText
              }
              numberOfLines={2}
            >
              {
                item.description
              }
            </Text>
          ) : null}
        </View>

        <View
          style={
            styles.categoryActions
          }
        >
          <TouchableOpacity
            style={
              styles.editButton
            }
            onPress={() =>
              openEditModal(
                item,
              )
            }
          >
            <Text
              style={
                styles.editButtonText
              }
            >
              Editar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.stateButton,

              isActive
                ? styles.deactivateButton
                : styles.activateButton,
            ]}
            disabled={
              isProcessing
            }
            onPress={() =>
              handleToggleActive(
                item,
              )
            }
          >
            <Text
              style={
                styles.stateButtonText
              }
            >
              {isActive
                ? 'Desactivar'
                : 'Activar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View
        style={
          styles.centerContainer
        }
      >
        <ActivityIndicator
          size="large"
          color="#FFBF00"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Cargando categorías...
        </Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View
        style={
          styles.centerContainer
        }
      >
        <Text
          style={
            styles.errorTitle
          }
        >
          ⚠️ Error
        </Text>

        <Text
          style={
            styles.errorMessage
          }
        >
          {errorMessage}
        </Text>

        <TouchableOpacity
          style={
            styles.retryButton
          }
          onPress={() => {
            void loadData();
          }}
        >
          <Text
            style={
              styles.retryButtonText
            }
          >
            Reintentar
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={
        styles.container
      }
    >
      <View
        style={
          styles.toolbar
        }
      >
        <View
          style={
            styles.searchContainer
          }
        >
          <Text
            style={
              styles.searchIcon
            }
          >
            🔎
          </Text>

          <TextInput
            value={
              searchText
            }
            onChangeText={
              setSearchText
            }
            style={
              styles.searchInput
            }
            placeholder="Buscar categoría..."
            placeholderTextColor="#777777"
            autoCorrect={false}
          />

          {searchText ? (
            <TouchableOpacity
              onPress={() =>
                setSearchText('')
              }
            >
              <Text
                style={
                  styles.clearSearchText
                }
              >
                ✕
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View
          style={
            styles.inactiveFilter
          }
        >
          <Text
            style={
              styles.inactiveFilterText
            }
          >
            Mostrar inactivas
          </Text>

          <Switch
            value={
              showInactive
            }
            onValueChange={
              setShowInactive
            }
          />
        </View>

        <TouchableOpacity
          style={
            styles.createButton
          }
          onPress={
            openCreateModal
          }
        >
          <Text
            style={
              styles.createButtonText
            }
          >
            + Nueva categoría
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={
          styles.listHeader
        }
      >
        <Text
          style={
            styles.listTitle
          }
        >
          Categorías
        </Text>

        <Text
          style={
            styles.categoryCount
          }
        >
          {
            visibleCategories.length
          }{' '}
          {visibleCategories.length ===
          1
            ? 'categoría'
            : 'categorías'}
        </Text>
      </View>

      {visibleCategories.length ===
      0 ? (
        <View
          style={
            styles.emptyContainer
          }
        >
          <Text
            style={
              styles.emptyIcon
            }
          >
            📂
          </Text>

          <Text
            style={
              styles.emptyTitle
            }
          >
            No hay categorías
          </Text>

          <Text
            style={
              styles.emptyText
            }
          >
            Cambia la búsqueda o
            agrega una nueva categoría.
          </Text>
        </View>
      ) : (
        <FlatList
          data={
            visibleCategories
          }
          keyExtractor={
            (item) =>
              item.id
          }
          renderItem={
            renderCategory
          }
          contentContainerStyle={
            styles.listContent
          }
          showsVerticalScrollIndicator={
            false
          }
        />
      )}

      <Modal
        visible={
          isModalVisible
        }
        transparent
        animationType="fade"
        onRequestClose={
          closeModal
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
              {selectedCategory
                ? 'Editar categoría'
                : 'Nueva categoría'}
            </Text>

            <Text
              style={
                styles.inputLabel
              }
            >
              Nombre
            </Text>

            <TextInput
              value={
                form.name
              }
              onChangeText={(
                value,
              ) =>
                setForm(
                  (
                    current,
                  ) => ({
                    ...current,
                    name: value,
                  }),
                )
              }
              style={
                styles.input
              }
              placeholder="Nombre de la categoría"
              placeholderTextColor="#777777"
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
              value={
                form.description
              }
              onChangeText={(
                value,
              ) =>
                setForm(
                  (
                    current,
                  ) => ({
                    ...current,

                    description:
                      value,
                  }),
                )
              }
              style={[
                styles.input,
                styles.descriptionInput,
              ]}
              placeholder="Descripción opcional"
              placeholderTextColor="#777777"
              multiline
              editable={
                !isProcessing
              }
            />

            <View
              style={
                styles.modalActions
              }
            >
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                ]}
                disabled={
                  isProcessing
                }
                onPress={
                  closeModal
                }
              >
                <Text
                  style={
                    styles.cancelButtonText
                  }
                >
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.saveButton,

                  isProcessing &&
                    styles.buttonDisabled,
                ]}
                disabled={
                  isProcessing
                }
                onPress={() => {
                  void handleSave();
                }}
              >
                {isProcessing ? (
                  <ActivityIndicator
                    size="small"
                    color="#171717"
                  />
                ) : (
                  <Text
                    style={
                      styles.saveButtonText
                    }
                  >
                    {selectedCategory
                      ? 'Guardar cambios'
                      : 'Crear categoría'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function normalizeText(
  value:
    | string
    | null
    | undefined,
): string {
  return (
    value ?? ''
  )
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .trim()
    .toLocaleLowerCase(
      'es',
    );
}