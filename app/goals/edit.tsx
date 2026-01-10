import { useState, useEffect } from "react";
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
import { useRouter, Stack } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import { GoalsService, CellGoal } from "@/lib/goals-service";

export default function EditGoalsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingGoal, setExistingGoal] = useState<CellGoal | null>(null);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Form state
  const [visitors, setVisitors] = useState('5');
  const [newMembers, setNewMembers] = useState('2');
  const [averageAttendance, setAverageAttendance] = useState('80');
  const [events, setEvents] = useState('4');

  useEffect(() => {
    const loadExistingGoal = async () => {
      if (!user?.id) return;

      try {
        const goal = await GoalsService.getCurrentMonthGoal(user.id);
        if (goal) {
          setExistingGoal(goal);
          setVisitors(goal.visitors.toString());
          setNewMembers(goal.newMembers.toString());
          setAverageAttendance(goal.averageAttendance.toString());
          setEvents(goal.events.toString());
        } else {
          // Use default values
          const defaults = GoalsService.getDefaultGoals();
          setVisitors(defaults.visitors.toString());
          setNewMembers(defaults.newMembers.toString());
          setAverageAttendance(defaults.averageAttendance.toString());
          setEvents(defaults.events.toString());
        }
      } catch (error) {
        console.error('Error loading goal:', error);
      } finally {
        setLoading(false);
      }
    };

    loadExistingGoal();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;

    const visitorsNum = parseInt(visitors) || 0;
    const newMembersNum = parseInt(newMembers) || 0;
    const attendanceNum = parseInt(averageAttendance) || 0;
    const eventsNum = parseInt(events) || 0;

    if (attendanceNum > 100) {
      Alert.alert('Erro', 'A meta de presença não pode ser maior que 100%');
      return;
    }

    setSaving(true);
    try {
      await GoalsService.saveGoal({
        userId: user.id,
        month: currentMonth,
        year: currentYear,
        visitors: visitorsNum,
        newMembers: newMembersNum,
        averageAttendance: attendanceNum,
        events: eventsNum,
      });

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert('Sucesso', 'Metas salvas com sucesso!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error saving goals:', error);
      Alert.alert('Erro', 'Não foi possível salvar as metas');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!existingGoal) return;

    Alert.alert(
      'Excluir Metas',
      'Tem certeza que deseja excluir as metas deste mês?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await GoalsService.deleteGoal(existingGoal.id);
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              router.back();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir as metas');
            }
          },
        },
      ]
    );
  };

  const InputField = ({
    label,
    value,
    onChangeText,
    icon,
    suffix,
    hint,
  }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    icon: any;
    suffix?: string;
    hint?: string;
  }) => (
    <View className="mb-4">
      <View className="flex-row items-center mb-2">
        <IconSymbol name={icon} size={18} color={colors.primary} />
        <Text className="text-sm font-medium text-foreground ml-2">{label}</Text>
      </View>
      <View className="flex-row items-center">
        <TextInput
          className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-foreground text-lg"
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          maxLength={3}
        />
        {suffix && (
          <Text className="text-muted text-lg ml-3">{suffix}</Text>
        )}
      </View>
      {hint && (
        <Text className="text-muted text-xs mt-1">{hint}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.primary} />
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
            <Text className="text-primary ml-1">Cancelar</Text>
          </TouchableOpacity>
          <Text className="text-lg font-bold text-foreground">
            {existingGoal ? 'Editar Metas' : 'Definir Metas'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text className="text-primary font-bold">Salvar</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Month Info */}
          <View className="px-6 py-4 bg-primary/10">
            <Text className="text-foreground font-bold text-lg">
              {GoalsService.getMonthName(currentMonth)} {currentYear}
            </Text>
            <Text className="text-muted text-sm mt-1">
              Defina as metas para este mês
            </Text>
          </View>

          {/* Form */}
          <View className="px-6 py-6">
            <InputField
              label="Meta de Visitantes"
              value={visitors}
              onChangeText={setVisitors}
              icon="person.fill"
              hint="Quantos visitantes você espera receber este mês"
            />

            <InputField
              label="Meta de Novos Membros"
              value={newMembers}
              onChangeText={setNewMembers}
              icon="person.2.fill"
              hint="Quantos visitantes devem se tornar membros"
            />

            <InputField
              label="Meta de Presença Média"
              value={averageAttendance}
              onChangeText={setAverageAttendance}
              icon="checkmark.circle.fill"
              suffix="%"
              hint="Porcentagem de presença esperada nas reuniões"
            />

            <InputField
              label="Meta de Eventos"
              value={events}
              onChangeText={setEvents}
              icon="calendar"
              hint="Quantos eventos/reuniões você planeja realizar"
            />
          </View>

          {/* Tips */}
          <View className="mx-6 bg-surface rounded-xl p-4 border border-border">
            <View className="flex-row items-center mb-2">
              <IconSymbol name="info.circle.fill" size={20} color={colors.primary} />
              <Text className="text-foreground font-medium ml-2">Dicas</Text>
            </View>
            <Text className="text-muted text-sm leading-5">
              • Defina metas realistas e alcançáveis{'\n'}
              • Considere o histórico dos últimos meses{'\n'}
              • Metas desafiadoras motivam, mas não exagere{'\n'}
              • Revise e ajuste as metas conforme necessário
            </Text>
          </View>

          {/* Delete Button */}
          {existingGoal && (
            <TouchableOpacity
              className="mx-6 mt-6 bg-error/10 rounded-xl p-4 flex-row items-center justify-center"
              onPress={handleDelete}
            >
              <IconSymbol name="trash.fill" size={20} color={colors.error} />
              <Text className="text-error font-medium ml-2">Excluir Metas</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
