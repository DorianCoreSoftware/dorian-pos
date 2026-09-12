let googleMapsPromise:
  Promise<void> | null =
  null;

declare global {
  interface Window {
    google?: any;
  }
}

export async function loadGoogleMaps():
  Promise<void> {
  if (
    typeof window ===
    'undefined'
  ) {
    throw new Error(
      'Google Maps solo está disponible en web.',
    );
  }

  if (
    window.google
      ?.maps
      ?.importLibrary
  ) {
    return;
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  const apiKey =
    process.env
      .EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Google Maps no está configurado.',
    );
  }

  googleMapsPromise =
    new Promise<void>(
      (
        resolve,
        reject,
      ) => {
        const existingScript =
          document.querySelector<
            HTMLScriptElement
          >(
            'script[data-google-maps-loader="true"]',
          );

        if (existingScript) {
          existingScript.addEventListener(
            'load',
            () => resolve(),
          );

          existingScript.addEventListener(
            'error',
            () =>
              reject(
                new Error(
                  'No se pudo cargar Google Maps.',
                ),
              ),
          );

          return;
        }

        const script =
          document.createElement(
            'script',
          );

        script.src =
          `https://maps.googleapis.com/maps/api/js` +
          `?key=${encodeURIComponent(
            apiKey,
          )}` +
          `&loading=async` +
          `&libraries=places`;

        script.async = true;

        script.defer = true;

        script.dataset
          .googleMapsLoader =
          'true';

        script.onload =
          () => resolve();

        script.onerror =
          () =>
            reject(
              new Error(
                'No se pudo cargar Google Maps.',
              ),
            );

        document.head.appendChild(
          script,
        );
      },
    );

  return googleMapsPromise;
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

  return window.google.maps
    .importLibrary(
      'places',
    );
}