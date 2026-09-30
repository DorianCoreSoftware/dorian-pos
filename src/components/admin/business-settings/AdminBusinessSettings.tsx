import { DEFAULT_BRAND_PRIMARY } from '../../../theme/brandStyles';

import React, {
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  useBusiness,
} from '../../../context/BusinessContext';

import {
  saveBusinessSettings,
} from '../../../services/businessHoursService';

import {
  DEFAULT_CURRENCY_CODE,
} from '../../../Utils/currency';

import {
  styles,
} from './AdminBusinessSettings.styles';

interface BusinessSettingsForm {
  businessName: string;
  shortName: string;
  currencyCode: string;
  phone: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  timezone: string;
  loyaltyEnabled: boolean;
  deliveryEnabled: boolean;
  promotionsEnabled: boolean;
  kitchenEnabled: boolean;
}

const EMPTY_FORM:
  BusinessSettingsForm = {
  businessName: '',
  shortName: '',
  currencyCode:
    DEFAULT_CURRENCY_CODE,
  phone: '',
  logoUrl: '',
  primaryColor: DEFAULT_BRAND_PRIMARY,
  secondaryColor: '#000000',
  timezone: 'America/Mexico_City',
  loyaltyEnabled: true,
  deliveryEnabled: true,
  promotionsEnabled: true,
  kitchenEnabled: true,
};

export function AdminBusinessSettings() {
  const {
    width,
  } = useWindowDimensions();

  const {
    business,
    theme,
    isLoading,
    refreshBusiness,
  } = useBusiness();

  const isPhone =
    width < 700;

  const [
    form,
    setForm,
  ] =
    useState<BusinessSettingsForm>(
      EMPTY_FORM,
    );

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  useEffect(() => {
    if (!business) {
      return;
    }

    setForm({
      businessName:
        business.identity.businessName,

      shortName:
        business.identity.shortName,

      currencyCode:
        business.identity.currencyCode,

      phone:
        business.identity.phone,

      logoUrl:
        business.identity.logoUrl,

      primaryColor:
        business.identity.primaryColor,

      secondaryColor:
        business.identity.secondaryColor,

      timezone:
        business.timezone,

      loyaltyEnabled:
        business.features.loyaltyEnabled,

      deliveryEnabled:
        business.features.deliveryEnabled,

      promotionsEnabled:
        business.features.promotionsEnabled,

      kitchenEnabled:
        business.features.kitchenEnabled,
    });
  }, [business]);

  const updateField =
    <K extends keyof BusinessSettingsForm,>(
      key: K,
      value: BusinessSettingsForm[K],
    ): void => {
      setForm(
        current => ({
          ...current,
          [key]: value,
        }),
      );
    };

  const handleSave =
    async (): Promise<void> => {
      try {
        setIsSaving(true);

        await saveBusinessSettings({
          identity: {
            businessName:
              form.businessName,

            shortName:
              form.shortName,

            currencyCode:
              form.currencyCode,

            phone:
              form.phone,

            logoUrl:
              form.logoUrl,

            primaryColor:
              form.primaryColor,

            secondaryColor:
              form.secondaryColor,
          },

          features: {
            loyaltyEnabled:
              form.loyaltyEnabled,

            deliveryEnabled:
              form.deliveryEnabled,

            promotionsEnabled:
              form.promotionsEnabled,

            kitchenEnabled:
              form.kitchenEnabled,
          },

          timezone:
            form.timezone,
        });

        await refreshBusiness();

        Alert.alert(
          'Configuración guardada',
          'Los datos del negocio fueron actualizados correctamente.',
        );
      } catch (error) {
        Alert.alert(
          'Error',
          error instanceof Error
            ? error.message
            : 'No se pudo guardar la configuración del negocio.',
        );
      } finally {
        setIsSaving(false);
      }
    };

  if (
    isLoading &&
    !business
  ) {
    return (
      <View
        style={
          styles.loadingContainer
        }
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
          Cargando configuración...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={
        styles.container
      }
      contentContainerStyle={[
        styles.content,
        isPhone &&
          styles.contentPhone,
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={
          styles.header
        }
      >
        <Text
          style={[
            styles.title,
            {
              color:
                theme.text,
            },
          ]}
        >
          Configuración del negocio
        </Text>

        <Text
          style={[
            styles.subtitle,
            {
              color:
                theme.textMuted,
            },
          ]}
        >
          Estos datos serán la fuente de verdad para la identidad, apariencia y funciones de Dorian POS.
        </Text>
      </View>

      <SettingsCard
        title="Identidad"
        subtitle="Nombre y datos visibles del negocio."
        theme={theme}
      >
        <Field
          label="Nombre del negocio"
          value={form.businessName}
          onChangeText={value =>
            updateField(
              'businessName',
              value,
            )
          }
          placeholder="Ej. Mi negocio"
          theme={theme}
        />

        <Field
          label="Nombre corto"
          value={form.shortName}
          onChangeText={value =>
            updateField(
              'shortName',
              value,
            )
          }
          placeholder="Ej. BK"
          theme={theme}
        />

        <Field
          label="Teléfono"
          value={form.phone}
          onChangeText={value =>
            updateField(
              'phone',
              value,
            )
          }
          placeholder="Ej. 4451234567"
          keyboardType="phone-pad"
          theme={theme}
        />

        <Field
          label="URL del logo"
          value={form.logoUrl}
          onChangeText={value =>
            updateField(
              'logoUrl',
              value,
            )
          }
          placeholder="https://..."
          autoCapitalize="none"
          theme={theme}
        />
      </SettingsCard>

      <SettingsCard
        title="Apariencia"
        subtitle="Colores de identidad que iremos propagando por toda la aplicación."
        theme={theme}
      >
        <View
          style={[
            styles.twoColumnRow,
            isPhone &&
              styles.twoColumnRowPhone,
          ]}
        >
          <View
            style={
              styles.flexField
            }
          >
            <Field
              label="Color principal"
              value={form.primaryColor}
              onChangeText={value =>
                updateField(
                  'primaryColor',
                  value,
                )
              }
              placeholder="#FFBF00"
              autoCapitalize="characters"
              theme={theme}
            />
          </View>

          <View
            style={
              styles.flexField
            }
          >
            <Field
              label="Color secundario"
              value={form.secondaryColor}
              onChangeText={value =>
                updateField(
                  'secondaryColor',
                  value,
                )
              }
              placeholder="#000000"
              autoCapitalize="characters"
              theme={theme}
            />
          </View>
        </View>

        <View
          style={
            styles.colorPreviewRow
          }
        >
          <View
            style={[
              styles.colorPreview,
              {
                backgroundColor:
                  /^#[0-9A-Fa-f]{6}$/.test(
                    form.primaryColor,
                  )
                    ? form.primaryColor
                    : theme.surfaceAlt,
              },
            ]}
          />

          <View
            style={[
              styles.colorPreview,
              {
                backgroundColor:
                  /^#[0-9A-Fa-f]{6}$/.test(
                    form.secondaryColor,
                  )
                    ? form.secondaryColor
                    : theme.surfaceAlt,
              },
            ]}
          />

          <Text
            style={[
              styles.previewText,
              {
                color:
                  theme.textMuted,
              },
            ]}
          >
            Vista previa de los colores de marca
          </Text>
        </View>
      </SettingsCard>

      <SettingsCard
        title="Moneda y región"
        subtitle="Configuración regional base del negocio."
        theme={theme}
      >
        <Field
          label="Código de moneda"
          value={form.currencyCode}
          onChangeText={value =>
            updateField(
              'currencyCode',
              value
                .toUpperCase()
                .slice(0, 3),
            )
          }
          placeholder="MXN"
          autoCapitalize="characters"
          maxLength={3}
          theme={theme}
        />

        <Field
          label="Zona horaria"
          value={form.timezone}
          onChangeText={value =>
            updateField(
              'timezone',
              value,
            )
          }
          placeholder="America/Mexico_City"
          autoCapitalize="none"
          theme={theme}
        />
      </SettingsCard>

      <SettingsCard
        title="Funciones"
        subtitle="Activa o desactiva módulos opcionales para este negocio."
        theme={theme}
      >
        <FeatureSwitch
          title="Cocina"
          description="Flujo de preparación y tablero de cocina."
          value={form.kitchenEnabled}
          onValueChange={value =>
            updateField(
              'kitchenEnabled',
              value,
            )
          }
          theme={theme}
        />

        <FeatureSwitch
          title="Entregas"
          description="Pedidos a domicilio, zonas y reparto."
          value={form.deliveryEnabled}
          onValueChange={value =>
            updateField(
              'deliveryEnabled',
              value,
            )
          }
          theme={theme}
        />

        <FeatureSwitch
          title="Recompensas"
          description="Programa de lealtad y recompensas."
          value={form.loyaltyEnabled}
          onValueChange={value =>
            updateField(
              'loyaltyEnabled',
              value,
            )
          }
          theme={theme}
        />

        <FeatureSwitch
          title="Promociones"
          description="Módulo de promociones del negocio."
          value={form.promotionsEnabled}
          onValueChange={value =>
            updateField(
              'promotionsEnabled',
              value,
            )
          }
          theme={theme}
          isLast
        />
      </SettingsCard>

      <TouchableOpacity
        style={[
          styles.saveButton,
          {
            backgroundColor:
              theme.primary,
          },
          isSaving &&
            styles.saveButtonDisabled,
        ]}
        disabled={
          isSaving
        }
        onPress={() => {
          void handleSave();
        }}
      >
        <Text
          style={[
            styles.saveButtonText,
            {
              color:
                theme.onPrimary,
            },
          ]}
        >
          {isSaving
            ? 'Guardando...'
            : 'Guardar configuración'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

interface ThemeProps {
  primary: string;
  onPrimary: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
}

interface SettingsCardProps {
  title: string;
  subtitle: string;
  theme: ThemeProps;
  children: React.ReactNode;
}

function SettingsCard({
  title,
  subtitle,
  theme,
  children,
}: SettingsCardProps) {
  return (
    <View
      style={[
        styles.card,
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
          styles.cardTitle,
          {
            color:
              theme.text,
          },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.cardSubtitle,
          {
            color:
              theme.textMuted,
          },
        ]}
      >
        {subtitle}
      </Text>

      {children}
    </View>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  theme: ThemeProps;
  keyboardType?: 'default' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  theme,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  maxLength,
}: FieldProps) {
  return (
    <View
      style={
        styles.field
      }
    >
      <Text
        style={[
          styles.label,
          {
            color:
              theme.textMuted,
          },
        ]}
      >
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={
          onChangeText
        }
        placeholder={
          placeholder
        }
        placeholderTextColor="#707070"
        keyboardType={
          keyboardType
        }
        autoCapitalize={
          autoCapitalize
        }
        autoCorrect={false}
        maxLength={
          maxLength
        }
        style={[
          styles.input,
          {
            color:
              theme.text,
            borderColor:
              theme.border,
            backgroundColor:
              theme.surfaceAlt,
          },
        ]}
      />
    </View>
  );
}

interface FeatureSwitchProps {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  theme: ThemeProps;
  isLast?: boolean;
}

function FeatureSwitch({
  title,
  description,
  value,
  onValueChange,
  theme,
  isLast = false,
}: FeatureSwitchProps) {
  return (
    <View
      style={[
        styles.featureRow,
        {
          borderBottomColor:
            theme.border,
        },
        isLast &&
          styles.featureRowLast,
      ]}
    >
      <View
        style={
          styles.featureText
        }
      >
        <Text
          style={[
            styles.featureTitle,
            {
              color:
                theme.text,
            },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.featureDescription,
            {
              color:
                theme.textMuted,
            },
          ]}
        >
          {description}
        </Text>
      </View>

      <Switch
        value={value}
        onValueChange={
          onValueChange
        }
        trackColor={{
          false:
            '#444444',
          true:
            theme.primary,
        }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}
