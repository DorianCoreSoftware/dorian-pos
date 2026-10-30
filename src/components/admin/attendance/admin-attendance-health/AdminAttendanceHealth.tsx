import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  AttendanceModuleHealthCheck,
  getAttendanceModuleHealth,
} from '../../../../services/attendanceService';

import { useBusiness } from '../../../../context/BusinessContext';

import { styles } from './AdminAttendanceHealth.styles';
function statusLabel(
  status: AttendanceModuleHealthCheck['status'],
): string {
  switch (status) {
    case 'ok':
      return 'OK';
    case 'warning':
      return 'ADVERTENCIA';
    case 'error':
      return 'ERROR';
  }
}

export function AdminAttendanceHealth() {
  const { theme } = useBusiness();

  const [loading, setLoading] = useState(true);
  const [checks, setChecks] =
    useState<AttendanceModuleHealthCheck[]>([]);
  const [lastCheckedAt, setLastCheckedAt] =
    useState<Date | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const data = await getAttendanceModuleHealth();
    setChecks(data);
    setLastCheckedAt(new Date());
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await load();
      } catch (error) {
        console.error(
          'Error ejecutando diagnóstico de asistencia:',
          error,
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const summary = useMemo(() => ({
    ok: checks.filter(item => item.status === 'ok').length,
    warnings: checks.filter(item => item.status === 'warning').length,
    errors: checks.filter(item => item.status === 'error').length,
  }), [checks]);

  const runAgain = async (): Promise<void> => {
    try {
      setLoading(true);
      await load();
    } catch (error) {
      Alert.alert(
        'Diagnóstico de asistencia',
        error instanceof Error
          ? error.message
          : 'No se pudo ejecutar el diagnóstico.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]}>
            Diagnóstico y salud del módulo
          </Text>

          <Text style={[styles.help, { color: theme.textMuted }]}>
            Verifica dependencias críticas y busca anomalías operativas
            que conviene resolver antes de considerar Asistencia estable.
            El diagnóstico es de solo lectura: no modifica datos.
          </Text>

          {lastCheckedAt ? (
            <Text
              style={{
                color: theme.textMuted,
                marginTop: 4,
                fontSize: 10,
              }}
            >
              Última revisión:{' '}
              {lastCheckedAt.toLocaleString('es-MX')}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          disabled={loading}
          onPress={() => void runAgain()}
          style={[
            styles.refreshButton,
            {
              borderColor: theme.border,
              backgroundColor: theme.background,
              opacity: loading ? 0.55 : 1,
            },
          ]}
        >
          <Text style={{ color: theme.text, fontWeight: '900' }}>
            {loading ? 'REVISANDO...' : 'EJECUTAR DIAGNÓSTICO'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading && checks.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} />
          <Text
            style={{
              color: theme.textMuted,
              marginTop: 7,
            }}
          >
            Verificando módulo...
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.metrics}>
            <View
              style={[
                styles.metric,
                { borderColor: theme.border },
              ]}
            >
              <Text
                style={[
                  styles.metricNumber,
                  { color: theme.primary },
                ]}
              >
                {summary.ok}
              </Text>
              <Text style={{ color: theme.textMuted }}>
                verificaciones correctas
              </Text>
            </View>

            <View
              style={[
                styles.metric,
                { borderColor: theme.border },
              ]}
            >
              <Text
                style={[
                  styles.metricNumber,
                  {
                    color:
                      summary.warnings > 0
                        ? theme.danger
                        : theme.textMuted,
                  },
                ]}
              >
                {summary.warnings}
              </Text>
              <Text style={{ color: theme.textMuted }}>
                advertencias
              </Text>
            </View>

            <View
              style={[
                styles.metric,
                { borderColor: theme.border },
              ]}
            >
              <Text
                style={[
                  styles.metricNumber,
                  {
                    color:
                      summary.errors > 0
                        ? theme.danger
                        : theme.textMuted,
                  },
                ]}
              >
                {summary.errors}
              </Text>
              <Text style={{ color: theme.textMuted }}>
                errores críticos
              </Text>
            </View>
          </View>

          {summary.errors === 0 &&
          summary.warnings === 0 &&
          checks.length > 0 ? (
            <View
              style={[
                styles.goodBox,
                {
                  borderColor: theme.primary,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <Text
                style={{
                  color: theme.primary,
                  fontWeight: '900',
                }}
              >
                MÓDULO SIN ANOMALÍAS DETECTADAS
              </Text>
              <Text
                style={{
                  color: theme.textMuted,
                  marginTop: 4,
                  fontSize: 11,
                }}
              >
                Las verificaciones automáticas no encontraron
                inconsistencias operativas relevantes.
              </Text>
            </View>
          ) : null}

          <View style={styles.checks}>
            {checks.map(item => (
              <View
                key={item.checkKey}
                style={[
                  styles.checkRow,
                  { borderColor: theme.border },
                ]}
              >
                <View
                  style={[
                    styles.statusBadge,
                    {
                      borderColor:
                        item.status === 'ok'
                          ? theme.primary
                          : theme.danger,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        item.status === 'ok'
                          ? theme.primary
                          : theme.danger,
                      fontSize: 10,
                      fontWeight: '900',
                    }}
                  >
                    {statusLabel(item.status)}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: theme.text,
                      fontWeight: '900',
                    }}
                  >
                    {item.label}
                  </Text>

                  <Text
                    style={{
                      color: theme.textMuted,
                      marginTop: 3,
                      fontSize: 11,
                      lineHeight: 16,
                    }}
                  >
                    {item.detail}
                  </Text>
                </View>

                {item.affectedCount > 0 ? (
                  <Text
                    style={{
                      color:
                        item.status === 'ok'
                          ? theme.textMuted
                          : theme.danger,
                      fontWeight: '900',
                    }}
                  >
                    {item.affectedCount}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </>
      )}

      <Text style={[styles.footer, { color: theme.textMuted }]}>
        Este panel detecta anomalías técnicas y operativas; no reemplaza
        la revisión humana de incidencias, nómina o cierres administrativos.
      </Text>
    </View>
  );
}
