import React from 'react';

import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  useAuth,
} from '../../context/AuthContext';

import {
  useBusiness,
} from '../../context/BusinessContext';

import {
  LoginScreen,
} from '../../screens/login/LoginScreen';

import {
  AdminScreen,
} from '../../screens/admin/AdminScreen';

import {
  styles,
} from './WebAdminApp.styles';

const noopRefresh = async (): Promise<void> => {
  // El panel web administra directamente el catálogo en Supabase.
  // No existe una instancia de POS local que necesite refrescarse aquí.
};

export default function WebAdminApp() {
  const {
    user,
    loading,
    logout,
  } = useAuth();

  const {
    business,
    theme,
  } = useBusiness();

  const businessName =
    business?.identity.businessName ??
    'Dorian POS';

  if (loading) {
    return (
      <View
        style={[
          styles.centered,
          {
            backgroundColor:
              theme.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={theme.primary}
        />

        <Text
          style={[
            styles.loadingText,
            {
              color:
                theme.textMuted,
            },
          ]}
        >
          Cargando panel administrativo...
        </Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View
        style={[
          styles.loginContainer,
          {
            backgroundColor:
              theme.background,
          },
        ]}
      >
        <LoginScreen />
      </View>
    );
  }

  if (user.role !== 'admin' && user.role !== 'accountant') {
    return (
      <View
        style={[
          styles.centered,
          {
            backgroundColor:
              theme.background,
          },
        ]}
      >
        <View
          style={[
            styles.accessCard,
            {
              backgroundColor:
                theme.surface,
              borderColor:
                theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.accessTitle,
              {
                color:
                  theme.text,
              },
            ]}
          >
            Acceso restringido
          </Text>

          <Text
            style={[
              styles.accessText,
              {
                color:
                  theme.textMuted,
              },
            ]}
          >
            Este panel web está disponible únicamente para administradores y contadores autorizados.
          </Text>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor:
                  theme.primary,
              },
            ]}
            onPress={() => {
              void logout();
            }}
          >
            <Text
              style={[
                styles.primaryButtonText,
                {
                  color:
                    theme.onPrimary,
                },
              ]}
            >
              Cerrar sesión
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            theme.background,
        },
      ]}
    >
      <View
        style={[
          styles.topBar,
          {
            backgroundColor:
              theme.surface,
            borderBottomColor:
              theme.border,
          },
        ]}
      >
        <View
          style={
            styles.brandBlock
          }
        >
          <Text
            style={[
              styles.brandName,
              {
                color:
                  theme.text,
              },
            ]}
            numberOfLines={1}
          >
            {businessName}
          </Text>

          <Text
            style={[
              styles.brandLabel,
              {
                color:
                  theme.textMuted,
              },
            ]}
          >
            Dorian POS · Administración web
          </Text>
        </View>

        <View
          style={
            styles.userBlock
          }
        >
          <View
            style={
              styles.userTextBlock
            }
          >
            <Text
              style={[
                styles.userName,
                {
                  color:
                    theme.text,
                },
              ]}
              numberOfLines={1}
            >
              {user.fullName || user.email}
            </Text>

            <Text
              style={[
                styles.userRole,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Administrador
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.logoutButton,
              {
                borderColor:
                  theme.border,
                backgroundColor:
                  theme.surfaceAlt,
              },
            ]}
            onPress={() => {
              void logout();
            }}
          >
            <Text
              style={[
                styles.logoutButtonText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              Cerrar sesión
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={
          styles.adminContent
        }
      >
        <AdminScreen
          onProductsChanged={noopRefresh}
          onCategoriesChanged={noopRefresh}
          onModifiersChanged={noopRefresh}
        />
      </View>
    </View>
  );
}
