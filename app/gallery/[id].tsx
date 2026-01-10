import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions,
  Alert,
  Share,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { GalleryService, Photo } from '@/lib/gallery-service';

const { width, height } = Dimensions.get('window');

export default function PhotoViewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(true);

  useEffect(() => {
    loadPhoto();
  }, [id]);

  const loadPhoto = async () => {
    if (!id) return;
    
    try {
      const photoData = await GalleryService.getPhoto(id);
      setPhoto(photoData);
    } catch (error) {
      console.error('Error loading photo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!photo) return;

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        await Sharing.shareAsync(photo.url, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Compartilhar foto',
        });
      } else {
        await Share.share({
          message: `Confira esta foto da nossa célula! ${photo.caption || ''}`,
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Excluir Foto',
      'Tem certeza que deseja excluir esta foto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            if (!photo) return;
            const success = await GalleryService.deletePhoto(photo.id);
            if (success) {
              router.back();
            } else {
              Alert.alert('Erro', 'Não foi possível excluir a foto.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator size="large" color="#fff" />
      </ScreenContainer>
    );
  }

  if (!photo) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <Text className="text-foreground">Foto não encontrada</Text>
        <TouchableOpacity
          className="mt-4 bg-primary px-6 py-3 rounded-full"
          onPress={() => router.back()}
        >
          <Text className="text-white font-bold">Voltar</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      {showInfo && (
        <View 
          className="absolute top-0 left-0 right-0 z-10 flex-row items-center justify-between px-4 pt-12 pb-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <TouchableOpacity 
            onPress={() => router.back()}
            className="p-2"
          >
            <IconSymbol name="chevron.left" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View className="flex-row">
            <TouchableOpacity 
              onPress={handleShare}
              className="p-2 mr-2"
            >
              <IconSymbol name="paperplane.fill" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleDelete}
              className="p-2"
            >
              <IconSymbol name="trash.fill" size={22} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Image */}
      <TouchableOpacity 
        activeOpacity={1}
        onPress={() => setShowInfo(!showInfo)}
        className="flex-1 items-center justify-center"
      >
        <Image
          source={{ uri: photo.url }}
          style={{ width, height: height * 0.7 }}
          resizeMode="contain"
        />
      </TouchableOpacity>

      {/* Info Footer */}
      {showInfo && (
        <View 
          className="absolute bottom-0 left-0 right-0 px-6 pt-4 pb-8"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          {photo.caption && (
            <Text className="text-white text-lg mb-2">{photo.caption}</Text>
          )}
          
          <View className="flex-row items-center mb-1">
            <Text className="text-gray-300 text-sm">
              Por {photo.uploaded_by_name}
            </Text>
          </View>
          
          <Text className="text-gray-400 text-sm">
            {formatDate(photo.created_at)}
          </Text>

          {photo.event_name && (
            <View className="flex-row items-center mt-2">
              <Text className="text-primary text-sm">📅 {photo.event_name}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
