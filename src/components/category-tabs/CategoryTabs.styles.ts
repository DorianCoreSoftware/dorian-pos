import { DEFAULT_BRAND_PRIMARY } from '../../theme/brandStyles';

import {
  StyleSheet,
} from 'react-native';

const createStyles = (
  primaryColor: string,
) =>
  StyleSheet.create({
    container: {
      height: 70,
    },

    containerPhone: {
      height: 54,
    },

    categoriesBar: {
      paddingHorizontal: 16,
      alignItems: 'center',
      gap: 12,
    },

    categoriesBarPhone: {
      paddingHorizontal: 10,
      gap: 8,
    },

    categoryButton: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 25,
      backgroundColor: '#1E1E1E',
      borderWidth: 1,
      borderColor: '#333',
    },

    categoryButtonPhone: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 20,
      minHeight: 38,
      justifyContent: 'center',
    },

    categoryButtonActive: {
      backgroundColor: primaryColor,
      borderColor: primaryColor,
    },

    categoryButtonText: {
      color: '#AAA',
      fontWeight: '600',
      fontSize: 16,
    },

    categoryButtonTextPhone: {
      fontSize: 13,
    },

    categoryButtonTextActive: {
      color: '#000',
      fontWeight: 'bold',
    },
  });

export let styles =
  createStyles(
    DEFAULT_BRAND_PRIMARY,
  );

export function setBrandPrimaryColor(
  primaryColor: string,
): void {
  styles =
    createStyles(
      primaryColor,
    );
}
