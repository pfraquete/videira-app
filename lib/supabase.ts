import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Supabase configuration - usando as mesmas credenciais do projeto web
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Custom storage adapter for React Native
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // Handle error silently
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Handle error silently
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// Types for the database
export interface UserProfile {
  id: number;
  user_id: string;
  nome_completo: string;
  data_nascimento?: string;
  foto_url?: string;
  telefone?: string;
  endereco_rua?: string;
  endereco_numero?: string;
  endereco_bairro?: string;
  endereco_cidade?: string;
  endereco_estado?: string;
  endereco_cep?: string;
  bio?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Cell {
  user_id: string;
  cell_name: string;
  description?: string;
  meeting_day?: string;
  meeting_time?: string;
  meeting_address?: string;
  is_public: boolean;
  max_members: number;
  created_at?: string;
}

export interface Member {
  id: number;
  user_id: string;
  user_profile_id?: string;
  nome: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  data_nascimento?: string;
  genero?: string;
  funcao: string;
  status: string;
  foto_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Attendance {
  id: number;
  user_id: string;
  member_id: number;
  date: string;
  present: boolean;
  created_at?: string;
}

export interface CellEvent {
  id: number;
  user_id: string;
  titulo: string;
  descricao?: string;
  data_inicial: string;
  data_final?: string;
  tipo?: string;
  local?: string;
  created_at?: string;
}

// User roles
export enum UserRole {
  PARTICIPANTE = 'participante',
  FREQUENTADOR_ASSIDUO = 'frequentador_assiduo', // Legacy
  LIDER_CELULA = 'lider_celula',
  DISCIPULADOR = 'discipulador',
  PASTOR = 'pastor',
  ADMIN = 'admin'
}

export type DashboardUserRole = 'pastor' | 'discipulador' | 'lider' | 'participante';
