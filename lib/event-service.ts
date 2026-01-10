import { supabase } from './supabase';
import { CacheService } from './cache-service';

export interface Event {
  id: number;
  cell_id: number;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  location: string | null;
  event_type: 'reuniao' | 'culto' | 'confraternizacao' | 'evangelismo' | 'outro';
  created_at: string;
  updated_at: string;
}

export interface CreateEventData {
  title: string;
  description?: string;
  event_date: string;
  event_time?: string;
  location?: string;
  event_type: Event['event_type'];
}

export interface UpdateEventData extends Partial<CreateEventData> {}

export class EventService {
  /**
   * Buscar todos os eventos de uma célula (com suporte a cache offline)
   */
  static async getEvents(userId: string): Promise<Event[]> {
    try {
      // Check if offline and try to get from cache
      const isOffline = await CacheService.isOffline();
      if (isOffline) {
        const cachedEvents = await CacheService.getCachedEvents(userId);
        if (cachedEvents) {
          return cachedEvents;
        }
      }

      // Primeiro, buscar a célula do usuário
      const { data: cell } = await supabase
        .from('cells')
        .select('id')
        .eq('leader_id', userId)
        .single();

      if (!cell) {
        return [];
      }

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('cell_id', cell.id)
        .order('event_date', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
        // Try to return cached data on error
        const cachedEvents = await CacheService.getCachedEvents(userId);
        return cachedEvents || [];
      }

      const events = data || [];
      
      // Cache the data for offline use
      await CacheService.cacheEvents(userId, events);

      return events;
    } catch (error) {
      console.error('Error in getEvents:', error);
      // Try to return cached data on error
      const cachedEvents = await CacheService.getCachedEvents(userId);
      return cachedEvents || [];
    }
  }

  /**
   * Buscar eventos futuros
   */
  static async getUpcomingEvents(userId: string, limit: number = 5): Promise<Event[]> {
    try {
      const { data: cell } = await supabase
        .from('cells')
        .select('id')
        .eq('leader_id', userId)
        .single();

      if (!cell) {
        return [];
      }

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('cell_id', cell.id)
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching upcoming events:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUpcomingEvents:', error);
      return [];
    }
  }

  /**
   * Buscar um evento específico
   */
  static async getEvent(eventId: number): Promise<Event | null> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) {
        console.error('Error fetching event:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getEvent:', error);
      return null;
    }
  }

  /**
   * Criar um novo evento
   */
  static async createEvent(userId: string, eventData: CreateEventData): Promise<Event | null> {
    try {
      const { data: cell } = await supabase
        .from('cells')
        .select('id')
        .eq('leader_id', userId)
        .single();

      if (!cell) {
        console.error('Cell not found for user');
        return null;
      }

      const { data, error } = await supabase
        .from('events')
        .insert({
          cell_id: cell.id,
          title: eventData.title,
          description: eventData.description || null,
          event_date: eventData.event_date,
          event_time: eventData.event_time || null,
          location: eventData.location || null,
          event_type: eventData.event_type,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating event:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createEvent:', error);
      return null;
    }
  }

  /**
   * Atualizar um evento existente
   */
  static async updateEvent(eventId: number, eventData: UpdateEventData): Promise<Event | null> {
    try {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (eventData.title !== undefined) updateData.title = eventData.title;
      if (eventData.description !== undefined) updateData.description = eventData.description || null;
      if (eventData.event_date !== undefined) updateData.event_date = eventData.event_date;
      if (eventData.event_time !== undefined) updateData.event_time = eventData.event_time || null;
      if (eventData.location !== undefined) updateData.location = eventData.location || null;
      if (eventData.event_type !== undefined) updateData.event_type = eventData.event_type;

      const { data, error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', eventId)
        .select()
        .single();

      if (error) {
        console.error('Error updating event:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in updateEvent:', error);
      return null;
    }
  }

  /**
   * Excluir um evento
   */
  static async deleteEvent(eventId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) {
        console.error('Error deleting event:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteEvent:', error);
      return false;
    }
  }

  /**
   * Formatar data do evento para exibição
   */
  static formatEventDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });
  }

  /**
   * Formatar horário do evento para exibição
   */
  static formatEventTime(timeStr: string | null): string {
    if (!timeStr) return 'Horário não definido';
    return timeStr.substring(0, 5);
  }

  /**
   * Obter label do tipo de evento
   */
  static getEventTypeLabel(type: Event['event_type']): string {
    const labels: Record<Event['event_type'], string> = {
      reuniao: 'Reunião de Célula',
      culto: 'Culto',
      confraternizacao: 'Confraternização',
      evangelismo: 'Evangelismo',
      outro: 'Outro',
    };
    return labels[type] || type;
  }

  /**
   * Obter cor do tipo de evento
   */
  static getEventTypeColor(type: Event['event_type']): string {
    const colors: Record<Event['event_type'], string> = {
      reuniao: '#6366f1',
      culto: '#8b5cf6',
      confraternizacao: '#f59e0b',
      evangelismo: '#22c55e',
      outro: '#64748b',
    };
    return colors[type] || '#64748b';
  }
}
