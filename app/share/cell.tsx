import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import QRCode from 'react-native-qrcode-svg';

import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/lib/auth-context';
import { DataService } from '@/lib/data-service';
import { InviteService, CellInvite } from '@/lib/invite-service';
import { useColors } from '@/hooks/use-colors';

export default function ShareCellScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();

  const [loading, setLoading] = useState(true);
  const [cell, setCell] = useState<any | null>(null);
  const [invite, setInvite] = useState<CellInvite | null>(null);
  const [copied, setCopied] = useState(false);

  const loadCell = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const cellData = await DataService.getCell(user.id);
      setCell(cellData);

      if (cellData) {
        // Use cell_name from the database schema
        const data = cellData as any;
        const cellId = data.id || Date.now();
        const cellName = data.cell_name || data.nome || 'Minha Célula';
        const inviteData: CellInvite = {
          cellId: cellId,
          cellName: cellName,
          leaderName: user?.profile?.nome_completo || 'Líder',
          inviteCode: InviteService.generateInviteCode(cellId),
        };
        setInvite(inviteData);
      }
    } catch (error) {
      console.error('Error loading cell:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCell();
  }, [loadCell]);

  const handleShareWhatsApp = async () => {
    if (!invite) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const success = await InviteService.shareViaWhatsApp(invite);
    if (!success) {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp');
    }
  };

  const handleCopyCode = async () => {
    if (!invite) return;

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const success = await InviteService.copyInviteCode(invite.inviteCode);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      // Fallback: show the code in an alert
      Alert.alert('Código de Convite', invite.inviteCode);
    }
  };

  const handleCopyMessage = async () => {
    if (!invite) return;

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const success = await InviteService.copyInviteMessage(invite);
    if (success) {
      Alert.alert('Sucesso', 'Mensagem copiada para a área de transferência');
    } else {
      // Fallback: show the message
      Alert.alert('Mensagem de Convite', InviteService.generateInviteMessage(invite));
    }
  };

  const handleRegenerateCode = () => {
    if (!cell) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const cellId = cell.id || Date.now();
    const cellName = cell.cell_name || cell.nome || 'Minha Célula';
    const newInvite: CellInvite = {
      cellId: cellId,
      cellName: cellName,
      leaderName: user?.profile?.nome_completo || 'Líder',
      inviteCode: InviteService.generateInviteCode(cellId),
    };
    setInvite(newInvite);
  };

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (!cell || !invite) {
    return (
      <ScreenContainer className="items-center justify-center p-6">
        <IconSymbol name="exclamationmark.triangle.fill" size={48} color={colors.muted} />
        <Text className="text-lg font-medium text-foreground mt-4 text-center">
          Você não está associado a nenhuma célula
        </Text>
        <TouchableOpacity
          className="mt-6 bg-primary px-6 py-3 rounded-xl"
          onPress={() => router.back()}
        >
          <Text className="text-white font-medium">Voltar</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  const qrValue = InviteService.generateInviteUrl(invite);

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center px-6 py-4 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-foreground flex-1">
          Convidar para Célula
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Cell Info */}
        <View className="items-center px-6 pt-6">
          <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4">
            <IconSymbol name="person.3.fill" size={32} color={colors.primary} />
          </View>
          <Text className="text-2xl font-bold text-foreground text-center">
            {cell.cell_name || cell.nome || 'Minha Célula'}
          </Text>
          <Text className="text-muted mt-1">
            Líder: {user?.profile?.nome_completo || 'Você'}
          </Text>
        </View>

        {/* QR Code */}
        <View className="items-center px-6 py-8">
          <View className="bg-white p-6 rounded-3xl shadow-lg">
            <QRCode
              value={qrValue}
              size={200}
              backgroundColor="white"
              color="#000000"
            />
          </View>
          <Text className="text-muted text-sm mt-4 text-center">
            Escaneie o QR code para entrar na célula
          </Text>
        </View>

        {/* Invite Code */}
        <View className="mx-6 mb-6">
          <Text className="text-sm font-medium text-muted mb-2 text-center">
            CÓDIGO DE CONVITE
          </Text>
          <TouchableOpacity
            className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-center"
            onPress={handleCopyCode}
            activeOpacity={0.7}
          >
            <Text className="text-xl font-mono font-bold text-foreground tracking-wider">
              {invite.inviteCode}
            </Text>
            <View className="ml-3">
              <IconSymbol
                name={copied ? 'checkmark' : 'doc.on.doc'}
                size={20}
                color={copied ? '#22c55e' : colors.muted}
              />
            </View>
          </TouchableOpacity>
          {copied && (
            <Text className="text-success text-sm text-center mt-2">
              Código copiado!
            </Text>
          )}
        </View>

        {/* Share Options */}
        <View className="px-6">
          <Text className="text-sm font-medium text-muted mb-3">
            COMPARTILHAR VIA
          </Text>

          {/* WhatsApp */}
          <TouchableOpacity
            className="flex-row items-center bg-[#25D366] rounded-xl p-4 mb-3"
            onPress={handleShareWhatsApp}
            activeOpacity={0.8}
          >
            <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
              <IconSymbol name="message.fill" size={20} color="white" />
            </View>
            <Text className="flex-1 text-white font-medium ml-3">
              Compartilhar no WhatsApp
            </Text>
            <IconSymbol name="chevron.right" size={20} color="white" />
          </TouchableOpacity>

          {/* Copy Message */}
          <TouchableOpacity
            className="flex-row items-center bg-surface border border-border rounded-xl p-4 mb-3"
            onPress={handleCopyMessage}
            activeOpacity={0.8}
          >
            <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
              <IconSymbol name="doc.on.doc" size={20} color={colors.primary} />
            </View>
            <Text className="flex-1 text-foreground font-medium ml-3">
              Copiar mensagem de convite
            </Text>
            <IconSymbol name="chevron.right" size={20} color={colors.muted} />
          </TouchableOpacity>

          {/* Regenerate Code */}
          <TouchableOpacity
            className="flex-row items-center bg-surface border border-border rounded-xl p-4"
            onPress={handleRegenerateCode}
            activeOpacity={0.8}
          >
            <View className="w-10 h-10 rounded-full bg-muted/10 items-center justify-center">
              <IconSymbol name="arrow.clockwise" size={20} color={colors.muted} />
            </View>
            <Text className="flex-1 text-foreground font-medium ml-3">
              Gerar novo código
            </Text>
            <IconSymbol name="chevron.right" size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View className="mx-6 mt-8 p-4 bg-primary/5 rounded-xl">
          <Text className="text-sm font-medium text-foreground mb-2">
            Como funciona?
          </Text>
          <Text className="text-sm text-muted leading-5">
            1. Compartilhe o QR code ou código de convite{'\n'}
            2. A pessoa baixa o app Ekkle{'\n'}
            3. Ela usa o código para solicitar entrada na célula{'\n'}
            4. Você aprova a solicitação no app
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
