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
    flex: 1,
    minWidth: 0,
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

  phoneContainer: {
    flex: 1,
    backgroundColor: '#121212',
    paddingBottom: 74,
  },

  phoneMenuSection: {
    flex: 1,
    minWidth: 0,
  },

  mobileCartBar: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9A500',
    backgroundColor: '#FFBF00',
    elevation: 10,
  },

  mobileCartBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  mobileCartIcon: {
    fontSize: 24,
    marginRight: 10,
  },

  mobileCartTitle: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '900',
  },

  mobileCartSubtitle: {
    color: '#493900',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },

  mobileCartBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  mobileCartTotal: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '900',
  },

  mobileCartArrow: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '900',
    marginLeft: 10,
  },

  mobileCartModal: {
    flex: 1,
    backgroundColor: '#181818',
    paddingTop: 40,
  },

  mobileCartContent: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },

  mobileCartModalHeader: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#292929',
    backgroundColor: '#1D1D1D',
  },

  mobileCartModalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },

  mobileCartModalSubtitle: {
    color: '#999999',
    fontSize: 11,
    marginTop: 2,
  },

  mobileCartCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#444444',
    backgroundColor: '#292929',
  },

  mobileCartCloseText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },

  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerPhone: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },

  headerTopRowPhone: {
    width: '100%',
  },

  headerLogoPhone: {
    width: 42,
    height: 42,
  },

  headerLogoLettersPhone: {
    width: 58,
    height: 32,
  },

  userContainerPhone: {
    flexShrink: 1,
    gap: 8,
  },

  userNamePhone: {
    maxWidth: 120,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  tabContainerPhone: {
    width: '100%',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    padding: 4,
  },

  tabButtonPhone: {
    paddingVertical: 7,
    paddingHorizontal: 10,
  },

  tabTextPhone: {
    fontSize: 11,
  },

  printerTestButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#555555',
    alignItems: 'center',
    justifyContent: 'center',
  },

  printerTestButtonPhone: {
    minWidth: 42,
    paddingHorizontal: 8,
  },

  printerTestText: {
    color: '#FFBF00',
    fontSize: 12,
    fontWeight: '700',
  },

  editingOrderBadge: {
    alignSelf:
      'flex-start',

    marginTop:
      8,

    marginHorizontal:
      16,

    paddingHorizontal:
      12,

    paddingVertical:
      6,

    borderRadius:
      8,

    borderWidth:
      1,

    borderColor:
      '#FFBF00',

    backgroundColor:
      '#2B250C',
  },

  editingOrderBadgeText: {
    color:
      '#FFBF00',

    fontSize:
      12,

    fontWeight:
      '800',
  },
});

