import {
  StyleSheet,
} from 'react-native';

export const styles =
  StyleSheet.create({
    rootScroll: {
      flex: 1,
      width: '100%',
      minWidth: 0,
      minHeight: 0,
    },

    container: {
      width: '100%',
      maxWidth: 1400,
      alignSelf: 'center',
      flexGrow: 1,
      gap: 16,
      paddingBottom: 32,
    },

    containerTablet: {
      maxWidth: '100%',
    },

    containerPhone: {
      maxWidth: '100%',
      gap: 12,
      paddingBottom: 48,
    },

    hero: {
      borderWidth: 1,
      borderRadius: 18,
      padding: 18,
    },

    heroTop: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      gap: 14,
    },

    heroTopPhone: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },

    fullWidthButton: {
      width: '100%',
      alignSelf: 'stretch',
    },

    title: {
      fontSize: 22,
      fontWeight: '900',
    },

    subtitle: {
      fontSize: 13,
      lineHeight: 20,
      marginTop: 6,
      maxWidth: 760,
    },

    newConversationButton: {
      minHeight: 40,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },

    newConversationButtonText: {
      fontSize: 12,
      fontWeight: '900',
    },

    settingsLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 14,
    },

    settingsText: {
      fontSize: 12,
      fontWeight: '700',
    },

    badgesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 14,
    },

    badge: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },

    badgeText: {
      fontSize: 10,
      fontWeight: '900',
    },

    assistantAppearance: {
      marginTop: 14,
      borderWidth: 1,
      borderRadius: 14,
      padding: 12,
      gap: 12,
    },

    assistantAppearanceIdentity: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },

    assistantAppearanceIdentityPhone: {
      alignItems: 'flex-start',
    },

    assistantAppearanceAvatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
    },

    assistantAppearanceAvatarFallback: {
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    assistantAppearanceAvatarText: {
      fontSize: 14,
      fontWeight: '900',
    },

    assistantAppearanceTitle: {
      fontSize: 13,
      fontWeight: '900',
    },

    assistantAppearanceText: {
      fontSize: 11,
      lineHeight: 16,
      marginTop: 3,
    },

    assistantAppearanceActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    assistantAppearanceButton: {
      minHeight: 36,
      borderWidth: 1,
      borderRadius: 9,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },

    assistantAppearanceButtonText: {
      fontSize: 11,
      fontWeight: '900',
    },

    safetyNotice: {
      marginTop: 14,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
    },

    safetyNoticeTitle: {
      fontSize: 12,
      fontWeight: '900',
    },

    safetyNoticeText: {
      fontSize: 12,
      lineHeight: 18,
      marginTop: 4,
    },

    mainGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      alignItems: 'stretch',
    },

    mainGridStacked: {
      flexDirection: 'column',
      flexWrap: 'nowrap',
      alignItems: 'stretch',
    },

    cardStacked: {
      width: '100%',
      flexGrow: 0,
      flexBasis: 'auto',
    },

    cardPhone: {
      minHeight: 500,
      borderRadius: 14,
    },

    chatCard: {
      flexGrow: 2,
      flexBasis: 560,
      minWidth: 0,
      minHeight: 560,
      borderWidth: 1,
      borderRadius: 18,
      overflow: 'hidden',
    },

    draftCard: {
      flexGrow: 1,
      flexBasis: 320,
      minWidth: 0,
      minHeight: 560,
      borderWidth: 1,
      borderRadius: 18,
      overflow: 'hidden',
    },

    cardHeader: {
      minHeight: 68,
      borderBottomWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 13,
      justifyContent: 'center',
    },

    cardTitle: {
      fontSize: 15,
      fontWeight: '900',
    },

    cardMeta: {
      fontSize: 10,
      marginTop: 4,
    },

    chatScroll: {
      flex: 1,
    },

    chatContent: {
      padding: 16,
      gap: 10,
      flexGrow: 1,
    },

    emptyChat: {
      flex: 1,
      minHeight: 220,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },

    emptyChatTitle: {
      fontSize: 15,
      fontWeight: '900',
    },

    emptyChatExample: {
      fontSize: 13,
      marginTop: 8,
      textAlign: 'center',
    },

    messageRow: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
    },

    userMessageRow: {
      justifyContent: 'flex-end',
    },

    assistantMessageRow: {
      justifyContent: 'flex-start',
    },

    messageAvatar: {
      width: 30,
      height: 30,
      borderRadius: 15,
      flexShrink: 0,
    },

    messageAvatarFallback: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },

    messageAvatarText: {
      fontSize: 11,
      fontWeight: '900',
    },

    messageBubble: {
      maxWidth: '82%',
      borderWidth: 1,
      borderRadius: 14,
      padding: 12,
    },

    messageBubblePhone: {
      maxWidth: '92%',
    },

    userBubble: {
      alignSelf: 'flex-end',
      borderBottomRightRadius: 4,
    },

    assistantBubble: {
      alignSelf: 'flex-start',
      borderBottomLeftRadius: 4,
    },

    messageRole: {
      fontSize: 9,
      fontWeight: '900',
      marginBottom: 5,
    },

    messageText: {
      fontSize: 13,
      lineHeight: 19,
    },

    thinkingText: {
      fontSize: 11,
      marginTop: 8,
    },

    toolHint: {
      fontSize: 10,
      paddingHorizontal: 16,
      paddingVertical: 7,
    },

    errorBox: {
      marginHorizontal: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderRadius: 10,
      padding: 10,
    },

    errorText: {
      fontSize: 11,
      lineHeight: 17,
    },

    composer: {
      borderTopWidth: 1,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
    },

    composerPhone: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },

    input: {
      flex: 1,
      minHeight: 46,
      maxHeight: 130,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
    },

    sendButton: {
      minWidth: 86,
      minHeight: 46,
      borderRadius: 12,
      paddingHorizontal: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },

    sendButtonPhone: {
      width: '100%',
      minWidth: 0,
    },

    sendButtonText: {
      fontSize: 12,
      fontWeight: '900',
    },

    draftScroll: {
      flex: 1,
    },

    draftContent: {
      padding: 16,
      gap: 12,
    },

    emptyDraft: {
      fontSize: 12,
      lineHeight: 19,
    },

    summaryBox: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
    },

    summaryLabel: {
      fontSize: 9,
      fontWeight: '900',
      textTransform: 'uppercase',
      marginTop: 8,
    },

    summaryValue: {
      fontSize: 13,
      fontWeight: '800',
      marginTop: 2,
    },

    draftItem: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
    },

    draftItemTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },

    draftItemName: {
      flex: 1,
      fontSize: 13,
      fontWeight: '900',
    },

    draftItemPrice: {
      fontSize: 13,
      fontWeight: '900',
    },

    draftItemMeta: {
      fontSize: 11,
      lineHeight: 17,
      marginTop: 6,
    },

    comboComponentsBox: {
      marginTop: 9,
      gap: 7,
    },

    comboComponentRow: {
      paddingLeft: 8,
      borderLeftWidth: 2,
      borderLeftColor: '#555555',
    },

    comboComponentLabel: {
      fontSize: 10,
      lineHeight: 15,
      fontWeight: '800',
    },

    comboComponentMeta: {
      fontSize: 10,
      lineHeight: 15,
      marginTop: 2,
    },

    totalRow: {
      marginTop: 6,
      borderTopWidth: 1,
      paddingTop: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },

    totalLabel: {
      fontSize: 14,
      fontWeight: '900',
    },

    totalValue: {
      fontSize: 20,
      fontWeight: '900',
    },
  });
