import {
    StyleSheet,
} from 'react-native';

export const styles =
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#121212',
            padding: 20,
        },

        title: {
            color: '#FFFFFF',
            fontSize: 26,
            fontWeight: '900',
        },

        subtitle: {
            color: '#999999',
            fontSize: 13,
            marginTop: 4,
            marginBottom: 20,
        },

        card: {
            backgroundColor: '#1D1D1D',
            borderWidth: 1,
            borderColor: '#353535',
            borderRadius: 14,
            padding: 18,
            marginBottom: 16,
        },

        label: {
            color: '#AAAAAA',
            fontSize: 12,
            fontWeight: '700',
            marginBottom: 7,
        },

        input: {
            minHeight: 48,
            borderWidth: 1,
            borderColor: '#444444',
            borderRadius: 8,
            backgroundColor: '#161616',
            color: '#FFFFFF',
            paddingHorizontal: 12,
            fontSize: 14,
        },

        primaryButton: {
            marginTop: 12,
            minHeight: 46,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFBF00',
        },

        primaryButtonDisabled: {
            opacity: 0.5,
        },

        primaryButtonText: {
            color: '#111111',
            fontSize: 14,
            fontWeight: '900',
        },

        secondaryButton: {
            marginTop: 10,
            minHeight: 46,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: '#FFBF00',
            backgroundColor: '#2A2400',
        },

        secondaryButtonText: {
            color: '#FFBF00',
            fontSize: 14,
            fontWeight: '900',
        },

        customerName: {
            color: '#FFFFFF',
            fontSize: 22,
            fontWeight: '900',
        },

        visits: {
            color: '#FFBF00',
            fontSize: 18,
            fontWeight: '900',
            marginTop: 6,
        },

        rewardsTitle: {
            color: '#FFFFFF',
            fontSize: 18,
            fontWeight: '900',
            marginBottom: 10,
        },

        rewardCard: {
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#373737',
            backgroundColor: '#181818',
            padding: 14,
            marginBottom: 10,
        },

        rewardAvailable: {
            borderColor: '#FFBF00',
            backgroundColor: '#292200',
        },

        rewardRedeemed: {
            opacity: 0.65,
        },

        rewardName: {
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: '900',
        },

        rewardDescription: {
            color: '#AAAAAA',
            fontSize: 12,
            marginTop: 4,
        },

        rewardStatus: {
            color: '#999999',
            fontSize: 12,
            fontWeight: '700',
            marginTop: 7,
        },

        availableText: {
            color: '#FFBF00',
        },

        redeemedText: {
            color: '#69C779',
        },

        redeemButton: {
            minHeight: 40,
            borderRadius: 7,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFBF00',
            marginTop: 10,
        },

        redeemButtonText: {
            color: '#111111',
            fontSize: 13,
            fontWeight: '900',
        },

        emptyText: {
            color: '#777777',
            fontSize: 13,
            textAlign: 'center',
        },

        errorText: {
            color: '#FF5252',
            fontSize: 13,
            marginTop: 10,
            fontWeight: '700',
        },

        successText: {
            color: '#69C779',
            fontSize: 13,
            marginTop: 10,
            fontWeight: '700',
        },

        scanButton: {
            minHeight: 58,
            borderRadius: 10,
            backgroundColor: '#FFBF00',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
        },

        scanButtonIcon: {
            color: '#111111',
            fontSize: 25,
            fontWeight: '900',
            marginRight: 10,
        },

        scanButtonText: {
            color: '#111111',
            fontSize: 15,
            fontWeight: '900',
        },

        manualLabel: {
            color: '#777777',
            fontSize: 11,
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: 8,
        },
    });