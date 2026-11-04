import React from 'react';

import {
  ScrollView,
  Text,
  View,
} from 'react-native';

import {
  useBusiness,
} from '../../../context/BusinessContext';

import {
  AdminAttendancePayroll,
} from '../attendance/admin-attendance-payroll/AdminAttendancePayroll';

import {
  styles,
} from './AdminPayroll.styles';

export function AdminPayroll() {
  const {
    theme,
  } = useBusiness();

  return (
    <ScrollView
      style={
        styles.scroll
      }
      contentContainerStyle={
        styles.container
      }
      showsVerticalScrollIndicator
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={[
          styles.headerCard,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        <Text
          style={[
            styles.eyebrow,
            {
              color: theme.primary,
            },
          ]}
        >
          ADMINISTRACIÓN FINANCIERA
        </Text>

        <Text
          style={[
            styles.title,
            {
              color: theme.text,
            },
          ]}
        >
          Nómina
        </Text>

        <Text
          style={[
            styles.subtitle,
            {
              color: theme.textMuted,
            },
          ]}
        >
          Configura salarios, genera cortes, registra pagos y consulta recibos sin mezclar la operación financiera con la gestión diaria de asistencia.
        </Text>
      </View>

      <AdminAttendancePayroll />
    </ScrollView>
  );
}
