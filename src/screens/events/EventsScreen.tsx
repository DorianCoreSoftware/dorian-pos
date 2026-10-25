import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useBusiness } from '../../context/BusinessContext';
import AdminEventRequests from '../../components/admin/events/AdminEventRequests';
import { styles } from './EventsScreen.styles';

interface Props {
  onRequestsChanged?: () => void;
}

export function EventsScreen({ onRequestsChanged }: Props) {
  const { theme } = useBusiness();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Eventos</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>Gestiona las solicitudes enviadas desde el cotizador web.</Text>
      </View>
      <AdminEventRequests onChanged={onRequestsChanged} />
    </ScrollView>
  );
}
