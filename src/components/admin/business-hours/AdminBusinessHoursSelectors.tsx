import { useBusiness } from '../../../context/BusinessContext';

import React, {
  useMemo,
  useState,
} from 'react';

import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  styles,
  setBrandPrimaryColor,
} from './AdminBusinessHoursSelectors.styles';

interface DateCalendarSelectProps {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

interface TimeSelectProps {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const WEEK_DAYS = [
  'D',
  'L',
  'M',
  'M',
  'J',
  'V',
  'S',
];

function parseDateValue(
  value: string,
): Date {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value,
    );

  if (!match) {
    return new Date();
  }

  const year =
    Number(
      match[1],
    );

  const month =
    Number(
      match[2],
    ) - 1;

  const day =
    Number(
      match[3],
    );

  const date =
    new Date(
      year,
      month,
      day,
      12,
      0,
      0,
      0,
    );

  return Number.isNaN(
    date.getTime(),
  )
    ? new Date()
    : date;
}

function formatDateValue(
  date: Date,
): string {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      '0',
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      '0',
    );

  return `${year}-${month}-${day}`;
}

function formatDateLabel(
  value: string,
): string {
  if (!value) {
    return 'Seleccionar fecha';
  }

  const date =
    parseDateValue(
      value,
    );

  return new Intl.DateTimeFormat(
    'es-MX',
    {
      day:
        '2-digit',

      month:
        'long',

      year:
        'numeric',
    },
  ).format(
    date,
  );
}

function buildCalendarDays(
  monthDate: Date,
): Array<
  Date | null
> {
  const year =
    monthDate.getFullYear();

  const month =
    monthDate.getMonth();

  const firstDay =
    new Date(
      year,
      month,
      1,
      12,
    );

  const lastDay =
    new Date(
      year,
      month + 1,
      0,
      12,
    );

  const result:
    Array<Date | null> = [];

  for (
    let index = 0;
    index < firstDay.getDay();
    index += 1
  ) {
    result.push(
      null,
    );
  }

  for (
    let day = 1;
    day <= lastDay.getDate();
    day += 1
  ) {
    result.push(
      new Date(
        year,
        month,
        day,
        12,
      ),
    );
  }

  while (
    result.length %
      7 !==
    0
  ) {
    result.push(
      null,
    );
  }

  return result;
}

const WHEEL_ITEM_HEIGHT =
  44;

const WHEEL_VISIBLE_ITEMS =
  5;

const WHEEL_VERTICAL_PADDING =
  (
    WHEEL_VISIBLE_ITEMS -
    1
  ) /
  2 *
  WHEEL_ITEM_HEIGHT;

function formatTimeLabel(
  value: string,
): string {
  const [
    hourText,
    minuteText,
  ] = value.split(':');

  const hour =
    Number(
      hourText,
    );

  if (
    !Number.isFinite(
      hour,
    )
  ) {
    return value;
  }

  const suffix =
    hour >= 12
      ? 'PM'
      : 'AM';

  const hour12 =
    hour % 12 ||
    12;

  return `${hour12}:${minuteText} ${suffix}`;
}

function parseTimeValue(
  value: string,
): {
  hour12: number;
  minute: number;
  period: 'AM' | 'PM';
} {
  const match =
    /^(\d{2}):(\d{2})$/.exec(
      value,
    );

  if (!match) {
    return {
      hour12:
        5,

      minute:
        0,

      period:
        'PM',
    };
  }

  const hour24 =
    Number(
      match[1],
    );

  const minute =
    Number(
      match[2],
    );

  return {
    hour12:
      hour24 % 12 ||
      12,

    minute:
      Number.isFinite(
        minute,
      )
        ? Math.min(
            59,
            Math.max(
              0,
              minute,
            ),
          )
        : 0,

    period:
      hour24 >= 12
        ? 'PM'
        : 'AM',
  };
}

function to24HourValue(
  hour12: number,
  minute: number,
  period: 'AM' | 'PM',
): string {
  let hour24 =
    hour12 % 12;

  if (
    period ===
    'PM'
  ) {
    hour24 += 12;
  }

  return `${String(
    hour24,
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

export function DateCalendarSelect({
  value,
  disabled = false,
  onChange,
}: DateCalendarSelectProps) {
  const { theme: businessTheme } = useBusiness();
    setBrandPrimaryColor(businessTheme.primary);

  const [
    visible,
    setVisible,
  ] = useState(
    false,
  );

  const [
    visibleMonth,
    setVisibleMonth,
  ] = useState(
    () => {
      const initial =
        parseDateValue(
          value,
        );

      return new Date(
        initial.getFullYear(),
        initial.getMonth(),
        1,
        12,
      );
    },
  );

  const days =
    useMemo(
      () =>
        buildCalendarDays(
          visibleMonth,
        ),
      [
        visibleMonth,
      ],
    );

  const selectedValue =
    value || null;

  function open():
    void {
    if (disabled) {
      return;
    }

    const initial =
      parseDateValue(
        value,
      );

    setVisibleMonth(
      new Date(
        initial.getFullYear(),
        initial.getMonth(),
        1,
        12,
      ),
    );

    setVisible(
      true,
    );
  }

  function moveMonth(
    difference: number,
  ): void {
    setVisibleMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() +
            difference,
          1,
          12,
        ),
    );
  }

  return (
    <>
      <TouchableOpacity
        disabled={
          disabled
        }
        onPress={
          open
        }
        style={[
          styles.selectButton,

          disabled &&
          styles.selectButtonDisabled,
        ]}
      >
        <Text
          style={[
            styles.selectButtonText,

            !value &&
            styles.selectPlaceholder,
          ]}
        >
          {formatDateLabel(
            value,
          )}
        </Text>

        <Text
          style={
            styles.selectChevron
          }
        >
          📅
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
        <View
          style={
            styles.modalBackdrop
          }
        >
          <Pressable
            style={
              styles.modalDismissArea
            }
            onPress={() =>
              setVisible(
                false,
              )
            }
          />

          <View
            style={
              styles.calendarModal
            }
          >
            <View
              style={
                styles.calendarHeader
              }
            >
              <TouchableOpacity
                onPress={() =>
                  moveMonth(
                    -1,
                  )
                }
                style={
                  styles.calendarArrowButton
                }
              >
                <Text
                  style={
                    styles.calendarArrow
                  }
                >
                  ‹
                </Text>
              </TouchableOpacity>

              <Text
                style={
                  styles.calendarTitle
                }
              >
                {
                  MONTH_NAMES[
                    visibleMonth.getMonth()
                  ]
                }{' '}
                {
                  visibleMonth.getFullYear()
                }
              </Text>

              <TouchableOpacity
                onPress={() =>
                  moveMonth(
                    1,
                  )
                }
                style={
                  styles.calendarArrowButton
                }
              >
                <Text
                  style={
                    styles.calendarArrow
                  }
                >
                  ›
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={
                styles.calendarWeekRow
              }
            >
              {WEEK_DAYS.map(
                (
                  day,
                  index,
                ) => (
                  <Text
                    key={`${day}-${index}`}
                    style={
                      styles.calendarWeekDay
                    }
                  >
                    {day}
                  </Text>
                ),
              )}
            </View>

            <View
              style={
                styles.calendarGrid
              }
            >
              {days.map(
                (
                  day,
                  index,
                ) => {
                  if (!day) {
                    return (
                      <View
                        key={`empty-${index}`}
                        style={
                          styles.calendarDayCell
                        }
                      />
                    );
                  }

                  const dateValue =
                    formatDateValue(
                      day,
                    );

                  const isSelected =
                    dateValue ===
                    selectedValue;

                  return (
                    <TouchableOpacity
                      key={
                        dateValue
                      }
                      onPress={() => {
                        onChange(
                          dateValue,
                        );

                        setVisible(
                          false,
                        );
                      }}
                      style={[
                        styles.calendarDayCell,

                        isSelected &&
                        styles.calendarDayCellSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,

                          isSelected &&
                          styles.calendarDayTextSelected,
                        ]}
                      >
                        {
                          day.getDate()
                        }
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </View>

            <TouchableOpacity
              onPress={() => {
                const today =
                  new Date();

                const todayValue =
                  formatDateValue(
                    today,
                  );

                onChange(
                  todayValue,
                );

                setVisible(
                  false,
                );
              }}
              style={
                styles.todayButton
              }
            >
              <Text
                style={
                  styles.todayButtonText
                }
              >
                Hoy
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

export function TimeSelect({
  value,
  disabled = false,
  onChange,
}: TimeSelectProps) {
  const { theme: businessTheme } = useBusiness();
  setBrandPrimaryColor(businessTheme.primary);
  const [
    visible,
    setVisible,
  ] = useState(
    false,
  );

  const initialTime =
    parseTimeValue(
      value,
    );

  const [
    selectedHour,
    setSelectedHour,
  ] = useState(
    initialTime.hour12,
  );

  const [
    selectedMinute,
    setSelectedMinute,
  ] = useState(
    initialTime.minute,
  );

  const [
    selectedPeriod,
    setSelectedPeriod,
  ] = useState<
    'AM' | 'PM'
  >(
    initialTime.period,
  );

  const hourRef =
    React.useRef<
      ScrollView | null
    >(
      null,
    );

  const minuteRef =
    React.useRef<
      ScrollView | null
    >(
      null,
    );

  const periodRef =
    React.useRef<
      ScrollView | null
    >(
      null,
    );

  const hours =
    useMemo(
      () =>
        Array.from(
          {
            length:
              12,
          },
          (
            _,
            index,
          ) =>
            index + 1,
        ),
      [],
    );

  const minutes =
    useMemo(
      () =>
        Array.from(
          {
            length:
              60,
          },
          (
            _,
            index,
          ) =>
            index,
        ),
      [],
    );

  const periods:
    Array<'AM' | 'PM'> =
    [
      'AM',
      'PM',
    ];

  function open():
    void {
    if (disabled) {
      return;
    }

    const parsed =
      parseTimeValue(
        value,
      );

    setSelectedHour(
      parsed.hour12,
    );

    setSelectedMinute(
      parsed.minute,
    );

    setSelectedPeriod(
      parsed.period,
    );

    setVisible(
      true,
    );

    setTimeout(
      () => {
        hourRef.current
          ?.scrollTo({
            y:
              (
                parsed.hour12 -
                1
              ) *
              WHEEL_ITEM_HEIGHT,

            animated:
              false,
          });

        minuteRef.current
          ?.scrollTo({
            y:
              parsed.minute *
              WHEEL_ITEM_HEIGHT,

            animated:
              false,
          });

        periodRef.current
          ?.scrollTo({
            y:
              (
                parsed.period ===
                'PM'
                  ? 1
                  : 0
              ) *
              WHEEL_ITEM_HEIGHT,

            animated:
              false,
          });
      },
      0,
    );
  }

  function getIndexFromOffset(
    offsetY: number,
    maxIndex: number,
  ): number {
    return Math.min(
      maxIndex,
      Math.max(
        0,
        Math.round(
          offsetY /
          WHEEL_ITEM_HEIGHT,
        ),
      ),
    );
  }

  function handleConfirm():
    void {
    onChange(
      to24HourValue(
        selectedHour,
        selectedMinute,
        selectedPeriod,
      ),
    );

    setVisible(
      false,
    );
  }

  return (
    <>
      <TouchableOpacity
        disabled={
          disabled
        }
        onPress={
          open
        }
        style={[
          styles.selectButton,

          disabled &&
          styles.selectButtonDisabled,
        ]}
      >
        <Text
          style={
            styles.selectButtonText
          }
        >
          {formatTimeLabel(
            value,
          )}
        </Text>

        <Text
          style={
            styles.selectChevron
          }
        >
          ◉
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
        <View
          style={
            styles.modalBackdrop
          }
        >
          <Pressable
            style={
              styles.modalDismissArea
            }
            onPress={() =>
              setVisible(
                false,
              )
            }
          />

          <View
            style={
              styles.wheelModal
            }
          >
            <View
              style={
                styles.timeModalHeader
              }
            >
              <Text
                style={
                  styles.timeModalTitle
                }
              >
                Seleccionar hora
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setVisible(
                    false,
                  )
                }
                style={
                  styles.closeButton
                }
              >
                <Text
                  style={
                    styles.closeButtonText
                  }
                >
                  ×
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={
                styles.wheelContainer
              }
            >
              <View
                pointerEvents="none"
                style={
                  styles.wheelSelection
                }
              />

              <View
                style={
                  styles.wheelColumn
                }
              >
                <Text
                  style={
                    styles.wheelColumnLabel
                  }
                >
                  HORA
                </Text>

                <ScrollView
                  ref={
                    hourRef
                  }
                  showsVerticalScrollIndicator={
                    false
                  }
                  snapToInterval={
                    WHEEL_ITEM_HEIGHT
                  }
                  decelerationRate="fast"
                  contentContainerStyle={{
                    paddingVertical:
                      WHEEL_VERTICAL_PADDING,
                  }}
                  onMomentumScrollEnd={
                    (event) => {
                      const index =
                        getIndexFromOffset(
                          event.nativeEvent
                            .contentOffset
                            .y,
                          hours.length -
                            1,
                        );

                      setSelectedHour(
                        hours[
                          index
                        ],
                      );
                    }
                  }
                  onScrollEndDrag={
                    (event) => {
                      const index =
                        getIndexFromOffset(
                          event.nativeEvent
                            .contentOffset
                            .y,
                          hours.length -
                            1,
                        );

                      setSelectedHour(
                        hours[
                          index
                        ],
                      );
                    }
                  }
                >
                  {hours.map(
                    (hour) => (
                      <View
                        key={
                          hour
                        }
                        style={
                          styles.wheelItem
                        }
                      >
                        <Text
                          style={[
                            styles.wheelItemText,

                            selectedHour ===
                              hour &&
                            styles.wheelItemTextSelected,
                          ]}
                        >
                          {hour}
                        </Text>
                      </View>
                    ),
                  )}
                </ScrollView>
              </View>

              <View
                style={
                  styles.wheelColumn
                }
              >
                <Text
                  style={
                    styles.wheelColumnLabel
                  }
                >
                  MIN
                </Text>

                <ScrollView
                  ref={
                    minuteRef
                  }
                  showsVerticalScrollIndicator={
                    false
                  }
                  snapToInterval={
                    WHEEL_ITEM_HEIGHT
                  }
                  decelerationRate="fast"
                  contentContainerStyle={{
                    paddingVertical:
                      WHEEL_VERTICAL_PADDING,
                  }}
                  onMomentumScrollEnd={
                    (event) => {
                      const index =
                        getIndexFromOffset(
                          event.nativeEvent
                            .contentOffset
                            .y,
                          minutes.length -
                            1,
                        );

                      setSelectedMinute(
                        minutes[
                          index
                        ],
                      );
                    }
                  }
                  onScrollEndDrag={
                    (event) => {
                      const index =
                        getIndexFromOffset(
                          event.nativeEvent
                            .contentOffset
                            .y,
                          minutes.length -
                            1,
                        );

                      setSelectedMinute(
                        minutes[
                          index
                        ],
                      );
                    }
                  }
                >
                  {minutes.map(
                    (minute) => (
                      <View
                        key={
                          minute
                        }
                        style={
                          styles.wheelItem
                        }
                      >
                        <Text
                          style={[
                            styles.wheelItemText,

                            selectedMinute ===
                              minute &&
                            styles.wheelItemTextSelected,
                          ]}
                        >
                          {String(
                            minute,
                          ).padStart(
                            2,
                            '0',
                          )}
                        </Text>
                      </View>
                    ),
                  )}
                </ScrollView>
              </View>

              <View
                style={
                  styles.wheelColumn
                }
              >
                <Text
                  style={
                    styles.wheelColumnLabel
                  }
                >
                  PERIODO
                </Text>

                <ScrollView
                  ref={
                    periodRef
                  }
                  showsVerticalScrollIndicator={
                    false
                  }
                  snapToInterval={
                    WHEEL_ITEM_HEIGHT
                  }
                  decelerationRate="fast"
                  contentContainerStyle={{
                    paddingVertical:
                      WHEEL_VERTICAL_PADDING,
                  }}
                  onMomentumScrollEnd={
                    (event) => {
                      const index =
                        getIndexFromOffset(
                          event.nativeEvent
                            .contentOffset
                            .y,
                          periods.length -
                            1,
                        );

                      setSelectedPeriod(
                        periods[
                          index
                        ],
                      );
                    }
                  }
                  onScrollEndDrag={
                    (event) => {
                      const index =
                        getIndexFromOffset(
                          event.nativeEvent
                            .contentOffset
                            .y,
                          periods.length -
                            1,
                        );

                      setSelectedPeriod(
                        periods[
                          index
                        ],
                      );
                    }
                  }
                >
                  {periods.map(
                    (period) => (
                      <View
                        key={
                          period
                        }
                        style={
                          styles.wheelItem
                        }
                      >
                        <Text
                          style={[
                            styles.wheelItemText,

                            selectedPeriod ===
                              period &&
                            styles.wheelItemTextSelected,
                          ]}
                        >
                          {period}
                        </Text>
                      </View>
                    ),
                  )}
                </ScrollView>
              </View>
            </View>

            <View
              style={
                styles.wheelPreview
              }
            >
              <Text
                style={
                  styles.wheelPreviewText
                }
              >
                {selectedHour}:
                {String(
                  selectedMinute,
                ).padStart(
                  2,
                  '0',
                )}{' '}
                {
                  selectedPeriod
                }
              </Text>
            </View>

            <TouchableOpacity
              onPress={
                handleConfirm
              }
              style={
                styles.wheelConfirmButton
              }
            >
              <Text
                style={
                  styles.wheelConfirmButtonText
                }
              >
                Aceptar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}