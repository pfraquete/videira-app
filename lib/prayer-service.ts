import { supabase } from './supabase';

export interface PrayerRequest {
  id: number;
  user_id: string;
  author_name: string;
  author_id?: string;
  title: string;
  description: string;
  is_anonymous: boolean;
  is_answered: boolean;
  prayer_count: number;
  created_at: string;
  answered_at?: string;
}

export interface PrayerInteraction {
  id: number;
  prayer_request_id: number;
  user_id: string;
  created_at: string;
}

export class PrayerService {
  /**
   * Buscar todos os pedidos de oração da célula
   */
  static async getPrayerRequests(userId: string): Promise<PrayerRequest[]> {
    const { data, error } = await supabase
      .from('prayer_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching prayer requests:', error);
      return [];
    }

    return data as PrayerRequest[];
  }

  /**
   * Buscar pedidos ativos (não respondidos)
   */
  static async getActivePrayerRequests(userId: string): Promise<PrayerRequest[]> {
    const { data, error } = await supabase
      .from('prayer_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('is_answered', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching active prayer requests:', error);
      return [];
    }

    return data as PrayerRequest[];
  }

  /**
   * Buscar pedidos respondidos
   */
  static async getAnsweredPrayerRequests(userId: string): Promise<PrayerRequest[]> {
    const { data, error } = await supabase
      .from('prayer_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('is_answered', true)
      .order('answered_at', { ascending: false });

    if (error) {
      console.error('Error fetching answered prayer requests:', error);
      return [];
    }

    return data as PrayerRequest[];
  }

  /**
   * Criar novo pedido de oração
   */
  static async createPrayerRequest(
    userId: string,
    authorName: string,
    title: string,
    description: string,
    isAnonymous: boolean = false,
    authorId?: string
  ): Promise<PrayerRequest | null> {
    const { data, error } = await supabase
      .from('prayer_requests')
      .insert({
        user_id: userId,
        author_name: isAnonymous ? 'Anônimo' : authorName,
        author_id: isAnonymous ? null : authorId,
        title,
        description,
        is_anonymous: isAnonymous,
        is_answered: false,
        prayer_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating prayer request:', error);
      return null;
    }

    return data as PrayerRequest;
  }

  /**
   * Marcar pedido como respondido
   */
  static async markAsAnswered(prayerId: number): Promise<boolean> {
    const { error } = await supabase
      .from('prayer_requests')
      .update({
        is_answered: true,
        answered_at: new Date().toISOString(),
      })
      .eq('id', prayerId);

    if (error) {
      console.error('Error marking prayer as answered:', error);
      return false;
    }

    return true;
  }

  /**
   * Registrar oração por um pedido
   */
  static async prayFor(prayerId: number, prayerUserId: string): Promise<boolean> {
    // Verificar se já orou
    const { data: existing } = await supabase
      .from('prayer_interactions')
      .select('id')
      .eq('prayer_request_id', prayerId)
      .eq('user_id', prayerUserId)
      .single();

    if (existing) {
      // Já orou por este pedido
      return true;
    }

    // Registrar interação
    const { error: interactionError } = await supabase
      .from('prayer_interactions')
      .insert({
        prayer_request_id: prayerId,
        user_id: prayerUserId,
      });

    if (interactionError) {
      console.error('Error registering prayer interaction:', interactionError);
      return false;
    }

    // Incrementar contador
    const { error: updateError } = await supabase.rpc('increment_prayer_count', {
      prayer_id: prayerId,
    });

    // Se a função RPC não existir, fazer update manual
    if (updateError) {
      const { data: prayer } = await supabase
        .from('prayer_requests')
        .select('prayer_count')
        .eq('id', prayerId)
        .single();

      if (prayer) {
        await supabase
          .from('prayer_requests')
          .update({ prayer_count: (prayer.prayer_count || 0) + 1 })
          .eq('id', prayerId);
      }
    }

    return true;
  }

  /**
   * Verificar se o usuário já orou por um pedido
   */
  static async hasPrayed(prayerId: number, prayerUserId: string): Promise<boolean> {
    const { data } = await supabase
      .from('prayer_interactions')
      .select('id')
      .eq('prayer_request_id', prayerId)
      .eq('user_id', prayerUserId)
      .single();

    return !!data;
  }

  /**
   * Excluir pedido de oração
   */
  static async deletePrayerRequest(prayerId: number): Promise<boolean> {
    // Excluir interações primeiro
    await supabase
      .from('prayer_interactions')
      .delete()
      .eq('prayer_request_id', prayerId);

    const { error } = await supabase
      .from('prayer_requests')
      .delete()
      .eq('id', prayerId);

    if (error) {
      console.error('Error deleting prayer request:', error);
      return false;
    }

    return true;
  }

  /**
   * Contar pedidos ativos
   */
  static async getActiveCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('prayer_requests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_answered', false);

    if (error) {
      console.error('Error counting active prayers:', error);
      return 0;
    }

    return count || 0;
  }
}
