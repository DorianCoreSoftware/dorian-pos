import { useBusiness } from '../../../context/BusinessContext';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  getGooglePlaceDetails,
  GooglePlaceSelection,
  GooglePlaceSuggestion,
  searchGooglePlaces,
} from '../../../services/googlePlacesService';

interface GooglePlaceSearchProps {
  disabled?: boolean;

  initialValue?: string;

  placeholder?: string;

  dropdownDirection?:
  | 'up'
  | 'down';

  onPlaceSelected:
  (
    place:
      GooglePlaceSelection,
  ) => void;
}

export function GooglePlaceSearch({
  disabled = false,
  initialValue = '',
  placeholder =
  'Buscar dirección o negocio...',
  dropdownDirection =
  'down',
  onPlaceSelected,
}: GooglePlaceSearchProps) {
  const { theme: businessTheme } = useBusiness();

  const [
    searchText,
    setSearchText,
  ] =
    useState(
      initialValue,
    );

  const [
    suggestions,
    setSuggestions,
  ] =
    useState<
      GooglePlaceSuggestion[]
    >(
      [],
    );

  const [
    isSearching,
    setIsSearching,
  ] =
    useState(
      false,
    );

  const [
    isSelecting,
    setIsSelecting,
  ] =
    useState(
      false,
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<string | null>(
      null,
    );

  const [
    sessionToken,
    setSessionToken,
  ] =
    useState(
      createSessionToken(),
    );

  const debounceRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(
      null,
    );

  const requestIdRef =
    useRef(
      0,
    );

  const skipNextSearchRef =
    useRef(
      false,
    );

  const inputRef =
    useRef<TextInput | null>(
      null,
    );

  useEffect(
    () => {
      setSearchText(
        initialValue,
      );
    },
    [
      initialValue,
    ],
  );

  useEffect(
    () => {
      if (
        debounceRef.current
      ) {
        clearTimeout(
          debounceRef.current,
        );
      }

      if (
        skipNextSearchRef.current
      ) {
        skipNextSearchRef.current =
          false;

        return;
      }

      const cleanSearch =
        searchText.trim();

      if (
        cleanSearch.length <
        3
      ) {
        setSuggestions(
          [],
        );

        setIsSearching(
          false,
        );

        setErrorMessage(
          null,
        );

        return;
      }

      const currentRequestId =
        ++requestIdRef.current;

      debounceRef.current =
        setTimeout(
          () => {
            void executeSearch(
              cleanSearch,
              currentRequestId,
            );
          },
          450,
        );

      return () => {
        if (
          debounceRef.current
        ) {
          clearTimeout(
            debounceRef.current,
          );
        }
      };
    },
    [
      searchText,
      sessionToken,
    ],
  );

  async function executeSearch(
    input:
      string,

    requestId:
      number,
  ): Promise<void> {
    try {
      setIsSearching(
        true,
      );

      setErrorMessage(
        null,
      );

      const result =
        await searchGooglePlaces(
          input,
          sessionToken,
        );

      if (
        requestId !==
        requestIdRef.current
      ) {
        return;
      }

      /*
       * En móvil no queremos una lista enorme
       * ocupando toda la pantalla.
       */
      setSuggestions(
        result.slice(
          0,
          dropdownDirection ===
            'up'
            ? 4
            : 6,
        ),
      );
    } catch (
    error
    ) {
      if (
        requestId !==
        requestIdRef.current
      ) {
        return;
      }

      console.error(
        'Error buscando lugares:',
        error,
      );

      setSuggestions(
        [],
      );

      setErrorMessage(
        error instanceof
          Error
          ? error.message
          : 'No se pudo buscar la dirección.',
      );
    } finally {
      if (
        requestId ===
        requestIdRef.current
      ) {
        setIsSearching(
          false,
        );
      }
    }
  }

  async function handleSuggestionPress(
    suggestion:
      GooglePlaceSuggestion,
  ): Promise<void> {
    if (
      disabled ||
      isSelecting
    ) {
      return;
    }

    try {
      setIsSelecting(
        true,
      );

      setErrorMessage(
        null,
      );

      const place =
        await getGooglePlaceDetails(
          suggestion.placeId,
          sessionToken,
        );

      /*
       * Primero quitamos el foco.
       *
       * En Android es importante hacerlo
       * ANTES de modificar el layout del modal.
       */
      inputRef.current?.blur();

      Keyboard.dismiss();

      /*
       * Limpiamos el autocomplete.
       */
      skipNextSearchRef.current =
        true;

      setSearchText(
        '',
      );

      setSuggestions(
        [],
      );

      /*
       * Esperamos un instante a que Android
       * termine de cerrar/reacomodar el teclado.
       *
       * Esto evita el parpadeo al montar todos
       * los campos de domicilio.
       */
      await new Promise<void>(
        (
          resolve,
        ) => {
          setTimeout(
            resolve,
            120,
          );
        },
      );

      onPlaceSelected(
        place,
      );

      setSessionToken(
        createSessionToken(),
      );
    } catch (
    error
    ) {
      console.error(
        'Error obteniendo lugar:',
        error,
      );

      setErrorMessage(
        error instanceof
          Error
          ? error.message
          : 'No se pudo obtener la ubicación seleccionada.',
      );
    } finally {
      setIsSelecting(
        false,
      );
    }
  }

  const isBusy =
    isSearching ||
    isSelecting;

  const suggestionsList =
    suggestions.length >
      0 ? (
      <View
        style={{
          borderRadius:
            9,

          borderWidth:
            1,

          borderColor:
            '#444444',

          overflow:
            'hidden',

          backgroundColor:
            '#222222',

          marginTop:
            dropdownDirection ===
              'down'
              ? 5
              : 0,

          marginBottom:
            dropdownDirection ===
              'up'
              ? 7
              : 0,

          elevation:
            4,
        }}
      >
        {suggestions.map(
          (
            suggestion,
            index,
          ) => (
            <TouchableOpacity
              key={
                suggestion.placeId
              }
              activeOpacity={
                0.7
              }
              disabled={
                disabled ||
                isSelecting
              }
              onPress={
                () => {
                  void handleSuggestionPress(
                    suggestion,
                  );
                }
              }
              style={{
                paddingHorizontal:
                  13,

                paddingVertical:
                  11,

                borderBottomWidth:
                  index ===
                    suggestions.length -
                    1
                    ? 0
                    : 1,

                borderBottomColor:
                  '#333333',

                backgroundColor:
                  '#222222',
              }}
            >
              <Text
                style={{
                  color:
                    '#FFFFFF',

                  fontSize:
                    13,

                  fontWeight:
                    '700',
                }}
              >
                {
                  suggestion.mainText ||
                  suggestion.text
                }
              </Text>

              {!!suggestion
                .secondaryText && (
                  <Text
                    numberOfLines={
                      2
                    }
                    style={{
                      color:
                        '#888888',

                      fontSize:
                        11,

                      marginTop:
                        3,
                    }}
                  >
                    {
                      suggestion.secondaryText
                    }
                  </Text>
                )}
            </TouchableOpacity>
          ),
        )}
      </View>
    ) : null;

  return (
    <View>
      <Text
        style={{
          color:
            '#CCCCCC',

          fontSize:
            12,

          fontWeight:
            '700',

          marginBottom:
            6,
        }}
      >
        Buscar ubicación
      </Text>

      {dropdownDirection ===
        'up' &&
        suggestionsList}

      <View
        style={{
          minHeight:
            46,

          flexDirection:
            'row',

          alignItems:
            'center',

          paddingHorizontal:
            12,

          borderRadius:
            8,

          borderWidth:
            1,

          borderColor:
            '#444444',

          backgroundColor:
            '#252525',
        }}
      >
        <Text
          style={{
            marginRight:
              8,

            fontSize:
              15,
          }}
        >
          🔎
        </Text>

        <TextInput
          ref={
            inputRef
          }
          value={
            searchText
          }
          onChangeText={
            (
              value,
            ) => {
              setSearchText(
                value,
              );

              setErrorMessage(
                null,
              );
            }
          }
          editable={
            !disabled &&
            !isSelecting
          }
          autoCorrect={
            false
          }
          autoCapitalize="none"
          placeholder={
            placeholder
          }
          placeholderTextColor="#777777"
          style={{
            flex:
              1,

            minHeight:
              44,

            color:
              '#FFFFFF',

            fontSize:
              14,
          }}
        />

        {isBusy && (
          <ActivityIndicator
            size="small"
            color={businessTheme.primary}
          />
        )}
      </View>

      {dropdownDirection ===
        'down' &&
        suggestionsList}

      {!!errorMessage && (
        <Text
          style={{
            color:
              '#FF8A80',

            fontSize:
              11,

            marginTop:
              7,
          }}
        >
          {
            errorMessage
          }
        </Text>
      )}
    </View>
  );
}

function createSessionToken():
  string {
  return (
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
      .replace(
        /[xy]/g,
        (
          character,
        ) => {
          const random =
            Math.floor(
              Math.random() *
              16,
            );

          const value =
            character ===
              'x'
              ? random
              : (
                random &
                0x3
              ) |
              0x8;

          return value.toString(
            16,
          );
        },
      )
  );
}