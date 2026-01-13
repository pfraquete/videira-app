import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';

export interface CalendarEvent {
  id: string | number;
  title: string;
  date: string; // ISO date string
  type: 'event' | 'birthday';
  color?: string;
}

interface CalendarProps {
  events?: CalendarEvent[];
  onDayPress?: (date: Date, events: CalendarEvent[]) => void;
  onMonthChange?: (year: number, month: number) => void;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function Calendar({ events = [], onDayPress, onMonthChange }: CalendarProps) {
  const colors = useColors();
  const today = new Date();
  
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  // Gerar dias do mês
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: Array<{ day: number | null; date: Date | null }> = [];

    // Dias vazios antes do primeiro dia
    for (let i = 0; i < startingDay; i++) {
      days.push({ day: null, date: null });
    }

    // Dias do mês
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        date: new Date(currentYear, currentMonth, i),
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Mapear eventos por data
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    
    events.forEach(event => {
      const eventDate = new Date(event.date);
      const key = `${eventDate.getFullYear()}-${eventDate.getMonth()}-${eventDate.getDate()}`;
      
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(event);
    });

    return map;
  }, [events]);

  const getEventsForDay = (date: Date | null): CalendarEvent[] => {
    if (!date) return [];
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return eventsByDate.get(key) || [];
  };

  const isToday = (date: Date | null): boolean => {
    if (!date) return false;
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const handlePrevMonth = () => {
    let newMonth = currentMonth - 1;
    let newYear = currentYear;
    
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }

    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    onMonthChange?.(newYear, newMonth);
  };

  const handleNextMonth = () => {
    let newMonth = currentMonth + 1;
    let newYear = currentYear;
    
    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }

    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    onMonthChange?.(newYear, newMonth);
  };

  const handleDayPress = (date: Date | null) => {
    if (!date) return;
    const dayEvents = getEventsForDay(date);
    onDayPress?.(date, dayEvents);
  };

  return (
    <View className="bg-surface rounded-2xl p-4">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <TouchableOpacity
          onPress={handlePrevMonth}
          className="w-10 h-10 items-center justify-center rounded-full bg-background"
        >
          <IconSymbol name="chevron.left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        
        <Text className="text-lg font-bold text-foreground">
          {MONTHS[currentMonth]} {currentYear}
        </Text>
        
        <TouchableOpacity
          onPress={handleNextMonth}
          className="w-10 h-10 items-center justify-center rounded-full bg-background"
        >
          <IconSymbol name="chevron.right" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Weekday Headers */}
      <View className="flex-row mb-2">
        {WEEKDAYS.map((day, index) => (
          <View key={index} className="flex-1 items-center py-2">
            <Text className={`text-xs font-medium ${index === 0 ? 'text-error' : 'text-muted'}`}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View className="flex-row flex-wrap">
        {calendarDays.map((item, index) => {
          const dayEvents = getEventsForDay(item.date);
          const hasEvents = dayEvents.length > 0;
          const hasBirthday = dayEvents.some(e => e.type === 'birthday');
          const hasEvent = dayEvents.some(e => e.type === 'event');
          const isTodayDate = isToday(item.date);

          return (
            <TouchableOpacity
              key={index}
              className="w-[14.28%] aspect-square items-center justify-center"
              onPress={() => handleDayPress(item.date)}
              disabled={!item.day}
            >
              <View
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  isTodayDate ? 'bg-primary' : ''
                }`}
              >
                {item.day && (
                  <Text
                    className={`text-sm ${
                      isTodayDate
                        ? 'text-white font-bold'
                        : index % 7 === 0
                        ? 'text-error'
                        : 'text-foreground'
                    }`}
                  >
                    {item.day}
                  </Text>
                )}
              </View>
              
              {/* Event Indicators */}
              {hasEvents && (
                <View className="flex-row mt-1 gap-1">
                  {hasBirthday && (
                    <View className="w-1.5 h-1.5 rounded-full bg-warning" />
                  )}
                  {hasEvent && (
                    <View className="w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View className="flex-row items-center justify-center mt-4 gap-6">
        <View className="flex-row items-center">
          <View className="w-2.5 h-2.5 rounded-full bg-primary mr-2" />
          <Text className="text-xs text-muted">Eventos</Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-2.5 h-2.5 rounded-full bg-warning mr-2" />
          <Text className="text-xs text-muted">Aniversários</Text>
        </View>
      </View>
    </View>
  );
}
