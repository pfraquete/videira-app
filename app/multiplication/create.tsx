import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { MultiplicationService, MemberAllocation } from '@/lib/multiplication-service';
import { DataService } from '@/lib/data-service';
import * as Haptics from 'expo-haptics';

export default function CreateMultiplicationScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  // Step 1: Basic Info
  const [newCellName, setNewCellName] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [newLeaderName, setNewLeaderName] = useState('');
  const [notes, setNotes] = useState('');
  
  // Step 2: Member Allocation
  const [members, setMembers] = useState<MemberAllocation[]>([]);

  const cellId = (user as any)?.profile?.cell_id || (user as any)?.cell_id;
  const cellName = (user as any)?.profile?.cell_name || 'Célula Atual';

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const membersData = await DataService.getMembers(cellId);
      setMembers(membersData.map((m: any) => ({
        member_id: m.id,
        member_name: m.name,
        destination: 'original' as const,
        role: m.role,
      })));
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const toggleMemberDestination = (memberId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setMembers(prev => prev.map(m => 
      m.member_id === memberId 
        ? { ...m, destination: m.destination === 'original' ? 'new' : 'original' }
        : m
    ));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!newCellName.trim()) {
        Alert.alert('Erro', 'Informe o nome da nova célula');
        return;
      }
      if (!targetDate) {
        Alert.alert('Erro', 'Selecione a data prevista');
        return;
      }
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  const handleSave = async () => {
    const membersToNew = members.filter(m => m.destination === 'new');
    
    if (membersToNew.length === 0) {
      Alert.alert('Atenção', 'Selecione pelo menos um membro para a nova célula');
      return;
    }

    setLoading(true);

    try {
      const plan = await MultiplicationService.createPlan({
        original_cell_id: cellId,
        original_cell_name: cellName,
        new_cell_name: newCellName.trim(),
        new_leader_name: newLeaderName.trim() || undefined,
        target_date: targetDate,
        status: 'planning',
        members_to_transfer: members,
        notes: notes.trim(),
      });

      if (plan) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert(
          'Sucesso', 
          'Plano de multiplicação criado com sucesso!',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Erro', 'Não foi possível criar o plano');
      }
    } catch (error) {
      console.error('Error creating plan:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const membersToNew = members.filter(m => m.destination === 'new').length;
  const membersToOriginal = members.filter(m => m.destination === 'original').length;

  return (
    <ScreenContainer>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <TouchableOpacity 
          onPress={handleBack}
          className="p-2 -ml-2"
        >
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-foreground">
          Nova Multiplicação
        </Text>
        <View className="w-10" />
      </View>

      {/* Progress Steps */}
      <View className="flex-row px-4 py-4 gap-2">
        <View className={`flex-1 h-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-border'}`} />
        <View className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-border'}`} />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {step === 1 ? (
          <>
            {/* Step 1: Basic Info */}
            <Text className="text-xl font-bold text-foreground mb-2">
              Informações da Nova Célula
            </Text>
            <Text className="text-sm text-muted mb-6">
              Defina os detalhes básicos da multiplicação
            </Text>

            {/* New Cell Name */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-foreground mb-2">
                Nome da Nova Célula *
              </Text>
              <TextInput
                value={newCellName}
                onChangeText={setNewCellName}
                placeholder="Ex: Célula Vida Nova"
                placeholderTextColor={colors.muted}
                className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
              />
            </View>

            {/* Target Date */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-foreground mb-2">
                Data Prevista *
              </Text>
              <TextInput
                value={targetDate}
                onChangeText={setTargetDate}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={colors.muted}
                className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
              />
            </View>

            {/* New Leader */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-foreground mb-2">
                Novo Líder (opcional)
              </Text>
              <TextInput
                value={newLeaderName}
                onChangeText={setNewLeaderName}
                placeholder="Nome do líder da nova célula"
                placeholderTextColor={colors.muted}
                className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
              />
            </View>

            {/* Notes */}
            <View className="mb-6">
              <Text className="text-sm font-medium text-foreground mb-2">
                Observações
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Anotações sobre a multiplicação..."
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground min-h-[100px]"
              />
            </View>

            {/* Next Button */}
            <TouchableOpacity
              onPress={handleNext}
              className="py-4 rounded-xl bg-primary"
            >
              <Text className="text-white text-center font-semibold text-base">
                Próximo: Alocar Membros
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Step 2: Member Allocation */}
            <Text className="text-xl font-bold text-foreground mb-2">
              Alocar Membros
            </Text>
            <Text className="text-sm text-muted mb-4">
              Selecione quem vai para a nova célula
            </Text>

            {/* Summary */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1 bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                <Text className="text-xl font-bold text-blue-500">{membersToOriginal}</Text>
                <Text className="text-xs text-muted">Ficam na atual</Text>
              </View>
              <View className="flex-1 bg-green-500/10 p-3 rounded-xl border border-green-500/20">
                <Text className="text-xl font-bold text-green-500">{membersToNew}</Text>
                <Text className="text-xs text-muted">Vão para nova</Text>
              </View>
            </View>

            {/* Members List */}
            <View className="mb-6">
              {members.map((member) => (
                <TouchableOpacity
                  key={member.member_id}
                  onPress={() => toggleMemberDestination(member.member_id)}
                  className={`flex-row items-center p-4 mb-2 rounded-xl border ${
                    member.destination === 'new' 
                      ? 'bg-green-500/10 border-green-500' 
                      : 'bg-surface border-border'
                  }`}
                >
                  <View className="flex-1">
                    <Text className="text-base font-medium text-foreground">
                      {member.member_name}
                    </Text>
                    {member.role && (
                      <Text className="text-xs text-muted mt-0.5">
                        {member.role}
                      </Text>
                    )}
                  </View>
                  <View className={`px-3 py-1 rounded-full ${
                    member.destination === 'new' ? 'bg-green-500' : 'bg-muted'
                  }`}>
                    <Text className="text-xs text-white font-medium">
                      {member.destination === 'new' ? 'Nova' : 'Atual'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={loading}
              className={`py-4 rounded-xl ${loading ? 'bg-muted' : 'bg-primary'}`}
            >
              <Text className="text-white text-center font-semibold text-base">
                {loading ? 'Salvando...' : 'Criar Plano de Multiplicação'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
