import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export type ConnectionType = 
  | 'discipleship'    // Encontro de discipulado
  | 'mentoring'       // Mentoria
  | 'counseling'      // Aconselhamento
  | 'visit'           // Visita
  | 'follow_up';      // Acompanhamento

export interface Connection {
  id: string;
  leader_id: string;
  member_id: string;
  member_name: string;
  type: ConnectionType;
  date: string;
  time?: string;
  location?: string;
  notes: string;
  topics: string[];
  next_steps?: string;
  next_meeting_date?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface ConnectionStats {
  total_connections: number;
  this_month: number;
  last_month: number;
  by_type: Record<ConnectionType, number>;
  members_connected: number;
  members_pending: number;
}

const CACHE_KEY = 'connections_cache';

const CONNECTION_TYPE_LABELS: Record<ConnectionType, string> = {
  discipleship: 'Discipulado',
  mentoring: 'Mentoria',
  counseling: 'Aconselhamento',
  visit: 'Visita',
  follow_up: 'Acompanhamento',
};

export const ConnectionService = {
  // Obter label do tipo de conexão
  getTypeLabel(type: ConnectionType): string {
    return CONNECTION_TYPE_LABELS[type] || type;
  },

  // Criar nova conexão
  async createConnection(connection: Omit<Connection, 'id' | 'created_at' | 'updated_at'>): Promise<Connection | null> {
    try {
      const newConnection: Connection = {
        ...connection,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Salvar no cache local
      const cache = await this.getCache();
      cache.connections.push(newConnection);
      await this.saveCache(cache);

      // Tentar salvar no Supabase
      try {
        await supabase.from('connections').insert({
          leader_id: connection.leader_id,
          member_id: connection.member_id,
          type: connection.type,
          date: connection.date,
          time: connection.time,
          location: connection.location,
          notes: connection.notes,
          topics: connection.topics,
          next_steps: connection.next_steps,
          next_meeting_date: connection.next_meeting_date,
          status: connection.status,
        });
      } catch (e) {
        console.log('Connection saved locally, will sync later');
      }

      return newConnection;
    } catch (error) {
      console.error('Error creating connection:', error);
      return null;
    }
  },

  // Obter conexões de um líder
  async getConnections(leaderId: string): Promise<Connection[]> {
    try {
      // Tentar buscar do Supabase primeiro
      try {
        const { data, error } = await supabase
          .from('connections')
          .select('*')
          .eq('leader_id', leaderId)
          .order('date', { ascending: false });

        if (!error && data) {
          // Atualizar cache
          const cache = await this.getCache();
          cache.connections = data.map((c: any) => ({
            ...c,
            topics: c.topics || [],
          }));
          await this.saveCache(cache);
          return cache.connections;
        }
      } catch (e) {
        console.log('Using cached connections');
      }

      // Usar cache local
      const cache = await this.getCache();
      return cache.connections.filter(c => c.leader_id === leaderId);
    } catch (error) {
      console.error('Error getting connections:', error);
      return [];
    }
  },

  // Obter conexões de um membro específico
  async getMemberConnections(memberId: string): Promise<Connection[]> {
    try {
      const cache = await this.getCache();
      return cache.connections
        .filter(c => c.member_id === memberId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('Error getting member connections:', error);
      return [];
    }
  },

  // Atualizar conexão
  async updateConnection(id: string, updates: Partial<Connection>): Promise<Connection | null> {
    try {
      const cache = await this.getCache();
      const index = cache.connections.findIndex(c => c.id === id);
      
      if (index === -1) return null;

      cache.connections[index] = {
        ...cache.connections[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };

      await this.saveCache(cache);

      // Tentar atualizar no Supabase
      try {
        await supabase
          .from('connections')
          .update(updates)
          .eq('id', id);
      } catch (e) {
        console.log('Connection updated locally, will sync later');
      }

      return cache.connections[index];
    } catch (error) {
      console.error('Error updating connection:', error);
      return null;
    }
  },

  // Excluir conexão
  async deleteConnection(id: string): Promise<boolean> {
    try {
      const cache = await this.getCache();
      cache.connections = cache.connections.filter(c => c.id !== id);
      await this.saveCache(cache);

      // Tentar excluir do Supabase
      try {
        await supabase.from('connections').delete().eq('id', id);
      } catch (e) {
        console.log('Connection deleted locally, will sync later');
      }

      return true;
    } catch (error) {
      console.error('Error deleting connection:', error);
      return false;
    }
  },

  // Obter estatísticas de conexões
  async getStats(leaderId: string): Promise<ConnectionStats> {
    try {
      const connections = await this.getConnections(leaderId);
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
      const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

      const thisMonthConnections = connections.filter(c => {
        const date = new Date(c.date);
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear && c.status === 'completed';
      });

      const lastMonthConnections = connections.filter(c => {
        const date = new Date(c.date);
        return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear && c.status === 'completed';
      });

      const byType: Record<ConnectionType, number> = {
        discipleship: 0,
        mentoring: 0,
        counseling: 0,
        visit: 0,
        follow_up: 0,
      };

      const membersSet = new Set<string>();

      connections.forEach(c => {
        if (c.status === 'completed') {
          byType[c.type] = (byType[c.type] || 0) + 1;
          membersSet.add(c.member_id);
        }
      });

      return {
        total_connections: connections.filter(c => c.status === 'completed').length,
        this_month: thisMonthConnections.length,
        last_month: lastMonthConnections.length,
        by_type: byType,
        members_connected: membersSet.size,
        members_pending: 0, // Seria calculado com base na lista de membros
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        total_connections: 0,
        this_month: 0,
        last_month: 0,
        by_type: {
          discipleship: 0,
          mentoring: 0,
          counseling: 0,
          visit: 0,
          follow_up: 0,
        },
        members_connected: 0,
        members_pending: 0,
      };
    }
  },

  // Obter próximas conexões agendadas
  async getUpcoming(leaderId: string, limit: number = 5): Promise<Connection[]> {
    try {
      const connections = await this.getConnections(leaderId);
      const now = new Date();
      
      return connections
        .filter(c => c.status === 'scheduled' && new Date(c.date) >= now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting upcoming connections:', error);
      return [];
    }
  },

  // Cache management
  async getCache(): Promise<{ connections: Connection[] }> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : { connections: [] };
    } catch {
      return { connections: [] };
    }
  },

  async saveCache(cache: { connections: Connection[] }): Promise<void> {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  },

  async clearCache(): Promise<void> {
    await AsyncStorage.removeItem(CACHE_KEY);
  },
};
