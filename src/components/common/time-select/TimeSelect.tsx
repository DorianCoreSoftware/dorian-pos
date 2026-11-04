import React, {
  useMemo,
  useState,
} from 'react';

import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';

import {
  useBusiness,
} from '../../../context/BusinessContext';

export interface TimeSelectProps {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  label?: string;
  style?: ViewStyle;
  minuteStep?: number;
}

type Period =
  | 'AM'
  | 'PM';

interface ParsedTime {
  hour12: number;
  minute: number;
  period: Period;
}

const HOURS =
  Array.from(
    { length: 12 },
    (_, index) =>
      index + 1,
  );

const PERIODS:
  Period[] = [
    'AM',
    'PM',
  ];

function buildMinuteOptions(
  step: number,
): number[] {
  const safeStep =
    Number.isFinite(
      step,
    ) &&
    step >= 1 &&
    step <= 30
      ? Math.floor(
          step,
        )
      : 5;

  const result:
    number[] = [];

  for (
    let minute = 0;
    minute < 60;
    minute += safeStep
  ) {
    result.push(
      minute,
    );
  }

  return result;
}

function normalizeMinute(
  minute: number,
  step: number,
): number {
  const options =
    buildMinuteOptions(
      step,
    );

  let best =
    options[0] ??
    0;

  let bestDistance =
    Math.abs(
      minute -
      best,
    );

  for (
    const option
    of options
  ) {
    const distance =
      Math.abs(
        minute -
        option,
      );

    if (
      distance <
      bestDistance
    ) {
      best =
        option;

      bestDistance =
        distance;
    }
  }

  return best;
}

function parseTime(
  value: string,
): ParsedTime {
  const match =
    /^(\d{1,2}):(\d{2})$/.exec(
      value.trim(),
    );

  const hour24 =
    match
      ? Math.min(
          23,
          Math.max(
            0,
            Number(
              match[1],
            ),
          ),
        )
      : 12;

  const minute =
    match
      ? Math.min(
          59,
          Math.max(
            0,
            Number(
              match[2],
            ),
          ),
        )
      : 0;

  return {
    hour12:
      hour24 % 12 ||
      12,

    minute,

    period:
      hour24 >= 12
        ? 'PM'
        : 'AM',
  };
}

function to24Hour(
  hour12: number,
  minute: number,
  period: Period,
): string {
  let hour =
    hour12 % 12;

  if (
    period ===
    'PM'
  ) {
    hour += 12;
  }

  return `${String(
    hour,
  ).padStart(
    2,
    '0',
  )}:${String(
    minute,
  ).padStart(
    2,
    '0',
  )}`;
}

export function formatTimeLabel(
  value: string,
): string {
  if (!value) {
    return 'Seleccionar hora';
  }

  const parsed =
    parseTime(
      value,
    );

  return `${parsed.hour12}:${String(
    parsed.minute,
  ).padStart(
    2,
    '0',
  )} ${parsed.period}`;
}

interface ScrollColumnProps<T> {
  label: string;
  values: T[];
  selected: T;
  formatValue:
    (value: T) => string;
  onSelect:
    (value: T) => void;
  primaryColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  backgroundColor: string;
  selectedBackground: string;
}

function ScrollColumn<T extends string | number>({
  label,
  values,
  selected,
  formatValue,
  onSelect,
  primaryColor,
  textColor,
  mutedColor,
  borderColor,
  backgroundColor,
  selectedBackground,
}: ScrollColumnProps<T>) {
  return (
    <View
      style={
        styles.mobileColumn
      }
    >
      <Text
        style={[
          styles.mobileColumnLabel,
          {
            color:
              mutedColor,
          },
        ]}
      >
        {label}
      </Text>

      <ScrollView
        style={[
          styles.mobileColumnScroll,
          {
            borderColor,
            backgroundColor,
          },
        ]}
        contentContainerStyle={
          styles.mobileColumnContent
        }
        showsVerticalScrollIndicator={
          false
        }
        nestedScrollEnabled
      >
        {values.map(
          item => {
            const isSelected =
              item ===
              selected;

            return (
              <TouchableOpacity
                key={
                  String(
                    item,
                  )
                }
                onPress={() =>
                  onSelect(
                    item,
                  )
                }
                style={[
                  styles.mobileOption,
                  isSelected
                    ? {
                        borderColor:
                          primaryColor,

                        backgroundColor:
                          selectedBackground,
                      }
                    : {
                        borderColor:
                          'transparent',
                      },
                ]}
              >
                <Text
                  style={[
                    styles.mobileOptionText,
                    {
                      color:
                        isSelected
                          ? primaryColor
                          : textColor,
                    },
                  ]}
                >
                  {formatValue(
                    item,
                  )}
                </Text>
              </TouchableOpacity>
            );
          },
        )}
      </ScrollView>
    </View>
  );
}

export function TimeSelect({
  value,
  disabled = false,
  onChange,
  label,
  style,
  minuteStep = 5,
}: TimeSelectProps) {
  const {
    width,
  } =
    useWindowDimensions();

  const {
    theme,
  } =
    useBusiness();

  const isCompact =
    width <
    600;

  const minuteOptions =
    useMemo(
      () =>
        buildMinuteOptions(
          minuteStep,
        ),
      [
        minuteStep,
      ],
    );

  const [
    visible,
    setVisible,
  ] =
    useState(
      false,
    );

  const initial =
    useMemo(
      () =>
        parseTime(
          value,
        ),
      [
        value,
      ],
    );

  const [
    hour,
    setHour,
  ] =
    useState(
      initial.hour12,
    );

  const [
    minute,
    setMinute,
  ] =
    useState(
      normalizeMinute(
        initial.minute,
        minuteStep,
      ),
    );

  const [
    period,
    setPeriod,
  ] =
    useState<Period>(
      initial.period,
    );

  function open():
    void {
    if (disabled) {
      return;
    }

    const parsed =
      parseTime(
        value,
      );

    setHour(
      parsed.hour12,
    );

    setMinute(
      normalizeMinute(
        parsed.minute,
        minuteStep,
      ),
    );

    setPeriod(
      parsed.period,
    );

    setVisible(
      true,
    );
  }

  function confirm():
    void {
    onChange(
      to24Hour(
        hour,
        minute,
        period,
      ),
    );

    setVisible(
      false,
    );
  }

  return (
    <View
      style={[
        styles.field,
        style,
      ]}
    >
      {label ? (
        <Text
          style={[
            styles.label,
            {
              color:
                theme.textMuted,
            },
          ]}
        >
          {label}
        </Text>
      ) : null}

      <TouchableOpacity
        disabled={
          disabled
        }
        onPress={
          open
        }
        style={[
          styles.button,
          {
            borderColor:
              theme.border,

            backgroundColor:
              theme.background,

            opacity:
              disabled
                ? 0.5
                : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.clockIcon,
            {
              color:
                theme.primary,
            },
          ]}
        >
          ◷
        </Text>

        <Text
          numberOfLines={
            1
          }
          style={[
            styles.buttonText,
            {
              color:
                value
                  ? theme.text
                  : theme.textMuted,
            },
          ]}
        >
          {formatTimeLabel(
            value,
          )}
        </Text>

        <Text
          style={[
            styles.chevron,
            {
              color:
                theme.textMuted,
            },
          ]}
        >
          ⌄
        </Text>
      </TouchableOpacity>

      <Modal
        transparent
        visible={
          visible
        }
        animationType="fade"
        onRequestClose={() =>
          setVisible(
            false,
          )
        }
      >
        <Pressable
          style={
            styles.backdrop
          }
          onPress={() =>
            setVisible(
              false,
            )
          }
        >
          <Pressable
            onPress={() =>
              undefined
            }
            style={[
              styles.modal,
              isCompact
                ? styles.modalCompact
                : styles.modalWide,
              {
                backgroundColor:
                  theme.surface,

                borderColor:
                  theme.border,
              },
            ]}
          >
            <View
              style={
                styles.header
              }
            >
              <View
                style={
                  styles.headerText
                }
              >
                <Text
                  style={[
                    styles.title,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  Seleccionar hora
                </Text>

                <Text
                  style={[
                    styles.subtitle,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  {isCompact
                    ? 'Desliza y elige cada valor.'
                    : 'Elige hora, minutos y periodo.'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  setVisible(
                    false,
                  )
                }
                style={[
                  styles.closeButton,
                  {
                    borderColor:
                      theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.closeText,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  ×
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.previewCard,
                {
                  borderColor:
                    theme.border,

                  backgroundColor:
                    theme.background,
                },
              ]}
            >
              <Text
                style={[
                  styles.previewLabel,
                  {
                    color:
                      theme.textMuted,
                  },
                ]}
              >
                HORA SELECCIONADA
              </Text>

              <Text
                style={[
                  styles.preview,
                  {
                    color:
                      theme.primary,
                  },
                ]}
              >
                {hour}:
                {String(
                  minute,
                ).padStart(
                  2,
                  '0',
                )}{' '}
                {period}
              </Text>
            </View>

            {isCompact ? (
              <View
                style={
                  styles.mobileSelectorRow
                }
              >
                <ScrollColumn
                  label="HORA"
                  values={
                    HOURS
                  }
                  selected={
                    hour
                  }
                  formatValue={
                    item =>
                      String(
                        item,
                      )
                  }
                  onSelect={
                    setHour
                  }
                  primaryColor={
                    theme.primary
                  }
                  textColor={
                    theme.text
                  }
                  mutedColor={
                    theme.textMuted
                  }
                  borderColor={
                    theme.border
                  }
                  backgroundColor={
                    theme.background
                  }
                  selectedBackground={
                    theme.surfaceAlt
                  }
                />

                <ScrollColumn
                  label="MIN"
                  values={
                    minuteOptions
                  }
                  selected={
                    minute
                  }
                  formatValue={
                    item =>
                      String(
                        item,
                      ).padStart(
                        2,
                        '0',
                      )
                  }
                  onSelect={
                    setMinute
                  }
                  primaryColor={
                    theme.primary
                  }
                  textColor={
                    theme.text
                  }
                  mutedColor={
                    theme.textMuted
                  }
                  borderColor={
                    theme.border
                  }
                  backgroundColor={
                    theme.background
                  }
                  selectedBackground={
                    theme.surfaceAlt
                  }
                />

                <ScrollColumn
                  label="PERIODO"
                  values={
                    PERIODS
                  }
                  selected={
                    period
                  }
                  formatValue={
                    item =>
                      item
                  }
                  onSelect={
                    setPeriod
                  }
                  primaryColor={
                    theme.primary
                  }
                  textColor={
                    theme.text
                  }
                  mutedColor={
                    theme.textMuted
                  }
                  borderColor={
                    theme.border
                  }
                  backgroundColor={
                    theme.background
                  }
                  selectedBackground={
                    theme.surfaceAlt
                  }
                />
              </View>
            ) : (
              <>
                <Text
                  style={[
                    styles.sectionLabel,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  HORA
                </Text>

                <View
                  style={
                    styles.hourGrid
                  }
                >
                  {HOURS.map(
                    item => {
                      const selected =
                        item ===
                        hour;

                      return (
                        <TouchableOpacity
                          key={
                            item
                          }
                          onPress={() =>
                            setHour(
                              item,
                            )
                          }
                          style={[
                            styles.hourOption,
                            {
                              borderColor:
                                selected
                                  ? theme.primary
                                  : theme.border,

                              backgroundColor:
                                selected
                                  ? theme.surfaceAlt
                                  : theme.background,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.optionText,
                              {
                                color:
                                  selected
                                    ? theme.primary
                                    : theme.text,
                              },
                            ]}
                          >
                            {item}
                          </Text>
                        </TouchableOpacity>
                      );
                    },
                  )}
                </View>

                <Text
                  style={[
                    styles.sectionLabel,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  MINUTOS
                </Text>

                <View
                  style={
                    styles.minuteGrid
                  }
                >
                  {minuteOptions.map(
                    item => {
                      const selected =
                        item ===
                        minute;

                      return (
                        <TouchableOpacity
                          key={
                            item
                          }
                          onPress={() =>
                            setMinute(
                              item,
                            )
                          }
                          style={[
                            styles.minuteOption,
                            {
                              borderColor:
                                selected
                                  ? theme.primary
                                  : theme.border,

                              backgroundColor:
                                selected
                                  ? theme.surfaceAlt
                                  : theme.background,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.minuteText,
                              {
                                color:
                                  selected
                                    ? theme.primary
                                    : theme.text,
                              },
                            ]}
                          >
                            {String(
                              item,
                            ).padStart(
                              2,
                              '0',
                            )}
                          </Text>
                        </TouchableOpacity>
                      );
                    },
                  )}
                </View>

                <Text
                  style={[
                    styles.sectionLabel,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  PERIODO
                </Text>

                <View
                  style={[
                    styles.periodSegment,
                    {
                      borderColor:
                        theme.border,

                      backgroundColor:
                        theme.background,
                    },
                  ]}
                >
                  {PERIODS.map(
                    item => {
                      const selected =
                        item ===
                        period;

                      return (
                        <TouchableOpacity
                          key={
                            item
                          }
                          onPress={() =>
                            setPeriod(
                              item,
                            )
                          }
                          style={[
                            styles.periodButton,
                            selected
                              ? {
                                  backgroundColor:
                                    theme.surfaceAlt,
                                }
                              : null,
                          ]}
                        >
                          <Text
                            style={[
                              styles.periodText,
                              {
                                color:
                                  selected
                                    ? theme.primary
                                    : theme.textMuted,
                              },
                            ]}
                          >
                            {item}
                          </Text>
                        </TouchableOpacity>
                      );
                    },
                  )}
                </View>
              </>
            )}

            <View
              style={
                styles.footer
              }
            >
              <TouchableOpacity
                onPress={() =>
                  setVisible(
                    false,
                  )
                }
                style={[
                  styles.cancelButton,
                  {
                    borderColor:
                      theme.border,

                    backgroundColor:
                      theme.background,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.cancelText,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={
                  confirm
                }
                style={[
                  styles.confirmButton,
                  {
                    backgroundColor:
                      theme.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.confirmText,
                    {
                      color:
                        theme.onPrimary,
                    },
                  ]}
                >
                  Aceptar
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles =
  StyleSheet.create({
    field: {
      minWidth:
        0,
    },

    label: {
      marginBottom:
        6,

      fontSize:
        10,

      fontWeight:
        '900',

      textTransform:
        'uppercase',
    },

    button: {
      minHeight:
        44,

      width:
        '100%',

      borderWidth:
        1,

      borderRadius:
        9,

      paddingHorizontal:
        12,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        9,
    },

    clockIcon: {
      fontSize:
        17,

      fontWeight:
        '900',
    },

    buttonText: {
      flex:
        1,

      fontSize:
        13,

      fontWeight:
        '800',
    },

    chevron: {
      fontSize:
        14,

      fontWeight:
        '900',
    },

    backdrop: {
      flex:
        1,

      backgroundColor:
        'rgba(0,0,0,0.72)',

      alignItems:
        'center',

      justifyContent:
        'center',

      padding:
        16,
    },

    modal: {
      width:
        '100%',

      borderWidth:
        1,

      borderRadius:
        18,

      padding:
        18,
    },

    modalWide: {
      maxWidth:
        470,
    },

    modalCompact: {
      maxWidth:
        390,
    },

    header: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      justifyContent:
        'space-between',

      gap:
        12,

      marginBottom:
        14,
    },

    headerText: {
      flex:
        1,
    },

    title: {
      fontSize:
        17,

      fontWeight:
        '900',
    },

    subtitle: {
      fontSize:
        11,

      marginTop:
        4,
    },

    closeButton: {
      width:
        36,

      height:
        36,

      borderWidth:
        1,

      borderRadius:
        18,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    closeText: {
      fontSize:
        23,

      lineHeight:
        25,

      fontWeight:
        '700',
    },

    previewCard: {
      borderWidth:
        1,

      borderRadius:
        12,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingVertical:
        12,

      marginBottom:
        14,
    },

    previewLabel: {
      fontSize:
        8,

      fontWeight:
        '900',

      letterSpacing:
        0.8,
    },

    preview: {
      fontSize:
        24,

      fontWeight:
        '900',

      marginTop:
        2,
    },

    sectionLabel: {
      fontSize:
        9,

      fontWeight:
        '900',

      letterSpacing:
        0.7,

      marginTop:
        9,

      marginBottom:
        7,
    },

    hourGrid: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      gap:
        7,
    },

    hourOption: {
      width:
        '23%',

      minHeight:
        40,

      borderWidth:
        1,

      borderRadius:
        9,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    optionText: {
      fontSize:
        13,

      fontWeight:
        '900',
    },

    minuteGrid: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      gap:
        7,
    },

    minuteOption: {
      width:
        '15%',

      minHeight:
        38,

      borderWidth:
        1,

      borderRadius:
        9,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    minuteText: {
      fontSize:
        12,

      fontWeight:
        '800',
    },

    periodSegment: {
      flexDirection:
        'row',

      borderWidth:
        1,

      borderRadius:
        10,

      padding:
        3,
    },

    periodButton: {
      flex:
        1,

      minHeight:
        38,

      borderRadius:
        7,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    periodText: {
      fontSize:
        13,

      fontWeight:
        '900',
    },

    mobileSelectorRow: {
      flexDirection:
        'row',

      gap:
        8,
    },

    mobileColumn: {
      flex:
        1,
    },

    mobileColumnLabel: {
      fontSize:
        9,

      fontWeight:
        '900',

      letterSpacing:
        0.5,

      textAlign:
        'center',

      marginBottom:
        6,
    },

    mobileColumnScroll: {
      height:
        205,

      borderWidth:
        1,

      borderRadius:
        10,
    },

    mobileColumnContent: {
      padding:
        6,

      gap:
        4,
    },

    mobileOption: {
      minHeight:
        39,

      borderWidth:
        1,

      borderRadius:
        8,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    mobileOptionText: {
      fontSize:
        13,

      fontWeight:
        '900',
    },

    footer: {
      flexDirection:
        'row',

      gap:
        10,

      marginTop:
        18,
    },

    cancelButton: {
      flex:
        1,

      minHeight:
        46,

      borderWidth:
        1,

      borderRadius:
        10,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    cancelText: {
      fontSize:
        13,

      fontWeight:
        '900',
    },

    confirmButton: {
      flex:
        1.35,

      minHeight:
        46,

      borderRadius:
        10,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    confirmText: {
      fontSize:
        13,

      fontWeight:
        '900',
    },
  });
