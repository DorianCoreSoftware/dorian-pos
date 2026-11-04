import { useBusiness } from '../../../context/BusinessContext';

import React, {
  useMemo,
  useState,
} from 'react';

import {
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  styles,
  setBrandPrimaryColor,
} from './AdminBusinessHoursSelectors.styles';

import { TimeSelect as CommonTimeSelect } from '../../common/time-select/TimeSelect';

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

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
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
  return (
    <CommonTimeSelect
      value={
        value
      }
      disabled={
        disabled
      }
      onChange={
        onChange
      }
    />
  );
}
