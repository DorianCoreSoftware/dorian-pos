import React, {
    useEffect,
    useRef,
    useState,
} from 'react';

import {
    ActivityIndicator,
    Text,
    View,
} from 'react-native';

import {
    useBusiness,
} from '../../../context/BusinessContext';

import {
    loadPlacesLibrary,
} from '../../services/google-maps/googleMapsService';
import { GooglePlaceAutocompleteProps } from '../../models/google-place-autocomplete/google-place-autocomplete-props';


function getAddressComponent(
    components: any[],
    type: string,
): string {
    const component =
        components.find(
            (item) =>
                Array.isArray(
                    item.types,
                ) &&
                item.types.includes(
                    type,
                ),
        );

    return (
        component?.longText ??
        component?.shortText ??
        ''
    );
}

export default function GooglePlaceAutocomplete({
    disabled = false,
    onPlaceSelected,
}: GooglePlaceAutocompleteProps) {
  const { theme: businessTheme } = useBusiness();
    const containerRef =
        useRef<HTMLDivElement | null>(
            null,
        );

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        error,
        setError,
    ] = useState<
        string | null
    >(null);

    useEffect(() => {
        let isMounted =
            true;

        async function initialize():
            Promise<void> {
            try {
                setLoading(
                    true,
                );

                setError(
                    null,
                );

                const {
                    PlaceAutocompleteElement,
                } =
                    await loadPlacesLibrary();

                if (
                    !isMounted ||
                    !containerRef
                        .current
                ) {
                    return;
                }

                containerRef
                    .current
                    .innerHTML = '';

                const autocomplete =
                    new PlaceAutocompleteElement({
                        includedRegionCodes: [
                            'mx',
                        ],
                    });

                autocomplete.placeholder =
                    'Buscar dirección en Acámbaro';

                autocomplete.style.width =
                    '100%';

                autocomplete.addEventListener(
                    'gmp-select',
                    async (
                        event: any,
                    ) => {
                        try {
                            const prediction =
                                event.placePrediction;

                            if (!prediction) {
                                return;
                            }

                            const place =
                                prediction.toPlace();

                            await place.fetchFields({
                                fields: [
                                    'formattedAddress',
                                    'location',
                                    'addressComponents',
                                ],
                            });

                            const latitude =
                                place.location?.lat();

                            const longitude =
                                place.location?.lng();

                            if (
                                typeof latitude !==
                                'number' ||
                                typeof longitude !==
                                'number'
                            ) {
                                setError(
                                    'No pudimos obtener la ubicación de esa dirección.',
                                );

                                return;
                            }

                            const components =
                                Array.isArray(
                                    place.addressComponents,
                                )
                                    ? place.addressComponents
                                    : [];

                            const street =
                                getAddressComponent(
                                    components,
                                    'route',
                                );

                            const exteriorNumber =
                                getAddressComponent(
                                    components,
                                    'street_number',
                                );

                            const neighborhood =
                                getAddressComponent(
                                    components,
                                    'sublocality_level_1',
                                ) ||
                                getAddressComponent(
                                    components,
                                    'neighborhood',
                                ) ||
                                getAddressComponent(
                                    components,
                                    'locality',
                                );

                            const postalCode =
                                getAddressComponent(
                                    components,
                                    'postal_code',
                                );

                            onPlaceSelected({
                                formattedAddress:
                                    place.formattedAddress ??
                                    '',

                                latitude,
                                longitude,

                                street,
                                exteriorNumber,
                                neighborhood,
                                postalCode,
                            });
                        } catch (selectionError) {
                            console.error(
                                'Error seleccionando dirección:',
                                selectionError,
                            );

                            setError(
                                'No pudimos procesar esa dirección.',
                            );
                        }
                    },
                );

                containerRef
                    .current
                    .appendChild(
                        autocomplete,
                    );
            } catch (loadError) {
                console.error(
                    'Error cargando Google Places:',
                    loadError,
                );

                if (
                    isMounted
                ) {
                    setError(
                        loadError instanceof
                            Error
                            ? loadError.message
                            : 'No se pudo cargar Google Maps.',
                    );
                }
            } finally {
                if (
                    isMounted
                ) {
                    setLoading(
                        false,
                    );
                }
            }
        }

        void initialize();

        return () => {
            isMounted =
                false;

            if (
                containerRef.current
            ) {
                containerRef
                    .current
                    .innerHTML = '';
            }
        };
    }, [
        onPlaceSelected,
    ]);

    return (
        <View
            style={{
                position: 'relative',
                zIndex: 9999,
                elevation: 9999,
            }}
        >
            <Text
                style={{
                    color:
                        '#FFFFFF',

                    fontSize: 13,

                    fontWeight:
                        '700',

                    marginBottom: 8,
                }}
            >
                Buscar dirección
            </Text>

            {loading && (
                <View
                    style={{
                        minHeight: 50,

                        justifyContent:
                            'center',

                        alignItems:
                            'center',
                    }}
                >
                    <ActivityIndicator
                        color={businessTheme.primary}
                    />
                </View>
            )}

            <div
                ref={
                    containerRef
                }
                style={{
                    width:
                        '100%',

                    position:
                        'relative',

                    zIndex:
                        9999,

                    opacity:
                        disabled
                            ? 0.5
                            : 1,

                    pointerEvents:
                        disabled
                            ? 'none'
                            : 'auto',

                    marginBottom:
                        '12px',
                }}
            />

            {!!error && (
                <Text
                    style={{
                        color:
                            '#FF8A8A',

                        fontSize: 12,

                        marginBottom: 10,
                    }}
                >
                    {error}
                </Text>
            )}
        </View>
    );
}