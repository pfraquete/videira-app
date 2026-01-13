import { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import Svg, { Path, Circle, Line, Text as SvgText, Rect } from "react-native-svg";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/lib/auth-context";
import { DataService } from "@/lib/data-service";
import { useColors } from "@/hooks/use-colors";

interface AttendanceRecord {
  date: string;
  total: number;
  present: number;
  percentage: number;
}

type PeriodFilter = '4weeks' | '8weeks' | '12weeks' | '6months';

const PERIOD_OPTIONS: { label: string; value: PeriodFilter; weeks: number }[] = [
  { label: '4 semanas', value: '4weeks', weeks: 4 },
  { label: '8 semanas', value: '8weeks', weeks: 8 },
  { label: '12 semanas', value: '12weeks', weeks: 12 },
  { label: '6 meses', value: '6months', weeks: 26 },
];

export default function AttendanceHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();
  const screenWidth = Dimensions.get('window').width;

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>('8weeks');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const selectedPeriod = PERIOD_OPTIONS.find(p => p.value === period);
      const weeks = selectedPeriod?.weeks || 8;
      
      // Buscar dados de presença por semana
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (weeks * 7));

      // Buscar todos os membros
      const members = await DataService.getMembers(user.id);
      const totalMembers = members.filter(m => m.status === 'Ativo').length;

      // Gerar registros por semana
      const weeklyRecords: AttendanceRecord[] = [];
      
      for (let i = 0; i < weeks; i++) {
        const weekEnd = new Date(endDate);
        weekEnd.setDate(weekEnd.getDate() - (i * 7));
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);

        // Buscar presenças da semana (simplificado - usando a data do domingo)
        const sundayDate = new Date(weekEnd);
        sundayDate.setDate(sundayDate.getDate() - sundayDate.getDay());
        const dateStr = sundayDate.toISOString().split('T')[0];

        const attendance = await DataService.getAttendanceByDate(user.id, dateStr);
        const presentCount = attendance.filter(a => a.present).length;
        const percentage = totalMembers > 0 
          ? Math.round((presentCount / totalMembers) * 100) 
          : 0;

        weeklyRecords.unshift({
          date: dateStr,
          total: totalMembers,
          present: presentCount,
          percentage,
        });
      }

      setRecords(weeklyRecords);
    } catch (error) {
      console.error('Error loading attendance history:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calcular estatísticas
  const stats = useMemo(() => {
    if (records.length === 0) return { average: 0, best: 0, worst: 0, trend: 0 };

    const percentages = records.map(r => r.percentage);
    const average = Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length);
    const best = Math.max(...percentages);
    const worst = Math.min(...percentages);
    
    // Tendência: comparar média das últimas 4 semanas com as 4 anteriores
    const recentAvg = percentages.slice(-4).reduce((a, b) => a + b, 0) / Math.min(4, percentages.slice(-4).length);
    const previousAvg = percentages.slice(-8, -4).reduce((a, b) => a + b, 0) / Math.min(4, percentages.slice(-8, -4).length) || recentAvg;
    const trend = Math.round(recentAvg - previousAvg);

    return { average, best, worst, trend };
  }, [records]);

  // Renderizar gráfico de linha
  const renderLineChart = () => {
    if (records.length < 2) return null;

    const chartWidth = screenWidth - 64;
    const chartHeight = 200;
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    const maxValue = 100;
    const minValue = 0;

    const points = records.map((record, index) => ({
      x: padding.left + (index / (records.length - 1)) * innerWidth,
      y: padding.top + innerHeight - ((record.percentage - minValue) / (maxValue - minValue)) * innerHeight,
      value: record.percentage,
      date: record.date,
    }));

    // Criar path para a linha
    const linePath = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');

    // Criar path para a área preenchida
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${points[0].x} ${padding.top + innerHeight} Z`;

    // Linhas de grade horizontais
    const gridLines = [0, 25, 50, 75, 100].map(value => ({
      y: padding.top + innerHeight - ((value - minValue) / (maxValue - minValue)) * innerHeight,
      label: `${value}%`,
    }));

    return (
      <View className="bg-surface rounded-xl p-4 border border-border">
        <Text className="text-foreground font-bold text-lg mb-4">Evolução da Presença</Text>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Grid lines */}
          {gridLines.map((line, index) => (
            <React.Fragment key={index}>
              <Line
                x1={padding.left}
                y1={line.y}
                x2={chartWidth - padding.right}
                y2={line.y}
                stroke={colors.border}
                strokeWidth={1}
                strokeDasharray="4,4"
              />
              <SvgText
                x={padding.left - 8}
                y={line.y + 4}
                fontSize={10}
                fill={colors.muted}
                textAnchor="end"
              >
                {line.label}
              </SvgText>
            </React.Fragment>
          ))}

          {/* Area fill */}
          <Path
            d={areaPath}
            fill={colors.primary + '20'}
          />

          {/* Line */}
          <Path
            d={linePath}
            stroke={colors.primary}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {points.map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={4}
              fill={colors.primary}
              stroke="#ffffff"
              strokeWidth={2}
            />
          ))}

          {/* X-axis labels (show only some) */}
          {points.filter((_, i) => i % Math.ceil(points.length / 4) === 0 || i === points.length - 1).map((point, index) => (
            <SvgText
              key={index}
              x={point.x}
              y={chartHeight - 10}
              fontSize={10}
              fill={colors.muted}
              textAnchor="middle"
            >
              {new Date(point.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </SvgText>
          ))}
        </Svg>
      </View>
    );
  };

  // Renderizar gráfico de barras
  const renderBarChart = () => {
    if (records.length === 0) return null;

    const chartWidth = screenWidth - 64;
    const chartHeight = 180;
    const padding = { top: 20, right: 10, bottom: 40, left: 10 };
    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    const barWidth = Math.min(30, (innerWidth / records.length) - 4);
    const gap = (innerWidth - (barWidth * records.length)) / (records.length + 1);

    return (
      <View className="bg-surface rounded-xl p-4 border border-border mt-4">
        <Text className="text-foreground font-bold text-lg mb-4">Presença por Semana</Text>
        <Svg width={chartWidth} height={chartHeight}>
          {records.map((record, index) => {
            const barHeight = (record.percentage / 100) * innerHeight;
            const x = padding.left + gap + index * (barWidth + gap);
            const y = padding.top + innerHeight - barHeight;

            const barColor = record.percentage >= 70 
              ? colors.success 
              : record.percentage >= 50 
                ? '#f59e0b' 
                : colors.error;

            return (
              <React.Fragment key={index}>
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={barColor}
                  rx={4}
                />
                <SvgText
                  x={x + barWidth / 2}
                  y={y - 5}
                  fontSize={10}
                  fill={colors.foreground}
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {record.percentage}%
                </SvgText>
                {(index % Math.ceil(records.length / 6) === 0 || index === records.length - 1) && (
                  <SvgText
                    x={x + barWidth / 2}
                    y={chartHeight - 10}
                    fontSize={9}
                    fill={colors.muted}
                    textAnchor="middle"
                  >
                    {new Date(record.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </SvgText>
                )}
              </React.Fragment>
            );
          })}
        </Svg>
      </View>
    );
  };

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-muted mt-4">Carregando histórico...</Text>
      </ScreenContainer>
    );
  }

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
        <Text className="text-foreground font-bold text-lg ml-4">Histórico de Presenças</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Period Filter */}
        <View className="px-6 py-4">
          <Text className="text-muted text-sm font-medium mb-2">Período</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {PERIOD_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  className={`px-4 py-2 rounded-full border ${
                    period === option.value
                      ? 'bg-primary border-primary'
                      : 'bg-surface border-border'
                  }`}
                  onPress={() => setPeriod(option.value)}
                >
                  <Text
                    className={
                      period === option.value
                        ? 'text-background font-medium'
                        : 'text-foreground'
                    }
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Stats Cards */}
        <View className="px-6 py-2">
          <View className="flex-row gap-3">
            <View className="flex-1 bg-surface rounded-xl p-4 border border-border items-center">
              <Text className="text-muted text-sm">Média</Text>
              <Text className="text-2xl font-bold text-foreground">{stats.average}%</Text>
            </View>
            <View className="flex-1 bg-surface rounded-xl p-4 border border-border items-center">
              <Text className="text-muted text-sm">Melhor</Text>
              <Text className="text-2xl font-bold text-success">{stats.best}%</Text>
            </View>
            <View className="flex-1 bg-surface rounded-xl p-4 border border-border items-center">
              <Text className="text-muted text-sm">Pior</Text>
              <Text className="text-2xl font-bold text-error">{stats.worst}%</Text>
            </View>
          </View>

          {/* Trend */}
          <View className="mt-3 bg-surface rounded-xl p-4 border border-border flex-row items-center justify-between">
            <View className="flex-row items-center">
              <IconSymbol 
                name={stats.trend >= 0 ? "arrow.up.right" : "arrow.down.right"} 
                size={20} 
                color={stats.trend >= 0 ? colors.success : colors.error} 
              />
              <Text className="text-foreground font-medium ml-2">Tendência</Text>
            </View>
            <Text 
              className="font-bold"
              style={{ color: stats.trend >= 0 ? colors.success : colors.error }}
            >
              {stats.trend >= 0 ? '+' : ''}{stats.trend}%
            </Text>
          </View>
        </View>

        {/* Charts */}
        <View className="px-6 py-4">
          {records.length >= 2 ? (
            <>
              {renderLineChart()}
              {renderBarChart()}
            </>
          ) : (
            <View className="bg-surface rounded-xl p-8 border border-border items-center">
              <IconSymbol name="chart.bar.fill" size={48} color={colors.muted} />
              <Text className="text-foreground font-medium mt-4 text-center">
                Dados Insuficientes
              </Text>
              <Text className="text-muted text-sm text-center mt-2">
                Registre presenças em pelo menos 2 semanas para visualizar os gráficos.
              </Text>
            </View>
          )}
        </View>

        {/* Weekly Details */}
        {records.length > 0 && (
          <View className="px-6 py-4">
            <Text className="text-foreground font-bold text-lg mb-3">Detalhes por Semana</Text>
            <View className="bg-surface rounded-xl border border-border overflow-hidden">
              {records.slice().reverse().map((record, index) => (
                <View 
                  key={record.date}
                  className={`flex-row items-center justify-between p-4 ${
                    index < records.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <View>
                    <Text className="text-foreground font-medium">
                      {new Date(record.date + 'T00:00:00').toLocaleDateString('pt-BR', { 
                        day: '2-digit', 
                        month: 'long' 
                      })}
                    </Text>
                    <Text className="text-muted text-sm">
                      {record.present} de {record.total} membros
                    </Text>
                  </View>
                  <View 
                    className="px-3 py-1 rounded-full"
                    style={{ 
                      backgroundColor: record.percentage >= 70 
                        ? colors.success + '20' 
                        : record.percentage >= 50 
                          ? '#f59e0b20' 
                          : colors.error + '20' 
                    }}
                  >
                    <Text 
                      className="font-bold"
                      style={{ 
                        color: record.percentage >= 70 
                          ? colors.success 
                          : record.percentage >= 50 
                            ? '#f59e0b' 
                            : colors.error 
                      }}
                    >
                      {record.percentage}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

// Need to import React for JSX fragments in SVG
import React from "react";
