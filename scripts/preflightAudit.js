const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = process.cwd();
const failures = [];
const warnings = [];

function walk(directory) {
  const entries = fs.readdirSync(directory, {
    withFileTypes: true,
  });

  return entries.flatMap(entry => {
    const fullPath = path.join(directory, entry.name);

    if (
      entry.isDirectory() &&
      [
        '.git',
        'node_modules',
        'node_modules_backup',
        'supabase',
      ].includes(entry.name)
    ) {
      return [];
    }

    if (entry.isDirectory()) {
      return walk(fullPath);
    }

    return [fullPath];
  });
}

function relative(filePath) {
  return path.relative(root, filePath).replace(/\\/g, '/');
}

function checkSourcePattern({
  label,
  pattern,
  allow = [],
}) {
  const sourceRoot = path.join(root, 'src');

  for (const file of walk(sourceRoot)) {
    if (!/\.(ts|tsx|js|jsx)$/.test(file)) {
      continue;
    }

    const rel = relative(file);

    if (allow.includes(rel)) {
      continue;
    }

    const content = fs.readFileSync(file, 'utf8');

    if (pattern.test(content)) {
      failures.push(`${label}: ${rel}`);
    }
  }
}

checkSourcePattern({
  label: 'Branding legacy visible',
  pattern: /\bBurger\s*Kong\b|\bBK-K\b|\bBK-D\b/i,
  allow: [
    'src/Utils/storageMigration.ts',
  ],
});

checkSourcePattern({
  label: 'Color legacy #FFB000',
  pattern: /#ffb000/i,
});

checkSourcePattern({
  label: 'Modelo legacy de modificadores/combo',
  pattern: /requiresMeat|requiresSauce|requiresDrinkFlavor|product_flavors|(?:type|interface)\s+ModifierGroupCode/,
});

try {
  const trackedEnv = execFileSync(
    'git',
    ['ls-files', '.env', '.env.local'],
    {
      cwd: root,
      encoding: 'utf8',
    },
  )
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);

  if (trackedEnv.length > 0) {
    failures.push(
      `Archivos de entorno versionados: ${trackedEnv.join(', ')}. Ejecuta: git rm --cached ${trackedEnv.join(' ')}`,
    );
  }
} catch (error) {
  warnings.push(
    'No fue posible comprobar el índice de Git para .env/.env.local.',
  );
}

const appWeb = fs.readFileSync(
  path.join(root, 'App.web.tsx'),
  'utf8',
);

if (
  !/hostname\s*===\s*['"]app\.doriancore\.com['"]/.test(
    appWeb,
  )
) {
  failures.push(
    'App.web.tsx no contiene el host administrativo esperado app.doriancore.com.',
  );
}

if (failures.length > 0) {
  console.error('\nDorian POS preflight: FALLÓ\n');
  failures.forEach(item => console.error(`- ${item}`));

  if (warnings.length > 0) {
    console.warn('\nAdvertencias:');
    warnings.forEach(item => console.warn(`- ${item}`));
  }

  process.exit(1);
}

console.log('\nDorian POS preflight: OK');

if (warnings.length > 0) {
  console.warn('\nAdvertencias:');
  warnings.forEach(item => console.warn(`- ${item}`));
}
