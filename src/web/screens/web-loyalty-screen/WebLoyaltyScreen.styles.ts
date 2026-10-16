import {
    StyleSheet,
} from 'react-native';

const styles =
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor:
                '#0F0F0F',
        },

        contentContainer: {
            width: '100%',
            maxWidth: 760,
            alignSelf: 'center',
            paddingHorizontal: 18,
            paddingBottom: 60,
        },

        loadingContainer: {
            flex: 1,
            minHeight: 500,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor:
                '#0F0F0F',
        },

        loadingText: {
            color: '#AAAAAA',
            marginTop: 12,
        },

        header: {
            paddingTop: 24,
            paddingBottom: 24,
        },

        backButton: {
            alignSelf: 'flex-start',
            marginBottom: 20,
        },

        backButtonText: {
            fontSize: 14,
            fontWeight: '800',
        },

        brand: {
            fontSize: 15,
            fontWeight: '900',
            textTransform: 'uppercase',
        },

        title: {
            color: '#FFFFFF',
            fontSize: 36,
            fontWeight: '900',
            marginTop: 4,
        },

        subtitle: {
            color: '#AAAAAA',
            fontSize: 15,
            marginTop: 6,
        },

        registerCard: {
            backgroundColor:
                '#191919',
            borderWidth: 1,
            borderColor:
                '#303030',
            borderRadius: 18,
            padding: 22,
        },

        customerCard: {
            backgroundColor:
                '#191919',
            borderWidth: 1,
            borderColor:
                '#303030',
            borderRadius: 18,
            padding: 22,
            marginBottom: 16,
        },

        customerHello: {
            color: '#FFFFFF',
            fontSize: 22,
            fontWeight: '900',
        },

        visitCount: {
            fontSize: 54,
            fontWeight: '900',
            marginTop: 12,
            lineHeight: 58,
        },

        visitLabel: {
            color: '#BBBBBB',
            fontSize: 14,
            fontWeight: '700',
        },

        sectionTitle: {
            color: '#FFFFFF',
            fontSize: 20,
            fontWeight: '900',
        },

        sectionText: {
            color: '#999999',
            fontSize: 13,
            lineHeight: 19,
            marginTop: 6,
            marginBottom: 18,
        },

        label: {
            color: '#BBBBBB',
            fontSize: 12,
            fontWeight: '800',
            marginBottom: 6,
            marginTop: 12,
        },

        input: {
            minHeight: 48,
            borderWidth: 1,
            borderColor:
                '#3A3A3A',
            borderRadius: 10,
            backgroundColor:
                '#111111',
            color: '#FFFFFF',
            paddingHorizontal: 14,
            fontSize: 15,
        },

        primaryButton: {
            minHeight: 52,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 22,
        },

        primaryButtonText: {
            fontWeight: '900',
            fontSize: 15,
        },

        buttonDisabled: {
            opacity: 0.6,
        },

        errorText: {
            color: '#FF6262',
            fontSize: 13,
            marginTop: 12,
            fontWeight: '700',
        },

        availableBanner: {
            borderWidth: 1,
            borderRadius: 12,
            padding: 14,
            marginTop: 20,
        },

        availableBannerTitle: {
            fontSize: 15,
            fontWeight: '900',
        },

        availableBannerText: {
            color: '#FFFFFF',
            fontSize: 13,
            marginTop: 4,
        },

        progressCard: {
            marginTop: 20,
            paddingTop: 18,
            borderTopWidth: 1,
            borderTopColor:
                '#303030',
        },

        progressTitle: {
            color: '#999999',
            fontSize: 12,
            fontWeight: '800',
            textTransform: 'uppercase',
        },

        progressReward: {
            color: '#FFFFFF',
            fontSize: 18,
            fontWeight: '900',
            marginTop: 5,
        },

        progressText: {
            color: '#BBBBBB',
            fontSize: 13,
            marginTop: 3,
        },

        progressTrack: {
            height: 12,
            borderRadius: 6,
            backgroundColor:
                '#333333',
            overflow: 'hidden',
            marginTop: 14,
        },

        progressFill: {
            height: '100%',
        },

        progressCounter: {
            color: '#999999',
            fontSize: 12,
            marginTop: 6,
            textAlign: 'right',
        },

        qrCard: {
            backgroundColor:
                '#191919',
            borderWidth: 1,
            borderColor:
                '#303030',
            borderRadius: 18,
            padding: 22,
            marginBottom: 16,
            alignItems: 'center',
        },

        qrContainer: {
            padding: 16,
            backgroundColor:
                '#FFFFFF',
            borderRadius: 16,
        },

        qrImage: {
            width: 260,
            height: 260,
        },

        rewardsCard: {
            backgroundColor:
                '#191919',
            borderWidth: 1,
            borderColor:
                '#303030',
            borderRadius: 18,
            padding: 22,
            marginBottom: 16,
        },

        rewardRow: {
            borderWidth: 1,
            borderColor:
                '#333333',
            borderRadius: 12,
            padding: 14,
            marginTop: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },

        rewardRowAvailable: {},

        rewardRowRedeemed: {
            opacity: 0.65,
        },

        rewardContent: {
            flex: 1,
        },

        rewardName: {
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: '900',
        },

        rewardDescription: {
            color: '#999999',
            fontSize: 12,
            marginTop: 3,
        },

        rewardRequirement: {
            fontSize: 12,
            fontWeight: '800',
            marginTop: 7,
        },

        rewardStatusContainer: {
            alignItems: 'flex-end',
        },

        rewardStatus: {
            color: '#999999',
            fontSize: 12,
            fontWeight: '900',
        },

        rewardStatusAvailable: {},

        rewardStatusRedeemed: {
            color: '#65C978',
        },

        howItWorksCard: {
            backgroundColor:
                '#191919',
            borderWidth: 1,
            borderColor:
                '#303030',
            borderRadius: 18,
            padding: 22,
            marginBottom: 18,
        },

        stepText: {
            color: '#BBBBBB',
            fontSize: 13,
            lineHeight: 20,
            marginTop: 8,
        },

        resetButton: {
            alignSelf: 'center',
            paddingVertical: 10,
            paddingHorizontal: 14,
        },

        resetButtonText: {
            color: '#777777',
            fontSize: 12,
            fontWeight: '700',
        },

        downloadQrButton: {
            minHeight: 48,
            paddingHorizontal: 22,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 18,
        },

        downloadQrButtonText: {
            fontSize: 14,
            fontWeight: '900',
        },

        downloadQrHint: {
            maxWidth: 320,
            color: '#888888',
            fontSize: 11,
            lineHeight: 16,
            textAlign: 'center',
            marginTop: 9,
        },

        rewardImageContainer: {
            width: 56,
            height: 56,
            borderRadius: 28,
            borderWidth: 1,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
        },

        rewardImage: {
            width: '100%',
            height: '100%',
        },

        rewardImageFallback: {
            fontSize: 22,
        },
    });

export default styles;