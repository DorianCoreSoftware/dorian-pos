const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const iconSource = (process.env.DORIAN_APP_ICON || '').trim();
const appName = (process.env.DORIAN_APP_NAME || '').trim();

if (!iconSource) {
  console.error('DORIAN_APP_ICON no está definido.');
  process.exit(1);
}

if (!appName) {
  console.error('DORIAN_APP_NAME no está definido.');
  process.exit(1);
}

const root = process.cwd();
const sourcePath = path.resolve(root, iconSource);

if (!fs.existsSync(sourcePath)) {
  console.error(`No existe el icono configurado: ${sourcePath}`);
  process.exit(1);
}

const resRoot = path.join(
  root,
  'android',
  'app',
  'src',
  'main',
  'res',
);

const densities = [
  {
    folder: 'mipmap-mdpi',
    launcher: 48,
    foreground: 108,
  },
  {
    folder: 'mipmap-hdpi',
    launcher: 72,
    foreground: 162,
  },
  {
    folder: 'mipmap-xhdpi',
    launcher: 96,
    foreground: 216,
  },
  {
    folder: 'mipmap-xxhdpi',
    launcher: 144,
    foreground: 324,
  },
  {
    folder: 'mipmap-xxxhdpi',
    launcher: 192,
    foreground: 432,
  },
];

async function renderIcon(destination, size) {
  await sharp(sourcePath)
    .resize(size, size, {
      fit: 'contain',
      background: {
        r: 0,
        g: 0,
        b: 0,
        alpha: 0,
      },
    })
    .webp({
      quality: 100,
      lossless: true,
    })
    .toFile(destination);
}

async function main() {
  for (const density of densities) {
    const dir = path.join(
      resRoot,
      density.folder,
    );

    fs.mkdirSync(
      dir,
      {
        recursive: true,
      },
    );

    await renderIcon(
      path.join(
        dir,
        'ic_launcher.webp',
      ),
      density.launcher,
    );

    await renderIcon(
      path.join(
        dir,
        'ic_launcher_round.webp',
      ),
      density.launcher,
    );

    await renderIcon(
      path.join(
        dir,
        'ic_launcher_foreground.webp',
      ),
      density.foreground,
    );
  }

  console.log(
    [
      `Branding Android preparado para: ${appName}`,
      `Icono source: ${sourcePath}`,
      'Recursos launcher actualizados:',
      '  ic_launcher.webp',
      '  ic_launcher_round.webp',
      '  ic_launcher_foreground.webp',
    ].join('\n'),
  );
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
