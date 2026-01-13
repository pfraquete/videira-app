import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/lib/auth-context';
import { ChatService } from '@/lib/chat-service';
import { useColors } from '@/hooks/use-colors';

interface Contact {
  id: string;
  name: string;
  photo?: string;
}

export default function NewChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);

  const loadContacts = useCallback(async () => {
    if (!user) return;

    try {
      const members = await ChatService.getCellMembers(user.id);
      setContacts(members);
      setFilteredContacts(members);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    if (search.trim()) {
      const filtered = contacts.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredContacts(filtered);
    } else {
      setFilteredContacts(contacts);
    }
  }, [search, contacts]);

  const handleSelectContact = (contact: Contact) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.replace(`/chat/${contact.id}?name=${encodeURIComponent(contact.name)}` as any);
  };

  const renderContact = ({ item }: { item: Contact }) => (
    <TouchableOpacity
      className="flex-row items-center p-4 border-b border-border"
      onPress={() => handleSelectContact(item)}
      activeOpacity={0.7}
    >
      <View className="w-12 h-12 rounded-full bg-primary/20 items-center justify-center mr-3">
        <Text className="text-lg font-bold text-primary">
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text className="flex-1 text-base font-medium text-foreground">
        {item.name}
      </Text>
      <IconSymbol name="chevron.right" size={20} color={colors.muted} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Header */}
      <View className="flex-row items-center px-6 py-4 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-foreground flex-1">
          Nova Conversa
        </Text>
      </View>

      {/* Search */}
      <View className="px-4 py-3 border-b border-border">
        <View className="flex-row items-center bg-surface rounded-xl px-4 py-2">
          <IconSymbol name="magnifyingglass" size={20} color={colors.muted} />
          <TextInput
            className="flex-1 ml-2 text-foreground"
            placeholder="Buscar membro..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <IconSymbol name="xmark.circle.fill" size={20} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {filteredContacts.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <IconSymbol name="person.2.fill" size={48} color={colors.muted} />
          <Text className="text-lg font-medium text-foreground text-center mt-4">
            {search ? 'Nenhum membro encontrado' : 'Nenhum membro na célula'}
          </Text>
          <Text className="text-muted text-center mt-2">
            {search 
              ? 'Tente buscar por outro nome' 
              : 'Adicione membros à sua célula para iniciar conversas'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id}
          renderItem={renderContact}
        />
      )}
    </ScreenContainer>
  );
}
