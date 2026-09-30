import { withAlpha } from '../../../theme/brandStyles';

import { useBusiness } from '../../../context/BusinessContext';

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
    Image,
    Modal,
    ScrollView,
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
    setProductImage,
} from '../../../services/products';

import * as ImagePicker from 'expo-image-picker';

import {
    Category,
    Product,
} from '../../../types';

import {
    styles,
  setBrandPrimaryColor,
} from './AdminProducts.styles';
import { uploadProductImage } from '../../../services/productImageService';
import { useCurrency } from '../../../hooks/useCurrency';

import {
    getAllModifiers,
    getModifierGroups,
    ModifierGroupEntity,
    ModifierWithGroup,
} from '../../../services/modifierService';

import {
    getProductModifierOptions,
    saveProductModifierOptions,
} from '../../../services/productModifierOptionService';

import {
    getProductModifierGroups,
    saveProductModifierGroups,
} from '../../../services/productModifierGroupService';

import {
    getComboRecipeForAdmin,
    saveComboRecipe,
} from '../../../services/comboService';

import {
    ComboRecipeEditor,
    ComboRecipeFormState,
    INITIAL_COMBO_RECIPE_FORM,
} from './ComboRecipeEditor';

interface ProductFormState {
    name: string;
    description: string;
    price: string;
    categoryId: string;
    isAvailable: boolean;
}

interface ProductModifierGroupForm {
    modifierGroupId: string;
    isRequired: boolean;
    minSelections: string;
    maxSelections: string;
    allowDuplicates: boolean;
    position: number;
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
  const { theme: businessTheme } = useBusiness();
    setBrandPrimaryColor(businessTheme.primary);

    const {
        formatCurrency,
    } = useCurrency();

    const [
        products,
        setProducts,
    ] = useState<Product[]>([]);

    const [
        categories,
        setCategories,
    ] = useState<Category[]>([]);

    const [
        modifierGroups,
        setModifierGroups,
    ] = useState<ModifierGroupEntity[]>([]);

    const [
        productModifierGroups,
        setProductModifierGroups,
    ] = useState<ProductModifierGroupForm[]>([]);

    const [
        allModifiers,
        setAllModifiers,
    ] = useState<ModifierWithGroup[]>([]);

    const [
        modifierOptionIdsByGroup,
        setModifierOptionIdsByGroup,
    ] = useState<Record<string, string[] | null>>({});

    const [
        optionSelectorGroupId,
        setOptionSelectorGroupId,
    ] = useState<string | null>(null);

    const [
        isLoadingProductGroups,
        setIsLoadingProductGroups,
    ] = useState(false);

    const [
        comboRecipeForm,
        setComboRecipeForm,
    ] = useState<ComboRecipeFormState>(
        INITIAL_COMBO_RECIPE_FORM,
    );

    const [
        comboRecipeExists,
        setComboRecipeExists,
    ] = useState(false);

    const [
        isLoadingComboRecipe,
        setIsLoadingComboRecipe,
    ] = useState(false);

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

    const [
        pendingImage,
        setPendingImage,
    ] = useState<
        ImagePicker.ImagePickerAsset | null
    >(null);

    const loadData =
        useCallback(
            async (): Promise<void> => {
                try {
                    setIsLoading(true);
                    setErrorMessage(null);

                    const [
                        loadedProducts,
                        loadedCategories,
                        loadedModifierGroups,
                        loadedModifiers,
                    ] = await Promise.all([
                        getAllProducts(),
                        getCategories(),
                        getModifierGroups(),
                        getAllModifiers(),
                    ]);

                    setProducts(
                        loadedProducts,
                    );

                    setCategories(
                        loadedCategories,
                    );

                    setModifierGroups(
                        loadedModifierGroups,
                    );

                    setAllModifiers(
                        loadedModifiers,
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

    const visibleModifierGroups =
        useMemo(
            () =>
                modifierGroups
                    .filter(
                        group =>
                            group.is_active ||
                            productModifierGroups.some(
                                config =>
                                    config.modifierGroupId ===
                                    group.id,
                            ),
                    )
                    .sort(
                        (
                            first,
                            second,
                        ) =>
                            first.position -
                            second.position,
                    ),
            [
                modifierGroups,
                productModifierGroups,
            ],
        );

    const openCreateModal =
        (): void => {
            setSelectedProduct(null);

            setPendingImage(null);

            setProductModifierGroups(
                [],
            );

            setModifierOptionIdsByGroup({});
            setOptionSelectorGroupId(null);

            setComboRecipeForm(
                INITIAL_COMBO_RECIPE_FORM,
            );

            setComboRecipeExists(
                false,
            );

            setForm({
                ...INITIAL_FORM,

                categoryId:
                    categories[0]?.id ??
                    '',
            });

            setIsModalVisible(true);
        };

    const openEditModal =
        async (
            product: Product,
        ): Promise<void> => {
            setSelectedProduct(
                product,
            );

            setPendingImage(
                null,
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

            setProductModifierGroups(
                [],
            );

            setModifierOptionIdsByGroup({});
            setOptionSelectorGroupId(null);

            setComboRecipeForm(
                INITIAL_COMBO_RECIPE_FORM,
            );

            setComboRecipeExists(
                false,
            );

            setIsModalVisible(
                true,
            );

            try {
                setIsLoadingProductGroups(
                    true,
                );

                setIsLoadingComboRecipe(
                    true,
                );

                const [
                    associations,
                    productOptions,
                    comboRecipe,
                ] = await Promise.all([
                    getProductModifierGroups(
                        product.id,
                    ),
                    getProductModifierOptions(
                        product.id,
                    ),
                    getComboRecipeForAdmin(
                        product.id,
                    ),
                ]);

                setProductModifierGroups(
                    associations.map(
                        association => ({
                            modifierGroupId:
                                association.modifierGroupId,

                            isRequired:
                                association.isRequired,

                            minSelections:
                                String(
                                    association.minSelections,
                                ),

                            maxSelections:
                                String(
                                    association.maxSelections,
                                ),

                            allowDuplicates:
                                association.allowDuplicates,

                            position:
                                association.position,
                        }),
                    ),
                );

                const optionIdsByGroup:
                    Record<string, string[] | null> = {};

                associations.forEach(association => {
                    const ids =
                        productOptions
                            .filter(option => {
                                const modifier =
                                    allModifiers.find(
                                        item =>
                                            item.id ===
                                            option.modifierId,
                                    );

                                return (
                                    modifier?.group_id ===
                                    association.modifierGroupId
                                );
                            })
                            .sort(
                                (left, right) =>
                                    left.position -
                                    right.position,
                            )
                            .map(
                                option =>
                                    option.modifierId,
                            );

                    optionIdsByGroup[
                        association.modifierGroupId
                    ] =
                        ids.length > 0
                            ? ids
                            : null;
                });

                setModifierOptionIdsByGroup(
                    optionIdsByGroup,
                );

                setComboRecipeExists(
                    comboRecipe !== null,
                );

                setComboRecipeForm(
                    comboRecipe
                        ? {
                            enabled:
                                comboRecipe.enabled,

                            components:
                                comboRecipe.components.map(
                                    component => ({
                                        clientId:
                                            component.id,

                                        slotKey:
                                            component.slotKey,

                                        type:
                                            component.type,

                                        label:
                                            component.label,

                                        selectionMode:
                                            component.selectionMode,

                                        fixedProductId:
                                            component.fixedProductId ??
                                            '',

                                        selectableCategoryId:
                                            component.selectableCategoryId ??
                                            '',

                                        allowsNotes:
                                            component.allowsNotes,

                                        allowedProductIds:
                                            component.rules.some(
                                                rule =>
                                                    rule.ruleType ===
                                                    'allowed',
                                            )
                                                ? component.rules
                                                    .filter(
                                                        rule =>
                                                            rule.ruleType ===
                                                            'allowed',
                                                    )
                                                    .map(
                                                        rule =>
                                                            rule.productId,
                                                    )
                                                : component.options.map(
                                                    option =>
                                                        option.id,
                                                ),
                                    }),
                                ),
                        }
                        : INITIAL_COMBO_RECIPE_FORM,
                );
            } catch (error) {
                Alert.alert(
                    'Error',
                    error instanceof Error
                        ? error.message
                        : 'No se pudo cargar la configuración del producto.',
                );
            } finally {
                setIsLoadingProductGroups(
                    false,
                );

                setIsLoadingComboRecipe(
                    false,
                );
            }
        };

    const closeModal =
        (): void => {
            if (isProcessing) {
                return;
            }

            setIsModalVisible(false);

            setSelectedProduct(null);

            setPendingImage(null);

            setProductModifierGroups(
                [],
            );

            setComboRecipeForm(
                INITIAL_COMBO_RECIPE_FORM,
            );

            setComboRecipeExists(
                false,
            );

            setForm(
                INITIAL_FORM,
            );
        };

    const handlePickImage =
        async (): Promise<void> => {
            if (isProcessing) {
                return;
            }

            const permission =
                await ImagePicker
                    .requestMediaLibraryPermissionsAsync();

            if (!permission.granted) {
                Alert.alert(
                    'Permiso requerido',
                    'Necesitamos acceso a tus fotos para seleccionar una imagen del producto.',
                );

                return;
            }

            const result =
                await ImagePicker
                    .launchImageLibraryAsync({
                        mediaTypes:
                            ImagePicker
                                .MediaTypeOptions
                                .Images,

                        allowsEditing: true,

                        aspect: [
                            4,
                            3,
                        ],

                        quality: 0.85,
                    });

            if (result.canceled) {
                return;
            }

            const asset =
                result.assets[0];

            if (
                asset.fileSize &&
                asset.fileSize >
                5 * 1024 * 1024
            ) {
                Alert.alert(
                    'Imagen demasiado grande',
                    'Selecciona una imagen de máximo 5 MB.',
                );

                return;
            }

            if (
                asset.mimeType &&
                !asset.mimeType.startsWith(
                    'image/',
                )
            ) {
                Alert.alert(
                    'Archivo inválido',
                    'Selecciona un archivo de imagen.',
                );

                return;
            }

            setPendingImage(
                asset,
            );
        };

    const toggleModifierGroup = (
        group:
            ModifierGroupEntity,
    ): void => {
        setProductModifierGroups(
            current => {
                const exists =
                    current.some(
                        config =>
                            config.modifierGroupId ===
                            group.id,
                    );

                if (exists) {
                    setModifierOptionIdsByGroup(
                        currentOptions => {
                            const next = {
                                ...currentOptions,
                            };

                            delete next[group.id];

                            return next;
                        },
                    );

                    return current.filter(
                        config =>
                            config.modifierGroupId !==
                            group.id,
                    );
                }

                setModifierOptionIdsByGroup(
                    currentOptions => ({
                        ...currentOptions,
                        [group.id]: null,
                    }),
                );

                return [
                    ...current,
                    {
                        modifierGroupId:
                            group.id,

                        isRequired:
                            false,

                        minSelections:
                            '0',

                        maxSelections:
                            '1',

                        allowDuplicates:
                            false,

                        position:
                            group.position,
                    },
                ];
            },
        );
    };

    const updateModifierGroupConfig = (
        modifierGroupId: string,
        changes:
            Partial<
                ProductModifierGroupForm
            >,
    ): void => {
        setProductModifierGroups(
            current =>
                current.map(
                    config =>
                        config.modifierGroupId ===
                        modifierGroupId
                            ? {
                                ...config,
                                ...changes,
                            }
                            : config,
                ),
        );
    };

    const getModifiersForGroup = (
        modifierGroupId: string,
    ): ModifierWithGroup[] =>
        allModifiers
            .filter(
                modifier =>
                    modifier.group_id ===
                        modifierGroupId &&
                    modifier.is_available,
            )
            .sort((left, right) =>
                left.name.localeCompare(
                    right.name,
                    'es',
                    {
                        sensitivity: 'base',
                    },
                ),
            );

    const getModifierOptionSummary = (
        modifierGroupId: string,
    ): string => {
        const selectedIds =
            modifierOptionIdsByGroup[
                modifierGroupId
            ];

        if (selectedIds === null ||
            selectedIds === undefined) {
            return 'Todas las opciones';
        }

        return selectedIds.length === 1
            ? '1 seleccionada'
            : `${selectedIds.length} seleccionadas`;
    };

    const toggleModifierOption = (
        modifierGroupId: string,
        modifierId: string,
    ): void => {
        const groupModifiers =
            getModifiersForGroup(
                modifierGroupId,
            );

        setModifierOptionIdsByGroup(
            current => {
                const currentValue =
                    current[
                        modifierGroupId
                    ];

                const selectedIds =
                    currentValue === null ||
                    currentValue === undefined
                        ? groupModifiers.map(
                            modifier =>
                                modifier.id,
                        )
                        : currentValue;

                if (
                    selectedIds.includes(
                        modifierId,
                    )
                ) {
                    if (
                        selectedIds.length === 1
                    ) {
                        return current;
                    }

                    return {
                        ...current,
                        [modifierGroupId]:
                            selectedIds.filter(
                                id =>
                                    id !==
                                    modifierId,
                            ),
                    };
                }

                const nextIds = [
                    ...selectedIds,
                    modifierId,
                ];

                if (
                    nextIds.length ===
                    groupModifiers.length
                ) {
                    return {
                        ...current,
                        [modifierGroupId]:
                            null,
                    };
                }

                return {
                    ...current,
                    [modifierGroupId]:
                        nextIds,
                };
            },
        );
    };

    const getModifierOptionIdsToSave =
        (): string[] => {
            const ids: string[] = [];

            productModifierGroups.forEach(
                group => {
                    const selectedIds =
                        modifierOptionIdsByGroup[
                            group.modifierGroupId
                        ];

                    if (
                        selectedIds === null ||
                        selectedIds === undefined
                    ) {
                        return;
                    }

                    ids.push(...selectedIds);
                },
            );

            return Array.from(
                new Set(ids),
            );
        };

    const getValidatedModifierGroups =
        (): Array<{
            productId: string;
            modifierGroupId: string;
            isRequired: boolean;
            minSelections: number;
            maxSelections: number;
            allowDuplicates: boolean;
            position: number;
            isActive: boolean;
        }> | null => {
            const result:
                Array<{
                    productId: string;
                    modifierGroupId: string;
                    isRequired: boolean;
                    minSelections: number;
                    maxSelections: number;
                    allowDuplicates: boolean;
                    position: number;
                    isActive: boolean;
                }> = [];

            for (
                const config of
                productModifierGroups
            ) {
                const minSelections =
                    Number(
                        config.minSelections,
                    );

                const maxSelections =
                    Number(
                        config.maxSelections,
                    );

                const group =
                    modifierGroups.find(
                        item =>
                            item.id ===
                            config.modifierGroupId,
                    );

                if (
                    !Number.isInteger(
                        minSelections,
                    ) ||
                    minSelections < 0
                ) {
                    Alert.alert(
                        'Mínimo inválido',
                        `Revisa el mínimo de selecciones de "${group?.name ?? 'Grupo'}".`,
                    );

                    return null;
                }

                if (
                    !Number.isInteger(
                        maxSelections,
                    ) ||
                    maxSelections < 1
                ) {
                    Alert.alert(
                        'Máximo inválido',
                        `Revisa el máximo de selecciones de "${group?.name ?? 'Grupo'}".`,
                    );

                    return null;
                }

                if (
                    maxSelections <
                    minSelections
                ) {
                    Alert.alert(
                        'Rango inválido',
                        `El máximo no puede ser menor que el mínimo en "${group?.name ?? 'Grupo'}".`,
                    );

                    return null;
                }

                if (
                    config.isRequired &&
                    minSelections === 0
                ) {
                    Alert.alert(
                        'Mínimo requerido',
                        `El grupo "${group?.name ?? 'Grupo'}" está marcado como obligatorio. Usa un mínimo de al menos 1.`,
                    );

                    return null;
                }

                result.push({
                    productId:
                        '',

                    modifierGroupId:
                        config.modifierGroupId,

                    isRequired:
                        config.isRequired,

                    minSelections,

                    maxSelections,

                    allowDuplicates:
                        config.allowDuplicates,

                    position:
                        config.position,

                    isActive:
                        true,
                });
            }

            return result;
        };

    const getValidatedComboComponents =
        (): Array<{
            slotKey: string;
            type: string;
            label: string;
            selectionMode:
                | 'fixed'
                | 'selectable';
            fixedProductId:
                | string
                | null;
            selectableCategoryId:
                | string
                | null;
            allowsNotes: boolean;
            position: number;
            allowedProductIds: string[];
        }> | null => {
            if (
                !comboRecipeForm.enabled
            ) {
                return [];
            }

            if (
                comboRecipeForm.components.length ===
                0
            ) {
                Alert.alert(
                    'Combo incompleto',
                    'Agrega al menos un componente al combo.',
                );

                return null;
            }

            const slotKeys =
                new Set<string>();

            const result:
                Array<{
                    slotKey: string;
                    type: string;
                    label: string;
                    selectionMode:
                        | 'fixed'
                        | 'selectable';
                    fixedProductId:
                        | string
                        | null;
                    selectableCategoryId:
                        | string
                        | null;
                    allowsNotes: boolean;
                    position: number;
                    allowedProductIds: string[];
                }> = [];

            for (
                let index = 0;
                index <
                comboRecipeForm.components.length;
                index += 1
            ) {
                const component =
                    comboRecipeForm.components[
                        index
                    ];

                const cleanLabel =
                    component.label.trim();

                const cleanType =
                    component.type.trim();

                const cleanSlotKey =
                    component.slotKey.trim() ||
                    `component_${index + 1}`;

                if (!cleanLabel) {
                    Alert.alert(
                        'Componente incompleto',
                        `Ingresa el nombre visible del componente ${index + 1}.`,
                    );

                    return null;
                }

                if (!cleanType) {
                    Alert.alert(
                        'Tipo requerido',
                        `Ingresa el tipo interno del componente "${cleanLabel}".`,
                    );

                    return null;
                }

                if (
                    slotKeys.has(
                        cleanSlotKey,
                    )
                ) {
                    Alert.alert(
                        'Configuración inválida',
                        `La clave interna "${cleanSlotKey}" está repetida.`,
                    );

                    return null;
                }

                slotKeys.add(
                    cleanSlotKey,
                );

                if (
                    component.selectionMode ===
                    'fixed'
                ) {
                    if (
                        !component.fixedProductId
                    ) {
                        Alert.alert(
                            'Producto requerido',
                            `Selecciona el producto fijo de "${cleanLabel}".`,
                        );

                        return null;
                    }

                    result.push({
                        slotKey:
                            cleanSlotKey,

                        type:
                            cleanType,

                        label:
                            cleanLabel,

                        selectionMode:
                            'fixed' as const,

                        fixedProductId:
                            component.fixedProductId,

                        selectableCategoryId:
                            null,

                        allowsNotes:
                            component.allowsNotes,

                        position:
                            index,

                        allowedProductIds:
                            [],
                    });

                    continue;
                }

                if (
                    !component.selectableCategoryId
                ) {
                    Alert.alert(
                        'Categoría requerida',
                        `Selecciona la categoría de opciones de "${cleanLabel}".`,
                    );

                    return null;
                }

                if (
                    component.allowedProductIds.length ===
                    0
                ) {
                    Alert.alert(
                        'Opciones requeridas',
                        `Selecciona al menos un producto permitido para "${cleanLabel}".`,
                    );

                    return null;
                }

                result.push({
                    slotKey:
                        cleanSlotKey,

                    type:
                        cleanType,

                    label:
                        cleanLabel,

                    selectionMode:
                        'selectable' as const,

                    fixedProductId:
                        null,

                    selectableCategoryId:
                        component.selectableCategoryId,

                    allowsNotes:
                        component.allowsNotes,

                    position:
                        index,

                    allowedProductIds:
                        component.allowedProductIds,
                });
            }

            return result;
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

            const selectedCategory =
                categories.find(
                    (category) =>
                        String(category.id) ===
                        String(form.categoryId),
                );

            const isComboComplement =
                normalizeText(
                    selectedCategory?.name,
                ) ===
                'complementos de combo';

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
                parsedPrice < 0 ||
                (
                    !isComboComplement &&
                    parsedPrice === 0
                )
            ) {
                Alert.alert(
                    'Precio inválido',
                    isComboComplement
                        ? 'El precio no puede ser negativo.'
                        : 'Ingresa un precio mayor a 0.',
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

            const validatedGroups =
                getValidatedModifierGroups();

            if (!validatedGroups) {
                return;
            }

            const validatedComboComponents =
                getValidatedComboComponents();

            if (!validatedComboComponents) {
                return;
            }

            try {
                setIsProcessing(true);

                if (
                    selectedProduct
                ) {
                    let imageUrl =
                        selectedProduct.image_url ??
                        null;

                    if (pendingImage) {
                        imageUrl =
                            await uploadProductImage(
                                selectedProduct.id,
                                pendingImage.uri,
                                pendingImage.mimeType ??
                                'image/jpeg',
                            );
                    }

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

                            imageUrl,

                            allowZeroPrice:
                                isComboComplement,
                        },
                    );

                    await saveProductModifierGroups(
                        selectedProduct.id,
                        validatedGroups.map(
                            group => ({
                                ...group,
                                productId:
                                    selectedProduct.id,
                            }),
                        ),
                    );

                    await saveProductModifierOptions(
                        selectedProduct.id,
                        getModifierOptionIdsToSave(),
                    );

                    if (
                        comboRecipeForm.enabled ||
                        comboRecipeExists
                    ) {
                        await saveComboRecipe({
                            comboProductId:
                                selectedProduct.id,

                            enabled:
                                comboRecipeForm.enabled,

                            components:
                                validatedComboComponents,
                        });
                    }

                    Alert.alert(
                        'Producto actualizado',
                        `${cleanName} fue actualizado correctamente.`,
                    );
                } else {
                    const createdProduct =
                        await createProduct({
                            name:
                                cleanName,

                            description:
                                form.description,

                            price:
                                parsedPrice,

                            categoryId:
                                form.categoryId,

                            allowZeroPrice:
                                isComboComplement,
                        });

                    if (pendingImage) {
                        const imageUrl =
                            await uploadProductImage(
                                createdProduct.id,
                                pendingImage.uri,
                                pendingImage.mimeType ??
                                'image/jpeg',
                            );

                        await setProductImage(
                            createdProduct.id,
                            imageUrl,
                        );
                    }

                    await saveProductModifierGroups(
                        createdProduct.id,
                        validatedGroups.map(
                            group => ({
                                ...group,
                                productId:
                                    createdProduct.id,
                            }),
                        ),
                    );

                    await saveProductModifierOptions(
                        createdProduct.id,
                        getModifierOptionIdsToSave(),
                    );

                    if (
                        comboRecipeForm.enabled
                    ) {
                        await saveComboRecipe({
                            comboProductId:
                                createdProduct.id,

                            enabled:
                                true,

                            components:
                                validatedComboComponents,
                        });
                    }

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

                setPendingImage(
                    null,
                );

                setProductModifierGroups(
                    [],
                );

                setModifierOptionIdsByGroup({});
                setOptionSelectorGroupId(null);

                setComboRecipeForm(
                    INITIAL_COMBO_RECIPE_FORM,
                );

                setComboRecipeExists(
                    false,
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
                        styles.productThumbnailBox
                    }
                >
                    {item.image_url ? (
                        <Image
                            source={{
                                uri:
                                    item.image_url,
                            }}
                            style={
                                styles.productThumbnail
                            }
                            resizeMode="cover"
                        />
                    ) : (
                        <Text
                            style={
                                styles.productThumbnailPlaceholder
                            }
                        >
                            BK
                        </Text>
                    )}
                </View>

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
                            {formatCurrency(
                                Number(
                                    item.price,
                                ),
                            )}
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
                        onPress={() => {
                            void openEditModal(
                                item,
                            );
                        }}
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
                    color={businessTheme.primary}
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
            <Modal
                visible={
                    optionSelectorGroupId !== null
                }
                transparent
                animationType="fade"
                onRequestClose={() =>
                    setOptionSelectorGroupId(
                        null,
                    )
                }
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor:
                            'rgba(0,0,0,0.72)',
                        justifyContent:
                            'center',
                        padding: 20,
                    }}
                >
                    <View
                        style={{
                            maxHeight:
                                '75%',
                            borderRadius:
                                12,
                            backgroundColor:
                                '#202020',
                            borderWidth:
                                1,
                            borderColor:
                                '#444444',
                            padding: 14,
                        }}
                    >
                        {(() => {
                            const group =
                                modifierGroups.find(
                                    item =>
                                        item.id ===
                                        optionSelectorGroupId,
                                );

                            const modifiers =
                                optionSelectorGroupId
                                    ? getModifiersForGroup(
                                        optionSelectorGroupId,
                                    )
                                    : [];

                            const selectedIds =
                                optionSelectorGroupId
                                    ? modifierOptionIdsByGroup[
                                        optionSelectorGroupId
                                    ]
                                    : null;

                            const usesAll =
                                selectedIds === null ||
                                selectedIds === undefined;

                            return (
                                <>
                                    <Text
                                        style={{
                                            color:
                                                '#FFFFFF',
                                            fontSize:
                                                16,
                                            fontWeight:
                                                '900',
                                            marginBottom:
                                                4,
                                        }}
                                    >
                                        {group?.name ??
                                            'Opciones'}
                                    </Text>

                                    <Text
                                        style={{
                                            color:
                                                '#888888',
                                            fontSize:
                                                10,
                                            marginBottom:
                                                12,
                                        }}
                                    >
                                        Limita las opciones disponibles solo para este producto.
                                    </Text>

                                    <TouchableOpacity
                                        onPress={() => {
                                            if (
                                                optionSelectorGroupId
                                            ) {
                                                setModifierOptionIdsByGroup(
                                                    current => ({
                                                        ...current,
                                                        [optionSelectorGroupId]:
                                                            null,
                                                    }),
                                                );
                                            }
                                        }}
                                        style={{
                                            padding: 11,
                                            borderRadius:
                                                8,
                                            borderWidth:
                                                1,
                                            borderColor:
                                                usesAll
                                                    ? businessTheme.primary
                                                    : '#555555',
                                            backgroundColor:
                                                usesAll
                                                    ? withAlpha(businessTheme.primary, 0.14)
                                                    : '#292929',
                                            marginBottom:
                                                8,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color:
                                                    usesAll
                                                        ? businessTheme.primary
                                                        : '#FFFFFF',
                                                fontWeight:
                                                    '800',
                                            }}
                                        >
                                            {usesAll
                                                ? '✓ '
                                                : ''}
                                            Todas las opciones
                                        </Text>
                                    </TouchableOpacity>

                                    <ScrollView>
                                        {modifiers.map(
                                            modifier => {
                                                const selected =
                                                    usesAll ||
                                                    Boolean(
                                                        selectedIds?.includes(
                                                            modifier.id,
                                                        ),
                                                    );

                                                return (
                                                    <TouchableOpacity
                                                        key={
                                                            modifier.id
                                                        }
                                                        onPress={() => {
                                                            if (
                                                                optionSelectorGroupId
                                                            ) {
                                                                toggleModifierOption(
                                                                    optionSelectorGroupId,
                                                                    modifier.id,
                                                                );
                                                            }
                                                        }}
                                                        style={{
                                                            padding: 11,
                                                            borderRadius:
                                                                8,
                                                            borderWidth:
                                                                1,
                                                            borderColor:
                                                                selected
                                                                    ? businessTheme.primary
                                                                    : '#444444',
                                                            backgroundColor:
                                                                selected
                                                                    ? withAlpha(businessTheme.primary, 0.14)
                                                                    : '#292929',
                                                            marginBottom:
                                                                8,
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                color:
                                                                    selected
                                                                        ? businessTheme.primary
                                                                        : '#FFFFFF',
                                                                fontWeight:
                                                                    selected
                                                                        ? '800'
                                                                        : '500',
                                                            }}
                                                        >
                                                            {selected
                                                                ? '✓ '
                                                                : ''}
                                                            {modifier.name}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            },
                                        )}
                                    </ScrollView>

                                    <TouchableOpacity
                                        onPress={() =>
                                            setOptionSelectorGroupId(
                                                null,
                                            )
                                        }
                                        style={{
                                            marginTop: 6,
                                            padding: 12,
                                            borderRadius:
                                                8,
                                            backgroundColor:
                                                businessTheme.primary,
                                            alignItems:
                                                'center',
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color:
                                                    '#171717',
                                                fontWeight:
                                                    '900',
                                            }}
                                        >
                                            Listo
                                        </Text>
                                    </TouchableOpacity>
                                </>
                            );
                        })()}
                    </View>
                </View>
            </Modal>

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
                        style={[
                            styles.modalContent,
                            {
                                maxHeight:
                                    '92%',
                            },
                        ]}
                    >
                        <ScrollView
                            showsVerticalScrollIndicator={
                                false
                            }
                            keyboardShouldPersistTaps="handled"
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
                            Imagen del producto
                        </Text>

                        <View
                            style={
                                styles.imagePickerRow
                            }
                        >
                            <View
                                style={
                                    styles.imagePreviewBox
                                }
                            >
                                {pendingImage?.uri ||
                                    selectedProduct
                                        ?.image_url ? (
                                    <Image
                                        source={{
                                            uri:
                                                pendingImage
                                                    ?.uri ??
                                                selectedProduct
                                                    ?.image_url ??
                                                '',
                                        }}
                                        style={
                                            styles.imagePreview
                                        }
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <Text
                                        style={
                                            styles.imagePreviewPlaceholder
                                        }
                                    >
                                        BK
                                    </Text>
                                )}
                            </View>

                            <View
                                style={
                                    styles.imagePickerActions
                                }
                            >
                                <TouchableOpacity
                                    style={
                                        styles.imagePickerButton
                                    }
                                    disabled={
                                        isProcessing
                                    }
                                    onPress={() => {
                                        void handlePickImage();
                                    }}
                                >
                                    <Text
                                        style={
                                            styles.imagePickerButtonText
                                        }
                                    >
                                        {pendingImage ||
                                            selectedProduct
                                                ?.image_url
                                            ? 'Cambiar imagen'
                                            : 'Seleccionar imagen'}
                                    </Text>
                                </TouchableOpacity>

                                <Text
                                    style={
                                        styles.imageHint
                                    }
                                >
                                    JPG, PNG o WEBP · máximo 5 MB
                                </Text>
                            </View>
                        </View>

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

                        {isLoadingComboRecipe ? (
                            <View
                                style={{
                                    marginTop:
                                        16,

                                    paddingVertical:
                                        16,

                                    alignItems:
                                        'center',

                                    borderRadius:
                                        10,

                                    borderWidth:
                                        1,

                                    borderColor:
                                        '#3A3A3A',

                                    backgroundColor:
                                        '#202020',
                                }}
                            >
                                <ActivityIndicator
                                    size="small"
                                    color={businessTheme.primary}
                                />

                                <Text
                                    style={{
                                        color:
                                            '#888888',

                                        fontSize:
                                            10,

                                        marginTop:
                                            6,
                                    }}
                                >
                                    Cargando configuración del combo...
                                </Text>
                            </View>
                        ) : (
                            <ComboRecipeEditor
                                value={
                                    comboRecipeForm
                                }
                                onChange={
                                    setComboRecipeForm
                                }
                                products={
                                    products
                                }
                                categories={
                                    categories
                                }
                                currentProductId={
                                    selectedProduct
                                        ?.id ??
                                    null
                                }
                                disabled={
                                    isProcessing
                                }
                            />
                        )}

                        <View
                            style={{
                                marginTop:
                                    16,

                                padding:
                                    12,

                                borderRadius:
                                    10,

                                borderWidth:
                                    1,

                                borderColor:
                                    '#3A3A3A',

                                backgroundColor:
                                    '#202020',
                            }}
                        >
                            <Text
                                style={{
                                    color:
                                        '#FFFFFF',

                                    fontSize:
                                        14,

                                    fontWeight:
                                        '900',

                                    marginBottom:
                                        4,
                                }}
                            >
                                Grupos de modificadores
                            </Text>

                            <Text
                                style={{
                                    color:
                                        '#888888',

                                    fontSize:
                                        10,

                                    marginBottom:
                                        10,
                                }}
                            >
                                Selecciona los grupos que este producto utilizará y define sus límites.
                            </Text>

                            {isLoadingProductGroups ? (
                                <View
                                    style={{
                                        paddingVertical:
                                            12,

                                        alignItems:
                                            'center',
                                    }}
                                >
                                    <ActivityIndicator
                                        size="small"
                                        color={businessTheme.primary}
                                    />
                                </View>
                            ) : (
                                visibleModifierGroups.map(
                                    group => {
                                        const config =
                                            productModifierGroups.find(
                                                item =>
                                                    item.modifierGroupId ===
                                                    group.id,
                                            );

                                        const selected =
                                            Boolean(
                                                config,
                                            );

                                        return (
                                            <View
                                                key={
                                                    group.id
                                                }
                                                style={{
                                                    marginTop:
                                                        8,

                                                    padding:
                                                        10,

                                                    borderRadius:
                                                        8,

                                                    borderWidth:
                                                        1,

                                                    borderColor:
                                                        selected
                                                            ? businessTheme.primary
                                                            : '#444444',

                                                    backgroundColor:
                                                        selected
                                                            ? withAlpha(businessTheme.primary, 0.14)
                                                            : '#252525',
                                                }}
                                            >
                                                <TouchableOpacity
                                                    disabled={
                                                        isProcessing ||
                                                        !group.is_active
                                                    }
                                                    onPress={() =>
                                                        toggleModifierGroup(
                                                            group,
                                                        )
                                                    }
                                                >
                                                    <View
                                                        style={{
                                                            flexDirection:
                                                                'row',

                                                            alignItems:
                                                                'center',

                                                            justifyContent:
                                                                'space-between',

                                                            gap:
                                                                8,
                                                        }}
                                                    >
                                                        <View
                                                            style={{
                                                                flex:
                                                                    1,
                                                            }}
                                                        >
                                                            <Text
                                                                style={{
                                                                    color:
                                                                        selected
                                                                            ? businessTheme.primary
                                                                            : '#FFFFFF',

                                                                    fontSize:
                                                                        12,

                                                                    fontWeight:
                                                                        '900',
                                                                }}
                                                            >
                                                                {selected
                                                                    ? '✓ '
                                                                    : ''}
                                                                {group.name}
                                                            </Text>

                                                            {!group.is_active ? (
                                                                <Text
                                                                    style={{
                                                                        color:
                                                                            '#888888',

                                                                        fontSize:
                                                                            9,

                                                                        marginTop:
                                                                            2,
                                                                    }}
                                                                >
                                                                    Grupo inactivo
                                                                </Text>
                                                            ) : null}
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>

                                                {config ? (
                                                    <View
                                                        style={{
                                                            marginTop:
                                                                10,

                                                            gap:
                                                                8,
                                                        }}
                                                    >
                                                        <View
                                                            style={{
                                                                flexDirection:
                                                                    'row',

                                                                gap:
                                                                    8,
                                                            }}
                                                        >
                                                            <View
                                                                style={{
                                                                    flex:
                                                                        1,
                                                                }}
                                                            >
                                                                <Text
                                                                    style={{
                                                                        color:
                                                                            '#AAAAAA',

                                                                        fontSize:
                                                                            10,

                                                                        marginBottom:
                                                                            4,
                                                                    }}
                                                                >
                                                                    Mínimo
                                                                </Text>

                                                                <TextInput
                                                                    value={
                                                                        config.minSelections
                                                                    }
                                                                    onChangeText={(
                                                                        value,
                                                                    ) =>
                                                                        updateModifierGroupConfig(
                                                                            group.id,
                                                                            {
                                                                                minSelections:
                                                                                    sanitizeInteger(
                                                                                        value,
                                                                                    ),
                                                                            },
                                                                        )
                                                                    }
                                                                    style={
                                                                        styles.input
                                                                    }
                                                                    keyboardType="number-pad"
                                                                    editable={
                                                                        !isProcessing
                                                                    }
                                                                />
                                                            </View>

                                                            <View
                                                                style={{
                                                                    flex:
                                                                        1,
                                                                }}
                                                            >
                                                                <Text
                                                                    style={{
                                                                        color:
                                                                            '#AAAAAA',

                                                                        fontSize:
                                                                            10,

                                                                        marginBottom:
                                                                            4,
                                                                    }}
                                                                >
                                                                    Máximo
                                                                </Text>

                                                                <TextInput
                                                                    value={
                                                                        config.maxSelections
                                                                    }
                                                                    onChangeText={(
                                                                        value,
                                                                    ) =>
                                                                        updateModifierGroupConfig(
                                                                            group.id,
                                                                            {
                                                                                maxSelections:
                                                                                    sanitizeInteger(
                                                                                        value,
                                                                                    ),
                                                                            },
                                                                        )
                                                                    }
                                                                    style={
                                                                        styles.input
                                                                    }
                                                                    keyboardType="number-pad"
                                                                    editable={
                                                                        !isProcessing
                                                                    }
                                                                />
                                                            </View>
                                                        </View>

                                                        <View>
                                                            <Text
                                                                style={{
                                                                    color:
                                                                        '#AAAAAA',
                                                                    fontSize:
                                                                        10,
                                                                    marginBottom:
                                                                        4,
                                                                }}
                                                            >
                                                                Opciones disponibles
                                                            </Text>

                                                            <TouchableOpacity
                                                                disabled={
                                                                    isProcessing
                                                                }
                                                                onPress={() =>
                                                                    setOptionSelectorGroupId(
                                                                        group.id,
                                                                    )
                                                                }
                                                                style={{
                                                                    paddingVertical:
                                                                        11,
                                                                    paddingHorizontal:
                                                                        12,
                                                                    borderRadius:
                                                                        8,
                                                                    borderWidth:
                                                                        1,
                                                                    borderColor:
                                                                        '#555555',
                                                                    backgroundColor:
                                                                        '#191919',
                                                                    flexDirection:
                                                                        'row',
                                                                    alignItems:
                                                                        'center',
                                                                    justifyContent:
                                                                        'space-between',
                                                                }}
                                                            >
                                                                <Text
                                                                    style={{
                                                                        color:
                                                                            '#FFFFFF',
                                                                        fontSize:
                                                                            11,
                                                                        fontWeight:
                                                                            '700',
                                                                    }}
                                                                >
                                                                    {getModifierOptionSummary(
                                                                        group.id,
                                                                    )}
                                                                </Text>

                                                                <Text
                                                                    style={{
                                                                        color:
                                                                            businessTheme.primary,
                                                                        fontSize:
                                                                            12,
                                                                    }}
                                                                >
                                                                    ▼
                                                                </Text>
                                                            </TouchableOpacity>
                                                        </View>

                                                        <View
                                                            style={{
                                                                flexDirection:
                                                                    'row',

                                                                alignItems:
                                                                    'center',

                                                                justifyContent:
                                                                    'space-between',
                                                            }}
                                                        >
                                                            <View
                                                                style={{
                                                                    flex:
                                                                        1,

                                                                    paddingRight:
                                                                        12,
                                                                }}
                                                            >
                                                                <Text
                                                                    style={{
                                                                        color:
                                                                            '#FFFFFF',

                                                                        fontSize:
                                                                            11,

                                                                        fontWeight:
                                                                            '800',
                                                                    }}
                                                                >
                                                                    Permitir repetidos
                                                                </Text>

                                                                <Text
                                                                    style={{
                                                                        color:
                                                                            '#777777',

                                                                        fontSize:
                                                                            9,

                                                                        marginTop:
                                                                            2,
                                                                    }}
                                                                >
                                                                    Permite seleccionar varias veces la misma opción.
                                                                </Text>
                                                            </View>

                                                            <Switch
                                                                value={
                                                                    config.allowDuplicates
                                                                }
                                                                onValueChange={(
                                                                    value,
                                                                ) =>
                                                                    updateModifierGroupConfig(
                                                                        group.id,
                                                                        {
                                                                            allowDuplicates:
                                                                                value,
                                                                        },
                                                                    )
                                                                }
                                                            />
                                                        </View>

                                                        <View
                                                            style={{
                                                                flexDirection:
                                                                    'row',

                                                                alignItems:
                                                                    'center',

                                                                justifyContent:
                                                                    'space-between',
                                                            }}
                                                        >
                                                            <View
                                                                style={{
                                                                    flex:
                                                                        1,

                                                                    paddingRight:
                                                                        12,
                                                                }}
                                                            >
                                                                <Text
                                                                    style={{
                                                                        color:
                                                                            '#FFFFFF',

                                                                        fontSize:
                                                                            11,

                                                                        fontWeight:
                                                                            '800',
                                                                    }}
                                                                >
                                                                    Obligatorio
                                                                </Text>

                                                                <Text
                                                                    style={{
                                                                        color:
                                                                            '#777777',

                                                                        fontSize:
                                                                            9,

                                                                        marginTop:
                                                                            2,
                                                                    }}
                                                                >
                                                                    El cliente deberá cumplir el mínimo antes de agregarlo.
                                                                </Text>
                                                            </View>

                                                            <Switch
                                                                value={
                                                                    config.isRequired
                                                                }
                                                                onValueChange={(
                                                                    value,
                                                                ) => {
                                                                    updateModifierGroupConfig(
                                                                        group.id,
                                                                        {
                                                                            isRequired:
                                                                                value,

                                                                            minSelections:
                                                                                value &&
                                                                                Number(
                                                                                    config.minSelections,
                                                                                ) ===
                                                                                0
                                                                                    ? '1'
                                                                                    : config.minSelections,
                                                                        },
                                                                    );
                                                                }}
                                                            />
                                                        </View>
                                                    </View>
                                                ) : null}
                                            </View>
                                        );
                                    },
                                )
                            )}

                            {visibleModifierGroups.length ===
                            0 ? (
                                <Text
                                    style={{
                                        color:
                                            '#777777',

                                        fontSize:
                                            10,

                                        marginTop:
                                            6,
                                    }}
                                >
                                    No hay grupos de modificadores disponibles.
                                </Text>
                            ) : null}
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
                        </ScrollView>
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

function sanitizeInteger(
    value: string,
): string {
    return value.replace(
        /[^0-9]/g,
        '',
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