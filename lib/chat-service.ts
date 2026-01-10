import { supabase } from './supabase';

export interface ChatMessage {
  id: number;
  sender_id: string;
  receiver_id: string;
  cell_id?: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  participant_id: string;
  participant_name: string;
  participant_photo?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

export class ChatService {
  /**
   * Buscar todas as conversas do usuário
   */
  static async getConversations(userId: string): Promise<Conversation[]> {
    // Buscar mensagens enviadas e recebidas
    const { data: sentMessages, error: sentError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('sender_id', userId)
      .order('created_at', { ascending: false });

    const { data: receivedMessages, error: receivedError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('receiver_id', userId)
      .order('created_at', { ascending: false });

    if (sentError || receivedError) {
      console.error('Error fetching conversations:', sentError || receivedError);
      return [];
    }

    // Combinar e agrupar por participante
    const allMessages = [...(sentMessages || []), ...(receivedMessages || [])];
    const conversationMap = new Map<string, ChatMessage[]>();

    allMessages.forEach((msg) => {
      const participantId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      if (!conversationMap.has(participantId)) {
        conversationMap.set(participantId, []);
      }
      conversationMap.get(participantId)!.push(msg);
    });

    // Buscar informações dos participantes
    const conversations: Conversation[] = [];
    
    for (const [participantId, messages] of conversationMap) {
      // Ordenar mensagens por data
      messages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const lastMessage = messages[0];
      
      // Contar mensagens não lidas
      const unreadCount = messages.filter(m => m.receiver_id === userId && !m.read).length;

      // Buscar nome do participante
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('nome_completo, foto_url')
        .eq('user_id', participantId)
        .single();

      // Se não encontrar no user_profiles, buscar em members
      let participantName = profile?.nome_completo || 'Usuário';
      let participantPhoto = profile?.foto_url;

      if (!profile) {
        const { data: member } = await supabase
          .from('members')
          .select('nome, foto_url')
          .eq('user_profile_id', participantId)
          .single();
        
        if (member) {
          participantName = member.nome;
          participantPhoto = member.foto_url;
        }
      }

      conversations.push({
        id: participantId,
        participant_id: participantId,
        participant_name: participantName,
        participant_photo: participantPhoto,
        last_message: lastMessage.message,
        last_message_time: lastMessage.created_at,
        unread_count: unreadCount,
      });
    }

    // Ordenar por última mensagem
    conversations.sort((a, b) => 
      new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
    );

    return conversations;
  }

  /**
   * Buscar mensagens de uma conversa
   */
  static async getMessages(userId: string, participantId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${participantId}),and(sender_id.eq.${participantId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return data as ChatMessage[];
  }

  /**
   * Enviar mensagem
   */
  static async sendMessage(
    senderId: string,
    receiverId: string,
    message: string
  ): Promise<ChatMessage | null> {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        message,
        read: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return null;
    }

    return data as ChatMessage;
  }

  /**
   * Marcar mensagens como lidas
   */
  static async markAsRead(userId: string, senderId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_messages')
      .update({ read: true })
      .eq('receiver_id', userId)
      .eq('sender_id', senderId)
      .eq('read', false);

    if (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  /**
   * Contar mensagens não lidas
   */
  static async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error counting unread messages:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Buscar membros da célula para iniciar conversa
   */
  static async getCellMembers(userId: string): Promise<Array<{
    id: string;
    name: string;
    photo?: string;
  }>> {
    const { data: members, error } = await supabase
      .from('members')
      .select('id, nome, foto_url, user_profile_id')
      .eq('user_id', userId)
      .eq('status', 'Ativo');

    if (error) {
      console.error('Error fetching cell members:', error);
      return [];
    }

    return (members || []).map(m => ({
      id: m.user_profile_id || m.id.toString(),
      name: m.nome,
      photo: m.foto_url,
    }));
  }
}
