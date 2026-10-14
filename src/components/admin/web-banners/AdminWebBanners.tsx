import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import {
  createWebBanner,
  deleteWebBanner,
  getAdminWebBanners,
  setWebBannerActive,
  updateWebBanner,
  WebBanner,
} from '../../../services/webBannerService';

import {
  deleteWebBannerImage,
  uploadWebBannerImage,
} from '../../../services/webBannerImageService';

import {
  useBusiness,
} from '../../../context/BusinessContext';

import {
  styles,
  setBrandPrimaryColor,
} from './AdminWebBanners.styles';

interface BannerFormState {
  title: string;
  description: string;
  sortOrder: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

type DatePickerField =
  | 'startsAt'
  | 'endsAt'
  | null;

const INITIAL_FORM:
  BannerFormState = {
  title: '',
  description: '',
  sortOrder: '0',
  startsAt: '',
  endsAt: '',
  isActive: true,
};

export function AdminWebBanners() {
  const {
    theme,
  } = useBusiness();

  setBrandPrimaryColor(
    theme.primary,
  );

  const [
    banners,
    setBanners,
  ] = useState<WebBanner[]>([]);

  const [
    selectedBanner,
    setSelectedBanner,
  ] = useState<WebBanner | null>(
    null,
  );

  const [
    form,
    setForm,
  ] = useState<BannerFormState>(
    INITIAL_FORM,
  );

  const [
    pendingImage,
    setPendingImage,
  ] = useState<
    ImagePicker.ImagePickerAsset | null
  >(null);

  const [
    isModalVisible,
    setIsModalVisible,
  ] = useState(false);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isProcessing,
    setIsProcessing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null,
  );

  const [
    datePickerField,
    setDatePickerField,
  ] = useState<DatePickerField>(
    null,
  );

  const loadData =
    useCallback(
      async (): Promise<void> => {
        try {
          setIsLoading(true);
          setErrorMessage(null);

          const loadedBanners =
            await getAdminWebBanners();

          setBanners(
            loadedBanners,
          );
        } catch (error) {
          console.error(
            'Error cargando publicidad web:',
            error,
          );

          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudo cargar la publicidad web.',
          );
        } finally {
          setIsLoading(false);
        }
      },
      [],
    );

  useEffect(
    () => {
      void loadData();
    },
    [loadData],
  );

  function openCreateModal():
    void {
    const nextOrder =
      banners.length > 0
        ? Math.max(
          ...banners.map(
            banner =>
              banner.sortOrder,
          ),
        ) + 1
        : 1;

    setSelectedBanner(null);
    setPendingImage(null);
    setForm({
      ...INITIAL_FORM,
      sortOrder:
        String(nextOrder),
    });
    setDatePickerField(null);
    setIsModalVisible(true);
  }

  function openEditModal(
    banner: WebBanner,
  ): void {
    setSelectedBanner(
      banner,
    );

    setPendingImage(null);

    setForm({
      title:
        banner.title ?? '',
      description:
        banner.description ?? '',
      sortOrder:
        String(banner.sortOrder),
      startsAt:
        formatDateInput(
          banner.startsAt,
        ),
      endsAt:
        formatDateInput(
          banner.endsAt,
        ),
      isActive:
        banner.isActive,
    });

    setDatePickerField(null);
    setIsModalVisible(true);
  }

  function closeModal():
    void {
    if (isProcessing) {
      return;
    }

    setDatePickerField(null);
    setIsModalVisible(false);
    setSelectedBanner(null);
    setPendingImage(null);
    setForm(INITIAL_FORM);
  }

  function openDatePicker(
    field: Exclude<
      DatePickerField,
      null
    >,
  ): void {
    if (isProcessing) {
      return;
    }

    setDatePickerField(
      field,
    );
  }

  function handleDateChange(
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ): void {
    const field =
      datePickerField;

    setDatePickerField(
      null,
    );

    if (
      event.type === 'dismissed' ||
      !selectedDate ||
      !field
    ) {
      return;
    }

    const formattedDate =
      formatPickerDate(
        selectedDate,
      );

    setForm(
      current => ({
        ...current,
        [field]:
          formattedDate,
      }),
    );
  }

  function clearDate(
    field: Exclude<
      DatePickerField,
      null
    >,
  ): void {
    setForm(
      current => ({
        ...current,
        [field]: '',
      }),
    );
  }

  async function handlePickImage():
    Promise<void> {
    if (isProcessing) {
      return;
    }

    const permission =
      await ImagePicker
        .requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permiso requerido',
        'Necesitamos acceso a tus fotos para seleccionar la imagen de publicidad.',
      );

      return;
    }

    const result =
      await ImagePicker
        .launchImageLibraryAsync({
          mediaTypes:
            ImagePicker
              .MediaTypeOptions
              .Images,
          allowsEditing: true,
          aspect: [
            16,
            7,
          ],
          quality: 0.88,
        });

    if (result.canceled) {
      return;
    }

    const asset =
      result.assets[0];

    if (
      asset.fileSize &&
      asset.fileSize >
      5 * 1024 * 1024
    ) {
      Alert.alert(
        'Imagen demasiado grande',
        'Selecciona una imagen de máximo 5 MB.',
      );

      return;
    }

    const mimeType =
      asset.mimeType
        ?.toLowerCase();

    if (
      mimeType &&
      ![
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
      ].includes(
        mimeType,
      )
    ) {
      Alert.alert(
        'Formato no compatible',
        'Selecciona una imagen JPG, PNG o WEBP.',
      );

      return;
    }

    setPendingImage(
      asset,
    );
  }

  async function handleSave():
    Promise<void> {
    if (isProcessing) {
      return;
    }

    const sortOrder =
      Number(
        form.sortOrder,
      );

    if (
      !Number.isInteger(
        sortOrder,
      ) ||
      sortOrder < 0
    ) {
      Alert.alert(
        'Orden inválido',
        'El orden debe ser un número entero igual o mayor a 0.',
      );

      return;
    }

    if (
      !pendingImage &&
      !selectedBanner?.imageUrl
    ) {
      Alert.alert(
        'Imagen requerida',
        'Selecciona una imagen para la publicidad.',
      );

      return;
    }

    let startsAt:
      string | null;
    let endsAt:
      string | null;

    try {
      startsAt =
        parseOptionalDate(
          form.startsAt,
          false,
        );

      endsAt =
        parseOptionalDate(
          form.endsAt,
          true,
        );
    } catch (error) {
      Alert.alert(
        'Fecha inválida',
        error instanceof Error
          ? error.message
          : 'Revisa las fechas de publicación.',
      );

      return;
    }

    if (
      startsAt &&
      endsAt &&
      new Date(endsAt).getTime() <=
      new Date(startsAt).getTime()
    ) {
      Alert.alert(
        'Rango inválido',
        'La fecha final debe ser posterior a la fecha inicial.',
      );

      return;
    }

    let uploadedImage:
      Awaited<
        ReturnType<
          typeof uploadWebBannerImage
        >
      > | null = null;

    try {
      setIsProcessing(true);

      let imageUrl =
        selectedBanner?.imageUrl ?? '';

      let imagePath =
        selectedBanner?.imagePath ?? '';

      if (pendingImage) {
        uploadedImage =
          await uploadWebBannerImage(
            pendingImage.uri,
            pendingImage.mimeType ??
            'image/jpeg',
          );

        imageUrl =
          uploadedImage.publicUrl;

        imagePath =
          uploadedImage.path;
      }

      const payload = {
        title:
          form.title.trim() || null,
        description:
          form.description.trim() || null,
        imageUrl,
        imagePath,
        sortOrder,
        isActive:
          form.isActive,
        startsAt,
        endsAt,
      };

      if (selectedBanner) {
        await updateWebBanner(
          selectedBanner.id,
          payload,
        );

        if (
          uploadedImage &&
          selectedBanner.imagePath &&
          selectedBanner.imagePath !==
          uploadedImage.path
        ) {
          try {
            await deleteWebBannerImage(
              selectedBanner.imagePath,
            );
          } catch (cleanupError) {
            console.warn(
              'No se pudo limpiar la imagen anterior del banner:',
              cleanupError,
            );
          }
        }

        Alert.alert(
          'Publicidad actualizada',
          'El banner fue actualizado correctamente.',
        );
      } else {
        await createWebBanner(
          payload,
        );

        Alert.alert(
          'Publicidad creada',
          'El banner fue creado correctamente.',
        );
      }

      setIsModalVisible(false);
      setSelectedBanner(null);
      setPendingImage(null);
      setForm(INITIAL_FORM);

      await loadData();
    } catch (error) {
      if (uploadedImage) {
        try {
          await deleteWebBannerImage(
            uploadedImage.path,
          );
        } catch (cleanupError) {
          console.warn(
            'No se pudo limpiar la imagen subida tras el error:',
            cleanupError,
          );
        }
      }

      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la publicidad.',
      );
    } finally {
      setIsProcessing(false);
    }
  }

  function confirmToggle(
    banner: WebBanner,
  ): void {
    const nextState =
      !banner.isActive;

    Alert.alert(
      nextState
        ? 'Activar publicidad'
        : 'Desactivar publicidad',
      nextState
        ? '¿Deseas volver a mostrar este banner cuando esté dentro de su vigencia?'
        : '¿Deseas ocultar este banner de la web?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text:
            nextState
              ? 'Activar'
              : 'Desactivar',
          style:
            nextState
              ? 'default'
              : 'destructive',
          onPress: () => {
            void executeToggle(
              banner,
              nextState,
            );
          },
        },
      ],
    );
  }

  async function executeToggle(
    banner: WebBanner,
    isActive: boolean,
  ): Promise<void> {
    try {
      setIsProcessing(true);

      await setWebBannerActive(
        banner.id,
        isActive,
      );

      await loadData();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo cambiar el estado de la publicidad.',
      );
    } finally {
      setIsProcessing(false);
    }
  }

  function confirmDelete(
    banner: WebBanner,
  ): void {
    Alert.alert(
      'Eliminar publicidad',
      '¿Deseas eliminar definitivamente este banner?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void executeDelete(
              banner,
            );
          },
        },
      ],
    );
  }

  async function executeDelete(
    banner: WebBanner,
  ): Promise<void> {
    try {
      setIsProcessing(true);

      await deleteWebBanner(
        banner.id,
      );

      try {
        await deleteWebBannerImage(
          banner.imagePath,
        );
      } catch (cleanupError) {
        console.warn(
          'El banner se eliminó, pero no se pudo limpiar su imagen:',
          cleanupError,
        );
      }

      await loadData();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar la publicidad.',
      );
    } finally {
      setIsProcessing(false);
    }
  }

  if (isLoading) {
    return (
      <View
        style={
          styles.centerContainer
        }
      >
        <ActivityIndicator
          size="large"
          color={theme.primary}
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Cargando publicidad...
        </Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View
        style={
          styles.centerContainer
        }
      >
        <Text
          style={
            styles.errorTitle
          }
        >
          ⚠️ Error
        </Text>

        <Text
          style={
            styles.errorMessage
          }
        >
          {errorMessage}
        </Text>

        <TouchableOpacity
          style={
            styles.retryButton
          }
          onPress={() => {
            void loadData();
          }}
        >
          <Text
            style={
              styles.retryButtonText
            }
          >
            Reintentar
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={
        styles.container
      }
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
            style={
              styles.title
            }
          >
            Publicidad web
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Crea banners para la página pública. Puedes programar su vigencia, ordenarlos y activarlos o desactivarlos.
          </Text>
        </View>

        <TouchableOpacity
          style={
            styles.createButton
          }
          disabled={
            isProcessing
          }
          onPress={
            openCreateModal
          }
        >
          <Text
            style={
              styles.createButtonText
            }
          >
            + Nuevo banner
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={
          styles.listContent
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {banners.length === 0 ? (
          <View
            style={
              styles.emptyCard
            }
          >
            <Text
              style={
                styles.emptyIcon
              }
            >
              🖼️
            </Text>

            <Text
              style={
                styles.emptyTitle
              }
            >
              Sin publicidad
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Crea tu primer banner para mostrarlo en la web pública.
            </Text>
          </View>
        ) : (
          banners.map(
            banner => (
              <View
                key={
                  banner.id
                }
                style={[
                  styles.bannerCard,
                  !banner.isActive &&
                  styles.bannerCardInactive,
                ]}
              >
                <View
                  style={
                    styles.thumbnailBox
                  }
                >
                  <Image
                    source={{
                      uri:
                        banner.imageUrl,
                    }}
                    style={
                      styles.thumbnail
                    }
                    resizeMode="cover"
                  />
                </View>

                <View
                  style={
                    styles.bannerInfo
                  }
                >
                  <View
                    style={
                      styles.bannerTitleRow
                    }
                  >
                    <Text
                      style={
                        styles.bannerTitle
                      }
                      numberOfLines={1}
                    >
                      {banner.title ||
                        'Banner sin título'}
                    </Text>

                    <View
                      style={[
                        styles.statusBadge,
                        banner.isActive
                          ? styles.statusBadgeActive
                          : styles.statusBadgeInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          banner.isActive
                            ? styles.statusTextActive
                            : styles.statusTextInactive,
                        ]}
                      >
                        {banner.isActive
                          ? 'ACTIVO'
                          : 'INACTIVO'}
                      </Text>
                    </View>
                  </View>

                  {!!banner.description && (
                    <Text
                      style={
                        styles.descriptionText
                      }
                      numberOfLines={2}
                    >
                      {banner.description}
                    </Text>
                  )}

                  <Text
                    style={
                      styles.metaText
                    }
                  >
                    Orden {banner.sortOrder} · {getScheduleSummary(banner)}
                  </Text>
                </View>

                <View
                  style={
                    styles.actions
                  }
                >
                  <TouchableOpacity
                    style={
                      styles.editButton
                    }
                    disabled={
                      isProcessing
                    }
                    onPress={() =>
                      openEditModal(
                        banner,
                      )
                    }
                  >
                    <Text
                      style={
                        styles.editButtonText
                      }
                    >
                      Editar
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.stateButton,
                      banner.isActive
                        ? styles.deactivateButton
                        : styles.activateButton,
                    ]}
                    disabled={
                      isProcessing
                    }
                    onPress={() =>
                      confirmToggle(
                        banner,
                      )
                    }
                  >
                    <Text
                      style={
                        styles.actionText
                      }
                    >
                      {banner.isActive
                        ? 'Desactivar'
                        : 'Activar'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={
                      styles.deleteButton
                    }
                    disabled={
                      isProcessing
                    }
                    onPress={() =>
                      confirmDelete(
                        banner,
                      )
                    }
                  >
                    <Text
                      style={
                        styles.actionText
                      }
                    >
                      Eliminar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ),
          )
        )}
      </ScrollView>

      <Modal
        visible={
          isModalVisible
        }
        transparent
        animationType="fade"
        onRequestClose={
          closeModal
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.modalContent
            }
          >
            <ScrollView
              contentContainerStyle={
                styles.modalScrollContent
              }
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={
                false
              }
            >
              <Text
                style={
                  styles.modalTitle
                }
              >
                {selectedBanner
                  ? 'Editar banner'
                  : 'Nuevo banner'}
              </Text>

              <Text
                style={
                  styles.inputLabel
                }
              >
                Imagen *
              </Text>

              <View
                style={
                  styles.imagePickerRow
                }
              >
                <View
                  style={
                    styles.imagePreviewBox
                  }
                >
                  {pendingImage?.uri ||
                  selectedBanner?.imageUrl ? (
                    <Image
                      source={{
                        uri:
                          pendingImage?.uri ??
                          selectedBanner?.imageUrl ??
                          '',
                      }}
                      style={
                        styles.imagePreview
                      }
                      resizeMode="cover"
                    />
                  ) : (
                    <Text
                      style={
                        styles.imagePreviewPlaceholder
                      }
                    >
                      🖼️
                    </Text>
                  )}
                </View>

                <View
                  style={
                    styles.imagePickerActions
                  }
                >
                  <TouchableOpacity
                    style={
                      styles.imagePickerButton
                    }
                    disabled={
                      isProcessing
                    }
                    onPress={() => {
                      void handlePickImage();
                    }}
                  >
                    <Text
                      style={
                        styles.imagePickerButtonText
                      }
                    >
                      {pendingImage ||
                      selectedBanner?.imageUrl
                        ? 'Cambiar imagen'
                        : 'Seleccionar imagen'}
                    </Text>
                  </TouchableOpacity>

                  <Text
                    style={
                      styles.imageHint
                    }
                  >
                    JPG, PNG o WEBP · máximo 5 MB · formato recomendado 16:7
                  </Text>
                </View>
              </View>

              <Text
                style={
                  styles.inputLabel
                }
              >
                Título
              </Text>

              <TextInput
                value={
                  form.title
                }
                onChangeText={
                  value =>
                    setForm(
                      current => ({
                        ...current,
                        title: value,
                      }),
                    )
                }
                style={
                  styles.input
                }
                placeholder="Opcional"
                placeholderTextColor="#777777"
                maxLength={120}
                editable={
                  !isProcessing
                }
              />

              <Text
                style={
                  styles.inputLabel
                }
              >
                Descripción
              </Text>

              <TextInput
                value={
                  form.description
                }
                onChangeText={
                  value =>
                    setForm(
                      current => ({
                        ...current,
                        description: value,
                      }),
                    )
                }
                style={[
                  styles.input,
                  styles.descriptionInput,
                ]}
                placeholder="Opcional"
                placeholderTextColor="#777777"
                multiline
                maxLength={500}
                editable={
                  !isProcessing
                }
              />

              <View
                style={
                  styles.row
                }
              >
                <View
                  style={
                    styles.rowField
                  }
                >
                  <Text
                    style={
                      styles.inputLabel
                    }
                  >
                    Orden
                  </Text>

                  <TextInput
                    value={
                      form.sortOrder
                    }
                    onChangeText={
                      value =>
                        setForm(
                          current => ({
                            ...current,
                            sortOrder:
                              value.replace(
                                /\D/g,
                                '',
                              ),
                          }),
                        )
                    }
                    style={
                      styles.input
                    }
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="#777777"
                    editable={
                      !isProcessing
                    }
                  />
                </View>
              </View>

              <Text
                style={
                  styles.inputLabel
                }
              >
                Publicar desde
              </Text>

              <View
                style={
                  styles.dateFieldRow
                }
              >
                <TouchableOpacity
                  style={
                    styles.datePickerButton
                  }
                  disabled={
                    isProcessing
                  }
                  onPress={() =>
                    openDatePicker(
                      'startsAt',
                    )
                  }
                >
                  <Text
                    style={
                      form.startsAt
                        ? styles.datePickerText
                        : styles.datePickerPlaceholder
                    }
                  >
                    {form.startsAt
                      ? formatDateLabel(
                        form.startsAt,
                      )
                      : 'Seleccionar fecha'}
                  </Text>

                  <Text
                    style={
                      styles.datePickerIcon
                    }
                  >
                    📅
                  </Text>
                </TouchableOpacity>

                {!!form.startsAt && (
                  <TouchableOpacity
                    style={
                      styles.clearDateButton
                    }
                    disabled={
                      isProcessing
                    }
                    onPress={() =>
                      clearDate(
                        'startsAt',
                      )
                    }
                  >
                    <Text
                      style={
                        styles.clearDateButtonText
                      }
                    >
                      Limpiar
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text
                style={
                  styles.fieldHint
                }
              >
                Déjalo vacío para publicarlo inmediatamente.
              </Text>

              <Text
                style={
                  styles.inputLabel
                }
              >
                Publicar hasta
              </Text>

              <View
                style={
                  styles.dateFieldRow
                }
              >
                <TouchableOpacity
                  style={
                    styles.datePickerButton
                  }
                  disabled={
                    isProcessing
                  }
                  onPress={() =>
                    openDatePicker(
                      'endsAt',
                    )
                  }
                >
                  <Text
                    style={
                      form.endsAt
                        ? styles.datePickerText
                        : styles.datePickerPlaceholder
                    }
                  >
                    {form.endsAt
                      ? formatDateLabel(
                        form.endsAt,
                      )
                      : 'Seleccionar fecha'}
                  </Text>

                  <Text
                    style={
                      styles.datePickerIcon
                    }
                  >
                    📅
                  </Text>
                </TouchableOpacity>

                {!!form.endsAt && (
                  <TouchableOpacity
                    style={
                      styles.clearDateButton
                    }
                    disabled={
                      isProcessing
                    }
                    onPress={() =>
                      clearDate(
                        'endsAt',
                      )
                    }
                  >
                    <Text
                      style={
                        styles.clearDateButtonText
                      }
                    >
                      Limpiar
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text
                style={
                  styles.fieldHint
                }
              >
                Déjalo vacío para mantenerlo vigente indefinidamente. La fecha final incluye todo ese día.
              </Text>

              <View
                style={
                  styles.activeRow
                }
              >
                <View>
                  <Text
                    style={
                      styles.activeTitle
                    }
                  >
                    Banner activo
                  </Text>

                  <Text
                    style={
                      styles.activeSubtitle
                    }
                  >
                    Solo los banners activos y dentro de su vigencia aparecen en la web.
                  </Text>
                </View>

                <Switch
                  value={
                    form.isActive
                  }
                  disabled={
                    isProcessing
                  }
                  onValueChange={
                    value =>
                      setForm(
                        current => ({
                          ...current,
                          isActive: value,
                        }),
                      )
                  }
                />
              </View>

              <View
                style={
                  styles.modalActions
                }
              >
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.cancelButton,
                  ]}
                  disabled={
                    isProcessing
                  }
                  onPress={
                    closeModal
                  }
                >
                  <Text
                    style={
                      styles.cancelButtonText
                    }
                  >
                    Cancelar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.saveButton,
                    isProcessing &&
                    styles.buttonDisabled,
                  ]}
                  disabled={
                    isProcessing
                  }
                  onPress={() => {
                    void handleSave();
                  }}
                >
                  {isProcessing ? (
                    <ActivityIndicator
                      size="small"
                      color="#171717"
                    />
                  ) : (
                    <Text
                      style={
                        styles.saveButtonText
                      }
                    >
                      {selectedBanner
                        ? 'Guardar cambios'
                        : 'Crear banner'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {datePickerField ? (
        <DateTimePicker
          value={
            getPickerDate(
              datePickerField ===
                'startsAt'
                ? form.startsAt
                : form.endsAt,
            )
          }
          mode="date"
          display="default"
          minimumDate={
            datePickerField ===
              'endsAt' &&
            form.startsAt
              ? getPickerDate(
                form.startsAt,
              )
              : undefined
          }
          onChange={
            handleDateChange
          }
        />
      ) : null}
    </View>
  );
}

function parseOptionalDate(
  value: string,
  useEndOfDay: boolean,
): string | null {
  const cleanValue =
    value.trim();

  if (!cleanValue) {
    return null;
  }

  const match =
    cleanValue.match(
      /^(\d{4})-(\d{2})-(\d{2})$/,
    );

  if (!match) {
    throw new Error(
      'Selecciona una fecha válida desde el calendario.',
    );
  }

  const year =
    Number(match[1]);
  const month =
    Number(match[2]);
  const day =
    Number(match[3]);

  const date =
    new Date(
      year,
      month - 1,
      day,
      useEndOfDay ? 23 : 0,
      useEndOfDay ? 59 : 0,
      useEndOfDay ? 59 : 0,
      useEndOfDay ? 999 : 0,
    );

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(
      'La fecha seleccionada no es válida.',
    );
  }

  return date.toISOString();
}

function formatDateInput(
  value: string | null,
): string {
  if (!value) {
    return '';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '';
  }

  return formatPickerDate(
    date,
  );
}

function formatPickerDate(
  date: Date,
): string {
  const pad =
    (number: number) =>
      String(number)
        .padStart(
          2,
          '0',
        );

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1,
  )}-${pad(
    date.getDate(),
  )}`;
}

function getPickerDate(
  value: string,
): Date {
  const match =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})$/,
    );

  if (!match) {
    return new Date();
  }

  const date =
    new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
    );

  return Number.isNaN(
    date.getTime(),
  )
    ? new Date()
    : date;
}

function formatDateLabel(
  value: string,
): string {
  const date =
    getPickerDate(
      value,
    );

  return date.toLocaleDateString(
    'es-MX',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    },
  );
}

function getScheduleSummary(
  banner: WebBanner,
): string {
  if (
    !banner.startsAt &&
    !banner.endsAt
  ) {
    return 'Sin vigencia programada';
  }

  if (
    banner.startsAt &&
    banner.endsAt
  ) {
    return `Del ${formatDisplayDate(
      banner.startsAt,
    )} al ${formatDisplayDate(
      banner.endsAt,
    )}`;
  }

  if (banner.startsAt) {
    return `Desde ${formatDisplayDate(
      banner.startsAt,
    )}`;
  }

  return `Hasta ${formatDisplayDate(
    banner.endsAt as string,
  )}`;
}

function formatDisplayDate(
  value: string,
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    'es-MX',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  );
}
