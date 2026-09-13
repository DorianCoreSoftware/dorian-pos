import {
  supabase,
} from './supabase';

export interface GooglePlaceSuggestion {
  placeId: string;

  text: string;

  mainText: string;

  secondaryText: string;
}

export interface GooglePlaceSelection {
  placeId: string;

  displayName: string;

  formattedAddress: string;

  latitude: number;

  longitude: number;

  street: string;

  exteriorNumber: string;

  neighborhood: string;

  postalCode: string;

  city: string;

  state: string;
}

interface GooglePlacesErrorResponse {
  error?: string;
}

interface GooglePlacesAutocompleteResponse
  extends GooglePlacesErrorResponse {
  suggestions?:
    GooglePlaceSuggestion[];
}

interface GooglePlaceDetailsResponse
  extends GooglePlacesErrorResponse {
  placeId?: string;

  displayName?: string;

  formattedAddress?: string;

  latitude?:
    number | null;

  longitude?:
    number | null;

  street?: string;

  exteriorNumber?: string;

  neighborhood?: string;

  postalCode?: string;

  city?: string;

  state?: string;
}

export async function searchGooglePlaces(
  input:
    string,

  sessionToken:
    string,
): Promise<
  GooglePlaceSuggestion[]
> {
  const cleanInput =
    input.trim();

  if (
    cleanInput.length <
    3
  ) {
    return [];
  }

  const {
    data,
    error,
  } =
    await supabase
      .functions
      .invoke<
        GooglePlacesAutocompleteResponse
      >(
        'google-places',
        {
          body: {
            action:
              'autocomplete',

            input:
              cleanInput,

            sessionToken,
          },
        },
      );

  if (
    error
  ) {
    console.error(
      'Error invocando google-places autocomplete:',
      error,
    );

    throw new Error(
      error.message ||
      'No se pudo buscar la dirección.',
    );
  }

  if (
    data?.error
  ) {
    throw new Error(
      data.error,
    );
  }

  return (
    data
      ?.suggestions ??
    []
  );
}

export async function getGooglePlaceDetails(
  placeId:
    string,

  sessionToken:
    string,
): Promise<
  GooglePlaceSelection
> {
  if (
    !placeId
  ) {
    throw new Error(
      'No se recibió el identificador del lugar.',
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .functions
      .invoke<
        GooglePlaceDetailsResponse
      >(
        'google-places',
        {
          body: {
            action:
              'details',

            placeId,

            sessionToken,
          },
        },
      );

  if (
    error
  ) {
    console.error(
      'Error invocando google-places details:',
      error,
    );

    throw new Error(
      error.message ||
      'No se pudo obtener la dirección seleccionada.',
    );
  }

  if (
    data?.error
  ) {
    throw new Error(
      data.error,
    );
  }

  if (
    !data
  ) {
    throw new Error(
      'Google no devolvió información de la ubicación.',
    );
  }

  if (
    data.latitude ===
      null ||
    data.latitude ===
      undefined ||
    data.longitude ===
      null ||
    data.longitude ===
      undefined
  ) {
    throw new Error(
      'Google no devolvió coordenadas para esta ubicación.',
    );
  }

  if (
    !Number.isFinite(
      Number(
        data.latitude,
      ),
    ) ||
    !Number.isFinite(
      Number(
        data.longitude,
      ),
    )
  ) {
    throw new Error(
      'Las coordenadas recibidas no son válidas.',
    );
  }

  return {
    placeId:
      data.placeId ??
      placeId,

    displayName:
      data.displayName ??
      '',

    formattedAddress:
      data.formattedAddress ??
      '',

    latitude:
      Number(
        data.latitude,
      ),

    longitude:
      Number(
        data.longitude,
      ),

    street:
      data.street ??
      '',

    exteriorNumber:
      data.exteriorNumber ??
      '',

    neighborhood:
      data.neighborhood ??
      '',

    postalCode:
      data.postalCode ??
      '',

    city:
      data.city ??
      '',

    state:
      data.state ??
      '',
  };
}