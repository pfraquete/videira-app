import { supabase } from './supabase';

// Types
export interface Pastor {
  id: number;
  user_id: string;
  nome: string;
  email: string;
  telefone?: string;
  created_at: string;
}

export interface Discipulador {
  id: number;
  user_id: string;
  pastor_id: number;
  nome: string;
  email: string;
  telefone?: string;
  created_at: string;
}

export interface CellSummary {
  cell_user_id: string;
  cell_name: string;
  leader_name: string;
  leader_email: string;
  total_members: number;
  active_members: number;
  average_attendance: number;
  meeting_day?: string;
  meeting_time?: string;
}

export interface DiscipuladorSummary {
  discipulador_id: number;
  discipulador_user_id: string;
  discipulador_name: string;
  discipulador_email: string;
  total_cells: number;
  total_members: number;
}

export interface PastorStats {
  total_discipuladores: number;
  total_cells: number;
  total_members: number;
  average_attendance: number;
}

export interface DiscipuladorStats {
  total_cells: number;
  total_members: number;
  average_attendance: number;
}

export class HierarchyService {
  // ==================== VERIFICAÇÃO DE ROLES ====================

  /**
   * Verifica se usuário é Pastor
   */
  static async isPastor(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('pastores')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (error) return false;
    return !!data;
  }

  /**
   * Verifica se usuário é Discipulador
   */
  static async isDiscipulador(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('discipuladores')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (error) return false;
    return !!data;
  }

  // ==================== PASTOR OPERATIONS ====================

  /**
   * Obtém dados de um Pastor
   */
  static async getPastor(userId: string): Promise<Pastor | null> {
    const { data, error } = await supabase
      .from('pastores')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) return null;
    return data as Pastor;
  }

  /**
   * Obtém estatísticas de um Pastor
   */
  static async getPastorStats(userId: string): Promise<PastorStats> {
    try {
      // Buscar o pastor
      const { data: pastor } = await supabase
        .from('pastores')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!pastor) {
        return { total_discipuladores: 0, total_cells: 0, total_members: 0, average_attendance: 0 };
      }

      // Buscar discipuladores do pastor
      const { data: discipuladores } = await supabase
        .from('discipuladores')
        .select('id, user_id')
        .eq('pastor_id', pastor.id);

      const discipuladorIds = discipuladores?.map(d => d.id) || [];
      const discipuladorUserIds = discipuladores?.map(d => d.user_id) || [];

      // Buscar células atribuídas aos discipuladores
      const { data: assignments } = await supabase
        .from('cell_assignments')
        .select('cell_user_id')
        .in('discipulador_id', discipuladorIds.length > 0 ? discipuladorIds : [-1]);

      const cellUserIds = assignments?.map(a => a.cell_user_id) || [];

      // Contar membros das células
      let totalMembers = 0;
      if (cellUserIds.length > 0) {
        const { count } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .in('user_id', cellUserIds);
        totalMembers = count || 0;
      }

      // Calcular média de presença
      let averageAttendance = 0;
      if (cellUserIds.length > 0) {
        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

        const { data: attendanceData } = await supabase
          .from('attendance')
          .select('present')
          .in('user_id', cellUserIds)
          .gte('date', fourWeeksAgo.toISOString().split('T')[0]);

        if (attendanceData && attendanceData.length > 0) {
          const presentCount = attendanceData.filter(a => a.present).length;
          averageAttendance = Math.round((presentCount / attendanceData.length) * 100);
        }
      }

      return {
        total_discipuladores: discipuladores?.length || 0,
        total_cells: cellUserIds.length,
        total_members: totalMembers,
        average_attendance: averageAttendance,
      };
    } catch (error) {
      console.error('Error getting pastor stats:', error);
      return { total_discipuladores: 0, total_cells: 0, total_members: 0, average_attendance: 0 };
    }
  }

  /**
   * Obtém discipuladores de um Pastor
   */
  static async getPastorDiscipuladores(userId: string): Promise<DiscipuladorSummary[]> {
    try {
      // Buscar o pastor
      const { data: pastor } = await supabase
        .from('pastores')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!pastor) return [];

      // Buscar discipuladores
      const { data: discipuladores } = await supabase
        .from('discipuladores')
        .select('*')
        .eq('pastor_id', pastor.id)
        .order('nome');

      if (!discipuladores) return [];

      // Para cada discipulador, buscar estatísticas
      const summaries: DiscipuladorSummary[] = [];
      for (const disc of discipuladores) {
        // Buscar células atribuídas
        const { data: assignments } = await supabase
          .from('cell_assignments')
          .select('cell_user_id')
          .eq('discipulador_id', disc.id);

        const cellUserIds = assignments?.map(a => a.cell_user_id) || [];

        // Contar membros
        let totalMembers = 0;
        if (cellUserIds.length > 0) {
          const { count } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .in('user_id', cellUserIds);
          totalMembers = count || 0;
        }

        summaries.push({
          discipulador_id: disc.id,
          discipulador_user_id: disc.user_id,
          discipulador_name: disc.nome,
          discipulador_email: disc.email,
          total_cells: cellUserIds.length,
          total_members: totalMembers,
        });
      }

      return summaries;
    } catch (error) {
      console.error('Error getting pastor discipuladores:', error);
      return [];
    }
  }

  /**
   * Obtém células de um Pastor (todas as células dos discipuladores)
   */
  static async getPastorCells(userId: string): Promise<CellSummary[]> {
    try {
      // Buscar o pastor
      const { data: pastor } = await supabase
        .from('pastores')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!pastor) return [];

      // Buscar discipuladores
      const { data: discipuladores } = await supabase
        .from('discipuladores')
        .select('id')
        .eq('pastor_id', pastor.id);

      const discipuladorIds = discipuladores?.map(d => d.id) || [];
      if (discipuladorIds.length === 0) return [];

      // Buscar células atribuídas
      const { data: assignments } = await supabase
        .from('cell_assignments')
        .select('cell_user_id')
        .in('discipulador_id', discipuladorIds);

      const cellUserIds = assignments?.map(a => a.cell_user_id) || [];
      if (cellUserIds.length === 0) return [];

      return this.getCellsSummary(cellUserIds);
    } catch (error) {
      console.error('Error getting pastor cells:', error);
      return [];
    }
  }

  // ==================== DISCIPULADOR OPERATIONS ====================

  /**
   * Obtém dados de um Discipulador
   */
  static async getDiscipulador(userId: string): Promise<Discipulador | null> {
    const { data, error } = await supabase
      .from('discipuladores')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) return null;
    return data as Discipulador;
  }

  /**
   * Obtém estatísticas de um Discipulador
   */
  static async getDiscipuladorStats(userId: string): Promise<DiscipuladorStats> {
    try {
      // Buscar o discipulador
      const { data: discipulador } = await supabase
        .from('discipuladores')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!discipulador) {
        return { total_cells: 0, total_members: 0, average_attendance: 0 };
      }

      // Buscar células atribuídas
      const { data: assignments } = await supabase
        .from('cell_assignments')
        .select('cell_user_id')
        .eq('discipulador_id', discipulador.id);

      const cellUserIds = assignments?.map(a => a.cell_user_id) || [];

      // Contar membros
      let totalMembers = 0;
      if (cellUserIds.length > 0) {
        const { count } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .in('user_id', cellUserIds);
        totalMembers = count || 0;
      }

      // Calcular média de presença
      let averageAttendance = 0;
      if (cellUserIds.length > 0) {
        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

        const { data: attendanceData } = await supabase
          .from('attendance')
          .select('present')
          .in('user_id', cellUserIds)
          .gte('date', fourWeeksAgo.toISOString().split('T')[0]);

        if (attendanceData && attendanceData.length > 0) {
          const presentCount = attendanceData.filter(a => a.present).length;
          averageAttendance = Math.round((presentCount / attendanceData.length) * 100);
        }
      }

      return {
        total_cells: cellUserIds.length,
        total_members: totalMembers,
        average_attendance: averageAttendance,
      };
    } catch (error) {
      console.error('Error getting discipulador stats:', error);
      return { total_cells: 0, total_members: 0, average_attendance: 0 };
    }
  }

  /**
   * Obtém células de um Discipulador
   */
  static async getDiscipuladorCells(userId: string): Promise<CellSummary[]> {
    try {
      // Buscar o discipulador
      const { data: discipulador } = await supabase
        .from('discipuladores')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!discipulador) return [];

      // Buscar células atribuídas
      const { data: assignments } = await supabase
        .from('cell_assignments')
        .select('cell_user_id')
        .eq('discipulador_id', discipulador.id);

      const cellUserIds = assignments?.map(a => a.cell_user_id) || [];
      if (cellUserIds.length === 0) return [];

      return this.getCellsSummary(cellUserIds);
    } catch (error) {
      console.error('Error getting discipulador cells:', error);
      return [];
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Obtém resumo de células por IDs de usuário
   */
  private static async getCellsSummary(cellUserIds: string[]): Promise<CellSummary[]> {
    const summaries: CellSummary[] = [];

    for (const cellUserId of cellUserIds) {
      // Buscar dados da célula
      const { data: cell } = await supabase
        .from('cells')
        .select('*')
        .eq('user_id', cellUserId)
        .single();

      if (!cell) continue;

      // Buscar perfil do líder
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('nome_completo, email')
        .eq('user_id', cellUserId)
        .single();

      // Contar membros
      const { count: totalMembers } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', cellUserId);

      const { count: activeMembers } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', cellUserId)
        .eq('status', 'Ativo');

      // Calcular média de presença
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('present')
        .eq('user_id', cellUserId)
        .gte('date', fourWeeksAgo.toISOString().split('T')[0]);

      let averageAttendance = 0;
      if (attendanceData && attendanceData.length > 0) {
        const presentCount = attendanceData.filter(a => a.present).length;
        averageAttendance = Math.round((presentCount / attendanceData.length) * 100);
      }

      summaries.push({
        cell_user_id: cellUserId,
        cell_name: cell.cell_name,
        leader_name: profile?.nome_completo || 'Líder',
        leader_email: profile?.email || '',
        total_members: totalMembers || 0,
        active_members: activeMembers || 0,
        average_attendance: averageAttendance,
        meeting_day: cell.meeting_day,
        meeting_time: cell.meeting_time,
      });
    }

    return summaries;
  }
}
