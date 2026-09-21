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
import { printTestTicket } from '../../services/printerService';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

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
  return (
    <View
      style={[
        styles.header,

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
          <Image
            source={require(
              '../../../assets/OnlyBurgerKong.png'
            )}
            style={[
              styles.headerLogo,

              isPhone &&
              styles.headerLogoPhone,
            ]}
            resizeMode="contain"
          />

          <Image
            source={require(
              '../../../assets/logo.png'
            )}
            style={[
              styles.headerLogoLetters,

              isPhone &&
              styles.headerLogoLettersPhone,
            ]}
            resizeMode="contain"
          />
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
              style={
                styles.userName
              }
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
              style={
                styles.userNamePhone
              }
            >
              {user?.fullName}
            </Text>
          )}

          <TouchableOpacity
            onPress={
              logout
            }
            style={
              styles.logoutButton
            }
          >
            <Text
              style={
                styles.logoutText
              }
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
          style={[
            styles.tabButton,

            isPhone &&
            styles.tabButtonPhone,

            activeTab ===
            'pos' &&
            styles.tabActiveButton,
          ]}
          onPress={() =>
            setActiveTab(
              'pos',
            )
          }
        >
          <Text
            style={[
              styles.tabText,

              isPhone &&
              styles.tabTextPhone,

              activeTab ===
              'pos' &&
              styles.tabActiveText,
            ]}
          >
            MENÚ
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,

            isPhone &&
            styles.tabButtonPhone,

            activeTab ===
            'kitchen' &&
            styles.tabActiveButton,
          ]}
          onPress={() =>
            setActiveTab(
              'kitchen',
            )
          }
        >
          <Text
            style={[
              styles.tabText,

              isPhone &&
              styles.tabTextPhone,

              activeTab ===
              'kitchen' &&
              styles.tabActiveText,
            ]}
          >
            PEDIDOS (
            {pendingOrdersCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,

            isPhone &&
            styles.tabButtonPhone,

            activeTab ===
            'sales' &&
            styles.tabActiveButton,
          ]}
          onPress={() =>
            setActiveTab(
              'sales',
            )
          }
        >
          <Text
            style={[
              styles.tabText,

              isPhone &&
              styles.tabTextPhone,

              activeTab ===
              'sales' &&
              styles.tabActiveText,
            ]}
          >
            VENTAS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,

            isPhone &&
            styles.tabButtonPhone,

            activeTab ===
            'loyalty' &&
            styles.tabActiveButton,
          ]}
          onPress={() =>
            setActiveTab(
              'loyalty',
            )
          }
        >
          <Text
            style={[
              styles.tabText,

              isPhone &&
              styles.tabTextPhone,

              activeTab ===
              'loyalty' &&
              styles.tabActiveText,
            ]}
          >
            RECOMPENSAS
          </Text>
        </TouchableOpacity>

        {canManageCash(
          user,
        ) ? (
          <TouchableOpacity
            style={[
              styles.tabButton,

              isPhone &&
              styles.tabButtonPhone,

              activeTab ===
              'cash' &&
              styles.tabActiveButton,
            ]}
            onPress={() =>
              setActiveTab(
                'cash',
              )
            }
          >
            <Text
              style={[
                styles.tabText,

                isPhone &&
                styles.tabTextPhone,

                activeTab ===
                'cash' &&
                styles.tabActiveText,
              ]}
            >
              CAJA
            </Text>
          </TouchableOpacity>
        ) : null}

        {canManageCatalog(
          user,
        ) ? (
          <TouchableOpacity
            style={[
              styles.tabButton,

              isPhone &&
              styles.tabButtonPhone,

              activeTab ===
              'admin' &&
              styles.tabActiveButton,
            ]}
            onPress={() =>
              setActiveTab(
                'admin',
              )
            }
          >
            <Text
              style={[
                styles.tabText,

                isPhone &&
                styles.tabTextPhone,

                activeTab ===
                'admin' &&
                styles.tabActiveText,
              ]}
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