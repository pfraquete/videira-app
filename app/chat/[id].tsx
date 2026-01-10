import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/lib/auth-context';
import { ChatService, ChatMessage } from '@/lib/chat-service';
import { useColors } from '@/hooks/use-colors';

export default function ChatScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { user } = useAuth();
  const colors = useColors();
  const flatListRef = useRef<FlatList>(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const loadMessages = useCallback(async () => {
    if (!user || !id) return;

    try {
      const data = await ChatService.getMessages(user.id, id);
      setMessages(data);
      
      // Marcar como lidas
      await ChatService.markAsRead(user.id, id);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    loadMessages();
    
    // Polling para novas mensagens
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  const handleSend = async () => {
    if (!user || !id || !newMessage.trim() || sending) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const sent = await ChatService.sendMessage(user.id, id, messageText);
      if (sent) {
        setMessages(prev => [...prev, sent]);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageText); // Restaurar mensagem em caso de erro
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'long',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMe = item.sender_id === user?.id;
    const showDate = index === 0 || 
      new Date(messages[index - 1].created_at).toDateString() !== new Date(item.created_at).toDateString();

    return (
      <View>
        {showDate && (
          <View className="items-center my-4">
            <View className="bg-surface px-3 py-1 rounded-full">
              <Text className="text-xs text-muted">{formatDate(item.created_at)}</Text>
            </View>
          </View>
        )}
        <View className={`flex-row mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
          <View
            className={`max-w-[80%] px-4 py-2 rounded-2xl ${
              isMe 
                ? 'bg-primary rounded-br-sm' 
                : 'bg-surface rounded-bl-sm'
            }`}
          >
            <Text className={isMe ? 'text-white' : 'text-foreground'}>
              {item.message}
            </Text>
            <View className={`flex-row items-center mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
              <Text className={`text-xs ${isMe ? 'text-white/70' : 'text-muted'}`}>
                {formatTime(item.created_at)}
              </Text>
              {isMe && item.read && (
                <IconSymbol 
                  name="checkmark" 
                  size={12} 
                  color={isMe ? 'rgba(255,255,255,0.7)' : colors.muted} 
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center mr-3">
          <IconSymbol name="person.fill" size={20} color={colors.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
            {name || 'Conversa'}
          </Text>
          <Text className="text-xs text-muted">Online</Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <IconSymbol name="message.fill" size={48} color={colors.muted} />
              <Text className="text-muted mt-4 text-center">
                Nenhuma mensagem ainda.{'\n'}Comece a conversa!
              </Text>
            </View>
          }
        />

        {/* Input */}
        <View className="flex-row items-end px-4 py-3 border-t border-border bg-background">
          <View className="flex-1 flex-row items-end bg-surface rounded-2xl px-4 py-2 mr-2">
            <TextInput
              className="flex-1 text-foreground max-h-24"
              placeholder="Digite uma mensagem..."
              placeholderTextColor={colors.muted}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              returnKeyType="default"
            />
          </View>
          <TouchableOpacity
            className={`w-11 h-11 rounded-full items-center justify-center ${
              newMessage.trim() ? 'bg-primary' : 'bg-muted/30'
            }`}
            onPress={handleSend}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <IconSymbol name="paperplane.fill" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
