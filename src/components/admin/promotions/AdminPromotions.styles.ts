import {
    StyleSheet,
} from 'react-native';

export const styles =
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#151515',
        },

        header: {
            marginBottom: 18,
        },

        title: {
            color: '#FFFFFF',
            fontSize: 22,
            fontWeight: '900',
        },

        subtitle: {
            color: '#888888',
            fontSize: 12,
            marginTop: 4,
        },

        loadingContainer: {
            flex: 1,
            alignItems: 'center',
            justifyContent:
                'center',
            backgroundColor:
                '#151515',
        },

        loadingText: {
            color: '#AAAAAA',
            fontSize: 13,
            marginTop: 10,
        },

        errorContainer: {
            flex: 1,
            alignItems: 'center',
            justifyContent:
                'center',
            padding: 24,
            backgroundColor:
                '#151515',
        },

        errorTitle: {
            color: '#FF5252',
            fontSize: 17,
            fontWeight: '900',
            marginBottom: 8,
        },

        errorText: {
            color: '#AAAAAA',
            textAlign: 'center',
            fontSize: 12,
        },

        card: {
            padding: 16,
            marginBottom: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#303030',
            backgroundColor:
                '#1D1D1D',
        },

        cardHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent:
                'space-between',
            gap: 16,
        },

        cardHeaderText: {
            flex: 1,
        },

        cardTitle: {
            color: '#FFFFFF',
            fontSize: 17,
            fontWeight: '900',
        },

        cardDescription: {
            color: '#888888',
            fontSize: 11,
            marginTop: 4,
            lineHeight: 16,
        },

        fieldContainer: {
            marginTop: 18,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor:
                '#303030',
        },

        fieldLabel: {
            color: '#CCCCCC',
            fontSize: 12,
            fontWeight: '800',
            marginBottom: 7,
        },

        input: {
            width: 110,
            minHeight: 44,
            paddingHorizontal: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#444444',
            backgroundColor:
                '#242424',
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: '800',
        },

        inputDisabled: {
            opacity: 0.4,
        },

        fieldHelp: {
            color: '#777777',
            fontSize: 10,
            marginTop: 7,
        },

        percentageRow: {
            flexDirection: 'row',
            alignItems: 'center',
        },

        percentageInput: {
            width: 90,
        },

        percentageSymbol: {
            color: '#FFBF00',
            fontSize: 18,
            fontWeight: '900',
            marginLeft: 8,
        },

        comingSoonCard: {
            opacity: 0.8,
        },

        comingSoonBadge: {
            alignSelf:
                'flex-start',
            marginTop: 12,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: '#5A4A00',
            backgroundColor:
                '#302800',
        },

        comingSoonText: {
            color: '#FFBF00',
            fontSize: 10,
            fontWeight: '900',
        },

        saveButton: {
            minHeight: 50,
            alignItems: 'center',
            justifyContent:
                'center',
            marginTop: 4,
            borderRadius: 10,
            backgroundColor:
                '#FFBF00',
        },

        saveButtonDisabled: {
            opacity: 0.5,
        },

        saveButtonText: {
            color: '#111111',
            fontSize: 13,
            fontWeight: '900',
        },

        scrollContent: {
            padding: 16,
            paddingBottom: 50,
        },
    });