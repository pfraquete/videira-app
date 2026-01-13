import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/lib/auth-context';
import { PrayerService } from '@/lib/prayer-service';
import { useColors } from '@/hooks/use-colors';

export default function CreatePrayerScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();

  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const handleSave = async () => {
    if (!user) return;

    if (!title.trim()) {
      Alert.alert('Erro', 'Por favor, informe um título para o pedido');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Erro', 'Por favor, descreva seu pedido de oração');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setSaving(true);

    try {
      const authorName = user.profile?.nome_completo || user.email || 'Usuário';
      const prayer = await PrayerService.createPrayerRequest(
        user.id,
        authorName,
        title.trim(),
        description.trim(),
        isAnonymous,
        user.id
      );

      if (prayer) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert('Sucesso', 'Pedido de oração criado com sucesso', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Erro', 'Não foi possível criar o pedido de oração');
      }
    } catch (error) {
      console.error('Error creating prayer request:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao criar o pedido');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-primary font-medium">Cancelar</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-foreground">Novo Pedido</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text className="text-primary font-bold">Salvar</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        {/* Icon */}
        <View className="items-center py-6">
          <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center">
            <IconSymbol name="heart.fill" size={40} color={colors.primary} />
          </View>
          <Text className="text-muted mt-3 text-center px-6">
            Compartilhe seu pedido de oração com a célula
          </Text>
        </View>

        {/* Form */}
        <View className="px-6">
          {/* Title */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-foreground mb-2">
              Título do Pedido *
            </Text>
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
              placeholder="Ex: Oração pela família"
              placeholderTextColor={colors.muted}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          {/* Description */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-foreground mb-2">
              Descrição *
            </Text>
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground min-h-[120px]"
              placeholder="Descreva seu pedido de oração..."
              placeholderTextColor={colors.muted}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
            <Text className="text-xs text-muted mt-1 text-right">
              {description.length}/500
            </Text>
          </View>

          {/* Anonymous Toggle */}
          <View className="bg-surface border border-border rounded-xl p-4 mb-6">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-4">
                <Text className="text-base font-medium text-foreground">
                  Pedido Anônimo
                </Text>
                <Text className="text-sm text-muted mt-1">
                  Seu nome não será exibido para os outros membros
                </Text>
              </View>
              <Switch
                value={isAnonymous}
                onValueChange={setIsAnonymous}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="white"
              />
            </View>
          </View>

          {/* Info */}
          <View className="bg-primary/5 rounded-xl p-4 mb-6">
            <View className="flex-row items-start">
              <IconSymbol name="info.circle.fill" size={20} color={colors.primary} />
              <Text className="flex-1 text-sm text-muted ml-3">
                Os membros da célula poderão orar por este pedido e você receberá
                notificações quando alguém orar. Você pode marcar o pedido como
                respondido a qualquer momento.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
