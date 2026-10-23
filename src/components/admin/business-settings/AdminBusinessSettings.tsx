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
  address: string;
  ticketFooter: string;
  timezone: string;
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  whatsapp: string;
  websiteUrl: string;
}

const EMPTY_FORM:
  BusinessSettingsForm = {
  businessName: '',
  shortName: '',
  currencyCode:
    DEFAULT_CURRENCY_CODE,
  phone: '',
  address: '',
  ticketFooter: 'Gracias por tu compra',
  timezone: 'America/Mexico_City',
  facebookUrl: '',
  instagramUrl: '',
  tiktokUrl: '',
  whatsapp: '',
  websiteUrl: '',
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

      address:
        business.identity.address,

      ticketFooter:
        business.ticketSettings.footerText,

      timezone:
        business.timezone,

      facebookUrl:
        business.socialLinks.facebookUrl,

      instagramUrl:
        business.socialLinks.instagramUrl,

      tiktokUrl:
        business.socialLinks.tiktokUrl,

      whatsapp:
        business.socialLinks.whatsapp,

      websiteUrl:
        business.socialLinks.websiteUrl,
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

            address:
              form.address,
          },

          timezone:
            form.timezone,

          ticketSettings: {
            footerText:
              form.ticketFooter,
          },

          socialLinks: {
            facebookUrl:
              form.facebookUrl,

            instagramUrl:
              form.instagramUrl,

            tiktokUrl:
              form.tiktokUrl,

            whatsapp:
              form.whatsapp,

            websiteUrl:
              form.websiteUrl,
          },
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
          Administra los datos operativos y de contacto de tu negocio.
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
          placeholder="Ej. MN"
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
          label="Dirección para tickets"
          value={form.address}
          onChangeText={value =>
            updateField(
              'address',
              value,
            )
          }
          placeholder="Ej. Av. Principal 123, Centro"
          maxLength={180}
          theme={theme}
        />
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
        title="Ticket"
        subtitle="Información que se imprime en los comprobantes de venta."
        theme={theme}
      >
        <Field
          label="Mensaje al pie del ticket"
          value={form.ticketFooter}
          onChangeText={value =>
            updateField(
              'ticketFooter',
              value,
            )
          }
          placeholder="Gracias por tu compra"
          maxLength={180}
          theme={theme}
        />
      </SettingsCard>


      <SettingsCard
        title="Redes sociales"
        subtitle="Configura solo las redes que quieras mostrar en el menú web. Los campos vacíos permanecerán ocultos."
        theme={theme}
      >
        <Field
          label="Facebook"
          value={form.facebookUrl}
          onChangeText={value =>
            updateField(
              'facebookUrl',
              value,
            )
          }
          placeholder="https://facebook.com/tu-negocio"
          autoCapitalize="none"
          maxLength={220}
          theme={theme}
        />

        <Field
          label="Instagram"
          value={form.instagramUrl}
          onChangeText={value =>
            updateField(
              'instagramUrl',
              value,
            )
          }
          placeholder="https://instagram.com/tu-negocio"
          autoCapitalize="none"
          maxLength={220}
          theme={theme}
        />

        <Field
          label="TikTok"
          value={form.tiktokUrl}
          onChangeText={value =>
            updateField(
              'tiktokUrl',
              value,
            )
          }
          placeholder="https://tiktok.com/@tu-negocio"
          autoCapitalize="none"
          maxLength={220}
          theme={theme}
        />

        <Field
          label="WhatsApp"
          value={form.whatsapp}
          onChangeText={value =>
            updateField(
              'whatsapp',
              value,
            )
          }
          placeholder="Ej. 524611234567 o https://wa.me/..."
          autoCapitalize="none"
          maxLength={220}
          theme={theme}
        />

        <Field
          label="Sitio web"
          value={form.websiteUrl}
          onChangeText={value =>
            updateField(
              'websiteUrl',
              value,
            )
          }
          placeholder="https://tu-negocio.com"
          autoCapitalize="none"
          maxLength={220}
          theme={theme}
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
