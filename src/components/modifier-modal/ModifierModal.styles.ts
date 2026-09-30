import {
  DEFAULT_BRAND_PRIMARY,
  withAlpha,
} from '../../theme/brandStyles';

import {
  StyleSheet,
} from 'react-native';

const createStyles = (
  primaryColor: string,
) =>
  StyleSheet.create({
    /*
     * ============================
     * MODAL
     * ============================
     */

    modalBackdrop: {
      flex: 1,

      backgroundColor:
        'rgba(0, 0, 0, 0.75)',

      justifyContent:
        'center',

      alignItems:
        'center',

      padding:
        20,
    },

    modalBackdropPhone: {
      padding:
        10,
    },

    modalContent: {
      width:
        '45%',

      maxWidth:
        720,

      maxHeight:
        '88%',

      backgroundColor:
        '#1E1E1E',

      borderRadius:
        16,

      padding:
        24,

      borderWidth:
        1,

      borderColor:
        '#333',
    },

    modalContentPhone: {
      width:
        '96%',

      maxWidth:
        560,

      maxHeight:
        '94%',

      padding:
        16,

      borderRadius:
        12,
    },

    modalContentSmallPhone: {
      width:
        '98%',

      padding:
        12,

      borderRadius:
        10,
    },

    modalContentShort: {
      maxHeight:
        '96%',
    },

    modalHeader: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      justifyContent:
        'space-between',
    },

    modalHeaderText: {
      flex:
        1,

      minWidth:
        0,
    },

    modalTitle: {
      color:
        '#FFF',

      fontSize:
        20,

      fontWeight:
        'bold',

      marginBottom:
        8,
    },

    modalTitlePhone: {
      fontSize:
        18,

      lineHeight:
        22,
    },

    modalSubtitle: {
      color:
        '#888',

      fontSize:
        14,

      marginBottom:
        12,

      lineHeight:
        19,
    },

    modalSubtitlePhone: {
      fontSize:
        12,

      lineHeight:
        17,

      marginBottom:
        8,
    },

    /*
     * ============================
     * SCROLL
     * ============================
     */

    modalScroll: {
      flexShrink:
        1,
    },

    modalScrollContent: {
      paddingTop:
        4,

      paddingBottom:
        12,
    },

    /*
     * ============================
     * LOADING / ERROR
     * ============================
     */

    loadingContainer: {
      paddingVertical:
        24,

      alignItems:
        'center',
    },

    loadingText: {
      marginTop:
        10,

      color:
        '#FFFFFF',
    },

    errorText: {
      color:
        '#FF5252',

      textAlign:
        'center',

      marginVertical:
        16,
    },

    /*
     * ============================
     * MODIFICADORES
     * ============================
     */

    requiredSection: {
      marginVertical:
        10,

      width:
        '100%',
    },

    sectionLabel: {
      fontSize:
        14,

      fontWeight:
        'bold',

      color:
        '#FFF',

      marginBottom:
        8,
    },

    optionsContainer: {
      flexDirection:
        'row',

      justifyContent:
        'space-between',

      gap:
        10,
    },

    optionsContainerHorizontal: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      gap:
        8,
    },

    optionsContainerPhone: {
      flexDirection:
        'column',

      flexWrap:
        'nowrap',

      gap:
        8,
    },

    optionButton: {
      flex:
        1,

      paddingVertical:
        12,

      backgroundColor:
        '#121212',

      borderWidth:
        1.5,

      borderColor:
        '#333',

      borderRadius:
        8,

      alignItems:
        'center',
    },

    optionButtonChip: {
      minHeight:
        44,

      paddingHorizontal:
        14,

      paddingVertical:
        10,

      backgroundColor:
        '#121212',

      borderWidth:
        1.5,

      borderColor:
        '#333',

      borderRadius:
        20,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    optionButtonChipTablet: {
      minWidth:
        '45%',

      flexGrow:
        1,
    },

    optionButtonChipPhone: {
      width:
        '100%',

      minWidth:
        0,

      borderRadius:
        10,
    },

    optionButtonSelected: {
      borderColor:
        primaryColor,

      backgroundColor:
        withAlpha(primaryColor, 0.10),
    },

    optionText: {
      fontSize:
        14,

      color:
        '#AAA',

      fontWeight:
        '600',

      textAlign:
        'center',
    },

    optionTextPhone: {
      fontSize:
        13,
    },

    optionTextSelected: {
      color:
        primaryColor,

      fontWeight:
        'bold',
    },

    /*
     * ============================
     * NOTAS
     * ============================
     */

    notesLabel: {
      marginTop:
        16,
    },

    notesInput: {
      backgroundColor:
        '#121212',

      color:
        '#FFF',

      borderWidth:
        1,

      borderColor:
        '#333',

      borderRadius:
        8,

      padding:
        12,

      fontSize:
        14,

      textAlignVertical:
        'top',

      marginBottom:
        8,

      minHeight:
        80,

      maxHeight:
        140,
    },

    notesInputPhone: {
      minHeight:
        72,

      maxHeight:
        110,

      fontSize:
        13,
    },

    /*
     * ============================
     * ACCIONES
     * ============================
     */

    modalActions: {
      flexDirection:
        'row',

      justifyContent:
        'space-between',

      gap:
        12,

      paddingTop:
        12,

      borderTopWidth:
        1,

      borderTopColor:
        '#303030',
    },

    modalActionsPhone: {
      flexDirection:
        'column',

      gap:
        8,
    },

    modalActionButtonPhone: {
      flex:
        0,

      width:
        '100%',
    },

    modalCancelBtn: {
      flex:
        1,

      minHeight:
        48,

      paddingVertical:
        12,

      borderRadius:
        8,

      borderWidth:
        1,

      borderColor:
        '#444',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    modalCancelText: {
      color:
        '#AAA',

      fontWeight:
        '600',

      fontSize:
        15,
    },

    modalAddBtn: {
      flex:
        1,

      minHeight:
        48,

      backgroundColor:
        primaryColor,

      paddingVertical:
        12,

      borderRadius:
        8,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    modalAddText: {
      color:
        '#000',

      fontWeight:
        'bold',

      fontSize:
        15,

      textAlign:
        'center',
    },

    /*
     * ============================
     * DISABLED
     * ============================
     */

    modalAddBtnDisabled: {
      backgroundColor:
        '#333333',
    },

    modalAddTextDisabled: {
      color:
        '#666',
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
