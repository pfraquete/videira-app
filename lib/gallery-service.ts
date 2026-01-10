import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

export interface Photo {
  id: string;
  cell_id: string;
  album_id?: string;
  url: string;
  thumbnail_url?: string;
  caption?: string;
  uploaded_by: string;
  uploaded_by_name: string;
  created_at: string;
  event_id?: string;
  event_name?: string;
}

export interface Album {
  id: string;
  cell_id: string;
  name: string;
  description?: string;
  cover_photo_url?: string;
  photo_count: number;
  created_at: string;
  event_id?: string;
}

export interface GalleryStats {
  total_photos: number;
  total_albums: number;
  photos_this_month: number;
}

const CACHE_KEY = 'gallery_cache';
const PHOTOS_DIR = `${FileSystem.documentDirectory}photos/`;

export const GalleryService = {
  // Inicializar diretório de fotos
  async initPhotosDirectory(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(PHOTOS_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
    }
  },

  // Upload de foto
  async uploadPhoto(
    cellId: string,
    imageUri: string,
    uploadedBy: string,
    uploadedByName: string,
    options?: {
      caption?: string;
      albumId?: string;
      eventId?: string;
      eventName?: string;
    }
  ): Promise<Photo | null> {
    try {
      await this.initPhotosDirectory();

      // Gerar ID único para a foto
      const photoId = `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const fileName = `${photoId}.jpg`;
      const localPath = `${PHOTOS_DIR}${fileName}`;

      // Copiar a imagem para o diretório local
      await FileSystem.copyAsync({
        from: imageUri,
        to: localPath,
      });

      // Criar objeto da foto
      const photo: Photo = {
        id: photoId,
        cell_id: cellId,
        album_id: options?.albumId,
        url: localPath,
        caption: options?.caption,
        uploaded_by: uploadedBy,
        uploaded_by_name: uploadedByName,
        created_at: new Date().toISOString(),
        event_id: options?.eventId,
        event_name: options?.eventName,
      };

      // Salvar no cache local
      const cache = await this.getCache();
      cache.photos.push(photo);
      await this.saveCache(cache);

      // Tentar fazer upload para o Supabase Storage
      try {
        const base64 = await FileSystem.readAsStringAsync(localPath, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const { data, error } = await supabase.storage
          .from('gallery')
          .upload(`${cellId}/${fileName}`, decode(base64), {
            contentType: 'image/jpeg',
          });

        if (!error && data) {
          const { data: urlData } = supabase.storage
            .from('gallery')
            .getPublicUrl(`${cellId}/${fileName}`);
          
          photo.url = urlData.publicUrl;

          // Atualizar cache com URL pública
          const updatedCache = await this.getCache();
          const index = updatedCache.photos.findIndex(p => p.id === photoId);
          if (index !== -1) {
            updatedCache.photos[index].url = urlData.publicUrl;
            await this.saveCache(updatedCache);
          }
        }
      } catch (e) {
        console.log('Photo saved locally, will sync later');
      }

      return photo;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  },

  // Obter fotos da célula
  async getPhotos(cellId: string, albumId?: string): Promise<Photo[]> {
    try {
      const cache = await this.getCache();
      let photos = cache.photos.filter(p => p.cell_id === cellId);
      
      if (albumId) {
        photos = photos.filter(p => p.album_id === albumId);
      }

      return photos.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } catch (error) {
      console.error('Error getting photos:', error);
      return [];
    }
  },

  // Obter uma foto específica
  async getPhoto(photoId: string): Promise<Photo | null> {
    try {
      const cache = await this.getCache();
      return cache.photos.find(p => p.id === photoId) || null;
    } catch (error) {
      console.error('Error getting photo:', error);
      return null;
    }
  },

  // Excluir foto
  async deletePhoto(photoId: string): Promise<boolean> {
    try {
      const cache = await this.getCache();
      const photoIndex = cache.photos.findIndex(p => p.id === photoId);
      
      if (photoIndex === -1) return false;

      const photo = cache.photos[photoIndex];

      // Excluir arquivo local se existir
      if (photo.url.startsWith(FileSystem.documentDirectory || '')) {
        try {
          await FileSystem.deleteAsync(photo.url, { idempotent: true });
        } catch (e) {
          console.log('Local file already deleted');
        }
      }

      // Remover do cache
      cache.photos.splice(photoIndex, 1);
      await this.saveCache(cache);

      return true;
    } catch (error) {
      console.error('Error deleting photo:', error);
      return false;
    }
  },

  // Criar álbum
  async createAlbum(
    cellId: string,
    name: string,
    description?: string,
    eventId?: string
  ): Promise<Album | null> {
    try {
      const album: Album = {
        id: `album-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        cell_id: cellId,
        name,
        description,
        photo_count: 0,
        created_at: new Date().toISOString(),
        event_id: eventId,
      };

      const cache = await this.getCache();
      cache.albums.push(album);
      await this.saveCache(cache);

      return album;
    } catch (error) {
      console.error('Error creating album:', error);
      return null;
    }
  },

  // Obter álbuns da célula
  async getAlbums(cellId: string): Promise<Album[]> {
    try {
      const cache = await this.getCache();
      const albums = cache.albums.filter(a => a.cell_id === cellId);

      // Atualizar contagem de fotos
      for (const album of albums) {
        album.photo_count = cache.photos.filter(p => p.album_id === album.id).length;
        
        // Definir foto de capa
        const coverPhoto = cache.photos.find(p => p.album_id === album.id);
        if (coverPhoto) {
          album.cover_photo_url = coverPhoto.url;
        }
      }

      return albums.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } catch (error) {
      console.error('Error getting albums:', error);
      return [];
    }
  },

  // Excluir álbum
  async deleteAlbum(albumId: string): Promise<boolean> {
    try {
      const cache = await this.getCache();
      const albumIndex = cache.albums.findIndex(a => a.id === albumId);
      
      if (albumIndex === -1) return false;

      // Excluir todas as fotos do álbum
      const photosToDelete = cache.photos.filter(p => p.album_id === albumId);
      for (const photo of photosToDelete) {
        await this.deletePhoto(photo.id);
      }

      // Remover álbum
      cache.albums.splice(albumIndex, 1);
      await this.saveCache(cache);

      return true;
    } catch (error) {
      console.error('Error deleting album:', error);
      return false;
    }
  },

  // Obter estatísticas
  async getStats(cellId: string): Promise<GalleryStats> {
    try {
      const cache = await this.getCache();
      const photos = cache.photos.filter(p => p.cell_id === cellId);
      const albums = cache.albums.filter(a => a.cell_id === cellId);

      const now = new Date();
      const thisMonth = photos.filter(p => {
        const photoDate = new Date(p.created_at);
        return photoDate.getMonth() === now.getMonth() && 
               photoDate.getFullYear() === now.getFullYear();
      });

      return {
        total_photos: photos.length,
        total_albums: albums.length,
        photos_this_month: thisMonth.length,
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return { total_photos: 0, total_albums: 0, photos_this_month: 0 };
    }
  },

  // Cache management
  async getCache(): Promise<{ photos: Photo[]; albums: Album[] }> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : { photos: [], albums: [] };
    } catch {
      return { photos: [], albums: [] };
    }
  },

  async saveCache(cache: { photos: Photo[]; albums: Album[] }): Promise<void> {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  },

  async clearCache(): Promise<void> {
    await AsyncStorage.removeItem(CACHE_KEY);
  },
};

// Helper function to decode base64
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
