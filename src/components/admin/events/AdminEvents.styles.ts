import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    paddingBottom: 36,
  },

  contentPhone: {
    paddingBottom: 24,
  },

  header: {
    marginBottom: 18,
  },

  title: {
    fontSize: 26,
    fontWeight: '900',
  },

  titlePhone: {
    fontSize: 22,
  },

  subtitle: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
  },

  tabs: {
    gap: 8,
    paddingBottom: 16,
  },

  tabButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabButtonText: {
    fontSize: 11,
    fontWeight: '900',
  },

  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },

  cardPhone: {
    padding: 14,
    borderRadius: 14,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: '900',
  },

  cardSubtitle: {
    marginTop: 4,
    marginBottom: 16,
    fontSize: 12,
    lineHeight: 18,
  },

  switchRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },

  switchText: {
    flex: 1,
    minWidth: 0,
  },

  field: {
    marginBottom: 14,
  },

  label: {
    marginBottom: 7,
    fontSize: 12,
    fontWeight: '800',
  },

  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 13,
    fontSize: 14,
  },

  multiline: {
    minHeight: 96,
    paddingTop: 12,
    textAlignVertical: 'top',
  },

  twoColumns: {
    flexDirection: 'row',
    gap: 12,
  },

  column: {
    flex: 1,
    minWidth: 0,
  },

  twoColumnsPhone: {
    flexDirection: 'column',
    gap: 0,
  },

  saveButton: {
    width: '100%',
    minHeight: 48,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },

  saveButtonDisabled: {
    opacity: 0.55,
  },

  saveButtonText: {
    fontSize: 13,
    fontWeight: '900',
  },

  loadingContainer: {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },

  catalogHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 14,
  },

  catalogHeaderPhone: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },

  catalogHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  catalogSubtitle: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
  },

  primaryButton: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButtonPhone: {
    width: '100%',
  },

  primaryButtonText: {
    fontSize: 12,
    fontWeight: '900',
  },

  catalogCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'visible',
  },

  catalogCardDragging: {
    opacity: 0.92,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 7,
  },

  dragHandleButton: {
    width: 50,
    minHeight: 92,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },

  dragHandle: {
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 30,
  },

  catalogCardContent: {
    flex: 1,
    minWidth: 0,
    padding: 14,
    paddingLeft: 8,
  },

  catalogBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  catalogBodyPhone: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
  },

  catalogInfo: {
    flex: 1,
    minWidth: 0,
  },

  catalogTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },

  catalogTitle: {
    fontSize: 15,
    fontWeight: '900',
    flexShrink: 1,
  },

  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  statusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },

  catalogDescription: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 17,
  },

  catalogMeta: {
    marginTop: 7,
    fontSize: 11,
    fontWeight: '700',
  },

  catalogActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },

  catalogActionsPhone: {
    width: '100%',
    justifyContent: 'space-between',
  },

  secondaryButton: {
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    fontSize: 11,
    fontWeight: '900',
  },

  emptyState: {
    minHeight: 110,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },

  emptyStateText: {
    fontSize: 13,
    textAlign: 'center',
  },

  choiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },

  choice: {
    minHeight: 38,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  choiceText: {
    fontSize: 11,
    fontWeight: '900',
  },

  activeSwitchRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    marginTop: 2,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCard: {
    width: '100%',
    maxWidth: 680,
    maxHeight: '90%',
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },

  modalCardPhone: {
    maxHeight: '94%',
    borderRadius: 14,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 15,
  },

  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
  },

  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeButtonText: {
    fontSize: 16,
    fontWeight: '900',
  },

  modalScroll: {
    flexGrow: 0,
  },

  modalContent: {
    paddingHorizontal: 18,
    paddingBottom: 8,
  },

  modalFooter: {
    borderTopWidth: 1,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },

  modalCancelButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCancelText: {
    fontSize: 12,
    fontWeight: '800',
  },

  modalSaveButton: {
    minHeight: 44,
    minWidth: 120,
    paddingHorizontal: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalSaveText: {
    fontSize: 12,
    fontWeight: '900',
  },
  helperText: {
    marginTop: -2,
    marginBottom: 10,
    fontSize: 11,
    lineHeight: 16,
  },

  inlineEmpty: {
    borderWidth: 1,
    borderRadius: 9,
    padding: 12,
    marginBottom: 14,
  },

  inlineEmptyText: {
    fontSize: 12,
    lineHeight: 17,
  },

  extraSelectionList: {
    gap: 8,
    marginBottom: 14,
  },

  extraSelectionItem: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },

  extraSelectionItemDisabled: {
    opacity: 0.55,
  },

  extraSelectionInfo: {
    flex: 1,
    minWidth: 0,
  },

  extraSelectionName: {
    fontSize: 12,
    fontWeight: '900',
  },

  extraSelectionMeta: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: '700',
  },

  quantityInput: {
    minHeight: 36,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: '800',
  },

});
