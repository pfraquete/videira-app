import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/lib/auth-context";
import { DataService } from "@/lib/data-service";
import { useColors } from "@/hooks/use-colors";
import { Member } from "@/lib/supabase";

const MEMBER_ROLES = [
  'Líder',
  'Líder em Treinamento',
  'Anjo da Guarda',
  'Membro',
  'Frequentador',
  'Visitante',
  'Kids',
];

export default function MembersScreen() {
  const { user } = useAuth();
  const colors = useColors();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // New member form
  const [newMember, setNewMember] = useState({
    nome: "",
    telefone: "",
    email: "",
    funcao: "Membro",
  });

  const loadMembers = useCallback(async () => {
    if (!user) return;

    try {
      const data = await DataService.getMembers(user.id);
      setMembers(data);
      setFilteredMembers(data);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = members.filter(m => 
        m.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.telefone?.includes(searchQuery) ||
        m.funcao?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMembers(filtered);
    } else {
      setFilteredMembers(members);
    }
  }, [searchQuery, members]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMembers();
    setRefreshing(false);
  }, [loadMembers]);

  const handleAddMember = async () => {
    if (!newMember.nome.trim()) {
      Alert.alert('Erro', 'O nome é obrigatório');
      return;
    }

    if (!user) return;

    setSaving(true);
    try {
      const created = await DataService.createMember(user.id, newMember);
      if (created) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setMembers(prev => [...prev, created]);
        setShowAddModal(false);
        setNewMember({ nome: "", telefone: "", email: "", funcao: "Membro" });
      } else {
        Alert.alert('Erro', 'Não foi possível adicionar o membro');
      }
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao adicionar o membro');
    } finally {
      setSaving(false);
    }
  };

  const getRoleColor = (funcao: string) => {
    switch (funcao) {
      case 'Líder': return colors.success;
      case 'Líder em Treinamento': return '#22c55e';
      case 'Anjo da Guarda': return '#a855f7';
      case 'Membro': return colors.primary;
      case 'Frequentador': return '#f97316';
      case 'Visitante': return '#64748b';
      case 'Kids': return '#ec4899';
      default: return colors.muted;
    }
  };

  const renderMember = ({ item }: { item: Member }) => (
    <TouchableOpacity
      className="bg-surface rounded-xl p-4 mb-3 border border-border flex-row items-center"
      activeOpacity={0.7}
    >
      <View 
        className="w-12 h-12 rounded-full items-center justify-center"
        style={{ backgroundColor: getRoleColor(item.funcao) + '20' }}
      >
        <Text className="text-lg font-bold" style={{ color: getRoleColor(item.funcao) }}>
          {item.nome.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-foreground font-medium text-base">{item.nome}</Text>
        <View className="flex-row items-center mt-1">
          <View 
            className="px-2 py-0.5 rounded-full"
            style={{ backgroundColor: getRoleColor(item.funcao) + '20' }}
          >
            <Text className="text-xs" style={{ color: getRoleColor(item.funcao) }}>
              {item.funcao}
            </Text>
          </View>
          {item.status === 'Inativo' && (
            <View className="ml-2 px-2 py-0.5 rounded-full bg-error/20">
              <Text className="text-xs text-error">Inativo</Text>
            </View>
          )}
        </View>
      </View>
      {item.telefone && (
        <TouchableOpacity className="p-2">
          <IconSymbol name="phone.fill" size={20} color={colors.primary} />
        </TouchableOpacity>
      )}
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
      <View className="px-6 pt-4 pb-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-foreground">Membros</Text>
          <TouchableOpacity
            className="bg-primary rounded-full p-2"
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.8}
          >
            <IconSymbol name="plus" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-surface border border-border rounded-xl px-4 py-2">
          <IconSymbol name="magnifyingglass" size={20} color={colors.muted} />
          <TextInput
            className="flex-1 ml-2 text-foreground"
            placeholder="Buscar membro..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Members List */}
      <FlatList
        data={filteredMembers}
        renderItem={renderMember}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="items-center py-12">
            <IconSymbol name="person.2.fill" size={48} color={colors.muted} />
            <Text className="text-muted mt-4 text-center">
              {searchQuery ? 'Nenhum membro encontrado' : 'Nenhum membro cadastrado'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                className="mt-4 bg-primary px-6 py-3 rounded-xl"
                onPress={() => setShowAddModal(true)}
              >
                <Text className="text-background font-medium">Adicionar Membro</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Add Member Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 bg-background"
        >
          <View className="flex-1">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text className="text-primary text-base">Cancelar</Text>
              </TouchableOpacity>
              <Text className="text-foreground font-bold text-lg">Novo Membro</Text>
              <TouchableOpacity onPress={handleAddMember} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text className="text-primary font-bold text-base">Salvar</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Form */}
            <ScrollView className="flex-1 px-6 py-4">
              <View className="gap-4">
                <View>
                  <Text className="text-sm font-medium text-foreground mb-2">Nome *</Text>
                  <TextInput
                    className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
                    placeholder="Nome completo"
                    placeholderTextColor={colors.muted}
                    value={newMember.nome}
                    onChangeText={(text) => setNewMember(prev => ({ ...prev, nome: text }))}
                    autoCapitalize="words"
                  />
                </View>

                <View>
                  <Text className="text-sm font-medium text-foreground mb-2">Telefone</Text>
                  <TextInput
                    className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
                    placeholder="(00) 00000-0000"
                    placeholderTextColor={colors.muted}
                    value={newMember.telefone}
                    onChangeText={(text) => setNewMember(prev => ({ ...prev, telefone: text }))}
                    keyboardType="phone-pad"
                  />
                </View>

                <View>
                  <Text className="text-sm font-medium text-foreground mb-2">Email</Text>
                  <TextInput
                    className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
                    placeholder="email@exemplo.com"
                    placeholderTextColor={colors.muted}
                    value={newMember.email}
                    onChangeText={(text) => setNewMember(prev => ({ ...prev, email: text }))}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View>
                  <Text className="text-sm font-medium text-foreground mb-2">Função</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {MEMBER_ROLES.map((role) => (
                      <TouchableOpacity
                        key={role}
                        className={`px-4 py-2 rounded-full border ${
                          newMember.funcao === role 
                            ? 'bg-primary border-primary' 
                            : 'bg-surface border-border'
                        }`}
                        onPress={() => setNewMember(prev => ({ ...prev, funcao: role }))}
                      >
                        <Text className={newMember.funcao === role ? 'text-background' : 'text-foreground'}>
                          {role}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}
