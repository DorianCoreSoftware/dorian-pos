import React from 'react';

import {
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  styles,
} from '../../../App.styles';

export type MainTab =
  | 'pos'
  | 'kitchen'
  | 'sales';

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
  return (
    <View style={styles.header}>
      <Image
        source={require(
          '../../../assets/OnlyBurgerKong.png'
        )}
        style={styles.headerLogo}
        resizeMode="contain"
      />

      <Image
        source={require(
          '../../../assets/logo.png'
        )}
        style={
          styles.headerLogoLetters
        }
        resizeMode="contain"
      />

      <View
        style={styles.tabContainer}
      >
        <TouchableOpacity
          style={[
            styles.tabButton,

            activeTab === 'pos' &&
              styles.tabActiveButton,
          ]}
          onPress={() =>
            setActiveTab('pos')
          }
        >
          <Text
            style={[
              styles.tabText,

              activeTab === 'pos' &&
                styles.tabActiveText,
            ]}
          >
            MENÚ{' '}
            {editingOrderId
              ? '⚠️ (Modificando)'
              : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,

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

              activeTab ===
                'sales' &&
                styles.tabActiveText,
            ]}
          >
            VENTAS
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={
          styles.userContainer
        }
      >
        <Text
          style={styles.userName}
        >
          {user?.fullName}{' '}
          (
          {user?.role === 'admin'
            ? 'Admin'
            : 'Caja'}
          )
        </Text>

        <TouchableOpacity
          onPress={logout}
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
  );
}