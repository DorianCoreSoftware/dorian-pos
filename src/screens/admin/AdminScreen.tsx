import React, {
    useState,
} from 'react';

import {
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';

import {
    AdminProducts,
} from '../../components/admin/products/AdminProducts';

import {
    styles,
} from './AdminScreen.styles';
import { AdminCategories } from '../../components/admin/categories/AdminCategories';
import {
    AdminModifiers,
} from '../../components/admin/modifiers/AdminModifiers';
import { AdminPrinter } from '../../components/admin/printer/AdminPrinter';

type AdminSection =
    | 'products'
    | 'categories'
    | 'modifiers'
    | 'printer';

interface AdminScreenProps {
    onProductsChanged:
    () => Promise<void>;

    onCategoriesChanged:
    () => Promise<void>;

    onModifiersChanged:
    () => Promise<void>;
}

export function AdminScreen({
    onProductsChanged,
    onCategoriesChanged,
    onModifiersChanged,
}: AdminScreenProps) {
    const {
        width,
    } = useWindowDimensions();

    const isPhone =
        width < 700;

    const isSmallPhone =
        width < 430;

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

            if (
                activeSection ===
                'modifiers'
            ) {
                return (
                    <AdminModifiers
                        onModifiersChanged={
                            onModifiersChanged
                        }
                    />
                );
            }

            return (
                <AdminPrinter />
            );
        };
    return (
        <View
            style={[
                styles.container,

                isPhone &&
                styles.containerPhone,
            ]}
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
                        Configuración del punto de venta
                        Burger Kong
                    </Text>
                </View>
            </View>

            <View
                style={[
                    styles.tabsContainer,

                    isPhone &&
                    styles.tabsContainerPhone,
                ]}
            >
                <TouchableOpacity
                    style={[
                        styles.sectionTab,

                        isPhone &&
                        styles.sectionTabPhone,

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

                            isSmallPhone &&
                            styles.sectionTabTextSmall,

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

                        isPhone &&
                        styles.sectionTabPhone,

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

                            isSmallPhone &&
                            styles.sectionTabTextSmall,

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

                        isPhone &&
                        styles.sectionTabPhone,

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

                            isSmallPhone &&
                            styles.sectionTabTextSmall,

                            activeSection ===
                            'modifiers' &&
                            styles.sectionTabTextActive,
                        ]}
                    >
                        MODIFICADORES
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.sectionTab,

                        isPhone &&
                        styles.sectionTabPhone,

                        activeSection ===
                        'printer' &&
                        styles.sectionTabActive,
                    ]}
                    onPress={() =>
                        setActiveSection(
                            'printer',
                        )
                    }
                >
                    <Text
                        style={[
                            styles.sectionTabText,

                            isSmallPhone &&
                            styles.sectionTabTextSmall,

                            activeSection ===
                            'printer' &&
                            styles.sectionTabTextActive,
                        ]}
                    >
                        IMPRESORA
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