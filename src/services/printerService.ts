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
import { KitchenOrder, PaymentMethod } from '../types';

import {
  BURGER_KONG_LOGO,
  BURGER_KONG_PROMO,
  LUCKY_DORIAN,
} from '../generated/printerAssets';
import { PromoCoupon } from './promoService';
import { fetchOrderWeeklySauceDiscounts } from '../repositories/OrderRepository';

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

  await printer.write(
    '\x1B\x40',
  );

  await setAlignment(
    printer,
    'center',
  );

  await printRasterImage(
    printer,
    BURGER_KONG_LOGO,
  );

  await printer.write(
    '\n',
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

  await feedPaper(
    printer,
    3,
  );

  await cutPaper(
    printer,
  );
}

async function printRasterImage(
  printer: BluetoothDevice,
  image: {
    width: number;
    height: number;
    base64: string;
  },
): Promise<void> {
  /*
   * printerAssets.ts ya contiene:
   *
   * GS v 0
   * + encabezado raster
   * + bitmap monocromático
   *
   * Por eso NO agregamos otro
   * encabezado ESC/POS aquí.
   */

  await printer.write(
    image.base64,
    'base64',
  );

  /*
   * Dejamos una pequeña separación
   * después de la imagen.
   */
  await printer.write(
    '\n',
  );
}

export async function printOrderTicket({
  order,
  paymentMethod,
  amountReceived,
  promoCoupon,
  ticketDate,
  isReprint = false,
}: PrintOrderTicketParams): Promise<void> {
  const printer =
    await connectPrinter();

  const total =
    Number(
      order.total,
    );

  const weeklySauceDiscounts =
    await fetchOrderWeeklySauceDiscounts(
      order.id,
    );

  const weeklySauceDiscountTotal =
    roundCurrency(
      weeklySauceDiscounts.reduce(
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
      weeklySauceDiscountTotal,
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

  const shortId =
    order.id
      .slice(-6)
      .toUpperCase();

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

  await setAlignment(
    printer,
    'center',
  );

  await printRasterImage(
    printer,
    BURGER_KONG_LOGO,
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
    `Ticket: #${shortId}\n`,
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
      )}\n`,
    );

    await setBold(
      printer,
      false,
    );

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
      `Tel: ${sanitizeTicketText(
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
   * separado cuando hubo Salsa
   * de la Semana.
   */

  if (
    weeklySauceDiscountTotal > 0
  ) {
    await printer.write(
      createAmountRow(
        'SUBTOTAL',
        subtotal,
      ),
    );

    await setBold(
      printer,
      true,
    );

    await printer.write(
      'SALSA DE LA SEMANA\n',
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
      weeklySauceDiscounts
    ) {
      const sauceName =
        sanitizeTicketText(
          discount.modifierName,
        );

      await printer.write(
        createAmountRow(
          `  ${sauceName}`,
          -Math.abs(
            Number(
              discount.discountAmount,
            ),
          ),
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
      ),
    );

    await printer.write(
      createAmountRow(
        'CAMBIO',
        change ?? 0,
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

  await setBold(
    printer,
    true,
  );

  await printer.write(
    'GRACIAS POR TU COMPRA\n',
  );

  await setBold(
    printer,
    false,
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
): string {
  const formattedAmount =
    amount < 0
      ? `-$${Math.abs(
        amount,
      ).toFixed(2)}`
      : `$${amount.toFixed(2)}`;

  return createTextRow(
    label,
    formattedAmount,
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

async function printPromoCoupon(
  printer:
    BluetoothDevice,
  promoCoupon:
    PromoCoupon,
): Promise<void> {
  /*
   * Una sola línea de separación
   * entre el ticket y el cupón.
   */
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

  if (
    promoCoupon.couponType ===
    'lucky_dorian'
  ) {
    await printLuckyDorianCoupon(
      printer,
      promoCoupon,
    );

    return;
  }

  await printKongCoupon(
    printer,
    promoCoupon,
  );
}

async function printKongCoupon(
  printer:
    BluetoothDevice,
  promoCoupon:
    PromoCoupon,
): Promise<void> {
  await setAlignment(
    printer,
    'center',
  );

  await setBold(
    printer,
    true,
  );

  await printer.write(
    'RECORTA TU KONG\n',
  );

  await setBold(
    printer,
    false,
  );

  /*
   * BURGER_KONG_PROMO se genera
   * ahora a un ancho menor desde
   * generatePrinterAssets.js.
   */
  await printRasterImage(
    printer,
    BURGER_KONG_PROMO,
  );

  /*
   * El código sustituye a los
   * textos separados "KONG" y
   * "CODIGO" del formato anterior.
   */
  await setBold(
    printer,
    true,
  );

  await printer.write(
    `${promoCoupon.code}\n`,
  );

  await printer.write(
    'JUNTA 5 KONGS Y CANJEA POR:\n',
  );

  await setBold(
    printer,
    false,
  );

  await printer.write(
    'HAMBURGUESA ESPECIAL\n',
  );

  await printer.write(
    'BONELESS 150 G | ALITAS 6 PZAS\n',
  );

  await printer.write(
    'PAPAS GRANDES | MALTEADA KONG\n',
  );

  await printer.write(
    'CONSERVA TU KONG Y SU CODIGO\n',
  );

  await printer.write(
    'CODIGOS REPETIDOS NO APLICAN\n',
  );

  await printer.write(
    separator(),
  );
}

async function printLuckyDorianCoupon(
  printer: BluetoothDevice,
  promoCoupon: PromoCoupon,
): Promise<void> {
  await setAlignment(
    printer,
    'center',
  );

  await setBold(
    printer,
    true,
  );

  await printer.write(
    'DORIAN DE LA SUERTE\n',
  );

  await setBold(
    printer,
    false,
  );

  await printRasterImage(
    printer,
    LUCKY_DORIAN,
  );

  await setBold(
    printer,
    true,
  );

  await printer.write(
    'FELICIDADES!\n',
  );

  await printer.write(
    'TU COMPRA ES GRATIS\n',
  );

  /*
   * El código reemplaza
   * el bloque "CODIGO".
   */
  await printer.write(
    `${promoCoupon.code}\n`,
  );

  await setBold(
    printer,
    false,
  );

  await printer.write(
    'PRESENTA ESTE CUPON EN CAJA\n',
  );

  await printer.write(
    'CONSERVA EL CUPON Y SU CODIGO\n',
  );

  await printer.write(
    'CODIGOS REPETIDOS NO APLICAN\n',
  );

  await printer.write(
    'NO ACUMULABLE CON OTRAS PROMOS\n',
  );

  await printer.write(
    separator(),
  );
}