import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ReminderService, ReminderSettings } from '@/lib/reminder-service';
import { EventService } from '@/lib/event-service';
import { DataService } from '@/lib/data-service';
import { useAuth } from '@/lib/auth-context';
import { useColors } from '@/hooks/use-colors';

export default function RemindersSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [settings, setSettings] = useState<ReminderSettings>({
    eventsEnabled: true,
    eventsDayBefore: true,
    eventsHourBefore: true,
    birthdaysEnabled: true,
    birthdaysMorning: true,
  });
  const [scheduledCount, setScheduledCount] = useState({ events: 0, birthdays: 0 });

  const loadData = useCallback(async () => {
    try {
      const [permission, savedSettings, count] = await Promise.all([
        ReminderService.hasPermission(),
        ReminderService.getSettings(),
        ReminderService.getScheduledCount(),
      ]);

      setHasPermission(permission);
      setSettings(savedSettings);
      setScheduledCount(count);
    } catch (error) {
      console.error('Error loading reminder settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRequestPermission = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const granted = await ReminderService.requestPermissions();
    setHasPermission(granted);

    if (!granted) {
      Alert.alert(
        'Permissão Negada',
        'Para receber lembretes, você precisa permitir notificações nas configurações do dispositivo.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleToggle = async (key: keyof ReminderSettings, value: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await ReminderService.saveSettings(newSettings);
  };

  const handleRescheduleAll = async () => {
    if (!user) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setSaving(true);
    try {
      // Buscar eventos e membros
      const [events, members] = await Promise.all([
        EventService.getEvents(user.id),
        DataService.getMembers(user.id),
      ]);

      // Reagendar todos os lembretes
      await ReminderService.rescheduleAllReminders(
        events,
        members.map(m => ({ ...m, id: String(m.id) }))
      );

      // Atualizar contagem
      const count = await ReminderService.getScheduledCount();
      setScheduledCount(count);

      Alert.alert(
        'Lembretes Atualizados',
        `${count.events} lembretes de eventos e ${count.birthdays} lembretes de aniversários foram agendados.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error rescheduling reminders:', error);
      Alert.alert('Erro', 'Não foi possível atualizar os lembretes.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearAll = async () => {
    Alert.alert(
      'Limpar Lembretes',
      'Tem certeza que deseja cancelar todos os lembretes agendados?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }

            await ReminderService.cancelAllReminders();
            setScheduledCount({ events: 0, birthdays: 0 });

            Alert.alert('Lembretes Limpos', 'Todos os lembretes foram cancelados.');
          },
        },
      ]
    );
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
      {/* Header */}
      <View className="flex-row items-center px-6 py-4 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-foreground">Lembretes</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Permission Status */}
        {!hasPermission && (
          <View className="mx-4 mt-4 bg-warning/10 rounded-xl p-4">
            <View className="flex-row items-center mb-2">
              <IconSymbol name="bell.fill" size={20} color={colors.warning} />
              <Text className="ml-2 font-semibold text-foreground">
                Permissão Necessária
              </Text>
            </View>
            <Text className="text-sm text-muted mb-3">
              Para receber lembretes de eventos e aniversários, você precisa permitir notificações.
            </Text>
            <TouchableOpacity
              className="bg-warning py-2 px-4 rounded-lg self-start"
              onPress={handleRequestPermission}
            >
              <Text className="text-white font-medium">Permitir Notificações</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats */}
        <View className="flex-row mx-4 mt-4 gap-3">
          <View className="flex-1 bg-surface rounded-xl p-4 items-center">
            <Text className="text-2xl font-bold text-primary">{scheduledCount.events}</Text>
            <Text className="text-sm text-muted">Eventos</Text>
          </View>
          <View className="flex-1 bg-surface rounded-xl p-4 items-center">
            <Text className="text-2xl font-bold text-warning">{scheduledCount.birthdays}</Text>
            <Text className="text-sm text-muted">Aniversários</Text>
          </View>
        </View>

        {/* Event Reminders */}
        <View className="mx-4 mt-6">
          <Text className="text-lg font-bold text-foreground mb-3">
            Lembretes de Eventos
          </Text>

          <View className="bg-surface rounded-xl overflow-hidden">
            <View className="flex-row items-center justify-between p-4 border-b border-border">
              <View className="flex-1 mr-4">
                <Text className="text-foreground font-medium">Ativar lembretes</Text>
                <Text className="text-sm text-muted">Receber notificações de eventos</Text>
              </View>
              <Switch
                value={settings.eventsEnabled}
                onValueChange={(value) => handleToggle('eventsEnabled', value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#ffffff"
              />
            </View>

            <View className="flex-row items-center justify-between p-4 border-b border-border">
              <View className="flex-1 mr-4">
                <Text className={`font-medium ${settings.eventsEnabled ? 'text-foreground' : 'text-muted'}`}>
                  1 dia antes
                </Text>
                <Text className="text-sm text-muted">Lembrete às 9h do dia anterior</Text>
              </View>
              <Switch
                value={settings.eventsDayBefore}
                onValueChange={(value) => handleToggle('eventsDayBefore', value)}
                disabled={!settings.eventsEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#ffffff"
              />
            </View>

            <View className="flex-row items-center justify-between p-4">
              <View className="flex-1 mr-4">
                <Text className={`font-medium ${settings.eventsEnabled ? 'text-foreground' : 'text-muted'}`}>
                  1 hora antes
                </Text>
                <Text className="text-sm text-muted">Lembrete 1 hora antes do evento</Text>
              </View>
              <Switch
                value={settings.eventsHourBefore}
                onValueChange={(value) => handleToggle('eventsHourBefore', value)}
                disabled={!settings.eventsEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>

        {/* Birthday Reminders */}
        <View className="mx-4 mt-6">
          <Text className="text-lg font-bold text-foreground mb-3">
            Lembretes de Aniversários
          </Text>

          <View className="bg-surface rounded-xl overflow-hidden">
            <View className="flex-row items-center justify-between p-4 border-b border-border">
              <View className="flex-1 mr-4">
                <Text className="text-foreground font-medium">Ativar lembretes</Text>
                <Text className="text-sm text-muted">Receber notificações de aniversários</Text>
              </View>
              <Switch
                value={settings.birthdaysEnabled}
                onValueChange={(value) => handleToggle('birthdaysEnabled', value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#ffffff"
              />
            </View>

            <View className="flex-row items-center justify-between p-4">
              <View className="flex-1 mr-4">
                <Text className={`font-medium ${settings.birthdaysEnabled ? 'text-foreground' : 'text-muted'}`}>
                  No dia (8h)
                </Text>
                <Text className="text-sm text-muted">Lembrete às 8h no dia do aniversário</Text>
              </View>
              <Switch
                value={settings.birthdaysMorning}
                onValueChange={(value) => handleToggle('birthdaysMorning', value)}
                disabled={!settings.birthdaysEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>

        {/* Actions */}
        <View className="mx-4 mt-6 mb-8">
          <TouchableOpacity
            className="bg-primary rounded-xl py-4 items-center mb-3"
            onPress={handleRescheduleAll}
            disabled={saving || !hasPermission}
            style={{ opacity: saving || !hasPermission ? 0.5 : 1 }}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-semibold">Atualizar Lembretes</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-error/10 rounded-xl py-4 items-center"
            onPress={handleClearAll}
            disabled={scheduledCount.events === 0 && scheduledCount.birthdays === 0}
            style={{ opacity: scheduledCount.events === 0 && scheduledCount.birthdays === 0 ? 0.5 : 1 }}
          >
            <Text className="text-error font-semibold">Limpar Todos os Lembretes</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
