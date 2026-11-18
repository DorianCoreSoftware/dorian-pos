import React, {
  useMemo,
  useState,
} from 'react';

import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  canAccessAdminPanel,
  canAccessDriverOrders,
  canManageCash,
  canManageCatalog,
} from '../../Utils/permissions';

import {
  useBusiness,
} from '../../context/BusinessContext';

import {
  runtimeBranding,
} from '../../generated/runtimeClientBranding';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

export type MainTab =
  | 'pos'
  | 'driver'
  | 'attendance'
  | 'kitchen'
  | 'sales'
  | 'loyalty'
  | 'cash'
  | 'events'
  | 'ai-inbox'
  | 'feedback'
  | 'admin';

interface HeaderProps {
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  editingOrderId: string | null;
  pendingOrdersCount: number;
  newEventRequestsCount: number;
  driverOrdersCount: number;
  aiHandoffPendingCount: number;
  feedbackPendingCount: number;
  user: any;
  logout: () => void;
}

interface NavigationItem {
  tab: MainTab;
  label: string;
  icon: string;
  badge?: number;
}

function roleLabel(role: string | null | undefined): string {
  if (role === 'admin') return 'Administrador';
  if (role === 'accountant') return 'Contador';
  if (role === 'operator') return 'Operador';
  if (role === 'driver') return 'Repartidor';
  if (role === 'seller') return 'Vendedor';
  return role || 'Usuario';
}

export function GlobalHeader({
  activeTab,
  setActiveTab,
  pendingOrdersCount,
  newEventRequestsCount,
  driverOrdersCount,
  aiHandoffPendingCount,
  feedbackPendingCount,
  user,
  logout,
}: HeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const insets =
    useSafeAreaInsets();

  const {
    height:
      windowHeight,
  } =
    useWindowDimensions();

  const {
    business,
    theme,
  } = useBusiness();

  const logoUrl =
    business?.identity.logoUrl?.trim() ||
    null;

  const logoSource =
    logoUrl
      ? { uri: logoUrl }
      : runtimeBranding.headerLogoSource;

  const businessName =
    business?.identity.shortName ??
    business?.identity.businessName ??
    'Dorian POS';

  const items = useMemo<NavigationItem[]>(() => {
    if (user?.role === 'accountant') {
      return [
        { tab: 'attendance', label: 'Asistencia', icon: '🕐' },
        { tab: 'admin', label: 'Nómina', icon: '💵' },
      ];
    }

    if (user?.role === 'driver') {
      return [
        {
          tab: 'driver',
          label: 'Reparto',
          icon: '🛵',
          badge: driverOrdersCount,
        },
        { tab: 'attendance', label: 'Asistencia', icon: '🕐' },
      ];
    }

    const next: NavigationItem[] = [
      { tab: 'pos', label: 'Menú', icon: '🍔' },
    ];

    if (business?.features.kitchenEnabled) {
      next.push({
        tab: 'kitchen',
        label: 'Pedidos',
        icon: '🧾',
        badge: pendingOrdersCount,
      });
    }

    next.push({ tab: 'sales', label: 'Ventas', icon: '📊' });

    if (business?.features.loyaltyEnabled) {
      next.push({ tab: 'loyalty', label: 'Recompensas', icon: '🎁' });
    }

    if (canManageCash(user)) {
      next.push({ tab: 'cash', label: 'Caja', icon: '💵' });
    }

    if (
      business?.features.eventsEnabled &&
      canManageCatalog(user)
    ) {
      next.push({
        tab: 'events',
        label: 'Eventos',
        icon: '🎉',
        badge: newEventRequestsCount,
      });
    }

    if (
      business?.features.deliveryEnabled &&
      canAccessDriverOrders(user)
    ) {
      next.push({
        tab: 'driver',
        label: 'Reparto',
        icon: '🛵',
        badge: driverOrdersCount,
      });
    }

    next.push({ tab: 'attendance', label: 'Asistencia', icon: '🕐' });

    if (user?.role === 'admin') {
      next.push({
        tab: 'ai-inbox',
        label: 'Inbox IA',
        icon: '🤖',
        badge: aiHandoffPendingCount,
      });
      next.push({
        tab: 'feedback',
        label: 'Sugerencias',
        icon: '💬',
        badge: feedbackPendingCount,
      });
    }

    if (canAccessAdminPanel(user)) {
      next.push({ tab: 'admin', label: 'Admin', icon: '⚙️' });
    }

    return next;
  }, [
    user,
    business?.features.kitchenEnabled,
    business?.features.loyaltyEnabled,
    business?.features.eventsEnabled,
    business?.features.deliveryEnabled,
    pendingOrdersCount,
    newEventRequestsCount,
    driverOrdersCount,
    aiHandoffPendingCount,
    feedbackPendingCount,
  ]);

  const activeItem =
    items.find(item => item.tab === activeTab) ??
    items[0];

  const goTo = (tab: MainTab): void => {
    setActiveTab(tab);
    setDrawerOpen(false);
  };

  return (
    <>
      <View
        style={[
          localStyles.header,
          {
            backgroundColor: theme.surface,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => setDrawerOpen(true)}
          style={[
            localStyles.menuButton,
            {
              borderColor: theme.border,
              backgroundColor: theme.surfaceAlt,
            },
          ]}
        >
          <Text style={[localStyles.menuIcon, { color: theme.text }]}>☰</Text>
        </TouchableOpacity>

        <View style={localStyles.activeModule}>
          <Text style={[localStyles.activeModuleText, { color: theme.text }]} numberOfLines={1}>
            {activeItem?.label ?? ''}
          </Text>
          {activeItem?.badge && activeItem.badge > 0 ? (
            <View style={[localStyles.headerBadge, { backgroundColor: theme.primary }]}>
              <Text style={[localStyles.headerBadgeText, { color: theme.onPrimary }]}>
                {activeItem.badge > 99 ? '99+' : activeItem.badge}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={localStyles.headerSpacer} />

        <View style={localStyles.brandBlock}>
          {logoSource ? (
            <Image
              source={logoSource}
              style={localStyles.logo}
              resizeMode="contain"
            />
          ) : (
            <Text style={[localStyles.businessName, { color: theme.text }]} numberOfLines={1}>
              {businessName}
            </Text>
          )}
        </View>
      </View>

      <Modal
        visible={drawerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDrawerOpen(false)}
      >
        <View style={localStyles.modalRoot}>
          <TouchableOpacity
            activeOpacity={1}
            style={localStyles.backdrop}
            onPress={() => setDrawerOpen(false)}
          />

          <View
            style={[
              localStyles.drawer,
              {
                backgroundColor: theme.surface,
                borderRightColor: theme.border,
                marginTop:
                  Math.max(
                    4,
                    insets.top,
                  ),
                marginBottom:
                  Math.max(
                    24,
                    insets.bottom + 24,
                  ),
                height:
                  Math.max(
                    320,
                    windowHeight -
                      Math.max(
                        4,
                        insets.top,
                      ) -
                      Math.max(
                        24,
                        insets.bottom + 24,
                      ),
                  ),
              },
            ]}
          >
            <View style={[localStyles.drawerHeader, { borderBottomColor: theme.border }]}>
              <View style={localStyles.drawerIdentity}>
                {logoSource ? (
                  <Image source={logoSource} style={localStyles.drawerLogo} resizeMode="contain" />
                ) : null}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[localStyles.drawerBusiness, { color: theme.text }]} numberOfLines={1}>
                    {businessName}
                  </Text>
                  <Text style={[localStyles.drawerSubtitle, { color: theme.textMuted }]}>Navegación</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setDrawerOpen(false)} style={localStyles.closeButton}>
                <Text style={[localStyles.closeText, { color: theme.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={localStyles.navScroll}
              contentContainerStyle={[
                localStyles.navContent,
                {
                  paddingBottom:
                    Math.max(
                      72,
                      insets.bottom + 64,
                    ),
                },
              ]}
              showsVerticalScrollIndicator
              nestedScrollEnabled
              bounces={false}
            >
              {items.map(item => {
                const active = item.tab === activeTab;
                return (
                  <TouchableOpacity
                    key={item.tab}
                    onPress={() => goTo(item.tab)}
                    style={[
                      localStyles.navItem,
                      {
                        backgroundColor: active ? theme.surfaceAlt : 'transparent',
                        borderColor: active ? theme.primary : 'transparent',
                      },
                    ]}
                  >
                    <Text style={localStyles.navIcon}>{item.icon}</Text>
                    <Text
                      style={[
                        localStyles.navLabel,
                        { color: active ? theme.primary : theme.text },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.badge && item.badge > 0 ? (
                      <View style={[localStyles.badge, { backgroundColor: theme.primary }]}>
                        <Text style={[localStyles.badgeText, { color: theme.onPrimary }]}>
                          {item.badge > 99 ? '99+' : item.badge}
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}

              <View style={[localStyles.userCard, { borderTopColor: theme.border }]}>
                <Text style={[localStyles.userName, { color: theme.text }]} numberOfLines={1}>
                  {user?.fullName || user?.email || 'Usuario'}
                </Text>
                <Text style={[localStyles.userRole, { color: theme.textMuted }]}>
                  {roleLabel(user?.role)}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setDrawerOpen(false);
                    logout();
                  }}
                  style={[localStyles.logoutButton, { borderColor: theme.primary }]}
                >
                  <Text style={[localStyles.logoutText, { color: theme.primary }]}>Cerrar sesión</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const localStyles = StyleSheet.create({
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: { fontSize: 23, fontWeight: '900' },
  brandBlock: { minWidth: 76, alignItems: 'flex-end', justifyContent: 'center' },
  logo: { width: 76, height: 44 },
  businessName: { fontSize: 18, fontWeight: '900' },
  activeModule: { minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 8, maxWidth: '42%' },
  activeModuleText: { fontSize: 14, fontWeight: '900' },
  headerSpacer: { flex: 1 },
  headerBadge: { minWidth: 24, height: 24, paddingHorizontal: 6, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerBadgeText: { fontSize: 11, fontWeight: '900' },
  modalRoot: { flex: 1, flexDirection: 'row' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.62)' },
  drawer: { width: '82%', maxWidth: 360, alignSelf: 'flex-start', borderRightWidth: 1, overflow: 'hidden' },
  drawerHeader: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, borderBottomWidth: 1 },
  drawerIdentity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  drawerLogo: { width: 58, height: 38 },
  drawerBusiness: { fontSize: 16, fontWeight: '900' },
  drawerSubtitle: { marginTop: 2, fontSize: 11, fontWeight: '700' },
  closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 18, fontWeight: '900' },
  navScroll: { flex: 1, minHeight: 0 },
  navContent: { paddingHorizontal: 12, paddingTop: 12, gap: 6 },
  navItem: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, borderWidth: 1, borderRadius: 11 },
  navIcon: { width: 27, textAlign: 'center', fontSize: 18 },
  navLabel: { flex: 1, fontSize: 14, fontWeight: '900' },
  badge: { minWidth: 24, height: 24, paddingHorizontal: 6, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 11, fontWeight: '900' },
  userCard: { borderTopWidth: 1, marginTop: 10, paddingHorizontal: 4, paddingTop: 16, paddingBottom: 24 },
  userName: { fontSize: 14, fontWeight: '900' },
  userRole: { marginTop: 3, fontSize: 12, fontWeight: '700' },
  logoutButton: { minHeight: 42, marginTop: 12, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoutText: { fontSize: 13, fontWeight: '900' },
});
