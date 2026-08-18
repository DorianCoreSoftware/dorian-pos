import {
  PermissionsAndroid,
  Platform,
} from 'react-native';

import RNBluetoothClassic, {
  BluetoothDevice,
} from 'react-native-bluetooth-classic';

const PRINTER_ADDRESS =
  '66:32:7E:0B:9D:18';

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
  const devices =
    await getPairedBluetoothDevices();

  const printer =
    devices.find(
      (device) =>
        normalizeAddress(
          device.address,
        ) ===
        normalizeAddress(
          PRINTER_ADDRESS,
        ),
    );

  if (!printer) {
    throw new Error(
      'No se encontró la impresora Bluetooth emparejada.',
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

  /*
   * ESC @
   * Inicializa la impresora.
   */
  await printer.write(
    '\x1B\x40',
  );

  /*
   * ESC a 1
   * Centrado.
   */
  await printer.write(
    '\x1B\x61\x01',
  );

  /*
   * ESC E 1
   * Negrita ON.
   */
  await printer.write(
    '\x1B\x45\x01',
  );

  /*
   * GS ! 17
   * Doble ancho +
   * doble alto.
   */
  await printer.write(
    '\x1D\x21\x11',
  );

  await printer.write(
    'BURGER KONG\n',
  );

  /*
   * Tamaño normal.
   */
  await printer.write(
    '\x1D\x21\x00',
  );

  /*
   * Negrita OFF.
   */
  await printer.write(
    '\x1B\x45\x00',
  );

  await printer.write(
    '\nPRUEBA DE IMPRESION\n\n',
  );

  /*
   * Alineación izquierda.
   */
  await printer.write(
    '\x1B\x61\x00',
  );

  await printer.write(
    '--------------------------------\n',
  );

  await printer.write(
    'Conexion Bluetooth correcta\n',
  );

  await printer.write(
    'ESC/POS funcionando\n',
  );

  await printer.write(
    '--------------------------------\n',
  );

  await feedPaper(
    printer,
    4,
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