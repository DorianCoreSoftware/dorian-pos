import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useBusiness } from '../../../context/BusinessContext';

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];
const DAYS = ['D','L','M','M','J','V','S'];

function parseIsoDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date();
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatDateDisplay(value: string): string {
  if (!value) return 'Seleccionar fecha';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.slice(0, 10));
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function monthDays(monthDate: Date): Array<Date | null> {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1, 12);
  const last = new Date(year, month + 1, 0, 12);
  const result: Array<Date | null> = [];
  for (let i = 0; i < first.getDay(); i += 1) result.push(null);
  for (let day = 1; day <= last.getDate(); day += 1) {
    result.push(new Date(year, month, day, 12));
  }
  while (result.length % 7 !== 0) result.push(null);
  return result;
}

type DateCalendarFieldProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  minimumDate?: string;
  maximumDate?: string;
  allowClear?: boolean;
};

export function DateCalendarField({
  value,
  onChange,
  label,
  disabled = false,
  minimumDate,
  maximumDate,
  allowClear = false,
}: DateCalendarFieldProps) {
  const { theme } = useBusiness();
  const [visible, setVisible] = useState(false);
  const [month, setMonth] = useState(() => parseIsoDate(value));
  const days = useMemo(() => monthDays(month), [month]);
  const selected = value ? parseIsoDate(value) : null;

  const open = () => {
    if (disabled) return;
    setMonth(parseIsoDate(value));
    setVisible(true);
  };

  const isDisabled = (date: Date): boolean => {
    const iso = toIsoDate(date);
    return Boolean(
      (minimumDate && iso < minimumDate) ||
      (maximumDate && iso > maximumDate),
    );
  };

  return (
    <View style={styles.field}>
      {label ? <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text> : null}
      <TouchableOpacity
        disabled={disabled}
        onPress={open}
        style={[
          styles.button,
          { borderColor: theme.border, backgroundColor: theme.background, opacity: disabled ? 0.55 : 1 },
        ]}
      >
        <Text style={[styles.calendarIcon, { color: theme.primary }]}>▣</Text>
        <Text style={[styles.value, { color: value ? theme.text : theme.textMuted }]}>
          {formatDateDisplay(value)}
        </Text>
        <Text style={{ color: theme.textMuted, fontWeight: '900' }}>⌄</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <Pressable style={[styles.modal, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => undefined}>
            <View style={styles.monthHeader}>
              <TouchableOpacity
                style={[styles.nav, { borderColor: theme.border }]}
                onPress={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1, 12))}
              >
                <Text style={{ color: theme.text, fontWeight: '900' }}>‹</Text>
              </TouchableOpacity>
              <Text style={[styles.monthTitle, { color: theme.text }]}>
                {MONTHS[month.getMonth()]} {month.getFullYear()}
              </Text>
              <TouchableOpacity
                style={[styles.nav, { borderColor: theme.border }]}
                onPress={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1, 12))}
              >
                <Text style={{ color: theme.text, fontWeight: '900' }}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.grid}>
              {DAYS.map((day, index) => (
                <View key={`${day}-${index}`} style={styles.dayCell}>
                  <Text style={[styles.weekDay, { color: theme.textMuted }]}>{day}</Text>
                </View>
              ))}
              {days.map((date, index) => {
                if (!date) return <View key={`empty-${index}`} style={styles.dayCell} />;
                const iso = toIsoDate(date);
                const active = selected ? toIsoDate(selected) === iso : false;
                const unavailable = isDisabled(date);
                return (
                  <TouchableOpacity
                    key={iso}
                    disabled={unavailable}
                    onPress={() => {
                      onChange(iso);
                      setVisible(false);
                    }}
                    style={[
                      styles.dayCell,
                      styles.dayButton,
                      active ? { backgroundColor: theme.primary } : null,
                    ]}
                  >
                    <Text
                      style={{
                        color: unavailable ? theme.textMuted : active ? theme.onPrimary : theme.text,
                        opacity: unavailable ? 0.35 : 1,
                        fontWeight: active ? '900' : '700',
                      }}
                    >
                      {date.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                onPress={() => {
                  const today = new Date();
                  const iso = toIsoDate(today);
                  if (!isDisabled(today)) {
                    onChange(iso);
                    setVisible(false);
                  }
                }}
                style={[styles.footerButton, { borderColor: theme.border }]}
              >
                <Text style={{ color: theme.text, fontWeight: '800' }}>HOY</Text>
              </TouchableOpacity>
              {allowClear ? (
                <TouchableOpacity
                  onPress={() => { onChange(''); setVisible(false); }}
                  style={[styles.footerButton, { borderColor: theme.border }]}
                >
                  <Text style={{ color: theme.textMuted, fontWeight: '800' }}>LIMPIAR</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={() => setVisible(false)} style={[styles.footerButton, { borderColor: theme.primary }]}> 
                <Text style={{ color: theme.primary, fontWeight: '900' }}>CERRAR</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

type DateTimeCalendarFieldProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  allowClear?: boolean;
};

export function DateTimeCalendarField({ value, onChange, label, disabled = false, allowClear = false }: DateTimeCalendarFieldProps) {
  const { theme } = useBusiness();
  const clean = value.trim();
  const date = /^\d{4}-\d{2}-\d{2}/.test(clean) ? clean.slice(0, 10) : '';
  const timeMatch = clean.match(/(?:T|\s)(\d{2}:\d{2})/);
  const time = timeMatch?.[1] ?? '';

  const emit = (nextDate: string, nextTime: string) => {
    if (!nextDate && !nextTime) { onChange(''); return; }
    if (!nextDate) { onChange(value); return; }
    onChange(`${nextDate} ${nextTime || '00:00'}`);
  };

  return (
    <View style={styles.field}>
      {label ? <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text> : null}
      <View style={styles.dateTimeRow}>
        <View style={styles.datePart}>
          <DateCalendarField
            value={date}
            onChange={next => emit(next, time)}
            disabled={disabled}
            allowClear={allowClear}
          />
        </View>
        <TextInput
          editable={!disabled}
          value={time}
          onChangeText={text => {
            const sanitized = text.replace(/[^0-9:]/g, '').slice(0, 5);
            emit(date || toIsoDate(new Date()), sanitized);
          }}
          placeholder="HH:mm"
          placeholderTextColor={theme.textMuted}
          keyboardType="numbers-and-punctuation"
          style={[styles.timeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
        />
      </View>
      {allowClear && value ? (
        <TouchableOpacity onPress={() => onChange('')} style={styles.clearLink}>
          <Text style={{ color: theme.textMuted, fontSize: 10, fontWeight: '800' }}>LIMPIAR FECHA Y HORA</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { minWidth: 0 },
  label: { marginBottom: 6, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  button: { minHeight: 44, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  calendarIcon: { fontSize: 15, fontWeight: '900' },
  value: { flex: 1, fontSize: 13, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)', justifyContent: 'center', alignItems: 'center', padding: 18 },
  modal: { width: '100%', maxWidth: 410, borderWidth: 1, borderRadius: 16, padding: 16 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
  monthTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '900' },
  nav: { width: 38, height: 38, borderWidth: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayButton: { borderRadius: 999 },
  weekDay: { fontSize: 10, fontWeight: '900' },
  footer: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
  footerButton: { minHeight: 36, borderWidth: 1, borderRadius: 8, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center' },
  dateTimeRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  datePart: { flex: 1, minWidth: 160 },
  timeInput: { width: 92, minHeight: 44, borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, fontSize: 13, fontWeight: '700' },
  clearLink: { alignSelf: 'flex-start', marginTop: 5 },
});
