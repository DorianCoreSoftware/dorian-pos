import { GooglePlaceSelection } from "./google-place-selection";

export interface GooglePlaceAutocompleteProps {
    disabled?: boolean;

    onPlaceSelected:
    (
        place:
            GooglePlaceSelection,
    ) => void;
}