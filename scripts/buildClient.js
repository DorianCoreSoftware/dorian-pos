const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === '--client') result.client = argv[++i];
    if (item === '--env') result.env = argv[++i];
  }
  return result;
}

function run(command, args, env, options = {}) {
  const result = spawnSync(command, args, {
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    shell: process.platform === 'win32',
    env,
    encoding: options.capture ? 'utf8' : undefined,
  });

  if (result.status !== 0) {
    if (options.capture) {
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
    }
    process.exit(result.status || 1);
  }

  return result;
}

function writeBuildTarget(root, client, target, clientId, buildEnv) {
  const generatedDir = path.join(root, 'src', 'generated');
  fs.mkdirSync(generatedDir, { recursive: true });

  const data = {
    clientId,
    buildEnv,
    appName: target.appName,
    androidApplicationId: target.androidPackage,
    icon: target.icon,
    splashImage: target.splash,
    slug: client.expoSlug,
    projectId: client.easProjectId,
  };

  fs.writeFileSync(
    path.join(generatedDir, 'buildTarget.json'),
    JSON.stringify(data, null, 2) + '\n',
    'utf8',
  );
}

function validateEasEnvironment(root, client, target, buildEnv, env) {
  const easEnvironment = target.easEnvironment || buildEnv;
  const result = run(
    'npx',
    ['eas-cli', 'env:list', '--environment', easEnvironment],
    env,
    { capture: true },
  );

  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  const urlLine = output
    .split(/\r?\n/)
    .find(line => line.trim().startsWith('EXPO_PUBLIC_SUPABASE_URL='));
  const anonLine = output
    .split(/\r?\n/)
    .find(line => line.trim().startsWith('EXPO_PUBLIC_SUPABASE_ANON_KEY='));

  if (!urlLine) {
    throw new Error(
      `EAS ${easEnvironment} no contiene EXPO_PUBLIC_SUPABASE_URL.`,
    );
  }

  const actualUrl = urlLine.split('=').slice(1).join('=').trim();
  if (actualUrl !== target.supabaseUrl) {
    throw new Error(
      `EAS ${easEnvironment} apunta a ${actualUrl}, pero ${client.businessName} ${buildEnv.toUpperCase()} debe apuntar a ${target.supabaseUrl}.`,
    );
  }

  if (!anonLine) {
    throw new Error(
      `EAS ${easEnvironment} no contiene EXPO_PUBLIC_SUPABASE_ANON_KEY.`,
    );
  }

  console.log(`EAS environment validado: ${easEnvironment}`);
}

const args = parseArgs(process.argv.slice(2));
const clientId = args.client;
const buildEnv = args.env;

if (!clientId || !['development', 'production'].includes(buildEnv)) {
  console.error('Uso: npm run apk -- --client <cliente> --env development|production');
  process.exit(1);
}

const root = process.cwd();
const configPath = path.join(root, 'clients', clientId, 'client.config.json');
if (!fs.existsSync(configPath)) {
  console.error(`No existe configuración para el cliente: ${clientId}`);
  process.exit(1);
}

const client = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const target = client[buildEnv];
const profile = buildEnv === 'production' ? 'production-apk' : 'development-apk';

if (!target) {
  console.error(`El cliente ${clientId} no tiene configuración ${buildEnv}.`);
  process.exit(1);
}

writeBuildTarget(root, client, target, clientId, buildEnv);

const env = {
  ...process.env,
  DORIAN_CLIENT_ID: clientId,
  DORIAN_BUILD_ENV: buildEnv,
  DORIAN_APP_NAME: target.appName,
  DORIAN_ANDROID_APPLICATION_ID: target.androidPackage,
  DORIAN_APP_ICON: target.icon,
  DORIAN_SPLASH_IMAGE: target.splash,
  DORIAN_EXPO_SLUG: client.expoSlug,
  DORIAN_EAS_PROJECT_ID: client.easProjectId,
};

console.log('========================================');
console.log('DORIANCORE CLIENT BUILD');
console.log('========================================');
console.log(`Cliente:       ${client.businessName}`);
console.log(`Environment:   ${buildEnv.toUpperCase()}`);
console.log(`App name:      ${target.appName}`);
console.log(`Package:       ${target.androidPackage}`);
console.log(`Supabase ref:  ${target.supabaseProjectRef}`);
console.log(`Supabase URL:  ${target.supabaseUrl}`);
console.log(`EAS project:   ${client.easProjectId}`);
console.log(`Icon:          ${target.icon}`);
console.log(`Profile:       ${profile}`);
console.log('========================================');

run('node', ['scripts/setupClientBranding.js'], env);
run('node', ['scripts/generateRuntimeBranding.js'], env);
run('node', ['scripts/applyWhiteLabelPatches.js'], env);
validateEasEnvironment(root, client, target, buildEnv, env);

console.log('BUILD VALIDATED');
run('npx', ['eas-cli', 'build', '--platform', 'android', '--profile', profile], env);
