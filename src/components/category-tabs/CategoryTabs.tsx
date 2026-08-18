import React, { useRef } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Text, View, LayoutChangeEvent } from 'react-native';
import { Category } from '../../types';
import { styles } from './CategoryTabs.styles';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

interface CategoryTabsProps {
  categorias: Category[];
  categoriaSeleccionada: string;
  onSelectCategoria: (id: string) => void;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categorias,
  categoriaSeleccionada,
  onSelectCategoria,
}) => {
  const {
    isPhone,
  } = useResponsiveLayout();

  const scrollRef =
    useRef<ScrollView | null>(
      null,
    );

  const categoryLayouts =
    useRef<
      Record<
        string,
        {
          x: number;
          width: number;
        }
      >
    >({});

  const containerWidth =
    useRef(0);

  const handleContainerLayout = (
    event: LayoutChangeEvent,
  ): void => {
    containerWidth.current =
      event.nativeEvent.layout.width;
  };

  const handleCategoryLayout = (
    id: string,
    event: LayoutChangeEvent,
  ): void => {
    const {
      x,
      width,
    } =
      event.nativeEvent.layout;

    categoryLayouts.current[
      id
    ] = {
      x,
      width,
    };
  };

  const scrollToCategory = (
    id: string,
  ): void => {
    const layout =
      categoryLayouts.current[
      id
      ];

    if (!layout) {
      return;
    }

    const targetX =
      Math.max(
        0,
        layout.x -
        containerWidth.current /
        2 +
        layout.width / 2,
      );

    scrollRef.current?.scrollTo({
      x: targetX,
      animated: true,
    });
  };

  const handleSelectCategory = (
    id: string,
  ): void => {
    onSelectCategoria(
      id,
    );

    requestAnimationFrame(
      () => {
        scrollToCategory(
          id,
        );
      },
    );
  };
  return (
    <View
      style={[
        styles.container,

        isPhone &&
        styles.containerPhone,
      ]}
      onLayout={
        handleContainerLayout
      }
    >
      <ScrollView
        ref={
          scrollRef
        }
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={[
          styles.categoriesBar,

          isPhone &&
          styles.categoriesBarPhone,
        ]}
      >
        {categorias.map(
          (cat) => {
            const activa =
              cat.id ===
              categoriaSeleccionada;

            return (
              <TouchableOpacity
                key={
                  cat.id
                }
                onLayout={(
                  event,
                ) =>
                  handleCategoryLayout(
                    cat.id,
                    event,
                  )
                }
                style={[
                  styles.categoryButton,

                  isPhone &&
                  styles.categoryButtonPhone,

                  activa &&
                  styles.categoryButtonActive,
                ]}
                onPress={() =>
                  handleSelectCategory(
                    cat.id,
                  )
                }
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.categoryButtonText,

                    isPhone &&
                    styles.categoryButtonTextPhone,

                    activa &&
                    styles.categoryButtonTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          },
        )}
      </ScrollView>
    </View>
  );
};