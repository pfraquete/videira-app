import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { supabase } from './supabase';
import { CacheService } from './cache-service';

// Storage keys
const SYNC_KEYS = {
  PENDING_OPERATIONS: 'videira_pending_operations',
  SYNC_STATUS: 'videira_sync_status',
};

// Operation types
export type OperationType = 
  | 'CREATE_MEMBER'
  | 'UPDATE_MEMBER'
  | 'DELETE_MEMBER'
  | 'CREATE_EVENT'
  | 'UPDATE_EVENT'
  | 'DELETE_EVENT'
  | 'SAVE_ATTENDANCE';

export interface PendingOperation {
  id: string;
  type: OperationType;
  data: any;
  timestamp: number;
  retryCount: number;
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';

type SyncListener = (status: SyncStatus, message?: string) => void;

export class SyncService {
  private static listeners: Set<SyncListener> = new Set();
  private static currentStatus: SyncStatus = 'idle';
  private static isSyncing = false;
  private static unsubscribeNetInfo: (() => void) | null = null;

  /**
   * Inicializar o serviço de sincronização
   */
  static async initialize(): Promise<void> {
    // Listen for network changes
    this.unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
      if (state.isConnected && !this.isSyncing) {
        // Auto-sync when coming back online
        this.syncPendingOperations();
      }
    });
  }

  /**
   * Cleanup listeners
   */
  static cleanup(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
  }

  /**
   * Adicionar listener para status de sincronização
   */
  static addSyncListener(callback: SyncListener): () => void {
    this.listeners.add(callback);
    // Immediately notify with current status
    callback(this.currentStatus);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notificar listeners sobre mudança de status
   */
  private static notifyListeners(status: SyncStatus, message?: string): void {
    this.currentStatus = status;
    this.listeners.forEach((callback) => callback(status, message));
  }

  /**
   * Obter status atual
   */
  static getStatus(): SyncStatus {
    return this.currentStatus;
  }

  /**
   * Adicionar operação pendente
   */
  static async addPendingOperation(
    type: OperationType,
    data: any
  ): Promise<void> {
    try {
      const operations = await this.getPendingOperations();
      
      const newOperation: PendingOperation = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        timestamp: Date.now(),
        retryCount: 0,
      };

      operations.push(newOperation);
      await AsyncStorage.setItem(
        SYNC_KEYS.PENDING_OPERATIONS,
        JSON.stringify(operations)
      );

      // Try to sync immediately if online
      const isOffline = await CacheService.isOffline();
      if (!isOffline) {
        this.syncPendingOperations();
      }
    } catch (error) {
      console.error('Error adding pending operation:', error);
    }
  }

  /**
   * Obter operações pendentes
   */
  static async getPendingOperations(): Promise<PendingOperation[]> {
    try {
      const stored = await AsyncStorage.getItem(SYNC_KEYS.PENDING_OPERATIONS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting pending operations:', error);
      return [];
    }
  }

  /**
   * Obter contagem de operações pendentes
   */
  static async getPendingCount(): Promise<number> {
    const operations = await this.getPendingOperations();
    return operations.length;
  }

  /**
   * Remover operação após sucesso
   */
  private static async removeOperation(id: string): Promise<void> {
    try {
      const operations = await this.getPendingOperations();
      const filtered = operations.filter((op) => op.id !== id);
      await AsyncStorage.setItem(
        SYNC_KEYS.PENDING_OPERATIONS,
        JSON.stringify(filtered)
      );
    } catch (error) {
      console.error('Error removing operation:', error);
    }
  }

  /**
   * Atualizar retry count de uma operação
   */
  private static async updateOperationRetry(id: string): Promise<void> {
    try {
      const operations = await this.getPendingOperations();
      const updated = operations.map((op) => {
        if (op.id === id) {
          return { ...op, retryCount: op.retryCount + 1 };
        }
        return op;
      });
      await AsyncStorage.setItem(
        SYNC_KEYS.PENDING_OPERATIONS,
        JSON.stringify(updated)
      );
    } catch (error) {
      console.error('Error updating operation retry:', error);
    }
  }

  /**
   * Executar uma operação
   */
  private static async executeOperation(
    operation: PendingOperation
  ): Promise<boolean> {
    try {
      switch (operation.type) {
        case 'CREATE_MEMBER': {
          const { error } = await supabase
            .from('members')
            .insert(operation.data);
          return !error;
        }

        case 'UPDATE_MEMBER': {
          const { id, ...updateData } = operation.data;
          const { error } = await supabase
            .from('members')
            .update(updateData)
            .eq('id', id);
          return !error;
        }

        case 'DELETE_MEMBER': {
          const { error } = await supabase
            .from('members')
            .delete()
            .eq('id', operation.data.id);
          return !error;
        }

        case 'CREATE_EVENT': {
          const { error } = await supabase
            .from('cell_events')
            .insert(operation.data);
          return !error;
        }

        case 'UPDATE_EVENT': {
          const { id, ...updateData } = operation.data;
          const { error } = await supabase
            .from('cell_events')
            .update(updateData)
            .eq('id', id);
          return !error;
        }

        case 'DELETE_EVENT': {
          const { error } = await supabase
            .from('cell_events')
            .delete()
            .eq('id', operation.data.id);
          return !error;
        }

        case 'SAVE_ATTENDANCE': {
          const { error } = await supabase
            .from('attendance')
            .upsert(operation.data, {
              onConflict: 'member_id,date',
            });
          return !error;
        }

        default:
          console.warn('Unknown operation type:', operation.type);
          return false;
      }
    } catch (error) {
      console.error('Error executing operation:', error);
      return false;
    }
  }

  /**
   * Sincronizar todas as operações pendentes
   */
  static async syncPendingOperations(): Promise<{
    success: number;
    failed: number;
  }> {
    if (this.isSyncing) {
      return { success: 0, failed: 0 };
    }

    const isOffline = await CacheService.isOffline();
    if (isOffline) {
      return { success: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.notifyListeners('syncing', 'Sincronizando dados...');

    const operations = await this.getPendingOperations();
    let success = 0;
    let failed = 0;

    // Sort by timestamp (oldest first)
    operations.sort((a, b) => a.timestamp - b.timestamp);

    for (const operation of operations) {
      // Skip operations that have failed too many times
      if (operation.retryCount >= 3) {
        failed++;
        continue;
      }

      const result = await this.executeOperation(operation);

      if (result) {
        await this.removeOperation(operation.id);
        success++;
      } else {
        await this.updateOperationRetry(operation.id);
        failed++;
      }
    }

    // Update last sync time
    await CacheService.setLastSync();

    this.isSyncing = false;

    if (failed > 0) {
      this.notifyListeners(
        'error',
        `${success} sincronizado(s), ${failed} com erro`
      );
    } else if (success > 0) {
      this.notifyListeners('success', `${success} item(ns) sincronizado(s)`);
    } else {
      this.notifyListeners('idle');
    }

    // Reset to idle after a delay
    setTimeout(() => {
      if (this.currentStatus !== 'syncing') {
        this.notifyListeners('idle');
      }
    }, 3000);

    return { success, failed };
  }

  /**
   * Forçar sincronização manual
   */
  static async forceSync(): Promise<{ success: number; failed: number }> {
    return this.syncPendingOperations();
  }

  /**
   * Limpar operações com muitas falhas
   */
  static async clearFailedOperations(): Promise<number> {
    try {
      const operations = await this.getPendingOperations();
      const validOperations = operations.filter((op) => op.retryCount < 3);
      const removedCount = operations.length - validOperations.length;

      await AsyncStorage.setItem(
        SYNC_KEYS.PENDING_OPERATIONS,
        JSON.stringify(validOperations)
      );

      return removedCount;
    } catch (error) {
      console.error('Error clearing failed operations:', error);
      return 0;
    }
  }

  /**
   * Limpar todas as operações pendentes
   */
  static async clearAllPending(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SYNC_KEYS.PENDING_OPERATIONS);
      this.notifyListeners('idle');
    } catch (error) {
      console.error('Error clearing pending operations:', error);
    }
  }
}
