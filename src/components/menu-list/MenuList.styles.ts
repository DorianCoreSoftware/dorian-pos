import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // --- Estructura de la Lista y Grid ---
  menuList: {
    padding: 16,
    paddingBottom: 40,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  // --- Tarjeta de Producto (Estilo Oscuro) ---
  productCard: {
    backgroundColor: '#1E1E1E',
    width: '48%',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'space-between',
    minHeight: 150,
  },
  cardInfo: {
    marginBottom: 12,
  },
  productName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  productDescription: {
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
  },

  // --- Fila de Precio y Acciones de la Tarjeta ---
  cardPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  priceContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  productPrice: {
    color: '#FFBF00', // Tu color dorado/ámbar original
    fontSize: 20,
    fontWeight: 'bold',
  },
  editPriceBadge: {
    backgroundColor: '#FFBF0022',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#FFBF0088',
    marginTop: 4,
  },
  editPriceText: {
    color: '#FFBF00',
    fontSize: 10,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#2A2A2A',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: -2,
  },

  // --- Estilos del Modal (Overlay y Contenedor) ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: 340, // Un poco más ancho para albergar cómodamente el formulario
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },

  // --- Formulario dentro del Modal ---
  inputLabel: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#888',
    marginBottom: 6,
    marginTop: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: '#121212',
    width: '100%',
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    color: '#FFF', // Texto blanco para Name/Description para legibilidad
    fontSize: 15,
    paddingHorizontal: 12,
  },

  // --- Fila de Botones del Modal (3 Columnas) ---
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4, // Margen uniforme a los lados
  },
  cancelButton: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#444',
  },
  deleteButton: {
    backgroundColor: '#D9534F22', // Fondo rojo sutil translúcido
    borderWidth: 1,
    borderColor: '#D9534F88', // Borde rojo de alerta
  },
  saveButton: {
    backgroundColor: '#FFBF00', // El color principal para destacar el botón guardar
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});