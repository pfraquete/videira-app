import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';

export interface MemberFilters {
  status: string[];
  role: string[];
  birthdayMonth: number | null;
  birthdayWeek: boolean;
  gender: string | null;
}

interface MemberFiltersModalProps {
  visible: boolean;
  onClose: () => void;
  filters: MemberFilters;
  onApply: (filters: MemberFilters) => void;
}

const STATUS_OPTIONS = [
  { value: 'Ativo', label: 'Ativo' },
  { value: 'Inativo', label: 'Inativo' },
  { value: 'Afastado', label: 'Afastado' },
];

const ROLE_OPTIONS = [
  { value: 'Líder', label: 'Líder' },
  { value: 'Líder em Treinamento', label: 'Líder em Treinamento' },
  { value: 'Anjo da Guarda', label: 'Anjo da Guarda' },
  { value: 'Membro', label: 'Membro' },
  { value: 'Frequentador Assíduo', label: 'Frequentador Assíduo' },
  { value: 'Visitante', label: 'Visitante' },
];

const MONTH_OPTIONS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

const GENDER_OPTIONS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Feminino' },
];

export const DEFAULT_FILTERS: MemberFilters = {
  status: [],
  role: [],
  birthdayMonth: null,
  birthdayWeek: false,
  gender: null,
};

export function MemberFiltersModal({
  visible,
  onClose,
  filters,
  onApply,
}: MemberFiltersModalProps) {
  const colors = useColors();
  const [localFilters, setLocalFilters] = useState<MemberFilters>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters, visible]);

  const handleToggleStatus = (status: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setLocalFilters((prev) => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status],
    }));
  };

  const handleToggleRole = (role: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setLocalFilters((prev) => ({
      ...prev,
      role: prev.role.includes(role)
        ? prev.role.filter((r) => r !== role)
        : [...prev.role, role],
    }));
  };

  const handleSetMonth = (month: number | null) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setLocalFilters((prev) => ({
      ...prev,
      birthdayMonth: prev.birthdayMonth === month ? null : month,
      birthdayWeek: false,
    }));
  };

  const handleToggleBirthdayWeek = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setLocalFilters((prev) => ({
      ...prev,
      birthdayWeek: !prev.birthdayWeek,
      birthdayMonth: null,
    }));
  };

  const handleSetGender = (gender: string | null) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setLocalFilters((prev) => ({
      ...prev,
      gender: prev.gender === gender ? null : gender,
    }));
  };

  const handleClearFilters = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setLocalFilters(DEFAULT_FILTERS);
  };

  const handleApply = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onApply(localFilters);
    onClose();
  };

  const hasActiveFilters =
    localFilters.status.length > 0 ||
    localFilters.role.length > 0 ||
    localFilters.birthdayMonth !== null ||
    localFilters.birthdayWeek ||
    localFilters.gender !== null;

  const activeFiltersCount =
    localFilters.status.length +
    localFilters.role.length +
    (localFilters.birthdayMonth !== null ? 1 : 0) +
    (localFilters.birthdayWeek ? 1 : 0) +
    (localFilters.gender !== null ? 1 : 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
          <TouchableOpacity onPress={onClose}>
            <Text className="text-primary">Cancelar</Text>
          </TouchableOpacity>
          <Text className="text-lg font-bold text-foreground">Filtros</Text>
          <TouchableOpacity onPress={handleClearFilters} disabled={!hasActiveFilters}>
            <Text
              className={hasActiveFilters ? 'text-primary' : 'text-muted'}
            >
              Limpar
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Status Filter */}
          <View className="px-6 py-4">
            <Text className="text-sm font-medium text-muted mb-3">STATUS</Text>
            <View className="flex-row flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  className={`px-4 py-2 rounded-full border ${
                    localFilters.status.includes(option.value)
                      ? 'bg-primary border-primary'
                      : 'border-border'
                  }`}
                  onPress={() => handleToggleStatus(option.value)}
                >
                  <Text
                    className={
                      localFilters.status.includes(option.value)
                        ? 'text-white font-medium'
                        : 'text-foreground'
                    }
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Role Filter */}
          <View className="px-6 py-4 border-t border-border">
            <Text className="text-sm font-medium text-muted mb-3">FUNÇÃO</Text>
            <View className="flex-row flex-wrap gap-2">
              {ROLE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  className={`px-4 py-2 rounded-full border ${
                    localFilters.role.includes(option.value)
                      ? 'bg-primary border-primary'
                      : 'border-border'
                  }`}
                  onPress={() => handleToggleRole(option.value)}
                >
                  <Text
                    className={
                      localFilters.role.includes(option.value)
                        ? 'text-white font-medium'
                        : 'text-foreground'
                    }
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Birthday Filter */}
          <View className="px-6 py-4 border-t border-border">
            <Text className="text-sm font-medium text-muted mb-3">ANIVERSÁRIO</Text>
            
            {/* Birthday this week */}
            <TouchableOpacity
              className={`flex-row items-center p-4 rounded-xl mb-3 border ${
                localFilters.birthdayWeek
                  ? 'bg-primary/10 border-primary'
                  : 'border-border'
              }`}
              onPress={handleToggleBirthdayWeek}
            >
              <IconSymbol
                name="gift.fill"
                size={20}
                color={localFilters.birthdayWeek ? colors.primary : colors.muted}
              />
              <Text
                className={`flex-1 ml-3 ${
                  localFilters.birthdayWeek ? 'text-primary font-medium' : 'text-foreground'
                }`}
              >
                Aniversariantes desta semana
              </Text>
              {localFilters.birthdayWeek && (
                <IconSymbol name="checkmark" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>

            {/* Birthday by month */}
            <Text className="text-sm text-muted mb-2">Por mês:</Text>
            <View className="flex-row flex-wrap gap-2">
              {MONTH_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  className={`px-3 py-1.5 rounded-full border ${
                    localFilters.birthdayMonth === option.value
                      ? 'bg-primary border-primary'
                      : 'border-border'
                  }`}
                  onPress={() => handleSetMonth(option.value)}
                >
                  <Text
                    className={`text-sm ${
                      localFilters.birthdayMonth === option.value
                        ? 'text-white font-medium'
                        : 'text-foreground'
                    }`}
                  >
                    {option.label.substring(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Gender Filter */}
          <View className="px-6 py-4 border-t border-border">
            <Text className="text-sm font-medium text-muted mb-3">GÊNERO</Text>
            <View className="flex-row gap-2">
              {GENDER_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  className={`flex-1 px-4 py-3 rounded-xl border items-center ${
                    localFilters.gender === option.value
                      ? 'bg-primary border-primary'
                      : 'border-border'
                  }`}
                  onPress={() => handleSetGender(option.value)}
                >
                  <Text
                    className={
                      localFilters.gender === option.value
                        ? 'text-white font-medium'
                        : 'text-foreground'
                    }
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Apply Button */}
        <View className="px-6 py-4 border-t border-border">
          <TouchableOpacity
            className="bg-primary py-4 rounded-xl items-center"
            onPress={handleApply}
          >
            <Text className="text-white font-bold text-lg">
              Aplicar{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Função para filtrar membros com base nos filtros aplicados
 */
export function filterMembers(members: any[], filters: MemberFilters): any[] {
  return members.filter((member) => {
    // Filter by status
    if (filters.status.length > 0 && !filters.status.includes(member.status)) {
      return false;
    }

    // Filter by role
    if (filters.role.length > 0 && !filters.role.includes(member.role)) {
      return false;
    }

    // Filter by gender
    if (filters.gender !== null && member.gender !== filters.gender) {
      return false;
    }

    // Filter by birthday week
    if (filters.birthdayWeek && member.birth_date) {
      const today = new Date();
      const birthDate = new Date(member.birth_date);
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      // Set birth date to current year for comparison
      const birthThisYear = new Date(
        today.getFullYear(),
        birthDate.getMonth(),
        birthDate.getDate()
      );

      if (birthThisYear < startOfWeek || birthThisYear > endOfWeek) {
        return false;
      }
    }

    // Filter by birthday month
    if (filters.birthdayMonth !== null && member.birth_date) {
      const birthDate = new Date(member.birth_date);
      if (birthDate.getMonth() + 1 !== filters.birthdayMonth) {
        return false;
      }
    } else if (filters.birthdayMonth !== null && !member.birth_date) {
      return false;
    }

    return true;
  });
}
