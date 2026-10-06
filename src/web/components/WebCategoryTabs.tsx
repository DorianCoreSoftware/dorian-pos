import React from 'react';

import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import {
  Category,
} from '../../types';

import styles, {
  setBrandPrimaryColor,
} from './WebCategoryTabs.styles';

import {
  useBusiness,
} from '../../context/BusinessContext';

interface WebCategoryTabsProps {
  categories: Category[];

  selectedCategoryId:
    string | null;

  onSelectCategory:
    (categoryId: string) => void;
}

export default function WebCategoryTabs({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: WebCategoryTabsProps) {
  const {
    theme,
  } = useBusiness();

  setBrandPrimaryColor(
    theme.primary,
  );

  return (
    <View
      style={
        styles.wrapper
      }
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        style={
          styles.scroll
        }
        contentContainerStyle={
          styles.content
        }
      >
        {categories.map(
          (category) => {
            const selected =
              category.id ===
              selectedCategoryId;

            return (
              <Pressable
                key={
                  category.id
                }
                onPress={() =>
                  onSelectCategory(
                    category.id,
                  )
                }
                style={({ pressed }) => [
                  styles.tab,

                  selected &&
                    styles.tabSelected,

                  pressed &&
                    styles.tabPressed,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,

                    selected &&
                      styles.tabTextSelected,
                  ]}
                >
                  {category.name}
                </Text>
              </Pressable>
            );
          },
        )}
      </ScrollView>
    </View>
  );
}