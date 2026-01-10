import { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { OfflineBanner } from "@/components/offline-indicator";
import { useAuth } from "@/lib/auth-context";
import { DataService } from "@/lib/data-service";
import { useColors } from "@/hooks/use-colors";
import { useOffline } from "@/hooks/use-offline";
import { Member, CellEvent, Cell } from "@/lib/supabase";

interface Stats {
  totalMembers: number;
  activeMembers: number;
  averageAttendance: number;
  upcomingEvents: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cell, setCell] = useState<Cell | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalMembers: 0,
    activeMembers: 0,
    averageAttendance: 0,
    upcomingEvents: 0,
  });
  const [birthdays, setBirthdays] = useState<Member[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CellEvent[]>([]);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      // For leaders, load their cell data
      if (user.role === 'lider') {
        const [cellData, statsData, birthdaysData, eventsData] = await Promise.all([
          DataService.getCell(user.id),
          DataService.getCellStats(user.id),
          DataService.getBirthdaysThisMonth(user.id),
          DataService.getUpcomingEvents(user.id, 3),
        ]);

        setCell(cellData);
        setStats(statsData);
        setBirthdays(birthdaysData);
        setUpcomingEvents(eventsData);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const getRoleLabel = () => {
    switch (user?.role) {
      case 'pastor': return 'Pastor';
      case 'discipulador': return 'Discipulador';
      case 'lider': return 'Líder de Célula';
      default: return 'Participante';
    }
  };

  const getRoleColor = () => {
    switch (user?.role) {
      case 'pastor': return colors.primary;
      case 'discipulador': return '#a855f7';
      case 'lider': return colors.success;
      default: return '#f97316';
    }
  };

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-6">
          <Text className="text-muted text-sm">Olá,</Text>
          <Text className="text-2xl font-bold text-foreground">
            {user?.profile?.nome_completo || 'Usuário'}
          </Text>
          <View className="flex-row items-center mt-1">
            <View 
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: getRoleColor() + '20' }}
            >
              <Text style={{ color: getRoleColor() }} className="text-sm font-medium">
                {getRoleLabel()}
              </Text>
            </View>
          </View>
        </View>

        {/* Cell Info (for leaders) */}
        {user?.role === 'lider' && cell && (
          <View className="mx-6 mb-6 bg-surface rounded-2xl p-4 border border-border">
            <Text className="text-lg font-bold text-foreground mb-1">
              {cell.cell_name}
            </Text>
            <View className="flex-row items-center">
              <IconSymbol name="calendar" size={16} color={colors.muted} />
              <Text className="text-muted text-sm ml-2">
                {cell.meeting_day || 'Dia não definido'} às {cell.meeting_time || '--:--'}
              </Text>
            </View>
          </View>
        )}

        {/* Stats Grid (for leaders) */}
        {user?.role === 'lider' && (
          <View className="px-6 mb-6">
            <View className="flex-row flex-wrap gap-3">
              <StatCard
                icon="person.2.fill"
                value={stats.totalMembers}
                label="Membros"
                color={colors.primary}
              />
              <StatCard
                icon="checkmark.circle.fill"
                value={stats.activeMembers}
                label="Ativos"
                color={colors.success}
              />
              <StatCard
                icon="chart.bar.fill"
                value={`${stats.averageAttendance}%`}
                label="Presença"
                color="#a855f7"
              />
              <StatCard
                icon="calendar"
                value={stats.upcomingEvents}
                label="Eventos"
                color="#f59e0b"
              />
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View className="px-6 mb-6">
          <Text className="text-lg font-bold text-foreground mb-4">Ações Rápidas</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-primary rounded-xl p-4 items-center"
              onPress={() => router.push("/attendance")}
              activeOpacity={0.8}
            >
              <IconSymbol name="checkmark.circle.fill" size={28} color="#ffffff" />
              <Text className="text-background font-medium mt-2">Registrar Presença</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-surface border border-border rounded-xl p-4 items-center"
              onPress={() => router.push("/members")}
              activeOpacity={0.8}
            >
              <IconSymbol name="plus.circle.fill" size={28} color={colors.primary} />
              <Text className="text-foreground font-medium mt-2">Novo Membro</Text>
            </TouchableOpacity>
        </View>
        </View>

        {/* Offline Banner */}
        <View className="px-6">
          <OfflineBanner />
        </View>

        {/* Stats Cards */}
        {birthdays.length > 0 && (
          <View className="px-6 mb-6">
            <Text className="text-lg font-bold text-foreground mb-4">
              Aniversariantes do Mês
            </Text>
            <View className="bg-surface rounded-2xl border border-border overflow-hidden">
              {birthdays.slice(0, 3).map((member, index) => (
                <View
                  key={member.id}
                  className={`flex-row items-center p-4 ${
                    index < birthdays.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <View className="w-10 h-10 rounded-full bg-warning/20 items-center justify-center">
                    <Text className="text-lg">🎂</Text>
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-foreground font-medium">{member.nome}</Text>
                    <Text className="text-muted text-sm">
                      {member.data_nascimento ? 
                        new Date(member.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) 
                        : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Upcoming Events */}
        <View className="px-6 mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-foreground">
              Próximos Eventos
            </Text>
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => router.push('/events' as any)}
            >
              <Text className="text-primary font-medium mr-1">Ver todos</Text>
              <IconSymbol name="chevron.right" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {upcomingEvents.length > 0 ? (
            <View className="gap-3">
              {upcomingEvents.map((event) => (
                <View
                  key={event.id}
                  className="bg-surface rounded-xl p-4 border border-border"
                >
                  <Text className="text-foreground font-medium">{event.titulo}</Text>
                  <View className="flex-row items-center mt-2">
                    <IconSymbol name="calendar" size={14} color={colors.muted} />
                    <Text className="text-muted text-sm ml-2">
                      {new Date(event.data_inicial).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  {event.local && (
                    <View className="flex-row items-center mt-1">
                      <IconSymbol name="location.fill" size={14} color={colors.muted} />
                      <Text className="text-muted text-sm ml-2">{event.local}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <TouchableOpacity
              className="bg-surface rounded-xl p-6 border border-border items-center"
              onPress={() => router.push('/events/create' as any)}
              activeOpacity={0.7}
            >
              <IconSymbol name="calendar.badge.plus" size={32} color={colors.muted} />
              <Text className="text-muted mt-2">Nenhum evento próximo</Text>
              <Text className="text-primary font-medium mt-1">Criar novo evento</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Dashboard for Pastor */}
        {user?.role === 'pastor' && (
          <View className="px-6 mb-6">
            <TouchableOpacity
              className="bg-primary rounded-xl p-6 items-center"
              onPress={() => router.push("/dashboard/pastor")}
              activeOpacity={0.8}
            >
              <IconSymbol name="chart.bar.fill" size={40} color="#ffffff" />
              <Text className="text-background font-bold text-lg mt-3">Acessar Dashboard do Pastor</Text>
              <Text className="text-background/70 text-sm mt-1 text-center">
                Visualize métricas de discipuladores e células
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Dashboard for Discipulador */}
        {user?.role === 'discipulador' && (
          <View className="px-6 mb-6">
            <TouchableOpacity
              className="bg-primary rounded-xl p-6 items-center"
              onPress={() => router.push("/dashboard/discipulador")}
              activeOpacity={0.8}
            >
              <IconSymbol name="chart.bar.fill" size={40} color="#ffffff" />
              <Text className="text-background font-bold text-lg mt-3">Acessar Dashboard do Discipulador</Text>
              <Text className="text-background/70 text-sm mt-1 text-center">
                Acompanhe suas células e líderes
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty state for participants */}
        {user?.role === 'participante' && (
          <View className="px-6 items-center py-12">
            <View className="w-20 h-20 rounded-full bg-surface items-center justify-center mb-4">
              <IconSymbol name="person.2.fill" size={40} color={colors.muted} />
            </View>
            <Text className="text-foreground font-bold text-lg text-center">
              Bem-vindo ao Videira!
            </Text>
            <Text className="text-muted text-center mt-2">
              Entre em contato com seu líder de célula para participar das atividades.
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

// Stat Card Component
function StatCard({ 
  icon, 
  value, 
  label, 
  color 
}: { 
  icon: any; 
  value: number | string; 
  label: string; 
  color: string;
}) {
  return (
    <View 
      className="bg-surface rounded-xl p-4 border border-border"
      style={{ width: '48%' }}
    >
      <View 
        className="w-10 h-10 rounded-full items-center justify-center mb-2"
        style={{ backgroundColor: color + '20' }}
      >
        <IconSymbol name={icon} size={20} color={color} />
      </View>
      <Text className="text-2xl font-bold text-foreground">{value}</Text>
      <Text className="text-muted text-sm">{label}</Text>
    </View>
  );
}
