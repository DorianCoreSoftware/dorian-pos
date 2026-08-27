import {
  StyleSheet,
} from 'react-native';

export const styles =
  StyleSheet.create({
    cartSection: {
      flex: 0.3,
      minHeight: 0,
      backgroundColor: '#181818',
      overflow: 'hidden',
    },

    cartHeader: {
      flexShrink: 0,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#222',
    },

    cartHeaderInfo: {
      flex: 1,
    },

    cartHeaderTitle: {
      color: '#FFF',
      fontSize: 18,
      fontWeight: 'bold',
    },

    cartHeaderDelivery: {
      color: '#FFBF00',
      fontSize: 11,
      fontWeight: '700',
      marginTop: 3,
    },

    cartHeaderActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },

    clearCartText: {
      color: '#FF5252',
      fontSize: 14,
      fontWeight: '600',
    },

    collapseButton: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: '#444444',
      backgroundColor: '#242424',
    },

    collapseButtonText: {
      color: '#BBBBBB',
      fontSize: 12,
      fontWeight: '700',
    },

    /*
     * CARRITO COLAPSADO
     */
    collapsedCart: {
      width: 190,
      minHeight: 74,
      alignSelf: 'stretch',
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: '#181818',
      borderLeftWidth: 1,
      borderLeftColor: '#333333',
      justifyContent:
        'space-between',
    },

    collapsedCartLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    collapsedCartIcon: {
      fontSize: 22,
      marginRight: 8,
    },

    collapsedCartTitle: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },

    collapsedCartSubtitle: {
      color: '#888888',
      fontSize: 10,
      marginTop: 2,
    },

    collapsedCartRight: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginTop: 8,
    },

    collapsedCartTotal: {
      color: '#FFBF00',
      fontSize: 16,
      fontWeight: '900',
    },

    collapsedCartArrow: {
      color: '#FFFFFF',
      fontSize: 24,
      fontWeight: '900',
    },

    /*
     * DELIVERY
     */
    deliveryContainer: {
      flexShrink: 0,
      marginHorizontal: 12,
      marginTop: 10,
      marginBottom: 8,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#444444',
      backgroundColor: '#202020',
    },

    deliveryContainerActive: {
      borderColor: '#FFBF00',
      backgroundColor: '#302800',
    },

    deliveryToggle: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    deliveryToggleDisabled: {
      opacity: 0.45,
    },

    deliveryCheckbox: {
      width: 24,
      height: 24,
      marginRight: 10,
      borderRadius: 5,
      borderWidth: 2,
      borderColor: '#777777',
      backgroundColor:
        'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },

    deliveryCheckboxActive: {
      borderColor: '#FFBF00',
      backgroundColor: '#FFBF00',
    },

    deliveryCheck: {
      color: '#171717',
      fontSize: 16,
      fontWeight: '900',
    },

    deliveryTextContainer: {
      flex: 1,
    },

    deliveryTitle: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },

    deliverySubtitle: {
      color: '#AAAAAA',
      fontSize: 11,
      marginTop: 2,
    },

    deliveryDetails: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: '#5A4A00',
    },

    deliveryCustomer: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },

    deliveryDetailText: {
      color: '#DDDDDD',
      fontSize: 12,
      marginTop: 5,
    },

    deliveryReferences: {
      color: '#BBBBBB',
      fontSize: 11,
      marginTop: 5,
      fontStyle: 'italic',
    },

    deliveryActions: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap: 10,
    },

    editDeliveryButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: '#FFBF00',
      backgroundColor: '#292300',
    },

    editDeliveryText: {
      color: '#FFBF00',
      fontSize: 12,
      fontWeight: '700',
    },

    deliveryPrice: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
    },

    /*
     * PRODUCTOS
     */
    cartScroll: {
      flex: 1,
      minHeight: 0,
      paddingHorizontal: 12,
    },

    cartScrollContent: {
      paddingTop: 12,
      paddingBottom: 12,
    },

    cartItemCard: {
      backgroundColor: '#222',
      borderRadius: 10,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: '#2D2D2D',
    },

    cartItemMain: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
    },

    cartItemContent: {
      flex: 1,
      paddingRight: 8,
    },

    cartItemName: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: 'bold',
    },

    cartItemNotes: {
      color: '#A0A0A0',
      fontSize: 12,
      marginTop: 4,
      fontStyle: 'italic',
    },

    cartItemPrice: {
      color: '#FFBF00',
      fontSize: 14,
      fontWeight: '600',
      marginTop: 5,
    },

    cartItemControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    modifiersContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      marginTop: 5,
      marginBottom: 4,
    },

    modifierBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      borderWidth: 1,
      backgroundColor: '#1E1E1E',
    },

    modifierText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },

    comboContainer: {
      marginTop: 7,
      paddingLeft: 8,
      borderLeftWidth: 2,
      borderLeftColor: '#555555',
    },

    comboComponent: {
      marginBottom: 7,
    },

    comboProductName: {
      color: '#DDDDDD',
      fontSize: 12,
      fontWeight: '600',
    },

    comboModifiers: {
      paddingLeft: 12,
      marginTop: 2,
    },

    comboModifierText: {
      color: '#FFBF00',
      fontSize: 11,
      marginTop: 1,
    },

    comboNotes: {
      color: '#FFB3B3',
      fontSize: 11,
      marginTop: 2,
      paddingLeft: 12,
    },

    qtyContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#1E1E1E',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#333',
      padding: 2,
    },

    qtyBtn: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },

    qtyBtnText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: 'bold',
    },

    qtyVal: {
      color: '#FFF',
      paddingHorizontal: 8,
      fontWeight: 'bold',
      fontSize: 14,
    },

    deleteItemBtn: {
      backgroundColor: '#2C1414',
      width: 34,
      height: 34,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#522222',
    },

    deleteItemIcon: {
      fontSize: 14,
    },

    /*
     * Dejamos estos por compatibilidad,
     * aunque el carrito vacío ya no
     * se renderiza.
     */
    emptyCartContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },

    emptyCartIcon: {
      fontSize: 40,
      marginBottom: 10,
    },

    emptyCartText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: 'bold',
    },

    emptyCartSubtext: {
      color: '#666',
      fontSize: 12,
      textAlign: 'center',
      marginTop: 6,
    },

    /*
     * FOOTER
     */
    cartFooter: {
      flexShrink: 0,
      padding: 20,
      backgroundColor: '#1C1C1C',
      borderTopWidth: 1,
      borderTopColor: '#282828',
    },

    totalRow: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },

    totalLabel: {
      color: '#888',
      fontSize: 16,
    },

    totalVal: {
      color: '#FFBF00',
      fontSize: 24,
      fontWeight: 'bold',
    },

    checkoutBtn: {
      backgroundColor: '#FFBF00',
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },

    checkoutBtnDisabled: {
      backgroundColor: '#333',
    },

    checkoutBtnText: {
      color: '#000',
      fontWeight: 'bold',
      fontSize: 16,
    },

    cartSectionMobile: {
      flex: 1,
      minHeight: 0,
      width: '100%',
      backgroundColor: '#181818',
      overflow: 'hidden',
    },

    cartHeaderMobile: {
      paddingHorizontal: 16,
      paddingVertical: 14,
    },

    cartItemMainMobile: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },

    cartItemControlsMobile: {
      marginTop: 10,
      justifyContent: 'flex-end',
    },
  });