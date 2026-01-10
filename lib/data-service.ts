import { supabase, Cell, Member, Attendance, CellEvent } from './supabase';
import { CacheService } from './cache-service';

export class DataService {
  // ==================== CELL OPERATIONS ====================

  /**
   * Buscar célula do líder
   */
  static async getCell(userId: string): Promise<Cell | null> {
    const { data, error } = await supabase
      .from('cells')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching cell:', error);
      return null;
    }

    return data as Cell;
  }

  /**
   * Buscar estatísticas da célula
   */
  static async getCellStats(userId: string): Promise<{
    totalMembers: number;
    activeMembers: number;
    averageAttendance: number;
    upcomingEvents: number;
  }> {
    // Total de membros
    const { count: totalMembers } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Membros ativos
    const { count: activeMembers } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'Ativo');

    // Média de presença (últimas 4 semanas)
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('present')
      .eq('user_id', userId)
      .gte('date', fourWeeksAgo.toISOString().split('T')[0]);

    let averageAttendance = 0;
    if (attendanceData && attendanceData.length > 0) {
      const presentCount = attendanceData.filter(a => a.present).length;
      averageAttendance = Math.round((presentCount / attendanceData.length) * 100);
    }

    // Próximos eventos
    const { count: upcomingEvents } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('data_inicial', new Date().toISOString());

    return {
      totalMembers: totalMembers || 0,
      activeMembers: activeMembers || 0,
      averageAttendance,
      upcomingEvents: upcomingEvents || 0,
    };
  }

  // ==================== MEMBER OPERATIONS ====================

  /**
   * Listar membros da célula (com suporte a cache offline)
   */
  static async getMembers(userId: string): Promise<Member[]> {
    // Check if offline and try to get from cache
    const isOffline = await CacheService.isOffline();
    if (isOffline) {
      const cachedMembers = await CacheService.getCachedMembers(userId);
      if (cachedMembers) {
        return cachedMembers;
      }
    }

    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', userId)
      .order('nome');

    if (error) {
      console.error('Error fetching members:', error);
      // Try to return cached data on error
      const cachedMembers = await CacheService.getCachedMembers(userId);
      return cachedMembers || [];
    }

    const members = data as Member[];
    
    // Cache the data for offline use
    await CacheService.cacheMembers(userId, members);
    await CacheService.setLastSync();

    return members;
  }

  /**
   * Buscar membro por ID
   */
  static async getMember(memberId: number): Promise<Member | null> {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (error) {
      console.error('Error fetching member:', error);
      return null;
    }

    return data as Member;
  }

  /**
   * Criar novo membro
   */
  static async createMember(userId: string, member: Partial<Member>): Promise<Member | null> {
    const { data, error } = await supabase
      .from('members')
      .insert({
        user_id: userId,
        nome: member.nome,
        telefone: member.telefone,
        email: member.email,
        endereco: member.endereco,
        data_nascimento: member.data_nascimento,
        genero: member.genero,
        funcao: member.funcao || 'Membro',
        status: member.status || 'Ativo',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating member:', error);
      return null;
    }

    return data as Member;
  }

  /**
   * Atualizar membro
   */
  static async updateMember(memberId: number, updates: Partial<Member>): Promise<Member | null> {
    const { data, error } = await supabase
      .from('members')
      .update(updates)
      .eq('id', memberId)
      .select()
      .single();

    if (error) {
      console.error('Error updating member:', error);
      return null;
    }

    return data as Member;
  }

  /**
   * Deletar membro
   */
  static async deleteMember(memberId: number): Promise<boolean> {
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', memberId);

    if (error) {
      console.error('Error deleting member:', error);
      return false;
    }

    return true;
  }

  /**
   * Buscar aniversariantes do mês
   */
  static async getBirthdaysThisMonth(userId: string): Promise<Member[]> {
    const currentMonth = new Date().getMonth() + 1;
    const monthStr = currentMonth.toString().padStart(2, '0');

    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'Ativo')
      .not('data_nascimento', 'is', null);

    if (error) {
      console.error('Error fetching birthdays:', error);
      return [];
    }

    // Filter by month (data_nascimento is in format YYYY-MM-DD)
    const birthdays = (data || []).filter(member => {
      if (!member.data_nascimento) return false;
      const memberMonth = member.data_nascimento.split('-')[1];
      return memberMonth === monthStr;
    });

    return birthdays as Member[];
  }

  // ==================== ATTENDANCE OPERATIONS ====================

  /**
   * Buscar presenças por data
   */
  static async getAttendanceByDate(userId: string, date: string): Promise<Attendance[]> {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date);

    if (error) {
      console.error('Error fetching attendance:', error);
      return [];
    }

    return data as Attendance[];
  }

  /**
   * Registrar presença
   */
  static async saveAttendance(
    userId: string,
    memberId: number,
    date: string,
    present: boolean
  ): Promise<boolean> {
    // Check if attendance already exists
    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('user_id', userId)
      .eq('member_id', memberId)
      .eq('date', date)
      .single();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('attendance')
        .update({ present })
        .eq('id', existing.id);

      if (error) {
        console.error('Error updating attendance:', error);
        return false;
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('attendance')
        .insert({
          user_id: userId,
          member_id: memberId,
          date,
          present,
        });

      if (error) {
        console.error('Error creating attendance:', error);
        return false;
      }
    }

    return true;
  }

  /**
   * Salvar múltiplas presenças de uma vez
   */
  static async saveBulkAttendance(
    userId: string,
    date: string,
    attendanceList: { memberId: number; present: boolean }[]
  ): Promise<boolean> {
    for (const item of attendanceList) {
      const success = await this.saveAttendance(userId, item.memberId, date, item.present);
      if (!success) return false;
    }
    return true;
  }

  // ==================== EVENT OPERATIONS ====================

  /**
   * Listar eventos da célula
   */
  static async getEvents(userId: string): Promise<CellEvent[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .order('data_inicial', { ascending: true });

    if (error) {
      console.error('Error fetching events:', error);
      return [];
    }

    return data as CellEvent[];
  }

  /**
   * Buscar próximos eventos
   */
  static async getUpcomingEvents(userId: string, limit: number = 5): Promise<CellEvent[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .gte('data_inicial', new Date().toISOString())
      .order('data_inicial', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching upcoming events:', error);
      return [];
    }

    return data as CellEvent[];
  }

  /**
   * Criar evento
   */
  static async createEvent(userId: string, event: Partial<CellEvent>): Promise<CellEvent | null> {
    const { data, error } = await supabase
      .from('events')
      .insert({
        user_id: userId,
        titulo: event.titulo,
        descricao: event.descricao,
        data_inicial: event.data_inicial,
        data_final: event.data_final,
        tipo: event.tipo,
        local: event.local,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      return null;
    }

    return data as CellEvent;
  }
}
