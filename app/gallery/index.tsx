import { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/lib/auth-context';
import { GalleryService, Photo, Album, GalleryStats } from '@/lib/gallery-service';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 48) / 3;

type ViewMode = 'photos' | 'albums';

export default function GalleryScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  
  const [viewMode, setViewMode] = useState<ViewMode>('photos');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [stats, setStats] = useState<GalleryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const cellId = (user as any)?.profile?.cell_id || 'default';

  const loadData = useCallback(async () => {
    try {
      const [photosData, albumsData, statsData] = await Promise.all([
        GalleryService.getPhotos(cellId),
        GalleryService.getAlbums(cellId),
        GalleryService.getStats(cellId),
      ]);
      setPhotos(photosData);
      setAlbums(albumsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading gallery:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cellId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para adicionar fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadPhoto(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para tirar fotos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadPhoto(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (uri: string) => {
    setUploading(true);
    try {
      const photo = await GalleryService.uploadPhoto(
        cellId,
        uri,
        user?.id || '',
        user?.email || 'Usuário'
      );

      if (photo) {
        setPhotos(prev => [photo, ...prev]);
        setStats(prev => prev ? {
          ...prev,
          total_photos: prev.total_photos + 1,
          photos_this_month: prev.photos_this_month + 1,
        } : null);
        Alert.alert('Sucesso', 'Foto adicionada à galeria!');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível adicionar a foto.');
    } finally {
      setUploading(false);
    }
  };

  const showAddOptions = () => {
    Alert.alert(
      'Adicionar Foto',
      'Escolha uma opção',
      [
        { text: 'Tirar Foto', onPress: takePhoto },
        { text: 'Escolher da Galeria', onPress: pickImage },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const handleDeletePhoto = (photoId: string) => {
    Alert.alert(
      'Excluir Foto',
      'Tem certeza que deseja excluir esta foto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const success = await GalleryService.deletePhoto(photoId);
            if (success) {
              setPhotos(prev => prev.filter(p => p.id !== photoId));
              setStats(prev => prev ? {
                ...prev,
                total_photos: prev.total_photos - 1,
              } : null);
            }
          },
        },
      ]
    );
  };

  const renderPhoto = ({ item }: { item: Photo }) => (
    <TouchableOpacity
      style={{
        width: PHOTO_SIZE,
        height: PHOTO_SIZE,
        margin: 4,
        borderRadius: 8,
        overflow: 'hidden',
      }}
      onPress={() => router.push(`/gallery/${item.id}` as any)}
      onLongPress={() => handleDeletePhoto(item.id)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.url }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  const renderAlbum = ({ item }: { item: Album }) => (
    <TouchableOpacity
      className="bg-surface rounded-xl overflow-hidden mb-4"
      onPress={() => router.push(`/gallery/album/${item.id}` as any)}
      activeOpacity={0.8}
    >
      <View style={{ height: 150 }}>
        {item.cover_photo_url ? (
          <Image
            source={{ uri: item.cover_photo_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View 
            className="flex-1 items-center justify-center"
            style={{ backgroundColor: colors.border }}
          >
            <Text className="text-4xl">📁</Text>
          </View>
        )}
      </View>
      <View className="p-4">
        <Text className="text-foreground font-bold text-lg">{item.name}</Text>
        {item.description && (
          <Text className="text-muted text-sm mt-1">{item.description}</Text>
        )}
        <Text className="text-muted text-sm mt-2">
          {item.photo_count} {item.photo_count === 1 ? 'foto' : 'fotos'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-foreground">Galeria</Text>
        <TouchableOpacity onPress={showAddOptions} disabled={uploading}>
          {uploading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <IconSymbol name="plus" size={24} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {stats && (
        <View className="flex-row px-6 mb-4">
          <View className="flex-1 bg-surface rounded-xl p-4 mr-2">
            <Text className="text-2xl font-bold text-foreground">{stats.total_photos}</Text>
            <Text className="text-muted text-sm">Fotos</Text>
          </View>
          <View className="flex-1 bg-surface rounded-xl p-4 ml-2">
            <Text className="text-2xl font-bold text-foreground">{stats.photos_this_month}</Text>
            <Text className="text-muted text-sm">Este mês</Text>
          </View>
        </View>
      )}

      {/* View Mode Tabs */}
      <View className="flex-row mx-6 mb-4 bg-surface rounded-xl p-1">
        <TouchableOpacity
          className={`flex-1 py-3 rounded-lg ${viewMode === 'photos' ? 'bg-primary' : ''}`}
          onPress={() => setViewMode('photos')}
        >
          <Text className={`text-center font-medium ${viewMode === 'photos' ? 'text-white' : 'text-muted'}`}>
            Fotos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-3 rounded-lg ${viewMode === 'albums' ? 'bg-primary' : ''}`}
          onPress={() => setViewMode('albums')}
        >
          <Text className={`text-center font-medium ${viewMode === 'albums' ? 'text-white' : 'text-muted'}`}>
            Álbuns
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {viewMode === 'photos' ? (
        photos.length > 0 ? (
          <FlatList
            data={photos}
            renderItem={renderPhoto}
            keyExtractor={item => item.id}
            numColumns={3}
            contentContainerStyle={{ paddingHorizontal: 12 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          />
        ) : (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-6xl mb-4">📷</Text>
            <Text className="text-foreground font-bold text-lg text-center">
              Nenhuma foto ainda
            </Text>
            <Text className="text-muted text-center mt-2">
              Adicione fotos dos encontros da célula para compartilhar com todos!
            </Text>
            <TouchableOpacity
              className="bg-primary px-6 py-3 rounded-full mt-6"
              onPress={showAddOptions}
            >
              <Text className="text-white font-bold">Adicionar Primeira Foto</Text>
            </TouchableOpacity>
          </View>
        )
      ) : (
        <FlatList
          data={albums}
          renderItem={renderAlbum}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-12">
              <Text className="text-6xl mb-4">📁</Text>
              <Text className="text-foreground font-bold text-lg text-center">
                Nenhum álbum ainda
              </Text>
              <Text className="text-muted text-center mt-2">
                Crie álbuns para organizar as fotos por eventos ou temas.
              </Text>
              <TouchableOpacity
                className="bg-primary px-6 py-3 rounded-full mt-6"
                onPress={() => router.push('/gallery/create-album' as any)}
              >
                <Text className="text-white font-bold">Criar Primeiro Álbum</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}
