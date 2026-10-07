import WebApp from './src/web/WebApp';

import WebAdminApp from './src/web/admin/WebAdminApp';

import {
  AuthProvider,
} from './src/context/AuthContext';

import {
  BusinessProvider,
} from './src/context/BusinessContext';

function shouldUseAdminWeb(): boolean {
  if (
    typeof window ===
    'undefined'
  ) {
    return false;
  }

  const hostname =
    window.location.hostname
      .toLowerCase();

  const pathname =
    window.location.pathname
      .toLowerCase();

  const isAdminHost =
    hostname ===
      'app.doriancore.com';

  const isLocalDevelopment =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0';

  const isVercelPreview =
    hostname.endsWith(
      '.vercel.app',
    );

  const isAdminPath =
    pathname ===
      '/admin' ||
    pathname.startsWith(
      '/admin/',
    );

  return (
    isAdminHost ||
    (
      isAdminPath &&
      (
        isLocalDevelopment ||
        isVercelPreview
      )
    )
  );
}

export default function AppWeb() {
  const adminWeb =
    shouldUseAdminWeb();

  return (
    <BusinessProvider>
      {adminWeb ? (
        <AuthProvider>
          <WebAdminApp />
        </AuthProvider>
      ) : (
        <WebApp />
      )}
    </BusinessProvider>
  );
}
