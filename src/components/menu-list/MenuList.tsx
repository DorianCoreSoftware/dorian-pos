import React, { useState } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View, Text, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Product } from '../../types';
import { useAuth } from '../../context/AuthContext'; // Importamos el contexto de autenticación
import { supabase } from '../../services/supabase'; // Importamos supabase para actualizar directo
import { styles } from './MenuList.styles';

interface MenuListProps {
  productos: Product[];
  onProductPress: (product: Product) => void;
  onRefreshMenu?: () => void; // Callback opcional para que la pantalla padre refresque la lista de productos
}

export const MenuList: React.FC<MenuListProps> = ({ productos, onProductPress, onRefreshMenu }) => {
  const { user } = useAuth(); // Obtenemos el rol del usuario conectado
  const isAdmin = user?.role === 'admin';

  // Estados para el Modal de Edición
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleOpenEdit = (product: Product) => {
    setSelectedProduct(product);
    setNewPrice(product.price.toString());
  };

  const handleUpdatePrice = async () => {
    if (!selectedProduct) return;
    
    const parsedPrice = parseFloat(newPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert('Precio inválido', 'Por favor, ingresa un número mayor a 0.');
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('products') // Asegúrate de que el nombre de la tabla coincida exactamente
        .update({ price: parsedPrice })
        .eq('id', selectedProduct.id);

      if (error) throw error;

      Alert.alert('Éxito', `El precio de ${selectedProduct.name} ha sido actualizado.`);
      setSelectedProduct(null);
      
      // Si pasaste una función para recargar el menú, la llamamos para actualizar la UI instantáneamente
      if (onRefreshMenu) {
        onRefreshMenu();
      }
    } catch (err: any) {
      console.error('Error al actualizar precio:', err);
      Alert.alert('Error', 'No se pudo actualizar el precio en el servidor.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={productos}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.menuList}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.productCard} 
            activeOpacity={0.7}
            onPress={() => onProductPress(item)}
          >
            <View style={styles.cardInfo}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productDescription} numberOfLines={2}>
                {item.description || "Receta tradicional de Burger Kong."}
              </Text>
            </View>
            <View style={styles.cardPriceRow}>
              <View style={styles.priceContainer}>
                <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
                
                {/* Mostramos el botón de editar precio únicamente al Administrador */}
                {isAdmin && (
                  <TouchableOpacity 
                    style={styles.editPriceBadge}
                    onPress={() => handleOpenEdit(item)}
                  >
                    <Text style={styles.editPriceText}>Editar</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.addButton}>
                <Text style={styles.addButtonText}>+</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Modal de edición rápida para el Administrador */}
      {selectedProduct && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedProduct(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Editar Precio</Text>
              <Text style={styles.modalSubtitle}>{selectedProduct.name}</Text>
              
              <TextInput
                style={styles.modalInput}
                keyboardType="decimal-pad"
                value={newPrice}
                onChangeText={setNewPrice}
                autoFocus={true}
                placeholderTextColor="#666"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]} 
                  onPress={() => setSelectedProduct(null)}
                  disabled={updating}
                >
                  <Text style={styles.buttonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.modalButton, styles.saveButton]} 
                  onPress={handleUpdatePrice}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={[styles.buttonText, { color: '#000' }]}>Guardar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

