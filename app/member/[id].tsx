import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
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

const MEMBER_STATUS = ['Ativo', 'Inativo'];

const GENDER_OPTIONS = ['Masculino', 'Feminino'];

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [member, setMember] = useState<Member | null>(null);
  const [editedMember, setEditedMember] = useState<Partial<Member>>({});

  const loadMember = useCallback(async () => {
    if (!id) return;

    try {
      const data = await DataService.getMember(parseInt(id));
      setMember(data);
      setEditedMember(data || {});
    } catch (error) {
      console.error('Error loading member:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do membro');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMember();
  }, [loadMember]);

  const handleSave = async () => {
    if (!member || !editedMember.nome?.trim()) {
      Alert.alert('Erro', 'O nome é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const updated = await DataService.updateMember(member.id, editedMember);
      if (updated) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setMember(updated);
        setIsEditing(false);
        Alert.alert('Sucesso', 'Membro atualizado com sucesso');
      } else {
        Alert.alert('Erro', 'Não foi possível atualizar o membro');
      }
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao atualizar o membro');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Excluir Membro',
      `Tem certeza que deseja excluir ${member?.nome}? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            if (!member) return;
            setDeleting(true);
            try {
              const success = await DataService.deleteMember(member.id);
              if (success) {
                if (Platform.OS !== 'web') {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                router.back();
              } else {
                Alert.alert('Erro', 'Não foi possível excluir o membro');
              }
            } catch (error) {
              Alert.alert('Erro', 'Ocorreu um erro ao excluir o membro');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const cancelEdit = () => {
    setEditedMember(member || {});
    setIsEditing(false);
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

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (!member) {
    return (
      <ScreenContainer className="items-center justify-center px-6">
        <Stack.Screen options={{ headerShown: false }} />
        <IconSymbol name="exclamationmark.triangle.fill" size={48} color={colors.error} />
        <Text className="text-foreground font-bold text-lg mt-4">Membro não encontrado</Text>
        <TouchableOpacity
          className="mt-4 bg-primary px-6 py-3 rounded-xl"
          onPress={() => router.back()}
        >
          <Text className="text-background font-medium">Voltar</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.primary} />
            <Text className="text-primary ml-1">Voltar</Text>
          </TouchableOpacity>
          
          {isEditing ? (
            <View className="flex-row gap-4">
              <TouchableOpacity onPress={cancelEdit}>
                <Text className="text-muted">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text className="text-primary font-bold">Salvar</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Text className="text-primary font-bold">Editar</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Profile Header */}
          <View className="items-center py-6 px-6">
            <View 
              className="w-24 h-24 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: getRoleColor(member.funcao) + '20' }}
            >
              <Text className="text-4xl font-bold" style={{ color: getRoleColor(member.funcao) }}>
                {member.nome.charAt(0).toUpperCase()}
              </Text>
            </View>
            {!isEditing && (
              <>
                <Text className="text-2xl font-bold text-foreground text-center">{member.nome}</Text>
                <View 
                  className="mt-2 px-4 py-1.5 rounded-full"
                  style={{ backgroundColor: getRoleColor(member.funcao) + '20' }}
                >
                  <Text style={{ color: getRoleColor(member.funcao) }} className="font-medium">
                    {member.funcao}
                  </Text>
                </View>
                {member.status === 'Inativo' && (
                  <View className="mt-2 px-3 py-1 rounded-full bg-error/20">
                    <Text className="text-error text-sm">Inativo</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Form Fields */}
          <View className="px-6 gap-4">
            {/* Nome */}
            <View>
              <Text className="text-sm font-medium text-muted mb-2">Nome Completo</Text>
              {isEditing ? (
                <TextInput
                  className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
                  value={editedMember.nome || ''}
                  onChangeText={(text) => setEditedMember(prev => ({ ...prev, nome: text }))}
                  autoCapitalize="words"
                />
              ) : (
                <View className="bg-surface border border-border rounded-xl px-4 py-3">
                  <Text className="text-foreground">{member.nome}</Text>
                </View>
              )}
            </View>

            {/* Telefone */}
            <View>
              <Text className="text-sm font-medium text-muted mb-2">Telefone</Text>
              {isEditing ? (
                <TextInput
                  className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
                  value={editedMember.telefone || ''}
                  onChangeText={(text) => setEditedMember(prev => ({ ...prev, telefone: text }))}
                  keyboardType="phone-pad"
                  placeholder="(00) 00000-0000"
                  placeholderTextColor={colors.muted}
                />
              ) : (
                <View className="bg-surface border border-border rounded-xl px-4 py-3">
                  <Text className={member.telefone ? "text-foreground" : "text-muted"}>
                    {member.telefone || 'Não informado'}
                  </Text>
                </View>
              )}
            </View>

            {/* Email */}
            <View>
              <Text className="text-sm font-medium text-muted mb-2">Email</Text>
              {isEditing ? (
                <TextInput
                  className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
                  value={editedMember.email || ''}
                  onChangeText={(text) => setEditedMember(prev => ({ ...prev, email: text }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="email@exemplo.com"
                  placeholderTextColor={colors.muted}
                />
              ) : (
                <View className="bg-surface border border-border rounded-xl px-4 py-3">
                  <Text className={member.email ? "text-foreground" : "text-muted"}>
                    {member.email || 'Não informado'}
                  </Text>
                </View>
              )}
            </View>

            {/* Endereço */}
            <View>
              <Text className="text-sm font-medium text-muted mb-2">Endereço</Text>
              {isEditing ? (
                <TextInput
                  className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
                  value={editedMember.endereco || ''}
                  onChangeText={(text) => setEditedMember(prev => ({ ...prev, endereco: text }))}
                  placeholder="Rua, número, bairro"
                  placeholderTextColor={colors.muted}
                />
              ) : (
                <View className="bg-surface border border-border rounded-xl px-4 py-3">
                  <Text className={member.endereco ? "text-foreground" : "text-muted"}>
                    {member.endereco || 'Não informado'}
                  </Text>
                </View>
              )}
            </View>

            {/* Data de Nascimento */}
            <View>
              <Text className="text-sm font-medium text-muted mb-2">Data de Nascimento</Text>
              {isEditing ? (
                <TextInput
                  className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
                  value={editedMember.data_nascimento || ''}
                  onChangeText={(text) => setEditedMember(prev => ({ ...prev, data_nascimento: text }))}
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor={colors.muted}
                />
              ) : (
                <View className="bg-surface border border-border rounded-xl px-4 py-3">
                  <Text className={member.data_nascimento ? "text-foreground" : "text-muted"}>
                    {member.data_nascimento 
                      ? new Date(member.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR')
                      : 'Não informado'}
                  </Text>
                </View>
              )}
            </View>

            {/* Gênero */}
            <View>
              <Text className="text-sm font-medium text-muted mb-2">Gênero</Text>
              {isEditing ? (
                <View className="flex-row gap-2">
                  {GENDER_OPTIONS.map((gender) => (
                    <TouchableOpacity
                      key={gender}
                      className={`flex-1 py-3 rounded-xl border ${
                        editedMember.genero === gender 
                          ? 'bg-primary border-primary' 
                          : 'bg-surface border-border'
                      }`}
                      onPress={() => setEditedMember(prev => ({ ...prev, genero: gender }))}
                    >
                      <Text className={`text-center ${editedMember.genero === gender ? 'text-background font-medium' : 'text-foreground'}`}>
                        {gender}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View className="bg-surface border border-border rounded-xl px-4 py-3">
                  <Text className={member.genero ? "text-foreground" : "text-muted"}>
                    {member.genero || 'Não informado'}
                  </Text>
                </View>
              )}
            </View>

            {/* Função */}
            <View>
              <Text className="text-sm font-medium text-muted mb-2">Função na Célula</Text>
              {isEditing ? (
                <View className="flex-row flex-wrap gap-2">
                  {MEMBER_ROLES.map((role) => (
                    <TouchableOpacity
                      key={role}
                      className={`px-4 py-2 rounded-full border ${
                        editedMember.funcao === role 
                          ? 'bg-primary border-primary' 
                          : 'bg-surface border-border'
                      }`}
                      onPress={() => setEditedMember(prev => ({ ...prev, funcao: role }))}
                    >
                      <Text className={editedMember.funcao === role ? 'text-background' : 'text-foreground'}>
                        {role}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View className="bg-surface border border-border rounded-xl px-4 py-3">
                  <Text className="text-foreground">{member.funcao}</Text>
                </View>
              )}
            </View>

            {/* Status */}
            <View>
              <Text className="text-sm font-medium text-muted mb-2">Status</Text>
              {isEditing ? (
                <View className="flex-row gap-2">
                  {MEMBER_STATUS.map((status) => (
                    <TouchableOpacity
                      key={status}
                      className={`flex-1 py-3 rounded-xl border ${
                        editedMember.status === status 
                          ? status === 'Ativo' ? 'bg-success border-success' : 'bg-error border-error'
                          : 'bg-surface border-border'
                      }`}
                      onPress={() => setEditedMember(prev => ({ ...prev, status: status }))}
                    >
                      <Text className={`text-center ${editedMember.status === status ? 'text-background font-medium' : 'text-foreground'}`}>
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View className="bg-surface border border-border rounded-xl px-4 py-3">
                  <Text className={member.status === 'Ativo' ? "text-success" : "text-error"}>
                    {member.status}
                  </Text>
                </View>
              )}
            </View>

            {/* Delete Button */}
            {!isEditing && (
              <TouchableOpacity
                className="mt-6 bg-error/10 rounded-xl py-4 items-center flex-row justify-center"
                onPress={handleDelete}
                disabled={deleting}
                activeOpacity={0.8}
              >
                {deleting ? (
                  <ActivityIndicator color={colors.error} />
                ) : (
                  <>
                    <IconSymbol name="trash.fill" size={20} color={colors.error} />
                    <Text className="text-error font-bold ml-2">Excluir Membro</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
