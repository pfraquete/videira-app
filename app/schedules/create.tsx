import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useAuth } from '@/lib/auth-context';
import { DataService } from '@/lib/data-service';
import { 
  scheduleService, 
  SERVICE_ROLE_LABELS, 
  SERVICE_ROLE_ICONS,
  ServiceRole 
} from '@/lib/schedule-service';

export default function CreateScheduleScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedRole, setSelectedRole] = useState<ServiceRole>('louvor');
  const [selectedMember, setSelectedMember] = useState<{ id: string; name: string } | null>(null);
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<'role' | 'member' | 'date' | 'confirm'>('role');

  const cellId = (user?.profile as any)?.cell_id || '';

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    if (!cellId) return;
    try {
      const data = await DataService.getMembers(cellId);
      setMembers(data.map(m => ({ id: m.id, name: m.name })));
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
    }
  };

  const handleCreate = async () => {
    if (!selectedMember) {
      Alert.alert('Erro', 'Selecione um membro');
      return;
    }

    setLoading(true);
    try {
      const entry = await scheduleService.createScheduleEntry({
        cell_id: cellId,
        date: selectedDate,
        role: selectedRole,
        member_id: selectedMember.id,
        member_name: selectedMember.name,
        notes: notes || undefined,
      });

      if (entry) {
        Alert.alert('Sucesso', 'Escala criada com sucesso!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Erro', 'Não foi possível criar a escala');
      }
    } catch (error) {
      console.error('Erro ao criar escala:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao criar a escala');
    } finally {
      setLoading(false);
    }
  };

  const roles = Object.keys(SERVICE_ROLE_LABELS) as ServiceRole[];

  return (
    <ScreenContainer className="flex-1">
      {/* Header */}
      <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => {
            if (step === 'role') {
              router.back();
            } else if (step === 'member') {
              setStep('role');
            } else if (step === 'date') {
              setStep('member');
            } else {
              setStep('date');
            }
          }}
          className="w-10 h-10 rounded-full bg-surface items-center justify-center"
        >
          <Text className="text-lg">←</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-foreground">Nova Escala</Text>
        <View className="w-10" />
      </View>

      {/* Progress */}
      <View className="px-4 py-2">
        <View className="flex-row gap-2">
          {['role', 'member', 'date', 'confirm'].map((s, i) => (
            <View 
              key={s} 
              className={`flex-1 h-1 rounded-full ${
                ['role', 'member', 'date', 'confirm'].indexOf(step) >= i 
                  ? 'bg-primary' 
                  : 'bg-surface'
              }`} 
            />
          ))}
        </View>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Step 1: Select Role */}
        {step === 'role' && (
          <View className="py-4">
            <Text className="text-lg font-bold text-foreground mb-4">
              Qual função?
            </Text>
            <View className="gap-3">
              {roles.map((role) => (
                <TouchableOpacity
                  key={role}
                  onPress={() => {
                    setSelectedRole(role);
                    setStep('member');
                  }}
                  className={`flex-row items-center p-4 rounded-xl ${
                    selectedRole === role ? 'bg-primary' : 'bg-surface'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text className="text-3xl mr-4">{SERVICE_ROLE_ICONS[role]}</Text>
                  <Text className={`text-lg font-semibold ${
                    selectedRole === role ? 'text-white' : 'text-foreground'
                  }`}>
                    {SERVICE_ROLE_LABELS[role]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 2: Select Member */}
        {step === 'member' && (
          <View className="py-4">
            <Text className="text-lg font-bold text-foreground mb-2">
              Quem será responsável?
            </Text>
            <Text className="text-muted mb-4">
              {SERVICE_ROLE_ICONS[selectedRole]} {SERVICE_ROLE_LABELS[selectedRole]}
            </Text>
            <View className="gap-2">
              {members.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  onPress={() => {
                    setSelectedMember(member);
                    setStep('date');
                  }}
                  className={`p-4 rounded-xl ${
                    selectedMember?.id === member.id ? 'bg-primary' : 'bg-surface'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text className={`font-semibold ${
                    selectedMember?.id === member.id ? 'text-white' : 'text-foreground'
                  }`}>
                    {member.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 3: Select Date */}
        {step === 'date' && (
          <View className="py-4">
            <Text className="text-lg font-bold text-foreground mb-2">
              Qual data?
            </Text>
            <Text className="text-muted mb-4">
              {SERVICE_ROLE_ICONS[selectedRole]} {SERVICE_ROLE_LABELS[selectedRole]} - {selectedMember?.name}
            </Text>
            
            <View className="bg-surface rounded-xl p-4 mb-4">
              <Text className="text-muted text-sm mb-2">Data</Text>
              <TextInput
                value={selectedDate}
                onChangeText={setSelectedDate}
                placeholder="YYYY-MM-DD"
                className="text-foreground text-lg"
              />
            </View>

            <View className="bg-surface rounded-xl p-4 mb-4">
              <Text className="text-muted text-sm mb-2">Observações (opcional)</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Ex: Trazer violão"
                multiline
                numberOfLines={3}
                className="text-foreground"
              />
            </View>

            <TouchableOpacity
              onPress={() => setStep('confirm')}
              className="bg-primary py-4 rounded-xl items-center"
              activeOpacity={0.7}
            >
              <Text className="text-white font-bold text-lg">Continuar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 4: Confirm */}
        {step === 'confirm' && (
          <View className="py-4">
            <Text className="text-lg font-bold text-foreground mb-4">
              Confirmar escala
            </Text>
            
            <View className="bg-surface rounded-xl p-6 mb-6">
              <View className="items-center mb-4">
                <Text className="text-5xl mb-2">{SERVICE_ROLE_ICONS[selectedRole]}</Text>
                <Text className="text-xl font-bold text-foreground">
                  {SERVICE_ROLE_LABELS[selectedRole]}
                </Text>
              </View>

              <View className="border-t border-border pt-4 gap-3">
                <View className="flex-row justify-between">
                  <Text className="text-muted">Responsável</Text>
                  <Text className="text-foreground font-semibold">{selectedMember?.name}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-muted">Data</Text>
                  <Text className="text-foreground font-semibold">
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </Text>
                </View>
                {notes && (
                  <View className="flex-row justify-between">
                    <Text className="text-muted">Observações</Text>
                    <Text className="text-foreground">{notes}</Text>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity
              onPress={handleCreate}
              disabled={loading}
              className={`py-4 rounded-xl items-center ${loading ? 'bg-muted' : 'bg-primary'}`}
              activeOpacity={0.7}
            >
              <Text className="text-white font-bold text-lg">
                {loading ? 'Criando...' : 'Criar Escala'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
