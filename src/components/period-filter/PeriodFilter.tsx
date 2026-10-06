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
  useBusiness,
} from '../../context/BusinessContext';

import {
  withAlpha,
} from '../../theme/brandStyles';

import {
  styles,
} from './PeriodFilter.styles';

export type PeriodFilterValue =
  | 'today'
  | '7days'
  | 'month'
  | 'all'
  | 'custom';

export interface PeriodFilterOption {
  value: PeriodFilterValue;
  label: string;
}

const DEFAULT_OPTIONS: PeriodFilterOption[] = [
  {
    value: 'today',
    label: 'Hoy',
  },
  {
    value: '7days',
    label: 'Últimos 7 días',
  },
  {
    value: 'month',
    label: 'Este mes',
  },
  {
    value: 'all',
    label: 'Todo',
  },
  {
    value: 'custom',
    label: 'Personalizado',
  },
];

interface PeriodFilterProps {
  value: PeriodFilterValue;
  onChange: (
    value: PeriodFilterValue,
  ) => void;
  options?: PeriodFilterOption[];
  label?: string;
}

export function PeriodFilter({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  label = 'Periodo',
}: PeriodFilterProps) {
  const {
    theme,
  } = useBusiness();

  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const selectedLabel =
    useMemo(
      () =>
        options.find(
          option =>
            option.value ===
            value,
        )?.label ??
        'Seleccionar',
      [options, value],
    );

  const handleSelect = (
    nextValue: PeriodFilterValue,
  ): void => {
    onChange(nextValue);
    setIsOpen(false);
  };

  return (
    <>
      <View
        style={styles.container}
      >
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

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.trigger,
            {
              backgroundColor:
                theme.surface,
              borderColor:
                theme.border,
            },
          ]}
          onPress={() =>
            setIsOpen(true)
          }
        >
          <Text
            numberOfLines={1}
            style={[
              styles.triggerText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            {selectedLabel}
          </Text>

          <Text
            style={[
              styles.chevron,
              {
                color:
                  theme.primary,
              },
            ]}
          >
            ▾
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setIsOpen(false)
        }
      >
        <View
          style={styles.overlay}
        >
          <Pressable
            style={styles.backdrop}
            onPress={() =>
              setIsOpen(false)
            }
          />

          <View
            style={[
              styles.modalCard,
              {
                backgroundColor:
                  theme.surface,
                borderColor:
                  theme.border,
              },
            ]}
          >
            <View
              style={styles.modalHeader}
            >
              <View>
                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  Seleccionar periodo
                </Text>

                <Text
                  style={[
                    styles.modalSubtitle,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  Elige el rango que quieres consultar.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() =>
                  setIsOpen(false)
                }
                hitSlop={10}
              >
                <Text
                  style={[
                    styles.closeButtonText,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={styles.options}
            >
              {options.map(
                option => {
                  const isSelected =
                    option.value ===
                    value;

                  return (
                    <TouchableOpacity
                      key={option.value}
                      activeOpacity={0.8}
                      style={[
                        styles.option,
                        {
                          borderColor:
                            isSelected
                              ? theme.primary
                              : theme.border,
                          backgroundColor:
                            isSelected
                              ? withAlpha(
                                theme.primary,
                                0.14,
                              )
                              : theme.background,
                        },
                      ]}
                      onPress={() =>
                        handleSelect(
                          option.value,
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.optionText,
                          {
                            color:
                              isSelected
                                ? theme.primary
                                : theme.text,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>

                      {isSelected ? (
                        <Text
                          style={[
                            styles.check,
                            {
                              color:
                                theme.primary,
                            },
                          ]}
                        >
                          ✓
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                },
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
