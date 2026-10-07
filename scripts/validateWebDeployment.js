const required = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
];

const optional = [
  'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY',
];

const missing = required.filter(
  (key) => !String(process.env[key] ?? '').trim(),
);

if (missing.length > 0) {
  console.error(
    '\nDorian POS web deployment: faltan variables requeridas:\n',
  );

  for (const key of missing) {
    console.error(`- ${key}`);
  }

  console.error(
    '\nConfigúralas en Vercel Project Settings > Environment Variables antes de desplegar.\n',
  );

  process.exit(1);
}

const url =
  String(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
  ).trim();

try {
  const parsed = new URL(url);

  if (
    parsed.protocol !== 'https:'
  ) {
    throw new Error(
      'Supabase URL must use https',
    );
  }
} catch {
  console.error(
    'Dorian POS web deployment: EXPO_PUBLIC_SUPABASE_URL no es una URL HTTPS válida.',
  );

  process.exit(1);
}

for (const key of optional) {
  if (
    !String(
      process.env[key] ?? '',
    ).trim()
  ) {
    console.warn(
      `Advertencia: ${key} no está configurada. Las funciones que dependan de ella pueden quedar limitadas.`,
    );
  }
}

console.log(
  'Dorian POS web deployment preflight: OK',
);
