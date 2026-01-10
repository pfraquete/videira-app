import { useState } from "react";
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
import { useRouter, Stack } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/lib/auth-context";
import { EventService, Event } from "@/lib/event-service";
import { useColors } from "@/hooks/use-colors";

const EVENT_TYPES: { value: Event['event_type']; label: string }[] = [
  { value: 'reuniao', label: 'Reunião de Célula' },
  { value: 'culto', label: 'Culto' },
  { value: 'confraternizacao', label: 'Confraternização' },
  { value: 'evangelismo', label: 'Evangelismo' },
  { value: 'outro', label: 'Outro' },
];

export default function CreateEventScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();

  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [location, setLocation] = useState('');
  const [eventType, setEventType] = useState<Event['event_type']>('reuniao');

  const formatDateInput = (text: string) => {
    // Remove non-numeric characters
    const numbers = text.replace(/\D/g, '');
    
    // Format as DD/MM/YYYY
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  };

  const formatTimeInput = (text: string) => {
    // Remove non-numeric characters
    const numbers = text.replace(/\D/g, '');
    
    // Format as HH:MM
    if (numbers.length <= 2) return numbers;
    return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`;
  };

  const parseDate = (dateStr: string): string | null => {
    // Parse DD/MM/YYYY to YYYY-MM-DD
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
    // Parse HH:MM to HH:MM:00
    const parts = timeStr.split(':');
    if (parts.length !== 2) return null;
    
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    
    if (isNaN(hours) || isNaN(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  };

  const handleSave = async () => {
    if (!user?.id) return;

    // Validation
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
      const event = await EventService.createEvent(user.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        event_date: parsedDate,
        event_time: parsedTime || undefined,
        location: location.trim() || undefined,
        event_type: eventType,
      });

      if (event) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        router.back();
      } else {
        Alert.alert('Erro', 'Não foi possível criar o evento. Tente novamente.');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao criar o evento');
    } finally {
      setSaving(false);
    }
  };

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
          <Text className="text-primary ml-1">Cancelar</Text>
        </TouchableOpacity>
        <Text className="text-foreground font-bold text-lg">Novo Evento</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text className="text-primary font-bold">Salvar</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6 py-4" contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Title */}
          <View className="mb-4">
            <Text className="text-muted text-sm font-medium mb-2">Título *</Text>
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
              placeholder="Ex: Reunião de Célula"
              placeholderTextColor={colors.muted}
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
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
                returnKeyType="next"
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
                returnKeyType="next"
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
              returnKeyType="next"
            />
          </View>

          {/* Description */}
          <View className="mb-4">
            <Text className="text-muted text-sm font-medium mb-2">Descrição</Text>
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
              placeholder="Detalhes adicionais sobre o evento..."
              placeholderTextColor={colors.muted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{ minHeight: 100 }}
            />
          </View>

          {/* Tips */}
          <View className="bg-primary/10 rounded-xl p-4 flex-row items-start">
            <IconSymbol name="info.circle.fill" size={20} color={colors.primary} />
            <Text className="text-foreground flex-1 ml-3 text-sm">
              Eventos criados serão visíveis para todos os membros da célula e podem gerar notificações de lembrete.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
