import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getGooglePlaceDetails, GooglePlaceSelection, GooglePlaceSuggestion, searchGooglePlaces } from '../../services/googlePlacesService';


interface GooglePlaceSearchProps {
  disabled?: boolean;

  initialValue?: string;

  placeholder?: string;

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
  onPlaceSelected,
}: GooglePlaceSearchProps) {
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

      setSuggestions(
        result.slice(
          0,
          6,
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

      skipNextSearchRef.current =
        true;

      setSearchText(
        '',
      );

      setSuggestions(
        [],
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

  return (
    <View
      style={{
        position:
          'relative',

        zIndex:
          1000,
      }}
    >
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
            color="#FFBF00"
          />
        )}
      </View>

      {suggestions.length >
        0 && (
          <View
            style={{
              marginTop:
                4,

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

              elevation:
                12,

              zIndex:
                9999,
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
        )}

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