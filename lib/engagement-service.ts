import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Tipos de engajamento
export type EngagementType = 
  | 'attendance'      // Presença em reunião
  | 'prayer'          // Participou de oração
  | 'event'           // Participou de evento
  | 'invite'          // Convidou alguém
  | 'testimony'       // Compartilhou testemunho
  | 'serving'         // Serviu na célula
  | 'first_time'      // Primeira vez na célula
  | 'birthday_wish'   // Parabenizou aniversariante
  | 'chat_message';   // Enviou mensagem no chat

export interface EngagementRecord {
  id: string;
  member_id: string;
  member_name: string;
  type: EngagementType;
  points: number;
  description: string;
  created_at: string;
}

export interface MemberEngagement {
  member_id: string;
  member_name: string;
  total_points: number;
  level: number;
  level_name: string;
  next_level_points: number;
  progress_percentage: number;
  badges: Badge[];
  recent_activities: EngagementRecord[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at?: string;
}

// Pontos por tipo de engajamento
const ENGAGEMENT_POINTS: Record<EngagementType, number> = {
  attendance: 10,
  prayer: 5,
  event: 15,
  invite: 25,
  testimony: 20,
  serving: 15,
  first_time: 50,
  birthday_wish: 5,
  chat_message: 2,
};

// Níveis de engajamento
const ENGAGEMENT_LEVELS = [
  { level: 1, name: 'Semente', min_points: 0 },
  { level: 2, name: 'Broto', min_points: 50 },
  { level: 3, name: 'Planta', min_points: 150 },
  { level: 4, name: 'Árvore', min_points: 300 },
  { level: 5, name: 'Videira', min_points: 500 },
  { level: 6, name: 'Videira Frutífera', min_points: 800 },
  { level: 7, name: 'Videira Madura', min_points: 1200 },
];

// Badges disponíveis
const AVAILABLE_BADGES: Badge[] = [
  { id: 'first_attendance', name: 'Primeiro Passo', description: 'Participou da primeira reunião', icon: '👣' },
  { id: 'consistent_3', name: 'Consistente', description: '3 presenças consecutivas', icon: '🔥' },
  { id: 'consistent_10', name: 'Fiel', description: '10 presenças consecutivas', icon: '⭐' },
  { id: 'prayer_warrior', name: 'Guerreiro de Oração', description: 'Participou de 10 orações', icon: '🙏' },
  { id: 'inviter', name: 'Pescador', description: 'Convidou 3 pessoas', icon: '🎣' },
  { id: 'testimony_sharer', name: 'Testemunho Vivo', description: 'Compartilhou 5 testemunhos', icon: '📢' },
  { id: 'servant', name: 'Servo', description: 'Serviu 5 vezes na célula', icon: '🤝' },
  { id: 'birthday_friend', name: 'Amigo Fiel', description: 'Parabenizou 10 aniversariantes', icon: '🎂' },
  { id: 'level_5', name: 'Videira', description: 'Alcançou o nível Videira', icon: '🍇' },
];

const CACHE_KEY = 'engagement_cache';

export const EngagementService = {
  // Registrar engajamento
  async recordEngagement(
    memberId: string,
    memberName: string,
    type: EngagementType,
    description?: string
  ): Promise<EngagementRecord | null> {
    try {
      const points = ENGAGEMENT_POINTS[type];
      const record: EngagementRecord = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        member_id: memberId,
        member_name: memberName,
        type,
        points,
        description: description || getDefaultDescription(type),
        created_at: new Date().toISOString(),
      };

      // Salvar no cache local
      const cache = await this.getCache();
      cache.records.push(record);
      await this.saveCache(cache);

      // Tentar salvar no Supabase
      try {
        await supabase.from('engagement_records').insert({
          member_id: memberId,
          type,
          points,
          description: record.description,
        });
      } catch (e) {
        console.log('Engagement saved locally, will sync later');
      }

      return record;
    } catch (error) {
      console.error('Error recording engagement:', error);
      return null;
    }
  },

  // Obter engajamento de um membro
  async getMemberEngagement(memberId: string, memberName: string): Promise<MemberEngagement> {
    try {
      const cache = await this.getCache();
      const memberRecords = cache.records.filter(r => r.member_id === memberId);
      const totalPoints = memberRecords.reduce((sum, r) => sum + r.points, 0);
      
      const { level, levelName, nextLevelPoints, progress } = calculateLevel(totalPoints);
      const badges = await this.getMemberBadges(memberId, memberRecords);

      return {
        member_id: memberId,
        member_name: memberName,
        total_points: totalPoints,
        level,
        level_name: levelName,
        next_level_points: nextLevelPoints,
        progress_percentage: progress,
        badges,
        recent_activities: memberRecords.slice(-10).reverse(),
      };
    } catch (error) {
      console.error('Error getting member engagement:', error);
      return {
        member_id: memberId,
        member_name: memberName,
        total_points: 0,
        level: 1,
        level_name: 'Semente',
        next_level_points: 50,
        progress_percentage: 0,
        badges: [],
        recent_activities: [],
      };
    }
  },

  // Obter ranking de engajamento da célula
  async getCellRanking(cellId: string): Promise<MemberEngagement[]> {
    try {
      const cache = await this.getCache();
      const memberMap = new Map<string, { name: string; points: number; records: EngagementRecord[] }>();

      for (const record of cache.records) {
        const existing = memberMap.get(record.member_id);
        if (existing) {
          existing.points += record.points;
          existing.records.push(record);
        } else {
          memberMap.set(record.member_id, {
            name: record.member_name,
            points: record.points,
            records: [record],
          });
        }
      }

      const rankings: MemberEngagement[] = [];
      for (const [memberId, data] of memberMap) {
        const { level, levelName, nextLevelPoints, progress } = calculateLevel(data.points);
        const badges = await this.getMemberBadges(memberId, data.records);

        rankings.push({
          member_id: memberId,
          member_name: data.name,
          total_points: data.points,
          level,
          level_name: levelName,
          next_level_points: nextLevelPoints,
          progress_percentage: progress,
          badges,
          recent_activities: data.records.slice(-5).reverse(),
        });
      }

      return rankings.sort((a, b) => b.total_points - a.total_points);
    } catch (error) {
      console.error('Error getting cell ranking:', error);
      return [];
    }
  },

  // Obter badges de um membro
  async getMemberBadges(memberId: string, records: EngagementRecord[]): Promise<Badge[]> {
    const earnedBadges: Badge[] = [];

    // Primeiro Passo - primeira presença
    if (records.some(r => r.type === 'attendance')) {
      earnedBadges.push({ ...AVAILABLE_BADGES.find(b => b.id === 'first_attendance')!, earned_at: records.find(r => r.type === 'attendance')?.created_at });
    }

    // Consistente - 3 presenças
    const attendanceCount = records.filter(r => r.type === 'attendance').length;
    if (attendanceCount >= 3) {
      earnedBadges.push({ ...AVAILABLE_BADGES.find(b => b.id === 'consistent_3')! });
    }
    if (attendanceCount >= 10) {
      earnedBadges.push({ ...AVAILABLE_BADGES.find(b => b.id === 'consistent_10')! });
    }

    // Guerreiro de Oração - 10 orações
    if (records.filter(r => r.type === 'prayer').length >= 10) {
      earnedBadges.push({ ...AVAILABLE_BADGES.find(b => b.id === 'prayer_warrior')! });
    }

    // Pescador - 3 convites
    if (records.filter(r => r.type === 'invite').length >= 3) {
      earnedBadges.push({ ...AVAILABLE_BADGES.find(b => b.id === 'inviter')! });
    }

    // Testemunho Vivo - 5 testemunhos
    if (records.filter(r => r.type === 'testimony').length >= 5) {
      earnedBadges.push({ ...AVAILABLE_BADGES.find(b => b.id === 'testimony_sharer')! });
    }

    // Servo - 5 serviços
    if (records.filter(r => r.type === 'serving').length >= 5) {
      earnedBadges.push({ ...AVAILABLE_BADGES.find(b => b.id === 'servant')! });
    }

    // Amigo Fiel - 10 parabéns
    if (records.filter(r => r.type === 'birthday_wish').length >= 10) {
      earnedBadges.push({ ...AVAILABLE_BADGES.find(b => b.id === 'birthday_friend')! });
    }

    // Nível Videira
    const totalPoints = records.reduce((sum, r) => sum + r.points, 0);
    if (totalPoints >= 500) {
      earnedBadges.push({ ...AVAILABLE_BADGES.find(b => b.id === 'level_5')! });
    }

    return earnedBadges;
  },

  // Cache management
  async getCache(): Promise<{ records: EngagementRecord[] }> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : { records: [] };
    } catch {
      return { records: [] };
    }
  },

  async saveCache(cache: { records: EngagementRecord[] }): Promise<void> {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  },

  async clearCache(): Promise<void> {
    await AsyncStorage.removeItem(CACHE_KEY);
  },
};

// Funções auxiliares
function getDefaultDescription(type: EngagementType): string {
  const descriptions: Record<EngagementType, string> = {
    attendance: 'Participou da reunião da célula',
    prayer: 'Participou do momento de oração',
    event: 'Participou de um evento',
    invite: 'Convidou alguém para a célula',
    testimony: 'Compartilhou um testemunho',
    serving: 'Serviu na célula',
    first_time: 'Primeira participação na célula',
    birthday_wish: 'Parabenizou um aniversariante',
    chat_message: 'Enviou mensagem no chat',
  };
  return descriptions[type];
}

function calculateLevel(points: number): {
  level: number;
  levelName: string;
  nextLevelPoints: number;
  progress: number;
} {
  let currentLevel = ENGAGEMENT_LEVELS[0];
  let nextLevel = ENGAGEMENT_LEVELS[1];

  for (let i = ENGAGEMENT_LEVELS.length - 1; i >= 0; i--) {
    if (points >= ENGAGEMENT_LEVELS[i].min_points) {
      currentLevel = ENGAGEMENT_LEVELS[i];
      nextLevel = ENGAGEMENT_LEVELS[i + 1] || ENGAGEMENT_LEVELS[i];
      break;
    }
  }

  const pointsInLevel = points - currentLevel.min_points;
  const pointsNeeded = nextLevel.min_points - currentLevel.min_points;
  const progress = pointsNeeded > 0 ? Math.min((pointsInLevel / pointsNeeded) * 100, 100) : 100;

  return {
    level: currentLevel.level,
    levelName: currentLevel.name,
    nextLevelPoints: nextLevel.min_points,
    progress,
  };
}
