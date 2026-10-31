import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useBusiness } from '../../../context/BusinessContext';
import { useCurrency } from '../../../hooks/useCurrency';
import { formatBusinessDateTime } from '../../../Utils/businessTime';
import {
  createInvoiceDraftFromOrder,
  deleteInvoiceDraft,
  FiscalCustomer,
  getFiscalCustomers,
  getInvoiceableOrders,
  getInvoicesAdmin,
  getInvoicingSettings,
  getProductFiscalSettings,
  InvoiceAdmin,
  InvoiceableOrderAdmin,
  InvoicingSettings,
  ProductFiscalSettingAdmin,
  saveFiscalCustomer,
  saveInvoicingSettings,
  saveProductFiscalSetting,
  setFiscalCustomerActive,
  stampInvoice,
  getInvoiceArtifactUrl,
} from '../../../services/invoicingService';

const EMPTY_SETTINGS: InvoicingSettings = {
  legalName: '',
  rfc: '',
  taxRegimeCode: '',
  postalCode: '',
  invoiceSeries: 'A',
  globalInvoiceEnabled: false,
  globalPeriodicityCode: '01',
};

const EMPTY_CUSTOMER = {
  alias: '',
  legalName: '',
  rfc: '',
  taxRegimeCode: '',
  postalCode: '',
  cfdiUseCode: 'G03',
  email: '',
};

const EMPTY_PRODUCT_FISCAL = {
  productServiceCode: '',
  unitCode: 'H87',
  taxObjectCode: '02',
  vatRateText: '16',
};

export function AdminInvoicing() {
  const { business, theme } = useBusiness();
  const { formatCurrency } = useCurrency();

  const [settings, setSettings] =
    useState<InvoicingSettings>(EMPTY_SETTINGS);
  const [customers, setCustomers] =
    useState<FiscalCustomer[]>([]);
  const [invoiceableOrders, setInvoiceableOrders] =
    useState<InvoiceableOrderAdmin[]>([]);
  const [invoices, setInvoices] =
    useState<InvoiceAdmin[]>([]);
  const [productFiscalSettings, setProductFiscalSettings] =
    useState<ProductFiscalSettingAdmin[]>([]);

  const [customerForm, setCustomerForm] =
    useState(EMPTY_CUSTOMER);
  const [editingCustomerId, setEditingCustomerId] =
    useState<string | null>(null);

  const [editingProductId, setEditingProductId] =
    useState<string | null>(null);
  const [productFiscalForm, setProductFiscalForm] =
    useState(EMPTY_PRODUCT_FISCAL);

  const [selectedOrderId, setSelectedOrderId] =
    useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingOperations, setIsRefreshingOperations] =
    useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [deletingDraftId, setDeletingDraftId] =
    useState<string | null>(null);
  const [stampingInvoiceId, setStampingInvoiceId] =
    useState<string | null>(null);
  const [openingArtifactKey, setOpeningArtifactKey] =
    useState<string | null>(null);

  const activeCustomers = useMemo(
    () => customers.filter(customer => customer.isActive),
    [customers],
  );

  const selectedOrder = useMemo(
    () => invoiceableOrders.find(order => order.orderId === selectedOrderId) ?? null,
    [invoiceableOrders, selectedOrderId],
  );

  const selectedCustomer = useMemo(
    () => activeCustomers.find(customer => customer.id === selectedCustomerId) ?? null,
    [activeCustomers, selectedCustomerId],
  );

  const activeProducts = useMemo(
    () => productFiscalSettings.filter(product => product.isActive),
    [productFiscalSettings],
  );

  const fiscalProductsReady = useMemo(
    () => activeProducts.filter(product => product.isReady).length,
    [activeProducts],
  );

  const formatDateTime = (value: string): string =>
    formatBusinessDateTime(
      value,
      business?.timezone,
    );

  const loadData = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const [
        settingsData,
        customersData,
        ordersData,
        invoicesData,
        productsData,
      ] = await Promise.all([
        getInvoicingSettings(),
        getFiscalCustomers(),
        getInvoiceableOrders(),
        getInvoicesAdmin(),
        getProductFiscalSettings(),
      ]);

      setSettings(settingsData);
      setCustomers(customersData);
      setInvoiceableOrders(ordersData);
      setInvoices(invoicesData);
      setProductFiscalSettings(productsData);

      if (
        selectedOrderId &&
        !ordersData.some(order => order.orderId === selectedOrderId && order.canInvoice)
      ) {
        setSelectedOrderId(null);
      }

      if (
        selectedCustomerId &&
        !customersData.some(
          customer => customer.id === selectedCustomerId && customer.isActive,
        )
      ) {
        setSelectedCustomerId(null);
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo cargar Facturación.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const refreshOperationalData = async (): Promise<void> => {
    try {
      setIsRefreshingOperations(true);
      const [ordersData, invoicesData, productsData] = await Promise.all([
        getInvoiceableOrders(),
        getInvoicesAdmin(),
        getProductFiscalSettings(),
      ]);
      setInvoiceableOrders(ordersData);
      setInvoices(invoicesData);
      setProductFiscalSettings(productsData);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar Facturación.',
      );
    } finally {
      setIsRefreshingOperations(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSaveSettings = async (): Promise<void> => {
    try {
      setIsSavingSettings(true);
      await saveInvoicingSettings(settings);
      Alert.alert(
        'Configuración guardada',
        'Los datos fiscales del emisor fueron actualizados.',
      );
      await loadData();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la configuración fiscal.',
      );
    } finally {
      setIsSavingSettings(false);
    }
  };

  const resetCustomerForm = (): void => {
    setEditingCustomerId(null);
    setCustomerForm(EMPTY_CUSTOMER);
  };

  const handleEditCustomer = (customer: FiscalCustomer): void => {
    setEditingCustomerId(customer.id);
    setCustomerForm({
      alias: customer.alias,
      legalName: customer.legalName,
      rfc: customer.rfc,
      taxRegimeCode: customer.taxRegimeCode,
      postalCode: customer.postalCode,
      cfdiUseCode: customer.cfdiUseCode,
      email: customer.email,
    });
  };

  const handleSaveCustomer = async (): Promise<void> => {
    try {
      setIsSavingCustomer(true);
      await saveFiscalCustomer({
        id: editingCustomerId ?? undefined,
        ...customerForm,
      });
      resetCustomerForm();
      await loadData();
      Alert.alert(
        'Cliente fiscal guardado',
        'Los datos fiscales quedaron disponibles para futuras facturas.',
      );
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el cliente fiscal.',
      );
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const handleToggleCustomer = async (
    customer: FiscalCustomer,
  ): Promise<void> => {
    try {
      await setFiscalCustomerActive(
        customer.id,
        !customer.isActive,
      );
      await loadData();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar el cliente.',
      );
    }
  };

  const handleEditProduct = (
    product: ProductFiscalSettingAdmin,
  ): void => {
    setEditingProductId(product.productId);
    setProductFiscalForm({
      productServiceCode: product.productServiceCode,
      unitCode: product.unitCode || 'H87',
      taxObjectCode: product.taxObjectCode || '02',
      vatRateText:
        product.vatRate === null
          ? '16'
          : String(Math.round(product.vatRate * 1000000) / 10000),
    });
  };

  const handleSaveProductFiscal = async (): Promise<void> => {
    if (!editingProductId) {
      return;
    }

    const percentage = Number(productFiscalForm.vatRateText.replace(',', '.'));

    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      Alert.alert('IVA inválido', 'Ingresa una tasa entre 0 y 100.');
      return;
    }

    try {
      setIsSavingProduct(true);
      await saveProductFiscalSetting({
        productId: editingProductId,
        productServiceCode: productFiscalForm.productServiceCode,
        unitCode: productFiscalForm.unitCode,
        taxObjectCode: productFiscalForm.taxObjectCode,
        vatRate: percentage / 100,
      });
      setEditingProductId(null);
      setProductFiscalForm(EMPTY_PRODUCT_FISCAL);
      await refreshOperationalData();
      Alert.alert(
        'Producto actualizado',
        'La configuración SAT del producto quedó guardada.',
      );
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la configuración SAT del producto.',
      );
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleCreateDraft = async (): Promise<void> => {
    if (!selectedOrder || !selectedCustomer) {
      Alert.alert(
        'Datos incompletos',
        'Selecciona una venta facturable y un cliente fiscal.',
      );
      return;
    }

    try {
      setIsCreatingDraft(true);
      const invoiceId = await createInvoiceDraftFromOrder({
        orderId: selectedOrder.orderId,
        fiscalCustomerId: selectedCustomer.id,
        cfdiUseCode: selectedCustomer.cfdiUseCode,
      });

      setSelectedOrderId(null);
      await refreshOperationalData();

      Alert.alert(
        'Borrador creado',
        `La venta quedó preparada en el borrador ${invoiceId.slice(-6).toUpperCase()}. Todavía no se ha timbrado.`,
      );
    } catch (error) {
      Alert.alert(
        'No se pudo crear el borrador',
        error instanceof Error
          ? error.message
          : 'La venta no pudo prepararse para facturación.',
      );
    } finally {
      setIsCreatingDraft(false);
    }
  };

  const handleDeleteDraft = async (invoice: InvoiceAdmin): Promise<void> => {
    try {
      setDeletingDraftId(invoice.id);
      await deleteInvoiceDraft(invoice.id);
      if (
        invoice.orders.some(order => order.orderId === selectedOrderId)
      ) {
        setSelectedOrderId(null);
      }
      await refreshOperationalData();
    } catch (error) {
      Alert.alert(
        'No se pudo eliminar',
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar el borrador.',
      );
    } finally {
      setDeletingDraftId(null);
    }
  };

  const handleStampInvoice = async (invoice: InvoiceAdmin): Promise<void> => {
    if (stampingInvoiceId) {
      return;
    }

    try {
      setStampingInvoiceId(invoice.id);
      const result = await stampInvoice(invoice.id);
      await refreshOperationalData();
      Alert.alert(
        'CFDI timbrado',
        `${invoice.series}-${String(invoice.folio).padStart(6, '0')}\nUUID: ${result.uuid}${result.artifactWarning ? `\n\nAviso: ${result.artifactWarning}` : ''}`,
      );
    } catch (error) {
      await refreshOperationalData();
      Alert.alert(
        'No se pudo timbrar',
        error instanceof Error ? error.message : 'Ocurrió un error al timbrar el CFDI.',
      );
    } finally {
      setStampingInvoiceId(null);
    }
  };

  const handleOpenInvoiceArtifact = async (
    invoice: InvoiceAdmin,
    format: 'xml' | 'pdf',
  ): Promise<void> => {
    const key = `${invoice.id}:${format}`;
    if (openingArtifactKey) {
      return;
    }

    try {
      setOpeningArtifactKey(key);
      const url = await getInvoiceArtifactUrl(invoice.id, format);
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert(
        `No se pudo abrir ${format.toUpperCase()}`,
        error instanceof Error ? error.message : 'No se pudo abrir el archivo fiscal.',
      );
    } finally {
      setOpeningArtifactKey(null);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.muted, { color: theme.textMuted }]}>
          Cargando Facturación...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.titleRow}>
        <View style={styles.titleText}>
          <Text style={[styles.title, { color: theme.text }]}>Facturación</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Prepara, timbra y consulta CFDI. El PAC se ejecuta únicamente desde backend y usa sandbox hasta configurar producción.
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshButton, { borderColor: theme.border }]}
          disabled={isRefreshingOperations}
          onPress={() => { void refreshOperationalData(); }}
        >
          <Text style={[styles.refreshButtonText, { color: theme.text }]}>
            {isRefreshingOperations ? 'Actualizando...' : '↻ Actualizar'}
          </Text>
        </TouchableOpacity>
      </View>

      <Card
        title="Ventas facturables"
        subtitle="Selecciona una venta cobrada y entregada. Las devoluciones, recompensas y ventas ya ligadas a otra factura quedan bloqueadas."
        theme={theme}
      >
        {invoiceableOrders.length === 0 ? (
          <Text style={[styles.empty, { color: theme.textMuted }]}>
            No hay ventas entregadas disponibles.
          </Text>
        ) : (
          invoiceableOrders.map(order => {
            const selected = selectedOrderId === order.orderId;
            return (
              <TouchableOpacity
                key={order.orderId}
                disabled={!order.canInvoice}
                onPress={() => setSelectedOrderId(order.orderId)}
                style={[
                  styles.orderRow,
                  { borderColor: selected ? theme.primary : theme.border },
                  selected && { backgroundColor: theme.surfaceAlt },
                  !order.canInvoice && styles.inactive,
                ]}
              >
                <View style={styles.orderHeader}>
                  <View style={styles.orderGrow}>
                    <Text style={[styles.orderTitle, { color: theme.text }]}>
                      Ticket #{order.ticketCode || order.orderId.slice(-6).toUpperCase()}
                    </Text>
                    <Text style={[styles.orderMeta, { color: theme.textMuted }]}>
                      {formatDateTime(order.paidAt)} · {order.paymentMethod === 'cash' ? 'Efectivo' : order.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}
                    </Text>
                  </View>
                  <Text style={[styles.orderAmount, { color: theme.text }]}>
                    {formatCurrency(order.paymentTotal)}
                  </Text>
                </View>
                {order.customerName ? (
                  <Text style={[styles.orderMeta, { color: theme.textMuted }]}>
                    Cliente operativo: {order.customerName}
                  </Text>
                ) : null}
                {!order.canInvoice ? (
                  <Text style={styles.blockReason}>⚠ {order.blockReason}</Text>
                ) : (
                  <Text style={[styles.readyText, { color: theme.primary }]}>
                    {selected ? '✓ Venta seleccionada' : 'Lista para preparar CFDI'}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })
        )}

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <Text style={[styles.label, { color: theme.text }]}>Cliente fiscal para el borrador</Text>
        {activeCustomers.length === 0 ? (
          <Text style={[styles.help, { color: theme.textMuted }]}>
            Primero registra y activa al menos un cliente fiscal.
          </Text>
        ) : (
          <View style={styles.customerPickerGrid}>
            {activeCustomers.map(customer => {
              const selected = selectedCustomerId === customer.id;
              return (
                <TouchableOpacity
                  key={customer.id}
                  style={[
                    styles.customerChoice,
                    { borderColor: selected ? theme.primary : theme.border },
                    selected && { backgroundColor: theme.surfaceAlt },
                  ]}
                  onPress={() => setSelectedCustomerId(customer.id)}
                >
                  <Text style={[styles.customerName, { color: theme.text }]}>
                    {customer.alias || customer.legalName}
                  </Text>
                  <Text style={[styles.customerMeta, { color: theme.textMuted }]}>
                    {customer.rfc} · Uso {customer.cfdiUseCode}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {selectedOrder && selectedCustomer ? (
          <View style={[styles.previewBox, { borderColor: theme.border }]}>
            <Text style={[styles.previewTitle, { color: theme.text }]}>Vista previa</Text>
            <Text style={[styles.help, { color: theme.textMuted }]}>
              Ticket #{selectedOrder.ticketCode} → {selectedCustomer.legalName} ({selectedCustomer.rfc})
            </Text>
            <Text style={[styles.help, { color: theme.textMuted }]}>
              Uso CFDI {selectedCustomer.cfdiUseCode} · PUE · {selectedOrder.paymentMethod === 'cash' ? 'Forma 01 Efectivo' : selectedOrder.paymentMethod === 'card' ? 'Forma 04 Tarjeta' : 'Forma 03 Transferencia'}
            </Text>
            <Text style={[styles.previewAmount, { color: theme.text }]}>
              Total {formatCurrency(selectedOrder.paymentTotal)}
            </Text>
          </View>
        ) : null}

        <PrimaryButton
          label={isCreatingDraft ? 'Creando borrador...' : 'Crear borrador CFDI'}
          disabled={
            isCreatingDraft ||
            !selectedOrder ||
            !selectedCustomer
          }
          onPress={() => { void handleCreateDraft(); }}
          theme={theme}
        />
      </Card>

      <Card
        title="Borradores y facturas"
        subtitle="Los borradores pueden timbrarse con el PAC. Un CFDI timbrado queda bloqueado y conserva UUID, XML y PDF."
        theme={theme}
      >
        {invoices.length === 0 ? (
          <Text style={[styles.empty, { color: theme.textMuted }]}>
            Aún no hay documentos de facturación.
          </Text>
        ) : (
          invoices.map(invoice => (
            <View
              key={invoice.id}
              style={[styles.invoiceRow, { borderColor: theme.border }]}
            >
              <View style={styles.orderHeader}>
                <View style={styles.orderGrow}>
                  <Text style={[styles.orderTitle, { color: theme.text }]}>
                    {invoice.series}-{String(invoice.folio).padStart(6, '0')}
                  </Text>
                  <Text style={[styles.orderMeta, { color: theme.textMuted }]}>
                    {invoice.receiverLegalName} · {invoice.receiverRfc}
                  </Text>
                  <Text style={[styles.orderMeta, { color: theme.textMuted }]}>
                    {formatDateTime(invoice.createdAt)} · {invoice.status.toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.orderAmount, { color: theme.text }]}>
                  {formatCurrency(invoice.total)}
                </Text>
              </View>

              <Text style={[styles.orderMeta, { color: theme.textMuted }]}>
                Subtotal {formatCurrency(invoice.subtotal)} · IVA {formatCurrency(invoice.taxTotal)} · Uso {invoice.cfdiUseCode}
              </Text>

              {invoice.cfdiUuid ? (
                <Text style={[styles.orderMeta, { color: theme.textMuted }]} selectable>
                  UUID {invoice.cfdiUuid}
                </Text>
              ) : null}

              {invoice.pacProvider ? (
                <Text style={[styles.orderMeta, { color: theme.textMuted }]}>
                  PAC {invoice.pacProvider.toUpperCase()}{invoice.pacEnvironment ? ` · ${invoice.pacEnvironment.toUpperCase()}` : ''}
                </Text>
              ) : null}

              {invoice.errorMessage ? (
                <Text style={styles.blockReason}>⚠ {invoice.errorMessage}</Text>
              ) : null}

              {(invoice.status === 'draft' || invoice.status === 'error') ? (
                <View style={styles.actionRow}>
                  <PrimaryButton
                    label={stampingInvoiceId === invoice.id ? 'TIMBRANDO...' : invoice.status === 'error' ? 'REINTENTAR TIMBRADO' : 'TIMBRAR CFDI'}
                    disabled={stampingInvoiceId !== null}
                    onPress={() => { void handleStampInvoice(invoice); }}
                    theme={theme}
                  />
                  {invoice.status === 'draft' ? (
                    <TouchableOpacity
                      style={[styles.secondaryButton, { borderColor: theme.border }]}
                      disabled={deletingDraftId !== null || stampingInvoiceId !== null}
                      onPress={() => { void handleDeleteDraft(invoice); }}
                    >
                      <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
                        {deletingDraftId === invoice.id ? 'ELIMINANDO...' : 'ELIMINAR BORRADOR'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}

              {invoice.status === 'stamping' ? (
                <Text style={[styles.readyText, { color: theme.primary }]}>Timbrado en proceso…</Text>
              ) : null}

              {invoice.status === 'stamped' ? (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.smallButton, { borderColor: theme.border }]}
                    disabled={openingArtifactKey !== null}
                    onPress={() => { void handleOpenInvoiceArtifact(invoice, 'xml'); }}
                  >
                    <Text style={[styles.smallButtonText, { color: theme.text }]}>XML</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallButton, { borderColor: theme.border }]}
                    disabled={openingArtifactKey !== null}
                    onPress={() => { void handleOpenInvoiceArtifact(invoice, 'pdf'); }}
                  >
                    <Text style={[styles.smallButtonText, { color: theme.text }]}>PDF</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ))
        )}
      </Card>

      <Card
        title="Configuración SAT de productos"
        subtitle={`${fiscalProductsReady} de ${activeProducts.length} producto(s) activo(s) están listos para facturar.`}
        theme={theme}
      >
        {editingProductId ? (
          <View style={[styles.editorBox, { borderColor: theme.border }]}>
            <Text style={[styles.editorTitle, { color: theme.text }]}>
              {activeProducts.find(product => product.productId === editingProductId)?.productName ?? 'Producto'}
            </Text>
            <Field
              label="ClaveProdServ"
              value={productFiscalForm.productServiceCode}
              onChangeText={value =>
                setProductFiscalForm(current => ({
                  ...current,
                  productServiceCode: value.replace(/\D/g, '').slice(0, 8),
                }))
              }
              placeholder="Ej. 90101501"
              theme={theme}
              keyboardType="number-pad"
            />
            <Field
              label="ClaveUnidad"
              value={productFiscalForm.unitCode}
              onChangeText={value =>
                setProductFiscalForm(current => ({
                  ...current,
                  unitCode: value.toUpperCase().replace(/\s/g, '').slice(0, 8),
                }))
              }
              placeholder="H87"
              theme={theme}
              autoCapitalize="characters"
            />
            <Field
              label="Objeto de impuesto"
              value={productFiscalForm.taxObjectCode}
              onChangeText={value =>
                setProductFiscalForm(current => ({
                  ...current,
                  taxObjectCode: value.replace(/\D/g, '').slice(0, 2),
                }))
              }
              placeholder="02"
              theme={theme}
              keyboardType="number-pad"
            />
            <Field
              label="IVA (%)"
              value={productFiscalForm.vatRateText}
              onChangeText={value =>
                setProductFiscalForm(current => ({
                  ...current,
                  vatRateText: value.replace(/[^0-9.,]/g, '').slice(0, 7),
                }))
              }
              placeholder="16"
              theme={theme}
              keyboardType="decimal-pad"
            />
            <View style={styles.actionRow}>
              <PrimaryButton
                label={isSavingProduct ? 'Guardando...' : 'Guardar producto'}
                disabled={isSavingProduct}
                onPress={() => { void handleSaveProductFiscal(); }}
                theme={theme}
              />
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: theme.border }]}
                onPress={() => {
                  setEditingProductId(null);
                  setProductFiscalForm(EMPTY_PRODUCT_FISCAL);
                }}
              >
                <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {activeProducts.map(product => (
          <View
            key={product.productId}
            style={[styles.productRow, { borderColor: theme.border }]}
          >
            <View style={styles.orderGrow}>
              <Text style={[styles.customerName, { color: theme.text }]}>
                {product.productName}
              </Text>
              <Text style={[styles.customerMeta, { color: theme.textMuted }]}>
                {product.isReady
                  ? `${product.productServiceCode} · ${product.unitCode} · Obj ${product.taxObjectCode} · IVA ${Math.round((product.vatRate ?? 0) * 10000) / 100}%`
                  : 'Configuración SAT pendiente'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.smallButton, { borderColor: theme.border }]}
              onPress={() => handleEditProduct(product)}
            >
              <Text style={[styles.smallButtonText, { color: theme.text }]}>CONFIGURAR</Text>
            </TouchableOpacity>
          </View>
        ))}
      </Card>

      <Card
        title="Emisor fiscal"
        subtitle="Estos datos deben coincidir con la constancia fiscal del negocio."
        theme={theme}
      >
        <Field
          label="Razón social / nombre fiscal"
          value={settings.legalName}
          onChangeText={value =>
            setSettings(current => ({ ...current, legalName: value }))
          }
          placeholder="Ej. EMPRESA DEMO SA DE CV"
          theme={theme}
        />
        <Field
          label="RFC"
          value={settings.rfc}
          onChangeText={value =>
            setSettings(current => ({
              ...current,
              rfc: value.toUpperCase().replace(/\s/g, '').slice(0, 13),
            }))
          }
          placeholder="XAXX010101000"
          theme={theme}
          autoCapitalize="characters"
        />
        <Field
          label="Régimen fiscal (código SAT)"
          value={settings.taxRegimeCode}
          onChangeText={value =>
            setSettings(current => ({
              ...current,
              taxRegimeCode: value.replace(/\D/g, '').slice(0, 3),
            }))
          }
          placeholder="Ej. 612"
          theme={theme}
          keyboardType="number-pad"
        />
        <Field
          label="Código postal fiscal / lugar de expedición"
          value={settings.postalCode}
          onChangeText={value =>
            setSettings(current => ({
              ...current,
              postalCode: value.replace(/\D/g, '').slice(0, 5),
            }))
          }
          placeholder="38000"
          theme={theme}
          keyboardType="number-pad"
        />
        <Field
          label="Serie"
          value={settings.invoiceSeries}
          onChangeText={value =>
            setSettings(current => ({
              ...current,
              invoiceSeries: value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 10),
            }))
          }
          placeholder="A"
          theme={theme}
          autoCapitalize="characters"
        />

        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={[styles.label, { color: theme.text }]}>Factura global</Text>
            <Text style={[styles.help, { color: theme.textMuted }]}>
              Deja preparada la opción para ventas al público general. No se timbrará todavía.
            </Text>
          </View>
          <Switch
            value={settings.globalInvoiceEnabled}
            onValueChange={value =>
              setSettings(current => ({
                ...current,
                globalInvoiceEnabled: value,
              }))
            }
            trackColor={{ false: '#444', true: theme.primary }}
            thumbColor="#fff"
          />
        </View>

        {settings.globalInvoiceEnabled ? (
          <Field
            label="Periodicidad global (código SAT)"
            value={settings.globalPeriodicityCode}
            onChangeText={value =>
              setSettings(current => ({
                ...current,
                globalPeriodicityCode: value.replace(/\D/g, '').slice(0, 2),
              }))
            }
            placeholder="01"
            theme={theme}
            keyboardType="number-pad"
          />
        ) : null}

        <PrimaryButton
          label={isSavingSettings ? 'Guardando...' : 'Guardar configuración fiscal'}
          disabled={isSavingSettings}
          onPress={() => { void handleSaveSettings(); }}
          theme={theme}
        />
      </Card>

      <Card
        title="Clientes fiscales"
        subtitle={`${activeCustomers.length} cliente(s) activo(s). Los datos se copian como snapshot al crear el borrador.`}
        theme={theme}
      >
        <Field
          label="Alias interno"
          value={customerForm.alias}
          onChangeText={value =>
            setCustomerForm(current => ({ ...current, alias: value }))
          }
          placeholder="Ej. Cliente frecuente"
          theme={theme}
        />
        <Field
          label="Razón social / nombre fiscal"
          value={customerForm.legalName}
          onChangeText={value =>
            setCustomerForm(current => ({ ...current, legalName: value }))
          }
          placeholder="Nombre exacto de constancia fiscal"
          theme={theme}
        />
        <Field
          label="RFC"
          value={customerForm.rfc}
          onChangeText={value =>
            setCustomerForm(current => ({
              ...current,
              rfc: value.toUpperCase().replace(/\s/g, '').slice(0, 13),
            }))
          }
          placeholder="XAXX010101000"
          theme={theme}
          autoCapitalize="characters"
        />
        <Field
          label="Régimen fiscal (código SAT)"
          value={customerForm.taxRegimeCode}
          onChangeText={value =>
            setCustomerForm(current => ({
              ...current,
              taxRegimeCode: value.replace(/\D/g, '').slice(0, 3),
            }))
          }
          placeholder="Ej. 612"
          theme={theme}
          keyboardType="number-pad"
        />
        <Field
          label="Código postal fiscal"
          value={customerForm.postalCode}
          onChangeText={value =>
            setCustomerForm(current => ({
              ...current,
              postalCode: value.replace(/\D/g, '').slice(0, 5),
            }))
          }
          placeholder="38000"
          theme={theme}
          keyboardType="number-pad"
        />
        <Field
          label="Uso CFDI (código SAT)"
          value={customerForm.cfdiUseCode}
          onChangeText={value =>
            setCustomerForm(current => ({
              ...current,
              cfdiUseCode: value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3),
            }))
          }
          placeholder="G03"
          theme={theme}
          autoCapitalize="characters"
        />
        <Field
          label="Correo para factura"
          value={customerForm.email}
          onChangeText={value =>
            setCustomerForm(current => ({ ...current, email: value }))
          }
          placeholder="cliente@correo.com"
          theme={theme}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View style={styles.actionRow}>
          <PrimaryButton
            label={isSavingCustomer
              ? 'Guardando...'
              : editingCustomerId
                ? 'Actualizar cliente'
                : 'Agregar cliente'}
            disabled={isSavingCustomer}
            onPress={() => { void handleSaveCustomer(); }}
            theme={theme}
          />
          {editingCustomerId ? (
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: theme.border }]}
              onPress={resetCustomerForm}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Cancelar</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {customers.length === 0 ? (
          <Text style={[styles.empty, { color: theme.textMuted }]}>
            Aún no hay clientes fiscales registrados.
          </Text>
        ) : (
          customers.map(customer => (
            <View
              key={customer.id}
              style={[
                styles.customerRow,
                { borderColor: theme.border, backgroundColor: theme.surfaceAlt },
                !customer.isActive && styles.inactive,
              ]}
            >
              <View style={styles.customerInfo}>
                <Text style={[styles.customerName, { color: theme.text }]}>
                  {customer.alias || customer.legalName}
                </Text>
                <Text style={[styles.customerMeta, { color: theme.textMuted }]}>
                  {customer.legalName} · {customer.rfc}
                </Text>
                <Text style={[styles.customerMeta, { color: theme.textMuted }]}>
                  Régimen {customer.taxRegimeCode} · CP {customer.postalCode} · Uso {customer.cfdiUseCode}
                </Text>
              </View>
              <View style={styles.customerActions}>
                <TouchableOpacity
                  style={[styles.smallButton, { borderColor: theme.border }]}
                  onPress={() => handleEditCustomer(customer)}
                >
                  <Text style={[styles.smallButtonText, { color: theme.text }]}>EDITAR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallButton, { borderColor: theme.border }]}
                  onPress={() => { void handleToggleCustomer(customer); }}
                >
                  <Text style={[styles.smallButtonText, { color: theme.text }]}>
                    {customer.isActive ? 'DESACTIVAR' : 'ACTIVAR'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </Card>

      <Card
        title="Timbrado"
        subtitle="Preparado para la siguiente fase."
        theme={theme}
      >
        <Text style={[styles.help, { color: theme.textMuted }]}>
          Los documentos creados aquí son borradores internos. Todavía no tienen UUID, XML ni validez fiscal hasta integrar un PAC y timbrarlos desde backend.
        </Text>
      </Card>
    </ScrollView>
  );
}

interface Theme {
  primary: string;
  onPrimary: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
}

function Card({
  title,
  subtitle,
  theme,
  children,
}: {
  title: string;
  subtitle: string;
  theme: Theme;
  children?: React.ReactNode;
}) {
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>{subtitle}</Text>
      {children}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  theme,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  theme: Theme;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#707070"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={[
          styles.input,
          {
            color: theme.text,
            borderColor: theme.border,
            backgroundColor: theme.surfaceAlt,
          },
        ]}
      />
    </View>
  );
}

function PrimaryButton({
  label,
  disabled,
  onPress,
  theme,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
  theme: Theme;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.primaryButton,
        { backgroundColor: theme.primary },
        disabled && styles.inactive,
      ]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={[styles.primaryButtonText, { color: theme.onPrimary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 18 },
  titleText: { flex: 1 },
  title: { fontSize: 24, fontWeight: '900' },
  subtitle: { marginTop: 5, fontSize: 12, lineHeight: 18, maxWidth: 760 },
  muted: { fontSize: 13 },
  refreshButton: { minHeight: 38, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  refreshButtonText: { fontSize: 10, fontWeight: '900' },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '900' },
  cardSubtitle: { fontSize: 11, lineHeight: 16, marginTop: 4, marginBottom: 14 },
  field: { marginBottom: 12 },
  label: { fontSize: 11, fontWeight: '800', marginBottom: 6 },
  help: { fontSize: 11, lineHeight: 17 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, fontSize: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 6, marginBottom: 14 },
  switchText: { flex: 1 },
  primaryButton: { minHeight: 44, paddingHorizontal: 16, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  primaryButtonText: { fontSize: 12, fontWeight: '900' },
  secondaryButton: { minHeight: 44, borderWidth: 1, borderRadius: 9, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { fontSize: 12, fontWeight: '800' },
  actionRow: { gap: 8 },
  divider: { height: 1, marginVertical: 18 },
  empty: { textAlign: 'center', paddingVertical: 18, fontSize: 12 },
  customerRow: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10, gap: 10 },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 14, fontWeight: '900' },
  customerMeta: { marginTop: 3, fontSize: 10, lineHeight: 15 },
  customerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  customerPickerGrid: { gap: 8 },
  customerChoice: { borderWidth: 1, borderRadius: 10, padding: 11 },
  smallButton: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginTop: 8 },
  smallButtonText: { fontSize: 10, fontWeight: '900' },
  inactive: { opacity: 0.5 },
  orderRow: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 9 },
  orderHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  orderGrow: { flex: 1 },
  orderTitle: { fontSize: 13, fontWeight: '900' },
  orderMeta: { marginTop: 3, fontSize: 10, lineHeight: 15 },
  orderAmount: { fontSize: 14, fontWeight: '900' },
  blockReason: { marginTop: 7, fontSize: 10, lineHeight: 15, color: '#E3A55B', fontWeight: '700' },
  readyText: { marginTop: 7, fontSize: 10, fontWeight: '900' },
  previewBox: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 14 },
  previewTitle: { fontSize: 12, fontWeight: '900', marginBottom: 4 },
  previewAmount: { fontSize: 16, fontWeight: '900', marginTop: 8 },
  invoiceRow: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  productRow: { borderWidth: 1, borderRadius: 10, padding: 11, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  editorBox: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 14 },
  editorTitle: { fontSize: 14, fontWeight: '900', marginBottom: 12 },
});
