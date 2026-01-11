import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Configurar como as notificações devem ser apresentadas
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface ReminderSettings {
  eventsEnabled: boolean;
  eventsDayBefore: boolean;
  eventsHourBefore: boolean;
  birthdaysEnabled: boolean;
  birthdaysMorning: boolean;
}

export interface ScheduledReminder {
  id: string;
  notificationId: string;
  type: 'event' | 'birthday';
  targetId: string | number;
  title: string;
  scheduledFor: string;
}

const REMINDER_SETTINGS_KEY = '@ekkle_reminder_settings';
const SCHEDULED_REMINDERS_KEY = '@ekkle_scheduled_reminders';

const DEFAULT_SETTINGS: ReminderSettings = {
  eventsEnabled: true,
  eventsDayBefore: true,
  eventsHourBefore: true,
  birthdaysEnabled: true,
  birthdaysMorning: true,
};

export class ReminderService {
  static async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  }

  static async hasPermission(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  static async getSettings(): Promise<ReminderSettings> {
    try {
      const stored = await AsyncStorage.getItem(REMINDER_SETTINGS_KEY);
      if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      return DEFAULT_SETTINGS;
    } catch (error) {
      return DEFAULT_SETTINGS;
    }
  }

  static async saveSettings(settings: ReminderSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving reminder settings:', error);
    }
  }

  static async getScheduledReminders(): Promise<ScheduledReminder[]> {
    try {
      const stored = await AsyncStorage.getItem(SCHEDULED_REMINDERS_KEY);
      if (stored) return JSON.parse(stored);
      return [];
    } catch (error) {
      return [];
    }
  }

  static async saveScheduledReminders(reminders: ScheduledReminder[]): Promise<void> {
    try {
      await AsyncStorage.setItem(SCHEDULED_REMINDERS_KEY, JSON.stringify(reminders));
    } catch (error) {
      console.error('Error saving scheduled reminders:', error);
    }
  }

  static async scheduleEventReminder(
    eventId: number,
    eventTitle: string,
    eventDate: Date,
    reminderType: 'day_before' | 'hour_before'
  ): Promise<string | null> {
    if (Platform.OS === 'web') return null;
    const hasPermission = await this.hasPermission();
    if (!hasPermission) return null;
    const settings = await this.getSettings();
    if (!settings.eventsEnabled) return null;
    if (reminderType === 'day_before' && !settings.eventsDayBefore) return null;
    if (reminderType === 'hour_before' && !settings.eventsHourBefore) return null;

    const reminderDate = new Date(eventDate);
    if (reminderType === 'day_before') {
      reminderDate.setDate(reminderDate.getDate() - 1);
      reminderDate.setHours(9, 0, 0, 0);
    } else {
      reminderDate.setHours(reminderDate.getHours() - 1);
    }

    if (reminderDate <= new Date()) return null;

    const title = reminderType === 'day_before' ? '📅 Evento amanhã!' : '⏰ Evento em 1 hora!';

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: { title, body: eventTitle, data: { type: 'event', eventId }, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderDate },
      });

      const reminders = await this.getScheduledReminders();
      const newReminder: ScheduledReminder = {
        id: `event-${eventId}-${reminderType}`,
        notificationId,
        type: 'event',
        targetId: eventId,
        title: eventTitle,
        scheduledFor: reminderDate.toISOString(),
      };
      const filteredReminders = reminders.filter(r => r.id !== newReminder.id);
      filteredReminders.push(newReminder);
      await this.saveScheduledReminders(filteredReminders);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling event reminder:', error);
      return null;
    }
  }

  static async scheduleBirthdayReminder(
    memberId: string,
    memberName: string,
    birthdayDate: Date
  ): Promise<string | null> {
    if (Platform.OS === 'web') return null;
    const hasPermission = await this.hasPermission();
    if (!hasPermission) return null;
    const settings = await this.getSettings();
    if (!settings.birthdaysEnabled) return null;

    const reminderDate = new Date(birthdayDate);
    reminderDate.setHours(8, 0, 0, 0);
    if (reminderDate <= new Date()) {
      reminderDate.setFullYear(reminderDate.getFullYear() + 1);
    }

    const firstName = memberName.split(' ')[0];

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎂 Aniversário hoje!',
          body: `Hoje é aniversário de ${firstName}! Não esqueça de parabenizar.`,
          data: { type: 'birthday', memberId },
          sound: true,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderDate },
      });

      const reminders = await this.getScheduledReminders();
      const newReminder: ScheduledReminder = {
        id: `birthday-${memberId}`,
        notificationId,
        type: 'birthday',
        targetId: memberId,
        title: memberName,
        scheduledFor: reminderDate.toISOString(),
      };
      const filteredReminders = reminders.filter(r => r.id !== newReminder.id);
      filteredReminders.push(newReminder);
      await this.saveScheduledReminders(filteredReminders);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling birthday reminder:', error);
      return null;
    }
  }

  static async cancelReminder(reminderId: string): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      const reminders = await this.getScheduledReminders();
      const reminder = reminders.find(r => r.id === reminderId);
      if (reminder) {
        await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
        const filteredReminders = reminders.filter(r => r.id !== reminderId);
        await this.saveScheduledReminders(filteredReminders);
      }
    } catch (error) {
      console.error('Error canceling reminder:', error);
    }
  }

  static async cancelEventReminders(eventId: number): Promise<void> {
    await this.cancelReminder(`event-${eventId}-day_before`);
    await this.cancelReminder(`event-${eventId}-hour_before`);
  }

  static async cancelBirthdayReminder(memberId: string): Promise<void> {
    await this.cancelReminder(`birthday-${memberId}`);
  }

  static async cancelAllReminders(): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await this.saveScheduledReminders([]);
    } catch (error) {
      console.error('Error canceling all reminders:', error);
    }
  }

  static async scheduleAllEventReminders(
    events: Array<{ id: number; title: string; event_date: string; event_time?: string | null }>
  ): Promise<void> {
    const settings = await this.getSettings();
    if (!settings.eventsEnabled) return;

    for (const event of events) {
      const eventDate = new Date(event.event_date);
      if (event.event_time) {
        const [hours, minutes] = event.event_time.split(':').map(Number);
        eventDate.setHours(hours, minutes, 0, 0);
      } else {
        eventDate.setHours(19, 30, 0, 0);
      }

      if (eventDate > new Date()) {
        if (settings.eventsDayBefore) {
          await this.scheduleEventReminder(event.id, event.title, eventDate, 'day_before');
        }
        if (settings.eventsHourBefore) {
          await this.scheduleEventReminder(event.id, event.title, eventDate, 'hour_before');
        }
      }
    }
  }

  static async scheduleAllBirthdayReminders(
    members: Array<{ id: string; nome: string; data_nascimento?: string | null }>
  ): Promise<void> {
    const settings = await this.getSettings();
    if (!settings.birthdaysEnabled) return;

    const currentYear = new Date().getFullYear();
    for (const member of members) {
      if (member.data_nascimento) {
        const birthDate = new Date(member.data_nascimento);
        const birthdayThisYear = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
        await this.scheduleBirthdayReminder(member.id, member.nome, birthdayThisYear);
      }
    }
  }

  static async rescheduleAllReminders(
    events: Array<{ id: number; title: string; event_date: string; event_time?: string | null }>,
    members: Array<{ id: string; nome: string; data_nascimento?: string | null }>
  ): Promise<void> {
    await this.cancelAllReminders();
    await this.scheduleAllEventReminders(events);
    await this.scheduleAllBirthdayReminders(members);
  }

  static async getScheduledCount(): Promise<{ events: number; birthdays: number }> {
    const reminders = await this.getScheduledReminders();
    return {
      events: reminders.filter(r => r.type === 'event').length,
      birthdays: reminders.filter(r => r.type === 'birthday').length,
    };
  }
}
