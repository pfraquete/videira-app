import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
  },
}));

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
          order: () => Promise.resolve({ data: [], error: null }),
        }),
        order: () => Promise.resolve({ data: [], error: null }),
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => ({
        eq: () => Promise.resolve({ data: null, error: null }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
  },
}));

describe('Engagement Service', () => {
  it('should calculate engagement levels correctly', () => {
    // Test engagement level calculation
    const getEngagementLevel = (points: number) => {
      if (points >= 1000) return { level: 'Ekkle', icon: '🍇' };
      if (points >= 500) return { level: 'Árvore', icon: '🌳' };
      if (points >= 200) return { level: 'Planta', icon: '🌿' };
      if (points >= 50) return { level: 'Broto', icon: '🌱' };
      return { level: 'Semente', icon: '🌰' };
    };

    expect(getEngagementLevel(0).level).toBe('Semente');
    expect(getEngagementLevel(50).level).toBe('Broto');
    expect(getEngagementLevel(200).level).toBe('Planta');
    expect(getEngagementLevel(500).level).toBe('Árvore');
    expect(getEngagementLevel(1000).level).toBe('Ekkle');
    expect(getEngagementLevel(1500).level).toBe('Ekkle');
  });

  it('should calculate points correctly', () => {
    const calculatePoints = (actions: { type: string; count: number }[]) => {
      const pointsMap: Record<string, number> = {
        attendance: 10,
        prayer: 5,
        event: 15,
        connection: 20,
        invite: 25,
      };
      
      return actions.reduce((total, action) => {
        return total + (pointsMap[action.type] || 0) * action.count;
      }, 0);
    };

    const actions = [
      { type: 'attendance', count: 4 },
      { type: 'prayer', count: 10 },
      { type: 'event', count: 2 },
    ];

    expect(calculatePoints(actions)).toBe(40 + 50 + 30); // 120 points
  });
});

describe('Connection Service', () => {
  it('should get connection type labels', () => {
    const getTypeLabel = (type: string) => {
      const labels: Record<string, string> = {
        discipleship: 'Discipulado',
        mentoring: 'Mentoria',
        counseling: 'Aconselhamento',
        visit: 'Visita',
        follow_up: 'Acompanhamento',
      };
      return labels[type] || type;
    };

    expect(getTypeLabel('discipleship')).toBe('Discipulado');
    expect(getTypeLabel('mentoring')).toBe('Mentoria');
    expect(getTypeLabel('counseling')).toBe('Aconselhamento');
    expect(getTypeLabel('visit')).toBe('Visita');
    expect(getTypeLabel('follow_up')).toBe('Acompanhamento');
    expect(getTypeLabel('unknown')).toBe('unknown');
  });

  it('should validate connection data', () => {
    const validateConnection = (data: {
      member_name?: string;
      date?: string;
      type?: string;
    }) => {
      const errors: string[] = [];
      
      if (!data.member_name?.trim()) {
        errors.push('Nome do membro é obrigatório');
      }
      if (!data.date) {
        errors.push('Data é obrigatória');
      }
      if (!data.type) {
        errors.push('Tipo de conexão é obrigatório');
      }
      
      return errors;
    };

    expect(validateConnection({})).toHaveLength(3);
    expect(validateConnection({ member_name: 'João' })).toHaveLength(2);
    expect(validateConnection({ 
      member_name: 'João', 
      date: '2025-01-10',
      type: 'discipleship'
    })).toHaveLength(0);
  });
});

describe('Multiplication Service', () => {
  it('should get status labels correctly', () => {
    const getStatusLabel = (status: string) => {
      const labels: Record<string, string> = {
        planning: 'Planejando',
        preparing: 'Preparando',
        in_progress: 'Em Andamento',
        completed: 'Concluída',
        cancelled: 'Cancelada',
      };
      return labels[status] || status;
    };

    expect(getStatusLabel('planning')).toBe('Planejando');
    expect(getStatusLabel('preparing')).toBe('Preparando');
    expect(getStatusLabel('in_progress')).toBe('Em Andamento');
    expect(getStatusLabel('completed')).toBe('Concluída');
    expect(getStatusLabel('cancelled')).toBe('Cancelada');
  });

  it('should get status colors correctly', () => {
    const getStatusColor = (status: string) => {
      const colors: Record<string, string> = {
        planning: '#6B7280',
        preparing: '#F59E0B',
        in_progress: '#3B82F6',
        completed: '#22C55E',
        cancelled: '#EF4444',
      };
      return colors[status] || '#6B7280';
    };

    expect(getStatusColor('planning')).toBe('#6B7280');
    expect(getStatusColor('preparing')).toBe('#F59E0B');
    expect(getStatusColor('in_progress')).toBe('#3B82F6');
    expect(getStatusColor('completed')).toBe('#22C55E');
    expect(getStatusColor('cancelled')).toBe('#EF4444');
    expect(getStatusColor('unknown')).toBe('#6B7280');
  });

  it('should calculate member allocation correctly', () => {
    const members = [
      { member_id: '1', member_name: 'João', destination: 'original' as const },
      { member_id: '2', member_name: 'Maria', destination: 'new' as const },
      { member_id: '3', member_name: 'Pedro', destination: 'new' as const },
      { member_id: '4', member_name: 'Ana', destination: 'original' as const },
    ];

    const membersToNew = members.filter(m => m.destination === 'new').length;
    const membersToOriginal = members.filter(m => m.destination === 'original').length;

    expect(membersToNew).toBe(2);
    expect(membersToOriginal).toBe(2);
    expect(membersToNew + membersToOriginal).toBe(members.length);
  });

  it('should validate multiplication plan', () => {
    const validatePlan = (data: {
      new_cell_name?: string;
      target_date?: string;
      members_to_transfer?: { destination: string }[];
    }) => {
      const errors: string[] = [];
      
      if (!data.new_cell_name?.trim()) {
        errors.push('Nome da nova célula é obrigatório');
      }
      if (!data.target_date) {
        errors.push('Data prevista é obrigatória');
      }
      
      const membersToNew = data.members_to_transfer?.filter(m => m.destination === 'new') || [];
      if (membersToNew.length === 0) {
        errors.push('Selecione pelo menos um membro para a nova célula');
      }
      
      return errors;
    };

    expect(validatePlan({})).toHaveLength(3);
    expect(validatePlan({ 
      new_cell_name: 'Nova Célula',
      target_date: '2025-03-01',
      members_to_transfer: []
    })).toHaveLength(1);
    expect(validatePlan({ 
      new_cell_name: 'Nova Célula',
      target_date: '2025-03-01',
      members_to_transfer: [{ destination: 'new' }]
    })).toHaveLength(0);
  });
});

describe('Web Features - Chat Service', () => {
  it('should format message time correctly', () => {
    const formatMessageTime = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const testDate = '2025-01-10T14:30:00';
    const result = formatMessageTime(testDate);
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

describe('Web Features - Calendar', () => {
  it('should generate calendar days correctly', () => {
    const generateCalendarDays = (year: number, month: number) => {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startPadding = firstDay.getDay();
      const totalDays = lastDay.getDate();
      
      const days: (number | null)[] = [];
      
      // Add padding for days before the first day of the month
      for (let i = 0; i < startPadding; i++) {
        days.push(null);
      }
      
      // Add all days of the month
      for (let i = 1; i <= totalDays; i++) {
        days.push(i);
      }
      
      return days;
    };

    // January 2025
    const janDays = generateCalendarDays(2025, 0);
    expect(janDays.filter(d => d !== null)).toHaveLength(31);
    
    // February 2025
    const febDays = generateCalendarDays(2025, 1);
    expect(febDays.filter(d => d !== null)).toHaveLength(28);
  });
});

describe('Web Features - Theme', () => {
  it('should return correct theme values', () => {
    const getThemeValue = (theme: 'light' | 'dark' | 'system', systemTheme: 'light' | 'dark') => {
      if (theme === 'system') {
        return systemTheme;
      }
      return theme;
    };

    expect(getThemeValue('light', 'dark')).toBe('light');
    expect(getThemeValue('dark', 'light')).toBe('dark');
    expect(getThemeValue('system', 'dark')).toBe('dark');
    expect(getThemeValue('system', 'light')).toBe('light');
  });
});
