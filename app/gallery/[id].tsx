import { useState, useEffect, useRef } from 'react';
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
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { GalleryService, Photo, PhotoComment } from '@/lib/gallery-service';
import { useAuth } from '@/hooks/use-auth';

const { width, height } = Dimensions.get('window');

export default function PhotoViewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { user } = useAuth();
  
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadPhoto();
    loadComments();
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

  const loadComments = async () => {
    if (!id) return;
    
    try {
      const commentsData = await GalleryService.getComments(id);
      setComments(commentsData);
      setCommentCount(commentsData.length);
    } catch (error) {
      console.error('Error loading comments:', error);
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

  const handleSendComment = async () => {
    if (!newComment.trim() || !id || !user) return;
    
    setSendingComment(true);
    try {
      const comment = await GalleryService.addComment(
        id,
        String(user.id),
        user.name || user.email?.split('@')[0] || 'Usuário',
        newComment.trim()
      );
      
      if (comment) {
        setComments(prev => [...prev, comment]);
        setCommentCount(prev => prev + 1);
        setNewComment('');
      }
    } catch (error) {
      console.error('Error sending comment:', error);
      Alert.alert('Erro', 'Não foi possível enviar o comentário.');
    } finally {
      setSendingComment(false);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (!user) return;
    
    Alert.alert(
      'Excluir Comentário',
      'Tem certeza que deseja excluir este comentário?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const success = await GalleryService.deleteComment(commentId, String(user.id));
            if (success) {
              setComments(prev => prev.filter(c => c.id !== commentId));
              setCommentCount(prev => prev - 1);
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

  const formatCommentDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const renderComment = ({ item }: { item: PhotoComment }) => (
    <View className="flex-row py-3 border-b border-border">
      <View 
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: colors.primary + '20' }}
      >
        <Text className="text-primary font-bold">
          {item.user_name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-foreground font-semibold">{item.user_name}</Text>
          <View className="flex-row items-center">
            <Text className="text-muted text-xs">{formatCommentDate(item.created_at)}</Text>
            {String(user?.id) === item.user_id && (
              <TouchableOpacity 
                onPress={() => handleDeleteComment(item.id)}
                className="ml-2 p-1"
              >
                <IconSymbol name="trash.fill" size={14} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text className="text-foreground mt-1">{item.text}</Text>
      </View>
    </View>
  );

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

  // Comments Modal View
  if (showComments) {
    return (
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-background"
      >
        <ScreenContainer className="flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
            <TouchableOpacity onPress={() => setShowComments(false)}>
              <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text className="text-foreground font-bold text-lg">
              Comentários ({commentCount})
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Comments List */}
          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            ListEmptyComponent={
              <View className="items-center py-12">
                <Text className="text-muted text-lg mb-2">💬</Text>
                <Text className="text-muted">Nenhum comentário ainda</Text>
                <Text className="text-muted text-sm">Seja o primeiro a comentar!</Text>
              </View>
            }
          />

          {/* Comment Input */}
          <View className="flex-row items-center px-4 py-3 border-t border-border bg-surface">
            <TextInput
              ref={inputRef}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Escreva um comentário..."
              placeholderTextColor={colors.muted}
              className="flex-1 bg-background rounded-full px-4 py-2 mr-2 text-foreground"
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleSendComment}
            />
            <TouchableOpacity
              onPress={handleSendComment}
              disabled={!newComment.trim() || sendingComment}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ 
                backgroundColor: newComment.trim() ? colors.primary : colors.muted + '40',
              }}
            >
              {sendingComment ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <IconSymbol name="paperplane.fill" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </ScreenContainer>
      </KeyboardAvoidingView>
    );
  }

  // Photo View
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
              onPress={() => setShowComments(true)}
              className="p-2 mr-2 flex-row items-center"
            >
              <IconSymbol name="message.fill" size={22} color="#fff" />
              {commentCount > 0 && (
                <Text className="text-white text-sm ml-1">{commentCount}</Text>
              )}
            </TouchableOpacity>
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

          {/* Comments Button */}
          <TouchableOpacity
            onPress={() => setShowComments(true)}
            className="flex-row items-center mt-4 py-2"
          >
            <IconSymbol name="message.fill" size={18} color="#fff" />
            <Text className="text-white ml-2">
              {commentCount > 0 
                ? `Ver ${commentCount} comentário${commentCount > 1 ? 's' : ''}`
                : 'Adicionar comentário'
              }
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
