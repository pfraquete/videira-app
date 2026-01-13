import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/lib/auth-context";
import { EventService, Event } from "@/lib/event-service";
import { useColors } from "@/hooks/use-colors";

export default function EventsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  const loadEvents = useCallback(async () => {
    if (!user?.id) return;

    try {
      const data = await EventService.getEvents(user.id);
      setEvents(data);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }, [loadEvents]);

  const filteredEvents = events.filter(event => {
    const today = new Date().toISOString().split('T')[0];
    if (filter === 'upcoming') return event.event_date >= today;
    if (filter === 'past') return event.event_date < today;
    return true;
  });

  const handleCreateEvent = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/events/create' as any);
  };

  const handleEventPress = (eventId: number) => {
    router.push(`/events/${eventId}` as any);
  };

  const renderEvent = ({ item }: { item: Event }) => {
    const isPast = item.event_date < new Date().toISOString().split('T')[0];
    const typeColor = EventService.getEventTypeColor(item.event_type);

    return (
      <TouchableOpacity
        className={`bg-surface rounded-xl p-4 mb-3 border border-border ${isPast ? 'opacity-60' : ''}`}
        onPress={() => handleEventPress(item.id)}
        activeOpacity={0.7}
      >
        <View className="flex-row items-start">
          <View 
            className="w-12 h-12 rounded-xl items-center justify-center mr-3"
            style={{ backgroundColor: typeColor + '20' }}
          >
            <IconSymbol name="calendar" size={24} color={typeColor} />
          </View>
          <View className="flex-1">
            <Text className="text-foreground font-bold text-base">{item.title}</Text>
            <Text className="text-muted text-sm mt-1">
              {EventService.formatEventDate(item.event_date)}
            </Text>
            {item.event_time && (
              <Text className="text-muted text-sm">
                {EventService.formatEventTime(item.event_time)}
              </Text>
            )}
            <View 
              className="self-start px-2 py-1 rounded-full mt-2"
              style={{ backgroundColor: typeColor + '20' }}
            >
              <Text style={{ color: typeColor, fontSize: 12, fontWeight: '500' }}>
                {EventService.getEventTypeLabel(item.event_type)}
              </Text>
            </View>
          </View>
          <IconSymbol name="chevron.right" size={20} color={colors.muted} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-muted mt-4">Carregando eventos...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
        <View className="flex-row items-center">
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.primary} />
            <Text className="text-primary ml-1">Voltar</Text>
          </TouchableOpacity>
          <Text className="text-foreground font-bold text-lg ml-4">Eventos</Text>
        </View>
        <TouchableOpacity
          className="bg-primary w-10 h-10 rounded-full items-center justify-center"
          onPress={handleCreateEvent}
        >
          <IconSymbol name="plus" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View className="flex-row px-6 py-3 gap-2">
        {(['upcoming', 'all', 'past'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            className={`px-4 py-2 rounded-full ${
              filter === f ? 'bg-primary' : 'bg-surface border border-border'
            }`}
            onPress={() => setFilter(f)}
          >
            <Text className={filter === f ? 'text-background font-medium' : 'text-foreground'}>
              {f === 'upcoming' ? 'Próximos' : f === 'all' ? 'Todos' : 'Passados'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Events List */}
      <FlatList
        data={filteredEvents}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View className="items-center py-12">
            <IconSymbol name="calendar" size={48} color={colors.muted} />
            <Text className="text-foreground font-medium mt-4">
              {filter === 'upcoming' ? 'Nenhum evento próximo' : 
               filter === 'past' ? 'Nenhum evento passado' : 'Nenhum evento cadastrado'}
            </Text>
            <Text className="text-muted text-sm text-center mt-2">
              Toque no botão + para criar um novo evento
            </Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}
