import React, {
  useEffect,
  useState,
} from 'react';

import {
  StatusBar,
  View,
} from 'react-native';

import styles from './WebApp.styles';
import { useBusiness } from '../context/BusinessContext';
import WebMenuScreen from './screens/web-menu-screen/WebMenuScreen';
import WebAccountScreen from './screens/web-account-screen/WebAccountScreen';
import WebLoyaltyScreen from './screens/web-loyalty-screen/WebLoyaltyScreen';
import WebEventsScreen from './screens/web-events-screen/WebEventsScreen';
import WebEventQuoteScreen from './screens/web-event-quote-screen/WebEventQuoteScreen';
import WebCookieNotice from './components/web-cookie-notice/WebCookieNotice';

type WebRoute =
  | 'menu'
  | 'loyalty'
  | 'events'
  | 'eventQuote'
  | 'account';

function getCurrentRoute():
  WebRoute {
  if (
    typeof window ===
    'undefined'
  ) {
    return 'menu';
  }

  if (
    window.location.pathname.startsWith(
      '/recompensas',
    )
  ) {
    return 'loyalty';
  }

  if (
    window.location.pathname.startsWith(
      '/eventos/cotizacion/',
    )
  ) {
    return 'eventQuote';
  }

  if (
    window.location.pathname ===
    '/eventos' ||
    window.location.pathname.startsWith(
      '/eventos/',
    )
  ) {
    return 'events';
  }

  if (
    window.location.pathname ===
    '/cuenta' ||
    window.location.pathname.startsWith(
      '/cuenta/',
    )
  ) {
    return 'account';
  }

  return 'menu';
}

function getEventQuoteToken(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const prefix = '/eventos/cotizacion/';
  const path = window.location.pathname;
  if (!path.startsWith(prefix)) {
    return '';
  }

  return decodeURIComponent(path.slice(prefix.length).split('/')[0] ?? '');
}

export default function WebApp() {
  const {
    theme,
  } = useBusiness();
  const [
    route,
    setRoute,
  ] =
    useState<WebRoute>(
      getCurrentRoute(),
    );

  useEffect(
    () => {
      if (
        typeof window ===
        'undefined'
      ) {
        return;
      }

      const handlePopState =
        () => {
          setRoute(
            getCurrentRoute(),
          );
        };

      window.addEventListener(
        'popstate',
        handlePopState,
      );

      return () => {
        window.removeEventListener(
          'popstate',
          handlePopState,
        );
      };
    },
    [],
  );

  const goToRewards =
    (): void => {
      if (
        typeof window !==
        'undefined'
      ) {
        window.history.pushState(
          {},
          '',
          '/recompensas',
        );
      }

      setRoute(
        'loyalty',
      );
    };


  const goToEvents =
    (): void => {
      if (
        typeof window !==
        'undefined'
      ) {
        window.history.pushState(
          {},
          '',
          '/eventos',
        );
      }

      setRoute(
        'events',
      );
    };


  const goToAccount =
    (): void => {
      if (
        typeof window !==
        'undefined'
      ) {
        window.history.pushState(
          {},
          '',
          '/cuenta',
        );
      }

      setRoute(
        'account',
      );
    };

  const goToMenu =
    (): void => {
      if (
        typeof window !==
        'undefined'
      ) {
        window.history.pushState(
          {},
          '',
          '/',
        );
      }

      setRoute(
        'menu',
      );
    };

  return (
    <View
      style={[
        styles.safeArea,
        {
          backgroundColor:
            theme.background,
        },
      ]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={
          theme.background
        }
      />

      <View
        style={[
          styles.container,
          {
            backgroundColor:
              theme.background,
          },
        ]}
      >
        {
          route ===
            'eventQuote'
            ? (
              <WebEventQuoteScreen
                token={getEventQuoteToken()}
                onBack={goToMenu}
              />
            )
            : route ===
              'loyalty'
            ? (
              <WebLoyaltyScreen
                onBack={
                  goToMenu
                }
                onAccountPress={
                  goToAccount
                }
              />
            )
            : route ===
              'events'
              ? (
                <WebEventsScreen
                  onBack={
                    goToMenu
                  }
                />
              )
            : route ===
              'account'
              ? (
                <WebAccountScreen
                  onBack={
                    goToMenu
                  }
                  onRewardsPress={
                    goToRewards
                  }
                />
              )
              : (
                <WebMenuScreen
                  onRewardsPress={
                    goToRewards
                  }
                  onAccountPress={
                    goToAccount
                  }
                  onEventsPress={
                    goToEvents
                  }
                />
              )
        }
      </View>
       <WebCookieNotice />
    </View>
  );
}