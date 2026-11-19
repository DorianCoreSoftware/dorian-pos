import {
  StyleSheet,
} from 'react-native';

export const styles =
  StyleSheet.create({
    host: {
      position:
        'absolute',
      right: 18,
      bottom: 88,
      zIndex: 9999,
      alignItems:
        'flex-end',
    },

    panel: {
      width: 370,
      maxWidth:
        'calc(100vw - 28px)' as any,
      height: 520,
      maxHeight:
        'calc(100vh - 170px)' as any,
      borderWidth: 1,
      borderRadius: 18,
      overflow:
        'hidden',
      marginBottom: 10,
      shadowColor:
        '#000',
      shadowOpacity: 0.22,
      shadowRadius: 14,
      shadowOffset: {
        width: 0,
        height: 7,
      },
      elevation: 12,
    },

    header: {
      minHeight: 66,
      paddingHorizontal: 14,
      paddingVertical: 10,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
    },

    headerIdentity: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 10,
    },

    headerActions: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 4,
    },

    newChatButton: {
      minHeight: 30,
      paddingHorizontal: 8,
      borderRadius: 10,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        'rgba(255,255,255,0.14)',
    },

    newChatText: {
      fontSize: 9,
      fontWeight:
        '800',
    },

    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        'rgba(255,255,255,0.18)',
    },

    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 20,
    },

    avatarFallbackText: {
      fontSize: 18,
      fontWeight:
        '900',
      color:
        '#FFFFFF',
    },

    title: {
      fontSize: 14,
      fontWeight:
        '900',
      letterSpacing: 0.5,
    },

    subtitle: {
      marginTop: 1,
      fontSize: 9,
      fontWeight:
        '700',
      opacity: 0.86,
    },

    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    closeText: {
      fontSize: 26,
      lineHeight: 28,
      fontWeight:
        '400',
    },

    messages: {
      flex: 1,
    },

    messagesContent: {
      padding: 12,
      paddingBottom: 18,
    },

    messageRow: {
      width: '100%',
      marginBottom: 9,
      flexDirection:
        'row',
      alignItems:
        'flex-end',
      gap: 7,
    },

    messageRowUser: {
      justifyContent:
        'flex-end',
    },

    messageRowAssistant: {
      justifyContent:
        'flex-start',
    },

    messageAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
      overflow:
        'hidden',
      flexShrink: 0,
    },

    messageAvatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 14,
    },

    messageAvatarFallback: {
      fontSize: 11,
      fontWeight:
        '900',
    },

    customerAvatarFallback: {
      fontSize: 15,
      lineHeight: 18,
    },

    bubble: {
      maxWidth: '84%',
      borderRadius: 15,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },

    messageText: {
      fontSize: 12,
      lineHeight: 18,
    },

    typingBubble: {
      minHeight: 38,
      borderWidth: 1,
      borderRadius: 15,
      paddingHorizontal: 12,
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 8,
    },

    typingText: {
      fontSize: 10,
      fontWeight:
        '700',
    },

    inputRow: {
      borderTopWidth: 1,
      padding: 10,
      flexDirection:
        'row',
      alignItems:
        'flex-end',
      gap: 8,
    },

    input: {
      flex: 1,
      minHeight: 40,
      maxHeight: 96,
      borderWidth: 1,
      borderRadius: 13,
      paddingHorizontal: 11,
      paddingVertical: 9,
      fontSize: 12,
      lineHeight: 17,
      outlineStyle:
        'none' as any,
    },

    sendButton: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    sendText: {
      fontSize: 17,
      fontWeight:
        '900',
    },

    launcher: {
      minHeight: 50,
      borderRadius: 25,
      paddingHorizontal: 15,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      gap: 8,
      shadowColor:
        '#000',
      shadowOpacity: 0.22,
      shadowRadius: 9,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      elevation: 10,
    },

    launcherIcon: {
      fontSize: 20,
    },

    launcherAvatar: {
      width: 30,
      height: 30,
      borderRadius: 15,
      overflow:
        'hidden',
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        'rgba(255,255,255,0.22)',
    },

    launcherAvatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 15,
    },

    launcherAvatarFallback: {
      color:
        '#FFFFFF',
      fontSize: 13,
      fontWeight:
        '900',
    },

    launcherText: {
      fontSize: 11,
      fontWeight:
        '900',
    },
  });
