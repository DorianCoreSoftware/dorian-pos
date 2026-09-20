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
  AdminCategories,
} from '../../components/admin/categories/AdminCategories';

import {
  AdminModifiers,
} from '../../components/admin/modifiers/AdminModifiers';

import {
  AdminPrinter,
} from '../../components/admin/printer/AdminPrinter';

import {
  AdminReports,
} from '../../components/admin/reports/AdminReports';

import {
  AdminPromotions,
} from '../../components/admin/promotions/AdminPromotions';

import {
  AdminBusinessHours,
} from '../../components/admin/business-hours/AdminBusinessHours';

import {
  AdminFeedback,
} from '../../components/admin/feedback/AdminFeedback';

import {
  AdminDeliverySettings,
} from '../../components/admin/delivery/AdminDeliverySettings';

import {
  AdminUsers,
} from '../../components/admin/users/AdminUsers';

import {
  styles,
} from './AdminScreen.styles';

type AdminSection =
  | 'products'
  | 'categories'
  | 'modifiers'
  | 'users'
  | 'reports'
  | 'printer'
  | 'promotions'
  | 'hours'
  | 'delivery'
  | 'feedback';

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

      if (
        activeSection ===
        'users'
      ) {
        return (
          <AdminUsers />
        );
      }

      if (
        activeSection ===
        'reports'
      ) {
        return (
          <AdminReports />
        );
      }

      if (
        activeSection ===
        'promotions'
      ) {
        return (
          <AdminPromotions />
        );
      }

      if (
        activeSection ===
        'hours'
      ) {
        return (
          <AdminBusinessHours />
        );
      }

      if (
        activeSection ===
        'delivery'
      ) {
        return (
          <AdminDeliverySettings />
        );
      }

      if (
        activeSection ===
        'feedback'
      ) {
        return (
          <AdminFeedback />
        );
      }

      return (
        <AdminPrinter />
      );
    };

  const renderTab =
    (
      section:
        AdminSection,

      label:
        string,
    ) => {
      const isActive =
        activeSection ===
        section;

      return (
        <TouchableOpacity
          style={[
            styles.sectionTab,

            isPhone &&
            styles.sectionTabPhone,

            isActive &&
            styles.sectionTabActive,
          ]}
          onPress={() =>
            setActiveSection(
              section,
            )
          }
        >
          <Text
            style={[
              styles.sectionTabText,

              isSmallPhone &&
              styles.sectionTabTextSmall,

              isActive &&
              styles.sectionTabTextActive,
            ]}
          >
            {label}
          </Text>
        </TouchableOpacity>
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
            Configuración del punto de venta Burger Kong
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
        {renderTab(
          'products',
          'PRODUCTOS',
        )}

        {renderTab(
          'categories',
          'CATEGORÍAS',
        )}

        {renderTab(
          'modifiers',
          'MODIFICADORES',
        )}

        {renderTab(
          'users',
          'USUARIOS',
        )}

        {renderTab(
          'reports',
          'REPORTES',
        )}

        {renderTab(
          'printer',
          'IMPRESORA',
        )}

        {renderTab(
          'promotions',
          'PROMOCIONES',
        )}

        {renderTab(
          'hours',
          'HORARIOS',
        )}

        {renderTab(
          'delivery',
          'ENTREGAS',
        )}

        {renderTab(
          'feedback',
          'BUZÓN',
        )}
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