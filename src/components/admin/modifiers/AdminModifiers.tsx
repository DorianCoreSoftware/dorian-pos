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
    createModifier,
    createModifierGroup,
    getAllModifiers,
    getModifierGroups,
    setModifierAvailable,
    setModifierGroupActive,
    updateModifier,
    updateModifierGroup,
} from '../../../services/modifierService';

import {
    ModifierGroupEntity,
    ModifierWithGroup,
} from '../../../repositories/ModifierRepository';

import {
    styles,
} from './AdminModifiers.styles';

type ModifierFilter =
    | 'all'
    | string;

interface ModifierFormState {
    name: string;
    extraPrice: string;
    groupId: string;
    isAvailable: boolean;
}

const INITIAL_FORM:
    ModifierFormState = {
    name: '',
    extraPrice: '0',
    groupId: '',
    isAvailable: true,
};

interface ModifierGroupFormState {
    name: string;
    code: string;
    position: string;
    isActive: boolean;
}

const INITIAL_GROUP_FORM:
    ModifierGroupFormState = {
    name: '',
    code: '',
    position: '1',
    isActive: true,
};

interface AdminModifiersProps {
    onModifiersChanged:
    () => Promise<void>;
}

export function AdminModifiers({
    onModifiersChanged,
}: AdminModifiersProps) {
    const [
        modifiers,
        setModifiers,
    ] = useState<ModifierWithGroup[]>([]);

    const [
        groups,
        setGroups,
    ] = useState<ModifierGroupEntity[]>([]);

    const [
        selectedModifier,
        setSelectedModifier,
    ] = useState<ModifierWithGroup | null>(
        null,
    );

    const [
        form,
        setForm,
    ] = useState<ModifierFormState>(
        INITIAL_FORM,
    );

    const [
        activeFilter,
        setActiveFilter,
    ] = useState<ModifierFilter>(
        'all',
    );

    const [
        searchText,
        setSearchText,
    ] = useState('');

    const [
        showUnavailable,
        setShowUnavailable,
    ] = useState(true);

    const [
        isModalVisible,
        setIsModalVisible,
    ] = useState(false);

    const [
        isGroupsModalVisible,
        setIsGroupsModalVisible,
    ] = useState(false);

    const [
        isGroupFormVisible,
        setIsGroupFormVisible,
    ] = useState(false);

    const [
        selectedGroup,
        setSelectedGroup,
    ] = useState<ModifierGroupEntity | null>(
        null,
    );

    const [
        groupForm,
        setGroupForm,
    ] = useState<ModifierGroupFormState>(
        INITIAL_GROUP_FORM,
    );

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
                        modifierData,
                        groupData,
                    ] =
                        await Promise.all([
                            getAllModifiers(),
                            getModifierGroups(),
                        ]);

                    setModifiers(
                        modifierData,
                    );

                    setGroups(
                        groupData,
                    );
                } catch (error) {
                    console.error(
                        'Error cargando modificadores administrativos:',
                        error,
                    );

                    setErrorMessage(
                        error instanceof Error
                            ? error.message
                            : 'No se pudieron cargar los modificadores.',
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

    const activeGroups =
        useMemo(
            () =>
                groups.filter(
                    group =>
                        group.is_active,
                ),
            [groups],
        );

    const visibleModifiers =
        useMemo(() => {
            const normalizedSearch =
                normalizeText(
                    searchText,
                );

            return modifiers
                .filter(
                    (modifier) => {
                        if (
                            !showUnavailable &&
                            modifier.is_available ===
                            false
                        ) {
                            return false;
                        }

                        if (
                            activeFilter !==
                            'all' &&
                            modifier.group_id !==
                            activeFilter
                        ) {
                            return false;
                        }

                        if (!normalizedSearch) {
                            return true;
                        }

                        return normalizeText(
                            modifier.name,
                        ).includes(
                            normalizedSearch,
                        );
                    },
                )
                .sort(
                    (
                        modifierA,
                        modifierB,
                    ) => {
                        const groupPositionA =
                            modifierA.group
                                ?.position ??
                            Number.MAX_SAFE_INTEGER;

                        const groupPositionB =
                            modifierB.group
                                ?.position ??
                            Number.MAX_SAFE_INTEGER;

                        if (
                            groupPositionA !==
                            groupPositionB
                        ) {
                            return (
                                groupPositionA -
                                groupPositionB
                            );
                        }

                        return modifierA.name.localeCompare(
                            modifierB.name,
                            'es',
                            {
                                sensitivity:
                                    'base',
                            },
                        );
                    },
                );
        }, [
            modifiers,
            activeFilter,
            searchText,
            showUnavailable,
        ]);

    const openGroupsModal =
        (): void => {
            setSelectedGroup(
                null,
            );

            setGroupForm(
                INITIAL_GROUP_FORM,
            );

            setIsGroupFormVisible(
                false,
            );

            setIsGroupsModalVisible(
                true,
            );
        };

    const closeGroupsModal =
        (): void => {
            if (isProcessing) {
                return;
            }

            setIsGroupsModalVisible(
                false,
            );

            setIsGroupFormVisible(
                false,
            );

            setSelectedGroup(
                null,
            );

            setGroupForm(
                INITIAL_GROUP_FORM,
            );
        };

    const openCreateGroupForm =
        (): void => {
            const nextPosition =
                groups.length > 0
                    ? Math.max(
                        ...groups.map(
                            group =>
                                group.position,
                        ),
                    ) + 1
                    : 1;

            setSelectedGroup(
                null,
            );

            setGroupForm({
                ...INITIAL_GROUP_FORM,
                position:
                    String(
                        nextPosition,
                    ),
            });

            setIsGroupFormVisible(
                true,
            );
        };

    const openEditGroupForm = (
        group: ModifierGroupEntity,
    ): void => {
            setSelectedGroup(
                group,
            );

            setGroupForm({
                name:
                    group.name,

                code:
                    group.code,

                position:
                    String(
                        group.position,
                    ),

                isActive:
                    group.is_active,
            });

            setIsGroupFormVisible(
                true,
            );
        };

    const closeGroupForm =
        (): void => {
            if (isProcessing) {
                return;
            }

            setIsGroupFormVisible(
                false,
            );

            setSelectedGroup(
                null,
            );

            setGroupForm(
                INITIAL_GROUP_FORM,
            );
        };

    const handleSaveGroup =
        async (): Promise<void> => {
            if (isProcessing) {
                return;
            }

            const cleanName =
                groupForm.name.trim();

            const parsedPosition =
                Number(
                    groupForm.position,
                );

            if (!cleanName) {
                Alert.alert(
                    'Campo requerido',
                    'Ingresa el nombre del grupo.',
                );

                return;
            }

            if (
                !Number.isInteger(
                    parsedPosition,
                ) ||
                parsedPosition < 0
            ) {
                Alert.alert(
                    'Posición inválida',
                    'La posición debe ser un número entero igual o mayor a 0.',
                );

                return;
            }

            try {
                setIsProcessing(
                    true,
                );

                if (
                    selectedGroup
                ) {
                    await updateModifierGroup(
                        selectedGroup.id,
                        {
                            name:
                                cleanName,

                            position:
                                parsedPosition,

                            isActive:
                                groupForm.isActive,
                        },
                    );

                    Alert.alert(
                        'Grupo actualizado',
                        `${cleanName} fue actualizado correctamente.`,
                    );
                } else {
                    const generatedCode =
                        createGroupCode(
                            cleanName,
                        );

                    await createModifierGroup({
                        name:
                            cleanName,

                        code:
                            generatedCode,

                        position:
                            parsedPosition,
                    });

                    Alert.alert(
                        'Grupo creado',
                        `${cleanName} fue agregado correctamente.`,
                    );
                }

                setIsGroupFormVisible(
                    false,
                );

                setSelectedGroup(
                    null,
                );

                setGroupForm(
                    INITIAL_GROUP_FORM,
                );

                await Promise.all([
                    loadData(),
                    onModifiersChanged(),
                ]);
            } catch (error) {
                Alert.alert(
                    'Error',
                    error instanceof Error
                        ? error.message
                        : 'No se pudo guardar el grupo.',
                );
            } finally {
                setIsProcessing(
                    false,
                );
            }
        };

    const handleToggleGroupActive = (
        group: ModifierGroupEntity,
    ): void => {
            const willActivate =
                !group.is_active;

            Alert.alert(
                willActivate
                    ? 'Activar grupo'
                    : 'Desactivar grupo',

                willActivate
                    ? `¿Deseas activar "${group.name}"?`
                    : `¿Deseas desactivar "${group.name}"? Los modificadores existentes conservarán el grupo, pero ya no podrá seleccionarse al crear o editar modificadores.`,

                [
                    {
                        text:
                            'Cancelar',
                        style:
                            'cancel',
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
                        onPress:
                            () => {
                                void executeToggleGroupActive(
                                    group,
                                    willActivate,
                                );
                            },
                    },
                ],
            );
        };

    const executeToggleGroupActive =
        async (
            group: ModifierGroupEntity,
            isActive: boolean,
        ): Promise<void> => {
            try {
                setIsProcessing(
                    true,
                );

                await setModifierGroupActive(
                    group.id,
                    isActive,
                );

                await Promise.all([
                    loadData(),
                    onModifiersChanged(),
                ]);
            } catch (error) {
                Alert.alert(
                    'Error',
                    error instanceof Error
                        ? error.message
                        : 'No se pudo cambiar el estado del grupo.',
                );
            } finally {
                setIsProcessing(
                    false,
                );
            }
        };

    const openCreateModal =
        (): void => {
            setSelectedModifier(
                null,
            );

            const defaultGroup =
                activeGroups[0] ??
                null;

            if (!defaultGroup) {
                Alert.alert(
                    'Sin grupos disponibles',
                    'Activa o crea un grupo de modificadores antes de agregar un modificador.',
                );

                return;
            }

            setForm({
                ...INITIAL_FORM,
                groupId:
                    defaultGroup.id,
            });

            setIsModalVisible(
                true,
            );
        };

    const openEditModal = (
        modifier: ModifierWithGroup,
    ): void => {
        setSelectedModifier(
            modifier,
        );

        setForm({
            name:
                modifier.name,

            extraPrice:
                String(
                    modifier.extra_price,
                ),

            groupId:
                modifier.group_id ??
                '',

            isAvailable:
                modifier.is_available !==
                false,
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

            setSelectedModifier(
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

            const parsedExtraPrice =
                Number(
                    form.extraPrice,
                );

            if (!cleanName) {
                Alert.alert(
                    'Campo requerido',
                    'Ingresa el nombre del modificador.',
                );

                return;
            }

            if (
                !Number.isFinite(
                    parsedExtraPrice,
                ) ||
                parsedExtraPrice < 0
            ) {
                Alert.alert(
                    'Precio inválido',
                    'El precio extra no puede ser negativo.',
                );

                return;
            }

            if (
                !form.groupId
            ) {
                Alert.alert(
                    'Grupo requerido',
                    'Selecciona un grupo para el modificador.',
                );

                return;
            }

            try {
                setIsProcessing(true);

                if (
                    selectedModifier
                ) {
                    await updateModifier(
                        selectedModifier.id,
                        {
                            name:
                                cleanName,

                            extraPrice:
                                parsedExtraPrice,

                            groupId:
                                form.groupId,

                            isAvailable:
                                form.isAvailable,
                        },
                    );

                    Alert.alert(
                        'Modificador actualizado',
                        `${cleanName} fue actualizado correctamente.`,
                    );
                } else {
                    await createModifier({
                        name:
                            cleanName,

                        extraPrice:
                            parsedExtraPrice,

                        groupId:
                            form.groupId,
                    });

                    Alert.alert(
                        'Modificador creado',
                        `${cleanName} fue agregado correctamente.`,
                    );
                }

                setIsModalVisible(
                    false,
                );

                setSelectedModifier(
                    null,
                );

                setForm(
                    INITIAL_FORM,
                );

                await Promise.all([
                    loadData(),
                    onModifiersChanged(),
                ]);
            } catch (error) {
                Alert.alert(
                    'Error',
                    error instanceof Error
                        ? error.message
                        : 'No se pudo guardar el modificador.',
                );
            } finally {
                setIsProcessing(false);
            }
        };

    const handleToggleAvailable = (
        modifier: ModifierWithGroup,
    ): void => {
        const willActivate =
            modifier.is_available ===
            false;

        Alert.alert(
            willActivate
                ? 'Activar modificador'
                : 'Desactivar modificador',

            willActivate
                ? `¿Deseas volver a activar "${modifier.name}"?`
                : `¿Deseas desactivar "${modifier.name}"? Ya no estará disponible para nuevos pedidos.`,

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
                        void executeToggleAvailable(
                            modifier,
                            willActivate,
                        );
                    },
                },
            ],
        );
    };

    const executeToggleAvailable =
        async (
            modifier: ModifierWithGroup,
            isAvailable: boolean,
        ): Promise<void> => {
            try {
                setIsProcessing(true);

                await setModifierAvailable(
                    modifier.id,
                    isAvailable,
                );

                await Promise.all([
                    loadData(),
                    onModifiersChanged(),
                ]);
            } catch (error) {
                Alert.alert(
                    'Error',
                    error instanceof Error
                        ? error.message
                        : 'No se pudo cambiar el estado del modificador.',
                );
            } finally {
                setIsProcessing(false);
            }
        };

    const renderModifier = ({
        item,
    }: {
        item: ModifierWithGroup;
    }) => {
        const isAvailable =
            item.is_available !==
            false;

        return (
            <View
                style={[
                    styles.modifierCard,

                    !isAvailable &&
                    styles.modifierCardInactive,
                ]}
            >
                <View
                    style={
                        styles.modifierInfo
                    }
                >
                    <View
                        style={
                            styles.modifierTitleRow
                        }
                    >
                        <Text
                            style={
                                styles.modifierName
                            }
                        >
                            {item.name}
                        </Text>

                        <View
                            style={[
                                styles.groupBadge,

                                item.group?.code ===
                                    'meat'
                                    ? styles.groupBadgeMeat
                                    : item.group?.code ===
                                        'sauce'
                                        ? styles.groupBadgeSauce
                                        : item.group?.code ===
                                            'drink_flavor' ||
                                            item.group?.code ===
                                                'ice_cream_flavor'
                                            ? styles.groupBadgeFlavor
                                            : styles.groupBadgeOther,
                            ]}
                        >
                            <Text
                                style={
                                    styles.groupBadgeText
                                }
                            >
                                {item.group?.name ??
                                    'Sin grupo'}
                            </Text>
                        </View>

                        <View
                            style={[
                                styles.statusBadge,

                                isAvailable
                                    ? styles.statusBadgeActive
                                    : styles.statusBadgeInactive,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.statusText,

                                    isAvailable
                                        ? styles.statusTextActive
                                        : styles.statusTextInactive,
                                ]}
                            >
                                {isAvailable
                                    ? 'DISPONIBLE'
                                    : 'INACTIVO'}
                            </Text>
                        </View>
                    </View>

                    <Text
                        style={
                            styles.extraPriceText
                        }
                    >
                        Precio extra: $
                        {Number(
                            item.extra_price,
                        ).toFixed(2)}
                    </Text>
                </View>

                <View
                    style={
                        styles.modifierActions
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

                            isAvailable
                                ? styles.deactivateButton
                                : styles.activateButton,
                        ]}
                        disabled={
                            isProcessing
                        }
                        onPress={() =>
                            handleToggleAvailable(
                                item,
                            )
                        }
                    >
                        <Text
                            style={
                                styles.stateButtonText
                            }
                        >
                            {isAvailable
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
                    Cargando modificadores...
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
                        placeholder="Buscar modificador..."
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
                        styles.unavailableFilter
                    }
                >
                    <Text
                        style={
                            styles.unavailableFilterText
                        }
                    >
                        Mostrar inactivos
                    </Text>

                    <Switch
                        value={
                            showUnavailable
                        }
                        onValueChange={
                            setShowUnavailable
                        }
                    />
                </View>

                <TouchableOpacity
                    style={
                        styles.manageGroupsButton
                    }
                    onPress={
                        openGroupsModal
                    }
                >
                    <Text
                        style={
                            styles.manageGroupsButtonText
                        }
                    >
                        ⚙ Grupos
                    </Text>
                </TouchableOpacity>

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
                        + Nuevo modificador
                    </Text>
                </TouchableOpacity>
            </View>

            <View
                style={
                    styles.filterTabs
                }
            >
                {[
                    {
                        id:
                            'all',
                        name:
                            'TODOS',
                    },
                    ...groups.map(
                        group => ({
                            id:
                                group.id,
                            name:
                                group.name.toUpperCase(),
                        }),
                    ),
                ].map(
                    group => {
                        const selected =
                            activeFilter ===
                            group.id;

                        return (
                            <TouchableOpacity
                                key={
                                    group.id
                                }
                                style={[
                                    styles.filterButton,

                                    selected &&
                                    styles.filterButtonActive,
                                ]}
                                onPress={() =>
                                    setActiveFilter(
                                        group.id,
                                    )
                                }
                            >
                                <Text
                                    style={[
                                        styles.filterButtonText,

                                        selected &&
                                        styles.filterButtonTextActive,
                                    ]}
                                >
                                    {group.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    },
                )}
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
                    Modificadores
                </Text>

                <Text
                    style={
                        styles.modifierCount
                    }
                >
                    {
                        visibleModifiers.length
                    }{' '}
                    {visibleModifiers.length ===
                        1
                        ? 'modificador'
                        : 'modificadores'}
                </Text>
            </View>

            {visibleModifiers.length ===
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
                        🧂
                    </Text>

                    <Text
                        style={
                            styles.emptyTitle
                        }
                    >
                        No hay modificadores
                    </Text>

                    <Text
                        style={
                            styles.emptyText
                        }
                    >
                        Cambia los filtros o
                        agrega un nuevo modificador.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={
                        visibleModifiers
                    }
                    keyExtractor={
                        (item) =>
                            item.id
                    }
                    renderItem={
                        renderModifier
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
                    isGroupsModalVisible
                }
                transparent
                animationType="fade"
                onRequestClose={
                    closeGroupsModal
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
                            styles.groupsManagerModal,
                        ]}
                    >
                        <View
                            style={
                                styles.groupsManagerHeader
                            }
                        >
                            <View
                                style={
                                    styles.groupsManagerHeaderText
                                }
                            >
                                <Text
                                    style={
                                        styles.modalTitle
                                    }
                                >
                                    Grupos de modificadores
                                </Text>

                                <Text
                                    style={
                                        styles.groupsManagerSubtitle
                                    }
                                >
                                    Crea, renombra, ordena y activa o desactiva grupos.
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={
                                    styles.closeIconButton
                                }
                                onPress={
                                    closeGroupsModal
                                }
                                disabled={
                                    isProcessing
                                }
                            >
                                <Text
                                    style={
                                        styles.closeIconText
                                    }
                                >
                                    ✕
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {isGroupFormVisible ? (
                            <View
                                style={
                                    styles.groupEditor
                                }
                            >
                                <Text
                                    style={
                                        styles.groupEditorTitle
                                    }
                                >
                                    {selectedGroup
                                        ? 'Editar grupo'
                                        : 'Nuevo grupo'}
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
                                        groupForm.name
                                    }
                                    onChangeText={(
                                        value,
                                    ) =>
                                        setGroupForm(
                                            current => ({
                                                ...current,
                                                name:
                                                    value,
                                            }),
                                        )
                                    }
                                    style={
                                        styles.input
                                    }
                                    placeholder="Ej. Toppings"
                                    placeholderTextColor="#777777"
                                    editable={
                                        !isProcessing
                                    }
                                />

                                {selectedGroup ? (
                                    <>
                                        <Text
                                            style={
                                                styles.inputLabel
                                            }
                                        >
                                            Código interno
                                        </Text>

                                        <TextInput
                                            value={
                                                groupForm.code
                                            }
                                            style={[
                                                styles.input,
                                                styles.readOnlyInput,
                                            ]}
                                            editable={
                                                false
                                            }
                                        />

                                        <Text
                                            style={
                                                styles.helperText
                                            }
                                        >
                                            El código no se modifica para evitar romper la lógica del sistema.
                                        </Text>
                                    </>
                                ) : null}

                                <Text
                                    style={
                                        styles.inputLabel
                                    }
                                >
                                    Posición
                                </Text>

                                <TextInput
                                    value={
                                        groupForm.position
                                    }
                                    onChangeText={(
                                        value,
                                    ) =>
                                        setGroupForm(
                                            current => ({
                                                ...current,
                                                position:
                                                    sanitizeInteger(
                                                        value,
                                                    ),
                                            }),
                                        )
                                    }
                                    style={
                                        styles.input
                                    }
                                    keyboardType="number-pad"
                                    placeholder="1"
                                    placeholderTextColor="#777777"
                                    editable={
                                        !isProcessing
                                    }
                                />

                                {selectedGroup ? (
                                    <View
                                        style={
                                            styles.availableRow
                                        }
                                    >
                                        <View
                                            style={
                                                styles.groupStatusTextContainer
                                            }
                                        >
                                            <Text
                                                style={
                                                    styles.availableTitle
                                                }
                                            >
                                                Grupo activo
                                            </Text>

                                            <Text
                                                style={
                                                    styles.availableSubtitle
                                                }
                                            >
                                                Los grupos inactivos no aparecen al crear o editar modificadores.
                                            </Text>
                                        </View>

                                        <Switch
                                            value={
                                                groupForm.isActive
                                            }
                                            onValueChange={(
                                                value,
                                            ) =>
                                                setGroupForm(
                                                    current => ({
                                                        ...current,
                                                        isActive:
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
                                            closeGroupForm
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
                                            void handleSaveGroup();
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
                                                {selectedGroup
                                                    ? 'Guardar cambios'
                                                    : 'Crear grupo'}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <>
                                <TouchableOpacity
                                    style={
                                        styles.createGroupButton
                                    }
                                    onPress={
                                        openCreateGroupForm
                                    }
                                    disabled={
                                        isProcessing
                                    }
                                >
                                    <Text
                                        style={
                                            styles.createGroupButtonText
                                        }
                                    >
                                        + Nuevo grupo
                                    </Text>
                                </TouchableOpacity>

                                <View
                                    style={
                                        styles.groupsList
                                    }
                                >
                                    {groups.map(
                                        group => (
                                            <View
                                                key={
                                                    group.id
                                                }
                                                style={[
                                                    styles.groupManagerCard,

                                                    !group.is_active &&
                                                    styles.groupManagerCardInactive,
                                                ]}
                                            >
                                                <View
                                                    style={
                                                        styles.groupManagerInfo
                                                    }
                                                >
                                                    <View
                                                        style={
                                                            styles.groupManagerTitleRow
                                                        }
                                                    >
                                                        <Text
                                                            style={
                                                                styles.groupManagerName
                                                            }
                                                        >
                                                            {group.name}
                                                        </Text>

                                                        <View
                                                            style={[
                                                                styles.statusBadge,

                                                                group.is_active
                                                                    ? styles.statusBadgeActive
                                                                    : styles.statusBadgeInactive,
                                                            ]}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.statusText,

                                                                    group.is_active
                                                                        ? styles.statusTextActive
                                                                        : styles.statusTextInactive,
                                                                ]}
                                                            >
                                                                {group.is_active
                                                                    ? 'ACTIVO'
                                                                    : 'INACTIVO'}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    <Text
                                                        style={
                                                            styles.groupManagerMeta
                                                        }
                                                    >
                                                        Código: {group.code} · Posición: {group.position}
                                                    </Text>
                                                </View>

                                                <View
                                                    style={
                                                        styles.groupManagerActions
                                                    }
                                                >
                                                    <TouchableOpacity
                                                        style={
                                                            styles.editButton
                                                        }
                                                        onPress={() =>
                                                            openEditGroupForm(
                                                                group,
                                                            )
                                                        }
                                                        disabled={
                                                            isProcessing
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

                                                            group.is_active
                                                                ? styles.deactivateButton
                                                                : styles.activateButton,
                                                        ]}
                                                        onPress={() =>
                                                            handleToggleGroupActive(
                                                                group,
                                                            )
                                                        }
                                                        disabled={
                                                            isProcessing
                                                        }
                                                    >
                                                        <Text
                                                            style={
                                                                styles.stateButtonText
                                                            }
                                                        >
                                                            {group.is_active
                                                                ? 'Desactivar'
                                                                : 'Activar'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ),
                                    )}

                                    {groups.length ===
                                    0 ? (
                                        <Text
                                            style={
                                                styles.groupsEmptyText
                                            }
                                        >
                                            No hay grupos registrados.
                                        </Text>
                                    ) : null}
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

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
                            {selectedModifier
                                ? 'Editar modificador'
                                : 'Nuevo modificador'}
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
                            placeholder="Ej. Carne extra"
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
                            Precio extra
                        </Text>

                        <TextInput
                            value={
                                form.extraPrice
                            }
                            onChangeText={(
                                value,
                            ) =>
                                setForm(
                                    (
                                        current,
                                    ) => ({
                                        ...current,

                                        extraPrice:
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
                            Grupo
                        </Text>

                        <View
                            style={
                                styles.groupsContainer
                            }
                        >
                            {activeGroups.map(
                                group => {
                                    const selected =
                                        form.groupId ===
                                        group.id;

                                    return (
                                        <TouchableOpacity
                                            key={
                                                group.id
                                            }
                                            style={[
                                                styles.groupButton,

                                                selected &&
                                                styles.groupButtonSelected,
                                            ]}
                                            onPress={() =>
                                                setForm(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,

                                                        groupId:
                                                            group.id,
                                                    }),
                                                )
                                            }
                                        >
                                            <Text
                                                style={[
                                                    styles.groupButtonText,

                                                    selected &&
                                                    styles.groupButtonTextSelected,
                                                ]}
                                            >
                                                {group.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                },
                            )}
                        </View>

                        {selectedModifier ? (
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
                                        Disponible
                                    </Text>

                                    <Text
                                        style={
                                            styles.availableSubtitle
                                        }
                                    >
                                        Define si puede usarse
                                        en nuevos pedidos.
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
                                        {selectedModifier
                                            ? 'Guardar cambios'
                                            : 'Crear modificador'}
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

function createGroupCode(
    value: string,
): string {
    return normalizeText(
        value,
    )
        .replace(
            /[^a-z0-9]+/g,
            '_',
        )
        .replace(
            /^_+|_+$/g,
            '',
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