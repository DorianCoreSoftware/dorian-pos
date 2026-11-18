const fs = require('fs');
const path = require('path');

function normalizeEol(value) {
  return value.replace(/\r\n/g, '\n');
}

function replaceSection(source, startMarker, endMarker, replacement, errorMessage) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);

  if (start < 0 || end < 0 || end <= start) {
    throw new Error(errorMessage);
  }

  return source.slice(0, start) + replacement + source.slice(end);
}

function validatePrinterService(root) {
  const file =
    path.join(
      root,
      'src',
      'services',
      'printerService.ts',
    );

  if (!fs.existsSync(file)) {
    throw new Error(
      `No existe ${file}`,
    );
  }

  const source =
    normalizeEol(
      fs.readFileSync(
        file,
        'utf8',
      ),
    );

  const requiredFragments = [
    "from 'react-native'",
    "from 'react-native-bluetooth-classic'",
    "from './printerSettingsService'",
    "from './supabase'",
    "from './promoService'",
    "from './promotionService'",
    "from './businessHoursService'",
    "from '../generated/runtimeClientBranding'",
    'async function printPromoCoupon(',
    'async function printRasterImage(',
    'async function printBusinessHeader(',
    'runtimeBranding.printer.ticketLogo',
  ];

  const missing =
    requiredFragments.filter(
      fragment =>
        !source.includes(
          fragment,
        ),
    );

  if (missing.length > 0) {
    throw new Error(
      [
        'printerService.ts no tiene la estructura esperada.',
        'Faltan:',
        ...missing.map(
          fragment =>
            `- ${fragment}`,
        ),
        'Restaura el servicio correcto antes de compilar.',
      ].join('\n'),
    );
  }

  if (
    source.includes(
      'getPromotionImageForProgram',
    )
  ) {
    throw new Error(
      'printerService.ts contiene lógica legacy getPromotionImageForProgram. Debe eliminarse antes de compilar.',
    );
  }

  if (
    source.includes(
      'const promotionImage',
    )
  ) {
    throw new Error(
      'printerService.ts contiene una declaración legacy promotionImage. Debe eliminarse antes de compilar.',
    );
  }

  const promoCount =
    (
      source.match(
        /async function printPromoCoupon\(/g,
      ) ?? []
    ).length;

  const rasterCount =
    (
      source.match(
        /async function printRasterImage\(/g,
      ) ?? []
    ).length;

  const headerCount =
    (
      source.match(
        /async function printBusinessHeader\(/g,
      ) ?? []
    ).length;

  if (
    promoCount !== 1 ||
    rasterCount !== 1 ||
    headerCount !== 1
  ) {
    throw new Error(
      `printerService.ts tiene funciones duplicadas o faltantes: printPromoCoupon=${promoCount}, printRasterImage=${rasterCount}, printBusinessHeader=${headerCount}.`,
    );
  }

  console.log(
    'OK: printerService.ts validado; no se modifica durante white-label.',
  );
}


function patchGlobalHeader(root) {
  const file = path.join(root, 'src', 'components', 'header', 'GlobalHeader.tsx');
  if (!fs.existsSync(file)) throw new Error(`No existe ${file}`);

  let source = normalizeEol(fs.readFileSync(file, 'utf8'));

  if (!source.includes("from '../../generated/runtimeClientBranding'")) {
    const marker = 'export type MainTab';
    const index = source.indexOf(marker);
    if (index < 0) {
      throw new Error('No se encontró MainTab para insertar runtime branding.');
    }

    const importBlock = `import {\n  runtimeBranding,\n} from '../../generated/runtimeClientBranding';\n\n`;
    source = source.slice(0, index) + importBlock + source.slice(index);
  }

  if (!source.includes('const logoSource =')) {
    const logoRegex = /const\s+logoUrl\s*=\s*business\?\.identity\.logoUrl\s*;/;
    if (!logoRegex.test(source)) {
      throw new Error('No se encontró logoUrl en GlobalHeader.');
    }

    source = source.replace(
      logoRegex,
      `const logoUrl =\n    business?.identity.logoUrl?.trim() ||\n    null;\n\n  const logoSource =\n    logoUrl\n      ? { uri: logoUrl }\n      : runtimeBranding.headerLogoSource;`,
    );
  }

  source = source.replace(/\{logoUrl\s*\?\s*\(/g, '{logoSource ? (');
  source = source.replace(
    /source=\{\{\s*uri:\s*logoUrl,?\s*\}\}/g,
    'source={logoSource}',
  );
  source = source.replace(/!logoUrl\s*&&\s*!businessName/g, '!logoSource && !businessName');

  fs.writeFileSync(file, source, 'utf8');
  console.log('OK: GlobalHeader.tsx actualizado.');
}

const root = process.cwd();
validatePrinterService(root);
patchGlobalHeader(root);
console.log('White-label validado/aplicado sin modificar printerService.ts.');
