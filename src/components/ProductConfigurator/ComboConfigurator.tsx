import React from 'react';

import {
  Text,
  View,
} from 'react-native';

import {
  Product,
} from '../../types';

interface ComboConfiguratorProps {
  product: Product;
}

export const ComboConfigurator: React.FC<
  ComboConfiguratorProps
> = ({
  product,
}) => {
  return (
    <View
      style={{
        paddingVertical: 24,
      }}
    >
      <Text
        style={{
          color: '#FFFFFF',
          textAlign: 'center',
          fontSize: 16,
        }}
      >
        Configuración de {product.name}
      </Text>

      <Text
        style={{
          color: '#AAAAAA',
          textAlign: 'center',
          marginTop: 8,
        }}
      >
        Próximamente se mostrarán aquí los componentes del combo.
      </Text>
    </View>
  );
};