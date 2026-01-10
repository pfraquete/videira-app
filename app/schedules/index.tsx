import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useAuth } from '@/lib/auth-context';
import { 
  scheduleService, 
  ScheduleEntry, 
  SERVICE_ROLE_LABELS, 
  SERVICE_ROLE_ICONS,
  ServiceRole 
} from '@/lib/schedule-service';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function SchedulesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');

  const cellId = (user?.profile as any)?.cell_id || '';

  const loadSchedules = useCallback(async () => {
    if (!cellId) return;
    
    setLoading(true);
    try {
      const data = await scheduleService.getMonthlySchedule(cellId, currentYear, currentMonth);
      setSchedules(data);
    } catch (error) {
      console.error('Erro ao carregar escalas:', error);
    } finally {
      setLoading(false);
    }
  }, [cellId, currentYear, currentMonth]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const goToPreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const groupByDate = (entries: ScheduleEntry[]) => {
    const grouped: Record<string, ScheduleEntry[]> = {};
    entries.forEach(entry => {
      if (!grouped[entry.date]) {
        grouped[entry.date] = [];
      }
      grouped[entry.date].push(entry);
    });
    return grouped;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const day = date.getDate();
    const weekDay = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()];
    return { day, weekDay };
  };

  const groupedSchedules = groupByDate(schedules);
  const sortedDates = Object.keys(groupedSchedules).sort();

  const renderDateGroup = ({ item: date }: { item: string }) => {
    const entries = groupedSchedules[date];
    const { day, weekDay } = formatDate(date);
    const isToday = date === new Date().toISOString().split('T')[0];

    return (
      <View className="mb-4">
        <View className={`flex-row items-center mb-2 ${isToday ? 'bg-primary/10 -mx-4 px-4 py-2 rounded-lg' : ''}`}>
          <View className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${isToday ? 'bg-primary' : 'bg-surface'}`}>
            <Text className={`text-lg font-bold ${isToday ? 'text-white' : 'text-foreground'}`}>{day}</Text>
          </View>
          <View>
            <Text className={`font-semibold ${isToday ? 'text-primary' : 'text-foreground'}`}>
              {weekDay}
              {isToday && ' (Hoje)'}
            </Text>
          </View>
        </View>

        {entries.map((entry) => (
          <TouchableOpacity
            key={entry.id}
            className="bg-surface rounded-xl p-4 mb-2 ml-15 flex-row items-center"
            activeOpacity={0.7}
            onPress={() => router.push(`/schedules/${entry.id}` as any)}
          >
            <Text className="text-2xl mr-3">{SERVICE_ROLE_ICONS[entry.role]}</Text>
            <View className="flex-1">
              <Text className="font-semibold text-foreground">
                {SERVICE_ROLE_LABELS[entry.role]}
              </Text>
              <Text className="text-muted text-sm">{entry.member_name}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <ScreenContainer className="flex-1">
      {/* Header */}
      <View className="px-4 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-surface items-center justify-center"
          >
            <Text className="text-lg">←</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-foreground">Escala de Servos</Text>
          <TouchableOpacity
            onPress={() => router.push('/schedules/create' as any)}
            className="w-10 h-10 rounded-full bg-primary items-center justify-center"
          >
            <Text className="text-white text-lg">+</Text>
          </TouchableOpacity>
        </View>

        {/* Month Navigation */}
        <View className="flex-row items-center justify-between bg-surface rounded-xl p-3 mb-4">
          <TouchableOpacity onPress={goToPreviousMonth} className="p-2">
            <Text className="text-xl text-primary">◀</Text>
          </TouchableOpacity>
          <Text className="text-lg font-bold text-foreground">
            {MONTHS[currentMonth - 1]} {currentYear}
          </Text>
          <TouchableOpacity onPress={goToNextMonth} className="p-2">
            <Text className="text-xl text-primary">▶</Text>
          </TouchableOpacity>
        </View>

        {/* Legend */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          <View className="flex-row gap-3">
            {(Object.keys(SERVICE_ROLE_LABELS) as ServiceRole[]).map((role) => (
              <View key={role} className="flex-row items-center bg-surface px-3 py-2 rounded-full">
                <Text className="mr-1">{SERVICE_ROLE_ICONS[role]}</Text>
                <Text className="text-xs text-muted">{SERVICE_ROLE_LABELS[role]}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted">Carregando escalas...</Text>
        </View>
      ) : sortedDates.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-6xl mb-4">📋</Text>
          <Text className="text-xl font-bold text-foreground text-center mb-2">
            Nenhuma escala para este mês
          </Text>
          <Text className="text-muted text-center mb-6">
            Crie escalas para organizar as funções da célula.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/schedules/create' as any)}
            className="bg-primary px-6 py-3 rounded-full"
          >
            <Text className="text-white font-semibold">Criar Escala</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sortedDates}
          renderItem={renderDateGroup}
          keyExtractor={(item) => item}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}
