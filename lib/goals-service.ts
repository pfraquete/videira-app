import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CellGoal {
  id: string;
  userId: string;
  month: number; // 1-12
  year: number;
  visitors: number; // Meta de visitantes
  newMembers: number; // Meta de novos membros
  averageAttendance: number; // Meta de presença média (%)
  events: number; // Meta de eventos
  createdAt: string;
  updatedAt: string;
}

export interface GoalProgress {
  visitors: { current: number; target: number; percentage: number };
  newMembers: { current: number; target: number; percentage: number };
  averageAttendance: { current: number; target: number; percentage: number };
  events: { current: number; target: number; percentage: number };
  overall: number; // Progresso geral em %
}

const GOALS_STORAGE_KEY = 'ekkle_cell_goals';

export class GoalsService {
  /**
   * Obter todas as metas salvas
   */
  static async getAllGoals(userId: string): Promise<CellGoal[]> {
    try {
      const stored = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
      if (!stored) return [];
      
      const allGoals: CellGoal[] = JSON.parse(stored);
      return allGoals.filter(g => g.userId === userId);
    } catch (error) {
      console.error('Error getting goals:', error);
      return [];
    }
  }

  /**
   * Obter meta do mês atual
   */
  static async getCurrentMonthGoal(userId: string): Promise<CellGoal | null> {
    const now = new Date();
    return this.getGoalByMonth(userId, now.getMonth() + 1, now.getFullYear());
  }

  /**
   * Obter meta de um mês específico
   */
  static async getGoalByMonth(userId: string, month: number, year: number): Promise<CellGoal | null> {
    const goals = await this.getAllGoals(userId);
    return goals.find(g => g.month === month && g.year === year) || null;
  }

  /**
   * Criar ou atualizar meta
   */
  static async saveGoal(goal: Omit<CellGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<CellGoal> {
    try {
      const stored = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
      const allGoals: CellGoal[] = stored ? JSON.parse(stored) : [];
      
      // Check if goal already exists for this month/year
      const existingIndex = allGoals.findIndex(
        g => g.userId === goal.userId && g.month === goal.month && g.year === goal.year
      );

      const now = new Date().toISOString();
      let savedGoal: CellGoal;

      if (existingIndex >= 0) {
        // Update existing
        savedGoal = {
          ...allGoals[existingIndex],
          ...goal,
          updatedAt: now,
        };
        allGoals[existingIndex] = savedGoal;
      } else {
        // Create new
        savedGoal = {
          ...goal,
          id: `goal_${Date.now()}`,
          createdAt: now,
          updatedAt: now,
        };
        allGoals.push(savedGoal);
      }

      await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(allGoals));
      return savedGoal;
    } catch (error) {
      console.error('Error saving goal:', error);
      throw error;
    }
  }

  /**
   * Excluir meta
   */
  static async deleteGoal(goalId: string): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
      if (!stored) return false;

      const allGoals: CellGoal[] = JSON.parse(stored);
      const filtered = allGoals.filter(g => g.id !== goalId);
      
      await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting goal:', error);
      return false;
    }
  }

  /**
   * Calcular progresso das metas
   */
  static calculateProgress(
    goal: CellGoal,
    currentData: {
      visitors: number;
      newMembers: number;
      averageAttendance: number;
      events: number;
    }
  ): GoalProgress {
    const calcPercentage = (current: number, target: number) => {
      if (target === 0) return 100;
      return Math.min(100, Math.round((current / target) * 100));
    };

    const visitors = {
      current: currentData.visitors,
      target: goal.visitors,
      percentage: calcPercentage(currentData.visitors, goal.visitors),
    };

    const newMembers = {
      current: currentData.newMembers,
      target: goal.newMembers,
      percentage: calcPercentage(currentData.newMembers, goal.newMembers),
    };

    const averageAttendance = {
      current: currentData.averageAttendance,
      target: goal.averageAttendance,
      percentage: calcPercentage(currentData.averageAttendance, goal.averageAttendance),
    };

    const events = {
      current: currentData.events,
      target: goal.events,
      percentage: calcPercentage(currentData.events, goal.events),
    };

    // Overall progress is the average of all percentages
    const overall = Math.round(
      (visitors.percentage + newMembers.percentage + averageAttendance.percentage + events.percentage) / 4
    );

    return {
      visitors,
      newMembers,
      averageAttendance,
      events,
      overall,
    };
  }

  /**
   * Obter nome do mês
   */
  static getMonthName(month: number): string {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month - 1] || '';
  }

  /**
   * Obter cor baseada no progresso
   */
  static getProgressColor(percentage: number): string {
    if (percentage >= 100) return '#22c55e'; // success
    if (percentage >= 75) return '#84cc16'; // lime
    if (percentage >= 50) return '#f59e0b'; // warning
    if (percentage >= 25) return '#f97316'; // orange
    return '#ef4444'; // error
  }

  /**
   * Obter metas padrão sugeridas
   */
  static getDefaultGoals(): Omit<CellGoal, 'id' | 'userId' | 'month' | 'year' | 'createdAt' | 'updatedAt'> {
    return {
      visitors: 5,
      newMembers: 2,
      averageAttendance: 80,
      events: 4,
    };
  }
}
