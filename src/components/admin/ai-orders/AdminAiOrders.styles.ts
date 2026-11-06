import {
  StyleSheet,
} from 'react-native';

export const styles =
  StyleSheet.create({
    container: {
      width: '100%',
      gap: 16,
      paddingBottom: 24,
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

    messageBubble: {
      maxWidth: '88%',
      borderWidth: 1,
      borderRadius: 14,
      padding: 12,
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
