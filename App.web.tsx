import WebApp from './src/web/WebApp';

import {
  BusinessProvider,
} from './src/context/BusinessContext';

export default function AppWeb() {
  return (
    <BusinessProvider>
      <WebApp />
    </BusinessProvider>
  );
}