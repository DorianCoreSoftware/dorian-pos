import React, {
  useEffect,
  useState,
} from 'react';

import {
  StatusBar,
  View,
} from 'react-native';

import WebMenuScreen from './screens/WebMenuScreen';
import WebLoyaltyScreen from './screens/WebLoyaltyScreen';

import styles from './WebApp.styles';

type WebRoute =
  | 'menu'
  | 'loyalty';

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

  return 'menu';
}

export default function WebApp() {
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
      style={
        styles.safeArea
      }
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0F0F0F"
      />

      <View
        style={
          styles.container
        }
      >
        {
          route ===
            'loyalty'
            ? (
              <WebLoyaltyScreen
                onBack={
                  goToMenu
                }
              />
            )
            : (
              <WebMenuScreen
                onRewardsPress={
                  goToRewards
                }
              />
            )
        }
      </View>
    </View>
  );
}