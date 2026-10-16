export interface GooglePlaceSelection {
    formattedAddress: string;

    latitude: number;
    longitude: number;

    street?: string;
    exteriorNumber?: string;
    neighborhood?: string;
    postalCode?: string;
}