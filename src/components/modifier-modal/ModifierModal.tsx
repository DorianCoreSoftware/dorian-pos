import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { Product } from '../../types';
import { styles } from './ModifierModal.styles';
import { supabase } from '../../services/supabase';

// Interfaz para estructurar los modificadores seleccionados y enviarlos al guardar la orden
export interface SelectedModifier {
  id: string;
  name: string;
  extra_price?: string; // Por ejemplo "0.00" o "15.00"
  is_available?: boolean;
  group_name: 'Carne' | 'Salsa' | null;
}

interface ModifierModalProps {
  visible: boolean;
  product: Product | null;
  notes: string;
  onNotesChange: (text: string) => void;
  onClose: () => void;
  onConfirm: (selectedModifiers: SelectedModifier[]) => void;
}

const BURGER_CATEGORY_ID = 'bee57368-9ddb-44ec-a94d-d3212dabc113';
const ALITAS_CATEGORY_ID = '54314805-c05f-46b8-bcfd-1c1255c48d3e';


export const ModifierModal: React.FC<ModifierModalProps> = ({
  visible,
  product,
  notes,
  onNotesChange,
  onClose,
  onConfirm,
}) => {
  const [selectedMeats, setSelectedMeats] = useState<string[]>([]);
  const [selectedSauce, setSelectedSauce] = useState<string | null>(null);
  const [meatsMap, setMeatsMap] = useState<Record<string, SelectedModifier>>({});
  const [saucesMap, setSaucesMap] = useState<Record<string, SelectedModifier>>({});
  const ALL_MEATS = Object.keys(meatsMap);
  const ALL_SAUCES = Object.keys(saucesMap);

  const productName = product?.name?.toLowerCase() ?? "";

  const isBurger =
    product?.category_id === BURGER_CATEGORY_ID ||
    productName.includes("burger");

  const isAlitas =
    product?.category_id === ALITAS_CATEGORY_ID ||
    productName.includes("alita");

  const isKongBurger =
    productName.includes("kong");

  useEffect(() => {
    const loadModifiers = async () => {
      const { data, error } = await supabase
        .from("modifiers")
        .select("*")
        .eq("is_available", true);

      if (error) {
        console.error(error);
        return;
      }

      const meats: Record<string, SelectedModifier> = {};
      const sauces: Record<string, SelectedModifier> = {};

      data.forEach((mod: any) => {
        const modifier: SelectedModifier = {
          id: mod.id,
          name: mod.name,
          extra_price: mod.extra_price,
          is_available: mod.is_available,
          group_name: mod.group_name,
        };

        if (mod.group_name === "Carne") {
          meats[mod.name] = modifier;
        }

        if (mod.group_name === "Salsa") {
          sauces[mod.name] = modifier;
        }
      });

      setMeatsMap(meats);
      setSaucesMap(sauces);
    };

    loadModifiers();
  }, []);

  useEffect(() => {
    if (visible) {
      setSelectedMeats([]);
      setSelectedSauce(null);
    }
  }, [product, visible]);

  if (!product) return null;

  const handleMeatPress = (meat: string) => {
    if (selectedMeats.includes(meat)) {
      setSelectedMeats(selectedMeats.filter(m => m !== meat));
    } else {
      const maxCarnes = isKongBurger ? 2 : 1;
      if (selectedMeats.length < maxCarnes) {
        setSelectedMeats([...selectedMeats, meat]);
      } else if (maxCarnes === 1) {
        setSelectedMeats([meat]);
      }
    }
  };

  const isSelectionValid = () => {
    if (isBurger && selectedMeats.length === 0) return false;
    if (isAlitas && !selectedSauce) return false;
    return true;
  };

  const handleConfirm = () => {
    if (!isSelectionValid()) return;

    const dbModifiers: SelectedModifier[] = [];

    // Mapeamos las carnes seleccionadas inyectando su ID y precio real
    if (isBurger) {
      selectedMeats.forEach(meatName => {
        const meta = meatsMap[meatName];
        if (meta) {
          dbModifiers.push({
            id: meta.id,
            name: meatName,
            extra_price: meta.extra_price,
            is_available: meta.is_available,
            group_name: meta.group_name
          });
        }
      });
    }

    // Mapeamos la salsa seleccionada
    if (isAlitas && selectedSauce) {
      const meta = saucesMap[selectedSauce];
      if (meta) {
        dbModifiers.push({
          id: meta.id,
          name: selectedSauce,
          extra_price: meta.extra_price,
          is_available: meta.is_available,
          group_name: meta.group_name
        });
      }
    }

    onConfirm(dbModifiers);
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalContent, { maxHeight: '85%' }]}>

          <Text style={styles.modalTitle}>Ajustes de {product.name}</Text>
          <Text style={styles.modalSubtitle}>
            {isKongBurger ? 'Selecciona hasta 2 tipos de carne para tu Kong Burger:' : 'Selecciona las opciones obligatorias:'}
          </Text>

          <ScrollView
            contentContainerStyle={{ paddingVertical: 10 }}
            showsVerticalScrollIndicator={false}
          >

            {/* Sección de Hamburguesas */}
            {isBurger && (
              <View style={styles.requiredSection}>
                <Text style={styles.sectionLabel}>
                  Tipo de Carne * {isKongBurger ? '(Selecciona 1 o 2)' : '(Obligatorio)'}
                </Text>
                <View style={styles.optionsContainerHorizontal}>
                  {ALL_MEATS.map((meat) => {
                    const isSelected = selectedMeats.includes(meat);
                    return (
                      <TouchableOpacity
                        key={meat}
                        style={[
                          styles.optionButtonChip,
                          isSelected && styles.optionButtonSelected,
                          { minWidth: '45%', alignItems: 'center' }
                        ]}
                        onPress={() => handleMeatPress(meat)}
                        activeOpacity={0.8}
                      >
                        <Text style={[
                          styles.optionText,
                          isSelected && styles.optionTextSelected
                        ]}>
                          {meat} {isSelected && isKongBurger ? `(x${selectedMeats.filter(m => m === meat).length})` : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {isKongBurger && selectedMeats.length === 1 && (
                  <TouchableOpacity
                    style={{ marginTop: 8 }}
                    onPress={() => setSelectedMeats([...selectedMeats, selectedMeats[0]])}
                  >
                    <Text style={{ color: '#FFBF00', fontSize: 13, textDecorationLine: 'underline' }}>
                      ¿Hacerla doble de {selectedMeats[0]}?
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Sección de Alitas */}
            {isAlitas && (
              <View style={styles.requiredSection}>
                <Text style={styles.sectionLabel}>Salsa de las Alitas * (Obligatorio)</Text>
                <View style={styles.optionsContainerHorizontal}>
                  {ALL_SAUCES.map((sauce) => (
                    <TouchableOpacity
                      key={sauce}
                      style={[
                        styles.optionButtonChip,
                        selectedSauce === sauce && styles.optionButtonSelected
                      ]}
                      onPress={() => setSelectedSauce(sauce)}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.optionText,
                        selectedSauce === sauce && styles.optionTextSelected
                      ]}>
                        {sauce}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Notas adicionales (Opcional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Ej: Sin cebolla, extra aderezo, aderezo aparte..."
              placeholderTextColor="#666"
              value={notes}
              onChangeText={onNotesChange}
              multiline
              numberOfLines={3}
            />
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalAddBtn,
                !isSelectionValid() && styles.modalAddBtnDisabled
              ]}
              onPress={handleConfirm}
              disabled={!isSelectionValid()}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.modalAddText,
                !isSelectionValid() && styles.modalAddTextDisabled
              ]}>
                Agregar al Ticket
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};