import { View, Text, TouchableOpacity } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { CellSummary } from "@/lib/hierarchy-service";

interface CellCardProps {
  cell: CellSummary;
  onPress?: () => void;
}

export function CellCard({ cell, onPress }: CellCardProps) {
  const colors = useColors();

  const getAttendanceColor = (attendance: number) => {
    if (attendance >= 80) return colors.success;
    if (attendance >= 60) return '#f59e0b';
    return colors.error;
  };

  return (
    <TouchableOpacity
      className="bg-surface rounded-xl p-4 border border-border mb-3"
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <Text className="text-foreground font-bold text-lg">{cell.cell_name}</Text>
          <Text className="text-muted text-sm">{cell.leader_name}</Text>
        </View>
        <View 
          className="px-3 py-1 rounded-full"
          style={{ backgroundColor: getAttendanceColor(cell.average_attendance) + '20' }}
        >
          <Text 
            className="text-sm font-medium"
            style={{ color: getAttendanceColor(cell.average_attendance) }}
          >
            {cell.average_attendance}%
          </Text>
        </View>
      </View>

      <View className="flex-row gap-4">
        <View className="flex-row items-center">
          <IconSymbol name="person.2.fill" size={16} color={colors.muted} />
          <Text className="text-muted text-sm ml-1">
            {cell.active_members}/{cell.total_members}
          </Text>
        </View>
        
        {cell.meeting_day && (
          <View className="flex-row items-center">
            <IconSymbol name="calendar" size={16} color={colors.muted} />
            <Text className="text-muted text-sm ml-1">
              {cell.meeting_day} {cell.meeting_time && `às ${cell.meeting_time}`}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
