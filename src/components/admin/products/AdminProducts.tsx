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
    adminUpdateProduct,
    createProduct,
    getAllProducts,
    getCategories,
    setProductActive,
} from '../../../services/products';

import {
    Category,
    Product,
} from '../../../types';

import {
    styles,
} from './AdminProducts.styles';

interface ProductFormState {
    name: string;
    description: string;
    price: string;
    categoryId: string;
    isAvailable: boolean;
}

interface AdminProductsProps {
    onProductsChanged:
    () => Promise<void>;
}

const INITIAL_FORM: ProductFormState = {
    name: '',
    description: '',
    price: '',
    categoryId: '',
    isAvailable: true,
};

export function AdminProducts({
    onProductsChanged,
}: AdminProductsProps) {
    const [
        products,
        setProducts,
    ] = useState<Product[]>([]);

    const [
        categories,
        setCategories,
    ] = useState<Category[]>([]);

    const [
        selectedProduct,
        setSelectedProduct,
    ] = useState<Product | null>(
        null,
    );

    const [
        form,
        setForm,
    ] = useState<ProductFormState>(
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

                    const [
                        loadedProducts,
                        loadedCategories,
                    ] = await Promise.all([
                        getAllProducts(),
                        getCategories(),
                    ]);

                    setProducts(
                        loadedProducts,
                    );

                    setCategories(
                        loadedCategories,
                    );
                } catch (error) {
                    console.error(
                        'Error cargando productos administrativos:',
                        error,
                    );

                    setErrorMessage(
                        error instanceof Error
                            ? error.message
                            : 'No se pudo cargar el catálogo.',
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

    const visibleProducts =
        useMemo(() => {
            const normalizedSearch =
                normalizeText(
                    searchText,
                );

            return products
                .filter((product) => {
                    if (
                        !showInactive &&
                        product.is_active === false
                    ) {
                        return false;
                    }

                    if (!normalizedSearch) {
                        return true;
                    }

                    return normalizeText(
                        product.name,
                    ).includes(
                        normalizedSearch,
                    );
                })
                .sort(
                    (
                        productA,
                        productB,
                    ) =>
                        productA.name.localeCompare(
                            productB.name,
                            'es',
                            {
                                sensitivity:
                                    'base',
                            },
                        ),
                );
        }, [
            products,
            searchText,
            showInactive,
        ]);

    const openCreateModal =
        (): void => {
            setSelectedProduct(null);

            setForm({
                ...INITIAL_FORM,

                categoryId:
                    categories[0]?.id ??
                    '',
            });

            setIsModalVisible(true);
        };

    const openEditModal = (
        product: Product,
    ): void => {
        setSelectedProduct(
            product,
        );

        setForm({
            name:
                product.name,

            description:
                product.description ??
                '',

            price:
                String(
                    product.price,
                ),

            categoryId:
                product.category_id,

            isAvailable:
                product.is_available !==
                false,
        });

        setIsModalVisible(true);
    };

    const closeModal =
        (): void => {
            if (isProcessing) {
                return;
            }

            setIsModalVisible(false);

            setSelectedProduct(null);

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

            const parsedPrice =
                Number(
                    form.price,
                );

            if (!cleanName) {
                Alert.alert(
                    'Campo requerido',
                    'Ingresa el nombre del producto.',
                );

                return;
            }

            if (
                !Number.isFinite(
                    parsedPrice,
                ) ||
                parsedPrice <= 0
            ) {
                Alert.alert(
                    'Precio inválido',
                    'Ingresa un precio mayor a 0.',
                );

                return;
            }

            if (
                !form.categoryId
            ) {
                Alert.alert(
                    'Categoría requerida',
                    'Selecciona una categoría.',
                );

                return;
            }

            try {
                setIsProcessing(true);

                if (
                    selectedProduct
                ) {
                    await adminUpdateProduct(
                        selectedProduct.id,
                        {
                            name:
                                cleanName,

                            description:
                                form.description,

                            price:
                                parsedPrice,

                            categoryId:
                                form.categoryId,

                            isAvailable:
                                form.isAvailable,
                        },
                    );

                    Alert.alert(
                        'Producto actualizado',
                        `${cleanName} fue actualizado correctamente.`,
                    );
                } else {
                    await createProduct({
                        name:
                            cleanName,

                        description:
                            form.description,

                        price:
                            parsedPrice,

                        categoryId:
                            form.categoryId,
                    });

                    Alert.alert(
                        'Producto creado',
                        `${cleanName} fue agregado al catálogo.`,
                    );
                }

                setIsModalVisible(
                    false,
                );

                setSelectedProduct(
                    null,
                );

                setForm(
                    INITIAL_FORM,
                );

                await Promise.all([
                    loadData(),
                    onProductsChanged(),
                ]);
            } catch (error) {
                Alert.alert(
                    'Error',
                    error instanceof Error
                        ? error.message
                        : 'No se pudo guardar el producto.',
                );
            } finally {
                setIsProcessing(false);
            }
        };

    const handleToggleActive = (
        product: Product,
    ): void => {
        const willActivate =
            product.is_active ===
            false;

        Alert.alert(
            willActivate
                ? 'Activar producto'
                : 'Desactivar producto',

            willActivate
                ? `¿Deseas volver a activar "${product.name}"?`
                : `¿Deseas desactivar "${product.name}"? Ya no aparecerá en el menú de venta.`,

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
                            product,
                            willActivate,
                        );
                    },
                },
            ],
        );
    };

    const executeToggleActive =
        async (
            product: Product,
            isActive: boolean,
        ): Promise<void> => {
            try {
                setIsProcessing(true);

                await setProductActive(
                    product.id,
                    isActive,
                );

                await Promise.all([
                    loadData(),
                    onProductsChanged(),
                ]);
            } catch (error) {
                Alert.alert(
                    'Error',
                    error instanceof Error
                        ? error.message
                        : 'No se pudo cambiar el estado del producto.',
                );
            } finally {
                setIsProcessing(false);
            }
        };

    const getCategoryName = (
        categoryId: string,
    ): string => {
        return (
            categories.find(
                (category) =>
                    String(
                        category.id,
                    ) ===
                    String(
                        categoryId,
                    ),
            )?.name ??
            'Sin categoría'
        );
    };

    const renderProduct = ({
        item,
    }: {
        item: Product;
    }) => {
        const isActive =
            item.is_active !== false;

        const isAvailable =
            item.is_available !==
            false;

        return (
            <View
                style={[
                    styles.productCard,

                    !isActive &&
                    styles.productCardInactive,
                ]}
            >
                <View
                    style={
                        styles.productInfo
                    }
                >
                    <View
                        style={
                            styles.productTitleRow
                        }
                    >
                        <Text
                            style={
                                styles.productName
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
                                    ? 'ACTIVO'
                                    : 'INACTIVO'}
                            </Text>
                        </View>
                    </View>

                    <Text
                        style={
                            styles.categoryText
                        }
                    >
                        {getCategoryName(
                            item.category_id,
                        )}
                    </Text>

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

                    <View
                        style={
                            styles.productMetaRow
                        }
                    >
                        <Text
                            style={
                                styles.priceText
                            }
                        >
                            $
                            {Number(
                                item.price,
                            ).toFixed(2)}
                        </Text>

                        <Text
                            style={
                                isAvailable
                                    ? styles.availableText
                                    : styles.unavailableText
                            }
                        >
                            {isAvailable
                                ? 'Disponible'
                                : 'No disponible'}
                        </Text>
                    </View>
                </View>

                <View
                    style={
                        styles.productActions
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
                    Cargando productos...
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
                        placeholder="Buscar producto..."
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
                        Mostrar inactivos
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
                        + Nuevo producto
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
                    Productos
                </Text>

                <Text
                    style={
                        styles.productCount
                    }
                >
                    {
                        visibleProducts.length
                    }{' '}
                    {visibleProducts.length ===
                        1
                        ? 'producto'
                        : 'productos'}
                </Text>
            </View>

            {visibleProducts.length ===
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
                        🍔
                    </Text>

                    <Text
                        style={
                            styles.emptyTitle
                        }
                    >
                        No hay productos
                    </Text>

                    <Text
                        style={
                            styles.emptyText
                        }
                    >
                        Cambia la búsqueda o
                        agrega un nuevo producto.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={
                        visibleProducts
                    }
                    keyExtractor={
                        (item) =>
                            item.id
                    }
                    renderItem={
                        renderProduct
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
                            {selectedProduct
                                ? 'Editar producto'
                                : 'Nuevo producto'}
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
                            placeholder="Nombre del producto"
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

                        <Text
                            style={
                                styles.inputLabel
                            }
                        >
                            Precio
                        </Text>

                        <TextInput
                            value={
                                form.price
                            }
                            onChangeText={(
                                value,
                            ) =>
                                setForm(
                                    (
                                        current,
                                    ) => ({
                                        ...current,
                                        price:
                                            sanitizeMoney(
                                                value,
                                            ),
                                    }),
                                )
                            }
                            style={
                                styles.input
                            }
                            keyboardType="decimal-pad"
                            placeholder="0.00"
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
                            Categoría
                        </Text>

                        <View
                            style={
                                styles.categoriesContainer
                            }
                        >
                            {categories.map(
                                (category) => {
                                    const selected =
                                        String(
                                            form.categoryId,
                                        ) ===
                                        String(
                                            category.id,
                                        );

                                    return (
                                        <TouchableOpacity
                                            key={
                                                category.id
                                            }
                                            style={[
                                                styles.categoryButton,

                                                selected &&
                                                styles.categoryButtonSelected,
                                            ]}
                                            onPress={() =>
                                                setForm(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,

                                                        categoryId:
                                                            category.id,
                                                    }),
                                                )
                                            }
                                        >
                                            <Text
                                                style={[
                                                    styles.categoryButtonText,

                                                    selected &&
                                                    styles.categoryButtonTextSelected,
                                                ]}
                                            >
                                                {
                                                    category.name
                                                }
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                },
                            )}
                        </View>

                        {selectedProduct ? (
                            <View
                                style={
                                    styles.availableRow
                                }
                            >
                                <View>
                                    <Text
                                        style={
                                            styles.availableTitle
                                        }
                                    >
                                        Disponible para
                                        venta
                                    </Text>

                                    <Text
                                        style={
                                            styles.availableSubtitle
                                        }
                                    >
                                        Puedes ocultarlo
                                        temporalmente sin
                                        desactivarlo.
                                    </Text>
                                </View>

                                <Switch
                                    value={
                                        form.isAvailable
                                    }
                                    onValueChange={(
                                        value,
                                    ) =>
                                        setForm(
                                            (
                                                current,
                                            ) => ({
                                                ...current,

                                                isAvailable:
                                                    value,
                                            }),
                                        )
                                    }
                                />
                            </View>
                        ) : null}

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
                                        {selectedProduct
                                            ? 'Guardar cambios'
                                            : 'Crear producto'}
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

function sanitizeMoney(
    value: string,
): string {
    const sanitized =
        value
            .replace(',', '.')
            .replace(
                /[^0-9.]/g,
                '',
            );

    const parts =
        sanitized.split('.');

    if (parts.length > 2) {
        return value;
    }

    if (
        parts[1] &&
        parts[1].length > 2
    ) {
        return value;
    }

    return sanitized;
}