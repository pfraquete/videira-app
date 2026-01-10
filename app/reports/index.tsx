import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/lib/auth-context";
import { ReportService } from "@/lib/report-service";
import { useColors } from "@/hooks/use-colors";

type ReportType = 'members' | 'attendance';
type ExportAction = 'share' | 'download';

export default function ReportsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();

  const [generating, setGenerating] = useState<ReportType | null>(null);
  const [weeks, setWeeks] = useState(8);

  const generateMembersReport = async (action: ExportAction) => {
    if (!user?.id) return;

    setGenerating('members');
    try {
      const data = await ReportService.generateMembersReport(user.id);
      const content = ReportService.formatMembersReportAsText(data);
      
      if (action === 'share') {
        await ReportService.shareReport(content, 'Relatório de Membros');
      } else {
        const filename = `relatorio_membros_${new Date().toISOString().split('T')[0]}.txt`;
        const success = await ReportService.exportReport(content, filename);
        if (success && Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (error) {
      console.error('Error generating members report:', error);
      Alert.alert('Erro', 'Não foi possível gerar o relatório');
    } finally {
      setGenerating(null);
    }
  };

  const generateAttendanceReport = async (action: ExportAction) => {
    if (!user?.id) return;

    setGenerating('attendance');
    try {
      const data = await ReportService.generateAttendanceReport(user.id, weeks);
      const content = ReportService.formatAttendanceReportAsText(data);
      
      if (action === 'share') {
        await ReportService.shareReport(content, 'Relatório de Presenças');
      } else {
        const filename = `relatorio_presencas_${new Date().toISOString().split('T')[0]}.txt`;
        const success = await ReportService.exportReport(content, filename);
        if (success && Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (error) {
      console.error('Error generating attendance report:', error);
      Alert.alert('Erro', 'Não foi possível gerar o relatório');
    } finally {
      setGenerating(null);
    }
  };

  const showExportOptions = (type: ReportType) => {
    Alert.alert(
      'Exportar Relatório',
      'Como você deseja exportar o relatório?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Compartilhar',
          onPress: () => type === 'members' 
            ? generateMembersReport('share') 
            : generateAttendanceReport('share'),
        },
        {
          text: 'Salvar Arquivo',
          onPress: () => type === 'members' 
            ? generateMembersReport('download') 
            : generateAttendanceReport('download'),
        },
      ]
    );
  };

  const ReportCard = ({
    icon,
    title,
    description,
    type,
    children,
  }: {
    icon: string;
    title: string;
    description: string;
    type: ReportType;
    children?: React.ReactNode;
  }) => (
    <View className="bg-surface rounded-xl p-4 border border-border mb-4">
      <View className="flex-row items-start">
        <View 
          className="w-12 h-12 rounded-full items-center justify-center mr-4"
          style={{ backgroundColor: colors.primary + '20' }}
        >
          <IconSymbol name={icon as any} size={24} color={colors.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-foreground font-bold text-lg">{title}</Text>
          <Text className="text-muted text-sm mt-1">{description}</Text>
        </View>
      </View>
      
      {children}
      
      <TouchableOpacity
        className="bg-primary rounded-xl py-3 mt-4 items-center flex-row justify-center"
        onPress={() => showExportOptions(type)}
        disabled={generating !== null}
        activeOpacity={0.8}
      >
        {generating === type ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <>
            <IconSymbol name="arrow.down.doc.fill" size={20} color="#ffffff" />
            <Text className="text-background font-bold ml-2">Gerar Relatório</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View className="flex-row items-center px-6 py-4 border-b border-border">
        <TouchableOpacity
          className="flex-row items-center"
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          <Text className="text-primary ml-1">Voltar</Text>
        </TouchableOpacity>
        <Text className="text-foreground font-bold text-lg ml-4">Relatórios</Text>
      </View>

      <ScrollView className="flex-1 px-6 py-4" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Info Banner */}
        <View className="bg-primary/10 rounded-xl p-4 mb-6 flex-row items-center">
          <IconSymbol name="info.circle.fill" size={24} color={colors.primary} />
          <Text className="text-foreground flex-1 ml-3">
            Os relatórios são gerados em formato de texto e podem ser compartilhados ou salvos no seu dispositivo.
          </Text>
        </View>

        {/* Members Report */}
        <ReportCard
          icon="person.2.fill"
          title="Relatório de Membros"
          description="Lista completa de todos os membros da célula com informações de contato e status."
          type="members"
        />

        {/* Attendance Report */}
        <ReportCard
          icon="checkmark.circle.fill"
          title="Relatório de Presenças"
          description="Histórico de presenças com estatísticas e detalhes por semana."
          type="attendance"
        >
          <View className="mt-4">
            <Text className="text-muted text-sm mb-2">Período do relatório:</Text>
            <View className="flex-row flex-wrap gap-2">
              {[4, 8, 12, 26].map((w) => (
                <TouchableOpacity
                  key={w}
                  className={`px-4 py-2 rounded-full border ${
                    weeks === w
                      ? 'bg-primary border-primary'
                      : 'bg-background border-border'
                  }`}
                  onPress={() => setWeeks(w)}
                >
                  <Text
                    className={
                      weeks === w
                        ? 'text-background font-medium'
                        : 'text-foreground'
                    }
                  >
                    {w === 26 ? '6 meses' : `${w} semanas`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ReportCard>

        {/* Tips */}
        <View className="bg-surface rounded-xl p-4 border border-border">
          <Text className="text-foreground font-bold mb-3">Dicas</Text>
          <View className="flex-row items-start mb-2">
            <Text className="text-muted mr-2">•</Text>
            <Text className="text-muted flex-1">
              Use "Compartilhar" para enviar o relatório por WhatsApp, email ou outras apps.
            </Text>
          </View>
          <View className="flex-row items-start mb-2">
            <Text className="text-muted mr-2">•</Text>
            <Text className="text-muted flex-1">
              Use "Salvar Arquivo" para guardar uma cópia no seu dispositivo.
            </Text>
          </View>
          <View className="flex-row items-start">
            <Text className="text-muted mr-2">•</Text>
            <Text className="text-muted flex-1">
              Os relatórios incluem data e hora de geração para referência.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
