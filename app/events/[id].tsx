import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { EventService, Event } from "@/lib/event-service";
import { useColors } from "@/hooks/use-colors";

const EVENT_TYPES: { value: Event['event_type']; label: string }[] = [
  { value: 'reuniao', label: 'Reunião de Célula' },
  { value: 'culto', label: 'Culto' },
  { value: 'confraternizacao', label: 'Confraternização' },
  { value: 'evangelismo', label: 'Evangelismo' },
  { value: 'outro', label: 'Outro' },
];

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [location, setLocation] = useState('');
  const [eventType, setEventType] = useState<Event['event_type']>('reuniao');

  const loadEvent = useCallback(async () => {
    if (!id) return;

    try {
      const data = await EventService.getEvent(parseInt(id, 10));
      if (data) {
        setEvent(data);
        setTitle(data.title);
        setDescription(data.description || '');
        setEventDate(formatDateForDisplay(data.event_date));
        setEventTime(data.event_time ? data.event_time.substring(0, 5) : '');
        setLocation(data.location || '');
        setEventType(data.event_type);
      }
    } catch (error) {
      console.error('Error loading event:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const formatDateForDisplay = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateInput = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  };

  const formatTimeInput = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`;
  };

  const parseDate = (dateStr: string): string | null => {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2020) return null;
    
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const parseTime = (timeStr: string): string | null => {
    const parts = timeStr.split(':');
    if (parts.length !== 2) return null;
    
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    
    if (isNaN(hours) || isNaN(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  };

  const handleSave = async () => {
    if (!event) return;

    if (!title.trim()) {
      Alert.alert('Erro', 'Por favor, informe o título do evento');
      return;
    }

    const parsedDate = parseDate(eventDate);
    if (!parsedDate) {
      Alert.alert('Erro', 'Por favor, informe uma data válida (DD/MM/AAAA)');
      return;
    }

    const parsedTime = eventTime ? parseTime(eventTime) : null;
    if (eventTime && !parsedTime) {
      Alert.alert('Erro', 'Por favor, informe um horário válido (HH:MM)');
      return;
    }

    setSaving(true);
    try {
      const updated = await EventService.updateEvent(event.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        event_date: parsedDate,
        event_time: parsedTime || undefined,
        location: location.trim() || undefined,
        event_type: eventType,
      });

      if (updated) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setEvent(updated);
        setIsEditing(false);
      } else {
        Alert.alert('Erro', 'Não foi possível atualizar o evento');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao atualizar o evento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Excluir Evento',
      `Tem certeza que deseja excluir "${event?.title}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            if (!event) return;

            setDeleting(true);
            try {
              const success = await EventService.deleteEvent(event.id);
              if (success) {
                if (Platform.OS !== 'web') {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                router.back();
              } else {
                Alert.alert('Erro', 'Não foi possível excluir o evento');
              }
            } catch (error) {
              console.error('Error deleting event:', error);
              Alert.alert('Erro', 'Ocorreu um erro ao excluir o evento');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const cancelEdit = () => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setEventDate(formatDateForDisplay(event.event_date));
      setEventTime(event.event_time ? event.event_time.substring(0, 5) : '');
      setLocation(event.location || '');
      setEventType(event.event_type);
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-muted mt-4">Carregando evento...</Text>
      </ScreenContainer>
    );
  }

  if (!event) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <IconSymbol name="calendar" size={48} color={colors.muted} />
        <Text className="text-foreground font-medium mt-4">Evento não encontrado</Text>
        <TouchableOpacity
          className="mt-4 bg-primary px-6 py-3 rounded-xl"
          onPress={() => router.back()}
        >
          <Text className="text-background font-bold">Voltar</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  const typeColor = EventService.getEventTypeColor(event.event_type);
  const isPast = event.event_date < new Date().toISOString().split('T')[0];

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
        <TouchableOpacity
          className="flex-row items-center"
          onPress={isEditing ? cancelEdit : () => router.back()}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          <Text className="text-primary ml-1">{isEditing ? 'Cancelar' : 'Voltar'}</Text>
        </TouchableOpacity>
        <Text className="text-foreground font-bold text-lg">
          {isEditing ? 'Editar Evento' : 'Detalhes'}
        </Text>
        {isEditing ? (
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text className="text-primary font-bold">Salvar</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <IconSymbol name="pencil" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6 py-4" contentContainerStyle={{ paddingBottom: 100 }}>
          {!isEditing ? (
            // View Mode
            <>
              {/* Event Header */}
              <View className="items-center mb-6">
                <View 
                  className="w-20 h-20 rounded-2xl items-center justify-center mb-4"
                  style={{ backgroundColor: typeColor + '20' }}
                >
                  <IconSymbol name="calendar" size={40} color={typeColor} />
                </View>
                <Text className="text-foreground font-bold text-2xl text-center">{event.title}</Text>
                <View 
                  className="px-3 py-1 rounded-full mt-2"
                  style={{ backgroundColor: typeColor + '20' }}
                >
                  <Text style={{ color: typeColor, fontWeight: '500' }}>
                    {EventService.getEventTypeLabel(event.event_type)}
                  </Text>
                </View>
                {isPast && (
                  <View className="bg-muted/20 px-3 py-1 rounded-full mt-2">
                    <Text className="text-muted text-sm">Evento passado</Text>
                  </View>
                )}
              </View>

              {/* Event Info */}
              <View className="bg-surface rounded-xl border border-border overflow-hidden mb-4">
                <View className="flex-row items-center p-4 border-b border-border">
                  <IconSymbol name="calendar" size={20} color={colors.primary} />
                  <Text className="text-foreground ml-3">
                    {EventService.formatEventDate(event.event_date)}
                  </Text>
                </View>
                {event.event_time && (
                  <View className="flex-row items-center p-4 border-b border-border">
                    <IconSymbol name="clock.fill" size={20} color={colors.primary} />
                    <Text className="text-foreground ml-3">
                      {EventService.formatEventTime(event.event_time)}
                    </Text>
                  </View>
                )}
                {event.location && (
                  <View className="flex-row items-center p-4">
                    <IconSymbol name="location.fill" size={20} color={colors.primary} />
                    <Text className="text-foreground ml-3">{event.location}</Text>
                  </View>
                )}
              </View>

              {/* Description */}
              {event.description && (
                <View className="bg-surface rounded-xl border border-border p-4 mb-4">
                  <Text className="text-muted text-sm font-medium mb-2">Descrição</Text>
                  <Text className="text-foreground">{event.description}</Text>
                </View>
              )}

              {/* Delete Button */}
              <TouchableOpacity
                className="bg-error/10 rounded-xl py-4 items-center flex-row justify-center mt-4"
                onPress={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color={colors.error} />
                ) : (
                  <>
                    <IconSymbol name="trash.fill" size={20} color={colors.error} />
                    <Text className="text-error font-bold ml-2">Excluir Evento</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            // Edit Mode
            <>
              {/* Title */}
              <View className="mb-4">
                <Text className="text-muted text-sm font-medium mb-2">Título *</Text>
                <TextInput
                  className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
                  placeholder="Ex: Reunião de Célula"
                  placeholderTextColor={colors.muted}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              {/* Event Type */}
              <View className="mb-4">
                <Text className="text-muted text-sm font-medium mb-2">Tipo de Evento</Text>
                <View className="flex-row flex-wrap gap-2">
                  {EVENT_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      className={`px-4 py-2 rounded-full border ${
                        eventType === type.value
                          ? 'bg-primary border-primary'
                          : 'bg-surface border-border'
                      }`}
                      onPress={() => setEventType(type.value)}
                    >
                      <Text
                        className={
                          eventType === type.value
                            ? 'text-background font-medium'
                            : 'text-foreground'
                        }
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Date and Time */}
              <View className="flex-row gap-4 mb-4">
                <View className="flex-1">
                  <Text className="text-muted text-sm font-medium mb-2">Data *</Text>
                  <TextInput
                    className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor={colors.muted}
                    value={eventDate}
                    onChangeText={(text) => setEventDate(formatDateInput(text))}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-muted text-sm font-medium mb-2">Horário</Text>
                  <TextInput
                    className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
                    placeholder="HH:MM"
                    placeholderTextColor={colors.muted}
                    value={eventTime}
                    onChangeText={(text) => setEventTime(formatTimeInput(text))}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
              </View>

              {/* Location */}
              <View className="mb-4">
                <Text className="text-muted text-sm font-medium mb-2">Local</Text>
                <TextInput
                  className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
                  placeholder="Ex: Casa do João"
                  placeholderTextColor={colors.muted}
                  value={location}
                  onChangeText={setLocation}
                />
              </View>

              {/* Description */}
              <View className="mb-4">
                <Text className="text-muted text-sm font-medium mb-2">Descrição</Text>
                <TextInput
                  className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
                  placeholder="Detalhes adicionais..."
                  placeholderTextColor={colors.muted}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={{ minHeight: 100 }}
                />
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
