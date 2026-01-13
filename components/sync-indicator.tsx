import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useSyncStatus } from '@/hooks/use-sync-status';

interface SyncIndicatorProps {
  compact?: boolean;
}

export function SyncIndicator({ compact = false }: SyncIndicatorProps) {
  const colors = useColors();
  const { status, message, pendingCount, isSyncing, forceSync } = useSyncStatus();

  const handlePress = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await forceSync();
  };

  // Don't show if no pending operations and idle
  if (status === 'idle' && pendingCount === 0) {
    return null;
  }

  const getStatusColor = () => {
    switch (status) {
      case 'syncing':
        return colors.primary;
      case 'success':
        return '#22c55e';
      case 'error':
        return '#ef4444';
      default:
        return colors.muted;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'syncing':
        return null; // Will show ActivityIndicator
      case 'success':
        return 'checkmark.circle.fill';
      case 'error':
        return 'exclamationmark.triangle.fill';
      default:
        return 'arrow.clockwise';
    }
  };

  if (compact) {
    return (
      <TouchableOpacity
        className="flex-row items-center px-3 py-1.5 rounded-full"
        style={{ backgroundColor: getStatusColor() + '20' }}
        onPress={handlePress}
        disabled={isSyncing}
      >
        {isSyncing ? (
          <ActivityIndicator size="small" color={getStatusColor()} />
        ) : (
          <IconSymbol name={getStatusIcon() as any} size={16} color={getStatusColor()} />
        )}
        {pendingCount > 0 && (
          <Text
            className="ml-1.5 text-xs font-medium"
            style={{ color: getStatusColor() }}
          >
            {pendingCount}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      className="flex-row items-center p-3 mx-4 my-2 rounded-xl"
      style={{ backgroundColor: getStatusColor() + '15' }}
      onPress={handlePress}
      disabled={isSyncing}
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center"
        style={{ backgroundColor: getStatusColor() + '20' }}
      >
        {isSyncing ? (
          <ActivityIndicator size="small" color={getStatusColor()} />
        ) : (
          <IconSymbol name={getStatusIcon() as any} size={20} color={getStatusColor()} />
        )}
      </View>
      <View className="flex-1 ml-3">
        <Text className="text-foreground font-medium">
          {isSyncing
            ? 'Sincronizando...'
            : status === 'error'
            ? 'Erro na sincronização'
            : status === 'success'
            ? 'Sincronizado'
            : `${pendingCount} pendente${pendingCount > 1 ? 's' : ''}`}
        </Text>
        {message && (
          <Text className="text-muted text-sm">{message}</Text>
        )}
        {!isSyncing && pendingCount > 0 && (
          <Text className="text-muted text-sm">Toque para sincronizar</Text>
        )}
      </View>
      {!isSyncing && pendingCount > 0 && (
        <View
          className="px-3 py-1.5 rounded-full"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-white text-xs font-medium">Sincronizar</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

/**
 * Badge compacto para mostrar na barra de navegação
 */
export function SyncBadge() {
  const { pendingCount, isSyncing } = useSyncStatus();

  if (pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <View className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-primary items-center justify-center px-1">
      {isSyncing ? (
        <ActivityIndicator size={10} color="white" />
      ) : (
        <Text className="text-white text-[10px] font-bold">{pendingCount}</Text>
      )}
    </View>
  );
}
