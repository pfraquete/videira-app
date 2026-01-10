import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import { GoalsService, CellGoal, GoalProgress } from "@/lib/goals-service";
import { DataService } from "@/lib/data-service";
import { EventService } from "@/lib/event-service";

export default function GoalsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<CellGoal | null>(null);
  const [progress, setProgress] = useState<GoalProgress | null>(null);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Load current month goal
      const goal = await GoalsService.getCurrentMonthGoal(user.id);
      setCurrentGoal(goal);

      if (goal) {
        // Calculate progress based on real data
        const stats = await DataService.getCellStats(user.id);
        const events = await EventService.getUpcomingEvents(user.id);
        
        // Count visitors and new members this month
        const members = await DataService.getMembers(user.id);
        const thisMonthStart = new Date(currentYear, currentMonth - 1, 1);
        
        const visitorsThisMonth = members.filter(m => 
          m.funcao === 'Visitante' && 
          m.created_at && new Date(m.created_at) >= thisMonthStart
        ).length;

        const newMembersThisMonth = members.filter(m => 
          m.funcao !== 'Visitante' && 
          m.created_at && new Date(m.created_at) >= thisMonthStart
        ).length;

        const eventsThisMonth = events.filter(e => {
          const eventDate = new Date(e.event_date);
          return eventDate.getMonth() + 1 === currentMonth && 
                 eventDate.getFullYear() === currentYear;
        }).length;

        const calculatedProgress = GoalsService.calculateProgress(goal, {
          visitors: visitorsThisMonth,
          newMembers: newMembersThisMonth,
          averageAttendance: stats.averageAttendance,
          events: eventsThisMonth,
        });

        setProgress(calculatedProgress);
      }
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, currentMonth, currentYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const ProgressBar = ({ percentage, color }: { percentage: number; color: string }) => (
    <View className="h-2 bg-border rounded-full overflow-hidden">
      <View 
        className="h-full rounded-full"
        style={{ 
          width: `${Math.min(100, percentage)}%`, 
          backgroundColor: color 
        }}
      />
    </View>
  );

  const GoalCard = ({ 
    title, 
    icon, 
    current, 
    target, 
    percentage,
    suffix = ''
  }: { 
    title: string; 
    icon: any; 
    current: number; 
    target: number; 
    percentage: number;
    suffix?: string;
  }) => {
    const progressColor = GoalsService.getProgressColor(percentage);
    
    return (
      <View className="bg-surface rounded-xl p-4 border border-border mb-3">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <View 
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: progressColor + '20' }}
            >
              <IconSymbol name={icon} size={20} color={progressColor} />
            </View>
            <Text className="text-foreground font-medium ml-3">{title}</Text>
          </View>
          <Text className="text-foreground font-bold">
            {current}{suffix} / {target}{suffix}
          </Text>
        </View>
        <ProgressBar percentage={percentage} color={progressColor} />
        <Text className="text-muted text-xs mt-2 text-right">
          {percentage}% concluído
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
        <TouchableOpacity
          className="flex-row items-center"
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          <Text className="text-primary ml-1">Voltar</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-foreground">Metas</Text>
        <TouchableOpacity
          onPress={() => router.push('/goals/edit' as any)}
        >
          <Text className="text-primary font-medium">
            {currentGoal ? 'Editar' : 'Criar'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Month Header */}
        <View className="px-6 py-4">
          <Text className="text-2xl font-bold text-foreground">
            {GoalsService.getMonthName(currentMonth)} {currentYear}
          </Text>
          <Text className="text-muted mt-1">
            Acompanhe o progresso das metas da sua célula
          </Text>
        </View>

        {currentGoal && progress ? (
          <>
            {/* Overall Progress */}
            <View className="mx-6 mb-6 bg-primary/10 rounded-2xl p-6">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-foreground font-bold text-lg">Progresso Geral</Text>
                <Text 
                  className="text-3xl font-bold"
                  style={{ color: GoalsService.getProgressColor(progress.overall) }}
                >
                  {progress.overall}%
                </Text>
              </View>
              <ProgressBar 
                percentage={progress.overall} 
                color={GoalsService.getProgressColor(progress.overall)} 
              />
              {progress.overall >= 100 && (
                <View className="flex-row items-center mt-4 bg-success/20 rounded-lg p-3">
                  <IconSymbol name="checkmark.circle.fill" size={24} color={colors.success} />
                  <Text className="text-success font-medium ml-2">
                    Parabéns! Todas as metas foram atingidas!
                  </Text>
                </View>
              )}
            </View>

            {/* Individual Goals */}
            <View className="px-6">
              <Text className="text-lg font-bold text-foreground mb-4">Detalhamento</Text>
              
              <GoalCard
                title="Visitantes"
                icon="person.fill"
                current={progress.visitors.current}
                target={progress.visitors.target}
                percentage={progress.visitors.percentage}
              />

              <GoalCard
                title="Novos Membros"
                icon="person.2.fill"
                current={progress.newMembers.current}
                target={progress.newMembers.target}
                percentage={progress.newMembers.percentage}
              />

              <GoalCard
                title="Presença Média"
                icon="checkmark.circle.fill"
                current={progress.averageAttendance.current}
                target={progress.averageAttendance.target}
                percentage={progress.averageAttendance.percentage}
                suffix="%"
              />

              <GoalCard
                title="Eventos"
                icon="calendar"
                current={progress.events.current}
                target={progress.events.target}
                percentage={progress.events.percentage}
              />
            </View>
          </>
        ) : (
          <View className="mx-6 items-center py-12">
            <View className="w-20 h-20 rounded-full bg-primary/20 items-center justify-center mb-4">
              <IconSymbol name="chart.bar.fill" size={40} color={colors.primary} />
            </View>
            <Text className="text-foreground font-bold text-lg text-center">
              Nenhuma meta definida
            </Text>
            <Text className="text-muted text-center mt-2 mb-6">
              Defina metas mensais para acompanhar o crescimento da sua célula
            </Text>
            <TouchableOpacity
              className="bg-primary px-6 py-3 rounded-xl"
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                router.push('/goals/edit' as any);
              }}
            >
              <Text className="text-background font-medium">Definir Metas</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
