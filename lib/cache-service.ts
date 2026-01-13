import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Member, CellEvent, Cell } from './supabase';
import { Event } from './event-service';

// Cache keys
const CACHE_KEYS = {
  MEMBERS: 'ekkle_cache_members',
  EVENTS: 'ekkle_cache_events',
  CELL: 'ekkle_cache_cell',
  ATTENDANCE: 'ekkle_cache_attendance',
  LAST_SYNC: 'ekkle_cache_last_sync',
  IS_OFFLINE: 'ekkle_is_offline',
};

// Cache expiration time (24 hours)
const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000;

interface CacheData<T> {
  data: T;
  timestamp: number;
  userId: string;
}

interface AttendanceRecord {
  date: string;
  memberId: number;
  present: boolean;
}

export class CacheService {
  private static listeners: Set<(isOffline: boolean) => void> = new Set();
  private static isOfflineMode = false;

  /**
   * Inicializar o serviço de cache e monitoramento de conexão
   */
  static async initialize(): Promise<void> {
    // Check initial network state
    const netState = await NetInfo.fetch();
    this.isOfflineMode = !netState.isConnected;

    // Subscribe to network changes
    NetInfo.addEventListener((state: NetInfoState) => {
      const wasOffline = this.isOfflineMode;
      this.isOfflineMode = !state.isConnected;

      if (wasOffline !== this.isOfflineMode) {
        this.notifyListeners();
      }
    });
  }

  /**
   * Adicionar listener para mudanças de estado offline
   */
  static addOfflineListener(callback: (isOffline: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notificar todos os listeners sobre mudança de estado
   */
  private static notifyListeners(): void {
    this.listeners.forEach((callback) => callback(this.isOfflineMode));
  }

  /**
   * Verificar se está no modo offline
   */
  static async isOffline(): Promise<boolean> {
    const netState = await NetInfo.fetch();
    return !netState.isConnected;
  }

  /**
   * Obter estado offline atual (síncrono)
   */
  static getOfflineState(): boolean {
    return this.isOfflineMode;
  }

  /**
   * Salvar membros no cache
   */
  static async cacheMembers(userId: string, members: Member[]): Promise<void> {
    try {
      const cacheData: CacheData<Member[]> = {
        data: members,
        timestamp: Date.now(),
        userId,
      };
      await AsyncStorage.setItem(CACHE_KEYS.MEMBERS, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error caching members:', error);
    }
  }

  /**
   * Obter membros do cache
   */
  static async getCachedMembers(userId: string): Promise<Member[] | null> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.MEMBERS);
      if (!cached) return null;

      const cacheData: CacheData<Member[]> = JSON.parse(cached);
      
      // Check if cache is for the same user and not expired
      if (cacheData.userId !== userId) return null;
      if (Date.now() - cacheData.timestamp > CACHE_EXPIRATION_MS) return null;

      return cacheData.data;
    } catch (error) {
      console.error('Error getting cached members:', error);
      return null;
    }
  }

  /**
   * Salvar eventos no cache
   */
  static async cacheEvents(userId: string, events: Event[]): Promise<void> {
    try {
      const cacheData: CacheData<Event[]> = {
        data: events,
        timestamp: Date.now(),
        userId,
      };
      await AsyncStorage.setItem(CACHE_KEYS.EVENTS, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error caching events:', error);
    }
  }

  /**
   * Obter eventos do cache
   */
  static async getCachedEvents(userId: string): Promise<Event[] | null> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.EVENTS);
      if (!cached) return null;

      const cacheData: CacheData<Event[]> = JSON.parse(cached);
      
      if (cacheData.userId !== userId) return null;
      if (Date.now() - cacheData.timestamp > CACHE_EXPIRATION_MS) return null;

      return cacheData.data;
    } catch (error) {
      console.error('Error getting cached events:', error);
      return null;
    }
  }

  /**
   * Salvar célula no cache
   */
  static async cacheCell(userId: string, cell: Cell): Promise<void> {
    try {
      const cacheData: CacheData<Cell> = {
        data: cell,
        timestamp: Date.now(),
        userId,
      };
      await AsyncStorage.setItem(CACHE_KEYS.CELL, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error caching cell:', error);
    }
  }

  /**
   * Obter célula do cache
   */
  static async getCachedCell(userId: string): Promise<Cell | null> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.CELL);
      if (!cached) return null;

      const cacheData: CacheData<Cell> = JSON.parse(cached);
      
      if (cacheData.userId !== userId) return null;
      if (Date.now() - cacheData.timestamp > CACHE_EXPIRATION_MS) return null;

      return cacheData.data;
    } catch (error) {
      console.error('Error getting cached cell:', error);
      return null;
    }
  }

  /**
   * Salvar presenças pendentes (para sincronização posterior)
   */
  static async cachePendingAttendance(attendance: AttendanceRecord): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.ATTENDANCE);
      const pendingList: AttendanceRecord[] = cached ? JSON.parse(cached) : [];
      
      // Check if already exists and update, or add new
      const existingIndex = pendingList.findIndex(
        (a) => a.date === attendance.date && a.memberId === attendance.memberId
      );
      
      if (existingIndex >= 0) {
        pendingList[existingIndex] = attendance;
      } else {
        pendingList.push(attendance);
      }

      await AsyncStorage.setItem(CACHE_KEYS.ATTENDANCE, JSON.stringify(pendingList));
    } catch (error) {
      console.error('Error caching pending attendance:', error);
    }
  }

  /**
   * Obter presenças pendentes
   */
  static async getPendingAttendance(): Promise<AttendanceRecord[]> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.ATTENDANCE);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Error getting pending attendance:', error);
      return [];
    }
  }

  /**
   * Limpar presenças pendentes após sincronização
   */
  static async clearPendingAttendance(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.ATTENDANCE);
    } catch (error) {
      console.error('Error clearing pending attendance:', error);
    }
  }

  /**
   * Registrar última sincronização
   */
  static async setLastSync(): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, Date.now().toString());
    } catch (error) {
      console.error('Error setting last sync:', error);
    }
  }

  /**
   * Obter última sincronização
   */
  static async getLastSync(): Promise<Date | null> {
    try {
      const timestamp = await AsyncStorage.getItem(CACHE_KEYS.LAST_SYNC);
      return timestamp ? new Date(parseInt(timestamp, 10)) : null;
    } catch (error) {
      console.error('Error getting last sync:', error);
      return null;
    }
  }

  /**
   * Formatar última sincronização para exibição
   */
  static formatLastSync(date: Date | null): string {
    if (!date) return 'Nunca sincronizado';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `Há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    return `Há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  }

  /**
   * Limpar todo o cache
   */
  static async clearAllCache(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(CACHE_KEYS.MEMBERS),
        AsyncStorage.removeItem(CACHE_KEYS.EVENTS),
        AsyncStorage.removeItem(CACHE_KEYS.CELL),
        AsyncStorage.removeItem(CACHE_KEYS.ATTENDANCE),
        AsyncStorage.removeItem(CACHE_KEYS.LAST_SYNC),
      ]);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Obter tamanho aproximado do cache
   */
  static async getCacheSize(): Promise<string> {
    try {
      let totalSize = 0;
      
      for (const key of Object.values(CACHE_KEYS)) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length * 2; // UTF-16 characters = 2 bytes each
        }
      }

      if (totalSize < 1024) return `${totalSize} B`;
      if (totalSize < 1024 * 1024) return `${(totalSize / 1024).toFixed(1)} KB`;
      return `${(totalSize / (1024 * 1024)).toFixed(1)} MB`;
    } catch (error) {
      console.error('Error getting cache size:', error);
      return '0 B';
    }
  }
}
