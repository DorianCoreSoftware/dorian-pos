import {
  StyleSheet,
} from 'react-native';

export const styles =
  StyleSheet.create({
    scroll: {
      flex: 1,
      width: '100%',
      minWidth: 0,
      minHeight: 0,
    },

    scrollContent: {
      width: '100%',
      minWidth: 0,
      flexGrow: 1,
      alignItems: 'stretch',
      paddingBottom: 28,
    },

    scrollContentPhone: {
      paddingBottom: 48,
    },

    container: {
      width: '100%',
      maxWidth: 1200,
      alignSelf: 'center',
      gap: 16,
    },

    containerTablet: {
      maxWidth: 900,
    },

    containerPhone: {
      maxWidth: '100%',
      gap: 12,
    },

    header: {
      gap: 6,
    },

    title: {
      fontSize: 22,
      fontWeight: '800',
    },

    titlePhone: {
      fontSize: 20,
    },

    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      maxWidth: 680,
    },

    subtitlePhone: {
      fontSize: 13,
      lineHeight: 18,
    },

    modeTabs: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    modeTab: {
      minHeight: 38,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    modeTabText: {
      fontSize: 12,
      fontWeight: '900',
    },

    actionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      alignItems: 'center',
    },

    actionsRowPhone: {
      alignItems: 'stretch',
    },

    refreshButton: {
      minHeight: 40,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    refreshButtonPhone: {
      width: '100%',
      minHeight: 46,
    },

    refreshText: {
      fontWeight: '700',
    },

    counter: {
      fontWeight: '700',
      opacity: 0.85,
    },

    emptyCard: {
      width: '100%',
      borderWidth: 1,
      borderRadius: 14,
      padding: 18,
      gap: 6,
    },

    emptyTitle: {
      fontWeight: '800',
      fontSize: 16,
    },

    emptyText: {
      lineHeight: 19,
    },

    list: {
      width: '100%',
      gap: 12,
    },

    card: {
      width: '100%',
      minWidth: 0,
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
      gap: 10,
    },

    cardTop: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      alignItems: 'flex-start',
    },

    cardTopPhone: {
      flexDirection: 'column',
      gap: 8,
    },

    customerBlock: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },

    customerName: {
      fontWeight: '800',
      fontSize: 16,
      flexShrink: 1,
    },

    meta: {
      fontSize: 12,
      lineHeight: 17,
      flexShrink: 1,
    },

    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
    },

    badgeText: {
      fontSize: 11,
      fontWeight: '800',
    },

    waitingChip: {
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },

    waitingChipNew: {
      opacity: 0.85,
    },

    waitingChipWaiting: {
      opacity: 0.95,
    },

    waitingChipUrgent: {
      borderWidth: 2,
    },

    waitingChipText: {
      fontSize: 11,
      fontWeight: '900',
    },

    reason: {
      fontWeight: '700',
      lineHeight: 19,
      flexShrink: 1,
    },

    messagePreview: {
      lineHeight: 19,
      flexShrink: 1,
    },

    orderRow: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      alignItems: 'center',
    },

    infoChip: {
      maxWidth: '100%',
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
    },

    orderText: {
      fontSize: 12,
      fontWeight: '700',
      flexShrink: 1,
    },

    detailButton: {
      alignSelf: 'flex-start',
      minHeight: 40,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 9,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    detailButtonPhone: {
      width: '100%',
      minHeight: 46,
    },

    detailButtonText: {
      fontWeight: '700',
      textAlign: 'center',
    },

    detailPanel: {
      width: '100%',
      minWidth: 0,
      borderTopWidth: 1,
      paddingTop: 12,
      gap: 12,
    },

    detailHeading: {
      fontWeight: '800',
      fontSize: 14,
    },

    messages: {
      width: '100%',
      gap: 8,
    },

    messageBubble: {
      maxWidth: '100%',
      minWidth: 0,
      borderWidth: 1,
      borderRadius: 10,
      padding: 10,
      gap: 4,
    },

    messageBubbleUser: {
      alignSelf: 'stretch',
    },

    messageBubbleAssistant: {
      alignSelf: 'stretch',
    },

    messageRole: {
      fontSize: 11,
      fontWeight: '800',
      flexShrink: 1,
    },

    messageText: {
      lineHeight: 19,
      flexShrink: 1,
    },


    handoffPanel: {
      width: '100%',
      minWidth: 0,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      gap: 10,
    },

    handoffHelp: {
      fontSize: 13,
      lineHeight: 19,
    },

    assignmentText: {
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '800',
    },

    claimButton: {
      alignSelf: 'flex-start',
      minHeight: 42,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },

    claimButtonText: {
      fontWeight: '900',
      textAlign: 'center',
    },

    replyInput: {
      width: '100%',
      minHeight: 92,
      maxHeight: 180,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      textAlignVertical: 'top',
      fontSize: 14,
      lineHeight: 20,
    },

    sendHumanButton: {
      alignSelf: 'flex-start',
      minHeight: 42,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },

    sendHumanButtonText: {
      fontWeight: '900',
      textAlign: 'center',
    },

    fullWidthAction: {
      width: '100%',
      alignSelf: 'stretch',
    },


    resolutionActions: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      alignItems: 'center',
    },

    resolutionActionsPhone: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },

    returnToAiButton: {
      minHeight: 42,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    returnToAiButtonText: {
      fontWeight: '900',
      textAlign: 'center',
    },

    resolveButton: {
      minHeight: 42,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    resolveButtonText: {
      fontWeight: '800',
      textAlign: 'center',
    },

    draftCard: {
      width: '100%',
      minWidth: 0,
      borderWidth: 1,
      borderRadius: 10,
      padding: 10,
      gap: 5,
    },

    errorCard: {
      width: '100%',
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
    },

    errorText: {
      fontWeight: '700',
      lineHeight: 19,
    },

    loadingText: {
      lineHeight: 19,
    },
  });
