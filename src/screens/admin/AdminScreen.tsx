import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';

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
  AdminLoyalty,
} from '../../components/admin/loyalty/AdminLoyalty';

import {
  AdminBusinessSettings,
} from '../../components/admin/business-settings/AdminBusinessSettings';

import {
  AdminExpenses,
} from '../../components/admin/expenses/AdminExpenses';

import {
  useBusiness,
} from '../../context/BusinessContext';

import {
  styles,
} from './AdminScreen.styles';
import { AdminDashboard } from '../../components/admin/dashboard/AdminDashboard';
import { AdminRefundSettings } from '../../components/admin/refunds/AdminRefundSettings';
import { AdminWebBanners } from '../../components/admin/web-banners/AdminWebBanners';
import { AdminEvents } from '../../components/admin/events/AdminEvents';
import { AdminInvoicing } from '../../components/admin/invoicing/AdminInvoicing';
import { AdminInventory } from '../../components/admin/inventory/AdminInventory';
import { AdminPurchases } from '../../components/admin/purchases/AdminPurchases';
import { AdminNotifications } from '../../components/admin/notifications/AdminNotifications';
import { appVersionLabel } from '../../Utils/appVersion';

type AdminSection =
  | 'dashboard'
  | 'business'
  | 'products'
  | 'inventory'
  | 'purchases'
  | 'notifications'
  | 'categories'
  | 'modifiers'
  | 'users'
  | 'reports'
  | 'expenses'
  | 'printer'
  | 'promotions'
  | 'loyalty'
  | 'hours'
  | 'delivery'
  | 'feedback'
  | 'web-banners'
  | 'events'
  | 'invoicing'
  | 'refunds';

interface AdminSectionOption {
  key: AdminSection;
  label: string;
  icon: string;
}

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

  const {
    business,
    theme,
  } = useBusiness();

  const isPhone =
    width < 700;

  const [
    activeSection,
    setActiveSection,
  ] =
    useState<AdminSection>(
      'dashboard',
    );

  const [
    sectionSelectorVisible,
    setSectionSelectorVisible,
  ] =
    useState(false);

  const businessName =
    business?.identity
      .businessName ??
    'Dorian POS';

  const availableSections =
    useMemo<
      AdminSectionOption[]
    >(
      () => {
        const sections:
          AdminSectionOption[] = [
            {
              key:
                'dashboard',
              label:
                'DASHBOARD',
              icon:
                '📈',
            },
            {
              key:
                'business',
              label:
                'NEGOCIO',
              icon:
                '🏪',
            },
            {
              key:
                'products',
              label:
                'PRODUCTOS',
              icon:
                '📦',
            },
            {
              key:
                'inventory',
              label:
                'INVENTARIO',
              icon:
                '🧺',
            },
            {
              key:
                'purchases',
              label:
                'COMPRAS',
              icon:
                '🛒',
            },
            {
              key:
                'notifications',
              label:
                'NOTIFICACIONES',
              icon:
                '🔔',
            },
            {
              key:
                'categories',
              label:
                'CATEGORÍAS',
              icon:
                '🗂️',
            },
            {
              key:
                'modifiers',
              label:
                'MODIFICADORES',
              icon:
                '⚙️',
            },
            {
              key:
                'users',
              label:
                'USUARIOS',
              icon:
                '👥',
            },
            {
              key:
                'reports',
              label:
                'REPORTES',
              icon:
                '📊',
            },
            {
              key:
                'expenses',
              label:
                'EGRESOS',
              icon:
                '💸',
            },
            {
              key:
                'printer',
              label:
                'IMPRESORA',
              icon:
                '🖨️',
            },
          ];

        if (
          business?.features
            .promotionsEnabled
        ) {
          sections.push({
            key:
              'promotions',
            label:
              'PROMOCIONES',
            icon:
              '🎟️',
          });
        }

        if (
          business?.features
            .loyaltyEnabled
        ) {
          sections.push({
            key:
              'loyalty',
            label:
              'RECOMPENSAS',
            icon:
              '🎁',
          });
        }
        sections.push({
          key:
            'hours',
          label:
            'HORARIOS',
          icon:
            '🕐',
        });

        if (
          business?.features
            .deliveryEnabled
        ) {
          sections.push({
            key:
              'delivery',
            label:
              'ENTREGAS',
            icon:
              '🚚',
          });
        }
        if (
          business?.features
            .eventsEnabled
        ) {
          sections.push({
            key:
              'events',
            label:
              'EVENTOS',
            icon:
              '🎉',
          });
        }
        if (
          business?.features
            .invoicingEnabled
        ) {
          sections.push({
            key:
              'invoicing',
            label:
              'FACTURACIÓN',
            icon:
              '🧾',
          });
        }
        sections.push({
          key:
            'refunds',
          label:
            'DEVOLUCIONES',
          icon:
            '↩️',
        });
        sections.push({
          key:
            'web-banners',
          label:
            'PUBLICIDAD',
          icon:
            '🖼️',
        });

        sections.push({
          key:
            'feedback',
          label:
            'BUZÓN',
          icon:
            '💬',
        });
        return sections;
      },
      [
        business?.features
          .deliveryEnabled,
        business?.features
          .eventsEnabled,
        business?.features
          .invoicingEnabled,
        business?.features
          .loyaltyEnabled,
        business?.features
          .promotionsEnabled,
      ],
    );

  const activeSectionOption =
    useMemo(
      () =>
        availableSections.find(
          section =>
            section.key ===
            activeSection,
        ) ??
        availableSections[0],
      [
        activeSection,
        availableSections,
      ],
    );

  useEffect(() => {
    const activeSectionExists =
      availableSections.some(
        section =>
          section.key ===
          activeSection,
      );

    if (
      !activeSectionExists &&
      availableSections.length >
      0
    ) {
      setActiveSection(
        availableSections[0].key,
      );
    }
  }, [
    activeSection,
    availableSections,
  ]);

  const handleSelectSection =
    (
      section:
        AdminSection,
    ): void => {
      setActiveSection(
        section,
      );
      setSectionSelectorVisible(
        false,
      );
    };

  const renderContent =
    () => {
      if (
        activeSection ===
        'dashboard'
      ) {
        return (
          <AdminDashboard />
        );
      }
      if (
        activeSection ===
        'business'
      ) {
        return (
          <AdminBusinessSettings />
        );
      }
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
        'inventory'
      ) {
        return (
          <AdminInventory />
        );
      }
      if (
        activeSection ===
        'purchases'
      ) {
        return (
          <AdminPurchases />
        );
      }
      if (
        activeSection ===
        'notifications'
      ) {
        return (
          <AdminNotifications
            onNavigateToInventory={
              () =>
                setActiveSection(
                  'inventory',
                )
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
        'expenses'
      ) {
        return (
          <AdminExpenses />
        );
      }
      if (
        activeSection ===
        'printer'
      ) {
        return (
          <AdminPrinter />
        );
      }
      if (
        activeSection ===
        'promotions'
      ) {
        if (
          !business?.features
            .promotionsEnabled
        ) {
          return null;
        }
        return (
          <AdminPromotions />
        );
      }
      if (
        activeSection ===
        'loyalty'
      ) {
        if (
          !business?.features
            .loyaltyEnabled
        ) {
          return null;
        }
        return (
          <AdminLoyalty />
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
        if (
          !business?.features
            .deliveryEnabled
        ) {
          return null;
        }
        return (
          <AdminDeliverySettings />
        );
      }
      if (
        activeSection ===
        'events'
      ) {
        if (
          !business?.features
            .eventsEnabled
        ) {
          return null;
        }

        return (
          <AdminEvents />
        );
      }

      if (
        activeSection ===
        'invoicing'
      ) {
        if (
          !business?.features
            .invoicingEnabled
        ) {
          return null;
        }

        return (
          <AdminInvoicing />
        );
      }

      if (
        activeSection ===
        'refunds'
      ) {
        return (
          <AdminRefundSettings />
        );
      }
      if (
        activeSection ===
        'web-banners'
      ) {
        return (
          <AdminWebBanners />
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
      return null;
    };

  const renderDesktopTab =
    (
      option:
        AdminSectionOption,
    ) => {
      const isActive =
        activeSection ===
        option.key;

      return (
        <TouchableOpacity
          key={
            option.key
          }
          style={[
            styles.sectionTab,
            {
              borderColor:
                isActive
                  ? theme.primary
                  : theme.border,
              backgroundColor:
                isActive
                  ? theme.surfaceAlt
                  : theme.surface,
            },
          ]}
          onPress={() =>
            handleSelectSection(
              option.key,
            )
          }
        >
          <Text
            style={[
              styles.sectionTabText,
              {
                color:
                  isActive
                    ? theme.primary
                    : theme.textMuted,
              },
            ]}
          >
            {option.label}
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
        {
          backgroundColor:
            theme.background,
        },
      ]}
    >

      <View
        style={[
          styles.header,
          isPhone &&
          styles.headerPhone,
        ]}
      >

        <Text
          style={[
            styles.title,
            isPhone &&
            styles.titlePhone,
            {
              color:
                theme.text,
            },
          ]}
        >
          Administración
        </Text>

        <Text
          style={[
            styles.subtitle,
            isPhone &&
            styles.subtitlePhone,
            {
              color:
                theme.textMuted,
            },
          ]}
        >
          Configuración del punto de venta{' '}
          {businessName}
        </Text>

        <Text
          style={{
            marginTop: 4,
            color: theme.textMuted,
            fontSize: isPhone ? 11 : 12,
            fontWeight: '600',
          }}
        >
          {appVersionLabel}
        </Text>
      </View>

      {isPhone ? (
        <TouchableOpacity
          style={[
            styles.mobileSectionSelector,
            {
              borderColor:
                theme.border,
              backgroundColor:
                theme.surface,
            },
          ]}
          onPress={() =>
            setSectionSelectorVisible(
              true,
            )
          }
        >
          <View
            style={
              styles.mobileSectionSelectorLeft
            }
          >
            <Text
              style={
                styles.mobileSectionIcon
              }
            >
              {activeSectionOption
                ?.icon ??
                '⚙️'}
            </Text>

            <View
              style={
                styles.mobileSectionTextContainer
              }
            >
              <Text
                style={[
                  styles.mobileSectionLabel,
                  {
                    color:
                      theme.textMuted,
                  },
                ]}
              >
                SECCIÓN
              </Text>

              <Text
                style={[
                  styles.mobileSectionValue,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {activeSectionOption
                  ?.label ??
                  'DASHBOARD'}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.mobileSectionChevron,
              {
                color:
                  theme.primary,
              },
            ]}
          >
            ▼
          </Text>
        </TouchableOpacity>
      ) : (
        <View
          style={
            styles.tabsContainer
          }
        >
          {availableSections.map(
            renderDesktopTab,
          )}
        </View>
      )}

      <View
        style={
          styles.content
        }
      >
        {renderContent()}
      </View>

      <Modal
        visible={
          sectionSelectorVisible
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setSectionSelectorVisible(
            false,
          )
        }
      >

        <SafeAreaProvider>
          <SafeAreaView
            edges={[
              'top',
              'bottom',
            ]}
            style={
              styles.modalBackdrop
            }
          >
            <TouchableOpacity
              style={
                StyleSheet.absoluteFillObject
              }
              activeOpacity={1}
              onPress={() =>
                setSectionSelectorVisible(
                  false,
                )
              }
            />

            <View
              style={[
                styles.mobileMenuCard,
                {
                  width:
                    '100%',
                  maxWidth:
                    520,
                  maxHeight:
                    '82%',
                  alignSelf:
                    'center',
                  borderRadius:
                    22,
                  backgroundColor:
                    theme.surface,
                  borderColor:
                    theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.mobileMenuHeader,
                  {
                    borderBottomColor:
                      theme.border,
                  },
                ]}
              >
                <View
                  style={
                    styles.mobileMenuHeaderText
                  }
                >

                  <Text
                    style={[
                      styles.mobileMenuTitle,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    Administración
                  </Text>

                  <Text
                    style={[
                      styles.mobileMenuSubtitle,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    Selecciona una sección
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.mobileMenuClose,
                    {
                      backgroundColor:
                        theme.surfaceAlt,
                    },
                  ]}
                  onPress={() =>
                    setSectionSelectorVisible(
                      false,
                    )
                  }
                >

                  <Text
                    style={[
                      styles.mobileMenuCloseText,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={
                  styles.mobileMenuList
                }
                contentContainerStyle={
                  styles.mobileMenuListContent
                }
                showsVerticalScrollIndicator
                persistentScrollbar
              >
                {availableSections.map(
                  option => {
                    const isActive =
                      activeSection ===
                      option.key;

                    return (
                      <TouchableOpacity
                        key={
                          option.key
                        }
                        style={[
                          styles.mobileMenuOption,
                          {
                            borderColor:
                              isActive
                                ? theme.primary
                                : theme.border,
                            backgroundColor:
                              isActive
                                ? theme.surfaceAlt
                                : theme.surface,
                          },
                        ]}
                        onPress={() =>
                          handleSelectSection(
                            option.key,
                          )
                        }
                      >
                        <Text
                          style={
                            styles.mobileMenuOptionIcon
                          }
                        >
                          {option.icon}
                        </Text>

                        <Text
                          style={[
                            styles.mobileMenuOptionText,
                            {
                              color:
                                isActive
                                  ? theme.primary
                                  : theme.text,
                            },
                          ]}
                        >
                          {option.label}
                        </Text>

                        {isActive ? (
                          <Text
                            style={[
                              styles.mobileMenuCheck,
                              {
                                color:
                                  theme.primary,
                              },
                            ]}
                          >
                            ✓
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  },
                )}
              </ScrollView>
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}
