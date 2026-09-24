import React from 'react';

import {
  Alert,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  styles,
} from '../../../App.styles';

import {
  canManageCash,
  canManageCatalog,
} from '../../Utils/permissions';

import {
  printTestTicket,
} from '../../services/printerService';

import {
  useResponsiveLayout,
} from '../../hooks/useResponsiveLayout';

import {
  useBusiness,
} from '../../context/BusinessContext';

export type MainTab =
  | 'pos'
  | 'kitchen'
  | 'sales'
  | 'loyalty'
  | 'cash'
  | 'admin';

interface HeaderProps {
  activeTab: MainTab;

  setActiveTab: (
    tab: MainTab,
  ) => void;

  editingOrderId: string | null;

  pendingOrdersCount: number;

  user: any;

  logout: () => void;
}

export function GlobalHeader({
  activeTab,
  setActiveTab,
  editingOrderId,
  pendingOrdersCount,
  user,
  logout,
}: HeaderProps) {
  const {
    isPhone,
  } = useResponsiveLayout();

  const {
    business,
    theme,
    isLoading,
    error,
  } = useBusiness();

  console.log(
    'GLOBAL HEADER BUSINESS:',
    business,
  );

  console.log(
    'GLOBAL HEADER LOGO:',
    business?.identity.logoUrl,
  );

  console.log(
    'GLOBAL HEADER NAME:',
    business?.identity.businessName,
  );

  console.log(
    'GLOBAL HEADER BUSINESS:',
    business,
  );

  console.log(
    'GLOBAL HEADER LOADING:',
    isLoading,
  );

  console.log(
    'GLOBAL HEADER ERROR:',
    error,
  );

  const logoUrl =
    business?.identity.logoUrl;

  const businessName =
    business?.identity.shortName ??
    business?.identity.businessName ??
    'Dorian POS';

  const handlePrinterTest =
    async (): Promise<void> => {
      try {
        await printTestTicket();

        Alert.alert(
          'Impresión enviada',
          'La prueba se imprimió correctamente.',
        );
      } catch (error) {
        console.error(
          'Error de impresora:',
          error,
        );

        Alert.alert(
          'Error de impresora',
          error instanceof Error
            ? error.message
            : 'No se pudo imprimir.',
        );
      }
    };

  const getTabButtonStyle = (
    tab: MainTab,
  ) => [
      styles.tabButton,

      isPhone &&
      styles.tabButtonPhone,

      activeTab === tab &&
      styles.tabActiveButton,

      activeTab === tab && {
        backgroundColor:
          theme.primary,
      },
    ];

  const getTabTextStyle = (
    tab: MainTab,
  ) => [
      styles.tabText,

      isPhone &&
      styles.tabTextPhone,

      activeTab === tab &&
      styles.tabActiveText,

      activeTab === tab && {
        color:
          theme.onPrimary,
      },
    ];

  return (
    <View
      style={[
        styles.header,

        {
          backgroundColor:
            theme.surface,
        },

        isPhone &&
        styles.headerPhone,
      ]}
    >
      <View
        style={[
          styles.headerTopRow,

          isPhone &&
          styles.headerTopRowPhone,
        ]}
      >
        <View
          style={
            styles.headerBrandContainer
          }
        >
          {logoUrl ? (
            <Image
              source={{
                uri: logoUrl,
              }}
              style={[
                styles.headerLogoLetters,
                isPhone &&
                styles.headerLogoLettersPhone,
              ]}
              resizeMode="contain"
            />
          ) : (
            <Text
              style={{
                color:
                  theme.primary,
                fontSize:
                  22,
                fontWeight:
                  '900',
              }}
            >
              {businessName}
            </Text>
          )}

          {!logoUrl &&
            !businessName ? (
            <Text
              style={{
                color:
                  theme.primary,

                fontSize:
                  22,

                fontWeight:
                  '900',
              }}
            >
              Dorian POS
            </Text>
          ) : null}
        </View>

        <View
          style={[
            styles.userContainer,

            isPhone &&
            styles.userContainerPhone,
          ]}
        >
          {!isPhone ? (
            <Text
              style={[
                styles.userName,

                {
                  color:
                    theme.text,
                },
              ]}
            >
              {user?.fullName}{' '}
              (
              {user?.role ===
                'admin'
                ? 'Admin'
                : 'Caja'}
              )
            </Text>
          ) : (
            <Text
              numberOfLines={1}
              style={[
                styles.userNamePhone,

                {
                  color:
                    theme.text,
                },
              ]}
            >
              {user?.fullName}
            </Text>
          )}

          <TouchableOpacity
            onPress={
              logout
            }
            style={[
              styles.logoutButton,

              {
                borderColor:
                  theme.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.logoutText,

                {
                  color:
                    theme.primary,
                },
              ]}
            >
              Salir
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={[
          styles.tabContainer,

          isPhone &&
          styles.tabContainerPhone,
        ]}
      >
        <TouchableOpacity
          style={
            getTabButtonStyle(
              'pos',
            )
          }
          onPress={() =>
            setActiveTab(
              'pos',
            )
          }
        >
          <Text
            style={
              getTabTextStyle(
                'pos',
              )
            }
          >
            MENÚ
          </Text>
        </TouchableOpacity>

        {business?.features.kitchenEnabled ? (
          <TouchableOpacity
            style={
              getTabButtonStyle(
                'kitchen',
              )
            }
            onPress={() =>
              setActiveTab(
                'kitchen',
              )
            }
          >
            <Text
              style={
                getTabTextStyle(
                  'kitchen',
                )
              }
            >
              PEDIDOS (
              {pendingOrdersCount})
            </Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={
            getTabButtonStyle(
              'sales',
            )
          }
          onPress={() =>
            setActiveTab(
              'sales',
            )
          }
        >
          <Text
            style={
              getTabTextStyle(
                'sales',
              )
            }
          >
            VENTAS
          </Text>
        </TouchableOpacity>

        {business?.features.loyaltyEnabled ? (
          <TouchableOpacity
            style={
              getTabButtonStyle(
                'loyalty',
              )
            }
            onPress={() =>
              setActiveTab(
                'loyalty',
              )
            }
          >
            <Text
              style={
                getTabTextStyle(
                  'loyalty',
                )
              }
            >
              RECOMPENSAS
            </Text>
          </TouchableOpacity>
        ) : null}

        {canManageCash(
          user,
        ) ? (
          <TouchableOpacity
            style={
              getTabButtonStyle(
                'cash',
              )
            }
            onPress={() =>
              setActiveTab(
                'cash',
              )
            }
          >
            <Text
              style={
                getTabTextStyle(
                  'cash',
                )
              }
            >
              CAJA
            </Text>
          </TouchableOpacity>
        ) : null}

        {canManageCatalog(
          user,
        ) ? (
          <TouchableOpacity
            style={
              getTabButtonStyle(
                'admin',
              )
            }
            onPress={() =>
              setActiveTab(
                'admin',
              )
            }
          >
            <Text
              style={
                getTabTextStyle(
                  'admin',
                )
              }
            >
              ADMIN
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {editingOrderId ? (
        <View
          style={
            styles.editingOrderBadge
          }
        >
          <Text
            style={
              styles.editingOrderBadgeText
            }
            numberOfLines={
              1
            }
          >
            ⚠️ Editando pedido
          </Text>
        </View>
      ) : null}
    </View>
  );
}