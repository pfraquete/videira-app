import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const colors = useColors();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await signOut();
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Error logging out:', error);
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const getRoleLabel = () => {
    switch (user?.role) {
      case 'pastor': return 'Pastor';
      case 'discipulador': return 'Discipulador';
      case 'lider': return 'Líder de Célula';
      default: return 'Participante';
    }
  };

  const getRoleColor = () => {
    switch (user?.role) {
      case 'pastor': return colors.primary;
      case 'discipulador': return '#a855f7';
      case 'lider': return colors.success;
      default: return '#f97316';
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="px-6 pt-4 pb-6">
          <Text className="text-2xl font-bold text-foreground">Perfil</Text>
        </View>

        {/* Profile Card */}
        <View className="mx-6 mb-6 bg-surface rounded-2xl p-6 border border-border items-center">
          <View 
            className="w-24 h-24 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: getRoleColor() + '20' }}
          >
            <Text className="text-4xl font-bold" style={{ color: getRoleColor() }}>
              {user?.profile?.nome_completo?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text className="text-xl font-bold text-foreground text-center">
            {user?.profile?.nome_completo || 'Usuário'}
          </Text>
          <Text className="text-muted mt-1">{user?.email}</Text>
          <View 
            className="mt-3 px-4 py-1.5 rounded-full"
            style={{ backgroundColor: getRoleColor() + '20' }}
          >
            <Text style={{ color: getRoleColor() }} className="font-medium">
              {getRoleLabel()}
            </Text>
          </View>
        </View>

        {/* Info Section */}
        {user?.profile && (
          <View className="mx-6 mb-6">
            <Text className="text-lg font-bold text-foreground mb-4">Informações</Text>
            <View className="bg-surface rounded-2xl border border-border overflow-hidden">
              {user.profile.telefone && (
                <InfoRow
                  icon="phone.fill"
                  label="Telefone"
                  value={user.profile.telefone}
                  colors={colors}
                />
              )}
              {user.profile.endereco_cidade && (
                <InfoRow
                  icon="location.fill"
                  label="Cidade"
                  value={`${user.profile.endereco_cidade}${user.profile.endereco_estado ? `, ${user.profile.endereco_estado}` : ''}`}
                  colors={colors}
                  isLast={!user.profile.data_nascimento}
                />
              )}
              {user.profile.data_nascimento && (
                <InfoRow
                  icon="calendar"
                  label="Nascimento"
                  value={new Date(user.profile.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                  colors={colors}
                  isLast
                />
              )}
            </View>
          </View>
        )}

        {/* Settings Section */}
        <View className="mx-6 mb-6">
          <Text className="text-lg font-bold text-foreground mb-4">Configurações</Text>
          <View className="bg-surface rounded-2xl border border-border overflow-hidden">
            <TouchableOpacity
              className="flex-row items-center p-4 border-b border-border"
              activeOpacity={0.7}
              onPress={() => router.push('/profile/edit' as any)}
            >
              <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center">
                <IconSymbol name="pencil" size={20} color={colors.primary} />
              </View>
              <Text className="flex-1 ml-3 text-foreground font-medium">Editar Perfil</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.muted} />
            </TouchableOpacity>
            
            <TouchableOpacity
              className="flex-row items-center p-4 border-b border-border"
              activeOpacity={0.7}
              onPress={() => router.push('/settings/notifications')}
            >
              <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center">
                <IconSymbol name="bell.fill" size={20} color={colors.primary} />
              </View>
              <Text className="flex-1 ml-3 text-foreground font-medium">Notificações</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center p-4 border-b border-border"
              activeOpacity={0.7}
              onPress={() => router.push('/settings/reminders' as any)}
            >
              <View className="w-10 h-10 rounded-full bg-orange-500/20 items-center justify-center">
                <IconSymbol name="clock.fill" size={20} color="#F97316" />
              </View>
              <Text className="flex-1 ml-3 text-foreground font-medium">Lembretes</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center p-4 border-b border-border"
              activeOpacity={0.7}
              onPress={() => router.push('/settings/appearance' as any)}
            >
              <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center">
                <IconSymbol name="moon.fill" size={20} color={colors.primary} />
              </View>
              <Text className="flex-1 ml-3 text-foreground font-medium">Aparência</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center p-4 border-b border-border"
              activeOpacity={0.7}
              onPress={() => router.push('/goals' as any)}
            >
              <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center">
                <IconSymbol name="chart.bar.fill" size={20} color={colors.primary} />
              </View>
              <Text className="flex-1 ml-3 text-foreground font-medium">Metas</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center p-4 border-b border-border"
              activeOpacity={0.7}
              onPress={() => router.push('/reports' as any)}
            >
              <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center">
                <IconSymbol name="doc.fill" size={20} color={colors.primary} />
              </View>
              <Text className="flex-1 ml-3 text-foreground font-medium">Relatórios</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center p-4 border-b border-border"
              onPress={() => router.push('/share/cell' as any)}
              activeOpacity={0.7}
            >
              <View className="w-10 h-10 rounded-full bg-[#25D366]/20 items-center justify-center">
                <IconSymbol name="qrcode" size={20} color="#25D366" />
              </View>
              <Text className="flex-1 ml-3 text-foreground font-medium">Convidar para Célula</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center p-4 border-b border-border"
              onPress={() => router.push('/chat' as any)}
              activeOpacity={0.7}
            >
              <View className="w-10 h-10 rounded-full bg-blue-500/20 items-center justify-center">
                <IconSymbol name="message.fill" size={20} color="#3B82F6" />
              </View>
              <Text className="flex-1 ml-3 text-foreground font-medium">Mensagens</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center p-4 border-b border-border"
              onPress={() => router.push('/prayers' as any)}
              activeOpacity={0.7}
            >
              <View className="w-10 h-10 rounded-full bg-pink-500/20 items-center justify-center">
                <IconSymbol name="heart.fill" size={20} color="#EC4899" />
              </View>
              <Text className="flex-1 ml-3 text-foreground font-medium">Pedidos de Oração</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center p-4 border-b border-border"
              onPress={() => router.push('/calendar' as any)}
              activeOpacity={0.7}
            >
              <View className="w-10 h-10 rounded-full bg-orange-500/20 items-center justify-center">
                <IconSymbol name="calendar" size={20} color="#F97316" />
              </View>
              <Text className="flex-1 ml-3 text-foreground font-medium">Calendário</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center p-4 border-b border-border"
              onPress={() => router.push('/gallery' as any)}
              activeOpacity={0.7}
            >
              <View className="w-10 h-10 rounded-full bg-indigo-500/20 items-center justify-center">
                <Text className="text-lg">📷</Text>
              </View>
              <Text className="flex-1 ml-3 text-foreground font-medium">Galeria de Fotos</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center p-4"
              onPress={() => router.push('/engagement' as any)}
              activeOpacity={0.7}
            >
              <View className="w-10 h-10 rounded-full bg-yellow-500/20 items-center justify-center">
                <Text className="text-lg">🏆</Text>
              </View>
              <Text className="flex-1 ml-3 text-foreground font-medium">Engajamento</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center p-4"
              onPress={() => router.push('/connections' as any)}
              activeOpacity={0.7}
            >
              <View className="w-10 h-10 rounded-full bg-cyan-500/20 items-center justify-center">
                <Text className="text-lg">🤝</Text>
              </View>
              <Text className="flex-1 ml-3 text-foreground font-medium">Conexões</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center p-4"
              onPress={() => router.push('/multiplication' as any)}
              activeOpacity={0.7}
            >
              <View className="w-10 h-10 rounded-full bg-purple-500/20 items-center justify-center">
                <Text className="text-lg">🌱</Text>
              </View>
              <Text className="flex-1 ml-3 text-foreground font-medium">Multiplicação</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center p-4"
              activeOpacity={0.7}
            >
              <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center">
                <IconSymbol name="info.circle.fill" size={20} color={colors.primary} />
              </View>
              <Text className="flex-1 ml-3 text-foreground font-medium">Sobre o App</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <View className="mx-6 mb-6">
          <TouchableOpacity
            className="bg-error/10 rounded-xl py-4 items-center flex-row justify-center"
            onPress={handleLogout}
            disabled={loggingOut}
            activeOpacity={0.8}
          >
            {loggingOut ? (
              <ActivityIndicator color={colors.error} />
            ) : (
              <>
                <IconSymbol name="arrow.left" size={20} color={colors.error} />
                <Text className="text-error font-bold ml-2">Sair da Conta</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Version */}
        <View className="items-center pb-6">
          <Text className="text-muted text-sm">Videira App v1.2.0</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function InfoRow({ 
  icon, 
  label, 
  value, 
  colors, 
  isLast = false 
}: { 
  icon: any; 
  label: string; 
  value: string; 
  colors: any;
  isLast?: boolean;
}) {
  return (
    <View className={`flex-row items-center p-4 ${!isLast ? 'border-b border-border' : ''}`}>
      <View className="w-10 h-10 rounded-full bg-muted/20 items-center justify-center">
        <IconSymbol name={icon} size={18} color={colors.muted} />
      </View>
      <View className="ml-3">
        <Text className="text-muted text-sm">{label}</Text>
        <Text className="text-foreground font-medium">{value}</Text>
      </View>
    </View>
  );
}
