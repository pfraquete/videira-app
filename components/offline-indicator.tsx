import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { IconSymbol } from './ui/icon-symbol';
import { useOffline } from '@/hooks/use-offline';
import { useColors } from '@/hooks/use-colors';

interface OfflineIndicatorProps {
  showLastSync?: boolean;
}

/**
 * Componente que exibe um indicador quando o app está offline
 */
export function OfflineIndicator({ showLastSync = true }: OfflineIndicatorProps) {
  const { isOffline, lastSyncFormatted } = useOffline();
  const colors = useColors();
  const slideAnim = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOffline ? 0 : -60,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOffline, slideAnim]);

  if (!isOffline) return null;

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
      }}
    >
      <View 
        className="bg-warning/90 px-4 py-3 flex-row items-center justify-center"
        style={{ paddingTop: 50 }} // Account for status bar
      >
        <IconSymbol name="wifi.slash" size={18} color="#000000" />
        <View className="ml-3 flex-1">
          <Text className="text-black font-medium">Modo Offline</Text>
          {showLastSync && (
            <Text className="text-black/70 text-xs">
              Última sincronização: {lastSyncFormatted}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

/**
 * Banner compacto para exibir em listas ou telas específicas
 */
export function OfflineBanner() {
  const { isOffline, lastSyncFormatted } = useOffline();
  const colors = useColors();

  if (!isOffline) return null;

  return (
    <View className="bg-warning/20 rounded-xl p-3 flex-row items-center mb-4">
      <IconSymbol name="wifi.slash" size={20} color={colors.warning} />
      <View className="ml-3 flex-1">
        <Text className="text-foreground font-medium text-sm">Você está offline</Text>
        <Text className="text-muted text-xs">
          Mostrando dados em cache. {lastSyncFormatted}
        </Text>
      </View>
    </View>
  );
}

/**
 * Badge pequeno para indicar modo offline em headers
 */
export function OfflineBadge() {
  const { isOffline } = useOffline();
  const colors = useColors();

  if (!isOffline) return null;

  return (
    <View className="bg-warning rounded-full px-2 py-1 flex-row items-center">
      <IconSymbol name="wifi.slash" size={12} color="#000000" />
      <Text className="text-black text-xs font-medium ml-1">Offline</Text>
    </View>
  );
}
