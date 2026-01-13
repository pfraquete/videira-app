import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/lib/auth-context";
import { NotificationService, NotificationSettings } from "@/lib/notification-service";
import { useColors } from "@/hooks/use-colors";

const REMINDER_OPTIONS = [
  { label: '1 hora antes', value: 1 },
  { label: '2 horas antes', value: 2 },
  { label: '6 horas antes', value: 6 },
  { label: '12 horas antes', value: 12 },
  { label: '24 horas antes', value: 24 },
  { label: '48 horas antes', value: 48 },
];

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    birthdayReminders: true,
    eventReminders: true,
    eventReminderHours: 24,
  });

  const loadSettings = useCallback(async () => {
    try {
      const [permission, savedSettings] = await Promise.all([
        NotificationService.hasPermission(),
        NotificationService.getSettings(),
      ]);
      setHasPermission(permission);
      setSettings(savedSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const requestPermission = async () => {
    const granted = await NotificationService.requestPermissions();
    setHasPermission(granted);
    if (!granted) {
      Alert.alert(
        'Permissão Negada',
        'Para receber notificações, você precisa permitir nas configurações do seu dispositivo.',
        [{ text: 'OK' }]
      );
    }
  };

  const updateSetting = async (key: keyof NotificationSettings, value: boolean | number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    setSaving(true);
    try {
      await NotificationService.saveSettings({ [key]: value });
      
      // Sincronizar notificações se necessário
      if (user?.id && (key === 'enabled' || key === 'birthdayReminders' || key === 'eventReminders')) {
        await NotificationService.syncAllNotifications(user.id);
      }
    } catch (error) {
      console.error('Error saving setting:', error);
      Alert.alert('Erro', 'Não foi possível salvar a configuração');
    } finally {
      setSaving(false);
    }
  };

  const syncNotifications = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      await NotificationService.syncAllNotifications(user.id);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert('Sucesso', 'Notificações sincronizadas com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível sincronizar as notificações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  const SettingRow = ({
    icon,
    title,
    description,
    value,
    onValueChange,
    disabled = false,
  }: {
    icon: string;
    title: string;
    description: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    disabled?: boolean;
  }) => (
    <View className="flex-row items-center py-4 border-b border-border">
      <View 
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: colors.primary + '20' }}
      >
        <IconSymbol name={icon as any} size={20} color={colors.primary} />
      </View>
      <View className="flex-1">
        <Text className="text-foreground font-medium">{title}</Text>
        <Text className="text-muted text-sm">{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled || saving}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#ffffff"
      />
    </View>
  );

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View className="flex-row items-center px-6 py-4 border-b border-border">
        <TouchableOpacity
          className="flex-row items-center"
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          <Text className="text-primary ml-1">Voltar</Text>
        </TouchableOpacity>
        <Text className="text-foreground font-bold text-lg ml-4">Notificações</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Permission Status */}
        {Platform.OS !== 'web' && !hasPermission && (
          <View className="mx-6 mt-4 bg-warning/10 rounded-xl p-4 border border-warning/30">
            <View className="flex-row items-center mb-2">
              <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#f59e0b" />
              <Text className="text-foreground font-bold ml-2">Permissão Necessária</Text>
            </View>
            <Text className="text-muted text-sm mb-3">
              Para receber notificações de aniversários e eventos, você precisa permitir o envio de notificações.
            </Text>
            <TouchableOpacity
              className="bg-warning rounded-lg py-2 items-center"
              onPress={requestPermission}
            >
              <Text className="text-background font-medium">Permitir Notificações</Text>
            </TouchableOpacity>
          </View>
        )}

        {Platform.OS === 'web' && (
          <View className="mx-6 mt-4 bg-surface rounded-xl p-4 border border-border">
            <View className="flex-row items-center">
              <IconSymbol name="info.circle.fill" size={20} color={colors.muted} />
              <Text className="text-muted ml-2 flex-1">
                Notificações push não estão disponíveis na versão web. Use o app no seu celular para receber alertas.
              </Text>
            </View>
          </View>
        )}

        {/* Settings */}
        <View className="px-6 mt-4">
          <Text className="text-muted text-sm font-medium mb-2 uppercase">Geral</Text>
          <View className="bg-surface rounded-xl px-4 border border-border">
            <SettingRow
              icon="bell.fill"
              title="Notificações"
              description="Ativar ou desativar todas as notificações"
              value={settings.enabled}
              onValueChange={(value) => updateSetting('enabled', value)}
              disabled={Platform.OS === 'web' || !hasPermission}
            />
          </View>
        </View>

        <View className="px-6 mt-6">
          <Text className="text-muted text-sm font-medium mb-2 uppercase">Lembretes</Text>
          <View className="bg-surface rounded-xl px-4 border border-border">
            <SettingRow
              icon="gift.fill"
              title="Aniversários"
              description="Receber lembretes de aniversários dos membros"
              value={settings.birthdayReminders}
              onValueChange={(value) => updateSetting('birthdayReminders', value)}
              disabled={!settings.enabled || Platform.OS === 'web' || !hasPermission}
            />
            <SettingRow
              icon="calendar"
              title="Eventos"
              description="Receber lembretes de eventos próximos"
              value={settings.eventReminders}
              onValueChange={(value) => updateSetting('eventReminders', value)}
              disabled={!settings.enabled || Platform.OS === 'web' || !hasPermission}
            />
          </View>
        </View>

        {/* Event Reminder Time */}
        {settings.eventReminders && settings.enabled && (
          <View className="px-6 mt-6">
            <Text className="text-muted text-sm font-medium mb-2 uppercase">
              Antecedência do Lembrete de Evento
            </Text>
            <View className="bg-surface rounded-xl p-4 border border-border">
              <View className="flex-row flex-wrap gap-2">
                {REMINDER_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    className={`px-4 py-2 rounded-full border ${
                      settings.eventReminderHours === option.value
                        ? 'bg-primary border-primary'
                        : 'bg-background border-border'
                    }`}
                    onPress={() => updateSetting('eventReminderHours', option.value)}
                    disabled={saving}
                  >
                    <Text
                      className={
                        settings.eventReminderHours === option.value
                          ? 'text-background font-medium'
                          : 'text-foreground'
                      }
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Sync Button */}
        {Platform.OS !== 'web' && hasPermission && settings.enabled && (
          <View className="px-6 mt-6">
            <TouchableOpacity
              className="bg-primary rounded-xl py-4 items-center flex-row justify-center"
              onPress={syncNotifications}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <IconSymbol name="arrow.clockwise" size={20} color="#ffffff" />
                  <Text className="text-background font-bold ml-2">Sincronizar Notificações</Text>
                </>
              )}
            </TouchableOpacity>
            <Text className="text-muted text-sm text-center mt-2">
              Atualiza os lembretes de aniversários e eventos com base nos dados atuais.
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
