import {
  PermissionsAndroid,
  Platform,
} from 'react-native';

import RNBluetoothClassic, {
  BluetoothDevice,
} from 'react-native-bluetooth-classic';

import {
  getActivePrinterSettings,
} from './printerSettingsService';

import {
  supabase,
} from './supabase';
import { KitchenOrder, PaymentMethod } from '../types';

import { PromoCoupon } from './promoService';
import { getPromotionPrograms } from './promotionService';
import { getBusinessSettings } from './businessHoursService';
import { fetchOrderModifierPromotionDiscounts } from '../repositories/OrderRepository';

import {
  getOrderTrackingCode,
} from '../Utils/orderTracking';

import {
  DEFAULT_CURRENCY_CODE,
  formatCurrency,
  normalizeCurrencyCode,
} from '../Utils/currency';

import {
  PrinterRasterImage,
  runtimeBranding,
} from '../generated/runtimeClientBranding';

let connectedPrinter:
  BluetoothDevice | null = null;

async function requestBluetoothPermissions(): Promise<void> {
  if (
    Platform.OS !== 'android'
  ) {
    return;
  }

  if (
    Number(Platform.Version) < 31
  ) {
    return;
  }

  const connectPermission =
    PermissionsAndroid.PERMISSIONS
      .BLUETOOTH_CONNECT;

  const scanPermission =
    PermissionsAndroid.PERMISSIONS
      .BLUETOOTH_SCAN;

  const result =
    await PermissionsAndroid.requestMultiple([
      connectPermission,
      scanPermission,
    ]);

  const connectGranted =
    result[
    connectPermission
    ] ===
    PermissionsAndroid.RESULTS.GRANTED;

  const scanGranted =
    result[
    scanPermission
    ] ===
    PermissionsAndroid.RESULTS.GRANTED;

  if (
    !connectGranted ||
    !scanGranted
  ) {
    throw new Error(
      'Se necesitan permisos de Bluetooth para usar la impresora.',
    );
  }
}

export async function getPairedBluetoothDevices(): Promise<
  BluetoothDevice[]
> {
  await requestBluetoothPermissions();

  const enabled =
    await RNBluetoothClassic.isBluetoothEnabled();

  if (!enabled) {
    throw new Error(
      'Activa Bluetooth antes de usar la impresora.',
    );
  }

  return RNBluetoothClassic.getBondedDevices();
}

export async function getPrinterDevice(): Promise<
  BluetoothDevice
> {
  const settings =
    await getActivePrinterSettings();

  if (!settings) {
    throw new Error(
      'No hay una impresora configurada.',
    );
  }

  if (
    settings.connectionType !==
    'bluetooth'
  ) {
    throw new Error(
      'La impresora activa no está configurada por Bluetooth.',
    );
  }

  if (
    !settings.bluetoothAddress
  ) {
    throw new Error(
      'La impresora no tiene una dirección Bluetooth configurada.',
    );
  }

  const devices =
    await getPairedBluetoothDevices();

  const printer =
    devices.find(
      (device) =>
        normalizeAddress(
          device.address,
        ) ===
        normalizeAddress(
          settings.bluetoothAddress ??
          '',
        ),
    );

  if (!printer) {
    throw new Error(
      `No se encontró "${settings.name}" entre los dispositivos Bluetooth emparejados.`,
    );
  }

  return printer;
}

export async function connectPrinter(): Promise<
  BluetoothDevice
> {
  /*
   * Si ya tenemos una referencia,
   * primero verificamos si sigue
   * conectada.
   */
  if (connectedPrinter) {
    try {
      const isConnected =
        await connectedPrinter.isConnected();

      if (isConnected) {
        return connectedPrinter;
      }
    } catch {
      /*
       * Si falla la comprobación,
       * descartamos la referencia
       * y reconectamos.
       */
    }

    connectedPrinter =
      null;
  }

  const printer =
    await getPrinterDevice();

  const alreadyConnected =
    await printer.isConnected();

  if (!alreadyConnected) {
    const connected =
      await printer.connect();

    if (!connected) {
      throw new Error(
        'No se pudo conectar con la impresora.',
      );
    }
  }

  connectedPrinter =
    printer;

  return printer;
}

export async function disconnectPrinter(): Promise<void> {
  if (!connectedPrinter) {
    return;
  }

  try {
    const isConnected =
      await connectedPrinter.isConnected();

    if (isConnected) {
      await connectedPrinter.disconnect();
    }
  } finally {
    connectedPrinter =
      null;
  }
}

export async function isPrinterConnected(): Promise<boolean> {
  if (!connectedPrinter) {
    return false;
  }

  try {
    return await connectedPrinter.isConnected();
  } catch {
    connectedPrinter =
      null;

    return false;
  }
}

export async function printTestTicket(): Promise<void> {
  const printer =
    await connectPrinter();

  const business =
    await getBusinessSettings();

  await printer.write(
    '\x1B\x40',
  );

  await printBusinessHeader(
    printer,
    business.identity.businessName,
    business.identity.phone,
    business.identity.address,
    runtimeBranding.printer.ticketLogo,
  );

  await setBold(
    printer,
    true,
  );

  await printer.write(
    'TICKET DE PRUEBA\n',
  );

  await setBold(
    printer,
    false,
  );

  await printTicketFooter(
    printer,
    business.ticketSettings.footerText,
  );

  await feedPaper(
    printer,
    3,
  );

  await cutPaper(
    printer,
  );
}

export async function printOrderTicket({
  order,
  paymentMethod,
  amountReceived,
  promoCoupon,
  ticketDate,
  isReprint = false,
  currencyCode =
  DEFAULT_CURRENCY_CODE,
}: PrintOrderTicketParams): Promise<void> {
  const printer =
    await connectPrinter();

  const business =
    await getBusinessSettings();

  const resolvedCurrencyCode =
    normalizeCurrencyCode(
      currencyCode,
    );

  const total =
    Number(
      order.total,
    );

  const modifierPromotionDiscounts =
    await fetchOrderModifierPromotionDiscounts(
      order.id,
    );

  const modifierPromotionDiscountTotal =
    roundCurrency(
      modifierPromotionDiscounts.reduce(
        (
          accumulated,
          discount,
        ) =>
          accumulated +
          Number(
            discount.discountAmount,
          ),
        0,
      ),
    );

  const subtotal =
    roundCurrency(
      total +
      modifierPromotionDiscountTotal,
    );

  const received =
    paymentMethod === 'cash'
      ? Number(
        amountReceived ?? total,
      )
      : null;

  const change =
    received !== null
      ? roundCurrency(
        received - total,
      )
      : null;

  const trackingCode =
    getOrderTrackingCode(
      order.id,
    );

  const orderDate =
    ticketDate ??
    new Date();

  /*
   * Inicializar impresora.
   */
  await printer.write(
    '\x1B\x40',
  );

  /*
 * ============================
 * ENCABEZADO
 * ============================
 */

  await printBusinessHeader(
    printer,
    business.identity.businessName,
    business.identity.phone,
    business.identity.address,
    runtimeBranding.printer.ticketLogo,
  );

  await setBold(
    printer,
    true,
  );

  await printer.write(
    'TICKET DE VENTA\n',
  );

  if (isReprint) {
    await setBold(
      printer,
      false,
    );

    await printer.write(
      '*** REIMPRESION ***\n',
    );

    await setBold(
      printer,
      true,
    );
  }

  await setBold(
    printer,
    false,
  );

  await printer.write(
    '\n',
  );

  await setAlignment(
    printer,
    'left',
  );

  await printer.write(
    separator(),
  );

  await printer.write(
    `Pedido: #${trackingCode}\n`,
  );

  await printer.write(
    `Origen: ${order.orderSource === 'web'
      ? 'WEB'
      : 'POS'
    } - ${order.fulfillmentType === 'delivery'
      ? 'DOMICILIO'
      : 'RECOGER'
    }\n`,
  );

  await printer.write(
    `Fecha: ${formatTicketDate(
      orderDate,
    )}\n`,
  );

  await printer.write(
    separator(),
  );

  /*
   * ============================
   * PRODUCTOS
   * ============================
   */

  for (
    const item of
    order.order_items
  ) {
    const productName =
      item.products?.name ??
      'Producto';

    await setBold(
      printer,
      true,
    );

    await printer.write(
      `${item.quantity}x ${sanitizeTicketText(
        productName,
      )}${item.reward_source ? ' - PREMIO $0' : ''}\n`,
    );

    await setBold(
      printer,
      false,
    );

    if (item.cooking_method) {
      await printer.write(
        `  Coccion: ${
          item.cooking_method === 'air_fryer'
            ? 'Freidora de aire'
            : 'Aceite'
        }\n`,
      );
    }

    const modifiers =
      item.modifiers ?? [];

    for (
      const modifier of
      modifiers
    ) {
      await printer.write(
        `  + ${sanitizeTicketText(
          modifier.name,
        )}\n`,
      );
    }

    const components =
      item.components ?? [];

    for (
      const component of
      components
    ) {
      const componentName =
        component.products
          ?.name ??
        component.label;

      await printer.write(
        `  > ${component.quantity}x ${sanitizeTicketText(
          componentName,
        )}\n`,
      );

      if (component.cooking_method) {
        await printer.write(
          `     Coccion: ${
            component.cooking_method === 'air_fryer'
              ? 'Freidora de aire'
              : 'Aceite'
          }\n`,
        );
      }

      for (
        const modifier of
        component.modifiers ??
        []
      ) {
        await printer.write(
          `     + ${sanitizeTicketText(
            modifier.name,
          )}\n`,
        );
      }

      if (
        component.notes
          ?.trim()
      ) {
        await printer.write(
          `     Nota: ${sanitizeTicketText(
            component.notes.trim(),
          )}\n`,
        );
      }
    }

    if (
      item.notes?.trim()
    ) {
      await printer.write(
        `  Nota: ${sanitizeTicketText(
          item.notes.trim(),
        )}\n`,
      );
    }

  }

  /*
   * ============================
   * CLIENTE WEB PARA RECOGER
   * ============================
   */

  if (
    order.orderSource === 'web' &&
    order.fulfillmentType === 'pickup' &&
    (
      order.customerName ||
      order.customerPhone
    )
  ) {
    await printer.write(
      separator(),
    );

    await setBold(
      printer,
      true,
    );

    await printer.write(
      'DATOS DEL CLIENTE\n',
    );

    await setBold(
      printer,
      false,
    );

    if (
      order.customerName
    ) {
      await printer.write(
        `Cliente: ${sanitizeTicketText(
          order.customerName,
        )}\n`,
      );
    }

    if (
      order.customerPhone
    ) {
      await printer.write(
        `Tel: ${maskCustomerPhone(
          order.customerPhone,
        )}\n`,
      );
    }
  }

  /*
   * ============================
   * DOMICILIO
   * ============================
   */

  if (
    order.deliveryDetails
  ) {
    const delivery =
      order.deliveryDetails;

    await printer.write(
      separator(),
    );

    await setBold(
      printer,
      true,
    );

    await printer.write(
      'PEDIDO A DOMICILIO\n',
    );

    await setBold(
      printer,
      false,
    );

    await printer.write(
      `Cliente: ${sanitizeTicketText(
        delivery.customerName,
      )}\n`,
    );

    await printer.write(
      `Tel: ${maskCustomerPhone(
        delivery.phone,
      )}\n`,
    );

    const address = [
      delivery.street,
      `#${delivery.exteriorNumber}`,
      delivery.interiorNumber
        ? `Int ${delivery.interiorNumber}`
        : '',
    ]
      .filter(Boolean)
      .join(' ');

    await printer.write(
      `${sanitizeTicketText(
        address,
      )}\n`,
    );

    await printer.write(
      `${sanitizeTicketText(
        delivery.neighborhood,
      )}`,
    );

    if (
      delivery.postalCode
    ) {
      await printer.write(
        ` CP ${sanitizeTicketText(
          delivery.postalCode,
        )}`,
      );
    }

    await printer.write(
      '\n',
    );

    if (
      delivery
        .deliveryReferences
    ) {
      await printer.write(
        `Ref: ${sanitizeTicketText(
          delivery.deliveryReferences,
        )}\n`,
      );
    }
  }

  /*
 * ============================
 * PAGO
 * ============================
 */

  await printer.write(
    separator(),
  );

  /*
   * ============================
   * SUBTOTAL
   * ============================
   *
   * Solamente lo mostramos
   * separado cuando hubo una
   * promoción de modificador.
   */

  if (
    modifierPromotionDiscountTotal > 0
  ) {
    await printer.write(
      createAmountRow(
        'SUBTOTAL',
        subtotal,
        resolvedCurrencyCode,
      ),
    );

    await setBold(
      printer,
      true,
    );

    const promotionName =
      sanitizeTicketText(
        modifierPromotionDiscounts[0]
          ?.promotionName ??
        'PROMOCION',
      );

    await printer.write(
      `${promotionName.toUpperCase()}\n`,
    );

    await setBold(
      printer,
      false,
    );

    /*
     * Podemos tener más de una
     * fila cuando diferentes
     * productos o componentes
     * calificaron.
     */
    for (
      const discount of
      modifierPromotionDiscounts
    ) {
      const modifierName =
        sanitizeTicketText(
          discount.modifierName,
        );

      await printer.write(
        createAmountRow(
          `  ${modifierName}`,
          -Math.abs(
            Number(
              discount.discountAmount,
            ),
          ),
          resolvedCurrencyCode,
        ),
      );
    }

  }

  /*
   * ============================
   * TOTAL
   * ============================
   */

  await setBold(
    printer,
    true,
  );

  await printer.write(
    createAmountRow(
      'TOTAL',
      total,
      resolvedCurrencyCode,
    ),
  );

  await setBold(
    printer,
    false,
  );

  await printer.write(
    createTextRow(
      'PAGO',
      paymentMethod ===
        'cash'
        ? 'EFECTIVO'
        : 'TARJETA',
    ),
  );

  if (
    paymentMethod === 'cash' &&
    received !== null
  ) {
    await printer.write(
      createAmountRow(
        'RECIBIDO',
        received,
        resolvedCurrencyCode,
      ),
    );

    await printer.write(
      createAmountRow(
        'CAMBIO',
        change ?? 0,
        resolvedCurrencyCode,
      ),
    );
  }

  await printer.write(
    separator(),
  );

  /*
   * ============================
   * PIE
   * ============================
   */

  await setAlignment(
    printer,
    'center',
  );

  await printTicketFooter(
    printer,
    business.ticketSettings.footerText,
  );

  if (
    promoCoupon
  ) {
    await printPromoCoupon(
      printer,
      promoCoupon,
    );
  }

  await feedPaper(
    printer,
    2,
  );

  await cutPaper(
    printer,
  );
}


export interface RefundTicketItem {
  productName: string;
  quantity: number;
  unitRefundAmount: number;
}

export interface PrintRefundTicketParams {
  refundNumber: number;
  refundType:
    | 'full'
    | 'partial';
  orderId: string;
  createdAt: string;
  paymentMethod: string;
  refundTotal: number;
  reason: string;
  notes: string | null;
  policyException: boolean;
  userName: string | null;
  items: RefundTicketItem[];
  currencyCode?: string;
}

export async function printRefundTicket({
  refundNumber,
  refundType,
  orderId,
  createdAt,
  paymentMethod,
  refundTotal,
  reason,
  notes,
  policyException,
  userName,
  items,
  currencyCode =
    DEFAULT_CURRENCY_CODE,
}: PrintRefundTicketParams): Promise<void> {
  const printer =
    await connectPrinter();

  const business =
    await getBusinessSettings();

  const resolvedCurrencyCode =
    normalizeCurrencyCode(
      currencyCode,
    );

  const refundDate =
    new Date(createdAt);

  await printer.write(
    '\x1B\x40',
  );

  await printBusinessHeader(
    printer,
    business.identity.businessName,
    business.identity.phone,
    business.identity.address,
    runtimeBranding.printer.ticketLogo,
  );

  await setBold(
    printer,
    true,
  );

  await printer.write(
    'COMPROBANTE DE DEVOLUCION\n',
  );

  await printer.write(
    `DEV-${String(
      refundNumber,
    ).padStart(6, '0')}\n`,
  );

  await setBold(
    printer,
    false,
  );

  await printer.write('\n');

  await setAlignment(
    printer,
    'left',
  );

  await printer.write(
    separator(),
  );

  await printer.write(
    `Orden: #${orderId
      .slice(-4)
      .toUpperCase()}\n`,
  );

  await printer.write(
    `Fecha: ${formatTicketDate(
      Number.isNaN(
        refundDate.getTime(),
      )
        ? new Date()
        : refundDate,
    )}\n`,
  );

  await printer.write(
    createTextRow(
      'TIPO',
      refundType === 'full'
        ? 'TOTAL'
        : 'PARCIAL',
    ),
  );

  await printer.write(
    createTextRow(
      'PAGO',
      paymentMethod === 'cash'
        ? 'EFECTIVO'
        : paymentMethod === 'card'
          ? 'TARJETA'
          : sanitizeTicketText(
              paymentMethod.toUpperCase(),
            ),
    ),
  );

  await printer.write(
    separator(),
  );

  await setBold(
    printer,
    true,
  );

  await printer.write(
    'ARTICULOS DEVUELTOS\n',
  );

  await setBold(
    printer,
    false,
  );

  for (const item of items) {
    const cleanName =
      sanitizeTicketText(
        item.productName,
      );

    for (
      const line of
      wrapTicketText(
        `${item.quantity}x ${cleanName}`,
        32,
      )
    ) {
      await printer.write(
        `${line}\n`,
      );
    }

    await printer.write(
      createAmountRow(
        '  IMPORTE',
        roundCurrency(
          item.quantity *
            item.unitRefundAmount,
        ),
        resolvedCurrencyCode,
      ),
    );
  }

  await printer.write(
    separator(),
  );

  await setBold(
    printer,
    true,
  );

  await printer.write(
    createAmountRow(
      'TOTAL DEVUELTO',
      refundTotal,
      resolvedCurrencyCode,
    ),
  );

  await setBold(
    printer,
    false,
  );

  await printer.write(
    separator(),
  );

  await setBold(
    printer,
    true,
  );

  await printer.write(
    'MOTIVO\n',
  );

  await setBold(
    printer,
    false,
  );

  for (
    const line of
    wrapTicketText(
      sanitizeTicketText(
        reason,
      ),
      32,
    )
  ) {
    await printer.write(
      `${line}\n`,
    );
  }

  if (notes?.trim()) {
    await printer.write('\n');

    await setBold(
      printer,
      true,
    );

    await printer.write(
      'NOTAS\n',
    );

    await setBold(
      printer,
      false,
    );

    for (
      const line of
      wrapTicketText(
        sanitizeTicketText(
          notes.trim(),
        ),
        32,
      )
    ) {
      await printer.write(
        `${line}\n`,
      );
    }
  }

  if (userName?.trim()) {
    await printer.write('\n');

    for (
      const line of
      wrapTicketText(
        `Realizo: ${sanitizeTicketText(
          userName.trim(),
        )}`,
        32,
      )
    ) {
      await printer.write(
        `${line}\n`,
      );
    }
  }

  if (policyException) {
    await printer.write(
      '\n*** EXCEPCION DE POLITICA ***\n',
    );
  }

  await printer.write(
    separator(),
  );

  await setAlignment(
    printer,
    'center',
  );

  await printer.write(
    'DEVOLUCION REGISTRADA\n',
  );

  await printTicketFooter(
    printer,
    business.ticketSettings.footerText,
  );

  await feedPaper(
    printer,
    2,
  );

  await cutPaper(
    printer,
  );
}

export async function printRawText(
  text: string,
): Promise<void> {
  if (!text.trim()) {
    throw new Error(
      'No hay contenido para imprimir.',
    );
  }

  const printer =
    await connectPrinter();

  await printer.write(
    '\x1B\x40',
  );

  await printer.write(
    text,
  );

  await feedPaper(
    printer,
    4,
  );

  await cutPaper(
    printer,
  );
}

async function printRasterImage(
  printer: BluetoothDevice,
  image: PrinterRasterImage,
): Promise<void> {
  await printer.write(
    image.base64,
    'base64',
  );

  await printer.write('\n');
}

async function printBusinessHeader(
  printer: BluetoothDevice,
  businessName: string,
  phone: string,
  address: string,
  ticketLogo: PrinterRasterImage | null,
): Promise<void> {
  await setAlignment(
    printer,
    'center',
  );

  if (ticketLogo) {
    await printRasterImage(
      printer,
      ticketLogo,
    );
  } else {
    await setBold(
      printer,
      true,
    );

    await setTextSize(
      printer,
      'double',
    );

    for (const line of wrapTicketText(
      businessName,
      16,
    )) {
      await printer.write(
        `${sanitizeTicketText(line)}\n`,
      );
    }

    await setTextSize(
      printer,
      'normal',
    );

    await setBold(
      printer,
      false,
    );
  }

  if (address.trim()) {
    for (const line of wrapTicketText(
      address,
      32,
    )) {
      await printer.write(
        `${sanitizeTicketText(line)}\n`,
      );
    }
  }

  if (phone.trim()) {
    await printer.write(
      `Tel: ${sanitizeTicketText(phone.trim())}\n`,
    );
  }

  await printer.write('\n');
}

async function printTicketFooter(
  printer: BluetoothDevice,
  footerText: string,
): Promise<void> {
  const cleanFooter =
    footerText.trim();

  if (!cleanFooter) {
    return;
  }

  await setAlignment(
    printer,
    'center',
  );

  await setBold(
    printer,
    true,
  );

  for (
    const line of wrapTicketText(
      cleanFooter,
      32,
    )
  ) {
    await printer.write(
      `${sanitizeTicketText(
        line,
      )}\n`,
    );
  }

  await setBold(
    printer,
    false,
  );
}

function wrapTicketText(
  value: string,
  maxWidth: number,
): string[] {
  const words =
    value
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .filter(Boolean);

  if (words.length === 0) {
    return [];
  }

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (word.length > maxWidth) {
      if (current) {
        lines.push(current);
        current = '';
      }

      for (
        let index = 0;
        index < word.length;
        index += maxWidth
      ) {
        lines.push(
          word.slice(
            index,
            index + maxWidth,
          ),
        );
      }

      continue;
    }

    const next =
      current
        ? `${current} ${word}`
        : word;

    if (next.length <= maxWidth) {
      current = next;
      continue;
    }

    lines.push(current);
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

async function feedPaper(
  printer: BluetoothDevice,
  lines = 3,
): Promise<void> {
  const safeLines =
    Math.max(
      1,
      Math.min(
        lines,
        10,
      ),
    );

  await printer.write(
    '\n'.repeat(
      safeLines,
    ),
  );
}

async function cutPaper(
  printer: BluetoothDevice,
): Promise<void> {
  /*
   * GS V 66 0
   *
   * Corte parcial.
   *
   * En tu self-test:
   * Cut Selected = YES
   */
  await printer.write(
    '\x1D\x56\x42\x00',
  );
}

function normalizeAddress(
  address: string,
): string {
  return address
    .trim()
    .toUpperCase();
}

export async function resetPrinterConnection(): Promise<void> {
  await disconnectPrinter();
}

interface PrintOrderTicketParams {
  order:
  KitchenOrder;

  paymentMethod:
  PaymentMethod;

  amountReceived:
  number | null;

  promoCoupon:
  PromoCoupon | null;

  ticketDate?:
  Date;

  isReprint?:
  boolean;

  currencyCode?:
  string;
}

async function setAlignment(
  printer: BluetoothDevice,
  alignment:
    | 'left'
    | 'center'
    | 'right',
): Promise<void> {
  const value =
    alignment === 'center'
      ? '\x01'
      : alignment === 'right'
        ? '\x02'
        : '\x00';

  await printer.write(
    `\x1B\x61${value}`,
  );
}

async function setBold(
  printer: BluetoothDevice,
  enabled: boolean,
): Promise<void> {
  await printer.write(
    enabled
      ? '\x1B\x45\x01'
      : '\x1B\x45\x00',
  );
}

async function setTextSize(
  printer: BluetoothDevice,
  size:
    | 'normal'
    | 'double',
): Promise<void> {
  await printer.write(
    size === 'double'
      ? '\x1D\x21\x11'
      : '\x1D\x21\x00',
  );
}

function separator(): string {
  return (
    '--------------------------------\n'
  );
}

function createAmountRow(
  label: string,
  amount: number,
  currencyCode: string,
): string {
  return createTextRow(
    label,
    sanitizeTicketText(
      formatCurrency(
        amount,
        currencyCode,
      ),
    ),
  );
}

function createTextRow(
  label: string,
  value: string,
): string {
  const width =
    32;

  const availableSpaces =
    Math.max(
      1,
      width -
      label.length -
      value.length,
    );

  return (
    label +
    ' '.repeat(
      availableSpaces,
    ) +
    value +
    '\n'
  );
}

function formatTicketDate(
  date: Date,
): string {
  return date.toLocaleString(
    'es-MX',
    {
      day:
        '2-digit',
      month:
        '2-digit',
      year:
        'numeric',
      hour:
        '2-digit',
      minute:
        '2-digit',
      hour12:
        false,
    },
  );
}

function maskCustomerPhone(
  phone: string,
): string {
  const cleanPhone =
    phone.trim();

  if (!cleanPhone) {
    return '';
  }

  const digits =
    cleanPhone.replace(
      /\D/g,
      '',
    );

  if (digits.length <= 4) {
    return digits;
  }

  const visible =
    digits.slice(-4);

  return (
    '*'.repeat(
      digits.length - 4,
    ) +
    visible
  );
}

function sanitizeTicketText(
  value: string,
): string {
  return value
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .replace(
      /ñ/g,
      'n',
    )
    .replace(
      /Ñ/g,
      'N',
    )
    .replace(
      /\u00A0/g,
      ' ',
    );
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

function getEmbeddedImageData(
  value:
    string | null | undefined,
): {
  base64: string;
  mimeType: string;
} | null {
  if (!value) {
    return null;
  }

  const match =
    value.match(
      /^data:(image\/(?:jpeg|png));base64,(.+)$/i,
    );

  if (
    !match?.[1] ||
    !match?.[2]
  ) {
    return null;
  }

  return {
    mimeType:
      match[1]
        .toLowerCase(),
    base64:
      match[2],
  };
}

async function getPromotionQrRaster(
  code: string,
  centerImageUrl:
    string | null | undefined,
): Promise<
  PrinterRasterImage | null
> {
  try {
    const embeddedImage =
      getEmbeddedImageData(
        centerImageUrl,
      );

    const {
      data,
      error,
    } =
      await supabase
        .functions
        .invoke(
          'promotion-ticket-image',
          {
            body: {
              qrText:
                code,
              qrSize:
                280,
              centerImageBase64:
                embeddedImage
                  ?.base64 ??
                null,
              centerImageMimeType:
                embeddedImage
                  ?.mimeType ??
                null,
            },
          },
        );

    if (error) {
      console.warn(
        'No se pudo generar el QR promocional:',
        error,
      );
      return null;
    }

    const result =
      data as {
        base64?:
          string;
        width?:
          number;
        height?:
          number;
        error?:
          string;
      };

    if (
      result.error ||
      !result.base64 ||
      !Number.isFinite(
        Number(
          result.width,
        ),
      ) ||
      !Number.isFinite(
        Number(
          result.height,
        ),
      )
    ) {
      console.warn(
        'Respuesta inválida al generar QR promocional:',
        result.error,
      );
      return null;
    }

    return {
      base64:
        result.base64,
      width:
        Number(
          result.width,
        ),
      height:
        Number(
          result.height,
        ),
    };
  } catch (error) {
    console.warn(
      'Error generando QR promocional:',
      error,
    );
    return null;
  }
}

async function printPromoCoupon(
  printer:
    BluetoothDevice,
  promoCoupon:
    PromoCoupon,
): Promise<void> {
  await printer.write(
    '\n',
  );

  await setAlignment(
    printer,
    'center',
  );

  await printer.write(
    separator(),
  );

  const programs =
    await getPromotionPrograms();

  const program =
    programs.find(
      item =>
        item.id ===
        promoCoupon.programId,
    );

  const promotionQr =
    await getPromotionQrRaster(
      promoCoupon.code,
      program?.ticketShowImage
        ? program.ticketImageUrl
        : null,
    );

  if (promotionQr) {
    await printRasterImage(
      printer,
      promotionQr,
    );
  }

  await setBold(
    printer,
    true,
  );

  await printer.write(
    `${promoCoupon.programName.toUpperCase()}\n`,
  );

  await printer.write(
    `${promoCoupon.code}\n`,
  );

  await setBold(
    printer,
    false,
  );

  if (
    promoCoupon.programType ===
    'collect_reward'
  ) {
    const required =
      promoCoupon.requiredCoupons ??
      program?.requiredCoupons ??
      1;

    await printer.write(
      `JUNTA ${required} CUPONES Y CANJEA POR:\n`,
    );

    for (
      const reward of
      program?.rewards ?? []
    ) {
      await printer.write(
        `${reward.displayName.toUpperCase()}\n`,
      );
    }

    await printer.write(
      'CONSERVA TUS CUPONES Y CODIGOS\n',
    );

    await printer.write(
      'CODIGOS REPETIDOS NO APLICAN\n',
    );
  } else {
    await printer.write(
      'PRESENTA ESTE CUPON EN CAJA\n',
    );

    await printer.write(
      'BENEFICIO: REEMBOLSO DE COMPRA\n',
    );

    await printer.write(
      'CONSERVA EL CUPON Y SU CODIGO\n',
    );

    await printer.write(
      'NO ACUMULABLE CON OTRAS PROMOS\n',
    );
  }

  await printer.write(
    separator(),
  );
}