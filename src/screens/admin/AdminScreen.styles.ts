import {
  StyleSheet,
} from 'react-native';

export const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 14,
    },

    containerPhone: {
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 8,
    },

    header: {
      marginBottom: 18,
    },

    headerPhone: {
      marginBottom: 10,
    },

    title: {
      fontSize: 26,
      fontWeight: '900',
    },

    titlePhone: {
      fontSize: 22,
    },

    subtitle: {
      fontSize: 13,
      marginTop: 4,
    },

    subtitlePhone: {
      fontSize: 11,
      lineHeight: 16,
    },

    tabsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 18,
    },

    sectionTab: {
      minHeight: 42,
      paddingHorizontal: 18,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },

    sectionTabText: {
      fontSize: 12,
      fontWeight: '800',
    },

    mobileSectionSelector: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      marginBottom: 10,
      borderRadius: 12,
      borderWidth: 1,
    },

    mobileSectionSelectorLeft: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
    },

    mobileSectionIcon: {
      width: 34,
      fontSize: 21,
      textAlign: 'center',
      marginRight: 10,
    },

    mobileSectionTextContainer: {
      flex: 1,
      minWidth: 0,
    },

    mobileSectionLabel: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.8,
    },

    mobileSectionValue: {
      fontSize: 14,
      fontWeight: '900',
      marginTop: 2,
    },

    mobileSectionChevron: {
      fontSize: 12,
      marginLeft: 12,
    },

    content: {
      flex: 1,
      minHeight: 0,
    },

    modalBackdrop: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
      backgroundColor:
        'rgba(0, 0, 0, 0.72)',
    },

    modalDismissArea: {
      ...StyleSheet.absoluteFillObject,
    },

    mobileMenuCard: {
      width: '100%',
      maxWidth: 520,
      maxHeight: '82%',
      alignSelf: 'center',
      borderRadius: 22,
      borderWidth: 1,
      overflow: 'hidden',
    },

    mobileMenuHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 16,
      borderBottomWidth: 1,
    },

    mobileMenuHeaderText: {
      flex: 1,
      minWidth: 0,
      paddingRight: 12,
    },

    mobileMenuTitle: {
      fontSize: 18,
      fontWeight: '900',
    },

    mobileMenuSubtitle: {
      fontSize: 11,
      marginTop: 3,
    },

    mobileMenuClose: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },

    mobileMenuCloseText: {
      fontSize: 15,
      fontWeight: '900',
    },

    mobileMenuList: {
      flexGrow: 0,
      flexShrink: 1,
    },

    mobileMenuListContent: {
      padding: 12,
      paddingBottom: 42,
    },

    mobileMenuOption: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      marginBottom: 8,
      borderRadius: 10,
      borderWidth: 1,
    },

    mobileMenuOptionIcon: {
      width: 32,
      fontSize: 19,
      textAlign: 'center',
      marginRight: 10,
    },

    mobileMenuOptionText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '800',
    },

    mobileMenuCheck: {
      fontSize: 16,
      fontWeight: '900',
      marginLeft: 10,
    },
  });
