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

function ensurePrinterBrandingImport(source) {
  const importRegex =
    /import\s*\{[\s\S]*?\}\s*from\s*['"]\.\.\/generated\/runtimeClientBranding['"];\s*/m;

  const desiredImport =
    `import {\n  PrinterRasterImage,\n  runtimeBranding,\n} from '../generated/runtimeClientBranding';\n\n`;

  if (importRegex.test(source)) {
    return source.replace(
      importRegex,
      desiredImport,
    );
  }

  const marker = 'let connectedPrinter';
  const index = source.indexOf(marker);

  if (index < 0) {
    throw new Error(
      'No se encontró connectedPrinter para insertar branding.',
    );
  }

  return (
    source.slice(0, index) +
    desiredImport +
    source.slice(index)
  );
}

function patchBusinessHeaderCalls(source) {
  // Repara llamadas antiguas de 4 argumentos. Las llamadas ya parcheadas con
  // runtimeBranding.printer.ticketLogo se dejan intactas.
  return source.replace(
    /await\s+printBusinessHeader\(\s*printer,\s*business\.identity\.businessName,\s*business\.identity\.phone,\s*business\.identity\.address,\s*\);/g,
    `await printBusinessHeader(\n    printer,\n    business.identity.businessName,\n    business.identity.phone,\n    business.identity.address,\n    runtimeBranding.printer.ticketLogo,\n  );`,
  );
}

function ensureRasterHelper(source) {
  if (source.includes('async function printRasterImage(')) {
    return source;
  }

  const marker = 'async function printBusinessHeader(';
  const index = source.indexOf(marker);
  if (index < 0) {
    throw new Error('No se encontró printBusinessHeader para insertar printRasterImage.');
  }

  const helper = `async function printRasterImage(\n  printer: BluetoothDevice,\n  image: PrinterRasterImage,\n): Promise<void> {\n  await printer.write(\n    image.base64,\n    'base64',\n  );\n\n  await printer.write('\\n');\n}\n\n`;

  return source.slice(0, index) + helper + source.slice(index);
}

function replaceBusinessHeader(source) {
  const replacement = `async function printBusinessHeader(\n  printer: BluetoothDevice,\n  businessName: string,\n  phone: string,\n  address: string,\n  ticketLogo: PrinterRasterImage | null,\n): Promise<void> {\n  await setAlignment(\n    printer,\n    'center',\n  );\n\n  if (ticketLogo) {\n    await printRasterImage(\n      printer,\n      ticketLogo,\n    );\n  } else {\n    await setBold(\n      printer,\n      true,\n    );\n\n    await setTextSize(\n      printer,\n      'double',\n    );\n\n    for (const line of wrapTicketText(\n      businessName,\n      16,\n    )) {\n      await printer.write(\n        \`${'${sanitizeTicketText(line)}'}\\n\`,\n      );\n    }\n\n    await setTextSize(\n      printer,\n      'normal',\n    );\n\n    await setBold(\n      printer,\n      false,\n    );\n  }\n\n  if (address.trim()) {\n    for (const line of wrapTicketText(\n      address,\n      32,\n    )) {\n      await printer.write(\n        \`${'${sanitizeTicketText(line)}'}\\n\`,\n      );\n    }\n  }\n\n  if (phone.trim()) {\n    await printer.write(\n      \`Tel: ${'${sanitizeTicketText(phone.trim())}'}\\n\`,\n    );\n  }\n\n  await printer.write('\\n');\n}\n\n`;

  return replaceSection(
    source,
    'async function printBusinessHeader(',
    'async function printTicketFooter(',
    replacement,
    'No se encontró el bloque printBusinessHeader/printTicketFooter.',
  );
}


function removeLegacyPromotionImagePatch(source) {
  // El sistema actual obtiene la imagen promocional desde Supabase/promociones
  // dinámicas. Este bloque pertenecía al sistema legacy hardcodeado por nombre.
  const legacyBlock =
    /[ \t]*const\s+promotionImage\s*=\s*getPromotionImageForProgram\(\s*promoCoupon\.programName,\s*\);\s*if\s*\(promotionImage\)\s*\{\s*await\s+printRasterImage\(\s*printer,\s*promotionImage,\s*\);\s*\}\s*/g;

  source = source.replace(
    legacyBlock,
    '',
  );

  // Limpia cualquier referencia residual al helper legacy.
  source = source.replace(
    /\s*getPromotionImageForProgram,\s*/g,
    '\n',
  );

  return source;
}

function patchPrinterService(root) {
  const file = path.join(root, 'src', 'services', 'printerService.ts');
  if (!fs.existsSync(file)) throw new Error(`No existe ${file}`);

  let source = normalizeEol(fs.readFileSync(file, 'utf8'));
  source = removeLegacyPromotionImagePatch(source);
  source = ensurePrinterBrandingImport(source);
  source = patchBusinessHeaderCalls(source);
  source = ensureRasterHelper(source);
  source = replaceBusinessHeader(source);

  fs.writeFileSync(file, source, 'utf8');
  console.log('OK: printerService.ts actualizado/reparado sin promociones legacy.');
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
patchPrinterService(root);
patchGlobalHeader(root);
console.log('White-label patches aplicados correctamente.');
