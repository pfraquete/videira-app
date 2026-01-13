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
import { DiscipuladorCard } from "@/components/discipulador-card";
import { useAuth } from "@/lib/auth-context";
import { 
  HierarchyService, 
  Pastor, 
  PastorStats, 
  CellSummary, 
  DiscipuladorSummary 
} from "@/lib/hierarchy-service";
import { useColors } from "@/hooks/use-colors";

type TabType = 'overview' | 'discipuladores' | 'cells';

export default function PastorDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  const [pastor, setPastor] = useState<Pastor | null>(null);
  const [stats, setStats] = useState<PastorStats | null>(null);
  const [discipuladores, setDiscipuladores] = useState<DiscipuladorSummary[]>([]);
  const [cells, setCells] = useState<CellSummary[]>([]);

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    try {
      const [pastorData, statsData, discipuladoresData, cellsData] = await Promise.all([
        HierarchyService.getPastor(user.id),
        HierarchyService.getPastorStats(user.id),
        HierarchyService.getPastorDiscipuladores(user.id),
        HierarchyService.getPastorCells(user.id),
      ]);

      setPastor(pastorData);
      setStats(statsData);
      setDiscipuladores(discipuladoresData);
      setCells(cellsData);
    } catch (error) {
      console.error('Error loading pastor data:', error);
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
    color 
  }: { 
    icon: string; 
    value: number; 
    label: string; 
    color: string;
  }) => (
    <View className="flex-1 bg-surface rounded-xl p-4 border border-border items-center">
      <View 
        className="w-12 h-12 rounded-full items-center justify-center mb-2"
        style={{ backgroundColor: color + '20' }}
      >
        <IconSymbol name={icon as any} size={24} color={color} />
      </View>
      <Text className="text-2xl font-bold text-foreground">{value}</Text>
      <Text className="text-xs text-muted text-center">{label}</Text>
    </View>
  );

  const TabButton = ({ tab, label }: { tab: TabType; label: string }) => (
    <TouchableOpacity
      className={`flex-1 py-3 rounded-xl ${activeTab === tab ? 'bg-primary' : 'bg-surface'}`}
      onPress={() => setActiveTab(tab)}
    >
      <Text className={`text-center font-medium ${activeTab === tab ? 'text-background' : 'text-foreground'}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );

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
          <Text className="text-muted text-sm">Dashboard do Pastor</Text>
          <Text className="text-foreground text-2xl font-bold">
            {pastor?.nome || 'Pastor'}
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
          <View className="flex-row gap-3 mb-4">
            <StatCard
              icon="person.3.fill"
              value={stats?.total_discipuladores || 0}
              label="Discipuladores"
              color={colors.primary}
            />
            <StatCard
              icon="house.fill"
              value={stats?.total_cells || 0}
              label="Células"
              color={colors.success}
            />
          </View>
          <View className="flex-row gap-3">
            <StatCard
              icon="person.2.fill"
              value={stats?.total_members || 0}
              label="Membros"
              color="#f59e0b"
            />
            <StatCard
              icon="chart.bar.fill"
              value={stats?.average_attendance || 0}
              label="% Presença"
              color="#a855f7"
            />
          </View>
        </View>

        {/* Tab Navigation */}
        <View className="px-6 py-2">
          <View className="flex-row gap-2 bg-surface rounded-xl p-1 border border-border">
            <TabButton tab="overview" label="Visão Geral" />
            <TabButton tab="discipuladores" label="Discipuladores" />
            <TabButton tab="cells" label="Células" />
          </View>
        </View>

        {/* Tab Content */}
        <View className="px-6 py-4">
          {activeTab === 'overview' && (
            <View>
              {/* Recent Discipuladores */}
              <Text className="text-foreground font-bold text-lg mb-3">
                Discipuladores Recentes
              </Text>
              {discipuladores.slice(0, 3).map((disc) => (
                <DiscipuladorCard key={disc.discipulador_id} discipulador={disc} />
              ))}
              {discipuladores.length > 3 && (
                <TouchableOpacity
                  className="py-3 items-center"
                  onPress={() => setActiveTab('discipuladores')}
                >
                  <Text className="text-primary font-medium">
                    Ver todos ({discipuladores.length})
                  </Text>
                </TouchableOpacity>
              )}

              {/* Recent Cells */}
              <Text className="text-foreground font-bold text-lg mb-3 mt-6">
                Células Recentes
              </Text>
              {cells.slice(0, 3).map((cell) => (
                <CellCard key={cell.cell_user_id} cell={cell} />
              ))}
              {cells.length > 3 && (
                <TouchableOpacity
                  className="py-3 items-center"
                  onPress={() => setActiveTab('cells')}
                >
                  <Text className="text-primary font-medium">
                    Ver todas ({cells.length})
                  </Text>
                </TouchableOpacity>
              )}

              {discipuladores.length === 0 && cells.length === 0 && (
                <View className="items-center py-8">
                  <IconSymbol name="tray.fill" size={48} color={colors.muted} />
                  <Text className="text-muted mt-4 text-center">
                    Nenhum discipulador ou célula atribuída ainda.
                  </Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'discipuladores' && (
            <View>
              <Text className="text-foreground font-bold text-lg mb-3">
                Meus Discipuladores ({discipuladores.length})
              </Text>
              {discipuladores.map((disc) => (
                <DiscipuladorCard key={disc.discipulador_id} discipulador={disc} />
              ))}
              {discipuladores.length === 0 && (
                <View className="items-center py-8">
                  <IconSymbol name="person.3.fill" size={48} color={colors.muted} />
                  <Text className="text-muted mt-4 text-center">
                    Nenhum discipulador atribuído ainda.
                  </Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'cells' && (
            <View>
              <Text className="text-foreground font-bold text-lg mb-3">
                Todas as Células ({cells.length})
              </Text>
              {cells.map((cell) => (
                <CellCard key={cell.cell_user_id} cell={cell} />
              ))}
              {cells.length === 0 && (
                <View className="items-center py-8">
                  <IconSymbol name="house.fill" size={48} color={colors.muted} />
                  <Text className="text-muted mt-4 text-center">
                    Nenhuma célula atribuída ainda.
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
