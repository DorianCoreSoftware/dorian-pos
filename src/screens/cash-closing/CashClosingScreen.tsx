import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import {
  closeCashSession,
  getCashSessionHistory,
  openCashSession,
} from '../../services/cashSessionService';

import {
  getCompletedSales,
} from '../../services/salesService';

import {
  CashSession,
  CompletedSale,
} from '../../types';

import {
  styles,
} from './CashClosingScreen.styles';

import {
  useAuth,
} from '../../context/AuthContext';
import { PromoReward } from '../../repositories/PromoRepository';
import { PROMO_REWARD_OPTIONS, redeemDorian, redeemKongs } from '../../services/promoService';
import { CashRefundSummary, getCashRefundSummary } from '../../services/cashRefundService';
import {
  getPromotionSettings,
  PromotionSettings,
} from '../../services/promotionService';

interface CashClosingScreenProps {
  cashSession:
  CashSession | null;

  setCashSession: React.Dispatch<
    React.SetStateAction<
      CashSession | null
    >
  >;

  fetchCashSession:
  () => Promise<void>;

  pendingOrdersCount: number;
}

type CashView =
  | 'current'
  | 'history'
  | 'kongs'
  | 'dorian';

type HistoryFilter =
  | 'today'
  | 'week'
  | 'month'
  | 'all'
  | 'custom';

type DatePickerField =
  | 'from'
  | 'to'
  | null;

export function CashClosingScreen({
  cashSession,
  setCashSession,
  fetchCashSession,
  pendingOrdersCount,
}: CashClosingScreenProps) {
  const {
    user,
  } = useAuth();

  const {
    width,
  } = useWindowDimensions();

  const isPhone =
    width < 700;

  const isSmallPhone =
    width < 430;

  const [
    sales,
    setSales,
  ] = useState<CompletedSale[]>(
    [],
  );

  const [
    openingAmountText,
    setOpeningAmountText,
  ] = useState('1000');

  const [
    countedCashText,
    setCountedCashText,
  ] = useState('');

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

  /*
   * ============================
   * HISTORIAL
   * ============================
   */

  const [
    activeView,
    setActiveView,
  ] = useState<CashView>(
    'current',
  );

  const [
    cashHistory,
    setCashHistory,
  ] = useState<CashSession[]>(
    [],
  );

  const [
    isHistoryLoading,
    setIsHistoryLoading,
  ] = useState(false);

  const [
    historyError,
    setHistoryError,
  ] = useState<string | null>(
    null,
  );

  const [
    historyFilter,
    setHistoryFilter,
  ] = useState<HistoryFilter>(
    'today',
  );

  const [
    historyFrom,
    setHistoryFrom,
  ] = useState<Date>(() =>
    startOfDay(
      new Date(),
    ),
  );

  const [
    historyTo,
    setHistoryTo,
  ] = useState<Date>(() =>
    endOfDay(
      new Date(),
    ),
  );

  const [
    datePickerField,
    setDatePickerField,
  ] = useState<DatePickerField>(
    null,
  );

  /*
   * Corte seleccionado para
   * el modal de detalle.
   */
  const [
    selectedHistorySession,
    setSelectedHistorySession,
  ] = useState<CashSession | null>(
    null,
  );

  const [
    kongCodes,
    setKongCodes,
  ] = useState<string[]>(
    [],
  );

  const [
    promotionSettings,
    setPromotionSettings,
  ] = useState<
    PromotionSettings | null
  >(null);

  const [
    selectedReward,
    setSelectedReward,
  ] = useState<PromoReward>(
    'special_burger',
  );

  const [
    dorianCode,
    setDorianCode,
  ] = useState('');

  const [
    isPromoProcessing,
    setIsPromoProcessing,
  ] = useState(false);

  const [
    refundSummary,
    setRefundSummary,
  ] = useState<CashRefundSummary>({
    refunds: [],
    cash: 0,
    card: 0,
    total: 0,
    count: 0,
  });

  /*
   * ============================
   * CARGA DE DATOS
   * ============================
   */

  const loadPromotionSettings =
    useCallback(
      async (): Promise<void> => {
        try {
          const settings =
            await getPromotionSettings();

          setPromotionSettings(
            settings,
          );
        } catch (error) {
          console.error(
            'Error loading promotion settings:',
            error,
          );

          setPromotionSettings(
            null,
          );
        }
      },
      [],
    );

  const loadSales =
    useCallback(
      async (): Promise<void> => {
        try {
          setIsLoading(true);
          setErrorMessage(null);

          const completedSales =
            await getCompletedSales();

          setSales(
            completedSales,
          );
        } catch (error) {
          console.error(
            'Error al cargar caja:',
            error,
          );

          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudo cargar la información de caja.',
          );
        } finally {
          setIsLoading(false);
        }
      },
      [],
    );

  const loadRefunds =
    useCallback(
      async (): Promise<void> => {
        if (!cashSession) {
          setRefundSummary({
            refunds: [],
            cash: 0,
            card: 0,
            total: 0,
            count: 0,
          });

          return;
        }

        try {
          const currentRefundSummary =
            await getCashRefundSummary(
              cashSession.id,
            );

          setRefundSummary(
            currentRefundSummary,
          );
        } catch (error) {
          console.error(
            'Error al cargar reembolsos:',
            error,
          );

          throw error;
        }
      },
      [
        cashSession,
      ],
    );

  const loadHistory =
    useCallback(
      async (): Promise<void> => {
        try {
          setIsHistoryLoading(
            true,
          );

          setHistoryError(
            null,
          );

          const history =
            await getCashSessionHistory();

          setCashHistory(
            history,
          );
        } catch (error) {
          console.error(
            'Error cargando historial de caja:',
            error,
          );

          setHistoryError(
            error instanceof Error
              ? error.message
              : 'No se pudo cargar el historial de caja.',
          );
        } finally {
          setIsHistoryLoading(
            false,
          );
        }
      },
      [],
    );

  useEffect(() => {
    if (
      activeView !==
      'history'
    ) {
      return;
    }

    void loadHistory();
  }, [
    activeView,
    loadHistory,
  ]);

  useEffect(() => {
    void loadSales();
  }, [loadSales]);

  useEffect(() => {
    void loadPromotionSettings();
  }, [
    loadPromotionSettings,
  ]);

  useEffect(() => {
    const requiredKongs =
      promotionSettings
        ?.required_kongs ??
      0;

    if (
      requiredKongs <= 0
    ) {
      setKongCodes(
        [],
      );

      return;
    }

    setKongCodes(
      currentCodes =>
        Array.from(
          {
            length:
              requiredKongs,
          },
          (
            _,
            index,
          ) =>
            currentCodes[
              index
            ] ??
            '',
        ),
    );
  }, [
    promotionSettings
      ?.required_kongs,
  ]);

  useEffect(() => {
    if (
      activeView ===
        'kongs' &&
      promotionSettings &&
      !promotionSettings
        .kong_enabled
    ) {
      setActiveView(
        'current',
      );
    }

    if (
      activeView ===
        'dorian' &&
      promotionSettings &&
      !promotionSettings
        .lucky_dorian_enabled
    ) {
      setActiveView(
        'current',
      );
    }
  }, [
    activeView,
    promotionSettings,
  ]);

  useEffect(() => {
    void loadRefunds();
  }, [loadRefunds]);

  useEffect(() => {
    if (cashSession) {
      setOpeningAmountText(
        cashSession
          .openingAmount
          .toFixed(2),
      );

      return;
    }

    setOpeningAmountText(
      '1000',
    );

    setCountedCashText('');
  }, [cashSession]);

  /*
   * ============================
   * VENTAS DE SESIÓN ACTUAL
   * ============================
   */

  const sessionSales =
    useMemo(() => {
      if (!cashSession) {
        return [];
      }

      const openedAt =
        parseSupabaseDate(
          cashSession.openedAt,
        );

      if (!openedAt) {
        return [];
      }

      return sales.filter(
        (sale) => {
          const paymentDate =
            parseSupabaseDate(
              sale.payment.createdAt,
            );

          if (!paymentDate) {
            return false;
          }

          return (
            paymentDate >=
            openedAt
          );
        },
      );
    }, [
      cashSession,
      sales,
    ]);

  const summary =
    useMemo(() => {
      return sessionSales.reduce(
        (
          accumulator,
          sale,
        ) => {
          accumulator.total +=
            sale.totalAmount;

          if (
            sale.payment
              .paymentMethod ===
            'cash'
          ) {
            accumulator.cash +=
              sale.totalAmount;
          }

          if (
            sale.payment
              .paymentMethod ===
            'card'
          ) {
            accumulator.card +=
              sale.totalAmount;
          }

          return accumulator;
        },
        {
          total: 0,
          cash: 0,
          card: 0,
        },
      );
    }, [sessionSales]);

  const countedCash =
    useMemo(() => {
      if (
        !countedCashText.trim()
      ) {
        return null;
      }

      const parsedValue =
        Number(
          countedCashText,
        );

      return Number.isFinite(
        parsedValue,
      )
        ? parsedValue
        : null;
    }, [countedCashText]);

  const expectedCash =
    useMemo(() => {
      if (!cashSession) {
        return 0;
      }

      return roundCurrency(
        cashSession.openingAmount +
        summary.cash -
        refundSummary.cash,
      );
    }, [
      cashSession,
      summary.cash,
      refundSummary.cash,
    ]);

  const difference =
    useMemo(() => {
      if (
        countedCash === null
      ) {
        return null;
      }

      return roundCurrency(
        countedCash -
        expectedCash,
      );
    }, [
      countedCash,
      expectedCash,
    ]);

  /*
   * ============================
   * FILTROS DEL HISTORIAL
   * ============================
   */

  const filteredCashHistory =
    useMemo(() => {
      if (
        historyFilter ===
        'all'
      ) {
        return cashHistory;
      }

      const now =
        new Date();

      let fromDate:
        Date | null = null;

      let toDate:
        Date | null = null;

      if (
        historyFilter ===
        'today'
      ) {
        fromDate =
          startOfDay(now);

        toDate =
          endOfDay(now);
      }

      if (
        historyFilter ===
        'week'
      ) {
        const sevenDaysAgo =
          new Date(now);

        sevenDaysAgo.setDate(
          now.getDate() - 6,
        );

        fromDate =
          startOfDay(
            sevenDaysAgo,
          );

        toDate =
          endOfDay(now);
      }

      if (
        historyFilter ===
        'month'
      ) {
        fromDate =
          new Date(
            now.getFullYear(),
            now.getMonth(),
            1,
            0,
            0,
            0,
            0,
          );

        toDate =
          endOfDay(now);
      }

      if (
        historyFilter ===
        'custom'
      ) {
        fromDate =
          startOfDay(
            historyFrom,
          );

        toDate =
          endOfDay(
            historyTo,
          );
      }

      if (
        !fromDate ||
        !toDate
      ) {
        return cashHistory;
      }

      return cashHistory.filter(
        (session) => {
          const referenceDate =
            parseSupabaseDate(
              session.closedAt ??
              session.openedAt,
            );

          if (!referenceDate) {
            return false;
          }

          return (
            referenceDate >=
            fromDate &&
            referenceDate <=
            toDate
          );
        },
      );
    }, [
      cashHistory,
      historyFilter,
      historyFrom,
      historyTo,
    ]);

  const handleHistoryFilter =
    (
      filter:
        HistoryFilter,
    ): void => {
      setHistoryFilter(
        filter,
      );

      if (
        filter ===
        'custom'
      ) {
        const today =
          new Date();

        setHistoryFrom(
          startOfDay(
            today,
          ),
        );

        setHistoryTo(
          endOfDay(
            today,
          ),
        );
      }
    };

  const handleDateChange =
    (
      event:
        DateTimePickerEvent,

      selectedDate?:
        Date,
    ): void => {
      const field =
        datePickerField;

      setDatePickerField(
        null,
      );

      if (
        event.type ===
        'dismissed' ||
        !selectedDate ||
        !field
      ) {
        return;
      }

      if (
        field ===
        'from'
      ) {
        const newFrom =
          startOfDay(
            selectedDate,
          );

        setHistoryFrom(
          newFrom,
        );

        if (
          newFrom >
          historyTo
        ) {
          setHistoryTo(
            endOfDay(
              selectedDate,
            ),
          );
        }

        return;
      }

      const newTo =
        endOfDay(
          selectedDate,
        );

      if (
        newTo <
        historyFrom
      ) {
        Alert.alert(
          'Rango inválido',
          'La fecha final no puede ser anterior a la fecha inicial.',
        );

        return;
      }

      setHistoryTo(
        newTo,
      );
    };

  /*
   * ============================
   * DETALLE DE CORTE
   * ============================
   */

  const openHistoryDetail = (
    session: CashSession,
  ): void => {
    setSelectedHistorySession(
      session,
    );
  };

  const closeHistoryDetail =
    (): void => {
      setSelectedHistorySession(
        null,
      );
    };

  /*
   * ============================
   * APERTURA DE CAJA
   * ============================
   */

  const handleOpenCash =
    async (): Promise<void> => {
      if (isProcessing) {
        return;
      }

      const openingAmount =
        Number(
          openingAmountText,
        );

      try {
        setIsProcessing(true);

        const session =
          await openCashSession({
            openingAmount,

            openedBy:
              user?.id ?? null,
          });

        setCashSession(
          session,
        );

        const completedSales =
          await getCompletedSales();

        setSales(
          completedSales,
        );

        Alert.alert(
          'Caja abierta',
          `Fondo inicial: $${session.openingAmount.toFixed(
            2,
          )}`,
        );
      } catch (error) {
        Alert.alert(
          'Error',
          error instanceof Error
            ? error.message
            : 'No se pudo abrir la caja.',
        );
      } finally {
        setIsProcessing(false);
      }
    };

  /*
   * ============================
   * CIERRE DE CAJA
   * ============================
   */

  const handleCloseCashPrompt =
    (): void => {
      if (
        pendingOrdersCount >
        0
      ) {
        Alert.alert(
          'Pedidos pendientes',
          [
            'No puedes cerrar la caja mientras haya pedidos pendientes.',
            '',
            pendingOrdersCount ===
              1
              ? 'Hay 1 pedido pendiente.'
              : `Hay ${pendingOrdersCount} pedidos pendientes.`,
            '',
            'Entrega o cancela los pedidos antes de cerrar la caja.',
          ].join('\n'),
        );

        return;
      }

      if (
        countedCash === null
      ) {
        Alert.alert(
          'Efectivo requerido',
          'Ingresa el efectivo contado en caja.',
        );

        return;
      }

      Alert.alert(
        'Cerrar caja',
        [
          `Efectivo esperado: $${expectedCash.toFixed(
            2,
          )}`,

          `Reembolsos Dorian en efectivo: -$${refundSummary.cash.toFixed(
            2,
          )}`,

          `Efectivo contado: $${countedCash.toFixed(
            2,
          )}`,

          `Diferencia: $${(
            difference ?? 0
          ).toFixed(2)}`,

          '',

          '¿Deseas cerrar la caja?',
        ].join('\n'),

        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },

          {
            text:
              'Cerrar caja',

            onPress: () => {
              void handleCloseCash();
            },
          },
        ],
      );
    };

  const handleCloseCash =
    async (): Promise<void> => {
      if (
        pendingOrdersCount >
        0
      ) {
        Alert.alert(
          'Pedidos pendientes',
          'No puedes cerrar la caja mientras haya pedidos pendientes.',
        );

        return;
      }

      if (
        !cashSession ||
        countedCash === null ||
        isProcessing
      ) {
        return;
      }

      try {
        setIsProcessing(true);

        const closedSession =
          await closeCashSession({
            cashSessionId:
              cashSession.id,

            countedCash,

            openingAmount:
              cashSession
                .openingAmount,

            totalCashSales:
              summary.cash,

            totalCardSales:
              summary.card,

            totalCashRefunds:
              refundSummary.cash,

            totalCardRefunds:
              refundSummary.card,

            salesCount:
              sessionSales.length,

            closedBy:
              user?.id ??
              null,
          });

        setCashSession(
          null,
        );

        setCountedCashText(
          '',
        );

        setOpeningAmountText(
          '1000',
        );

        setRefundSummary({
          refunds: [],
          cash: 0,
          card: 0,
          total: 0,
          count: 0,
        });

        Alert.alert(
          'Caja cerrada',
          [
            `Total vendido: $${(
              closedSession
                .totalSales ??
              0
            ).toFixed(2)}`,

            `Diferencia: $${(
              closedSession
                .differenceAmount ??
              0
            ).toFixed(2)}`,
          ].join('\n'),
        );

        await fetchCashSession();

        await loadSales();

        await loadHistory();
      } catch (error) {
        Alert.alert(
          'Error',
          error instanceof Error
            ? error.message
            : 'No se pudo cerrar la caja.',
        );

        await fetchCashSession();
      } finally {
        setIsProcessing(false);
      }
    };

  const handleRefresh =
    async (): Promise<void> => {
      if (isProcessing) {
        return;
      }

      try {
        setIsProcessing(true);

        await Promise.all([
          fetchCashSession(),
          loadSales(),
          loadRefunds(),
          loadPromotionSettings(),
        ]);
      } finally {
        setIsProcessing(false);
      }
    };

  const handleMoneyInput = (
    value: string,

    setter: (
      value: string,
    ) => void,
  ): void => {
    const sanitized =
      value
        .replace(',', '.')
        .replace(
          /[^0-9.]/g,
          '',
        );

    const parts =
      sanitized.split('.');

    if (
      parts.length > 2
    ) {
      return;
    }

    if (
      parts[1] &&
      parts[1].length >
      2
    ) {
      return;
    }

    setter(
      sanitized,
    );
  };

  /*
 * ============================
 * PROMOCIONES
 * ============================
 */

  const handleKongCodeChange = (
    index: number,
    value: string,
  ): void => {
    const normalizedValue =
      value
        .toUpperCase()
        .replace(
          /\s/g,
          '',
        );

    setKongCodes(
      (
        currentCodes,
      ) => {
        const updatedCodes =
          [
            ...currentCodes,
          ];

        updatedCodes[
          index
        ] =
          normalizedValue;

        return updatedCodes;
      },
    );
  };

  const clearKongRedemption =
    (): void => {
      const requiredKongs =
        promotionSettings
          ?.required_kongs ??
        0;

      setKongCodes(
        Array.from(
          {
            length:
              requiredKongs,
          },
          () => '',
        ),
      );

      setSelectedReward(
        'special_burger',
      );
    };

  const handleRedeemKongs =
    (): void => {
      if (
        isPromoProcessing
      ) {
        return;
      }

      const reward =
        PROMO_REWARD_OPTIONS.find(
          (
            option,
          ) =>
            option.value ===
            selectedReward,
        );

      Alert.alert(
        'Canjear Kongs',
        [
          `Se utilizarán los ${
            promotionSettings
              ?.required_kongs ??
            kongCodes.length
          } códigos ingresados.`,
          '',
          `Premio: ${reward?.label ??
          'Premio'
          }`,
          '',
          'Los códigos quedarán marcados como canjeados y no podrán volver a utilizarse.',
        ].join(
          '\n',
        ),
        [
          {
            text:
              'Cancelar',

            style:
              'cancel',
          },
          {
            text:
              'Confirmar canje',

            onPress:
              () => {
                void executeRedeemKongs();
              },
          },
        ],
      );
    };

  const executeRedeemKongs =
    async (): Promise<void> => {
      if (
        isPromoProcessing
      ) {
        return;
      }

      try {
        setIsPromoProcessing(
          true,
        );

        await redeemKongs({
          codes:
            kongCodes,

          reward:
            selectedReward,
        });

        const reward =
          PROMO_REWARD_OPTIONS.find(
            (
              option,
            ) =>
              option.value ===
              selectedReward,
          );

        clearKongRedemption();

        Alert.alert(
          '✅ Canje realizado',
          `Los ${
            promotionSettings
              ?.required_kongs ??
            kongCodes.length
          } Kongs fueron canjeados correctamente por:\n\n${reward?.label ??
          'Premio'
          }`,
        );
      } catch (error) {
        console.error(
          'Error al canjear Kongs:',
          error,
        );

        Alert.alert(
          'No se pudo realizar el canje',
          error instanceof Error
            ? error.message
            : 'Ocurrió un error al validar los Kongs.',
        );
      } finally {
        setIsPromoProcessing(
          false,
        );
      }
    };

  const handleRedeemDorian =
    (): void => {
      if (
        isPromoProcessing
      ) {
        return;
      }

      const normalizedCode =
        dorianCode
          .trim()
          .toUpperCase();

      if (
        !normalizedCode
      ) {
        Alert.alert(
          'Código requerido',
          'Ingresa el código del Dorian de la Suerte.',
        );

        return;
      }

      if (
        !normalizedCode.startsWith(
          'BK-D',
        )
      ) {
        Alert.alert(
          'Código inválido',
          'El código no corresponde a un Dorian de la Suerte.',
        );

        return;
      }

      Alert.alert(
        'Validar Dorian',
        [
          `Código: ${normalizedCode}`,
          '',
          'Este cupón quedará marcado como canjeado.',
          '',
          '¿Deseas continuar?',
        ].join(
          '\n',
        ),
        [
          {
            text:
              'Cancelar',

            style:
              'cancel',
          },
          {
            text:
              'Confirmar',

            onPress:
              () => {
                void executeRedeemDorian();
              },
          },
        ],
      );
    };

  const executeRedeemDorian =
    async (): Promise<void> => {
      if (
        isPromoProcessing
      ) {
        return;
      }

      try {
        setIsPromoProcessing(
          true,
        );

        const normalizedCode =
          dorianCode
            .trim()
            .toUpperCase();

        const result =
          await redeemDorian(
            normalizedCode,
          );

        setDorianCode(
          '',
        );

        /*
         * La RPC ya registró el
         * reembolso dentro de la
         * sesión de caja actual.
         *
         * Refrescamos el resumen para
         * actualizar inmediatamente
         * el efectivo esperado.
         */
        await loadRefunds();

        const paymentMethodLabel =
          result.paymentMethod ===
            'cash'
            ? 'EFECTIVO'
            : 'TARJETA';

        const refundInstruction =
          result.paymentMethod ===
            'cash'
            ? [
              '',
              '💵 REEMBOLSO A ENTREGAR',
              `$${result.amount.toFixed(
                2,
              )}`,
              '',
              'Entrega este monto al cliente en efectivo.',
            ].join('\n')
            : [
              '',
              '💳 REEMBOLSO',
              `$${result.amount.toFixed(
                2,
              )}`,
              '',
              'Realiza la devolución por tarjeta.',
            ].join('\n');

        Alert.alert(
          '🍀 Dorian de la Suerte',
          [
            'Código válido y canjeado correctamente.',
            '',
            `Compra original: $${result.amount.toFixed(
              2,
            )}`,
            `Forma de pago: ${paymentMethodLabel}`,
            refundInstruction,
          ].join('\n'),
        );
      } catch (error) {
        console.error(
          'Error al canjear Dorian:',
          error,
        );

        Alert.alert(
          'No se pudo canjear Dorian',
          error instanceof Error
            ? error.message
            : 'Ocurrió un error al validar el código.',
        );
      } finally {
        setIsPromoProcessing(
          false,
        );
      }
    };

  /*
   * ============================
   * LOADING / ERROR
   * ============================
   */

  if (isLoading) {
    return (
      <View
        style={
          styles.centerContainer
        }
      >
        <ActivityIndicator
          size="large"
          color="#FFBF00"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Cargando caja...
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
          ⚠️ Error de caja
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
            void handleRefresh();
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

  /*
   * ============================
   * NAVEGACIÓN
   * ============================
   */

  const renderNavigation =
    () => {
      const tabs: Array<{
        value: CashView;
        label: string;
      }> = [
          {
            value:
              'current',
            label:
              'CAJA ACTUAL',
          },
          {
            value:
              'history',
            label:
              'HISTORIAL',
          },

          ...(
            promotionSettings
              ?.kong_enabled
              ? [
                {
                  value:
                    'kongs' as CashView,
                  label:
                    'CANJEAR KONGS',
                },
              ]
              : []
          ),

          ...(
            promotionSettings
              ?.lucky_dorian_enabled
              ? [
                {
                  value:
                    'dorian' as CashView,
                  label:
                    'DORIAN',
                },
              ]
              : []
          ),
        ];

      return (
        <View
          style={[
            styles.cashTabs,

            isPhone &&
            styles.cashTabsPhone,
          ]}
        >
          {tabs.map(
            (
              tab,
            ) => {
              const isActive =
                activeView ===
                tab.value;

              return (
                <TouchableOpacity
                  key={
                    tab.value
                  }
                  style={[
                    styles.cashTab,

                    isPhone &&
                    styles.cashTabPhone,

                    isActive &&
                    styles.cashTabActive,
                  ]}
                  onPress={() =>
                    setActiveView(
                      tab.value,
                    )
                  }
                >
                  <Text
                    style={[
                      styles.cashTabText,

                      isSmallPhone &&
                      styles.cashTabTextSmall,

                      isActive &&
                      styles.cashTabTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            },
          )}
        </View>
      );
    };

  /*
   * ============================
   * FILTROS
   * ============================
   */

  const renderHistoryFilters =
    () => {
      const filters: Array<{
        value:
        HistoryFilter;

        label: string;
      }> = [
          {
            value: 'today',
            label: 'Hoy',
          },

          {
            value: 'week',
            label:
              'Últimos 7 días',
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
            label:
              'Personalizado',
          },
        ];

      return (
        <>
          <View
            style={
              styles.historyFilters
            }
          >
            {filters.map(
              (filter) => {
                const isActive =
                  historyFilter ===
                  filter.value;

                return (
                  <TouchableOpacity
                    key={
                      filter.value
                    }
                    style={[
                      styles.historyFilterButton,

                      isActive &&
                      styles.historyFilterButtonActive,
                    ]}
                    onPress={() =>
                      handleHistoryFilter(
                        filter.value,
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.historyFilterText,

                        isActive &&
                        styles.historyFilterTextActive,
                      ]}
                    >
                      {
                        filter.label
                      }
                    </Text>
                  </TouchableOpacity>
                );
              },
            )}
          </View>

          {historyFilter ===
            'custom' ? (
            <View
              style={
                styles.historyDateRange
              }
            >
              <TouchableOpacity
                style={
                  styles.historyDateField
                }
                onPress={() =>
                  setDatePickerField(
                    'from',
                  )
                }
              >
                <Text
                  style={
                    styles.historyDateLabel
                  }
                >
                  DESDE
                </Text>

                <Text
                  style={
                    styles.historyDateValue
                  }
                >
                  {formatDateOnly(
                    historyFrom,
                  )}
                </Text>
              </TouchableOpacity>

              <Text
                style={
                  styles.historyDateSeparator
                }
              >
                →
              </Text>

              <TouchableOpacity
                style={
                  styles.historyDateField
                }
                onPress={() =>
                  setDatePickerField(
                    'to',
                  )
                }
              >
                <Text
                  style={
                    styles.historyDateLabel
                  }
                >
                  HASTA
                </Text>

                <Text
                  style={
                    styles.historyDateValue
                  }
                >
                  {formatDateOnly(
                    historyTo,
                  )}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {datePickerField ? (
            <DateTimePicker
              value={
                datePickerField ===
                  'from'
                  ? historyFrom
                  : historyTo
              }
              mode="date"
              display="default"
              maximumDate={
                new Date()
              }
              onChange={
                handleDateChange
              }
            />
          ) : null}
        </>
      );
    };

  /*
   * ============================
   * HISTORIAL
   * ============================
   */

  const renderHistory =
    () => {
      if (
        isHistoryLoading
      ) {
        return (
          <View
            style={
              styles.historyCenter
            }
          >
            <ActivityIndicator
              size="large"
              color="#FFBF00"
            />

            <Text
              style={
                styles.historyLoadingText
              }
            >
              Cargando historial...
            </Text>
          </View>
        );
      }

      if (historyError) {
        return (
          <View
            style={
              styles.historyCenter
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
              {historyError}
            </Text>

            <TouchableOpacity
              style={
                styles.retryButton
              }
              onPress={() => {
                void loadHistory();
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
          style={{
            flex: 1,
          }}
        >
          {renderHistoryFilters()}

          <View
            style={
              styles.historyListHeader
            }
          >
            <Text
              style={
                styles.historyListTitle
              }
            >
              Cortes de caja
            </Text>

            <Text
              style={
                styles.historyListCount
              }
            >
              {
                filteredCashHistory.length
              }{' '}
              {filteredCashHistory.length ===
                1
                ? 'corte'
                : 'cortes'}
            </Text>
          </View>

          {filteredCashHistory.length ===
            0 ? (
            <View
              style={
                styles.historyCenter
              }
            >
              <Text
                style={
                  styles.historyEmptyIcon
                }
              >
                🧾
              </Text>

              <Text
                style={
                  styles.historyEmptyTitle
                }
              >
                Sin cortes
              </Text>

              <Text
                style={
                  styles.historyEmptyText
                }
              >
                No hay cortes de
                caja para el periodo
                seleccionado.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={
                styles.historyScroll
              }
              contentContainerStyle={
                styles.historyContent
              }
              showsVerticalScrollIndicator={
                false
              }
            >
              {filteredCashHistory.map(
                (session) => {
                  const differenceValue =
                    session.differenceAmount ??
                    0;

                  return (
                    <TouchableOpacity
                      key={
                        session.id
                      }
                      activeOpacity={
                        0.8
                      }
                      style={
                        styles.historyCard
                      }
                      onPress={() =>
                        openHistoryDetail(
                          session,
                        )
                      }
                    >
                      <View
                        style={
                          styles.historyCardHeader
                        }
                      >
                        <View>
                          <Text
                            style={
                              styles.historyDate
                            }
                          >
                            {session.closedAt
                              ? formatDateTime(
                                session.closedAt,
                              )
                              : 'Sin fecha de cierre'}
                          </Text>

                          <Text
                            style={
                              styles.historyOpenedAt
                            }
                          >
                            Apertura:{' '}
                            {formatDateTime(
                              session.openedAt,
                            )}
                          </Text>

                          <Text
                            style={
                              styles.historyOpenedAt
                            }
                          >
                            Abrió:{' '}
                            {session.openedByName ??
                              'No registrado'}
                          </Text>

                          <Text
                            style={
                              styles.historyOpenedAt
                            }
                          >
                            Cerró:{' '}
                            {session.closedByName ??
                              'No registrado'}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.historyCardRight
                          }
                        >
                          <View
                            style={
                              styles.closedBadge
                            }
                          >
                            <Text
                              style={
                                styles.closedBadgeText
                              }
                            >
                              CERRADA
                            </Text>
                          </View>

                          <Text
                            style={
                              styles.historyDetailHint
                            }
                          >
                            Ver detalle ›
                          </Text>
                        </View>
                      </View>

                      <View
                        style={
                          styles.historySalesRow
                        }
                      >
                        <HistoryMetric
                          label="Ventas"
                          value={String(
                            session.salesCount ??
                            0,
                          )}
                        />

                        <HistoryMetric
                          label="💵 Efectivo"
                          value={`$${(
                            session.totalCashSales ??
                            0
                          ).toFixed(2)}`}
                        />

                        <HistoryMetric
                          label="💳 Tarjeta"
                          value={`$${(
                            session.totalCardSales ??
                            0
                          ).toFixed(2)}`}
                        />

                        <View
                          style={
                            styles.historyMetric
                          }
                        >
                          <Text
                            style={
                              styles.historyMetricLabel
                            }
                          >
                            Total
                          </Text>

                          <Text
                            style={
                              styles.historyTotalValue
                            }
                          >
                            $
                            {(
                              session.totalSales ??
                              0
                            ).toFixed(2)}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={
                          styles.historyDivider
                        }
                      />

                      <View
                        style={
                          styles.historyCashGrid
                        }
                      >
                        <HistoryCashValue
                          label="Fondo inicial"
                          value={
                            session.openingAmount
                          }
                        />

                        <HistoryCashValue
                          label="Esperado"
                          value={
                            session.expectedCash ??
                            0
                          }
                        />

                        <HistoryCashValue
                          label="Contado"
                          value={
                            session.countedCash ??
                            0
                          }
                        />

                        <View
                          style={
                            styles.historyCashItem
                          }
                        >
                          <Text
                            style={
                              styles.historyCashLabel
                            }
                          >
                            Diferencia
                          </Text>

                          <Text
                            style={[
                              styles.historyDifference,

                              differenceValue ===
                                0
                                ? styles.differenceNeutral
                                : differenceValue >
                                  0
                                  ? styles.differencePositive
                                  : styles.differenceNegative,
                            ]}
                          >
                            {formatDifference(
                              differenceValue,
                            )}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                },
              )}
            </ScrollView>
          )}

          {renderHistoryDetailModal()}
        </View>
      );
    };

  /*
   * ============================
   * MODAL DETALLE DEL CORTE
   * ============================
   */

  const renderHistoryDetailModal =
    () => {
      if (
        !selectedHistorySession
      ) {
        return null;
      }

      const session =
        selectedHistorySession;

      const differenceValue =
        session.differenceAmount ??
        0;

      return (
        <Modal
          visible={
            selectedHistorySession !==
            null
          }
          transparent
          animationType="fade"
          onRequestClose={
            closeHistoryDetail
          }
        >
          <View
            style={
              styles.historyModalOverlay
            }
          >
            <View
              style={
                styles.historyModalContent
              }
            >
              <View
                style={
                  styles.historyModalHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.historyModalTitle
                    }
                  >
                    Corte de caja
                  </Text>

                  <Text
                    style={
                      styles.historyModalSubtitle
                    }
                  >
                    {session.closedAt
                      ? formatDateTime(
                        session.closedAt,
                      )
                      : 'Sin fecha de cierre'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={
                    styles.historyModalClose
                  }
                  onPress={
                    closeHistoryDetail
                  }
                >
                  <Text
                    style={
                      styles.historyModalCloseText
                    }
                  >
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={
                  styles.historyModalScroll
                }
                showsVerticalScrollIndicator={
                  false
                }
              >
                <View
                  style={
                    styles.historyModalStatusRow
                  }
                >
                  <View
                    style={
                      styles.closedBadge
                    }
                  >
                    <Text
                      style={
                        styles.closedBadgeText
                      }
                    >
                      CERRADA
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.historyModalId
                    }
                  >
                    Corte #
                    {session.id
                      .slice(
                        0,
                        8,
                      )
                      .toUpperCase()}
                  </Text>
                </View>

                <DetailSection
                  title="Apertura"
                >
                  <DetailRow
                    label="Fecha y hora"
                    value={
                      formatDateTime(
                        session.openedAt,
                      )
                    }
                  />

                  <DetailRow
                    label="Abrió"
                    value={
                      session.openedByName ??
                      'No registrado'
                    }
                  />

                  <DetailRow
                    label="Fondo inicial"
                    value={
                      formatMoney(
                        session.openingAmount,
                      )
                    }
                    highlighted
                  />
                </DetailSection>

                <DetailSection
                  title="Cierre"
                >
                  <DetailRow
                    label="Fecha y hora"
                    value={
                      session.closedAt
                        ? formatDateTime(
                          session.closedAt,
                        )
                        : 'No registrado'
                    }
                  />

                  <DetailRow
                    label="Cerró"
                    value={
                      session.closedByName ??
                      'No registrado'
                    }
                  />
                </DetailSection>

                <DetailSection
                  title="Ventas"
                >
                  <DetailRow
                    label="Número de ventas"
                    value={String(
                      session.salesCount ??
                      0,
                    )}
                  />

                  <DetailRow
                    label="Ventas en efectivo"
                    value={
                      formatMoney(
                        session.totalCashSales ??
                        0,
                      )
                    }
                  />

                  <DetailRow
                    label="Ventas con tarjeta"
                    value={
                      formatMoney(
                        session.totalCardSales ??
                        0,
                      )
                    }
                  />

                  <DetailRow
                    label="Total vendido"
                    value={
                      formatMoney(
                        session.totalSales ??
                        0,
                      )
                    }
                    highlighted
                  />
                </DetailSection>

                <DetailSection
                  title="Reembolsos Dorian"
                >
                  <DetailRow
                    label="Reembolsos en efectivo"
                    value={
                      `-${formatMoney(
                        session.totalCashRefunds ??
                        0,
                      )}`
                    }
                  />

                  <DetailRow
                    label="Reembolsos en tarjeta"
                    value={
                      `-${formatMoney(
                        session.totalCardRefunds ??
                        0,
                      )}`
                    }
                  />

                  <DetailRow
                    label="Total reembolsado"
                    value={
                      `-${formatMoney(
                        session.totalRefunds ??
                        0,
                      )}`
                    }
                    highlighted
                  />
                </DetailSection>

                <DetailSection
                  title="Arqueo de caja"
                >
                  <DetailRow
                    label="Fondo inicial"
                    value={
                      formatMoney(
                        session.openingAmount,
                      )
                    }
                  />

                  <DetailRow
                    label="Efectivo esperado"
                    value={
                      formatMoney(
                        session.expectedCash ??
                        0,
                      )
                    }
                  />

                  <DetailRow
                    label="Efectivo contado"
                    value={
                      formatMoney(
                        session.countedCash ??
                        0,
                      )
                    }
                  />

                  <View
                    style={
                      styles.historyModalDifferenceRow
                    }
                  >
                    <Text
                      style={
                        styles.historyModalDifferenceLabel
                      }
                    >
                      Diferencia
                    </Text>

                    <Text
                      style={[
                        styles.historyModalDifferenceValue,

                        differenceValue ===
                          0
                          ? styles.differenceNeutral
                          : differenceValue >
                            0
                            ? styles.differencePositive
                            : styles.differenceNegative,
                      ]}
                    >
                      {formatDifference(
                        differenceValue,
                      )}
                    </Text>
                  </View>
                </DetailSection>
              </ScrollView>

              <TouchableOpacity
                style={
                  styles.historyModalDoneButton
                }
                onPress={
                  closeHistoryDetail
                }
              >
                <Text
                  style={
                    styles.historyModalDoneButtonText
                  }
                >
                  Cerrar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      );
    };

  /*
* ============================
* CANJE DE KONGS
* ============================
*/

  const renderKongRedemption =
    () => {
      return (
        <ScrollView
          style={{
            flex:
              1,
          }}
          contentContainerStyle={
            styles.promoScrollContent
          }
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.promoCard,

              isPhone &&
              styles.promoCardPhone,
            ]}
          >
            <Text
              style={
                styles.promoTitle
              }
            >
              🐾 Canjear Kongs
            </Text>

            <Text
              style={
                styles.promoSubtitle
              }
            >
              Ingresa los{' '}
              {promotionSettings
                ?.required_kongs ??
                0}{' '}
              códigos impresos en los Kongs
              del cliente.
            </Text>

            <View
              style={[
                styles.kongInputsGrid,

                isPhone &&
                styles.kongInputsGridPhone,
              ]}
            >
              {kongCodes.map(
                (
                  code,
                  index,
                ) => (
                  <View
                    key={
                      index
                    }
                    style={[
                      styles.kongInputContainer,

                      isPhone &&
                      styles.kongInputContainerPhone,
                    ]}
                  >
                    <Text
                      style={
                        styles.promoInputLabel
                      }
                    >
                      Kong{' '}
                      {index +
                        1}
                    </Text>

                    <TextInput
                      value={
                        code
                      }
                      onChangeText={(
                        value,
                      ) =>
                        handleKongCodeChange(
                          index,
                          value,
                        )
                      }
                      editable={
                        !isPromoProcessing
                      }
                      autoCapitalize="characters"
                      autoCorrect={
                        false
                      }
                      style={
                        styles.promoInput
                      }
                      placeholder="BK-K..."
                      placeholderTextColor="#666666"
                    />
                  </View>
                ),
              )}
            </View>

            <Text
              style={
                styles.promoSectionTitle
              }
            >
              Selecciona el premio
            </Text>

            <View
              style={[
                styles.rewardGrid,

                isPhone &&
                styles.rewardGridPhone,
              ]}
            >
              {PROMO_REWARD_OPTIONS.map(
                (
                  option,
                ) => {
                  const selected =
                    option.value ===
                    selectedReward;

                  return (
                    <TouchableOpacity
                      key={
                        option.value
                      }
                      style={[
                        styles.rewardButton,

                        isPhone &&
                        styles.rewardButtonPhone,

                        selected &&
                        styles.rewardButtonActive,
                      ]}
                      disabled={
                        isPromoProcessing
                      }
                      onPress={() =>
                        setSelectedReward(
                          option.value,
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.rewardButtonText,

                          selected &&
                          styles.rewardButtonTextActive,
                        ]}
                      >
                        {
                          option.label
                        }
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </View>

            <View
              style={
                styles.promoWarning
              }
            >
              <Text
                style={
                  styles.promoWarningText
                }
              >
                Los{' '}
                {promotionSettings
                  ?.required_kongs ??
                  0}{' '}
                códigos deben ser diferentes,
                válidos y no haber sido
                utilizados anteriormente.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.promoPrimaryButton,

                isPromoProcessing &&
                styles.buttonDisabled,
              ]}
              disabled={
                isPromoProcessing
              }
              onPress={
                handleRedeemKongs
              }
            >
              <Text
                style={
                  styles.promoPrimaryButtonText
                }
              >
                {isPromoProcessing
                  ? 'VALIDANDO...'
                  : 'VALIDAR Y CANJEAR'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    };

  /*
 * ============================
 * DORIAN DE LA SUERTE
 * ============================
 */

  const renderDorianRedemption =
    () => {
      return (
        <ScrollView
          style={{
            flex:
              1,
          }}
          contentContainerStyle={
            styles.promoScrollContent
          }
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.promoCard,
              styles.dorianCard,

              isPhone &&
              styles.promoCardPhone,
            ]}
          >
            <Text
              style={
                styles.promoTitle
              }
            >
              🍀 Dorian de la Suerte
            </Text>

            <Text
              style={
                styles.promoSubtitle
              }
            >
              Ingresa el código impreso
              en el Dorian presentado por
              el cliente.
            </Text>

            <Text
              style={
                styles.promoInputLabel
              }
            >
              Código Dorian
            </Text>

            <TextInput
              value={
                dorianCode
              }
              onChangeText={(
                value,
              ) =>
                setDorianCode(
                  value
                    .toUpperCase()
                    .replace(
                      /\s/g,
                      '',
                    ),
                )
              }
              autoCapitalize="characters"
              autoCorrect={
                false
              }
              style={
                styles.promoInput
              }
              placeholder="BK-D..."
              placeholderTextColor="#666666"
            />

            <View
              style={
                styles.dorianNotice
              }
            >
              <Text
                style={
                  styles.dorianNoticeTitle
                }
              >
                🎉 TU COMPRA ES GRATIS
              </Text>

              <Text
                style={
                  styles.dorianNoticeText
                }
              >
                Al validar el Dorian, el
                sistema consultará la compra
                original y te indicará el
                monto exacto a devolver y
                su forma de pago.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.promoPrimaryButton,

                (
                  !dorianCode
                    .trim()
                    .toUpperCase()
                    .startsWith(
                      'BK-D',
                    ) ||
                  isPromoProcessing
                ) &&
                styles.buttonDisabled,
              ]}
              disabled={
                !dorianCode
                  .trim()
                  .toUpperCase()
                  .startsWith(
                    'BK-D',
                  ) ||
                isPromoProcessing
              }
              onPress={
                handleRedeemDorian
              }
            >
              <Text
                style={
                  styles.promoPrimaryButtonText
                }
              >
                {isPromoProcessing
                  ? 'VALIDANDO...'
                  : 'VALIDAR DORIAN'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    };

  /*
   * ============================
   * VISTA HISTORIAL
   * ============================
   */

  if (
    activeView ===
      'kongs' &&
    promotionSettings
      ?.kong_enabled
  ) {
    return (
      <View
        style={[
          styles.container,

          isPhone &&
          styles.containerPhone,
        ]}
      >
        {renderNavigation()}

        {renderKongRedemption()}
      </View>
    );
  }

  if (
    activeView ===
      'dorian' &&
    promotionSettings
      ?.lucky_dorian_enabled
  ) {
    return (
      <View
        style={[
          styles.container,

          isPhone &&
          styles.containerPhone,
        ]}
      >
        {renderNavigation()}

        {renderDorianRedemption()}
      </View>
    );
  }
  if (
    activeView ===
    'history'
  ) {
    return (
      <View
        style={
          styles.container
        }
      >
        {renderNavigation()}

        {renderHistory()}
      </View>
    );
  }

  /*
   * ============================
   * CAJA CERRADA
   * ============================
   */

  if (!cashSession) {
    return (
      <View
        style={
          styles.container
        }
      >
        {renderNavigation()}

        <View
          style={
            styles.openCashCard
          }
        >
          <Text
            style={
              styles.title
            }
          >
            Apertura de caja
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Ingresa el fondo inicial
            disponible para cambio.
          </Text>

          <Text
            style={
              styles.inputLabel
            }
          >
            Fondo inicial
          </Text>

          <TextInput
            value={
              openingAmountText
            }
            onChangeText={(
              value,
            ) =>
              handleMoneyInput(
                value,
                setOpeningAmountText,
              )
            }
            keyboardType="decimal-pad"
            editable={
              !isProcessing
            }
            style={
              styles.input
            }
            placeholder="1000.00"
            placeholderTextColor="#777777"
          />

          <TouchableOpacity
            style={[
              styles.primaryButton,

              isProcessing &&
              styles.buttonDisabled,
            ]}
            disabled={
              isProcessing
            }
            onPress={() => {
              void handleOpenCash();
            }}
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              {isProcessing
                ? 'Abriendo...'
                : 'Abrir caja'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /*
   * ============================
   * CAJA ABIERTA
   * ============================
   */

  return (
    <View
      style={[
        styles.container,

        isPhone &&
        styles.containerPhone,
      ]}
    >
      {renderNavigation()}

      <ScrollView
        style={{
          flex: 1,
        }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: isPhone
            ? 56
            : 30,
        }}
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.header,

            isPhone &&
            styles.headerPhone,
          ]}
        >
          <View>
            <Text
              style={
                styles.title
              }
            >
              Caja abierta
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              Desde{' '}
              {formatDateTime(
                cashSession.openedAt,
              )}
            </Text>
          </View>

          <View
            style={
              styles.openBadge
            }
          >
            <Text
              style={
                styles.openBadgeText
              }
            >
              ● ABIERTA
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.summaryContainer,

            isPhone &&
            styles.summaryContainerPhone,
          ]}
        >
          <View
            style={[
              styles.summaryCard,

              isPhone &&
              styles.summaryCardPhone,
            ]}
          >
            <Text
              style={
                styles.summaryLabel
              }
            >
              Fondo inicial
            </Text>

            <Text
              style={
                styles.summaryValue
              }
            >
              $
              {cashSession
                .openingAmount
                .toFixed(2)}
            </Text>
          </View>

          <View
            style={[
              styles.summaryCard,

              isPhone &&
              styles.summaryCardPhone,
            ]}
          >
            <Text
              style={
                styles.summaryLabel
              }
            >
              💵 Efectivo
            </Text>

            <Text
              style={
                styles.summaryValue
              }
            >
              $
              {summary.cash.toFixed(
                2,
              )}
            </Text>
          </View>

          <View
            style={[
              styles.summaryCard,

              isPhone &&
              styles.summaryCardPhone,
            ]}
          >
            <Text
              style={
                styles.summaryLabel
              }
            >
              💳 Tarjeta
            </Text>

            <Text
              style={
                styles.summaryValue
              }
            >
              $
              {summary.card.toFixed(
                2,
              )}
            </Text>
          </View>

          <View
            style={[
              styles.summaryCard,

              isPhone &&
              styles.summaryCardPhone,
            ]}
          >
            <Text
              style={
                styles.summaryLabel
              }
            >
              Ventas
            </Text>

            <Text
              style={
                styles.summaryValue
              }
            >
              {
                sessionSales.length
              }
            </Text>
          </View>
        </View>

        <View
          style={
            styles.closingCard
          }
        >
          <View
            style={[
              styles.closingHeader,

              isPhone &&
              styles.closingHeaderPhone,
            ]}
          >
            <Text
              style={
                styles.closingTitle
              }
            >
              Cierre de caja
            </Text>

            <Text
              style={
                styles.totalSales
              }
            >
              Total vendido: $
              {summary.total.toFixed(
                2,
              )}
            </Text>
          </View>

          <View
            style={
              styles.cashCalculation
            }
          >
            <View
              style={
                styles.calculationRow
              }
            >
              <Text
                style={
                  styles.calculationLabel
                }
              >
                Fondo inicial
              </Text>

              <Text
                style={
                  styles.calculationValue
                }
              >
                $
                {cashSession
                  .openingAmount
                  .toFixed(2)}
              </Text>
            </View>

            <View
              style={
                styles.calculationRow
              }
            >
              <Text
                style={
                  styles.calculationLabel
                }
              >
                + Ventas en efectivo
              </Text>

              <Text
                style={
                  styles.calculationValue
                }
              >
                $
                {summary.cash.toFixed(
                  2,
                )}
              </Text>
            </View>

            {refundSummary.total >
              0 ? (
              <>
                <View
                  style={
                    styles.calculationRow
                  }
                >
                  <Text
                    style={
                      styles.calculationLabel
                    }
                  >
                    - Reembolsos Dorian
                    en efectivo
                  </Text>

                  <Text
                    style={
                      styles.calculationValue
                    }
                  >
                    -$
                    {refundSummary.cash.toFixed(
                      2,
                    )}
                  </Text>
                </View>

                {refundSummary.card >
                  0 ? (
                  <View
                    style={
                      styles.calculationRow
                    }
                  >
                    <Text
                      style={
                        styles.calculationLabel
                      }
                    >
                      - Reembolsos Dorian
                      en tarjeta
                    </Text>

                    <Text
                      style={
                        styles.calculationValue
                      }
                    >
                      -$
                      {refundSummary.card.toFixed(
                        2,
                      )}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}

            <View
              style={
                styles.calculationSeparator
              }
            />

            <View
              style={
                styles.calculationRow
              }
            >
              <Text
                style={
                  styles.expectedLabel
                }
              >
                Efectivo esperado
              </Text>

              <Text
                style={
                  styles.expectedValue
                }
              >
                $
                {expectedCash.toFixed(
                  2,
                )}
              </Text>
            </View>
          </View>

          <Text
            style={
              styles.inputLabel
            }
          >
            Efectivo contado en caja
          </Text>

          <TextInput
            value={
              countedCashText
            }
            onChangeText={(
              value,
            ) =>
              handleMoneyInput(
                value,
                setCountedCashText,
              )
            }
            keyboardType="decimal-pad"
            editable={
              !isProcessing
            }
            style={
              styles.input
            }
            placeholder="0.00"
            placeholderTextColor="#777777"
          />

          <View
            style={
              styles.differenceContainer
            }
          >
            <Text
              style={
                styles.differenceLabel
              }
            >
              Diferencia
            </Text>

            <Text
              style={[
                styles.differenceValue,

                difference ===
                  null ||
                  difference === 0
                  ? styles.differenceNeutral
                  : difference >
                    0
                    ? styles.differencePositive
                    : styles.differenceNegative,
              ]}
            >
              {difference === null
                ? '$0.00'
                : formatDifference(
                  difference,
                )}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.closeButton,

              (
                countedCash ===
                null ||
                isProcessing
              ) &&
              styles.buttonDisabled,
            ]}
            disabled={
              countedCash ===
              null ||
              isProcessing
            }
            onPress={
              handleCloseCashPrompt
            }
          >
            <Text
              style={
                styles.closeButtonText
              }
            >
              {isProcessing
                ? 'Cerrando...'
                : 'Cerrar caja'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

/*
 * ============================
 * COMPONENTES AUXILIARES
 * ============================
 */

interface HistoryCashValueProps {
  label: string;
  value: number;
}

function HistoryCashValue({
  label,
  value,
}: HistoryCashValueProps) {
  return (
    <View
      style={
        styles.historyCashItem
      }
    >
      <Text
        style={
          styles.historyCashLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.historyCashValue
        }
      >
        {formatMoney(
          value,
        )}
      </Text>
    </View>
  );
}

interface HistoryMetricProps {
  label: string;
  value: string;
}

function HistoryMetric({
  label,
  value,
}: HistoryMetricProps) {
  return (
    <View
      style={
        styles.historyMetric
      }
    >
      <Text
        style={
          styles.historyMetricLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.historyMetricValue
        }
      >
        {value}
      </Text>
    </View>
  );
}

interface DetailSectionProps {
  title: string;
  children:
  React.ReactNode;
}

function DetailSection({
  title,
  children,
}: DetailSectionProps) {
  return (
    <View
      style={
        styles.historyModalSection
      }
    >
      <Text
        style={
          styles.historyModalSectionTitle
        }
      >
        {title}
      </Text>

      <View
        style={
          styles.historyModalSectionBody
        }
      >
        {children}
      </View>
    </View>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  highlighted?: boolean;
}

function DetailRow({
  label,
  value,
  highlighted = false,
}: DetailRowProps) {
  return (
    <View
      style={
        styles.historyModalDetailRow
      }
    >
      <Text
        style={
          styles.historyModalDetailLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          highlighted
            ? styles.historyModalDetailValueHighlighted
            : styles.historyModalDetailValue
        }
      >
        {value}
      </Text>
    </View>
  );
}

/*
 * ============================
 * FECHAS / DINERO
 * ============================
 */

function parseSupabaseDate(
  dateValue: string,
): Date | null {
  if (!dateValue) {
    return null;
  }

  let normalizedValue =
    dateValue.trim();

  normalizedValue =
    normalizedValue.replace(
      /^(\d{4}-\d{2}-\d{2})\s/,
      '$1T',
    );

  normalizedValue =
    normalizedValue.replace(
      /([+-]\d{2})$/,
      '$1:00',
    );

  const date =
    new Date(
      normalizedValue,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date;
}

function formatDateTime(
  dateValue: string,
): string {
  const date =
    parseSupabaseDate(
      dateValue,
    );

  if (!date) {
    return 'Fecha no disponible';
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

function formatDateOnly(
  date: Date,
): string {
  return date.toLocaleDateString(
    'es-MX',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    },
  );
}

function formatMoney(
  amount: number,
): string {
  return `$${Number(
    amount,
  ).toFixed(2)}`;
}

function formatDifference(
  difference: number,
): string {
  return `${difference > 0
    ? '+'
    : ''
    }$${difference.toFixed(
      2,
    )}`;
}

function startOfDay(
  date: Date,
): Date {
  const result =
    new Date(date);

  result.setHours(
    0,
    0,
    0,
    0,
  );

  return result;
}

function endOfDay(
  date: Date,
): Date {
  const result =
    new Date(date);

  result.setHours(
    23,
    59,
    59,
    999,
  );

  return result;
}

function roundCurrency(
  amount: number,
): number {
  return (
    Math.round(
      (
        amount +
        Number.EPSILON
      ) * 100,
    ) / 100
  );
}