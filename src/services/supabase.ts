import 'react-native-url-polyfill/auto';

import {
  createClient,
} from '@supabase/supabase-js';

import 'expo-sqlite/localStorage/install';

const supabaseUrl =
  process.env
    .EXPO_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  process.env
    .EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (
  !supabaseUrl ||
  !supabaseAnonKey
) {
  console.warn(
    '⚠️ ¡Faltan las variables de entorno de Supabase en tu archivo .env!',
  );
}

export const supabase =
  createClient(
    supabaseUrl ?? '',
    supabaseAnonKey ?? '',
    {
      auth: {
        storage:
          localStorage,

        autoRefreshToken:
          true,

        persistSession:
          true,

        detectSessionInUrl:
          false,
      },
    },
  );