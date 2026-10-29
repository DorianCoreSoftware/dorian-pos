import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useBusiness } from '../../../context/BusinessContext';
import { AttendanceEmployeeRequest, getAdminAttendanceRequests, reviewAttendanceEmployeeRequest } from '../../../services/attendanceService';

function label(value: string): string {
  const map: Record<string,string> = { permission:'Permiso', vacation:'Vacaciones', medical_leave:'Incapacidad', absence_justified:'Falta justificada', late_justified:'Retardo justificado', early_leave_justified:'Salida anticipada justificada', other:'Otra' };
  return map[value] ?? value;
}

export function AdminAttendanceRequests() {
  const { theme } = useBusiness();
  const [items, setItems] = useState<AttendanceEmployeeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteById, setNoteById] = useState<Record<string,string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => setItems(await getAdminAttendanceRequests());
  useEffect(() => { void (async()=>{try{await load();}catch(e){console.error(e);}finally{setLoading(false);}})(); }, []);

  const review = async (item: AttendanceEmployeeRequest, status: 'approved'|'rejected') => {
    try {
      setSavingId(item.id);
      await reviewAttendanceEmployeeRequest({ requestId:item.id, status, adminNote:noteById[item.id] });
      await load();
      Alert.alert('Solicitud actualizada', status === 'approved' ? 'Se aprobó y se creó la incidencia correspondiente. También se intentó notificar por correo.' : 'Se rechazó y se intentó notificar por correo.');
    } catch (e) { Alert.alert('No se pudo actualizar', e instanceof Error ? e.message : 'Ocurrió un error.'); }
    finally { setSavingId(null); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={theme.primary}/></View>;
  const pending = items.filter(i=>i.status==='pending');
  return <View style={[styles.card,{backgroundColor:theme.surface,borderColor:theme.border}]}>
    <Text style={[styles.title,{color:theme.text}]}>Solicitudes de empleados</Text>
    <Text style={[styles.sub,{color:theme.textMuted}]}>Permisos, vacaciones, incapacidades y justificaciones enviadas desde Asistencia.</Text>
    {pending.length===0 ? <Text style={{color:theme.textMuted,marginTop:10}}>No hay solicitudes pendientes.</Text> : pending.map(item=><View key={item.id} style={[styles.row,{borderColor:theme.border}]}>
      <View style={{flex:1}}><Text style={{color:theme.text,fontWeight:'900'}}>{item.employeeName} · {label(item.requestType)}</Text><Text style={{color:theme.textMuted}}>{item.startDate}{item.endDate!==item.startDate?` a ${item.endDate}`:''} · {item.note}</Text><TextInput value={noteById[item.id]??''} onChangeText={v=>setNoteById(c=>({...c,[item.id]:v}))} placeholder="Nota administrativa opcional" placeholderTextColor={theme.textMuted} style={[styles.input,{color:theme.text,borderColor:theme.border,backgroundColor:theme.background}]}/></View>
      <View style={styles.actions}><TouchableOpacity disabled={savingId===item.id} onPress={()=>void review(item,'approved')} style={[styles.btn,{backgroundColor:theme.primary,borderColor:theme.primary}]}><Text style={{color:theme.onPrimary,fontWeight:'900'}}>APROBAR</Text></TouchableOpacity><TouchableOpacity disabled={savingId===item.id} onPress={()=>void review(item,'rejected')} style={[styles.btn,{borderColor:theme.danger}]}><Text style={{color:theme.danger,fontWeight:'900'}}>RECHAZAR</Text></TouchableOpacity></View>
    </View>)}
  </View>;
}
const styles=StyleSheet.create({card:{borderWidth:1,borderRadius:14,padding:18},title:{fontSize:18,fontWeight:'900'},sub:{fontSize:12,marginTop:4},center:{minHeight:120,alignItems:'center',justifyContent:'center'},row:{borderTopWidth:1,paddingTop:14,marginTop:14,flexDirection:'row',gap:12,alignItems:'center'},input:{borderWidth:1,borderRadius:8,minHeight:40,paddingHorizontal:10,marginTop:8},actions:{gap:7},btn:{borderWidth:1,borderRadius:8,minHeight:38,paddingHorizontal:12,alignItems:'center',justifyContent:'center'}});
