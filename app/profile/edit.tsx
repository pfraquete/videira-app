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
import { Image } from "expo-image";
import { useRouter, Stack } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/lib/auth-context";
import { ProfileService, UserProfile } from "@/lib/profile-service";
import { useColors } from "@/hooks/use-colors";

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Form fields
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [endereco, setEndereco] = useState('');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      const data = await ProfileService.getProfile(user.id);
      if (data) {
        setProfile(data);
        setNome(data.nome || '');
        setTelefone(data.telefone ? ProfileService.formatPhoneInput(data.telefone) : '');
        setDataNascimento(data.data_nascimento ? formatDateForDisplay(data.data_nascimento) : '');
        setEndereco(data.endereco || '');
        setFotoUrl(data.foto_url);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const formatDateForDisplay = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateInput = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  };

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) return null;
    
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const handlePickPhoto = async () => {
    if (!user?.id) return;

    const imageUri = await ProfileService.pickImage();
    if (!imageUri) return;

    setUploadingPhoto(true);
    try {
      const newUrl = await ProfileService.uploadProfilePhoto(user.id, imageUri);
      if (newUrl) {
        setFotoUrl(newUrl);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        Alert.alert('Erro', 'Não foi possível fazer upload da foto');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao fazer upload da foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert(
      'Remover Foto',
      'Tem certeza que deseja remover sua foto de perfil?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;

            setUploadingPhoto(true);
            try {
              const success = await ProfileService.removeProfilePhoto(user.id);
              if (success) {
                setFotoUrl(null);
                if (Platform.OS !== 'web') {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
              } else {
                Alert.alert('Erro', 'Não foi possível remover a foto');
              }
            } catch (error) {
              console.error('Error removing photo:', error);
            } finally {
              setUploadingPhoto(false);
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!user?.id) return;

    const parsedDate = dataNascimento ? parseDate(dataNascimento) : undefined;
    if (dataNascimento && !parsedDate) {
      Alert.alert('Erro', 'Por favor, informe uma data de nascimento válida (DD/MM/AAAA)');
      return;
    }

    setSaving(true);
    try {
      const updated = await ProfileService.updateProfile(user.id, {
        nome: nome.trim() || undefined,
        telefone: telefone.replace(/\D/g, '') || undefined,
        data_nascimento: parsedDate || undefined,
        endereco: endereco.trim() || undefined,
      });

      if (updated) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        router.back();
      } else {
        Alert.alert('Erro', 'Não foi possível salvar as alterações');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao salvar o perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-muted mt-4">Carregando perfil...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
        <TouchableOpacity
          className="flex-row items-center"
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          <Text className="text-primary ml-1">Cancelar</Text>
        </TouchableOpacity>
        <Text className="text-foreground font-bold text-lg">Editar Perfil</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text className="text-primary font-bold">Salvar</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Profile Photo */}
          <View className="items-center py-8">
            <View className="relative">
              {fotoUrl ? (
                <Image
                  source={{ uri: fotoUrl }}
                  className="w-32 h-32 rounded-full"
                  contentFit="cover"
                />
              ) : (
                <View className="w-32 h-32 rounded-full bg-primary items-center justify-center">
                  <Text className="text-background text-4xl font-bold">
                    {nome ? nome.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              
              {uploadingPhoto && (
                <View className="absolute inset-0 bg-black/50 rounded-full items-center justify-center">
                  <ActivityIndicator color="#ffffff" />
                </View>
              )}
              
              <TouchableOpacity
                className="absolute bottom-0 right-0 bg-primary w-10 h-10 rounded-full items-center justify-center border-4 border-background"
                onPress={handlePickPhoto}
                disabled={uploadingPhoto}
              >
                <IconSymbol name="camera.fill" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
            
            {fotoUrl && (
              <TouchableOpacity
                className="mt-3"
                onPress={handleRemovePhoto}
                disabled={uploadingPhoto}
              >
                <Text className="text-error text-sm">Remover foto</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Form */}
          <View className="px-6">
            {/* Email (read-only) */}
            <View className="mb-4">
              <Text className="text-muted text-sm font-medium mb-2">Email</Text>
              <View className="bg-surface border border-border rounded-xl px-4 py-3">
                <Text className="text-muted">{user?.email}</Text>
              </View>
              <Text className="text-muted text-xs mt-1">O email não pode ser alterado</Text>
            </View>

            {/* Nome */}
            <View className="mb-4">
              <Text className="text-muted text-sm font-medium mb-2">Nome completo</Text>
              <TextInput
                className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
                placeholder="Seu nome completo"
                placeholderTextColor={colors.muted}
                value={nome}
                onChangeText={setNome}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            {/* Telefone */}
            <View className="mb-4">
              <Text className="text-muted text-sm font-medium mb-2">Telefone</Text>
              <TextInput
                className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
                placeholder="(00) 00000-0000"
                placeholderTextColor={colors.muted}
                value={telefone}
                onChangeText={(text) => setTelefone(ProfileService.formatPhoneInput(text))}
                keyboardType="phone-pad"
                maxLength={15}
                returnKeyType="next"
              />
            </View>

            {/* Data de Nascimento */}
            <View className="mb-4">
              <Text className="text-muted text-sm font-medium mb-2">Data de nascimento</Text>
              <TextInput
                className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
                placeholder="DD/MM/AAAA"
                placeholderTextColor={colors.muted}
                value={dataNascimento}
                onChangeText={(text) => setDataNascimento(formatDateInput(text))}
                keyboardType="numeric"
                maxLength={10}
                returnKeyType="next"
              />
            </View>

            {/* Endereço */}
            <View className="mb-4">
              <Text className="text-muted text-sm font-medium mb-2">Endereço</Text>
              <TextInput
                className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
                placeholder="Seu endereço completo"
                placeholderTextColor={colors.muted}
                value={endereco}
                onChangeText={setEndereco}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
                style={{ minHeight: 60 }}
              />
            </View>

            {/* Role Info */}
            <View className="bg-primary/10 rounded-xl p-4 flex-row items-start">
              <IconSymbol name="info.circle.fill" size={20} color={colors.primary} />
              <View className="flex-1 ml-3">
                <Text className="text-foreground font-medium">Seu papel: {user?.role || 'Participante'}</Text>
                <Text className="text-muted text-sm mt-1">
                  O papel é definido pelo administrador da igreja e não pode ser alterado aqui.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
