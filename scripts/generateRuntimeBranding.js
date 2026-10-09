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

  const promotionExports = (branding.promotionImages || [])
    .map(item => item.export)
    .filter(Boolean);

  const promotionImport = promotionExports.length > 0
    ? `import { ${promotionExports.join(', ')} } from './printerAssets';\n`
    : '';

  const promotionRules = JSON.stringify(
    (branding.promotionImages || []).map(item => ({
      match: item.match,
      export: item.export,
    })),
    null,
    2,
  );

  const source = `import { CLIENT_TICKET_LOGO } from './clientPrinterAssets';\n${promotionImport}\nexport interface PrinterRasterImage {\n  width: number;\n  height: number;\n  base64: string;\n}\n\nexport const runtimeBranding = {\n  clientId: ${JSON.stringify(client.clientId)},\n  businessName: ${JSON.stringify(client.businessName)},\n  headerLogoSource: require(${JSON.stringify('../../' + headerLogo.replace(/^\.\//, ''))}),\n  printer: {\n    ticketLogo: CLIENT_TICKET_LOGO as PrinterRasterImage | null,\n  },\n} as const;\n\nconst promotionRules = ${promotionRules};\n\nexport function getPromotionImageForProgram(\n  programName: string | null | undefined,\n): PrinterRasterImage | null {\n  const normalized = (programName ?? '')\n    .normalize('NFD')\n    .replace(/[\\u0300-\\u036f]/g, '')\n    .trim()\n    .toLowerCase();\n\n  for (const rule of promotionRules) {\n    if (!rule.match || !normalized.includes(String(rule.match).toLowerCase())) {\n      continue;\n    }\n\n    switch (rule.export) {\n${(branding.promotionImages || [])
  .map(item => `      case ${JSON.stringify(item.export)}:\n        return ${item.export} as PrinterRasterImage;`)
  .join('\n')}\n      default:\n        return null;\n    }\n  }\n\n  return null;\n}\n`;

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
