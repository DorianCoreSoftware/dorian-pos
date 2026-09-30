import { DEFAULT_BRAND_PRIMARY } from '../../../theme/brandStyles';

import { StyleSheet } from 'react-native';

const createStyles = (
  primaryColor: string,
) =>
  StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    loadingText: { marginTop: 12, color: '#AAAAAA', fontSize: 13 },
    header: { marginBottom: 16 },
    title: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
    subtitle: { color: '#999999', fontSize: 12, lineHeight: 18, marginTop: 5 },
    timezoneCard: { padding: 12, marginBottom: 12, borderRadius: 9, borderWidth: 1, borderColor: '#343434', backgroundColor: '#1D1D1D' },
    timezoneLabel: { color: '#888888', fontSize: 10, fontWeight: '700' },
    timezoneValue: { color: primaryColor, fontSize: 13, fontWeight: '900', marginTop: 3 },
    content: { paddingBottom: 28 },
    dayCard: { padding: 14, marginBottom: 9, borderRadius: 11, borderWidth: 1, borderColor: '#343434', backgroundColor: '#1D1D1D' },
    dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    dayName: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
    dayStatus: { color: '#888888', fontSize: 11, marginTop: 3 },
    dayStatusOpen: { color: '#4CAF50' },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 13 },
    timeField: { flex: 1 },
    timeLabel: { color: '#AAAAAA', fontSize: 10, fontWeight: '700', marginBottom: 5 },
    timeInput: { minHeight: 42, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#444444', backgroundColor: '#252525', color: '#FFFFFF', fontSize: 15, fontWeight: '800', textAlign: 'center' },
    arrow: { color: '#777777', fontSize: 18, marginTop: 14 },
    hint: { color: '#777777', fontSize: 10, marginTop: 7 },
    saveButton: { minHeight: 46, marginTop: 8, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: primaryColor },
    saveButtonDisabled: { opacity: 0.5 },
    saveButtonText: { color: '#171717', fontSize: 13, fontWeight: '900' },
    errorText: { color: '#FF6B6B', fontSize: 12, textAlign: 'center', marginBottom: 12 },
    webOrdersCard: {
        padding: 14,
        marginBottom: 12,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: '#4A3B00',
        backgroundColor: '#211C0B',
    },

    webOrdersHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },

    webOrdersHeaderText: {
        flex: 1,
    },

    webOrdersTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '900',
    },

    webOrdersStatus: {
        fontSize: 11,
        fontWeight: '800',
        marginTop: 4,
    },

    webOrdersStatusEnabled: {
        color: '#66D06F',
    },

    webOrdersStatusDisabled: {
        color: '#FF8A80',
    },

    webOrdersDescription: {
        color: '#B7B7B7',
        fontSize: 11,
        lineHeight: 17,
        marginTop: 10,
    },

    pauseMessageContainer: {
        marginTop: 14,
    },

    pauseMessageLabel: {
        color: '#AAAAAA',
        fontSize: 10,
        fontWeight: '800',
        marginBottom: 6,
    },

    pauseMessageInput: {
        minHeight: 82,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#4A4A4A',
        backgroundColor: '#252525',
        color: '#FFFFFF',
        fontSize: 13,
        lineHeight: 18,
        textAlignVertical: 'top',
    },

    pauseMessageCounter: {
        color: '#777777',
        fontSize: 10,
        textAlign: 'right',
        marginTop: 4,
    },

    groupTitle: {
  color: primaryColor,
  fontSize: 12,
  fontWeight: '900',
  letterSpacing: 0.5,
  marginBottom: 10,
},

groupDescription: {
  color: '#999999',
  fontSize: 11,
  lineHeight: 17,
  marginTop: -4,
  marginBottom: 12,
},

divider: {
  height: 1,
  backgroundColor: '#303030',
  marginVertical: 24,
},

exceptionFormCard: {
  padding: 14,
  marginBottom: 14,
  borderRadius: 11,
  borderWidth: 1,
  borderColor: '#3B3B3B',
  backgroundColor: '#1D1D1D',
},

exceptionFormTitle: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '900',
  marginBottom: 14,
},

exceptionLabel: {
  color: '#AAAAAA',
  fontSize: 10,
  fontWeight: '800',
  marginBottom: 6,
},

exceptionInput: {
  minHeight: 42,
  paddingHorizontal: 12,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#444444',
  backgroundColor: '#252525',
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: '700',
},

exceptionOpenRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  marginTop: 14,
},

exceptionOpenStatus: {
  color: '#D0D0D0',
  fontSize: 12,
  fontWeight: '800',
},

exceptionReasonLabel: {
  marginTop: 14,
},

exceptionReasonInput: {
  minHeight: 72,
  paddingVertical: 10,
  textAlignVertical: 'top',
  fontWeight: '500',
},

exceptionActions: {
  flexDirection: 'row',
  justifyContent: 'flex-end',
  alignItems: 'center',
  gap: 10,
  marginTop: 14,
},

exceptionCancelButton: {
  minHeight: 40,
  paddingHorizontal: 13,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#454545',
  alignItems: 'center',
  justifyContent: 'center',
},

exceptionCancelText: {
  color: '#C8C8C8',
  fontSize: 11,
  fontWeight: '800',
},

exceptionSaveButton: {
  minHeight: 40,
  paddingHorizontal: 16,
  borderRadius: 8,
  backgroundColor: primaryColor,
  alignItems: 'center',
  justifyContent: 'center',
},

exceptionSaveText: {
  color: '#171717',
  fontSize: 11,
  fontWeight: '900',
},

emptyExceptionsText: {
  color: '#777777',
  fontSize: 12,
  textAlign: 'center',
  paddingVertical: 20,
},

exceptionCard: {
  padding: 13,
  marginBottom: 9,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#343434',
  backgroundColor: '#1A1A1A',
},

exceptionCardTop: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
},

exceptionCardInfo: {
  flex: 1,
},

exceptionDate: {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '900',
},

exceptionStatus: {
  fontSize: 11,
  fontWeight: '800',
  marginTop: 4,
},

exceptionStatusOpen: {
  color: '#66D06F',
},

exceptionStatusClosed: {
  color: '#FF8A80',
},

exceptionReason: {
  color: '#AFAFAF',
  fontSize: 11,
  lineHeight: 16,
  marginTop: 5,
},

exceptionCardActions: {
  flexDirection: 'row',
  gap: 6,
},

exceptionEditButton: {
  paddingHorizontal: 10,
  paddingVertical: 7,
  borderRadius: 7,
  backgroundColor: '#2B2B2B',
},

exceptionEditText: {
  color: primaryColor,
  fontSize: 10,
  fontWeight: '800',
},

exceptionDeleteButton: {
  paddingHorizontal: 10,
  paddingVertical: 7,
  borderRadius: 7,
  backgroundColor: '#2A1717',
},

exceptionDeleteText: {
  color: '#FF7777',
  fontSize: 10,
  fontWeight: '800',
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

