import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DataService } from './data-service';
import { Member, CellEvent } from './supabase';

const NOTIFICATION_SETTINGS_KEY = '@ekkle_notification_settings';

export interface NotificationSettings {
  enabled: boolean;
  birthdayReminders: boolean;
  eventReminders: boolean;
  eventReminderHours: number; // Horas antes do evento para lembrar
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  birthdayReminders: true,
  eventReminders: true,
  eventReminderHours: 24,
};

// Configurar como as notificações devem ser exibidas
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  // ==================== PERMISSÕES ====================

  /**
   * Solicitar permissão para notificações
   */
  static async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  /**
   * Verificar se tem permissão
   */
  static async hasPermission(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return false;
    }

    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  // ==================== CONFIGURAÇÕES ====================

  /**
   * Obter configurações de notificação
   */
  static async getSettings(): Promise<NotificationSettings> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error getting notification settings:', error);
    }
    return DEFAULT_SETTINGS;
  }

  /**
   * Salvar configurações de notificação
   */
  static async saveSettings(settings: Partial<NotificationSettings>): Promise<void> {
    try {
      const current = await this.getSettings();
      const updated = { ...current, ...settings };
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  }

  // ==================== NOTIFICAÇÕES LOCAIS ====================

  /**
   * Agendar notificação de aniversário
   */
  static async scheduleBirthdayNotification(member: Member): Promise<string | null> {
    if (Platform.OS === 'web' || !member.data_nascimento) {
      return null;
    }

    const settings = await this.getSettings();
    if (!settings.enabled || !settings.birthdayReminders) {
      return null;
    }

    try {
      // Calcular próximo aniversário
      const today = new Date();
      const birthDate = new Date(member.data_nascimento + 'T00:00:00');
      const nextBirthday = new Date(
        today.getFullYear(),
        birthDate.getMonth(),
        birthDate.getDate(),
        9, // 9h da manhã
        0
      );

      // Se já passou este ano, agendar para o próximo
      if (nextBirthday < today) {
        nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
      }

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎂 Aniversário Hoje!',
          body: `Hoje é aniversário de ${member.nome}! Não esqueça de parabenizar.`,
          data: { type: 'birthday', memberId: member.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: nextBirthday,
        },
      });

      return id;
    } catch (error) {
      console.error('Error scheduling birthday notification:', error);
      return null;
    }
  }

  /**
   * Agendar notificação de evento
   */
  static async scheduleEventNotification(event: CellEvent): Promise<string | null> {
    if (Platform.OS === 'web' || !event.data_inicial) {
      return null;
    }

    const settings = await this.getSettings();
    if (!settings.enabled || !settings.eventReminders) {
      return null;
    }

    try {
      const eventDate = new Date(event.data_inicial);
      const reminderDate = new Date(eventDate.getTime() - settings.eventReminderHours * 60 * 60 * 1000);

      // Não agendar se já passou
      if (reminderDate < new Date()) {
        return null;
      }

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '📅 Evento Próximo',
          body: `${event.titulo} acontece em ${settings.eventReminderHours}h${event.local ? ` - ${event.local}` : ''}`,
          data: { type: 'event', eventId: event.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderDate,
        },
      });

      return id;
    } catch (error) {
      console.error('Error scheduling event notification:', error);
      return null;
    }
  }

  /**
   * Enviar notificação imediata
   */
  static async sendImmediateNotification(
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<string | null> {
    if (Platform.OS === 'web') {
      return null;
    }

    const settings = await this.getSettings();
    if (!settings.enabled) {
      return null;
    }

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: null, // Imediato
      });

      return id;
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  }

  /**
   * Cancelar notificação agendada
   */
  static async cancelNotification(notificationId: string): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  /**
   * Cancelar todas as notificações
   */
  static async cancelAllNotifications(): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  /**
   * Obter notificações agendadas
   */
  static async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    if (Platform.OS === 'web') return [];

    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  // ==================== SINCRONIZAÇÃO ====================

  /**
   * Sincronizar notificações de aniversários
   */
  static async syncBirthdayNotifications(userId: string): Promise<void> {
    if (Platform.OS === 'web') return;

    const settings = await this.getSettings();
    if (!settings.enabled || !settings.birthdayReminders) {
      return;
    }

    try {
      // Cancelar notificações de aniversário existentes
      const scheduled = await this.getScheduledNotifications();
      for (const notification of scheduled) {
        if (notification.content.data?.type === 'birthday') {
          await this.cancelNotification(notification.identifier);
        }
      }

      // Buscar membros e agendar novas notificações
      const members = await DataService.getMembers(userId);
      for (const member of members) {
        if (member.data_nascimento && member.status === 'Ativo') {
          await this.scheduleBirthdayNotification(member);
        }
      }
    } catch (error) {
      console.error('Error syncing birthday notifications:', error);
    }
  }

  /**
   * Sincronizar notificações de eventos
   */
  static async syncEventNotifications(userId: string): Promise<void> {
    if (Platform.OS === 'web') return;

    const settings = await this.getSettings();
    if (!settings.enabled || !settings.eventReminders) {
      return;
    }

    try {
      // Cancelar notificações de evento existentes
      const scheduled = await this.getScheduledNotifications();
      for (const notification of scheduled) {
        if (notification.content.data?.type === 'event') {
          await this.cancelNotification(notification.identifier);
        }
      }

      // Buscar eventos e agendar novas notificações
      const events = await DataService.getUpcomingEvents(userId, 10);
      for (const event of events) {
        await this.scheduleEventNotification(event);
      }
    } catch (error) {
      console.error('Error syncing event notifications:', error);
    }
  }

  /**
   * Sincronizar todas as notificações
   */
  static async syncAllNotifications(userId: string): Promise<void> {
    await Promise.all([
      this.syncBirthdayNotifications(userId),
      this.syncEventNotifications(userId),
    ]);
  }
}
