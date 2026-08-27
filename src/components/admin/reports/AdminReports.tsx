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
    getFlavorSalesReport,
    getMeatSalesReport,
    getProductSalesReport,
    getSalesReportSummary,
    getSauceSalesReport,
    ModifierSalesReport,
    ProductSalesReport,
    SalesReportSummary,
} from '../../../services/reportService';

import {
    styles,
} from './AdminReports.styles';

type DateFilter =
    | 'today'
    | 'week'
    | 'month'
    | 'year'
    | 'custom';

type ProductChartMetric =
    | 'units'
    | 'revenue';

type ReportSection =
    | 'products'
    | 'sauces'
    | 'flavors'
    | 'meats';

const EMPTY_SUMMARY:
    SalesReportSummary = {
    total_revenue: 0,
    orders_count: 0,
    average_ticket: 0,
    items_sold: 0,
};

export function AdminReports() {
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
        'products',
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
        sauces,
        setSauces,
    ] = useState<
        ModifierSalesReport[]
    >([]);

    const [
        flavors,
        setFlavors,
    ] = useState<
        ModifierSalesReport[]
    >([]);

    const [
        meats,
        setMeats,
    ] = useState<
        ModifierSalesReport[]
    >([]);

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

                    const [
                        summaryData,
                        productData,
                        sauceData,
                        flavorData,
                        meatData,
                        dailySalesData,
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

                            getSauceSalesReport(
                                dateRange.from,
                                dateRange.to,
                            ),

                            getFlavorSalesReport(
                                dateRange.from,
                                dateRange.to,
                            ),

                            getMeatSalesReport(
                                dateRange.from,
                                dateRange.to,
                            ),

                            getDailySalesReport(
                                dateRange.from,
                                dateRange.to,
                            ),
                        ]);

                    setSummary(
                        summaryData,
                    );

                    setProducts(
                        productData,
                    );

                    setSauces(
                        sauceData,
                    );

                    setFlavors(
                        flavorData,
                    );

                    setMeats(
                        meatData,
                    );

                    setDailySales(
                        dailySalesData,
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
        useMemo(() => {
            if (
                activeSection ===
                'sauces'
            ) {
                return sauces;
            }

            if (
                activeSection ===
                'flavors'
            ) {
                return flavors;
            }

            if (
                activeSection ===
                'meats'
            ) {
                return meats;
            }

            return [];
        }, [
            activeSection,
            sauces,
            flavors,
            meats,
        ]);

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

    const renderFilterButton = (
        filter: DateFilter,
        label: string,
    ) => {
        const active =
            dateFilter === filter;

        return (
            <TouchableOpacity
                style={[
                    styles.filterButton,

                    active &&
                    styles.filterButtonActive,
                ]}
                onPress={() =>
                    setDateFilter(
                        filter,
                    )
                }
            >
                <Text
                    style={[
                        styles.filterButtonText,

                        active &&
                        styles.filterButtonTextActive,
                    ]}
                >
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };

    const renderSectionButton = (
        section: ReportSection,
        label: string,
    ) => {
        const active =
            activeSection ===
            section;

        return (
            <TouchableOpacity
                style={[
                    styles.sectionButton,

                    active &&
                    styles.sectionButtonActive,
                ]}
                onPress={() =>
                    setActiveSection(
                        section,
                    )
                }
            >
                <Text
                    style={[
                        styles.sectionButtonText,

                        active &&
                        styles.sectionButtonTextActive,
                    ]}
                >
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };

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
                {/* FILTROS DE FECHA */}
                <View
                    style={
                        styles.filtersContainer
                    }
                >
                    {renderFilterButton(
                        'today',
                        'HOY',
                    )}

                    {renderFilterButton(
                        'week',
                        'SEMANA',
                    )}

                    {renderFilterButton(
                        'month',
                        'MES',
                    )}

                    {renderFilterButton(
                        'year',
                        'AÑO',
                    )}

                    {renderFilterButton(
                        'custom',
                        'PERSONALIZADO',
                    )}
                </View>

                {/* RANGO PERSONALIZADO */}
                {dateFilter ===
                    'custom' ? (
                    <View
                        style={
                            styles.customDateContainer
                        }
                    >
                        <TouchableOpacity
                            style={
                                styles.dateButton
                            }
                            onPress={() =>
                                setShowStartDatePicker(
                                    true,
                                )
                            }
                        >
                            <Text
                                style={
                                    styles.dateButtonLabel
                                }
                            >
                                Desde
                            </Text>

                            <Text
                                style={
                                    styles.dateButtonValue
                                }
                            >
                                {formatDate(
                                    customStartDate,
                                )}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={
                                styles.dateButton
                            }
                            onPress={() =>
                                setShowEndDatePicker(
                                    true,
                                )
                            }
                        >
                            <Text
                                style={
                                    styles.dateButtonLabel
                                }
                            >
                                Hasta
                            </Text>

                            <Text
                                style={
                                    styles.dateButtonValue
                                }
                            >
                                {formatDate(
                                    customEndDate,
                                )}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                {/* RESUMEN */}
                <View
                    style={
                        styles.summaryGrid
                    }
                >
                    <SummaryCard
                        label="Ventas"
                        value={
                            formatCurrency(
                                summary.total_revenue,
                            )
                        }
                    />

                    <SummaryCard
                        label="Órdenes"
                        value={
                            String(
                                summary.orders_count,
                            )
                        }
                    />

                    <SummaryCard
                        label="Ticket promedio"
                        value={
                            formatCurrency(
                                summary.average_ticket,
                            )
                        }
                    />

                    <SummaryCard
                        label="Artículos"
                        value={
                            String(
                                summary.items_sold,
                            )
                        }
                    />
                </View>

                {/* GRÁFICAS */}
                <DailySalesChart
                    data={
                        dailySales
                    }
                />

                <TopProductsChart
                    data={
                        products
                    }
                    metric={
                        productChartMetric
                    }
                    onMetricChange={
                        setProductChartMetric
                    }
                />

                <SauceSalesChart
                    data={
                        sauces
                    }
                />

                <ModifierGroupsChart
                    data={[
                        ...meats,
                        ...flavors,
                    ]}
                />

                {/* SECCIONES */}
                <View
                    style={
                        styles.sectionsContainer
                    }
                >
                    {renderSectionButton(
                        'products',
                        'PRODUCTOS',
                    )}

                    {renderSectionButton(
                        'sauces',
                        'SALSAS',
                    )}

                    {renderSectionButton(
                        'flavors',
                        'SABORES',
                    )}

                    {renderSectionButton(
                        'meats',
                        'CARNES',
                    )}
                </View>

                {/* RANKINGS */}
                {activeSection ===
                    'products' ? (
                    <>
                        <View
                            style={
                                styles.reportCard
                            }
                        >
                            <Text
                                style={
                                    styles.reportTitle
                                }
                            >
                                Más vendidos
                            </Text>

                            {products.length >
                                0 ? (
                                products.map(
                                    (
                                        product,
                                        index,
                                    ) => (
                                        <RankingRow
                                            key={
                                                product.id
                                            }
                                            index={
                                                index
                                            }
                                            name={
                                                product.name
                                            }
                                            value={`${product.units_sold} u.`}
                                        />
                                    ),
                                )
                            ) : (
                                <EmptyReport />
                            )}
                        </View>

                        <View
                            style={
                                styles.reportCard
                            }
                        >
                            <Text
                                style={
                                    styles.reportTitle
                                }
                            >
                                Mayor ingreso
                            </Text>

                            {productsByRevenue.length >
                                0 ? (
                                productsByRevenue.map(
                                    (
                                        product,
                                        index,
                                    ) => (
                                        <RankingRow
                                            key={
                                                product.id
                                            }
                                            index={
                                                index
                                            }
                                            name={
                                                product.name
                                            }
                                            value={
                                                formatCurrency(
                                                    product.revenue,
                                                )
                                            }
                                        />
                                    ),
                                )
                            ) : (
                                <EmptyReport />
                            )}
                        </View>
                    </>
                ) : (
                    <View
                        style={
                            styles.reportCard
                        }
                    >
                        <Text
                            style={
                                styles.reportTitle
                            }
                        >
                            {getSectionTitle(
                                activeSection,
                            )}
                        </Text>

                        {reportRows.length >
                            0 ? (
                            reportRows.map(
                                (
                                    row,
                                    index,
                                ) => (
                                    <RankingRow
                                        key={
                                            row.id
                                        }
                                        index={
                                            index
                                        }
                                        name={
                                            row.name
                                        }
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

function formatCurrency(
    value: number,
): string {
    return `$${value.toLocaleString(
        'es-MX',
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        },
    )}`;
}

function getSectionTitle(
    section:
        ReportSection,
): string {
    if (
        section ===
        'sauces'
    ) {
        return 'Salsas más utilizadas';
    }

    if (
        section ===
        'flavors'
    ) {
        return 'Sabores más utilizados';
    }

    return 'Carnes más utilizadas';
}

interface DailySalesChartProps {
    data: DailySalesReport[];
}

function DailySalesChart({
    data,
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

function formatCompactCurrency(
    value: number,
): string {
    if (
        value >= 1000
    ) {
        return `$${(
            value /
            1000
        ).toFixed(1)}k`;
    }

    return `$${Math.round(
        value,
    )}`;
}

interface TopProductsChartProps {
    data: ProductSalesReport[];

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

interface SauceSalesChartProps {
    data: ModifierSalesReport[];
}

function SauceSalesChart({
    data,
}: SauceSalesChartProps) {
    const sauces =
        [...data].sort(
            (
                first,
                second,
            ) =>
                second.units_sold -
                first.units_sold,
        );

    const maxUnits =
        sauces.reduce(
            (
                maximum,
                sauce,
            ) =>
                Math.max(
                    maximum,
                    sauce.units_sold,
                ),
            0,
        );

    const leastSoldSauces =
        [...data]
            .sort(
                (
                    first,
                    second,
                ) =>
                    first.units_sold -
                    second.units_sold,
            )
            .slice(
                0,
                5,
            );

    return (
        <View
            style={
                styles.sauceChartCard
            }
        >
            <View>
                <Text
                    style={
                        styles.chartTitle
                    }
                >
                    Rendimiento de salsas
                </Text>

                <Text
                    style={
                        styles.chartSubtitle
                    }
                >
                    Popularidad y rotación de sabores
                </Text>
            </View>

            {sauces.length ===
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
                        No hay salsas disponibles
                    </Text>
                </View>
            ) : (
                <>
                    <View
                        style={
                            styles.sauceRanking
                        }
                    >
                        {sauces.map(
                            (
                                sauce,
                                index,
                            ) => {
                                const width =
                                    maxUnits > 0
                                        ? (
                                            sauce.units_sold /
                                            maxUnits
                                        ) * 100
                                        : 0;

                                return (
                                    <View
                                        key={
                                            sauce.id
                                        }
                                        style={
                                            styles.sauceRow
                                        }
                                    >
                                        <View
                                            style={
                                                styles.sauceHeader
                                            }
                                        >
                                            <Text
                                                style={
                                                    styles.sauceName
                                                }
                                                numberOfLines={
                                                    1
                                                }
                                            >
                                                {index + 1}.{' '}
                                                {sauce.name}
                                            </Text>

                                            <Text
                                                style={
                                                    styles.sauceUnits
                                                }
                                            >
                                                {sauce.units_sold} u.
                                            </Text>
                                        </View>

                                        <View
                                            style={
                                                styles.sauceBarBackground
                                            }
                                        >
                                            <View
                                                style={[
                                                    styles.sauceBar,
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

                    <View
                        style={
                            styles.lowRotationContainer
                        }
                    >
                        <Text
                            style={
                                styles.lowRotationTitle
                            }
                        >
                            BAJA ROTACIÓN
                        </Text>

                        <Text
                            style={
                                styles.lowRotationSubtitle
                            }
                        >
                            Candidatas para Salsa de la Semana
                        </Text>

                        <View
                            style={
                                styles.lowRotationList
                            }
                        >
                            {leastSoldSauces.map(
                                sauce => (
                                    <View
                                        key={
                                            sauce.id
                                        }
                                        style={
                                            styles.lowRotationBadge
                                        }
                                    >
                                        <Text
                                            style={
                                                styles.lowRotationName
                                            }
                                        >
                                            {sauce.name}
                                        </Text>

                                        <Text
                                            style={
                                                styles.lowRotationUnits
                                            }
                                        >
                                            {sauce.units_sold}{' '}
                                            ventas
                                        </Text>
                                    </View>
                                ),
                            )}
                        </View>
                    </View>
                </>
            )}
        </View>
    );
}

interface ModifierGroupsChartProps {
    data: ModifierSalesReport[];
}

function ModifierGroupsChart({
    data,
}: ModifierGroupsChartProps) {
    const groups = [
        'Carne',
        'Sabor',
    ];

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
                Preferencias por tipo de modificador
            </Text>

            <View
                style={
                    styles.modifierGroupsContainer
                }
            >
                {groups.map(
                    group => {
                        const groupData =
                            data
                                .filter(
                                    modifier =>
                                        modifier.group_name ===
                                        group,
                                )
                                .sort(
                                    (
                                        first,
                                        second,
                                    ) =>
                                        second.units_sold -
                                        first.units_sold,
                                );

                        const maximum =
                            groupData.reduce(
                                (
                                    max,
                                    modifier,
                                ) =>
                                    Math.max(
                                        max,
                                        modifier.units_sold,
                                    ),
                                0,
                            );

                        return (
                            <View
                                key={
                                    group
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
                                    {group.toUpperCase()}
                                </Text>

                                {groupData.map(
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
                                )}
                            </View>
                        );
                    },
                )}
            </View>
        </View>
    );
}