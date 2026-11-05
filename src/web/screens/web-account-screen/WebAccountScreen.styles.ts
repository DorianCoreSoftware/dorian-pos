import {
  StyleSheet,
} from 'react-native';

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
    },

    header: {
      minHeight: 70,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
    },

    backButton: {
      minHeight: 42,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },

    backButtonText: {
      fontSize: 14,
      fontWeight: '800',
    },

    headerCopy: {
      flex: 1,
    },

    headerTitle: {
      fontSize: 24,
      fontWeight: '900',
    },

    headerSubtitle: {
      fontSize: 13,
      marginTop: 2,
    },

    scroll: {
      flex: 1,
    },

    content: {
      width: '100%',
      maxWidth: 820,
      alignSelf: 'center',
      padding: 20,
      paddingBottom: 48,
    },

    card: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 20,
      marginBottom: 18,
    },

    cardTitle: {
      fontSize: 22,
      fontWeight: '900',
    },

    cardSubtitle: {
      fontSize: 14,
      marginTop: 6,
      lineHeight: 20,
    },

    modeRow: {
      flexDirection: 'row',
      marginTop: 18,
      marginBottom: 14,
    },

    modeButton: {
      flex: 1,
      minHeight: 42,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 4,
    },

    modeButtonText: {
      fontSize: 13,
      fontWeight: '900',
    },

    label: {
      fontSize: 13,
      fontWeight: '800',
      marginTop: 12,
      marginBottom: 6,
    },

    input: {
      minHeight: 46,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 13,
      fontSize: 15,
    },

    primaryButton: {
      minHeight: 48,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
      paddingHorizontal: 18,
    },

    primaryButtonText: {
      fontSize: 14,
      fontWeight: '900',
    },

    secondaryButton: {
      minHeight: 44,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
      paddingHorizontal: 16,
    },

    secondaryButtonText: {
      fontSize: 13,
      fontWeight: '900',
    },

    error: {
      marginTop: 14,
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 19,
    },

    profileCard: {
      overflow: 'hidden',
    },

    profileHero: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },

    avatarWrap: {
      width: 94,
      height: 94,
      borderRadius: 47,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },

    avatarImage: {
      width: '100%',
      height: '100%',
    },

    avatarInitial: {
      fontSize: 38,
      fontWeight: '900',
    },

    avatarLoading: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.55)',
    },

    profileHeroCopy: {
      flex: 1,
    },

    profileName: {
      fontSize: 24,
      fontWeight: '900',
    },

    profileLine: {
      fontSize: 14,
      marginTop: 6,
    },

    profileSince: {
      fontSize: 11,
      marginTop: 8,
      fontWeight: '700',
    },

    avatarActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 14,
    },

    smallActionButton: {
      minHeight: 36,
      paddingHorizontal: 12,
      borderRadius: 9,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    smallActionText: {
      fontSize: 12,
      fontWeight: '900',
    },

    statsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 18,
    },

    statCard: {
      flex: 1,
      minHeight: 78,
      borderWidth: 1,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },

    statValue: {
      fontSize: 20,
      fontWeight: '900',
    },

    statLabel: {
      fontSize: 10,
      fontWeight: '800',
      marginTop: 4,
      textAlign: 'center',
      textTransform: 'uppercase',
    },

    editProfileBox: {
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
      marginTop: 18,
    },

    editActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },

    editActionButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
    },

    editActionButtonText: {
      fontSize: 12,
      fontWeight: '900',
      textAlign: 'center',
    },

    successMessage: {
      fontSize: 12,
      lineHeight: 18,
      marginTop: 12,
      fontWeight: '800',
    },

    addressHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },

    addressMain: {
      fontSize: 15,
      fontWeight: '900',
      marginTop: 14,
    },

    addressLine: {
      fontSize: 13,
      lineHeight: 19,
      marginTop: 5,
    },

    sectionTitle: {
      fontSize: 20,
      fontWeight: '900',
      marginBottom: 12,
    },

    emptyText: {
      fontSize: 14,
      lineHeight: 20,
    },

    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
      marginBottom: 12,
    },

    sectionSubtitle: {
      fontSize: 13,
      lineHeight: 19,
      marginTop: -6,
    },

    codeCountBadge: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },

    codeCountText: {
      fontSize: 11,
      fontWeight: '800',
    },

    promoCodeCard: {
      borderWidth: 1,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
    },

    promoCodeTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },

    promoProgramName: {
      fontSize: 15,
      fontWeight: '900',
    },

    promoOrderMeta: {
      fontSize: 12,
      marginTop: 4,
    },

    promoStatus: {
      fontSize: 12,
      fontWeight: '900',
      textTransform: 'uppercase',
    },

    promoCodeBox: {
      borderWidth: 1,
      borderRadius: 11,
      paddingHorizontal: 14,
      paddingVertical: 13,
      marginTop: 14,
      alignItems: 'center',
    },

    promoCodeText: {
      fontSize: 21,
      fontWeight: '900',
      letterSpacing: 1.2,
      textAlign: 'center',
    },

    promoHint: {
      fontSize: 11,
      lineHeight: 16,
      textAlign: 'center',
      marginTop: 7,
    },

    promoHistoryMeta: {
      fontSize: 11,
      marginTop: 8,
    },

    ordersSectionTitle: {
      marginTop: 16,
    },

    orderCard: {
      borderWidth: 1,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
    },

    orderTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    orderCode: {
      flex: 1,
      fontSize: 16,
      fontWeight: '900',
    },

    orderStatus: {
      fontSize: 12,
      fontWeight: '900',
    },

    orderMeta: {
      fontSize: 13,
      marginTop: 5,
    },

    orderItem: {
      fontSize: 13,
      marginTop: 5,
    },

    orderTotal: {
      fontSize: 15,
      fontWeight: '900',
      marginTop: 10,
    },

    loadingWrap: {
      minHeight: 220,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default styles;
