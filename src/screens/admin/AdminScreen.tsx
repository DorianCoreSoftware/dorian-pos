import React, {
    useState,
} from 'react';

import {
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import {
    AdminProducts,
} from '../../components/admin/products/AdminProducts';

import {
    styles,
} from './AdminScreen.styles';
import { AdminCategories } from '../../components/admin/categories/AdminCategories';

type AdminSection =
    | 'products'
    | 'categories'
    | 'modifiers';

interface AdminScreenProps {
    onProductsChanged:
    () => Promise<void>;

    onCategoriesChanged:
    () => Promise<void>;
}

export function AdminScreen({
    onProductsChanged,
    onCategoriesChanged,
}: AdminScreenProps) {
    const [
        activeSection,
        setActiveSection,
    ] = useState<AdminSection>(
        'products',
    );

    const renderContent =
        () => {
            if (
                activeSection ===
                'products'
            ) {
                return (
                    <AdminProducts
                        onProductsChanged={
                            onProductsChanged
                        }
                    />
                );
            }

            if (
                activeSection ===
                'categories'
            ) {
                return (
                    <AdminCategories
                        onCategoriesChanged={
                            onCategoriesChanged
                        }
                    />
                );
            }

            return (
                <View
                    style={
                        styles.placeholderCard
                    }
                >
                    <Text
                        style={
                            styles.placeholderIcon
                        }
                    >
                        🧂
                    </Text>

                    <Text
                        style={
                            styles.placeholderTitle
                        }
                    >
                        Modificadores
                    </Text>

                    <Text
                        style={
                            styles.placeholderText
                        }
                    >
                        Aquí administraremos
                        carnes, salsas, sabores
                        y otros modificadores.
                    </Text>
                </View>
            );
        };

    return (
        <View
            style={
                styles.container
            }
        >
            <View
                style={
                    styles.header
                }
            >
                <View>
                    <Text
                        style={
                            styles.title
                        }
                    >
                        Administración
                    </Text>

                    <Text
                        style={
                            styles.subtitle
                        }
                    >
                        Configuración del catálogo
                        de Burger Kong
                    </Text>
                </View>
            </View>

            <View
                style={
                    styles.tabsContainer
                }
            >
                <TouchableOpacity
                    style={[
                        styles.sectionTab,

                        activeSection ===
                        'products' &&
                        styles.sectionTabActive,
                    ]}
                    onPress={() =>
                        setActiveSection(
                            'products',
                        )
                    }
                >
                    <Text
                        style={[
                            styles.sectionTabText,

                            activeSection ===
                            'products' &&
                            styles.sectionTabTextActive,
                        ]}
                    >
                        PRODUCTOS
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.sectionTab,

                        activeSection ===
                        'categories' &&
                        styles.sectionTabActive,
                    ]}
                    onPress={() =>
                        setActiveSection(
                            'categories',
                        )
                    }
                >
                    <Text
                        style={[
                            styles.sectionTabText,

                            activeSection ===
                            'categories' &&
                            styles.sectionTabTextActive,
                        ]}
                    >
                        CATEGORÍAS
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.sectionTab,

                        activeSection ===
                        'modifiers' &&
                        styles.sectionTabActive,
                    ]}
                    onPress={() =>
                        setActiveSection(
                            'modifiers',
                        )
                    }
                >
                    <Text
                        style={[
                            styles.sectionTabText,

                            activeSection ===
                            'modifiers' &&
                            styles.sectionTabTextActive,
                        ]}
                    >
                        MODIFICADORES
                    </Text>
                </TouchableOpacity>
            </View>

            <View
                style={
                    styles.content
                }
            >
                {renderContent()}
            </View>
        </View>
    );
}