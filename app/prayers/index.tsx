import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/lib/auth-context';
import { PrayerService, PrayerRequest } from '@/lib/prayer-service';
import { useColors } from '@/hooks/use-colors';

type TabType = 'active' | 'answered';

export default function PrayersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [activePrayers, setActivePrayers] = useState<PrayerRequest[]>([]);
  const [answeredPrayers, setAnsweredPrayers] = useState<PrayerRequest[]>([]);
  const [prayedIds, setPrayedIds] = useState<Set<number>>(new Set());

  const loadPrayers = useCallback(async () => {
    if (!user) return;

    try {
      const [active, answered] = await Promise.all([
        PrayerService.getActivePrayerRequests(user.id),
        PrayerService.getAnsweredPrayerRequests(user.id),
      ]);
      setActivePrayers(active);
      setAnsweredPrayers(answered);

      // Verificar quais já orou
      const prayed = new Set<number>();
      for (const prayer of [...active, ...answered]) {
        const hasPrayed = await PrayerService.hasPrayed(prayer.id, user.id);
        if (hasPrayed) prayed.add(prayer.id);
      }
      setPrayedIds(prayed);
    } catch (error) {
      console.error('Error loading prayers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadPrayers();
  }, [loadPrayers]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadPrayers();
  };

  const handlePrayFor = async (prayer: PrayerRequest) => {
    if (!user || prayedIds.has(prayer.id)) return;

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const success = await PrayerService.prayFor(prayer.id, user.id);
    if (success) {
      setPrayedIds(prev => new Set([...prev, prayer.id]));
      // Atualizar contador local
      setActivePrayers(prev =>
        prev.map(p =>
          p.id === prayer.id ? { ...p, prayer_count: p.prayer_count + 1 } : p
        )
      );
    }
  };

  const handleMarkAnswered = (prayer: PrayerRequest) => {
    Alert.alert(
      'Marcar como Respondido',
      'Tem certeza que deseja marcar este pedido como respondido?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            const success = await PrayerService.markAsAnswered(prayer.id);
            if (success) {
              loadPrayers();
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  };

  const renderPrayer = ({ item }: { item: PrayerRequest }) => {
    const hasPrayed = prayedIds.has(item.id);

    return (
      <View className="mx-4 mb-4 bg-surface rounded-2xl p-4 border border-border">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center flex-1">
            <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center mr-3">
              <Text className="text-lg font-bold text-primary">
                {item.author_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                {item.author_name}
              </Text>
              <Text className="text-xs text-muted">
                {formatDate(item.created_at)}
              </Text>
            </View>
          </View>
          {item.is_answered && (
            <View className="bg-success/20 px-2 py-1 rounded-full">
              <Text className="text-xs font-medium text-success">Respondido</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <Text className="text-base font-semibold text-foreground mb-1">
          {item.title}
        </Text>
        <Text className="text-sm text-muted mb-4">
          {item.description}
        </Text>

        {/* Actions */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <IconSymbol name="heart.fill" size={16} color={colors.primary} />
            <Text className="text-sm text-muted ml-1">
              {item.prayer_count} {item.prayer_count === 1 ? 'oração' : 'orações'}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            {!item.is_answered && (
              <>
                <TouchableOpacity
                  className={`flex-row items-center px-4 py-2 rounded-xl ${
                    hasPrayed ? 'bg-primary/20' : 'bg-primary'
                  }`}
                  onPress={() => handlePrayFor(item)}
                  disabled={hasPrayed}
                >
                  <IconSymbol
                    name="heart.fill"
                    size={16}
                    color={hasPrayed ? colors.primary : 'white'}
                  />
                  <Text
                    className={`ml-1 font-medium ${
                      hasPrayed ? 'text-primary' : 'text-white'
                    }`}
                  >
                    {hasPrayed ? 'Orei' : 'Orar'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="px-3 py-2 rounded-xl bg-success/20"
                  onPress={() => handleMarkAnswered(item)}
                >
                  <IconSymbol name="checkmark" size={16} color={colors.success} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    );
  };

  const currentPrayers = activeTab === 'active' ? activePrayers : answeredPrayers;

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-foreground">Pedidos de Oração</Text>
        <TouchableOpacity onPress={() => router.push('/prayers/create' as any)}>
          <IconSymbol name="plus.circle.fill" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View className="flex-row px-4 py-3 border-b border-border">
        <TouchableOpacity
          className={`flex-1 py-2 rounded-xl mr-2 ${
            activeTab === 'active' ? 'bg-primary' : 'bg-surface'
          }`}
          onPress={() => setActiveTab('active')}
        >
          <Text
            className={`text-center font-medium ${
              activeTab === 'active' ? 'text-white' : 'text-muted'
            }`}
          >
            Ativos ({activePrayers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-2 rounded-xl ml-2 ${
            activeTab === 'answered' ? 'bg-primary' : 'bg-surface'
          }`}
          onPress={() => setActiveTab('answered')}
        >
          <Text
            className={`text-center font-medium ${
              activeTab === 'answered' ? 'text-white' : 'text-muted'
            }`}
          >
            Respondidos ({answeredPrayers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {currentPrayers.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
            <IconSymbol name="heart.fill" size={40} color={colors.primary} />
          </View>
          <Text className="text-lg font-medium text-foreground text-center mb-2">
            {activeTab === 'active'
              ? 'Nenhum pedido ativo'
              : 'Nenhum pedido respondido'}
          </Text>
          <Text className="text-muted text-center mb-6">
            {activeTab === 'active'
              ? 'Compartilhe seus pedidos de oração com a célula'
              : 'Os pedidos respondidos aparecerão aqui'}
          </Text>
          {activeTab === 'active' && (
            <TouchableOpacity
              className="bg-primary px-6 py-3 rounded-xl"
              onPress={() => router.push('/prayers/create' as any)}
            >
              <Text className="text-white font-medium">Novo Pedido</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={currentPrayers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPrayer}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </ScreenContainer>
  );
}
