import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Text, View } from 'react-native';
import { Category } from '../types';

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

const styles = StyleSheet.create({
  container: {
    height: 70,
  },
  categoriesBar: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 12,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
  },
  categoryButtonActive: {
    backgroundColor: '#FFBF00',
    borderColor: '#FFBF00',
  },
  categoryButtonText: {
    color: '#AAA',
    fontWeight: '600',
    fontSize: 16,
  },
  categoryButtonTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
});