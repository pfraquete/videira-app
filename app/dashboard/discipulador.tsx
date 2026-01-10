import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useRouter, Stack } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { CellCard } from "@/components/cell-card";
import { useAuth } from "@/lib/auth-context";
import { 
  HierarchyService, 
  Discipulador, 
  DiscipuladorStats, 
  CellSummary 
} from "@/lib/hierarchy-service";
import { useColors } from "@/hooks/use-colors";

export default function DiscipuladorDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [discipulador, setDiscipulador] = useState<Discipulador | null>(null);
  const [stats, setStats] = useState<DiscipuladorStats | null>(null);
  const [cells, setCells] = useState<CellSummary[]>([]);

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    try {
      const [discipuladorData, statsData, cellsData] = await Promise.all([
        HierarchyService.getDiscipulador(user.id),
        HierarchyService.getDiscipuladorStats(user.id),
        HierarchyService.getDiscipuladorCells(user.id),
      ]);

      setDiscipulador(discipuladorData);
      setStats(statsData);
      setCells(cellsData);
    } catch (error) {
      console.error('Error loading discipulador data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-muted mt-4">Carregando dashboard...</Text>
      </ScreenContainer>
    );
  }

  const StatCard = ({ 
    icon, 
    value, 
    label, 
    color,
    suffix = ''
  }: { 
    icon: string; 
    value: number; 
    label: string; 
    color: string;
    suffix?: string;
  }) => (
    <View className="flex-1 bg-surface rounded-xl p-4 border border-border items-center">
      <View 
        className="w-12 h-12 rounded-full items-center justify-center mb-2"
        style={{ backgroundColor: color + '20' }}
      >
        <IconSymbol name={icon as any} size={24} color={color} />
      </View>
      <Text className="text-2xl font-bold text-foreground">{value}{suffix}</Text>
      <Text className="text-xs text-muted text-center">{label}</Text>
    </View>
  );

  // Ordenar células por presença (menor primeiro para destacar as que precisam de atenção)
  const sortedCells = [...cells].sort((a, b) => a.average_attendance - b.average_attendance);
  const cellsNeedingAttention = sortedCells.filter(c => c.average_attendance < 70);

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View className="px-6 py-4 border-b border-border">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.primary} />
            <Text className="text-primary ml-1">Voltar</Text>
          </TouchableOpacity>
        </View>
        <View className="mt-4">
          <Text className="text-muted text-sm">Dashboard do Discipulador</Text>
          <Text className="text-foreground text-2xl font-bold">
            {discipulador?.nome || 'Discipulador'}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Cards */}
        <View className="px-6 py-4">
          <View className="flex-row gap-3">
            <StatCard
              icon="house.fill"
              value={stats?.total_cells || 0}
              label="Células"
              color={colors.primary}
            />
            <StatCard
              icon="person.2.fill"
              value={stats?.total_members || 0}
              label="Membros"
              color={colors.success}
            />
            <StatCard
              icon="chart.bar.fill"
              value={stats?.average_attendance || 0}
              label="Presença"
              color="#a855f7"
              suffix="%"
            />
          </View>
        </View>

        {/* Cells Needing Attention */}
        {cellsNeedingAttention.length > 0 && (
          <View className="px-6 py-2">
            <View className="bg-warning/10 rounded-xl p-4 border border-warning/30">
              <View className="flex-row items-center mb-2">
                <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#f59e0b" />
                <Text className="text-foreground font-bold ml-2">
                  Células que Precisam de Atenção
                </Text>
              </View>
              <Text className="text-muted text-sm mb-3">
                {cellsNeedingAttention.length} célula(s) com presença abaixo de 70%
              </Text>
              {cellsNeedingAttention.slice(0, 2).map((cell) => (
                <View 
                  key={cell.cell_user_id}
                  className="flex-row items-center justify-between py-2 border-t border-warning/20"
                >
                  <View>
                    <Text className="text-foreground font-medium">{cell.cell_name}</Text>
                    <Text className="text-muted text-sm">{cell.leader_name}</Text>
                  </View>
                  <View 
                    className="px-3 py-1 rounded-full"
                    style={{ backgroundColor: colors.error + '20' }}
                  >
                    <Text className="text-error font-medium">{cell.average_attendance}%</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* All Cells */}
        <View className="px-6 py-4">
          <Text className="text-foreground font-bold text-lg mb-3">
            Minhas Células ({cells.length})
          </Text>
          
          {cells.length > 0 ? (
            cells.map((cell) => (
              <CellCard key={cell.cell_user_id} cell={cell} />
            ))
          ) : (
            <View className="items-center py-8 bg-surface rounded-xl border border-border">
              <IconSymbol name="house.fill" size={48} color={colors.muted} />
              <Text className="text-muted mt-4 text-center">
                Nenhuma célula atribuída ainda.
              </Text>
              <Text className="text-muted text-sm text-center mt-2 px-4">
                Entre em contato com seu pastor para que ele atribua células para você acompanhar.
              </Text>
            </View>
          )}
        </View>

        {/* Quick Tips */}
        {cells.length > 0 && (
          <View className="px-6 py-4">
            <Text className="text-foreground font-bold text-lg mb-3">
              Dicas de Acompanhamento
            </Text>
            <View className="bg-surface rounded-xl p-4 border border-border">
              <View className="flex-row items-start mb-3">
                <View className="w-8 h-8 rounded-full bg-primary/20 items-center justify-center mr-3">
                  <Text className="text-primary font-bold">1</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-foreground font-medium">Contato Semanal</Text>
                  <Text className="text-muted text-sm">
                    Entre em contato com cada líder pelo menos uma vez por semana.
                  </Text>
                </View>
              </View>
              <View className="flex-row items-start mb-3">
                <View className="w-8 h-8 rounded-full bg-success/20 items-center justify-center mr-3">
                  <Text className="text-success font-bold">2</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-foreground font-medium">Visite as Células</Text>
                  <Text className="text-muted text-sm">
                    Procure visitar cada célula pelo menos uma vez por mês.
                  </Text>
                </View>
              </View>
              <View className="flex-row items-start">
                <View className="w-8 h-8 rounded-full bg-warning/20 items-center justify-center mr-3">
                  <Text style={{ color: '#f59e0b' }} className="font-bold">3</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-foreground font-medium">Acompanhe os Números</Text>
                  <Text className="text-muted text-sm">
                    Monitore a presença e crescimento de cada célula regularmente.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
