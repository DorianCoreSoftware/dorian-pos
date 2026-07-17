import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Modal, 
  TextInput, 
  TouchableOpacity 
} from 'react-native';
import { Product } from '../../types';
import { styles } from './ModifierModal.styles';

interface ModifierModalProps {
  visible: boolean;
  product: Product | null;
  notes: string;
  onNotesChange: (text: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export const ModifierModal: React.FC<ModifierModalProps> = ({
  visible,
  product,
  notes,
  onNotesChange,
  onClose,
  onConfirm,
}) => {
  if (!product) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContent}>
          
          {/* Cabecera del Modal */}
          <Text style={styles.modalTitle}>Ajustes de {product.name}</Text>
          <Text style={styles.modalSubtitle}>
            Agrega especificaciones o modificadores del pedido:
          </Text>
          
          {/* Aquí es donde en el futuro colocaremos los botones rápidos del catálogo */}
          {/* <View style={styles.fastModifiersContainer}> ... </View> */}

          {/* Campo de Texto para Notas Manuales */}
          <TextInput
            style={styles.notesInput}
            placeholder="Ej: Sin cebolla, extra aderezo, alitas bien doradas..."
            placeholderTextColor="#666"
            value={notes}
            onChangeText={onNotesChange}
            multiline
            numberOfLines={3}
          />

          {/* Botones de Acción */}
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.modalCancelBtn} 
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalAddBtn} 
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={styles.modalAddText}>Agregar al Ticket</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};