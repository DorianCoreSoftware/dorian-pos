let googleMapsPromise:
  Promise<void> | null =
  null;

declare global {
  interface Window {
    google?: any;
  }
}

function bootstrapGoogleMaps(
  apiKey: string,
): Promise<void> {
  if (
    typeof window ===
    'undefined'
  ) {
    return Promise.reject(
      new Error(
        'Google Maps solo está disponible en web.',
      ),
    );
  }

  if (
    window.google
      ?.maps
      ?.importLibrary
  ) {
    return Promise.resolve();
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise =
    new Promise<void>(
      (
        resolve,
        reject,
      ) => {
        const googleObject =
          (
            window as any
          ).google ||
          (
            (
              window as any
            ).google = {}
          );

        const mapsObject =
          googleObject.maps ||
          (
            googleObject.maps = {}
          );

        const libraries =
          new Set<string>();

        const params =
          new URLSearchParams();

        let scriptPromise:
          Promise<void> | null =
          null;

        const loadScript =
          () => {
            if (
              scriptPromise
            ) {
              return scriptPromise;
            }

            scriptPromise =
              new Promise<void>(
                (
                  scriptResolve,
                  scriptReject,
                ) => {
                  const script =
                    document
                      .createElement(
                        'script',
                      );

                  params.set(
                    'libraries',
                    [
                      ...libraries,
                    ].join(
                      ',',
                    ),
                  );

                  params.set(
                    'key',
                    apiKey,
                  );

                  params.set(
                    'v',
                    'weekly',
                  );

                  params.set(
                    'callback',
                    'google.maps.__ib__',
                  );

                  script.src =
                    `https://maps.googleapis.com/maps/api/js?${params.toString()}`;

                  script.async =
                    true;

                  script.defer =
                    true;

                  mapsObject.__ib__ =
                    () => {
                      scriptResolve();
                    };

                  script.onerror =
                    () => {
                      scriptReject(
                        new Error(
                          'No se pudo cargar Google Maps.',
                        ),
                      );
                    };

                  document.head
                    .appendChild(
                      script,
                    );
                },
              );

            return scriptPromise;
          };

        if (
          !mapsObject
            .importLibrary
        ) {
          mapsObject
            .importLibrary =
            (
              library:
                string,
            ) => {
              libraries.add(
                library,
              );

              return loadScript()
                .then(
                  () =>
                    mapsObject
                      .importLibrary(
                        library,
                      ),
                );
            };
        }

        mapsObject
          .importLibrary(
            'places',
          )
          .then(
            () => resolve(),
          )
          .catch(
            reject,
          );
      },
    );

  return googleMapsPromise;
}

export async function loadGoogleMaps():
  Promise<void> {
  const apiKey =
    process.env
      .EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Google Maps no está configurado.',
    );
  }

  await bootstrapGoogleMaps(
    apiKey,
  );
}

export async function loadPlacesLibrary():
  Promise<any> {
  await loadGoogleMaps();

  if (
    !window.google
      ?.maps
      ?.importLibrary
  ) {
    throw new Error(
      'La librería de Google Maps no está disponible.',
    );
  }

  return window.google
    .maps
    .importLibrary(
      'places',
    );
}