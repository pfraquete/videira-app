import { Linking, Platform } from 'react-native';

export class WhatsAppService {
  /**
   * Formatar número de telefone para o formato WhatsApp (apenas números com código do país)
   */
  static formatPhoneForWhatsApp(phone: string | null | undefined): string | null {
    if (!phone) return null;
    
    // Remove todos os caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Se já tem código do país (55 para Brasil), retorna
    if (cleanPhone.startsWith('55') && cleanPhone.length >= 12) {
      return cleanPhone;
    }
    
    // Se tem 10 ou 11 dígitos (DDD + número), adiciona código do Brasil
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
      return `55${cleanPhone}`;
    }
    
    return null;
  }

  /**
   * Abrir chat do WhatsApp com um número
   */
  static async openChat(phone: string | null | undefined, message?: string): Promise<boolean> {
    const formattedPhone = this.formatPhoneForWhatsApp(phone);
    
    if (!formattedPhone) {
      return false;
    }

    try {
      const encodedMessage = message ? encodeURIComponent(message) : '';
      const url = `https://wa.me/${formattedPhone}${encodedMessage ? `?text=${encodedMessage}` : ''}`;
      
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      return false;
    }
  }

  /**
   * Enviar mensagem de boas-vindas para novo membro
   */
  static async sendWelcomeMessage(phone: string | null | undefined, memberName: string, cellName: string): Promise<boolean> {
    const message = `Olá ${memberName}! 👋\n\nSeja bem-vindo(a) à célula ${cellName}! Estamos muito felizes em ter você conosco.\n\nQualquer dúvida, estamos à disposição!`;
    return this.openChat(phone, message);
  }

  /**
   * Enviar lembrete de reunião
   */
  static async sendMeetingReminder(phone: string | null | undefined, memberName: string, eventTitle: string, eventDate: string, eventTime?: string): Promise<boolean> {
    const timeText = eventTime ? ` às ${eventTime}` : '';
    const message = `Olá ${memberName}! 📅\n\nLembrete: ${eventTitle} será no dia ${eventDate}${timeText}.\n\nContamos com sua presença!`;
    return this.openChat(phone, message);
  }

  /**
   * Enviar mensagem de aniversário
   */
  static async sendBirthdayMessage(phone: string | null | undefined, memberName: string): Promise<boolean> {
    const message = `Feliz aniversário, ${memberName}! 🎂🎉\n\nQue Deus abençoe grandemente sua vida neste novo ano!\n\nUm grande abraço de toda a célula!`;
    return this.openChat(phone, message);
  }

  /**
   * Enviar mensagem personalizada
   */
  static async sendCustomMessage(phone: string | null | undefined, message: string): Promise<boolean> {
    return this.openChat(phone, message);
  }

  /**
   * Verificar se WhatsApp está disponível no dispositivo
   */
  static async isWhatsAppAvailable(): Promise<boolean> {
    try {
      return await Linking.canOpenURL('https://wa.me/5500000000000');
    } catch {
      return false;
    }
  }

  /**
   * Gerar link de grupo do WhatsApp (para compartilhar)
   */
  static generateGroupInviteMessage(groupName: string, inviteLink: string): string {
    return `Participe do grupo "${groupName}" no WhatsApp:\n${inviteLink}`;
  }
}
