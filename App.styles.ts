import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // ==========================================
  // CONTENEDORES GENERALES Y LOADING
  // ==========================================
  mainContainer: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: 40,
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
  },
  containerLoading: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFF',
    marginTop: 12,
    fontSize: 16,
  },
  menuSection: {
    flex: 0.7,
    borderRightWidth: 1,
    borderRightColor: '#222',
  },

  // ==========================================
  // HEADER Y SECCIÓN DE USUARIO
  // ==========================================
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#1A1A1A',
  },
  headerBrandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  headerLogo: {
    width: 60,
    height: 60,
  },
  headerLogoLetters: {
    width: 70,
    height: 40,
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // ==========================================
  // TABS / PESTAÑAS
  // ==========================================
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#262626',
    borderRadius: 8,
    padding: 4,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  tabActiveButton: {
    backgroundColor: '#FFBF00',
  },
  tabText: {
    color: '#AAA',
    fontWeight: '700',
    fontSize: 14,
  },
  tabActiveText: {
    color: '#000',
  },

  // ==========================================
  // VISTA DE COCINA Y TARJETAS DE ÓRDENES
  // ==========================================
  kitchenContainer: {
    flex: 1,
    backgroundColor: '#161616',
  },
  emptyKitchen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyKitchenText: {
    color: '#888',
    fontSize: 18,
    fontWeight: '600',
  },
  orderCard: {
    backgroundColor: '#1E1E1E',
    width: 310,
    borderRadius: 12,
    padding: 16,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'space-between',
    height: '95%',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    paddingBottom: 8,
    marginBottom: 6,
  },
  orderId: {
    color: '#FFBF00',
    fontSize: 18,
    fontWeight: 'bold',
  },
  orderTotal: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  timeText: {
    color: '#777',
    fontSize: 13,
    marginBottom: 12,
  },
  itemsContainer: {
    marginBottom: 16,
  },
  itemRow: {
    backgroundColor: '#262626',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  itemText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  notesText: {
    color: '#FFBF00',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
    fontWeight: '500',
  },

  // ==========================================
  // BOTONES DE ACCIÓN (ENTREGAR, EDITAR, CANCELAR)
  // ==========================================
  actionBlock: {
    gap: 8,
    marginTop: 'auto',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  logoutButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#444',
  },
  logoutText: {
    color: '#FF5252',
    fontWeight: 'bold',
    fontSize: 12,
  },
  editOrderButton: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  editOrderButtonText: {
    color: '#FFBF00',
    fontWeight: 'bold',
    fontSize: 14,
  },
  deliverButton: {
    flex: 1.2,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deliverButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cancelOrderButton: {
    backgroundColor: '#241414',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4A2222',
  },
  cancelOrderButtonText: {
    color: '#FF5252',
    fontWeight: '700',
    fontSize: 13,
  },

  productSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3D3D3D',
    backgroundColor: '#1D1D1D',
  },

  productSearchIcon: {
    fontSize: 17,
    marginRight: 10,
  },

  productSearchInput: {
    flex: 1,
    height: 46,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 0,
  },

  productSearchClear: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#303030',
  },

  productSearchClearText: {
    color: '#AAAAAA',
    fontSize: 14,
    fontWeight: '900',
  },
});

