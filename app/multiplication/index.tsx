import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { MultiplicationService, MultiplicationPlan, MultiplicationStats } from '@/lib/multiplication-service';

export default function MultiplicationScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const [plans, setPlans] = useState<MultiplicationPlan[]>([]);
  const [stats, setStats] = useState<MultiplicationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cellId = (user as any)?.profile?.cell_id || (user as any)?.cell_id;

  const loadData = useCallback(async () => {
    if (!cellId) return;
    
    try {
      const [plansData, statsData] = await Promise.all([
        MultiplicationService.getPlans(cellId),
        MultiplicationService.getStats(cellId),
      ]);
      setPlans(plansData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading multiplication data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cellId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short',
      year: 'numeric'
    });
  };

  const renderPlan = ({ item }: { item: MultiplicationPlan }) => {
    const statusColor = MultiplicationService.getStatusColor(item.status);
    const statusLabel = MultiplicationService.getStatusLabel(item.status);
    const membersToNew = item.members_to_transfer.filter(m => m.destination === 'new').length;
    const totalMembers = item.members_to_transfer.length;

    return (
      <TouchableOpacity
        onPress={() => router.push(`/multiplication/${item.id}` as any)}
        className="mx-4 mb-3 p-4 bg-surface rounded-2xl border border-border"
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-lg font-semibold text-foreground">
              {item.new_cell_name}
            </Text>
            <Text className="text-sm text-muted mt-0.5">
              Nova célula a partir de {item.original_cell_name}
            </Text>
          </View>
          <View 
            className="px-3 py-1 rounded-full"
            style={{ backgroundColor: statusColor + '20' }}
          >
            <Text style={{ color: statusColor, fontSize: 12, fontWeight: '600' }}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Info Cards */}
        <View className="flex-row mt-4 gap-3">
          <View className="flex-1 bg-background p-3 rounded-xl">
            <Text className="text-xs text-muted">Data Prevista</Text>
            <Text className="text-sm font-medium text-foreground mt-1">
              {formatDate(item.target_date)}
            </Text>
          </View>
          <View className="flex-1 bg-background p-3 rounded-xl">
            <Text className="text-xs text-muted">Membros</Text>
            <Text className="text-sm font-medium text-foreground mt-1">
              {membersToNew} de {totalMembers}
            </Text>
          </View>
          {item.new_leader_name && (
            <View className="flex-1 bg-background p-3 rounded-xl">
              <Text className="text-xs text-muted">Novo Líder</Text>
              <Text className="text-sm font-medium text-foreground mt-1" numberOfLines={1}>
                {item.new_leader_name}
              </Text>
            </View>
          )}
        </View>

        {/* Progress Bar */}
        {item.status !== 'cancelled' && item.status !== 'completed' && (
          <View className="mt-4">
            <View className="flex-row justify-between mb-1">
              <Text className="text-xs text-muted">Progresso</Text>
              <Text className="text-xs text-muted">
                {Math.round((membersToNew / Math.max(totalMembers, 1)) * 100)}%
              </Text>
            </View>
            <View className="h-2 bg-border rounded-full overflow-hidden">
              <View 
                className="h-full rounded-full"
                style={{ 
                  width: `${(membersToNew / Math.max(totalMembers, 1)) * 100}%`,
                  backgroundColor: statusColor
                }}
              />
            </View>
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
          Multiplicação
        </Text>
        <TouchableOpacity 
          onPress={() => router.push('/multiplication/create' as any)}
          className="p-2 -mr-2"
        >
          <IconSymbol name="plus" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {stats && (
        <View className="px-4 py-4 bg-primary/5">
          <Text className="text-center text-sm text-muted mb-3">
            Histórico de Multiplicações
          </Text>
          <View className="flex-row gap-3">
            <View className="flex-1 bg-surface p-3 rounded-xl border border-border items-center">
              <Text className="text-2xl font-bold text-green-500">{stats.completed}</Text>
              <Text className="text-xs text-muted">Concluídas</Text>
            </View>
            <View className="flex-1 bg-surface p-3 rounded-xl border border-border items-center">
              <Text className="text-2xl font-bold text-blue-500">{stats.in_progress}</Text>
              <Text className="text-xs text-muted">Em Andamento</Text>
            </View>
            <View className="flex-1 bg-surface p-3 rounded-xl border border-border items-center">
              <Text className="text-2xl font-bold text-muted">{stats.planned}</Text>
              <Text className="text-xs text-muted">Planejadas</Text>
            </View>
          </View>
        </View>
      )}

      {/* Info Banner */}
      <View className="mx-4 mt-4 p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
        <View className="flex-row items-center">
          <Text className="text-2xl mr-3">🌱</Text>
          <View className="flex-1">
            <Text className="text-sm font-medium text-foreground">
              Multiplicar é crescer!
            </Text>
            <Text className="text-xs text-muted mt-1">
              Planeje a multiplicação da sua célula para alcançar mais vidas.
            </Text>
          </View>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted">Carregando planos...</Text>
        </View>
      ) : plans.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-5xl mb-4">🚀</Text>
          <Text className="text-lg font-semibold text-foreground text-center">
            Nenhum plano de multiplicação
          </Text>
          <Text className="text-sm text-muted text-center mt-2">
            Quando sua célula estiver pronta para multiplicar, crie um plano aqui para organizar a transição.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/multiplication/create' as any)}
            className="mt-4 px-6 py-3 bg-primary rounded-full"
          >
            <Text className="text-white font-semibold">Criar Plano</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={plans}
          renderItem={renderPlan}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </ScreenContainer>
  );
}
