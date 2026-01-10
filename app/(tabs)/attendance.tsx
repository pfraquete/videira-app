import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Switch,
} from "react-native";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/lib/auth-context";
import { DataService } from "@/lib/data-service";
import { useColors } from "@/hooks/use-colors";
import { Member, Attendance } from "@/lib/supabase";

interface MemberAttendance extends Member {
  present: boolean;
}

export default function AttendanceScreen() {
  const { user } = useAuth();
  const colors = useColors();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [members, setMembers] = useState<MemberAttendance[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      const [membersData, attendanceData] = await Promise.all([
        DataService.getMembers(user.id),
        DataService.getAttendanceByDate(user.id, selectedDate),
      ]);

      // Merge members with attendance
      const membersWithAttendance = membersData
        .filter(m => m.status === 'Ativo')
        .map(member => {
          const attendance = attendanceData.find(a => a.member_id === member.id);
          return {
            ...member,
            present: attendance?.present ?? false,
          };
        });

      setMembers(membersWithAttendance);
      setHasChanges(false);
    } catch (error) {
      console.error('Error loading attendance data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const toggleAttendance = (memberId: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setMembers(prev => prev.map(m => 
      m.id === memberId ? { ...m, present: !m.present } : m
    ));
    setHasChanges(true);
  };

  const saveAttendance = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const attendanceList = members.map(m => ({
        memberId: m.id,
        present: m.present,
      }));

      const success = await DataService.saveBulkAttendance(user.id, selectedDate, attendanceList);
      
      if (success) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setHasChanges(false);
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
    } finally {
      setSaving(false);
    }
  };

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) {
      return 'Hoje';
    }
    
    return date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
  };

  const presentCount = members.filter(m => m.present).length;
  const totalCount = members.length;

  const renderMember = ({ item }: { item: MemberAttendance }) => (
    <TouchableOpacity
      className={`flex-row items-center p-4 mb-2 rounded-xl border ${
        item.present 
          ? 'bg-success/10 border-success/30' 
          : 'bg-surface border-border'
      }`}
      onPress={() => toggleAttendance(item.id)}
      activeOpacity={0.7}
    >
      <View 
        className={`w-10 h-10 rounded-full items-center justify-center ${
          item.present ? 'bg-success/20' : 'bg-muted/20'
        }`}
      >
        <Text className={`text-lg font-bold ${item.present ? 'text-success' : 'text-muted'}`}>
          {item.nome.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-foreground font-medium">{item.nome}</Text>
        <Text className="text-muted text-sm">{item.funcao}</Text>
      </View>
      <Switch
        value={item.present}
        onValueChange={() => toggleAttendance(item.id)}
        trackColor={{ false: colors.border, true: colors.success + '80' }}
        thumbColor={item.present ? colors.success : colors.muted}
      />
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
        <Text className="text-2xl font-bold text-foreground mb-4">Presenças</Text>

        {/* Date Selector */}
        <View className="flex-row items-center justify-between bg-surface rounded-xl p-2 border border-border">
          <TouchableOpacity
            className="p-2"
            onPress={() => changeDate(-1)}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-foreground font-bold text-lg">
              {formatDate(selectedDate)}
            </Text>
            <Text className="text-muted text-sm">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}
            </Text>
          </View>
          <TouchableOpacity
            className="p-2"
            onPress={() => changeDate(1)}
          >
            <IconSymbol name="chevron.right" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View className="flex-row mt-4 gap-3">
          <View className="flex-1 bg-success/10 rounded-xl p-3 items-center">
            <Text className="text-success text-2xl font-bold">{presentCount}</Text>
            <Text className="text-success text-sm">Presentes</Text>
          </View>
          <View className="flex-1 bg-error/10 rounded-xl p-3 items-center">
            <Text className="text-error text-2xl font-bold">{totalCount - presentCount}</Text>
            <Text className="text-error text-sm">Ausentes</Text>
          </View>
          <View className="flex-1 bg-primary/10 rounded-xl p-3 items-center">
            <Text className="text-primary text-2xl font-bold">
              {totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0}%
            </Text>
            <Text className="text-primary text-sm">Taxa</Text>
          </View>
        </View>
      </View>

      {/* Members List */}
      <FlatList
        data={members}
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
              Nenhum membro ativo encontrado
            </Text>
          </View>
        }
      />

      {/* Save Button */}
      {hasChanges && (
        <View className="absolute bottom-24 left-6 right-6">
          <TouchableOpacity
            className="bg-primary rounded-xl py-4 items-center shadow-lg"
            onPress={saveAttendance}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-background font-bold text-lg">Salvar Presenças</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScreenContainer>
  );
}
