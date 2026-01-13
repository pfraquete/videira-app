import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export type MultiplicationStatus = 
  | 'planning'      // Em planejamento
  | 'preparing'     // Preparando
  | 'in_progress'   // Em andamento
  | 'completed'     // Concluída
  | 'cancelled';    // Cancelada

export interface MultiplicationPlan {
  id: string;
  original_cell_id: string;
  original_cell_name: string;
  new_cell_name: string;
  new_leader_id?: string;
  new_leader_name?: string;
  target_date: string;
  status: MultiplicationStatus;
  members_to_transfer: MemberAllocation[];
  notes: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface MemberAllocation {
  member_id: string;
  member_name: string;
  destination: 'original' | 'new';
  role?: string;
}

export interface MultiplicationStats {
  total_multiplications: number;
  completed: number;
  in_progress: number;
  planned: number;
}

const CACHE_KEY = 'multiplication_cache';

export const MultiplicationService = {
  // Criar plano de multiplicação
  async createPlan(plan: Omit<MultiplicationPlan, 'id' | 'created_at' | 'updated_at'>): Promise<MultiplicationPlan | null> {
    try {
      const newPlan: MultiplicationPlan = {
        ...plan,
        id: `mult-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const cache = await this.getCache();
      cache.plans.push(newPlan);
      await this.saveCache(cache);

      // Tentar salvar no Supabase
      try {
        await supabase.from('multiplication_plans').insert({
          original_cell_id: plan.original_cell_id,
          new_cell_name: plan.new_cell_name,
          new_leader_id: plan.new_leader_id,
          target_date: plan.target_date,
          status: plan.status,
          members_to_transfer: plan.members_to_transfer,
          notes: plan.notes,
        });
      } catch (e) {
        console.log('Multiplication plan saved locally, will sync later');
      }

      return newPlan;
    } catch (error) {
      console.error('Error creating multiplication plan:', error);
      return null;
    }
  },

  // Obter planos de multiplicação de uma célula
  async getPlans(cellId: string): Promise<MultiplicationPlan[]> {
    try {
      const cache = await this.getCache();
      return cache.plans
        .filter(p => p.original_cell_id === cellId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      console.error('Error getting multiplication plans:', error);
      return [];
    }
  },

  // Obter um plano específico
  async getPlan(planId: string): Promise<MultiplicationPlan | null> {
    try {
      const cache = await this.getCache();
      return cache.plans.find(p => p.id === planId) || null;
    } catch (error) {
      console.error('Error getting plan:', error);
      return null;
    }
  },

  // Atualizar plano
  async updatePlan(id: string, updates: Partial<MultiplicationPlan>): Promise<MultiplicationPlan | null> {
    try {
      const cache = await this.getCache();
      const index = cache.plans.findIndex(p => p.id === id);
      
      if (index === -1) return null;

      cache.plans[index] = {
        ...cache.plans[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };

      await this.saveCache(cache);

      return cache.plans[index];
    } catch (error) {
      console.error('Error updating plan:', error);
      return null;
    }
  },

  // Atualizar alocação de membros
  async updateMemberAllocation(
    planId: string, 
    memberId: string, 
    destination: 'original' | 'new'
  ): Promise<boolean> {
    try {
      const cache = await this.getCache();
      const plan = cache.plans.find(p => p.id === planId);
      
      if (!plan) return false;

      const memberIndex = plan.members_to_transfer.findIndex(m => m.member_id === memberId);
      if (memberIndex !== -1) {
        plan.members_to_transfer[memberIndex].destination = destination;
      }

      plan.updated_at = new Date().toISOString();
      await this.saveCache(cache);

      return true;
    } catch (error) {
      console.error('Error updating member allocation:', error);
      return false;
    }
  },

  // Concluir multiplicação
  async completePlan(planId: string): Promise<boolean> {
    try {
      const cache = await this.getCache();
      const plan = cache.plans.find(p => p.id === planId);
      
      if (!plan) return false;

      plan.status = 'completed';
      plan.completed_at = new Date().toISOString();
      plan.updated_at = new Date().toISOString();

      await this.saveCache(cache);

      // Aqui seria feita a criação da nova célula no Supabase
      // e a transferência dos membros

      return true;
    } catch (error) {
      console.error('Error completing plan:', error);
      return false;
    }
  },

  // Cancelar multiplicação
  async cancelPlan(planId: string): Promise<boolean> {
    try {
      const cache = await this.getCache();
      const plan = cache.plans.find(p => p.id === planId);
      
      if (!plan) return false;

      plan.status = 'cancelled';
      plan.updated_at = new Date().toISOString();

      await this.saveCache(cache);

      return true;
    } catch (error) {
      console.error('Error cancelling plan:', error);
      return false;
    }
  },

  // Obter estatísticas
  async getStats(cellId: string): Promise<MultiplicationStats> {
    try {
      const plans = await this.getPlans(cellId);
      
      return {
        total_multiplications: plans.length,
        completed: plans.filter(p => p.status === 'completed').length,
        in_progress: plans.filter(p => p.status === 'in_progress' || p.status === 'preparing').length,
        planned: plans.filter(p => p.status === 'planning').length,
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        total_multiplications: 0,
        completed: 0,
        in_progress: 0,
        planned: 0,
      };
    }
  },

  // Obter status label
  getStatusLabel(status: MultiplicationStatus): string {
    const labels: Record<MultiplicationStatus, string> = {
      planning: 'Planejando',
      preparing: 'Preparando',
      in_progress: 'Em Andamento',
      completed: 'Concluída',
      cancelled: 'Cancelada',
    };
    return labels[status] || status;
  },

  // Obter cor do status
  getStatusColor(status: MultiplicationStatus): string {
    const colors: Record<MultiplicationStatus, string> = {
      planning: '#6B7280',
      preparing: '#F59E0B',
      in_progress: '#3B82F6',
      completed: '#22C55E',
      cancelled: '#EF4444',
    };
    return colors[status] || '#6B7280';
  },

  // Cache management
  async getCache(): Promise<{ plans: MultiplicationPlan[] }> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : { plans: [] };
    } catch {
      return { plans: [] };
    }
  },

  async saveCache(cache: { plans: MultiplicationPlan[] }): Promise<void> {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  },

  async clearCache(): Promise<void> {
    await AsyncStorage.removeItem(CACHE_KEY);
  },
};
