import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { styles } from '../../../App.styles';

interface HeaderProps {
  activeTab: 'pos' | 'kitchen';
  setActiveTab: (tab: 'pos' | 'kitchen') => void;
  editingOrderId: string | null;
  pendingOrdersCount: number;
  user: any;
  logout: () => void;
}

export function GlobalHeader({ activeTab, setActiveTab, editingOrderId, pendingOrdersCount, user, logout }: HeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerBrandContainer}>
        <Image 
      source={require('../../../assets/OnlyBurgerKong.png')} 
      style={styles.headerLogo} 
      resizeMode="contain" 
    />
    <Image 
      source={require('../../../assets/logo.png')} 
      style={styles.headerLogoLetters} 
      resizeMode="contain" 
    />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tabButton, activeTab === 'pos' && styles.tabActiveButton]} onPress={() => setActiveTab('pos')}>
          <Text style={[styles.tabText, activeTab === 'pos' && styles.tabActiveText]}>
            MENÚ {editingOrderId ? '⚠️ (Modificando)' : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tabButton, activeTab === 'kitchen' && styles.tabActiveButton]} onPress={() => setActiveTab('kitchen')}>
          <Text style={[styles.tabText, activeTab === 'kitchen' && styles.tabActiveText]}>
            PEDIDOS ({pendingOrdersCount})
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.userContainer}>
        <Text style={styles.userName}>{user?.fullName} ({user?.role === 'admin' ? 'Admin' : 'Caja'})</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}