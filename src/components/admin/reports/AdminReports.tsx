import { useBusiness } from '../../../context/BusinessContext';

import React, {
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    ActivityIndicator,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import DateTimePicker, {
    DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import {
    DailySalesReport,
    getDailySalesReport,
    getModifierSalesReport,
    getProductSalesReport,
    getPromotionActivityReport,
    getSalesReportSummary,
    ModifierSalesReport,
    ProductSalesReport,
    PromotionActivityReport,
    SalesReportSummary,
} from '../../../services/reportService';

import {
    getModifierGroups,
    ModifierGroupEntity,
} from '../../../services/modifierService';

import {
    styles,
  setBrandPrimaryColor,
} from './AdminReports.styles';

import {
    AdminReportSelect,
    AdminReportSelectOption,
} from './AdminReportSelect';

import {
    useCurrency,
} from '../../../hooks/useCurrency';

type DateFilter =
    | 'today'
    | 'week'
    | 'month'
    | 'year'
    | 'custom';

type ProductChartMetric =
    | 'units'
    | 'revenue';

type ReportSection = string;

const EMPTY_SUMMARY:
    SalesReportSummary = {
    total_revenue: 0,
    orders_count: 0,
    average_ticket: 0,
    items_sold: 0,
};

export function AdminReports() {
  const { theme: businessTheme } = useBusiness();
    setBrandPrimaryColor(businessTheme.primary);

    const {
        formatCurrency,
        formatCompactCurrency,
    } = useCurrency();

    const [
        productChartMetric,
        setProductChartMetric,
    ] = useState<ProductChartMetric>(
        'units',
    );

    const [
        dailySales,
        setDailySales,
    ] = useState<DailySalesReport[]>(
        [],
    );

    const [
        dateFilter,
        setDateFilter,
    ] = useState<DateFilter>(
        'today',
    );

    const [
        activeSection,
        setActiveSection,
    ] = useState<ReportSection>(
        'overview',
    );

    const [
        summary,
        setSummary,
    ] = useState<SalesReportSummary>(
        EMPTY_SUMMARY,
    );

    const [
        products,
        setProducts,
    ] = useState<
        ProductSalesReport[]
    >([]);

    const [
        modifierGroups,
        setModifierGroups,
    ] = useState<ModifierGroupEntity[]>([]);

    const [
        modifierReports,
        setModifierReports,
    ] = useState<
        Record<string, ModifierSalesReport[]>
    >({});

    const [
        promotionActivities,
        setPromotionActivities,
    ] = useState<PromotionActivityReport[]>([]);

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState<
        string | null
    >(null);

    const [
        customStartDate,
        setCustomStartDate,
    ] = useState<Date>(
        new Date(),
    );

    const [
        customEndDate,
        setCustomEndDate,
    ] = useState<Date>(
        new Date(),
    );

    const [
        showStartDatePicker,
        setShowStartDatePicker,
    ] = useState(false);

    const [
        showEndDatePicker,
        setShowEndDatePicker,
    ] = useState(false);

    const dateRange =
        useMemo(
            () =>
                getDateRange(
                    dateFilter,
                    customStartDate,
                    customEndDate,
                ),
            [
                dateFilter,
                customStartDate,
                customEndDate,
            ],
        );

    useEffect(() => {
        const loadReports =
            async () => {
                try {
                    setIsLoading(
                        true,
                    );

                    setErrorMessage(
                        null,
                    );

                    const allGroups =
                        await getModifierGroups();

                    const activeGroups =
                        allGroups
                            .filter(
                                group =>
                                    group.is_active,
                            )
                            .sort(
                                (first, second) => {
                                    if (
                                        first.position !==
                                        second.position
                                    ) {
                                        return (
                                            first.position -
                                            second.position
                                        );
                                    }

                                    return first.name.localeCompare(
                                        second.name,
                                        'es',
                                        {
                                            sensitivity:
                                                'base',
                                        },
                                    );
                                },
                            );

                    const [
                        summaryData,
                        productData,
                        dailySalesData,
                        promotionActivityData,
                        modifierReportEntries,
                    ] =
                        await Promise.all([
                            getSalesReportSummary(
                                dateRange.from,
                                dateRange.to,
                            ),

                            getProductSalesReport(
                                dateRange.from,
                                dateRange.to,
                                50,
                            ),

                            getDailySalesReport(
                                dateRange.from,
                                dateRange.to,
                            ),

                            getPromotionActivityReport(
                                dateRange.from,
                                dateRange.to,
                            ),

                            Promise.all(
                                activeGroups.map(
                                    async group =>
                                        [
                                            group.code,
                                            await getModifierSalesReport(
                                                dateRange.from,
                                                dateRange.to,
                                                group.code,
                                            ),
                                        ] as const,
                                ),
                            ),
                        ]);

                    setSummary(
                        summaryData,
                    );

                    setProducts(
                        productData,
                    );

                    setDailySales(
                        dailySalesData,
                    );

                    setPromotionActivities(
                        promotionActivityData,
                    );

                    setModifierGroups(
                        activeGroups,
                    );

                    setModifierReports(
                        Object.fromEntries(
                            modifierReportEntries,
                        ),
                    );
                } catch (error) {
                    console.error(
                        'Error loading reports:',
                        error,
                    );

                    setErrorMessage(
                        error instanceof Error
                            ? error.message
                            : 'No se pudieron cargar los reportes.',
                    );
                } finally {
                    setIsLoading(
                        false,
                    );
                }
            };

        void loadReports();
    }, [
        dateRange.from,
        dateRange.to,
    ]);

    const reportRows =
        useMemo(
            () =>
                activeSection ===
                    'products'
                    ? []
                    : modifierReports[
                        activeSection
                    ] ?? [],
            [
                activeSection,
                modifierReports,
            ],
        );

    const activeModifierGroup =
        useMemo(
            () =>
                modifierGroups.find(
                    group =>
                        group.code ===
                        activeSection,
                ) ?? null,
            [
                activeSection,
                modifierGroups,
            ],
        );

    const productsByRevenue =
        useMemo(
            () =>
                [...products].sort(
                    (
                        first,
                        second,
                    ) =>
                        second.revenue -
                        first.revenue,
                ),
            [
                products,
            ],
        );

    const promotionSummary =
        useMemo(
            () => {
                let collectRedemptions = 0;
                let refundRedemptions = 0;
                let refundAmount = 0;
                let modifierDiscountAmount = 0;

                promotionActivities.forEach(
                    event => {
                        if (
                            event.promotion_type ===
                            'collect_reward'
                        ) {
                            collectRedemptions += 1;
                        } else if (
                            event.promotion_type ===
                            'order_refund'
                        ) {
                            refundRedemptions += 1;
                            refundAmount +=
                                event.amount;
                        } else if (
                            event.promotion_type ===
                            'modifier_discount'
                        ) {
                            modifierDiscountAmount +=
                                event.amount;
                        }
                    },
                );

                return {
                    collectRedemptions,
                    refundRedemptions,
                    refundAmount,
                    modifierDiscountAmount,
                };
            },
            [promotionActivities],
        );


    const dateOptions =
        useMemo<AdminReportSelectOption[]>(
            () => [
                {
                    value: 'today',
                    label: 'Hoy',
                    description: 'Ventas y actividad de hoy.',
                },
                {
                    value: 'week',
                    label: 'Últimos 7 días',
                    description: 'Incluye hoy y los seis días anteriores.',
                },
                {
                    value: 'month',
                    label: 'Este mes',
                    description: 'Desde el primer día del mes actual.',
                },
                {
                    value: 'year',
                    label: 'Este año',
                    description: 'Desde el 1 de enero hasta hoy.',
                },
                {
                    value: 'custom',
                    label: 'Personalizado',
                    description: 'Selecciona una fecha inicial y final.',
                },
            ],
            [],
        );

    const reportOptions =
        useMemo<AdminReportSelectOption[]>(
            () => [
                {
                    value: 'overview',
                    label: 'Resumen general',
                    description: 'Indicadores principales y tendencia de ventas.',
                },
                {
                    value: 'products',
                    label: 'Productos',
                    description: 'Más vendidos y productos con mayor ingreso.',
                },
                {
                    value: 'promotions',
                    label: 'Promociones',
                    description: 'Canjes, reembolsos y descuentos promocionales.',
                },
                ...modifierGroups.map(
                    group => ({
                        value: group.code,
                        label: group.name,
                        description: `Uso de opciones del grupo ${group.name}.`,
                    }),
                ),
            ],
            [modifierGroups],
        );

    const activeReportTitle =
        useMemo(
            () =>
                reportOptions.find(
                    option =>
                        option.value ===
                        activeSection,
                )?.label ??
                'Reporte',
            [
                activeSection,
                reportOptions,
            ],
        );

    const activeReportDescription =
        useMemo(
            () =>
                reportOptions.find(
                    option =>
                        option.value ===
                        activeSection,
                )?.description ??
                '',
            [
                activeSection,
                reportOptions,
            ],
        );

    const handleStartDateChange = (
        event:
            DateTimePickerEvent,
        selectedDate?:
            Date,
    ): void => {
        setShowStartDatePicker(
            false,
        );

        if (
            event.type !== 'set' ||
            !selectedDate
        ) {
            return;
        }

        setCustomStartDate(
            selectedDate,
        );

        if (
            selectedDate >
            customEndDate
        ) {
            setCustomEndDate(
                selectedDate,
            );
        }
    };

    const handleEndDateChange = (
        event:
            DateTimePickerEvent,
        selectedDate?:
            Date,
    ): void => {
        setShowEndDatePicker(
            false,
        );

        if (
            event.type !== 'set' ||
            !selectedDate
        ) {
            return;
        }

        setCustomEndDate(
            selectedDate,
        );
    };

    if (isLoading) {
        return (
            <View
                style={
                    styles.loadingContainer
                }
            >
                <ActivityIndicator
                    size="large"
                />

                <Text
                    style={
                        styles.loadingText
                    }
                >
                    Cargando reportes...
                </Text>
            </View>
        );
    }

    if (errorMessage) {
        return (
            <View
                style={
                    styles.errorContainer
                }
            >
                <Text
                    style={
                        styles.errorTitle
                    }
                >
                    No se pudieron cargar
                    los reportes
                </Text>

                <Text
                    style={
                        styles.errorText
                    }
                >
                    {errorMessage}
                </Text>
            </View>
        );
    }

    return (
        <>
            <ScrollView
                style={
                    styles.container
                }
                contentContainerStyle={
                    styles.contentContainer
                }
                showsVerticalScrollIndicator={
                    false
                }
            >
                <View
                    style={styles.pageHeader}
                >
                    <Text
                        style={styles.pageTitle}
                    >
                        Reportes
                    </Text>

                    <Text
                        style={styles.pageSubtitle}
                    >
                        Consulta solo la información que necesitas y cambia de reporte sin recorrer una pantalla interminable.
                    </Text>
                </View>

                <View
                    style={styles.controlsGrid}
                >
                    <AdminReportSelect
                        label="Periodo"
                        value={dateFilter}
                        options={dateOptions}
                        onChange={value =>
                            setDateFilter(
                                value as DateFilter,
                            )
                        }
                        modalTitle="Seleccionar periodo"
                        modalSubtitle="Elige el rango de tiempo que quieres analizar."
                    />

                    <AdminReportSelect
                        label="Reporte"
                        value={activeSection}
                        options={reportOptions}
                        onChange={setActiveSection}
                        modalTitle="Seleccionar reporte"
                        modalSubtitle="Solo se mostrará el contenido del reporte elegido."
                    />
                </View>

                {dateFilter === 'custom' ? (
                    <View
                        style={styles.customDateContainer}
                    >
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() =>
                                setShowStartDatePicker(
                                    true,
                                )
                            }
                        >
                            <Text
                                style={styles.dateButtonLabel}
                            >
                                Desde
                            </Text>

                            <Text
                                style={styles.dateButtonValue}
                            >
                                {formatDate(
                                    customStartDate,
                                )}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() =>
                                setShowEndDatePicker(
                                    true,
                                )
                            }
                        >
                            <Text
                                style={styles.dateButtonLabel}
                            >
                                Hasta
                            </Text>

                            <Text
                                style={styles.dateButtonValue}
                            >
                                {formatDate(
                                    customEndDate,
                                )}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                <View
                    style={styles.activeReportHeader}
                >
                    <View style={{ flex: 1 }}>
                        <Text
                            style={styles.activeReportTitle}
                        >
                            {activeReportTitle}
                        </Text>

                        {activeReportDescription ? (
                            <Text
                                style={styles.activeReportDescription}
                            >
                                {activeReportDescription}
                            </Text>
                        ) : null}
                    </View>

                    <Text
                        style={styles.activeReportPeriod}
                    >
                        {dateOptions.find(
                            option =>
                                option.value ===
                                dateFilter,
                        )?.label ?? ''}
                    </Text>
                </View>

                {activeSection === 'overview' ? (
                    <>
                        <View
                            style={styles.summaryGrid}
                        >
                            <SummaryCard
                                label="Ventas"
                                value={formatCurrency(
                                    summary.total_revenue,
                                )}
                            />

                            <SummaryCard
                                label="Órdenes"
                                value={String(
                                    summary.orders_count,
                                )}
                            />

                            <SummaryCard
                                label="Ticket promedio"
                                value={formatCurrency(
                                    summary.average_ticket,
                                )}
                            />

                            <SummaryCard
                                label="Artículos"
                                value={String(
                                    summary.items_sold,
                                )}
                            />
                        </View>

                        <DailySalesChart
                            data={dailySales}
                            formatCompactCurrency={
                                formatCompactCurrency
                            }
                        />
                    </>
                ) : activeSection === 'products' ? (
                    <>
                        <TopProductsChart
                            data={products}
                            metric={productChartMetric}
                            onMetricChange={
                                setProductChartMetric
                            }
                            formatCurrency={
                                formatCurrency
                            }
                        />

                        <View
                            style={styles.reportCard}
                        >
                            <Text
                                style={styles.reportTitle}
                            >
                                Más vendidos
                            </Text>

                            {products.length > 0 ? (
                                products.map(
                                    (
                                        product,
                                        index,
                                    ) => (
                                        <RankingRow
                                            key={product.id}
                                            index={index}
                                            name={product.name}
                                            value={`${product.units_sold} u.`}
                                        />
                                    ),
                                )
                            ) : (
                                <EmptyReport />
                            )}
                        </View>

                        <View
                            style={styles.reportCard}
                        >
                            <Text
                                style={styles.reportTitle}
                            >
                                Mayor ingreso
                            </Text>

                            {productsByRevenue.length > 0 ? (
                                productsByRevenue.map(
                                    (
                                        product,
                                        index,
                                    ) => (
                                        <RankingRow
                                            key={product.id}
                                            index={index}
                                            name={product.name}
                                            value={formatCurrency(
                                                product.revenue,
                                            )}
                                        />
                                    ),
                                )
                            ) : (
                                <EmptyReport />
                            )}
                        </View>
                    </>
                ) : activeSection === 'promotions' ? (
                    <>
                        <View
                            style={styles.promotionSummaryGrid}
                        >
                            <SummaryCard
                                label="Canjes"
                                value={String(
                                    promotionSummary.collectRedemptions,
                                )}
                            />

                            <SummaryCard
                                label="Reembolsos"
                                value={String(
                                    promotionSummary.refundRedemptions,
                                )}
                            />

                            <SummaryCard
                                label="Importe reembolsado"
                                value={formatCurrency(
                                    promotionSummary.refundAmount,
                                )}
                            />

                            <SummaryCard
                                label="Descuentos"
                                value={formatCurrency(
                                    promotionSummary.modifierDiscountAmount,
                                )}
                            />
                        </View>

                        <View
                            style={styles.reportCard}
                        >
                            <Text
                                style={styles.reportTitle}
                            >
                                Historial de promociones
                            </Text>

                            <Text
                                style={styles.promotionReportSubtitle}
                            >
                                Canjes, reembolsos y promociones de modificadores del periodo seleccionado.
                            </Text>

                            {promotionActivities.length > 0 ? (
                                <View
                                    style={styles.promotionList}
                                >
                                    {promotionActivities.map(
                                        event => (
                                            <PromotionActivityCard
                                                key={event.event_id}
                                                event={event}
                                                formatCurrency={
                                                    formatCurrency
                                                }
                                            />
                                        ),
                                    )}
                                </View>
                            ) : (
                                <EmptyPromotionReport />
                            )}
                        </View>
                    </>
                ) : (
                    <View
                        style={styles.reportCard}
                    >
                        <Text
                            style={styles.reportTitle}
                        >
                            {getSectionTitle(
                                activeModifierGroup,
                            )}
                        </Text>

                        <Text
                            style={styles.sectionHint}
                        >
                            Ranking por cantidad utilizada durante el periodo seleccionado.
                        </Text>

                        {reportRows.length > 0 ? (
                            reportRows.map(
                                (
                                    row,
                                    index,
                                ) => (
                                    <RankingRow
                                        key={row.id}
                                        index={index}
                                        name={row.name}
                                        value={`${row.units_sold} u.`}
                                        dimmed={
                                            row.units_sold ===
                                            0
                                        }
                                    />
                                ),
                            )
                        ) : (
                            <EmptyReport />
                        )}
                    </View>
                )}
            </ScrollView>

            {showStartDatePicker ? (
                <DateTimePicker
                    value={
                        customStartDate
                    }
                    mode="date"
                    display="default"
                    maximumDate={
                        new Date()
                    }
                    onChange={
                        handleStartDateChange
                    }
                />
            ) : null}

            {showEndDatePicker ? (
                <DateTimePicker
                    value={
                        customEndDate
                    }
                    mode="date"
                    display="default"
                    minimumDate={
                        customStartDate
                    }
                    maximumDate={
                        new Date()
                    }
                    onChange={
                        handleEndDateChange
                    }
                />
            ) : null}
        </>
    );
}

interface SummaryCardProps {
    label: string;
    value: string;
}

function SummaryCard({
    label,
    value,
}: SummaryCardProps) {
    return (
        <View
            style={
                styles.summaryCard
            }
        >
            <Text
                style={
                    styles.summaryValue
                }
            >
                {value}
            </Text>

            <Text
                style={
                    styles.summaryLabel
                }
            >
                {label}
            </Text>
        </View>
    );
}

interface RankingRowProps {
    index: number;
    name: string;
    value: string;
    dimmed?: boolean;
}

function RankingRow({
    index,
    name,
    value,
    dimmed = false,
}: RankingRowProps) {
    return (
        <View
            style={[
                styles.rankingRow,

                dimmed &&
                styles.rankingRowDimmed,
            ]}
        >
            <Text
                style={
                    styles.rankingPosition
                }
            >
                {index + 1}
            </Text>

            <Text
                style={
                    styles.rankingName
                }
                numberOfLines={
                    1
                }
            >
                {name}
            </Text>

            <Text
                style={
                    styles.rankingValue
                }
            >
                {value}
            </Text>
        </View>
    );
}

interface PromotionActivityCardProps {
    event: PromotionActivityReport;
    formatCurrency: (value: number) => string;
}

function PromotionActivityCard({
    event,
    formatCurrency,
}: PromotionActivityCardProps) {
    const typeLabel =
        getPromotionTypeLabel(
            event.promotion_type,
        );

    return (
        <View
            style={
                styles.promotionEventCard
            }
        >
            <View
                style={
                    styles.promotionEventHeader
                }
            >
                <View
                    style={{ flex: 1 }}
                >
                    <Text
                        style={
                            styles.promotionEventName
                        }
                    >
                        {event.promotion_name}
                    </Text>

                    <Text
                        style={
                            styles.promotionEventDate
                        }
                    >
                        {formatReportDateTime(
                            event.event_at,
                        )}
                    </Text>
                </View>

                <View
                    style={
                        styles.promotionTypeBadge
                    }
                >
                    <Text
                        style={
                            styles.promotionTypeText
                        }
                    >
                        {typeLabel}
                    </Text>
                </View>
            </View>

            {event.benefit_name ? (
                <PromotionDetailRow
                    label="Beneficio"
                    value={
                        event.benefit_name
                    }
                />
            ) : null}

            {event.codes ? (
                <PromotionDetailRow
                    label="Código(s)"
                    value={event.codes}
                />
            ) : null}

            {event.order_references ? (
                <PromotionDetailRow
                    label="Orden(es)"
                    value={
                        event.order_references
                    }
                />
            ) : null}

            {event.user_name ? (
                <PromotionDetailRow
                    label="Canjeó"
                    value={event.user_name}
                />
            ) : null}

            <View
                style={
                    styles.promotionEventFooter
                }
            >
                <Text
                    style={
                        styles.promotionEventApplications
                    }
                >
                    {event.promotion_type ===
                    'collect_reward'
                        ? `${event.applications_count} código${event.applications_count === 1 ? '' : 's'}`
                        : `${event.applications_count} aplicación${event.applications_count === 1 ? '' : 'es'}`}
                </Text>

                {event.amount > 0 ? (
                    <Text
                        style={
                            styles.promotionEventAmount
                        }
                    >
                        {event.promotion_type ===
                        'order_refund'
                            ? `Reembolso ${formatCurrency(event.amount)}`
                            : `Descuento ${formatCurrency(event.amount)}`}
                    </Text>
                ) : null}
            </View>
        </View>
    );
}

interface PromotionDetailRowProps {
    label: string;
    value: string;
}

function PromotionDetailRow({
    label,
    value,
}: PromotionDetailRowProps) {
    return (
        <View
            style={
                styles.promotionDetailRow
            }
        >
            <Text
                style={
                    styles.promotionDetailLabel
                }
            >
                {label}
            </Text>

            <Text
                style={
                    styles.promotionDetailValue
                }
                selectable
            >
                {value}
            </Text>
        </View>
    );
}

function EmptyPromotionReport() {
    return (
        <View
            style={
                styles.promotionEmpty
            }
        >
            <Text
                style={
                    styles.promotionEmptyTitle
                }
            >
                Sin actividad promocional
            </Text>

            <Text
                style={
                    styles.promotionEmptyText
                }
            >
                No hubo canjes, reembolsos ni descuentos promocionales en este periodo.
            </Text>
        </View>
    );
}

function getPromotionTypeLabel(
    type: string,
): string {
    if (type === 'collect_reward') {
        return 'CANJE';
    }

    if (type === 'order_refund') {
        return 'REEMBOLSO';
    }

    if (type === 'modifier_discount') {
        return 'DESCUENTO';
    }

    return type
        .replace(/_/g, ' ')
        .toUpperCase();
}

function formatReportDateTime(
    value: string,
): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
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

function EmptyReport() {
    return (
        <View
            style={{
                paddingVertical: 20,
                alignItems: 'center',
            }}
        >
            <Text
                style={{
                    color: '#777777',
                    fontSize: 13,
                    fontWeight: '600',
                }}
            >
                No hay ventas en este periodo
            </Text>
        </View>
    );
}

function getDateRange(
    filter: DateFilter,
    customStartDate: Date,
    customEndDate: Date,
): {
    from: Date;
    to: Date;
} {
    const now =
        new Date();

    let from:
        Date;

    let to:
        Date;

    if (
        filter ===
        'custom'
    ) {
        from =
            startOfDay(
                customStartDate,
            );

        to =
            addDays(
                startOfDay(
                    customEndDate,
                ),
                1,
            );

        return {
            from,
            to,
        };
    }

    if (
        filter ===
        'today'
    ) {
        from =
            startOfDay(
                now,
            );
    } else if (
        filter ===
        'week'
    ) {
        from =
            addDays(
                startOfDay(
                    now,
                ),
                -6,
            );
    } else if (
        filter ===
        'month'
    ) {
        from =
            new Date(
                now.getFullYear(),
                now.getMonth(),
                1,
            );
    } else {
        from =
            new Date(
                now.getFullYear(),
                0,
                1,
            );
    }

    to =
        addDays(
            startOfDay(
                now,
            ),
            1,
        );

    return {
        from,
        to,
    };
}

function startOfDay(
    date: Date,
): Date {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
    );
}

function addDays(
    date: Date,
    days: number,
): Date {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() +
        days,
    );
}

function formatDate(
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

function getSectionTitle(
    group:
        ModifierGroupEntity | null,
): string {
    return group
        ? `${group.name} más utilizados`
        : 'Modificadores más utilizados';
}

interface DailySalesChartProps {
    data: DailySalesReport[];
    formatCompactCurrency: (
        value: number,
    ) => string;
}

function DailySalesChart({
    data,
    formatCompactCurrency,
}: DailySalesChartProps) {
    const maxRevenue =
        data.reduce(
            (
                maximum,
                item,
            ) =>
                Math.max(
                    maximum,
                    item.revenue,
                ),
            0,
        );

    return (
        <View
            style={
                styles.chartCard
            }
        >
            <View
                style={
                    styles.chartHeader
                }
            >
                <View>
                    <Text
                        style={
                            styles.chartTitle
                        }
                    >
                        Ventas por día
                    </Text>

                    <Text
                        style={
                            styles.chartSubtitle
                        }
                    >
                        Ingresos de órdenes entregadas
                    </Text>
                </View>
            </View>

            {data.length ===
                0 ? (
                <View
                    style={
                        styles.chartEmpty
                    }
                >
                    <Text
                        style={
                            styles.chartEmptyText
                        }
                    >
                        No hay ventas en este periodo
                    </Text>
                </View>
            ) : (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={
                        false
                    }
                    contentContainerStyle={
                        styles.chartScrollContent
                    }
                >
                    {data.map(
                        (
                            item,
                        ) => {
                            const height =
                                maxRevenue >
                                    0
                                    ? Math.max(
                                        (
                                            item.revenue /
                                            maxRevenue
                                        ) *
                                        150,
                                        8,
                                    )
                                    : 8;

                            return (
                                <View
                                    key={
                                        item.sale_date
                                    }
                                    style={
                                        styles.chartColumn
                                    }
                                >
                                    <Text
                                        style={
                                            styles.chartValue
                                        }
                                    >
                                        {formatCompactCurrency(
                                            item.revenue,
                                        )}
                                    </Text>

                                    <View
                                        style={
                                            styles.chartBarArea
                                        }
                                    >
                                        <View
                                            style={[
                                                styles.chartBar,

                                                {
                                                    height,
                                                },
                                            ]}
                                        />
                                    </View>

                                    <Text
                                        style={
                                            styles.chartDate
                                        }
                                    >
                                        {formatShortDate(
                                            item.sale_date,
                                        )}
                                    </Text>

                                    <Text
                                        style={
                                            styles.chartOrders
                                        }
                                    >
                                        {item.orders_count}{' '}
                                        {item.orders_count ===
                                            1
                                            ? 'orden'
                                            : 'órdenes'}
                                    </Text>
                                </View>
                            );
                        },
                    )}
                </ScrollView>
            )}
        </View>
    );
}

function formatShortDate(
    value: string,
): string {
    const [
        ,
        month,
        day,
    ] = value.split('-');

    return `${day}/${month}`;
}

interface TopProductsChartProps {
    data: ProductSalesReport[];

    formatCurrency: (
        value: number,
    ) => string;

    metric:
    ProductChartMetric;

    onMetricChange: (
        metric:
            ProductChartMetric,
    ) => void;
}

function TopProductsChart({
    data,
    metric,
    onMetricChange,
    formatCurrency,
}: TopProductsChartProps) {
    const topProducts =
        [...data]
            .sort(
                (
                    first,
                    second,
                ) => {
                    if (
                        metric ===
                        'revenue'
                    ) {
                        return (
                            second.revenue -
                            first.revenue
                        );
                    }

                    return (
                        second.units_sold -
                        first.units_sold
                    );
                },
            )
            .slice(
                0,
                10,
            );

    const maximumValue =
        topProducts.reduce(
            (
                maximum,
                product,
            ) => {
                const value =
                    metric ===
                        'revenue'
                        ? product.revenue
                        : product.units_sold;

                return Math.max(
                    maximum,
                    value,
                );
            },
            0,
        );

    return (
        <View
            style={
                styles.topProductsCard
            }
        >
            <View
                style={
                    styles.topProductsTitleRow
                }
            >
                <View
                    style={
                        styles.topProductsTitleContainer
                    }
                >
                    <Text
                        style={
                            styles.chartTitle
                        }
                    >
                        Top productos
                    </Text>

                    <Text
                        style={
                            styles.chartSubtitle
                        }
                    >
                        {metric ===
                            'units'
                            ? 'Productos con más unidades vendidas'
                            : 'Productos que generan mayor ingreso'}
                    </Text>
                </View>

                <View
                    style={
                        styles.metricSwitch
                    }
                >
                    <TouchableOpacity
                        style={[
                            styles.metricButton,

                            metric ===
                            'units' &&
                            styles.metricButtonActive,
                        ]}
                        onPress={() =>
                            onMetricChange(
                                'units',
                            )
                        }
                    >
                        <Text
                            style={[
                                styles.metricButtonText,

                                metric ===
                                'units' &&
                                styles.metricButtonTextActive,
                            ]}
                        >
                            UNIDADES
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.metricButton,

                            metric ===
                            'revenue' &&
                            styles.metricButtonActive,
                        ]}
                        onPress={() =>
                            onMetricChange(
                                'revenue',
                            )
                        }
                    >
                        <Text
                            style={[
                                styles.metricButtonText,

                                metric ===
                                'revenue' &&
                                styles.metricButtonTextActive,
                            ]}
                        >
                            INGRESOS
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {topProducts.length ===
                0 ? (
                <View
                    style={
                        styles.chartEmpty
                    }
                >
                    <Text
                        style={
                            styles.chartEmptyText
                        }
                    >
                        No hay ventas en este periodo
                    </Text>
                </View>
            ) : (
                <View
                    style={
                        styles.topProductsList
                    }
                >
                    {topProducts.map(
                        (
                            product,
                            index,
                        ) => {
                            const value =
                                metric ===
                                    'revenue'
                                    ? product.revenue
                                    : product.units_sold;

                            const width =
                                maximumValue > 0
                                    ? (
                                        value /
                                        maximumValue
                                    ) * 100
                                    : 0;

                            return (
                                <View
                                    key={
                                        product.id
                                    }
                                    style={
                                        styles.topProductRow
                                    }
                                >
                                    <View
                                        style={
                                            styles.topProductHeader
                                        }
                                    >
                                        <Text
                                            style={
                                                styles.topProductName
                                            }
                                            numberOfLines={
                                                1
                                            }
                                        >
                                            {index + 1}.{' '}
                                            {product.name}
                                        </Text>

                                        <Text
                                            style={
                                                styles.topProductValue
                                            }
                                        >
                                            {metric ===
                                                'revenue'
                                                ? formatCurrency(
                                                    product.revenue,
                                                )
                                                : `${product.units_sold} u.`}
                                        </Text>
                                    </View>

                                    <View
                                        style={
                                            styles.topProductBarBackground
                                        }
                                    >
                                        <View
                                            style={[
                                                styles.topProductBar,

                                                {
                                                    width:
                                                        `${width}%`,
                                                },
                                            ]}
                                        />
                                    </View>
                                </View>
                            );
                        },
                    )}
                </View>
            )}
        </View>
    );
}

interface ModifierGroupsChartProps {
    groups: ModifierGroupEntity[];
    reportsByGroup: Record<
        string,
        ModifierSalesReport[]
    >;
}

function ModifierGroupsChart({
    groups,
    reportsByGroup,
}: ModifierGroupsChartProps) {
    if (groups.length === 0) {
        return null;
    }

    return (
        <View
            style={
                styles.modifierGroupsCard
            }
        >
            <Text
                style={
                    styles.chartTitle
                }
            >
                Modificadores
            </Text>

            <Text
                style={
                    styles.chartSubtitle
                }
            >
                Preferencias por grupo de modificadores
            </Text>

            <View
                style={
                    styles.modifierGroupsContainer
                }
            >
                {groups.map(
                    group => {
                        const groupData =
                            [
                                ...(
                                    reportsByGroup[
                                        group.code
                                    ] ?? []
                                ),
                            ].sort(
                                (first, second) =>
                                    second.units_sold -
                                    first.units_sold,
                            );

                        const maximum =
                            groupData.reduce(
                                (max, modifier) =>
                                    Math.max(
                                        max,
                                        modifier.units_sold,
                                    ),
                                0,
                            );

                        return (
                            <View
                                key={
                                    group.id
                                }
                                style={
                                    styles.modifierGroup
                                }
                            >
                                <Text
                                    style={
                                        styles.modifierGroupTitle
                                    }
                                >
                                    {group.name.toUpperCase()}
                                </Text>

                                {groupData.length ===
                                    0 ? (
                                    <Text
                                        style={
                                            styles.chartEmptyText
                                        }
                                    >
                                        Sin ventas en este periodo
                                    </Text>
                                ) : (
                                    groupData.map(
                                        modifier => {
                                            const width =
                                                maximum > 0
                                                    ? (
                                                        modifier.units_sold /
                                                        maximum
                                                    ) *
                                                    100
                                                    : 0;

                                            return (
                                                <View
                                                    key={
                                                        modifier.id
                                                    }
                                                    style={
                                                        styles.modifierGroupRow
                                                    }
                                                >
                                                    <View
                                                        style={
                                                            styles.modifierGroupHeader
                                                        }
                                                    >
                                                        <Text
                                                            style={
                                                                styles.modifierGroupName
                                                            }
                                                            numberOfLines={
                                                                1
                                                            }
                                                        >
                                                            {modifier.name}
                                                        </Text>

                                                        <Text
                                                            style={
                                                                styles.modifierGroupUnits
                                                            }
                                                        >
                                                            {modifier.units_sold} u.
                                                        </Text>
                                                    </View>

                                                    <View
                                                        style={
                                                            styles.modifierGroupBarBackground
                                                        }
                                                    >
                                                        <View
                                                            style={[
                                                                styles.modifierGroupBar,
                                                                {
                                                                    width:
                                                                        `${width}%`,
                                                                },
                                                            ]}
                                                        />
                                                    </View>
                                                </View>
                                            );
                                        },
                                    )
                                )}
                            </View>
                        );
                    },
                )}
            </View>
        </View>
    );
}
