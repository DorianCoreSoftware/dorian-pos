const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function gitShow(spec) {
  return execFileSync('git', ['show', spec], {
    encoding: null,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function tryGitShow(spec) {
  try {
    return gitShow(spec);
  } catch {
    return null;
  }
}

function gitBlobFromHistory(filePath, preferredSpecs = []) {
  for (const spec of preferredSpecs) {
    const content = tryGitShow(spec);
    if (content) return content;
  }

  let commits = [];
  try {
    commits = execFileSync(
      'git',
      ['log', '--all', '--format=%H', '--', filePath],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    )
      .split(/\r?\n/)
      .map(value => value.trim())
      .filter(Boolean);
  } catch {
    commits = [];
  }

  for (const commit of commits) {
    const content = tryGitShow(`${commit}:${filePath}`);
    if (content) return content;
  }

  throw new Error(
    `No se pudo recuperar ${filePath} desde el historial de Git.`,
  );
}

function writeIfMissing(target, buffer) {
  if (fs.existsSync(target)) {
    console.log(`Ya existe: ${target}`);
    return;
  }

  fs.writeFileSync(target, buffer);
  console.log(`Creado: ${target}`);
}

const root = process.cwd();
const clientId = process.env.DORIAN_CLIENT_ID || 'kong-burger';

if (clientId !== 'kong-burger') {
  console.log(`Sin bootstrap histórico automático para ${clientId}.`);
  process.exit(0);
}

const clientAssets = path.join(root, 'clients', 'kong-burger', 'assets');
const generated = path.join(root, 'src', 'generated');
ensureDir(clientAssets);
ensureDir(generated);

writeIfMissing(
  path.join(clientAssets, 'app-icon.png'),
  gitBlobFromHistory('assets/BurgerKongWOFondo.png', [
    '1f9e0ec:assets/BurgerKongWOFondo.png',
  ]),
);

writeIfMissing(
  path.join(clientAssets, 'header-logo.png'),
  gitBlobFromHistory('assets/BurgerKongLetters.png'),
);

const printerAssetsPath = path.join(generated, 'printerAssets.ts');
writeIfMissing(
  printerAssetsPath,
  gitBlobFromHistory('src/generated/printerAssets.ts', [
    'e3dc8db:src/generated/printerAssets.ts',
  ]),
);

console.log('Branding histórico de Burger Kong listo.');
