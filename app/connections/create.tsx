import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { ConnectionService, ConnectionType } from '@/lib/connection-service';
import * as Haptics from 'expo-haptics';

const CONNECTION_TYPES: { value: ConnectionType; label: string; icon: string }[] = [
  { value: 'discipleship', label: 'Discipulado', icon: '📖' },
  { value: 'mentoring', label: 'Mentoria', icon: '🎯' },
  { value: 'counseling', label: 'Aconselhamento', icon: '💬' },
  { value: 'visit', label: 'Visita', icon: '🏠' },
  { value: 'follow_up', label: 'Acompanhamento', icon: '📞' },
];

const SUGGESTED_TOPICS = [
  'Vida devocional',
  'Família',
  'Trabalho',
  'Saúde',
  'Finanças',
  'Relacionamentos',
  'Ministério',
  'Crescimento espiritual',
  'Batismo',
  'Membresia',
];

export default function CreateConnectionScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [memberName, setMemberName] = useState('');
  const [type, setType] = useState<ConnectionType>('discipleship');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [nextSteps, setNextSteps] = useState('');
  const [status, setStatus] = useState<'scheduled' | 'completed'>('completed');

  const userId = (user as any)?.id;

  const toggleTopic = (topic: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTopics(prev => 
      prev.includes(topic) 
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  };

  const handleSave = async () => {
    if (!memberName.trim()) {
      Alert.alert('Erro', 'Informe o nome do membro');
      return;
    }

    if (!date) {
      Alert.alert('Erro', 'Selecione a data');
      return;
    }

    setLoading(true);

    try {
      const connection = await ConnectionService.createConnection({
        leader_id: userId,
        member_id: `member-${Date.now()}`, // Idealmente seria selecionado de uma lista
        member_name: memberName.trim(),
        type,
        date,
        time: time || undefined,
        location: location.trim() || undefined,
        notes: notes.trim(),
        topics,
        next_steps: nextSteps.trim() || undefined,
        status,
      });

      if (connection) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert('Sucesso', 'Conexão registrada com sucesso!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Erro', 'Não foi possível salvar a conexão');
      }
    } catch (error) {
      console.error('Error saving connection:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="p-2 -ml-2"
        >
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-foreground">
          Nova Conexão
        </Text>
        <TouchableOpacity 
          onPress={handleSave}
          disabled={loading}
          className="p-2 -mr-2"
        >
          <Text className={`font-semibold ${loading ? 'text-muted' : 'text-primary'}`}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Member Name */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-foreground mb-2">
            Nome do Membro *
          </Text>
          <TextInput
            value={memberName}
            onChangeText={setMemberName}
            placeholder="Digite o nome do membro"
            placeholderTextColor={colors.muted}
            className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
          />
        </View>

        {/* Connection Type */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-foreground mb-2">
            Tipo de Conexão
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {CONNECTION_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setType(t.value);
                }}
                className={`flex-row items-center px-3 py-2 rounded-full ${
                  type === t.value ? 'bg-primary' : 'bg-surface border border-border'
                }`}
              >
                <Text className="mr-1">{t.icon}</Text>
                <Text className={`text-sm ${type === t.value ? 'text-white font-medium' : 'text-foreground'}`}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Status */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-foreground mb-2">
            Status
          </Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setStatus('completed')}
              className={`flex-1 py-3 rounded-xl ${
                status === 'completed' ? 'bg-green-500' : 'bg-surface border border-border'
              }`}
            >
              <Text className={`text-center font-medium ${status === 'completed' ? 'text-white' : 'text-foreground'}`}>
                ✅ Concluído
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setStatus('scheduled')}
              className={`flex-1 py-3 rounded-xl ${
                status === 'scheduled' ? 'bg-blue-500' : 'bg-surface border border-border'
              }`}
            >
              <Text className={`text-center font-medium ${status === 'scheduled' ? 'text-white' : 'text-foreground'}`}>
                📅 Agendado
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-foreground mb-2">
            Data *
          </Text>
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={colors.muted}
            className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
          />
        </View>

        {/* Time */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-foreground mb-2">
            Horário
          </Text>
          <TextInput
            value={time}
            onChangeText={setTime}
            placeholder="HH:MM"
            placeholderTextColor={colors.muted}
            className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
          />
        </View>

        {/* Location */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-foreground mb-2">
            Local
          </Text>
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="Onde aconteceu/acontecerá"
            placeholderTextColor={colors.muted}
            className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
          />
        </View>

        {/* Topics */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-foreground mb-2">
            Assuntos Abordados
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {SUGGESTED_TOPICS.map((topic) => (
              <TouchableOpacity
                key={topic}
                onPress={() => toggleTopic(topic)}
                className={`px-3 py-2 rounded-full ${
                  topics.includes(topic) ? 'bg-primary' : 'bg-surface border border-border'
                }`}
              >
                <Text className={`text-sm ${topics.includes(topic) ? 'text-white' : 'text-foreground'}`}>
                  {topic}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notes */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-foreground mb-2">
            Anotações
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Observações sobre o encontro..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground min-h-[100px]"
          />
        </View>

        {/* Next Steps */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-foreground mb-2">
            Próximos Passos
          </Text>
          <TextInput
            value={nextSteps}
            onChangeText={setNextSteps}
            placeholder="O que foi combinado para o próximo encontro..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground min-h-[80px]"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          className={`py-4 rounded-xl ${loading ? 'bg-muted' : 'bg-primary'}`}
        >
          <Text className="text-white text-center font-semibold text-base">
            {loading ? 'Salvando...' : 'Salvar Conexão'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}
