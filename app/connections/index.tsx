import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { ConnectionService, Connection, ConnectionStats } from '@/lib/connection-service';

export default function ConnectionsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [stats, setStats] = useState<ConnectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed'>('all');

  const userId = (user as any)?.id;

  const loadData = useCallback(async () => {
    if (!userId) return;
    
    try {
      const [connectionsData, statsData] = await Promise.all([
        ConnectionService.getConnections(userId),
        ConnectionService.getStats(userId),
      ]);
      setConnections(connectionsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading connections:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredConnections = connections.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      discipleship: '📖',
      mentoring: '🎯',
      counseling: '💬',
      visit: '🏠',
      follow_up: '📞',
    };
    return icons[type] || '📋';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#3B82F6';
      case 'completed': return '#22C55E';
      case 'cancelled': return '#EF4444';
      default: return colors.muted;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Agendado';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short',
      year: 'numeric'
    });
  };

  const renderConnection = ({ item }: { item: Connection }) => (
    <TouchableOpacity
      onPress={() => router.push(`/connections/${item.id}` as any)}
      className="mx-4 mb-3 p-4 bg-surface rounded-2xl border border-border"
    >
      <View className="flex-row items-start">
        <Text className="text-2xl mr-3">{getTypeIcon(item.type)}</Text>
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground">
            {item.member_name}
          </Text>
          <Text className="text-sm text-muted mt-0.5">
            {ConnectionService.getTypeLabel(item.type)}
          </Text>
          <View className="flex-row items-center mt-2">
            <Text className="text-xs text-muted">
              {formatDate(item.date)}
              {item.time && ` às ${item.time}`}
            </Text>
            <View 
              className="ml-2 px-2 py-0.5 rounded-full"
              style={{ backgroundColor: getStatusColor(item.status) + '20' }}
            >
              <Text style={{ color: getStatusColor(item.status), fontSize: 10, fontWeight: '600' }}>
                {getStatusLabel(item.status)}
              </Text>
            </View>
          </View>
        </View>
        <IconSymbol name="chevron.right" size={20} color={colors.muted} />
      </View>
      
      {item.notes && (
        <Text className="text-sm text-muted mt-2 ml-10" numberOfLines={2}>
          {item.notes}
        </Text>
      )}

      {item.topics.length > 0 && (
        <View className="flex-row flex-wrap mt-2 ml-10 gap-1">
          {item.topics.slice(0, 3).map((topic, index) => (
            <View key={index} className="px-2 py-0.5 bg-primary/10 rounded-full">
              <Text className="text-xs text-primary">{topic}</Text>
            </View>
          ))}
          {item.topics.length > 3 && (
            <View className="px-2 py-0.5 bg-background rounded-full">
              <Text className="text-xs text-muted">+{item.topics.length - 3}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="p-2 -ml-2"
        >
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-foreground">
          Conexões
        </Text>
        <TouchableOpacity 
          onPress={() => router.push('/connections/create' as any)}
          className="p-2 -mr-2"
        >
          <IconSymbol name="plus" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {stats && (
        <View className="flex-row px-4 py-4 gap-3">
          <View className="flex-1 bg-surface p-3 rounded-xl border border-border">
            <Text className="text-2xl font-bold text-primary">{stats.this_month}</Text>
            <Text className="text-xs text-muted">Este mês</Text>
          </View>
          <View className="flex-1 bg-surface p-3 rounded-xl border border-border">
            <Text className="text-2xl font-bold text-foreground">{stats.total_connections}</Text>
            <Text className="text-xs text-muted">Total</Text>
          </View>
          <View className="flex-1 bg-surface p-3 rounded-xl border border-border">
            <Text className="text-2xl font-bold text-green-500">{stats.members_connected}</Text>
            <Text className="text-xs text-muted">Membros</Text>
          </View>
        </View>
      )}

      {/* Filters */}
      <View className="flex-row px-4 pb-3 gap-2">
        {(['all', 'scheduled', 'completed'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            className={`px-4 py-2 rounded-full ${filter === f ? 'bg-primary' : 'bg-surface border border-border'}`}
          >
            <Text className={`text-sm font-medium ${filter === f ? 'text-white' : 'text-foreground'}`}>
              {f === 'all' ? 'Todos' : f === 'scheduled' ? 'Agendados' : 'Concluídos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted">Carregando conexões...</Text>
        </View>
      ) : filteredConnections.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-4">🤝</Text>
          <Text className="text-lg font-semibold text-foreground text-center">
            Nenhuma conexão encontrada
          </Text>
          <Text className="text-sm text-muted text-center mt-2">
            Registre encontros de discipulado e acompanhamento com os membros da célula.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/connections/create' as any)}
            className="mt-4 px-6 py-3 bg-primary rounded-full"
          >
            <Text className="text-white font-semibold">Nova Conexão</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredConnections}
          renderItem={renderConnection}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 8 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </ScreenContainer>
  );
}
