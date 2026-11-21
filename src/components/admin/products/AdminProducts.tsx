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
    useWindowDimensions,
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

import { ProductInventoryRecipeModal } from '../inventory/ProductInventoryRecipeModal';

import { ProductPersonalizationModal } from './ProductPersonalizationModal';

import {
    getProductPersonalizationEnabled,
    setProductPersonalizationEnabled,
} from '../../../services/productCheckService';

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
    allowsOilFryer: boolean;
    allowsAirFryer: boolean;
    airFryerExtraMinutes: string;
    maxExtraItems: string;
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
    allowsOilFryer: false,
    allowsAirFryer: false,
    airFryerExtraMinutes: '5',
    maxExtraItems: '5',
};

export function AdminProducts({
    onProductsChanged,
}: AdminProductsProps) {
  const {
        business,
        theme: businessTheme,
    } = useBusiness();

    setBrandPrimaryColor(
        businessTheme.primary,
    );

    const {
        width,
    } = useWindowDimensions();

    const isPhone =
        width < 700;

    const productImagePlaceholder =
        (
            business?.identity.shortName ||
            business?.identity.businessName ||
            'Dorian POS'
        )
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part[0]?.toUpperCase() ?? '')
            .join('') ||
        'DP';

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
        inventoryRecipeProduct,
        setInventoryRecipeProduct,
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
        personalizationEnabled,
        setPersonalizationEnabled,
    ] = useState(false);

    const [
        isPersonalizationModalVisible,
        setIsPersonalizationModalVisible,
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
            setPersonalizationEnabled(false);
            setIsPersonalizationModalVisible(false);

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

            setPersonalizationEnabled(false);
            setIsPersonalizationModalVisible(false);

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

                allowsOilFryer:
                    product.allows_oil_fryer ===
                    true,

                allowsAirFryer:
                    product.allows_air_fryer ===
                    true,

                airFryerExtraMinutes:
                    String(
                        product.air_fryer_extra_minutes ??
                        5,
                    ),

                maxExtraItems:
                    String(
                        product.max_extra_items ??
                        5,
                    ),
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
                    productPersonalizationEnabled,
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
                    getProductPersonalizationEnabled(
                        product.id,
                    ),
                ]);

                setPersonalizationEnabled(
                    productPersonalizationEnabled,
                );

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
                            group.kind === 'extra'
                                ? '10'
                                : '1',

                        allowDuplicates:
                            group.kind === 'extra',

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
                        ids.push(
                            ...getModifiersForGroup(
                                group.modifierGroupId,
                            ).map(
                                modifier =>
                                    modifier.id,
                            ),
                        );

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

            const airFryerExtraMinutes =
                Number(
                    form.airFryerExtraMinutes,
                );

            if (
                form.allowsAirFryer &&
                (
                    !Number.isInteger(
                        airFryerExtraMinutes,
                    ) ||
                    airFryerExtraMinutes < 0 ||
                    airFryerExtraMinutes > 120
                )
            ) {
                Alert.alert(
                    'Tiempo inválido',
                    'Los minutos extra de freidora de aire deben ser un entero entre 0 y 120.',
                );

                return;
            }

            const maxExtraItems =
                Number(
                    form.maxExtraItems,
                );

            if (
                !Number.isInteger(
                    maxExtraItems,
                ) ||
                maxExtraItems < 0 ||
                maxExtraItems > 50
            ) {
                Alert.alert(
                    'Límite de extras inválido',
                    'El máximo total de extras debe ser un entero entre 0 y 50.',
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

                            allowsOilFryer:
                                form.allowsOilFryer,

                            allowsAirFryer:
                                form.allowsAirFryer,

                            airFryerExtraMinutes:
                                form.allowsAirFryer
                                    ? airFryerExtraMinutes
                                    : 0,

                            maxExtraItems,

                            allowZeroPrice:
                                isComboComplement,
                        },
                    );

                    await setProductPersonalizationEnabled(
                        selectedProduct.id,
                        personalizationEnabled,
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

                            allowsOilFryer:
                                form.allowsOilFryer,

                            allowsAirFryer:
                                form.allowsAirFryer,

                            airFryerExtraMinutes:
                                form.allowsAirFryer
                                    ? airFryerExtraMinutes
                                    : 0,

                            maxExtraItems,

                            allowZeroPrice:
                                isComboComplement,
                        });

                    await setProductPersonalizationEnabled(
                        createdProduct.id,
                        personalizationEnabled,
                    );

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

                setPersonalizationEnabled(false);
                setIsPersonalizationModalVisible(false);

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
                    style={[styles.productThumbnailBox, !isActive && styles.inactiveCardContent]}
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
                            {productImagePlaceholder}
                        </Text>
                    )}
                </View>

                <View
                    style={[styles.productInfo, !isActive && styles.inactiveCardContent]}
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

                        {!isPhone ? (
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
                        ) : null}
                    </View>

                    {isPhone ? (
                        <View
                            style={[
                                styles.statusBadge,
                                styles.statusBadgePhone,
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
                    ) : null}

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
                        style={[styles.editButton, !isActive && styles.inactiveSecondaryAction]}
                        disabled={
                            isProcessing
                        }
                        onPress={() =>
                            setInventoryRecipeProduct(
                                item,
                            )
                        }
                    >
                        <Text
                            style={
                                styles.editButtonText
                            }
                        >
                            Receta
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.editButton, !isActive && styles.inactiveSecondaryAction]}
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
            <ProductInventoryRecipeModal
                visible={
                    inventoryRecipeProduct !==
                    null
                }
                productId={
                    inventoryRecipeProduct
                        ?.id ??
                    null
                }
                productName={
                    inventoryRecipeProduct
                        ?.name ??
                    ''
                }
                productPrice={
                    Number(
                        inventoryRecipeProduct
                            ?.price ??
                        0,
                    )
                }
                onClose={
                    () =>
                        setInventoryRecipeProduct(
                            null,
                        )
                }
            />

      <ProductPersonalizationModal
        visible={isPersonalizationModalVisible}
        product={selectedProduct}
        onClose={() =>
          setIsPersonalizationModalVisible(false)
        }
      />

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
                                        {productImagePlaceholder}
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

                        <View
                            style={
                                styles.cookingMethodsCard
                            }
                        >
                            <Text
                                style={
                                    styles.cookingMethodsTitle
                                }
                            >
                                Método de cocción
                            </Text>

                            <Text
                                style={
                                    styles.cookingMethodsSubtitle
                                }
                            >
                                Activa las opciones que el cliente puede elegir en POS y web.
                            </Text>

                            <View
                                style={
                                    styles.cookingMethodRow
                                }
                            >
                                <View
                                    style={
                                        styles.cookingMethodText
                                    }
                                >
                                    <Text
                                        style={
                                            styles.availableTitle
                                        }
                                    >
                                        Aceite
                                    </Text>

                                    <Text
                                        style={
                                            styles.availableSubtitle
                                        }
                                    >
                                        Preparación tradicional en aceite.
                                    </Text>
                                </View>

                                <Switch
                                    value={
                                        form.allowsOilFryer
                                    }
                                    onValueChange={(
                                        value,
                                    ) =>
                                        setForm(
                                            current => ({
                                                ...current,
                                                allowsOilFryer:
                                                    value,
                                            }),
                                        )
                                    }
                                />
                            </View>

                            <View
                                style={
                                    styles.cookingMethodRow
                                }
                            >
                                <View
                                    style={
                                        styles.cookingMethodText
                                    }
                                >
                                    <Text
                                        style={
                                            styles.availableTitle
                                        }
                                    >
                                        Freidora de aire
                                    </Text>

                                    <Text
                                        style={
                                            styles.availableSubtitle
                                        }
                                    >
                                        Mostrará un aviso de mayor tiempo de preparación.
                                    </Text>
                                </View>

                                <Switch
                                    value={
                                        form.allowsAirFryer
                                    }
                                    onValueChange={(
                                        value,
                                    ) =>
                                        setForm(
                                            current => ({
                                                ...current,
                                                allowsAirFryer:
                                                    value,
                                            }),
                                        )
                                    }
                                />
                            </View>

                            {form.allowsAirFryer ? (
                                <>
                                    <Text
                                        style={
                                            styles.inputLabel
                                        }
                                    >
                                        Minutos extra aproximados
                                    </Text>

                                    <TextInput
                                        value={
                                            form.airFryerExtraMinutes
                                        }
                                        onChangeText={(
                                            value,
                                        ) =>
                                            setForm(
                                                current => ({
                                                    ...current,
                                                    airFryerExtraMinutes:
                                                        value.replace(
                                                            /[^0-9]/g,
                                                            '',
                                                        ),
                                                }),
                                            )
                                        }
                                        style={
                                            styles.input
                                        }
                                        keyboardType="number-pad"
                                        placeholder="5"
                                        placeholderTextColor="#777777"
                                        editable={
                                            !isProcessing
                                        }
                                    />
                                </>
                            ) : null}
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
                                marginTop: 16,
                                padding: 12,
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: personalizationEnabled
                                    ? businessTheme.primary
                                    : '#444444',
                                backgroundColor: personalizationEnabled
                                    ? withAlpha(
                                        businessTheme.primary,
                                        0.08,
                                      )
                                    : '#1B1B1B',
                            }}
                        >
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 12,
                                }}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text
                                        style={{
                                            color: '#FFFFFF',
                                            fontSize: 14,
                                            fontWeight: '900',
                                        }}
                                    >
                                        Personalización
                                    </Text>
                                    <Text
                                        style={{
                                            color: '#9A9A9A',
                                            fontSize: 10,
                                            lineHeight: 15,
                                            marginTop: 3,
                                        }}
                                    >
                                        La categoría puede aportar una plantilla automática. Activa este switch sólo si quieres agregar personalización propia adicional a este producto.
                                    </Text>
                                </View>

                                <Switch
                                    value={personalizationEnabled}
                                    disabled={isProcessing}
                                    onValueChange={setPersonalizationEnabled}
                                    trackColor={{
                                        false: '#4A4A4A',
                                        true: '#6FAFAD',
                                    }}
                                    thumbColor={
                                        personalizationEnabled
                                            ? '#8ED3D0'
                                            : '#BDBDBD'
                                    }
                                />
                            </View>

                            {selectedProduct ? (
                                    <TouchableOpacity
                                        onPress={() =>
                                            setIsPersonalizationModalVisible(true)
                                        }
                                        disabled={isProcessing}
                                        style={{
                                            marginTop: 12,
                                            minHeight: 44,
                                            borderRadius: 9,
                                            borderWidth: 1,
                                            borderColor: businessTheme.primary,
                                            backgroundColor: withAlpha(
                                                businessTheme.primary,
                                                0.12,
                                            ),
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: businessTheme.primary,
                                                fontSize: 11,
                                                fontWeight: '900',
                                            }}
                                        >
                                            Configurar personalización
                                        </Text>
                                    </TouchableOpacity>
                                ) : (
                                    <Text
                                        style={{
                                            color: '#8F8F8F',
                                            fontSize: 10,
                                            lineHeight: 15,
                                            marginTop: 10,
                                        }}
                                    >
                                        Guarda primero el producto. Después podrás revisar la plantilla de categoría y agregar excepciones propias.
                                    </Text>
                                )}
                        </View>

                        {visibleModifierGroups.some(
                            group =>
                                group.kind ===
                                'extra',
                        ) ? (
                            <View
                                style={{
                                    marginTop: 16,
                                    padding: 12,
                                    borderRadius: 10,
                                    borderWidth: 1,
                                    borderColor: '#6B5600',
                                    backgroundColor: '#211C0E',
                                }}
                            >
                                <Text
                                    style={{
                                        color: businessTheme.primary,
                                        fontSize: 14,
                                        fontWeight: '900',
                                        marginBottom: 4,
                                    }}
                                >
                                    + Extras cobrables
                                </Text>

                                <Text
                                    style={{
                                        color: '#B7B7B7',
                                        fontSize: 10,
                                        lineHeight: 15,
                                        marginBottom: 10,
                                    }}
                                >
                                    Activa aquí los ingredientes o adicionales que el cliente podrá agregar con costo extra.
                                </Text>

                                <View
                                    style={{
                                        marginBottom: 12,
                                        padding: 10,
                                        borderRadius: 8,
                                        backgroundColor: '#171717',
                                        borderWidth: 1,
                                        borderColor: '#454545',
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: '#FFFFFF',
                                            fontSize: 11,
                                            fontWeight: '900',
                                            marginBottom: 4,
                                        }}
                                    >
                                        Máximo total de extras
                                    </Text>

                                    <Text
                                        style={{
                                            color: '#8F8F8F',
                                            fontSize: 9,
                                            lineHeight: 13,
                                            marginBottom: 8,
                                        }}
                                    >
                                        Límite combinado entre todos los grupos Extra de este producto. Ejemplo: 2 carnes + 2 salsas + 1 nieve = 5 extras.
                                    </Text>

                                    <TextInput
                                        value={form.maxExtraItems}
                                        onChangeText={value =>
                                            setForm(current => ({
                                                ...current,
                                                maxExtraItems: value.replace(/[^0-9]/g, ''),
                                            }))
                                        }
                                        keyboardType="number-pad"
                                        maxLength={2}
                                        placeholder="5"
                                        placeholderTextColor="#666666"
                                        style={{
                                            minHeight: 42,
                                            paddingHorizontal: 12,
                                            borderRadius: 8,
                                            borderWidth: 1,
                                            borderColor: '#555555',
                                            backgroundColor: '#202020',
                                            color: '#FFFFFF',
                                            fontSize: 13,
                                            fontWeight: '800',
                                        }}
                                    />
                                </View>

                                {visibleModifierGroups
                                    .filter(
                                        group =>
                                            group.kind ===
                                            'extra',
                                    )
                                    .map(
                                        group => {
                                            const config =
                                                productModifierGroups.find(
                                                    item =>
                                                        item.modifierGroupId ===
                                                        group.id,
                                                );

                                            const selected =
                                                Boolean(config);

                                            return (
                                                <View
                                                    key={group.id}
                                                    style={{
                                                        marginTop: 8,
                                                        padding: 10,
                                                        borderRadius: 8,
                                                        borderWidth: 1,
                                                        borderColor: selected
                                                            ? businessTheme.primary
                                                            : '#4B4430',
                                                        backgroundColor: selected
                                                            ? withAlpha(
                                                                businessTheme.primary,
                                                                0.12,
                                                              )
                                                            : '#1B1B1B',
                                                    }}
                                                >
                                                    <View
                                                        style={{
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            gap: 10,
                                                        }}
                                                    >
                                                        <View style={{ flex: 1 }}>
                                                            <Text
                                                                style={{
                                                                    color: selected
                                                                        ? businessTheme.primary
                                                                        : '#FFFFFF',
                                                                    fontSize: 12,
                                                                    fontWeight: '900',
                                                                }}
                                                            >
                                                                {group.name}
                                                            </Text>
                                                            <Text
                                                                style={{
                                                                    color: '#8F8F8F',
                                                                    fontSize: 9,
                                                                    marginTop: 2,
                                                                }}
                                                            >
                                                                {selected
                                                                    ? `${getModifierOptionSummary(group.id)} · máximo ${config?.maxSelections ?? 10}`
                                                                    : 'No disponible en este producto'}
                                                            </Text>
                                                        </View>

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
                                                            style={{
                                                                minHeight: 38,
                                                                paddingHorizontal: 12,
                                                                borderRadius: 8,
                                                                borderWidth: 1,
                                                                borderColor: selected
                                                                    ? '#8D3A3A'
                                                                    : businessTheme.primary,
                                                                backgroundColor: selected
                                                                    ? '#381C1C'
                                                                    : withAlpha(
                                                                        businessTheme.primary,
                                                                        0.16,
                                                                      ),
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                            }}
                                                        >
                                                            <Text
                                                                style={{
                                                                    color: selected
                                                                        ? '#FF9B9B'
                                                                        : businessTheme.primary,
                                                                    fontSize: 10,
                                                                    fontWeight: '900',
                                                                }}
                                                            >
                                                                {selected
                                                                    ? 'Quitar'
                                                                    : 'Activar'}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    </View>

                                                    {config ? (
                                                        <View
                                                            style={{
                                                                marginTop: 10,
                                                                flexDirection: 'row',
                                                                gap: 8,
                                                            }}
                                                        >
                                                            <TouchableOpacity
                                                                onPress={() =>
                                                                    setOptionSelectorGroupId(
                                                                        group.id,
                                                                    )
                                                                }
                                                                style={{
                                                                    flex: 1,
                                                                    minHeight: 40,
                                                                    borderRadius: 8,
                                                                    borderWidth: 1,
                                                                    borderColor: '#555555',
                                                                    backgroundColor: '#191919',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                }}
                                                            >
                                                                <Text
                                                                    style={{
                                                                        color: '#FFFFFF',
                                                                        fontSize: 10,
                                                                        fontWeight: '800',
                                                                    }}
                                                                >
                                                                    Elegir extras
                                                                </Text>
                                                            </TouchableOpacity>

                                                            <View
                                                                style={{
                                                                    minHeight: 40,
                                                                    paddingHorizontal: 12,
                                                                    borderRadius: 8,
                                                                    backgroundColor: '#262626',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                }}
                                                            >
                                                                <Text
                                                                    style={{
                                                                        color: '#BDBDBD',
                                                                        fontSize: 9,
                                                                        fontWeight: '700',
                                                                    }}
                                                                >
                                                                    0–{config.maxSelections}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    ) : null}
                                                </View>
                                            );
                                        },
                                    )}
                            </View>
                        ) : null}

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
                                Opciones del producto
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
                                Configura aquí las opciones propias del producto: carne, sabor, tamaño, salsa incluida u otras elecciones.
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
                                visibleModifierGroups
                                    .filter(
                                        group =>
                                            group.kind !==
                                            'extra',
                                    )
                                    .map(
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
                                                                    {group.kind === 'extra' ? 'Permitir cantidad múltiple' : 'Permitir repetidos'}
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
                                                                    {group.kind === 'extra' ? 'Permite agregar 2x, 3x o más del mismo extra.' : 'Permite seleccionar varias veces la misma opción.'}
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