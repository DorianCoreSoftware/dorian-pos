import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  cartSection: {
    flex: 0.3,
    backgroundColor: '#181818',
    justifyContent: 'space-between',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  cartHeaderTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  clearCartText: {
    color: '#FF5252',
    fontSize: 14,
    fontWeight: '600',
  },
  cartScroll: {
    flex: 1,
    padding: 12,
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartItemName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cartItemNotes: {
    color: '#A0A0A0',
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
  },
  cartItemPrice: {
    color: '#FFBF00',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
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
  cartFooter: {
    padding: 20,
    backgroundColor: '#1C1C1C',
    borderTopWidth: 1,
    borderTopColor: '#282828',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
});