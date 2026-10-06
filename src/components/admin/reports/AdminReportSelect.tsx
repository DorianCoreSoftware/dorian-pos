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
  useBusiness,
} from '../../../context/BusinessContext';

import {
  withAlpha,
} from '../../../theme/brandStyles';

import {
  reportSelectStyles as styles,
} from './AdminReportSelect.styles';

export interface AdminReportSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface AdminReportSelectProps {
  label: string;
  value: string;
  options: AdminReportSelectOption[];
  onChange: (value: string) => void;
  modalTitle?: string;
  modalSubtitle?: string;
}

export function AdminReportSelect({
  label,
  value,
  options,
  onChange,
  modalTitle = 'Seleccionar opción',
  modalSubtitle = 'Elige lo que quieres consultar.',
}: AdminReportSelectProps) {
  const {
    theme,
  } = useBusiness();

  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const selectedOption =
    useMemo(
      () =>
        options.find(
          option =>
            option.value === value,
        ) ?? null,
      [options, value],
    );

  const handleSelect = (
    nextValue: string,
  ): void => {
    onChange(nextValue);
    setIsOpen(false);
  };

  return (
    <>
      <View style={styles.container}>
        <Text
          style={[
            styles.label,
            {
              color: theme.textMuted,
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
          <View style={styles.triggerContent}>
            <Text
              numberOfLines={1}
              style={[
                styles.triggerText,
                {
                  color: theme.text,
                },
              ]}
            >
              {selectedOption?.label ??
                'Seleccionar'}
            </Text>

            {selectedOption?.description ? (
              <Text
                numberOfLines={1}
                style={[
                  styles.triggerDescription,
                  {
                    color:
                      theme.textMuted,
                  },
                ]}
              >
                {selectedOption.description}
              </Text>
            ) : null}
          </View>

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
        <View style={styles.overlay}>
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
            <View style={styles.modalHeader}>
              <View style={styles.modalHeading}>
                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  {modalTitle}
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
                  {modalSubtitle}
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

            <ScrollView
              style={styles.optionsScroll}
              contentContainerStyle={styles.options}
              showsVerticalScrollIndicator={false}
            >
              {options.map(
                option => {
                  const selected =
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
                            selected
                              ? theme.primary
                              : theme.border,
                          backgroundColor:
                            selected
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
                      <View style={styles.optionContent}>
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
                          {option.label}
                        </Text>

                        {option.description ? (
                          <Text
                            style={[
                              styles.optionDescription,
                              {
                                color:
                                  theme.textMuted,
                              },
                            ]}
                          >
                            {option.description}
                          </Text>
                        ) : null}
                      </View>

                      {selected ? (
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
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
