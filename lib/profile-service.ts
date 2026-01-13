import { supabase } from './supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export interface UserProfile {
  id: string;
  email: string;
  nome: string | null;
  telefone: string | null;
  foto_url: string | null;
  data_nascimento: string | null;
  endereco: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileData {
  nome?: string;
  telefone?: string;
  data_nascimento?: string;
  endereco?: string;
}

export class ProfileService {
  /**
   * Buscar perfil do usuário
   */
  static async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getProfile:', error);
      return null;
    }
  }

  /**
   * Atualizar perfil do usuário
   */
  static async updateProfile(userId: string, data: UpdateProfileData): Promise<UserProfile | null> {
    try {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (data.nome !== undefined) updateData.nome = data.nome || null;
      if (data.telefone !== undefined) updateData.telefone = data.telefone || null;
      if (data.data_nascimento !== undefined) updateData.data_nascimento = data.data_nascimento || null;
      if (data.endereco !== undefined) updateData.endereco = data.endereco || null;

      const { data: result, error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        return null;
      }

      return result;
    } catch (error) {
      console.error('Error in updateProfile:', error);
      return null;
    }
  }

  /**
   * Solicitar permissão para acessar a galeria
   */
  static async requestMediaPermission(): Promise<boolean> {
    if (Platform.OS === 'web') return true;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Selecionar imagem da galeria
   */
  static async pickImage(): Promise<string | null> {
    try {
      const hasPermission = await this.requestMediaPermission();
      if (!hasPermission) {
        console.log('Permission denied');
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      return result.assets[0].uri;
    } catch (error) {
      console.error('Error picking image:', error);
      return null;
    }
  }

  /**
   * Upload de foto de perfil
   */
  static async uploadProfilePhoto(userId: string, imageUri: string): Promise<string | null> {
    try {
      // Read the file
      let base64Data: string;
      
      if (Platform.OS === 'web') {
        // On web, fetch the blob and convert to base64
        const response = await fetch(imageUri);
        const blob = await response.blob();
        base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // On native, use FileSystem
        base64Data = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      // Decode base64 to array buffer
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const fileName = `${userId}/profile_${Date.now()}.jpg`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, bytes.buffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) {
        console.error('Error uploading photo:', error);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // Update user profile with new photo URL
      await supabase
        .from('user_profiles')
        .update({ 
          foto_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      return publicUrl;
    } catch (error) {
      console.error('Error in uploadProfilePhoto:', error);
      return null;
    }
  }

  /**
   * Remover foto de perfil
   */
  static async removeProfilePhoto(userId: string): Promise<boolean> {
    try {
      // Update profile to remove photo URL
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          foto_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Error removing photo:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in removeProfilePhoto:', error);
      return false;
    }
  }

  /**
   * Formatar telefone para exibição
   */
  static formatPhone(phone: string | null): string {
    if (!phone) return '';
    
    // Remove non-numeric characters
    const numbers = phone.replace(/\D/g, '');
    
    // Format as (XX) XXXXX-XXXX
    if (numbers.length === 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    }
    if (numbers.length === 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    }
    
    return phone;
  }

  /**
   * Formatar input de telefone
   */
  static formatPhoneInput(text: string): string {
    const numbers = text.replace(/\D/g, '');
    
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  }
}
