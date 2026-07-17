import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
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