import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { EngagementService, MemberEngagement } from '@/lib/engagement-service';

export default function EngagementScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const [ranking, setRanking] = useState<MemberEngagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cellId = (user as any)?.profile?.cell_id || (user as any)?.cell_id;

  const loadRanking = useCallback(async () => {
    if (!cellId) return;
    
    try {
      const data = await EngagementService.getCellRanking(cellId);
      setRanking(data);
    } catch (error) {
      console.error('Error loading ranking:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cellId]);

  useEffect(() => {
    loadRanking();
  }, [loadRanking]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRanking();
  };

  const getLevelColor = (level: number) => {
    const levelColors = [
      '#9CA3AF', // 1 - Semente
      '#84CC16', // 2 - Broto
      '#22C55E', // 3 - Planta
      '#10B981', // 4 - Árvore
      '#8B5CF6', // 5 - Videira
      '#A855F7', // 6 - Videira Frutífera
      '#EC4899', // 7 - Videira Madura
    ];
    return levelColors[level - 1] || levelColors[0];
  };

  const renderMember = ({ item, index }: { item: MemberEngagement; index: number }) => {
    const isTop3 = index < 3;
    const medalEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;

    return (
      <TouchableOpacity
        onPress={() => router.push(`/engagement/${item.member_id}` as any)}
        className={`mx-4 mb-3 p-4 rounded-2xl ${isTop3 ? 'bg-primary/10' : 'bg-surface'}`}
        style={{ 
          borderWidth: isTop3 ? 2 : 1, 
          borderColor: isTop3 ? colors.primary : colors.border 
        }}
      >
        <View className="flex-row items-center">
          {/* Posição */}
          <View className="w-10 items-center">
            {medalEmoji ? (
              <Text className="text-2xl">{medalEmoji}</Text>
            ) : (
              <Text className="text-lg font-bold text-muted">{index + 1}º</Text>
            )}
          </View>

          {/* Avatar e Info */}
          <View className="flex-1 ml-3">
            <Text className="text-base font-semibold text-foreground">
              {item.member_name}
            </Text>
            <View className="flex-row items-center mt-1">
              <View 
                className="px-2 py-0.5 rounded-full mr-2"
                style={{ backgroundColor: getLevelColor(item.level) + '20' }}
              >
                <Text style={{ color: getLevelColor(item.level), fontSize: 12, fontWeight: '600' }}>
                  {item.level_name}
                </Text>
              </View>
              <Text className="text-xs text-muted">
                Nível {item.level}
              </Text>
            </View>
          </View>

          {/* Pontos */}
          <View className="items-end">
            <Text className="text-xl font-bold text-primary">
              {item.total_points}
            </Text>
            <Text className="text-xs text-muted">pontos</Text>
          </View>
        </View>

        {/* Barra de Progresso */}
        <View className="mt-3">
          <View className="h-2 bg-border rounded-full overflow-hidden">
            <View 
              className="h-full rounded-full"
              style={{ 
                width: `${item.progress_percentage}%`,
                backgroundColor: getLevelColor(item.level)
              }}
            />
          </View>
          <Text className="text-xs text-muted mt-1 text-right">
            {Math.round(item.progress_percentage)}% para o próximo nível
          </Text>
        </View>

        {/* Badges */}
        {item.badges.length > 0 && (
          <View className="flex-row flex-wrap mt-2 gap-1">
            {item.badges.slice(0, 5).map((badge) => (
              <View 
                key={badge.id}
                className="px-2 py-1 bg-background rounded-full"
              >
                <Text className="text-sm">{badge.icon}</Text>
              </View>
            ))}
            {item.badges.length > 5 && (
              <View className="px-2 py-1 bg-background rounded-full">
                <Text className="text-xs text-muted">+{item.badges.length - 5}</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="p-2 -ml-2"
        >
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-foreground">
          Engajamento
        </Text>
        <View className="w-10" />
      </View>

      {/* Stats Header */}
      <View className="px-4 py-4 bg-primary/5">
        <Text className="text-center text-sm text-muted mb-2">
          Ranking da Célula
        </Text>
        <Text className="text-center text-2xl font-bold text-foreground">
          🏆 Top Membros
        </Text>
        <Text className="text-center text-sm text-muted mt-1">
          Participe das atividades para ganhar pontos!
        </Text>
      </View>

      {/* Legend */}
      <View className="flex-row justify-center gap-4 py-3 border-b border-border">
        <View className="flex-row items-center">
          <View className="w-3 h-3 rounded-full bg-green-500 mr-1" />
          <Text className="text-xs text-muted">Presença</Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-3 h-3 rounded-full bg-purple-500 mr-1" />
          <Text className="text-xs text-muted">Convite</Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-3 h-3 rounded-full bg-blue-500 mr-1" />
          <Text className="text-xs text-muted">Oração</Text>
        </View>
      </View>

      {/* Ranking List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted">Carregando ranking...</Text>
        </View>
      ) : ranking.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-4">📊</Text>
          <Text className="text-lg font-semibold text-foreground text-center">
            Nenhum engajamento registrado
          </Text>
          <Text className="text-sm text-muted text-center mt-2">
            Participe das atividades da célula para aparecer no ranking!
          </Text>
        </View>
      ) : (
        <FlatList
          data={ranking}
          renderItem={renderMember}
          keyExtractor={(item) => item.member_id}
          contentContainerStyle={{ paddingVertical: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </ScreenContainer>
  );
}
