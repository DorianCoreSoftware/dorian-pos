import {
  DEFAULT_BRAND_PRIMARY,
  withAlpha,
} from '../../theme/brandStyles';

import { StyleSheet } from 'react-native';

const createStyles = (
  primaryColor: string,
) =>
  StyleSheet.create({
  container: {
    flex: 1,
  },

  viewToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 12,
  },

  viewToolbarLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  viewButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 6,
  },

  viewButton: {
    minHeight: 36,
    paddingHorizontal: 9,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#1E1E1E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  viewButtonSelected: {
    backgroundColor: withAlpha(primaryColor, 0.10),
    borderColor: primaryColor,
  },

  viewButtonIcon: {
    color: '#A0A0A0',
    fontSize: 16,
    fontWeight: 'bold',
  },

  viewButtonIconSelected: {
    color: primaryColor,
  },

  viewButtonText: {
    color: '#A0A0A0',
    fontSize: 11,
    fontWeight: '600',
  },

  viewButtonTextSelected: {
    color: primaryColor,
  },

  menuList: {
    padding: 16,
    paddingBottom: 40,
  },

  gridRow: {
    justifyContent: 'flex-start',
    marginBottom: 16,
  },

  productCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },

  productCardLarge: {
    width: '48%',
    padding: 14,
    minHeight: 150,
    marginRight: '4%',
  },

  productCardMedium: {
    width: '31.5%',
    padding: 11,
    minHeight: 135,
    marginRight: '2.75%',
  },

  productCardCompact: {
    width: '23.5%',
    padding: 9,
    minHeight: 120,
    marginRight: '2%',
  },

  productCardList: {
    width: '100%',
    minHeight: 105,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  productImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: '#2A2A2A',
  },

  productImageMedium: {
    borderRadius: 10,
    marginBottom: 10,
  },

  productImageCompact: {
    borderRadius: 9,
    marginBottom: 8,
  },

  productImageList: {
    width: 118,
    height: 82,
    aspectRatio: undefined,
    borderRadius: 10,
    marginBottom: 0,
    marginRight: 14,
    flexShrink: 0,
  },

  productImagePlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  productImagePlaceholderText: {
    fontSize: 42,
  },

  productImagePlaceholderTextCompact: {
    fontSize: 28,
  },

  productImagePlaceholderTextList: {
    fontSize: 34,
  },

  cardInfo: {
    marginBottom: 12,
  },

  cardInfoList: {
    flex: 1,
    alignSelf: 'stretch',
    marginBottom: 0,
    justifyContent: 'center',
    minWidth: 0,
  },

  productName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },

  productNameMedium: {
    fontSize: 15,
  },

  productNameCompact: {
    fontSize: 13,
    lineHeight: 16,
    marginBottom: 5,
  },

  productDescription: {
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
  },

  cardPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },

  listPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },

  priceContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },

  productPrice: {
    color: primaryColor,
    fontSize: 20,
    fontWeight: 'bold',
  },

  productPriceCompact: {
    fontSize: 15,
  },

  editPriceBadge: {
    backgroundColor: withAlpha(primaryColor, 0.13),
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: withAlpha(primaryColor, 0.53),
    marginTop: 4,
  },

  editPriceText: {
    color: primaryColor,
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

  addButtonCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },

  addButtonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: -2,
  },

  addButtonTextCompact: {
    fontSize: 17,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    width: 340,
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
    color: '#FFF',
    fontSize: 15,
    paddingHorizontal: 12,
  },

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
    marginHorizontal: 4,
  },

  cancelButton: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#444',
  },

  deleteButton: {
    backgroundColor: '#D9534F22',
    borderWidth: 1,
    borderColor: '#D9534F88',
  },

  saveButton: {
    backgroundColor: primaryColor,
  },

  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },

  productDescriptionMedium: {
    fontSize: 11,
    lineHeight: 15,
  },

  productDescriptionCompact: {
    fontSize: 10,
    lineHeight: 13,
  },
});

export let styles =
  createStyles(
    DEFAULT_BRAND_PRIMARY,
  );

export function setBrandPrimaryColor(
  primaryColor: string,
): void {
  styles =
    createStyles(
      primaryColor,
    );
}
