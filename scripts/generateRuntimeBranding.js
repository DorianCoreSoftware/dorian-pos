const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = process.cwd();
const clientId = process.env.DORIAN_CLIENT_ID || 'kong-burger';
const configPath = path.join(root, 'clients', clientId, 'client.config.json');

if (!fs.existsSync(configPath)) {
  throw new Error(`No existe ${configPath}`);
}

const client = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const branding = client.runtimeBranding || {};
const generatedDir = path.join(root, 'src', 'generated');
fs.mkdirSync(generatedDir, { recursive: true });

function toProjectPath(value) {
  return path.join(root, String(value || '').replace(/^\.\//, ''));
}

async function generateEscPosRaster(sourcePath, exportName, maxWidth = 320) {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`No existe el asset de impresión: ${sourcePath}`);
  }

  const { data, info } = await sharp(sourcePath)
    .flatten({ background: '#ffffff' })
    .trim({ background: '#ffffff' })
    .resize({ width: maxWidth, withoutEnlargement: true })
    .grayscale()
    .threshold(180)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const channels = info.channels;
  const widthBytes = Math.ceil(width / 8);
  const raster = Buffer.alloc(widthBytes * height, 0x00);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = data[(y * width + x) * channels];
      const isBlack = pixel < 128;

      if (isBlack) {
        const byteIndex = y * widthBytes + Math.floor(x / 8);
        raster[byteIndex] |= 0x80 >> (x % 8);
      }
    }
  }

  // GS v 0: raster bit image, normal scale.
  const header = Buffer.from([
    0x1d,
    0x76,
    0x30,
    0x00,
    widthBytes & 0xff,
    (widthBytes >> 8) & 0xff,
    height & 0xff,
    (height >> 8) & 0xff,
  ]);

  const payload = Buffer.concat([header, raster]);

  return `export const ${exportName} = {\n  width: ${width},\n  height: ${height},\n  base64: ${JSON.stringify(payload.toString('base64'))},\n} as const;\n`;
}

async function main() {
  const headerLogo = branding.headerLogo || './assets/app-icon.png';
  const ticketLogoSource = branding.ticketLogoSource || headerLogo;
  const ticketLogoPath = toProjectPath(ticketLogoSource);

  const clientPrinterSource = await generateEscPosRaster(
    ticketLogoPath,
    'CLIENT_TICKET_LOGO',
    Number(branding.ticketLogoMaxWidth || 320),
  );

  fs.writeFileSync(
    path.join(generatedDir, 'clientPrinterAssets.ts'),
    `/* Archivo generado automáticamente. No editar manualmente. */\n\n${clientPrinterSource}`,
    'utf8',
  );

  const source = `import { CLIENT_TICKET_LOGO } from './clientPrinterAssets';

export interface PrinterRasterImage {
  width: number;
  height: number;
  base64: string;
}

export const runtimeBranding = {
  clientId: ${JSON.stringify(client.clientId)},
  businessName: ${JSON.stringify(client.businessName)},
  headerLogoSource: require(${JSON.stringify('../../' + headerLogo.replace(/^\.\//, ''))}),
  printer: {
    ticketLogo: CLIENT_TICKET_LOGO as PrinterRasterImage | null,
  },
} as const;
`;

  fs.writeFileSync(
    path.join(generatedDir, 'runtimeClientBranding.ts'),
    source,
    'utf8',
  );

  console.log(`Runtime branding generado para ${clientId}.`);
  console.log(`Logo de ticket generado desde: ${ticketLogoSource}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
