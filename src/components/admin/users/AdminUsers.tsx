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
    Modal,
    ScrollView,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import {
    AdminUserRecord,
    changeAdminUserActive,
    getAdminUsers,
    saveAdminUserChanges,
    saveNewAdminUser,
} from '../../../services/adminUserService';

import {
    UserRole,
} from '../../../types/auth';

import {
    useAuth,
} from '../../../context/AuthContext';

import {
    styles,
  setBrandPrimaryColor,
} from './AdminUsers.styles';

interface UserFormState {
    email: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
}

const INITIAL_FORM:
    UserFormState = {
    email: '',
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'seller',
};

const ROLE_OPTIONS: Array<{
    value: UserRole;
    label: string;
    description: string;
}> = [
    {
        value: 'admin',
        label: 'Administrador',
        description:
            'Acceso a administración y operación del sistema.',
    },
    {
        value: 'accountant',
        label: 'Contador',
        description:
            'Acceso al módulo de nómina y funciones financieras autorizadas.',
    },
    {
        value: 'operator',
        label: 'Operador',
        description:
            'Acceso a la operación diaria: punto de venta, cocina, ventas, caja, reparto, recompensas y asistencia, sin acceso administrativo.',
    },
    {
        value: 'seller',
        label: 'Vendedor',
        description:
            'Acceso al punto de venta.',
    },
    {
        value: 'driver',
        label: 'Repartidor',
        description:
            'Acceso únicamente al flujo de entregas.',
    },
];

export function AdminUsers() {
  const { theme: businessTheme } = useBusiness();
    setBrandPrimaryColor(businessTheme.primary);

    const {
        user:
            currentUser,
    } = useAuth();

    const [
        users,
        setUsers,
    ] = useState<
        AdminUserRecord[]
    >([]);

    const [
        selectedUser,
        setSelectedUser,
    ] = useState<
        AdminUserRecord | null
    >(null);

    const [
        form,
        setForm,
    ] = useState<UserFormState>(
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
    ] = useState<
        string | null
    >(null);

    const loadData =
        useCallback(
            async (): Promise<void> => {
                try {
                    setIsLoading(
                        true,
                    );

                    setErrorMessage(
                        null,
                    );

                    const data =
                        await getAdminUsers();

                    setUsers(
                        data,
                    );
                } catch (error) {
                    console.error(
                        'Error cargando usuarios administrativos:',
                        error,
                    );

                    setErrorMessage(
                        error instanceof Error
                            ? error.message
                            : 'No se pudieron cargar los usuarios.',
                    );
                } finally {
                    setIsLoading(
                        false,
                    );
                }
            },
            [],
        );

    useEffect(() => {
        void loadData();
    }, [
        loadData,
    ]);

    const visibleUsers =
        useMemo(() => {
            const normalizedSearch =
                normalizeText(
                    searchText,
                );

            return users
                .filter(
                    user => {
                        if (
                            !showInactive &&
                            !user.isActive
                        ) {
                            return false;
                        }

                        if (
                            !normalizedSearch
                        ) {
                            return true;
                        }

                        const fullName =
                            `${user.firstName ?? ''} ${user.lastName ?? ''}`;

                        return [
                            fullName,
                            user.email,
                            user.username ??
                                '',
                            getRoleLabel(
                                user.role,
                            ),
                        ].some(
                            value =>
                                normalizeText(
                                    value,
                                ).includes(
                                    normalizedSearch,
                                ),
                        );
                    },
                )
                .sort(
                    (
                        first,
                        second,
                    ) =>
                        getDisplayName(
                            first,
                        ).localeCompare(
                            getDisplayName(
                                second,
                            ),
                            'es',
                            {
                                sensitivity:
                                    'base',
                            },
                        ),
                );
        }, [
            users,
            searchText,
            showInactive,
        ]);

    const isEditingSelf =
        Boolean(
            selectedUser &&
            currentUser &&
            selectedUser.id ===
                currentUser.id,
        );

    const openCreateModal =
        (): void => {
            setSelectedUser(
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
        user:
            AdminUserRecord,
    ): void => {
        setSelectedUser(
            user,
        );

        setForm({
            email:
                user.email,

            username:
                user.username ??
                '',

            password:
                '',

            firstName:
                user.firstName ??
                '',

            lastName:
                user.lastName ??
                '',

            role:
                user.role,
        });

        setIsModalVisible(
            true,
        );
    };

    const closeModal =
        (): void => {
            if (
                isProcessing
            ) {
                return;
            }

            setIsModalVisible(
                false,
            );

            setSelectedUser(
                null,
            );

            setForm(
                INITIAL_FORM,
            );
        };

    const handleSave =
        async (): Promise<void> => {
            if (
                isProcessing
            ) {
                return;
            }

            const cleanEmail =
                form.email
                    .trim()
                    .toLowerCase();

            const cleanUsername =
                form.username
                    .trim()
                    .toLowerCase();

            const cleanFirstName =
                form.firstName
                    .trim();

            const cleanLastName =
                form.lastName
                    .trim();

            if (
                !cleanEmail
            ) {
                Alert.alert(
                    'Correo requerido',
                    'Ingresa el correo electrónico.',
                );

                return;
            }

            if (
                !isValidEmail(
                    cleanEmail,
                )
            ) {
                Alert.alert(
                    'Correo inválido',
                    'Ingresa un correo electrónico válido.',
                );

                return;
            }

            if (
                !cleanUsername
            ) {
                Alert.alert(
                    'Username requerido',
                    'Ingresa un username.',
                );

                return;
            }

            if (
                !/^[A-Za-z0-9._-]{3,40}$/.test(
                    cleanUsername,
                )
            ) {
                Alert.alert(
                    'Username inválido',
                    'Usa entre 3 y 40 caracteres: letras, números, punto, guion o guion bajo.',
                );

                return;
            }

            if (
                !cleanFirstName
            ) {
                Alert.alert(
                    'Nombre requerido',
                    'Ingresa el nombre.',
                );

                return;
            }

            if (
                !selectedUser &&
                form.password.length <
                    8
            ) {
                Alert.alert(
                    'Contraseña inválida',
                    'La contraseña debe tener al menos 8 caracteres.',
                );

                return;
            }

            if (
                selectedUser &&
                isEditingSelf &&
                form.role !==
                    selectedUser.role
            ) {
                Alert.alert(
                    'Cambio de rol no permitido',
                    'No puedes cambiar el rol de tu propio usuario mientras tienes una sesión activa.',
                );

                return;
            }

            try {
                setIsProcessing(
                    true,
                );

                if (
                    selectedUser
                ) {
                    await saveAdminUserChanges({
                        userId:
                            selectedUser.id,

                        email:
                            cleanEmail,

                        username:
                            cleanUsername,

                        firstName:
                            cleanFirstName,

                        lastName:
                            cleanLastName,

                        role:
                            form.role,
                    });

                    Alert.alert(
                        'Usuario actualizado',
                        `${cleanFirstName} fue actualizado correctamente.`,
                    );
                } else {
                    await saveNewAdminUser({
                        email:
                            cleanEmail,

                        username:
                            cleanUsername,

                        password:
                            form.password,

                        firstName:
                            cleanFirstName,

                        lastName:
                            cleanLastName,

                        role:
                            form.role,
                    });

                    Alert.alert(
                        'Usuario creado',
                        `${cleanFirstName} fue creado correctamente.`,
                    );
                }

                setIsModalVisible(
                    false,
                );

                setSelectedUser(
                    null,
                );

                setForm(
                    INITIAL_FORM,
                );

                await loadData();
            } catch (error) {
                Alert.alert(
                    'Error',
                    error instanceof Error
                        ? error.message
                        : 'No se pudo guardar el usuario.',
                );
            } finally {
                setIsProcessing(
                    false,
                );
            }
        };

    const handleToggleActive = (
        user:
            AdminUserRecord,
    ): void => {
        const willActivate =
            !user.isActive;

        Alert.alert(
            willActivate
                ? 'Activar usuario'
                : 'Desactivar usuario',

            willActivate
                ? `¿Deseas activar a "${getDisplayName(user)}"?`
                : `¿Deseas desactivar a "${getDisplayName(user)}"? Ya no podrá iniciar sesión.`,

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
                            void executeToggleActive(
                                user,
                                willActivate,
                            );
                        },
                },
            ],
        );
    };

    const executeToggleActive =
        async (
            user:
                AdminUserRecord,

            isActive:
                boolean,
        ): Promise<void> => {
            try {
                setIsProcessing(
                    true,
                );

                await changeAdminUserActive(
                    user.id,
                    isActive,
                );

                await loadData();
            } catch (error) {
                Alert.alert(
                    'Error',
                    error instanceof Error
                        ? error.message
                        : 'No se pudo cambiar el estado del usuario.',
                );
            } finally {
                setIsProcessing(
                    false,
                );
            }
        };

    const renderUser = ({
        item,
    }: {
        item:
            AdminUserRecord;
    }) => (
        <View
            style={[
                styles.userCard,

                !item.isActive &&
                styles.userCardInactive,
            ]}
        >
            <View
                style={
                    styles.avatar
                }
            >
                <Text
                    style={
                        styles.avatarText
                    }
                >
                    {getInitials(
                        item,
                    )}
                </Text>
            </View>

            <View
                style={
                    styles.userInfo
                }
            >
                <View
                    style={
                        styles.userTitleRow
                    }
                >
                    <Text
                        style={
                            styles.userName
                        }
                    >
                        {getDisplayName(
                            item,
                        )}
                    </Text>

                    <View
                        style={[
                            styles.statusBadge,

                            item.isActive
                                ? styles.statusBadgeActive
                                : styles.statusBadgeInactive,
                        ]}
                    >
                        <Text
                            style={[
                                styles.statusText,

                                item.isActive
                                    ? styles.statusTextActive
                                    : styles.statusTextInactive,
                            ]}
                        >
                            {item.isActive
                                ? 'ACTIVO'
                                : 'INACTIVO'}
                        </Text>
                    </View>
                </View>

                <Text
                    style={
                        styles.roleText
                    }
                >
                    {getRoleLabel(
                        item.role,
                    )}
                </Text>

                <Text
                    style={
                        styles.userMetaText
                    }
                >
                    {item.email ||
                        'Sin correo'}
                </Text>

                <Text
                    style={
                        styles.userMetaText
                    }
                >
                    {item.username
                        ? `@${item.username}`
                        : 'Sin username'}
                </Text>
            </View>

            <View
                style={
                    styles.userActions
                }
            >
                <TouchableOpacity
                    style={
                        styles.editButton
                    }
                    disabled={
                        isProcessing
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

                        item.isActive
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
                        {item.isActive
                            ? 'Desactivar'
                            : 'Activar'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (
        isLoading
    ) {
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
                    Cargando usuarios...
                </Text>
            </View>
        );
    }

    if (
        errorMessage
    ) {
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
                        placeholder="Buscar usuario..."
                        placeholderTextColor="#777777"
                        autoCorrect={
                            false
                        }
                        autoCapitalize="none"
                    />

                    {searchText ? (
                        <TouchableOpacity
                            onPress={() =>
                                setSearchText(
                                    '',
                                )
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
                        + Nuevo usuario
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
                    Usuarios
                </Text>

                <Text
                    style={
                        styles.userCount
                    }
                >
                    {
                        visibleUsers.length
                    }{' '}
                    {visibleUsers.length ===
                    1
                        ? 'usuario'
                        : 'usuarios'}
                </Text>
            </View>

            {visibleUsers.length ===
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
                        👤
                    </Text>

                    <Text
                        style={
                            styles.emptyTitle
                        }
                    >
                        No hay usuarios
                    </Text>

                    <Text
                        style={
                            styles.emptyText
                        }
                    >
                        Cambia la búsqueda o agrega un nuevo usuario.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={
                        visibleUsers
                    }
                    keyExtractor={
                        item =>
                            item.id
                    }
                    renderItem={
                        renderUser
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
                                {selectedUser
                                    ? 'Editar usuario'
                                    : 'Nuevo usuario'}
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
                                    form.firstName
                                }
                                onChangeText={(
                                    value,
                                ) =>
                                    setForm(
                                        current => ({
                                            ...current,
                                            firstName:
                                                value,
                                        }),
                                    )
                                }
                                style={
                                    styles.input
                                }
                                placeholder="Nombre"
                                placeholderTextColor="#777777"
                                editable={
                                    !isProcessing
                                }
                                autoCapitalize="words"
                            />

                            <Text
                                style={
                                    styles.inputLabel
                                }
                            >
                                Apellido
                            </Text>

                            <TextInput
                                value={
                                    form.lastName
                                }
                                onChangeText={(
                                    value,
                                ) =>
                                    setForm(
                                        current => ({
                                            ...current,
                                            lastName:
                                                value,
                                        }),
                                    )
                                }
                                style={
                                    styles.input
                                }
                                placeholder="Apellido"
                                placeholderTextColor="#777777"
                                editable={
                                    !isProcessing
                                }
                                autoCapitalize="words"
                            />

                            <Text
                                style={
                                    styles.inputLabel
                                }
                            >
                                Correo electrónico
                            </Text>

                            <TextInput
                                value={
                                    form.email
                                }
                                onChangeText={(
                                    value,
                                ) =>
                                    setForm(
                                        current => ({
                                            ...current,
                                            email:
                                                value,
                                        }),
                                    )
                                }
                                style={
                                    styles.input
                                }
                                placeholder="usuario@correo.com"
                                placeholderTextColor="#777777"
                                editable={
                                    !isProcessing
                                }
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={
                                    false
                                }
                            />

                            <Text
                                style={
                                    styles.inputLabel
                                }
                            >
                                Username
                            </Text>

                            <TextInput
                                value={
                                    form.username
                                }
                                onChangeText={(
                                    value,
                                ) =>
                                    setForm(
                                        current => ({
                                            ...current,
                                            username:
                                                value,
                                        }),
                                    )
                                }
                                style={
                                    styles.input
                                }
                                placeholder="ej. cajero1"
                                placeholderTextColor="#777777"
                                editable={
                                    !isProcessing
                                }
                                autoCapitalize="none"
                                autoCorrect={
                                    false
                                }
                            />

                            {!selectedUser ? (
                                <>
                                    <Text
                                        style={
                                            styles.inputLabel
                                        }
                                    >
                                        Contraseña temporal
                                    </Text>

                                    <TextInput
                                        value={
                                            form.password
                                        }
                                        onChangeText={(
                                            value,
                                        ) =>
                                            setForm(
                                                current => ({
                                                    ...current,
                                                    password:
                                                        value,
                                                }),
                                            )
                                        }
                                        style={
                                            styles.input
                                        }
                                        placeholder="Mínimo 8 caracteres"
                                        placeholderTextColor="#777777"
                                        editable={
                                            !isProcessing
                                        }
                                        secureTextEntry
                                        autoCapitalize="none"
                                        autoCorrect={
                                            false
                                        }
                                    />

                                    <Text
                                        style={
                                            styles.helperText
                                        }
                                    >
                                        El usuario podrá iniciar sesión con esta contraseña después de crearlo.
                                    </Text>
                                </>
                            ) : null}

                            <Text
                                style={
                                    styles.inputLabel
                                }
                            >
                                Rol
                            </Text>

                            <View
                                style={
                                    styles.rolesContainer
                                }
                            >
                                {ROLE_OPTIONS.map(
                                    option => {
                                        const selected =
                                            form.role ===
                                            option.value;

                                        const isRoleDisabled =
                                            isProcessing ||
                                            (
                                                isEditingSelf &&
                                                option.value !==
                                                    selectedUser?.role
                                            );

                                        return (
                                            <TouchableOpacity
                                                key={
                                                    option.value
                                                }
                                                style={[
                                                    styles.roleButton,

                                                    selected &&
                                                    styles.roleButtonSelected,

                                                    isRoleDisabled &&
                                                    !selected &&
                                                    styles.roleButtonDisabled,
                                                ]}
                                                disabled={
                                                    isRoleDisabled
                                                }
                                                onPress={() =>
                                                    setForm(
                                                        current => ({
                                                            ...current,
                                                            role:
                                                                option.value,
                                                        }),
                                                    )
                                                }
                                            >
                                                <Text
                                                    style={[
                                                        styles.roleButtonTitle,

                                                        selected &&
                                                        styles.roleButtonTitleSelected,
                                                    ]}
                                                >
                                                    {option.label}
                                                </Text>

                                                <Text
                                                    style={
                                                        styles.roleButtonDescription
                                                    }
                                                >
                                                    {option.description}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    },
                                )}
                            </View>

                            {isEditingSelf ? (
                                <Text
                                    style={
                                        styles.editHint
                                    }
                                >
                                    No puedes modificar tu propio rol mientras tienes una sesión activa.
                                </Text>
                            ) : selectedUser ? (
                                <Text
                                    style={
                                        styles.editHint
                                    }
                                >
                                    La contraseña no se modifica desde esta pantalla.
                                </Text>
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
                                            {selectedUser
                                                ? 'Guardar cambios'
                                                : 'Crear usuario'}
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

function getDisplayName(
    user:
        AdminUserRecord,
): string {
    const name =
        [
            user.firstName,
            user.lastName,
        ]
            .filter(
                Boolean,
            )
            .join(' ')
            .trim();

    return (
        name ||
        user.username ||
        user.email ||
        'Usuario'
    );
}

function getInitials(
    user:
        AdminUserRecord,
): string {
    const parts =
        [
            user.firstName,
            user.lastName,
        ].filter(
            (
                value,
            ): value is string =>
                Boolean(
                    value?.trim(),
                ),
        );

    if (
        parts.length >
        0
    ) {
        return parts
            .map(
                value =>
                    value
                        .trim()
                        .charAt(0),
            )
            .join('')
            .slice(
                0,
                2,
            )
            .toUpperCase();
    }

    return (
        user.username ??
        user.email ??
        'U'
    )
        .charAt(0)
        .toUpperCase();
}

function getRoleLabel(
    role:
        UserRole,
): string {
    switch (
        role
    ) {
        case 'admin':
            return 'Administrador';

        case 'accountant':
            return 'Contador';

        case 'operator':
            return 'Operador';

        case 'driver':
            return 'Repartidor';

        case 'seller':
        default:
            return 'Vendedor';
    }
}

function normalizeText(
    value:
        | string
        | null
        | undefined,
): string {
    return (
        value ??
        ''
    )
        .normalize(
            'NFD',
        )
        .replace(
            /[\u0300-\u036f]/g,
            '',
        )
        .trim()
        .toLocaleLowerCase(
            'es',
        );
}

function isValidEmail(
    value:
        string,
): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        value,
    );
}
