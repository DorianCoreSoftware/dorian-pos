import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Text, View } from 'react-native';
import { Category } from '../../types';
import { styles } from './CategoryTabs.styles';

interface CategoryTabsProps {
  categorias: Category[];
  categoriaSeleccionada: string;
  onSelectCategoria: (id: string) => void;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categorias,
  categoriaSeleccionada,
  onSelectCategoria,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesBar}>
        {categorias.map((cat) => {
          const activa = cat.id === categoriaSeleccionada;
          return (
            <TouchableOpacity 
              key={cat.id} 
              style={[styles.categoryButton, activa && styles.categoryButtonActive]}
              onPress={() => onSelectCategoria(cat.id)}
            >
              <Text style={[styles.categoryButtonText, activa && styles.categoryButtonTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};