import { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/lib/auth-context';
import { GalleryService } from '@/lib/gallery-service';

export default function CreateAlbumScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const cellId = (user as any)?.profile?.cell_id || 'default';

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Digite um nome para o álbum.');
      return;
    }

    setSaving(true);
    try {
      const album = await GalleryService.createAlbum(
        cellId,
        name.trim(),
        description.trim() || undefined
      );

      if (album) {
        Alert.alert('Sucesso', 'Álbum criado com sucesso!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Erro', 'Não foi possível criar o álbum.');
      }
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao criar o álbum.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4">
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-foreground">Novo Álbum</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text className="text-primary font-bold">Salvar</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-6">
          {/* Icon */}
          <View className="items-center py-8">
            <View className="w-24 h-24 rounded-2xl bg-primary/20 items-center justify-center">
              <Text className="text-5xl">📁</Text>
            </View>
          </View>

          {/* Form */}
          <View className="mb-6">
            <Text className="text-foreground font-medium mb-2">Nome do Álbum *</Text>
            <TextInput
              className="bg-surface rounded-xl px-4 py-4 text-foreground"
              placeholder="Ex: Confraternização de Natal"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </View>

          <View className="mb-6">
            <Text className="text-foreground font-medium mb-2">Descrição</Text>
            <TextInput
              className="bg-surface rounded-xl px-4 py-4 text-foreground"
              placeholder="Descreva o álbum (opcional)"
              placeholderTextColor={colors.muted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{ minHeight: 100 }}
            />
          </View>

          {/* Tips */}
          <View className="bg-primary/10 rounded-xl p-4 mb-6">
            <Text className="text-primary font-bold mb-2">💡 Dica</Text>
            <Text className="text-foreground text-sm">
              Crie álbuns para organizar as fotos por eventos, datas especiais ou temas. 
              Assim fica mais fácil encontrar as memórias depois!
            </Text>
          </View>

          {/* Suggestions */}
          <View className="mb-6">
            <Text className="text-muted font-medium mb-3">Sugestões de nomes:</Text>
            <View className="flex-row flex-wrap">
              {[
                'Reunião de Célula',
                'Confraternização',
                'Culto Especial',
                'Evangelismo',
                'Aniversários',
                'Batismo',
              ].map((suggestion) => (
                <TouchableOpacity
                  key={suggestion}
                  className="bg-surface rounded-full px-4 py-2 mr-2 mb-2"
                  onPress={() => setName(suggestion)}
                >
                  <Text className="text-foreground text-sm">{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
