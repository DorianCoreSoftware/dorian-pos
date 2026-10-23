import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  LayoutChangeEvent,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
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
  reorderWebBanners,
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
  targetUrl: string;
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
  targetUrl: '',
  startsAt: '',
  endsAt: '',
  isActive: true,
};


interface BannerCardLayout {
  y: number;
  height: number;
}

interface SortableBannerCardProps {
  banner: WebBanner;
  isCompact: boolean;
  isDisabled: boolean;
  isDragging: boolean;
  onLayout: (
    bannerId: string,
    event: LayoutChangeEvent,
  ) => void;
  onDragStart: (
    bannerId: string,
  ) => void;
  onDragEnd: (
    bannerId: string,
    offsetY: number,
  ) => void;
  onEdit: (
    banner: WebBanner,
  ) => void;
  onToggle: (
    banner: WebBanner,
  ) => void;
  onDelete: (
    banner: WebBanner,
  ) => void;
}

function SortableBannerCard({
  banner,
  isCompact,
  isDisabled,
  isDragging,
  onLayout,
  onDragStart,
  onDragEnd,
  onEdit,
  onToggle,
  onDelete,
}: SortableBannerCardProps) {
  const translateY =
    useRef(
      new Animated.Value(0),
    ).current;

  const onDragStartRef =
    useRef(onDragStart);

  const onDragEndRef =
    useRef(onDragEnd);

  onDragStartRef.current =
    onDragStart;

  onDragEndRef.current =
    onDragEnd;

  const panResponder =
    useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder:
            () => !isDisabled,
          onMoveShouldSetPanResponder:
            () => !isDisabled,
          onPanResponderGrant: () => {
            if (isDisabled) {
              return;
            }

            onDragStartRef.current(
              banner.id,
            );
          },
          onPanResponderMove: (
            _event,
            gestureState,
          ) => {
            if (isDisabled) {
              return;
            }

            translateY.setValue(
              gestureState.dy,
            );
          },
          onPanResponderRelease: (
            _event,
            gestureState,
          ) => {
            translateY.setValue(0);

            if (isDisabled) {
              return;
            }

            onDragEndRef.current(
              banner.id,
              gestureState.dy,
            );
          },
          onPanResponderTerminate: () => {
            translateY.setValue(0);

            onDragEndRef.current(
              banner.id,
              0,
            );
          },
          onPanResponderTerminationRequest:
            () => false,
          onShouldBlockNativeResponder:
            () => true,
        }),
      [
        banner.id,
        isDisabled,
        translateY,
      ],
    );

  return (
    <Animated.View
      onLayout={event =>
        onLayout(
          banner.id,
          event,
        )
      }
      style={[
        styles.bannerCard,
        isCompact &&
        styles.bannerCardCompact,
        !banner.isActive &&
        styles.bannerCardInactive,
        isDragging &&
        styles.bannerCardDragging,
        {
          transform: [
            {
              translateY,
            },
          ],
          zIndex:
            isDragging
              ? 20
              : 0,
        },
      ]}
    >
      <View
        style={[
          styles.bannerMain,
          isCompact &&
          styles.bannerMainCompact,
        ]}
      >
        <View
          style={
            styles.reorderControls
          }
        >
          <View
            {...panResponder.panHandlers}
            style={[
              styles.dragHandleButton,
              isDragging &&
              styles.dragHandleButtonActive,
            ]}
          >
            <Text
              style={
                styles.dragHandle
              }
            >
              ≡
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.thumbnailBox,
            isCompact &&
            styles.thumbnailBoxCompact,
          ]}
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
              numberOfLines={
                isCompact
                  ? 2
                  : 1
              }
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

          {!!banner.targetUrl && (
            <Text
              style={
                styles.linkText
              }
              numberOfLines={1}
            >
              🔗 {banner.targetUrl}
            </Text>
          )}

          <Text
            style={
              styles.metaText
            }
          >
            {getScheduleSummary(
              banner,
            )}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.actions,
          isCompact &&
          styles.actionsCompact,
        ]}
      >
        <TouchableOpacity
          style={[
            styles.editButton,
            isCompact &&
            styles.actionButtonCompact,
          ]}
          disabled={
            isDisabled
          }
          onPress={() =>
            onEdit(banner)
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
            isCompact &&
            styles.actionButtonCompact,
          ]}
          disabled={
            isDisabled
          }
          onPress={() =>
            onToggle(banner)
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
          style={[
            styles.deleteButton,
            isCompact &&
            styles.actionButtonCompact,
          ]}
          disabled={
            isDisabled
          }
          onPress={() =>
            onDelete(banner)
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
    </Animated.View>
  );
}

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
    isReordering,
    setIsReordering,
  ] = useState(false);

  const [
    draggedBannerId,
    setDraggedBannerId,
  ] = useState<string | null>(
    null,
  );

  const {
    width: windowWidth,
  } = useWindowDimensions();

  const isCompact =
    windowWidth < 720;

  const bannerLayouts =
    useRef<Record<
      string,
      BannerCardLayout
    >>({});

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
    setSelectedBanner(null);
    setPendingImage(null);
    setForm(INITIAL_FORM);
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
      targetUrl:
        banner.targetUrl ?? '',
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

    const targetUrl =
      normalizeTargetUrl(
        form.targetUrl,
      );

    if (
      targetUrl &&
      !isValidTargetUrl(
        targetUrl,
      )
    ) {
      Alert.alert(
        'Enlace inválido',
        'Usa una ruta interna que empiece con / o una URL completa http:// o https://.',
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
        targetUrl,
        sortOrder:
          selectedBanner?.sortOrder ??
          (
            banners.length > 0
              ? Math.max(
                ...banners.map(
                  banner =>
                    banner.sortOrder,
                ),
              ) + 1
              : 0
          ),
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

  async function persistBannerOrder(
    nextBanners: WebBanner[],
  ): Promise<void> {
    const normalized =
      nextBanners.map(
        (banner, index) => ({
          ...banner,
          sortOrder: index,
        }),
      );

    const previous = banners;

    setBanners(normalized);

    try {
      setIsReordering(true);

      await reorderWebBanners(
        normalized.map(
          banner => banner.id,
        ),
      );
    } catch (error) {
      setBanners(previous);

      Alert.alert(
        'No se pudo reordenar',
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el nuevo orden de la publicidad.',
      );
    } finally {
      setIsReordering(false);
      setDraggedBannerId(null);
    }
  }

  function handleBannerLayout(
    bannerId: string,
    event: LayoutChangeEvent,
  ): void {
    const {
      y,
      height,
    } = event.nativeEvent.layout;

    bannerLayouts.current[
      bannerId
    ] = {
      y,
      height,
    };
  }

  function handleDragStart(
    bannerId: string,
  ): void {
    if (
      isProcessing ||
      isReordering
    ) {
      return;
    }

    setDraggedBannerId(
      bannerId,
    );
  }

  function handleDragEnd(
    bannerId: string,
    offsetY: number,
  ): void {
    setDraggedBannerId(null);

    if (
      isProcessing ||
      isReordering ||
      Math.abs(offsetY) < 8
    ) {
      return;
    }

    const draggedLayout =
      bannerLayouts.current[
        bannerId
      ];

    if (!draggedLayout) {
      return;
    }

    const draggedCenter =
      draggedLayout.y +
      draggedLayout.height / 2 +
      offsetY;

    const remainingBanners =
      banners.filter(
        banner =>
          banner.id !== bannerId,
      );

    let insertionIndex = 0;

    remainingBanners.forEach(
      banner => {
        const layout =
          bannerLayouts.current[
            banner.id
          ];

        if (!layout) {
          return;
        }

        const center =
          layout.y +
          layout.height / 2;

        if (
          draggedCenter > center
        ) {
          insertionIndex += 1;
        }
      },
    );

    const currentIndex =
      banners.findIndex(
        banner =>
          banner.id === bannerId,
      );

    if (
      currentIndex < 0 ||
      insertionIndex === currentIndex
    ) {
      return;
    }

    const nextBanners = [
      ...banners,
    ];

    const [movedBanner] =
      nextBanners.splice(
        currentIndex,
        1,
      );

    nextBanners.splice(
      insertionIndex,
      0,
      movedBanner,
    );

    void persistBannerOrder(
      nextBanners,
    );
  }

  function confirmToggle(
    banner: WebBanner,
  ): void {
    const nextState =
      !banner.isActive;

    const title =
      nextState
        ? 'Activar publicidad'
        : 'Desactivar publicidad';

    const message =
      nextState
        ? '¿Deseas volver a mostrar este banner cuando esté dentro de su vigencia?'
        : '¿Deseas ocultar este banner de la web?';

    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined'
    ) {
      const confirmed =
        window.confirm(
          `${title}\n\n${message}`,
        );

      if (confirmed) {
        void executeToggle(
          banner,
          nextState,
        );
      }

      return;
    }

    Alert.alert(
      title,
      message,
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
    const message =
      '¿Deseas eliminar definitivamente este banner?';

    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined'
    ) {
      const confirmed =
        window.confirm(
          `Eliminar publicidad\n\n${message}`,
        );

      if (confirmed) {
        void executeDelete(
          banner,
        );
      }

      return;
    }

    Alert.alert(
      'Eliminar publicidad',
      message,
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

      const remainingBannerIds =
        banners
          .filter(
            currentBanner =>
              currentBanner.id !==
              banner.id,
          )
          .map(
            currentBanner =>
              currentBanner.id,
          );

      if (remainingBannerIds.length > 0) {
        await reorderWebBanners(
          remainingBannerIds,
        );
      }

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
            Crea banners para la página pública. Arrástralos para cambiar su orden y agrega un enlace opcional al destino de la publicidad.
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
        scrollEnabled={
          !draggedBannerId
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
              <SortableBannerCard
                key={banner.id}
                banner={banner}
                isCompact={
                  isCompact
                }
                isDisabled={
                  isProcessing ||
                  isReordering
                }
                isDragging={
                  draggedBannerId ===
                  banner.id
                }
                onLayout={
                  handleBannerLayout
                }
                onDragStart={
                  handleDragStart
                }
                onDragEnd={
                  handleDragEnd
                }
                onEdit={
                  openEditModal
                }
                onToggle={
                  confirmToggle
                }
                onDelete={
                  confirmDelete
                }
              />
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

              <Text
                style={
                  styles.inputLabel
                }
              >
                Enlace del banner
              </Text>

              <TextInput
                value={
                  form.targetUrl
                }
                onChangeText={
                  value =>
                    setForm(
                      current => ({
                        ...current,
                        targetUrl: value,
                      }),
                    )
                }
                style={
                  styles.input
                }
                placeholder="Opcional: /recompensas o https://ejemplo.com"
                placeholderTextColor="#777777"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                maxLength={2048}
                editable={
                  !isProcessing
                }
              />

              <Text
                style={
                  styles.fieldHint
                }
              >
                Si lo dejas vacío, el banner solo mostrará la imagen. Las rutas internas empiezan con / y los enlaces externos con http:// o https://.
              </Text>

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

function normalizeTargetUrl(
  value: string,
): string | null {
  const trimmed = value.trim();

  return trimmed || null;
}

function isValidTargetUrl(
  value: string,
): boolean {
  if (
    value === '/' ||
    (
      value.startsWith('/') &&
      !value.startsWith('//')
    )
  ) {
    return true;
  }

  try {
    const parsed = new URL(value);

    return (
      parsed.protocol === 'http:' ||
      parsed.protocol === 'https:'
    );
  } catch {
    return false;
  }
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
