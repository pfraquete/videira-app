import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useThemeContext, ThemePreference } from "@/lib/theme-provider";

type ThemeOption = {
  id: ThemePreference;
  label: string;
  description: string;
  icon: any;
};

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "system",
    label: "Automático",
    description: "Segue as configurações do sistema",
    icon: "gear",
  },
  {
    id: "light",
    label: "Claro",
    description: "Tema claro sempre ativo",
    icon: "sun.max.fill",
  },
  {
    id: "dark",
    label: "Escuro",
    description: "Tema escuro sempre ativo",
    icon: "moon.fill",
  },
];

export default function AppearanceScreen() {
  const router = useRouter();
  const colors = useColors();
  const { themePreference, setThemePreference, isDarkMode } = useThemeContext();

  const handleSelectTheme = (preference: ThemePreference) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setThemePreference(preference);
  };

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
          <Text className="text-primary ml-1">Voltar</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-foreground">Aparência</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Current Theme Preview */}
        <View className="mx-6 mt-6 mb-4">
          <View 
            className="rounded-2xl p-6 border border-border"
            style={{ backgroundColor: isDarkMode ? '#1e2022' : '#f5f5f5' }}
          >
            <View className="flex-row items-center justify-center mb-4">
              <View 
                className="w-16 h-16 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.primary + '20' }}
              >
                <IconSymbol 
                  name={isDarkMode ? "moon.fill" : "sun.max.fill"} 
                  size={32} 
                  color={colors.primary} 
                />
              </View>
            </View>
            <Text 
              className="text-center text-lg font-bold"
              style={{ color: isDarkMode ? '#ECEDEE' : '#11181C' }}
            >
              Tema {isDarkMode ? 'Escuro' : 'Claro'}
            </Text>
            <Text 
              className="text-center text-sm mt-1"
              style={{ color: isDarkMode ? '#9BA1A6' : '#687076' }}
            >
              Visualização atual do tema
            </Text>
          </View>
        </View>

        {/* Theme Options */}
        <View className="px-6">
          <Text className="text-sm font-medium text-muted mb-3">SELECIONE O TEMA</Text>
          <View className="bg-surface rounded-xl border border-border overflow-hidden">
            {THEME_OPTIONS.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                className={`flex-row items-center p-4 ${
                  index < THEME_OPTIONS.length - 1 ? 'border-b border-border' : ''
                }`}
                activeOpacity={0.7}
                onPress={() => handleSelectTheme(option.id)}
              >
                <View 
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ 
                    backgroundColor: themePreference === option.id 
                      ? colors.primary + '20' 
                      : colors.muted + '20' 
                  }}
                >
                  <IconSymbol 
                    name={option.icon} 
                    size={20} 
                    color={themePreference === option.id ? colors.primary : colors.muted} 
                  />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-foreground font-medium">{option.label}</Text>
                  <Text className="text-muted text-sm">{option.description}</Text>
                </View>
                {themePreference === option.id && (
                  <IconSymbol name="checkmark.circle.fill" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Info */}
        <View className="mx-6 mt-6 bg-primary/10 rounded-xl p-4">
          <View className="flex-row items-start">
            <IconSymbol name="info.circle.fill" size={20} color={colors.primary} />
            <View className="flex-1 ml-3">
              <Text className="text-foreground font-medium">Sobre o tema automático</Text>
              <Text className="text-muted text-sm mt-1 leading-5">
                Quando selecionado, o app seguirá automaticamente as configurações de aparência do seu dispositivo. 
                Se o modo escuro estiver ativado no sistema, o app também usará o tema escuro.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
