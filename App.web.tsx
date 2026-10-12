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

  const pathname =
    window.location.pathname
      .toLowerCase();

  const isControlPanelPath =
    pathname ===
      '/control-panel' ||
    pathname.startsWith(
      '/control-panel/',
    );

  return isControlPanelPath;
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
