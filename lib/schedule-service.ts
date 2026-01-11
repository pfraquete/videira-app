import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Tipos de funções na célula
export type ServiceRole = 
  | 'louvor'
  | 'lanche'
  | 'recepcao'
  | 'oracao'
  | 'palavra'
  | 'kids'
  | 'limpeza'
  | 'outro';

export const SERVICE_ROLE_LABELS: Record<ServiceRole, string> = {
  louvor: 'Louvor',
  lanche: 'Lanche',
  recepcao: 'Recepção',
  oracao: 'Oração',
  palavra: 'Palavra',
  kids: 'Kids',
  limpeza: 'Limpeza',
  outro: 'Outro',
};

export const SERVICE_ROLE_ICONS: Record<ServiceRole, string> = {
  louvor: '🎵',
  lanche: '🍰',
  recepcao: '👋',
  oracao: '🙏',
  palavra: '📖',
  kids: '👶',
  limpeza: '🧹',
  outro: '📋',
};

export interface ScheduleEntry {
  id: string;
  cell_id: string;
  date: string; // YYYY-MM-DD
  role: ServiceRole;
  member_id: string;
  member_name: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduleTemplate {
  id: string;
  cell_id: string;
  name: string;
  roles: ServiceRole[];
  created_at: string;
}

export interface MonthlySchedule {
  month: number;
  year: number;
  entries: ScheduleEntry[];
}

const CACHE_KEY = 'ekkle_schedules';

class ScheduleService {
  // Obter escalas de um mês
  async getMonthlySchedule(cellId: string, year: number, month: number): Promise<ScheduleEntry[]> {
    try {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('cell_id', cellId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) throw error;

      // Cache local
      await this.cacheSchedules(cellId, year, month, data || []);

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar escalas:', error);
      // Tentar cache
      return this.getCachedSchedules(cellId, year, month);
    }
  }

  // Criar entrada de escala
  async createScheduleEntry(entry: Omit<ScheduleEntry, 'id' | 'created_at' | 'updated_at'>): Promise<ScheduleEntry | null> {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .insert({
          ...entry,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao criar escala:', error);
      return null;
    }
  }

  // Atualizar entrada de escala
  async updateScheduleEntry(id: string, updates: Partial<ScheduleEntry>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('schedules')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao atualizar escala:', error);
      return false;
    }
  }

  // Excluir entrada de escala
  async deleteScheduleEntry(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao excluir escala:', error);
      return false;
    }
  }

  // Obter escalas de um membro específico
  async getMemberSchedules(memberId: string, limit: number = 10): Promise<ScheduleEntry[]> {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('member_id', memberId)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar escalas do membro:', error);
      return [];
    }
  }

  // Obter próximas escalas da célula
  async getUpcomingSchedules(cellId: string, days: number = 7): Promise<ScheduleEntry[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('cell_id', cellId)
        .gte('date', today)
        .lte('date', futureDate)
        .order('date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar próximas escalas:', error);
      return [];
    }
  }

  // Gerar escala automática para um mês
  async generateMonthlySchedule(
    cellId: string,
    year: number,
    month: number,
    members: { id: string; name: string }[],
    roles: ServiceRole[],
    meetingDays: number[] // 0 = domingo, 1 = segunda, etc.
  ): Promise<ScheduleEntry[]> {
    const entries: ScheduleEntry[] = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    
    let memberIndex = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();

      if (meetingDays.includes(dayOfWeek)) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        for (const role of roles) {
          const member = members[memberIndex % members.length];
          
          const entry = await this.createScheduleEntry({
            cell_id: cellId,
            date: dateStr,
            role,
            member_id: member.id,
            member_name: member.name,
          });

          if (entry) {
            entries.push(entry);
          }

          memberIndex++;
        }
      }
    }

    return entries;
  }

  // Cache local
  private async cacheSchedules(cellId: string, year: number, month: number, schedules: ScheduleEntry[]): Promise<void> {
    try {
      const key = `${CACHE_KEY}_${cellId}_${year}_${month}`;
      await AsyncStorage.setItem(key, JSON.stringify(schedules));
    } catch (error) {
      console.error('Erro ao cachear escalas:', error);
    }
  }

  private async getCachedSchedules(cellId: string, year: number, month: number): Promise<ScheduleEntry[]> {
    try {
      const key = `${CACHE_KEY}_${cellId}_${year}_${month}`;
      const cached = await AsyncStorage.getItem(key);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Erro ao ler cache de escalas:', error);
      return [];
    }
  }

  // Estatísticas de participação
  async getMemberStats(cellId: string, memberId: string): Promise<{ total: number; byRole: Record<ServiceRole, number> }> {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select('role')
        .eq('cell_id', cellId)
        .eq('member_id', memberId);

      if (error) throw error;

      const byRole: Record<ServiceRole, number> = {
        louvor: 0,
        lanche: 0,
        recepcao: 0,
        oracao: 0,
        palavra: 0,
        kids: 0,
        limpeza: 0,
        outro: 0,
      };

      (data || []).forEach((entry: { role: ServiceRole }) => {
        byRole[entry.role] = (byRole[entry.role] || 0) + 1;
      });

      return {
        total: data?.length || 0,
        byRole,
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return { total: 0, byRole: {} as Record<ServiceRole, number> };
    }
  }
}

export const scheduleService = new ScheduleService();
