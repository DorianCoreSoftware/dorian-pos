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
import WebCookieNotice from './components/web-cookie-notice/WebCookieNotice';

type WebRoute =
  | 'menu'
  | 'loyalty'
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
                />
              )
        }
      </View>
       <WebCookieNotice />
    </View>
  );
}