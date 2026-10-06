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

  return (
    hostname ===
      'app.doriancore.com' ||
    hostname.startsWith(
      'app.',
    ) ||
    pathname ===
      '/admin' ||
    pathname.startsWith(
      '/admin/',
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
