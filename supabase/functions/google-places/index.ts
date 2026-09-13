

const GOOGLE_PLACES_API_KEY =
  Deno.env.get(
    'GOOGLE_PLACES_API_KEY',
  );

if (
  !GOOGLE_PLACES_API_KEY
) {
  throw new Error(
    'Missing GOOGLE_PLACES_API_KEY',
  );
}

const corsHeaders = {
  'Access-Control-Allow-Origin':
    '*',

  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface AutocompleteRequest {
  action:
    'autocomplete';

  input:
    string;

  sessionToken:
    string;
}

interface DetailsRequest {
  action:
    'details';

  placeId:
    string;

  sessionToken:
    string;
}

type RequestBody =
  | AutocompleteRequest
  | DetailsRequest;

Deno.serve(
  async (
    req,
  ) => {
    if (
      req.method ===
      'OPTIONS'
    ) {
      return new Response(
        'ok',
        {
          headers:
            corsHeaders,
        },
      );
    }

    try {
      const body =
        await req.json() as
          RequestBody;

      if (
        body.action ===
        'autocomplete'
      ) {
        const input =
          body.input?.trim();

        if (
          !input ||
          input.length <
            3
        ) {
          return jsonResponse({
            suggestions:
              [],
          });
        }

        const googleResponse =
          await fetch(
            'https://places.googleapis.com/v1/places:autocomplete',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',

                'X-Goog-Api-Key':
                  GOOGLE_PLACES_API_KEY,

                'X-Goog-FieldMask':
                  [
                    'suggestions.placePrediction.placeId',
                    'suggestions.placePrediction.text.text',
                    'suggestions.placePrediction.structuredFormat.mainText.text',
                    'suggestions.placePrediction.structuredFormat.secondaryText.text',
                  ].join(
                    ',',
                  ),
              },

              body:
                JSON.stringify({
                  input,

                  sessionToken:
                    body.sessionToken,

                  includedRegionCodes:
                    [
                      'mx',
                    ],

                  languageCode:
                    'es-MX',
                }),
            },
          );

        const data =
          await googleResponse.json();

        if (
          !googleResponse.ok
        ) {
          console.error(
            'Google autocomplete error:',
            data,
          );

          return jsonResponse(
            {
              error:
                'No se pudo buscar la dirección.',
            },
            500,
          );
        }

        const suggestions =
          (
            data.suggestions ??
            []
          )
            .map(
              (
                item:
                  any,
              ) => {
                const prediction =
                  item
                    .placePrediction;

                if (
                  !prediction
                    ?.placeId
                ) {
                  return null;
                }

                return {
                  placeId:
                    prediction.placeId,

                  text:
                    prediction
                      .text
                      ?.text ??
                    '',

                  mainText:
                    prediction
                      .structuredFormat
                      ?.mainText
                      ?.text ??
                    '',

                  secondaryText:
                    prediction
                      .structuredFormat
                      ?.secondaryText
                      ?.text ??
                    '',
                };
              },
            )
            .filter(
              Boolean,
            );

        return jsonResponse({
          suggestions,
        });
      }

      if (
        body.action ===
        'details'
      ) {
        if (
          !body.placeId
        ) {
          return jsonResponse(
            {
              error:
                'placeId requerido.',
            },
            400,
          );
        }

        const url =
          new URL(
            `https://places.googleapis.com/v1/places/${encodeURIComponent(
              body.placeId,
            )}`,
          );

        url.searchParams.set(
          'sessionToken',
          body.sessionToken,
        );

        url.searchParams.set(
          'languageCode',
          'es-MX',
        );

        const googleResponse =
          await fetch(
            url.toString(),
            {
              headers: {
                'X-Goog-Api-Key':
                  GOOGLE_PLACES_API_KEY,

                'X-Goog-FieldMask':
                  [
                    'id',
                    'displayName',
                    'formattedAddress',
                    'location',
                    'addressComponents',
                  ].join(
                    ',',
                  ),
              },
            },
          );

        const data =
          await googleResponse.json();

        if (
          !googleResponse.ok
        ) {
          console.error(
            'Google details error:',
            data,
          );

          return jsonResponse(
            {
              error:
                'No se pudo obtener la dirección seleccionada.',
            },
            500,
          );
        }

        return jsonResponse(
          normalizePlace(
            data,
          ),
        );
      }

      return jsonResponse(
        {
          error:
            'Acción no válida.',
        },
        400,
      );
    } catch (
      error
    ) {
      console.error(
        'google-places error:',
        error,
      );

      return jsonResponse(
        {
          error:
            error instanceof
              Error
              ? error.message
              : 'Error inesperado.',
        },
        500,
      );
    }
  },
);

function normalizePlace(
  place:
    any,
) {
  const components =
    place.addressComponents ??
    [];

  const getComponent =
    (
      types:
        string[],
    ): string => {
      const component =
        components.find(
          (
            item:
              any,
          ) =>
            types.some(
              (
                type,
              ) =>
                item.types
                  ?.includes(
                    type,
                  ),
            ),
        );

      return (
        component
          ?.longText ??
        ''
      );
    };

  return {
    placeId:
      place.id,

    displayName:
      place.displayName
        ?.text ??
      '',

    formattedAddress:
      place.formattedAddress ??
      '',

    latitude:
      place.location
        ?.latitude ??
      null,

    longitude:
      place.location
        ?.longitude ??
      null,

    street:
      getComponent([
        'route',
      ]),

    exteriorNumber:
      getComponent([
        'street_number',
      ]),

    neighborhood:
      getComponent([
        'neighborhood',
        'sublocality_level_1',
        'sublocality',
      ]),

    postalCode:
      getComponent([
        'postal_code',
      ]),

    city:
      getComponent([
        'locality',
        'administrative_area_level_2',
      ]),

    state:
      getComponent([
        'administrative_area_level_1',
      ]),
  };
}

function jsonResponse(
  body:
    unknown,

  status =
    200,
): Response {
  return new Response(
    JSON.stringify(
      body,
    ),
    {
      status,

      headers: {
        ...corsHeaders,

        'Content-Type':
          'application/json',
      },
    },
  );
}