import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useBusiness } from '../../../context/BusinessContext';
import { DateCalendarField, DateTimeCalendarField } from '../../common/date-calendar-field/DateCalendarField';
import {
  EventAvailabilityAdmin,
  EventAvailabilityRuleAdmin,
  createEventAvailabilityBlock,
  deleteEventAvailabilityBlock,
  getEventAvailabilityAdmin,
  saveEventAvailabilityConfig,
} from '../../../services/adminEventsService';
import { styles } from './AdminEventAvailability.styles';

interface Props {
  isPhone: boolean;
}

const DAYS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

const DEFAULT_RULES: EventAvailabilityRuleAdmin[] = DAYS.map((_, dayOfWeek) => ({
  dayOfWeek,
  isEnabled: false,
  startTime: '12:00',
  endTime: '22:00',
}));

export function AdminEventAvailability({ isPhone }: Props) {
  const { theme } = useBusiness();
  const [data, setData] = useState<EventAvailabilityAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [slotInterval, setSlotInterval] = useState('30');
  const [maxSimultaneous, setMaxSimultaneous] = useState('1');
  const [rules, setRules] = useState<EventAvailabilityRuleAdmin[]>(DEFAULT_RULES);
  const [blockDate, setBlockDate] = useState('');
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [fullDay, setFullDay] = useState(true);

  const load = async (): Promise<void> => {
    try {
      setLoading(true);
      const result = await getEventAvailabilityAdmin();
      setData(result);
      setEnabled(result.enabled);
      setSlotInterval(String(result.slotIntervalMinutes));
      setMaxSimultaneous(String(result.maxSimultaneousEvents));
      setRules(result.rules.length ? result.rules : DEFAULT_RULES);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo cargar la disponibilidad de eventos.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateRule = (
    dayOfWeek: number,
    patch: Partial<EventAvailabilityRuleAdmin>,
  ): void => {
    setRules(current =>
      current.map(rule =>
        rule.dayOfWeek === dayOfWeek
          ? { ...rule, ...patch }
          : rule,
      ),
    );
  };

  const save = async (): Promise<void> => {
    try {
      setSaving(true);
      await saveEventAvailabilityConfig({
        enabled,
        slotIntervalMinutes: Number(slotInterval),
        maxSimultaneousEvents: Number(maxSimultaneous),
        rules,
      });
      Alert.alert('Disponibilidad guardada', 'Los horarios para eventos se actualizaron correctamente.');
      await load();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la disponibilidad.',
      );
    } finally {
      setSaving(false);
    }
  };

  const addBlock = async (): Promise<void> => {
    try {
      setSaving(true);
      await createEventAvailabilityBlock({
        eventDate: blockDate,
        fullDay,
        startTime: fullDay ? '' : blockStart,
        endTime: fullDay ? '' : blockEnd,
        reason: blockReason,
      });
      setBlockDate('');
      setBlockStart('');
      setBlockEnd('');
      setBlockReason('');
      setFullDay(true);
      await load();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo crear el bloqueo.',
      );
    } finally {
      setSaving(false);
    }
  };

  const removeBlock = async (id: string): Promise<void> => {
    try {
      setSaving(true);
      await deleteEventAvailabilityBlock(id);
      await load();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar el bloqueo.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Disponibilidad de eventos</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>Define los días, horarios y capacidad que el cotizador público puede ofrecer.</Text>

        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={[styles.label, { color: theme.text }]}>Controlar disponibilidad</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted, marginBottom: 0 }]}>Al activarlo, la web solo permitirá horarios realmente disponibles.</Text>
          </View>
          <Switch value={enabled} onValueChange={setEnabled} trackColor={{ true: theme.primary }} />
        </View>

        <View style={[styles.row, isPhone && styles.rowPhone]}>
          <View style={styles.column}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Intervalo entre horarios (min)</Text>
            <TextInput
              value={slotInterval}
              onChangeText={setSlotInterval}
              keyboardType="number-pad"
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
              placeholder="30"
              placeholderTextColor={theme.textMuted}
            />
          </View>
          <View style={styles.column}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Eventos simultáneos permitidos</Text>
            <TextInput
              value={maxSimultaneous}
              onChangeText={setMaxSimultaneous}
              keyboardType="number-pad"
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
              placeholder="1"
              placeholderTextColor={theme.textMuted}
            />
          </View>
        </View>

        <Text style={[styles.label, { color: theme.textMuted }]}>Horario semanal</Text>
        {rules
          .slice()
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
          .map(rule => (
            <View key={rule.dayOfWeek} style={[styles.dayRow, { borderColor: theme.border, backgroundColor: theme.background }]}>
              <View style={styles.dayHeader}>
                <Text style={[styles.dayName, { color: theme.text }]}>{DAYS[rule.dayOfWeek]}</Text>
                <Switch
                  value={rule.isEnabled}
                  onValueChange={(value: boolean) => updateRule(rule.dayOfWeek, { isEnabled: value })}
                  trackColor={{ true: theme.primary }}
                />
              </View>
              {rule.isEnabled ? (
                <View style={styles.timeRow}>
                  <TextInput
                    value={rule.startTime}
                    onChangeText={(value: string) => updateRule(rule.dayOfWeek, { startTime: value })}
                    placeholder="12:00"
                    placeholderTextColor={theme.textMuted}
                    style={[styles.timeInput, { color: theme.text, borderColor: theme.border }]}
                  />
                  <TextInput
                    value={rule.endTime}
                    onChangeText={(value: string) => updateRule(rule.dayOfWeek, { endTime: value })}
                    placeholder="22:00"
                    placeholderTextColor={theme.textMuted}
                    style={[styles.timeInput, { color: theme.text, borderColor: theme.border }]}
                  />
                </View>
              ) : null}
            </View>
          ))}

        <TouchableOpacity
          disabled={saving}
          style={[styles.saveButton, { backgroundColor: theme.primary }, saving && styles.muted]}
          onPress={() => { void save(); }}
        >
          <Text style={[styles.saveText, { color: theme.onPrimary }]}>{saving ? 'Guardando...' : 'Guardar disponibilidad'}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Bloqueos manuales</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>Bloquea un día completo o un rango de horas por mantenimiento, evento privado u otra razón.</Text>

        <View style={[styles.blockForm, { borderColor: theme.border, backgroundColor: theme.background }]}>
          <DateCalendarField label="Fecha" value={blockDate} onChange={setBlockDate} />
          <View style={styles.switchRow}>
            <Text style={[styles.label, { color: theme.text }]}>Bloquear todo el día</Text>
            <Switch value={fullDay} onValueChange={setFullDay} trackColor={{ true: theme.primary }} />
          </View>
          {!fullDay ? (
            <View style={[styles.row, isPhone && styles.rowPhone]}>
              <View style={styles.column}>
                <Text style={[styles.label, { color: theme.textMuted }]}>Desde</Text>
                <TextInput value={blockStart} onChangeText={setBlockStart} placeholder="18:00" placeholderTextColor={theme.textMuted} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />
              </View>
              <View style={styles.column}>
                <Text style={[styles.label, { color: theme.textMuted }]}>Hasta</Text>
                <TextInput value={blockEnd} onChangeText={setBlockEnd} placeholder="21:00" placeholderTextColor={theme.textMuted} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />
              </View>
            </View>
          ) : null}
          <Text style={[styles.label, { color: theme.textMuted }]}>Motivo (opcional)</Text>
          <TextInput
            value={blockReason}
            onChangeText={setBlockReason}
            placeholder="Ej. evento privado"
            placeholderTextColor={theme.textMuted}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />
          <TouchableOpacity disabled={saving} style={[styles.secondaryButton, { borderColor: theme.primary }, saving && styles.muted]} onPress={() => { void addBlock(); }}>
            <Text style={[styles.secondaryText, { color: theme.primary }]}>+ Agregar bloqueo</Text>
          </TouchableOpacity>
        </View>

        {(data?.blocks ?? []).length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>No hay bloqueos manuales.</Text>
        ) : (
          data?.blocks.map(block => (
            <View key={block.id} style={[styles.blockItem, { borderColor: theme.border, backgroundColor: theme.background }]}>
              <View style={styles.blockTop}>
                <View style={styles.blockInfo}>
                  <Text style={[styles.blockTitle, { color: theme.text }]}>{block.eventDate}</Text>
                  <Text style={[styles.blockMeta, { color: theme.textMuted }]}>
                    {block.fullDay ? 'Todo el día' : `${block.startTime} - ${block.endTime}`}
                    {block.reason ? ` · ${block.reason}` : ''}
                  </Text>
                </View>
                <TouchableOpacity disabled={saving} onPress={() => { void removeBlock(block.id); }}>
                  <Text style={[styles.secondaryText, { color: theme.danger }]}>ELIMINAR</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </>
  );
}
