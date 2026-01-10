import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Calendar, CalendarEvent } from '@/components/calendar';
import { useAuth } from '@/lib/auth-context';
import { EventService, Event } from '@/lib/event-service';
import { DataService } from '@/lib/data-service';
import { useColors } from '@/hooks/use-colors';

export default function CalendarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);
  const [showModal, setShowModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      // Carregar eventos
      const cellEvents = await EventService.getEvents(user.id);
      
      // Carregar membros para aniversários
      const members = await DataService.getMembers(user.id);

      // Converter para formato do calendário
      const calendarEvents: CalendarEvent[] = [];

      // Adicionar eventos
      cellEvents.forEach((event: Event) => {
        calendarEvents.push({
          id: event.id,
          title: event.title,
          date: event.event_date,
          type: 'event',
        });
      });

      // Adicionar aniversários
      const currentYear = new Date().getFullYear();
      members.forEach((member: any) => {
        if (member.data_nascimento) {
          const birthDate = new Date(member.data_nascimento);
          // Criar data de aniversário para o ano atual
          const birthdayThisYear = new Date(
            currentYear,
            birthDate.getMonth(),
            birthDate.getDate()
          );
          
          calendarEvents.push({
            id: `birthday-${member.id}`,
            title: `🎂 Aniversário de ${member.nome.split(' ')[0]}`,
            date: birthdayThisYear.toISOString(),
            type: 'birthday',
          });

          // Também adicionar para o próximo ano se já passou
          if (birthdayThisYear < new Date()) {
            const birthdayNextYear = new Date(
              currentYear + 1,
              birthDate.getMonth(),
              birthDate.getDate()
            );
            calendarEvents.push({
              id: `birthday-next-${member.id}`,
              title: `🎂 Aniversário de ${member.nome.split(' ')[0]}`,
              date: birthdayNextYear.toISOString(),
              type: 'birthday',
            });
          }
        }
      });

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDayPress = (date: Date, dayEvents: CalendarEvent[]) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedDate(date);
    setSelectedEvents(dayEvents);
    if (dayEvents.length > 0) {
      setShowModal(true);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const formatEventTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Próximos eventos
  const upcomingEvents = events
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

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
        <Text className="text-xl font-bold text-foreground">Calendário</Text>
        <TouchableOpacity onPress={() => router.push('/events/create' as any)}>
          <IconSymbol name="plus.circle.fill" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Calendar */}
        <View className="px-4 pt-4">
          <Calendar
            events={events}
            onDayPress={handleDayPress}
          />
        </View>

        {/* Upcoming Events */}
        <View className="px-4 py-6">
          <Text className="text-lg font-bold text-foreground mb-4">
            Próximos Eventos
          </Text>

          {upcomingEvents.length === 0 ? (
            <View className="bg-surface rounded-xl p-6 items-center">
              <IconSymbol name="calendar" size={32} color={colors.muted} />
              <Text className="text-muted mt-2">Nenhum evento próximo</Text>
            </View>
          ) : (
            upcomingEvents.map((event) => {
              const eventDate = new Date(event.date);
              const isToday = eventDate.toDateString() === new Date().toDateString();

              return (
                <TouchableOpacity
                  key={event.id}
                  className="flex-row items-center bg-surface rounded-xl p-4 mb-3"
                  onPress={() => {
                    if (event.type === 'event') {
                      router.push(`/events/${event.id}` as any);
                    }
                  }}
                >
                  {/* Date Badge */}
                  <View
                    className={`w-14 h-14 rounded-xl items-center justify-center mr-4 ${
                      isToday ? 'bg-primary' : 'bg-primary/10'
                    }`}
                  >
                    <Text
                      className={`text-lg font-bold ${
                        isToday ? 'text-white' : 'text-primary'
                      }`}
                    >
                      {eventDate.getDate()}
                    </Text>
                    <Text
                      className={`text-xs ${
                        isToday ? 'text-white/80' : 'text-primary/80'
                      }`}
                    >
                      {eventDate.toLocaleDateString('pt-BR', { month: 'short' })}
                    </Text>
                  </View>

                  {/* Event Info */}
                  <View className="flex-1">
                    <Text className="text-base font-medium text-foreground" numberOfLines={1}>
                      {event.title}
                    </Text>
                    <Text className="text-sm text-muted mt-1">
                      {event.type === 'birthday'
                        ? 'Aniversário'
                        : formatEventTime(event.date)}
                    </Text>
                  </View>

                  {/* Icon */}
                  <View
                    className={`w-8 h-8 rounded-full items-center justify-center ${
                      event.type === 'birthday' ? 'bg-warning/20' : 'bg-primary/20'
                    }`}
                  >
                    <IconSymbol
                      name={event.type === 'birthday' ? 'gift.fill' : 'calendar'}
                      size={16}
                      color={event.type === 'birthday' ? colors.warning : colors.primary}
                    />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Day Events Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-background rounded-t-3xl">
            {/* Handle */}
            <View className="items-center py-3">
              <View className="w-10 h-1 rounded-full bg-border" />
            </View>

            {/* Header */}
            <View className="flex-row items-center justify-between px-6 pb-4 border-b border-border">
              <Text className="text-lg font-bold text-foreground">
                {selectedDate && formatDate(selectedDate)}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {/* Events List */}
            <ScrollView className="max-h-80 px-6 py-4">
              {selectedEvents.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  className="flex-row items-center py-3 border-b border-border"
                  onPress={() => {
                    setShowModal(false);
                    if (event.type === 'event') {
                      router.push(`/events/${event.id}` as any);
                    }
                  }}
                >
                  <View
                    className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                      event.type === 'birthday' ? 'bg-warning/20' : 'bg-primary/20'
                    }`}
                  >
                    <IconSymbol
                      name={event.type === 'birthday' ? 'gift.fill' : 'calendar'}
                      size={20}
                      color={event.type === 'birthday' ? colors.warning : colors.primary}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-medium text-foreground">
                      {event.title}
                    </Text>
                    <Text className="text-sm text-muted">
                      {event.type === 'birthday' ? 'Aniversário' : formatEventTime(event.date)}
                    </Text>
                  </View>
                  <IconSymbol name="chevron.right" size={20} color={colors.muted} />
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Safe Area Bottom */}
            <View className="h-8" />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
