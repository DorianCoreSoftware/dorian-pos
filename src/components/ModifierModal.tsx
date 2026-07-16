import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Modal, 
  TextInput, 
  TouchableOpacity 
} from 'react-native';
import { Product } from '../types';

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

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    width: '45%', // Proporción ideal para el iPad en horizontal
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
  },
  notesInput: {
    backgroundColor: '#121212',
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 20,
    minHeight: 80,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#AAA',
    fontWeight: '600',
    fontSize: 15,
  },
  modalAddBtn: {
    flex: 1,
    backgroundColor: '#FFBF00',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalAddText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 15,
  },
});