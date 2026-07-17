import React, { useState } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View, Text, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Product } from '../../types';
import { useAuth } from '../../context/AuthContext'; // Contexto de autenticación
import { supabase } from '../../services/supabase'; // Conexión directa a Supabase
import { styles } from './MenuList.styles';

interface MenuListProps {
  productos: Product[];
  onProductPress: (product: Product) => void;
  onRefreshMenu?: () => void; // Callback opcional para refrescar la lista
}

export const MenuList: React.FC<MenuListProps> = ({ productos, onProductPress, onRefreshMenu }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Estados para el Modal de Edición Completa
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPrice, setNewPrice] = useState('');
  
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Abrir el modal y precargar los datos actuales del producto
  const handleOpenEdit = (product: Product) => {
    setSelectedProduct(product);
    setNewName(product.name);
    setNewDescription(product.description || '');
    setNewPrice(product.price.toString());
  };

  // Guardar los cambios (Update completo)
  const handleUpdateProduct = async () => {
    if (!selectedProduct) return;

    if (!newName.trim()) {
      Alert.alert('Campo requerido', 'Por favor, ingresa el nombre del producto.');
      return;
    }
    
    const parsedPrice = parseFloat(newPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert('Precio inválido', 'Por favor, ingresa un número mayor a 0.');
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          name: newName.trim(),
          description: newDescription.trim() || null, // Guardamos null si está vacío
          price: parsedPrice 
        })
        .eq('id', selectedProduct.id);

      if (error) throw error;

      Alert.alert('Éxito', `${newName.trim()} ha sido actualizado.`);
      setSelectedProduct(null);
      
      if (onRefreshMenu) {
        onRefreshMenu();
      }
    } catch (err: any) {
      console.error('Error al actualizar producto:', err);
      Alert.alert('Error', 'No se pudo actualizar el producto en el servidor.');
    } finally {
      setUpdating(false);
    }
  };

  // Eliminación Lógica (Soft Delete: cambia is_active a false)
  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;

    Alert.alert(
      'Eliminar Producto',
      `¿Estás seguro de que deseas eliminar "${selectedProduct.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const { error } = await supabase
                .from('products')
                .update({ is_active: false }) // Soft delete
                .eq('id', selectedProduct.id);

              if (error) throw error;

              Alert.alert('Éxito', `El producto ha sido eliminado.`);
              setSelectedProduct(null);
              
              if (onRefreshMenu) {
                onRefreshMenu();
              }
            } catch (err: any) {
              console.error('Error al eliminar producto:', err);
              Alert.alert('Error', 'No se pudo eliminar el producto en el servidor.');
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
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
          onRequestClose={() => !updating && !deleting && setSelectedProduct(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Editar Producto</Text>
              
              {/* INPUT: NOMBRE */}
              <Text style={styles.inputLabel}>Nombre del Producto</Text>
              <TextInput
                style={styles.modalInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="Ej. Hamburguesa Especial"
                placeholderTextColor="#666"
                editable={!updating && !deleting}
              />

              {/* INPUT: DESCRIPCIÓN */}
              <Text style={styles.inputLabel}>Descripción</Text>
              <TextInput
                style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]}
                value={newDescription}
                onChangeText={setNewDescription}
                placeholder="Describe los ingredientes o tamaño..."
                placeholderTextColor="#666"
                multiline={true}
                numberOfLines={3}
                editable={!updating && !deleting}
              />

              {/* INPUT: PRECIO */}
              <Text style={styles.inputLabel}>Precio</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="decimal-pad"
                value={newPrice}
                onChangeText={setNewPrice}
                placeholder="0.00"
                placeholderTextColor="#666"
                editable={!updating && !deleting}
              />

              {/* BOTONES DE ACCIÓN */}
              <View style={styles.modalButtons}>
                {/* Cancelar */}
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]} 
                  onPress={() => setSelectedProduct(null)}
                  disabled={updating || deleting}
                >
                  <Text style={styles.buttonText}>Cancelar</Text>
                </TouchableOpacity>

                {/* Eliminar (Soft Delete) */}
                <TouchableOpacity 
                  style={[styles.modalButton, styles.deleteButton]} 
                  onPress={handleDeleteProduct}
                  disabled={updating || deleting}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.buttonText, { color: '#fff' }]}>Eliminar</Text>
                  )}
                </TouchableOpacity>

                {/* Guardar Cambios */}
                <TouchableOpacity 
                  style={[styles.modalButton, styles.saveButton]} 
                  onPress={handleUpdateProduct}
                  disabled={updating || deleting}
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