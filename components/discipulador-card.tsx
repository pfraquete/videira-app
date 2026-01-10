import { View, Text, TouchableOpacity } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { DiscipuladorSummary } from "@/lib/hierarchy-service";

interface DiscipuladorCardProps {
  discipulador: DiscipuladorSummary;
  onPress?: () => void;
}

export function DiscipuladorCard({ discipulador, onPress }: DiscipuladorCardProps) {
  const colors = useColors();

  return (
    <TouchableOpacity
      className="bg-surface rounded-xl p-4 border border-border mb-3"
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <View className="flex-row items-center mb-3">
        <View 
          className="w-12 h-12 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: colors.primary + '20' }}
        >
          <Text className="text-xl font-bold" style={{ color: colors.primary }}>
            {discipulador.discipulador_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-foreground font-bold text-lg">
            {discipulador.discipulador_name}
          </Text>
          <Text className="text-muted text-sm">{discipulador.discipulador_email}</Text>
        </View>
      </View>

      <View className="flex-row gap-4 pt-3 border-t border-border">
        <View className="flex-1 items-center">
          <View className="flex-row items-center">
            <IconSymbol name="house.fill" size={16} color={colors.primary} />
            <Text className="text-foreground font-bold text-lg ml-1">
              {discipulador.total_cells}
            </Text>
          </View>
          <Text className="text-muted text-xs">Células</Text>
        </View>
        
        <View className="flex-1 items-center">
          <View className="flex-row items-center">
            <IconSymbol name="person.2.fill" size={16} color={colors.success} />
            <Text className="text-foreground font-bold text-lg ml-1">
              {discipulador.total_members}
            </Text>
          </View>
          <Text className="text-muted text-xs">Membros</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
