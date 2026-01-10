import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Get the app scheme from config
const APP_SCHEME = Constants.expoConfig?.scheme || 'videira';

export interface CellInvite {
  cellId: number;
  cellName: string;
  leaderName: string;
  inviteCode: string;
}

export class InviteService {
  /**
   * Gerar código de convite único para a célula
   */
  static generateInviteCode(cellId: number): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${cellId.toString(36)}-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Decodificar código de convite para obter o cellId
   */
  static decodeInviteCode(code: string): number | null {
    try {
      const parts = code.split('-');
      if (parts.length < 1) return null;
      return parseInt(parts[0], 36);
    } catch {
      return null;
    }
  }

  /**
   * Gerar URL de convite para deep link
   */
  static generateInviteUrl(invite: CellInvite): string {
    // Use Expo Linking to create a proper deep link
    const baseUrl = Linking.createURL('invite', {
      queryParams: {
        code: invite.inviteCode,
        cell: invite.cellName,
        leader: invite.leaderName,
      },
    });
    return baseUrl;
  }

  /**
   * Gerar URL de convite para web (fallback)
   */
  static generateWebInviteUrl(invite: CellInvite): string {
    const params = new URLSearchParams({
      code: invite.inviteCode,
      cell: invite.cellName,
      leader: invite.leaderName,
    });
    // This would be your web app URL in production
    return `https://videira.app/invite?${params.toString()}`;
  }

  /**
   * Gerar mensagem de convite para compartilhamento
   */
  static generateInviteMessage(invite: CellInvite): string {
    return `🍇 Convite para a Célula "${invite.cellName}"

Olá! Você foi convidado(a) para participar da nossa célula.

👤 Líder: ${invite.leaderName}

Para participar, baixe o app Videira e use o código:
📱 ${invite.inviteCode}

Ou acesse: ${this.generateWebInviteUrl(invite)}

Te esperamos! 🙏`;
  }

  /**
   * Compartilhar convite via sistema nativo
   */
  static async shareInvite(invite: CellInvite): Promise<boolean> {
    try {
      const message = this.generateInviteMessage(invite);
      
      if (Platform.OS === 'web') {
        // Web share API
        if (navigator.share) {
          await navigator.share({
            title: `Convite para ${invite.cellName}`,
            text: message,
          });
          return true;
        } else {
          // Fallback: copy to clipboard
          await navigator.clipboard.writeText(message);
          return true;
        }
      } else {
        // Native share
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          // For native, we need to share as text
          // Since Sharing.shareAsync requires a file, we'll use Linking
          const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
          const canOpen = await Linking.canOpenURL(url);
          if (canOpen) {
            await Linking.openURL(url);
            return true;
          }
        }
        return false;
      }
    } catch (error) {
      console.error('Error sharing invite:', error);
      return false;
    }
  }

  /**
   * Compartilhar via WhatsApp especificamente
   */
  static async shareViaWhatsApp(invite: CellInvite): Promise<boolean> {
    try {
      const message = this.generateInviteMessage(invite);
      const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
      
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error sharing via WhatsApp:', error);
      return false;
    }
  }

  /**
   * Copiar código de convite para clipboard
   */
  static async copyInviteCode(code: string): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(code);
        return true;
      }
      // For native, we'd need expo-clipboard
      return false;
    } catch (error) {
      console.error('Error copying invite code:', error);
      return false;
    }
  }

  /**
   * Copiar mensagem completa para clipboard
   */
  static async copyInviteMessage(invite: CellInvite): Promise<boolean> {
    try {
      const message = this.generateInviteMessage(invite);
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(message);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error copying invite message:', error);
      return false;
    }
  }
}
