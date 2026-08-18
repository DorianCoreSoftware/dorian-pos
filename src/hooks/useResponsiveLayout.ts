import {
  useWindowDimensions,
} from 'react-native';

export function useResponsiveLayout() {
  const {
    width,
    height,
  } = useWindowDimensions();

  const isPhone =
    width < 700;

  const isTablet =
    width >= 700;

  return {
    width,
    height,
    isPhone,
    isTablet,
  };
}