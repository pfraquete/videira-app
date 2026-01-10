import { Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Member, Attendance, Cell } from './supabase';
import { DataService } from './data-service';

export interface MemberReportData {
  cell: Cell | null;
  members: Member[];
  generatedAt: string;
}

export interface AttendanceReportData {
  cell: Cell | null;
  startDate: string;
  endDate: string;
  records: {
    date: string;
    total: number;
    present: number;
    percentage: number;
    members: { name: string; present: boolean }[];
  }[];
  summary: {
    totalSessions: number;
    averageAttendance: number;
    bestAttendance: number;
    worstAttendance: number;
  };
  generatedAt: string;
}

export class ReportService {
  /**
   * Gerar relatório de membros em formato texto
   */
  static async generateMembersReport(userId: string): Promise<MemberReportData> {
    const [cell, members] = await Promise.all([
      DataService.getCell(userId),
      DataService.getMembers(userId),
    ]);

    return {
      cell,
      members: members.sort((a, b) => a.nome.localeCompare(b.nome)),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Gerar relatório de presenças
   */
  static async generateAttendanceReport(
    userId: string,
    weeks: number = 8
  ): Promise<AttendanceReportData> {
    const [cell, members] = await Promise.all([
      DataService.getCell(userId),
      DataService.getMembers(userId),
    ]);

    const activeMembers = members.filter(m => m.status === 'Ativo');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (weeks * 7));

    const records: AttendanceReportData['records'] = [];

    for (let i = 0; i < weeks; i++) {
      const weekEnd = new Date(endDate);
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      const sundayDate = new Date(weekEnd);
      sundayDate.setDate(sundayDate.getDate() - sundayDate.getDay());
      const dateStr = sundayDate.toISOString().split('T')[0];

      const attendance = await DataService.getAttendanceByDate(userId, dateStr);
      
      const memberAttendance = activeMembers.map(member => {
        const record = attendance.find(a => a.member_id === member.id);
        return {
          name: member.nome,
          present: record?.present ?? false,
        };
      });

      const presentCount = memberAttendance.filter(m => m.present).length;
      const percentage = activeMembers.length > 0
        ? Math.round((presentCount / activeMembers.length) * 100)
        : 0;

      records.unshift({
        date: dateStr,
        total: activeMembers.length,
        present: presentCount,
        percentage,
        members: memberAttendance,
      });
    }

    const percentages = records.map(r => r.percentage);
    const summary = {
      totalSessions: records.length,
      averageAttendance: percentages.length > 0
        ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length)
        : 0,
      bestAttendance: percentages.length > 0 ? Math.max(...percentages) : 0,
      worstAttendance: percentages.length > 0 ? Math.min(...percentages) : 0,
    };

    return {
      cell,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      records,
      summary,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Formatar relatório de membros como texto
   */
  static formatMembersReportAsText(data: MemberReportData): string {
    const lines: string[] = [];
    
    lines.push('═══════════════════════════════════════════');
    lines.push('       RELATÓRIO DE MEMBROS - VIDEIRA');
    lines.push('═══════════════════════════════════════════');
    lines.push('');
    
    if (data.cell) {
      lines.push(`Célula: ${data.cell.cell_name}`);
      lines.push(`Dia de Reunião: ${data.cell.meeting_day || 'Não definido'}`);
      lines.push(`Horário: ${data.cell.meeting_time || 'Não definido'}`);
      lines.push('');
    }
    
    lines.push(`Total de Membros: ${data.members.length}`);
    lines.push(`Ativos: ${data.members.filter(m => m.status === 'Ativo').length}`);
    lines.push(`Inativos: ${data.members.filter(m => m.status === 'Inativo').length}`);
    lines.push('');
    lines.push('───────────────────────────────────────────');
    lines.push('                LISTA DE MEMBROS');
    lines.push('───────────────────────────────────────────');
    lines.push('');

    // Agrupar por função
    const byRole: Record<string, Member[]> = {};
    data.members.forEach(member => {
      const role = member.funcao || 'Sem função';
      if (!byRole[role]) byRole[role] = [];
      byRole[role].push(member);
    });

    Object.entries(byRole).forEach(([role, members]) => {
      lines.push(`▸ ${role} (${members.length})`);
      lines.push('');
      members.forEach(member => {
        lines.push(`  • ${member.nome}`);
        if (member.telefone) lines.push(`    📱 ${member.telefone}`);
        if (member.email) lines.push(`    ✉️ ${member.email}`);
        if (member.data_nascimento) {
          const birth = new Date(member.data_nascimento + 'T00:00:00');
          lines.push(`    🎂 ${birth.toLocaleDateString('pt-BR')}`);
        }
        lines.push(`    Status: ${member.status}`);
        lines.push('');
      });
    });

    lines.push('───────────────────────────────────────────');
    lines.push(`Gerado em: ${new Date(data.generatedAt).toLocaleString('pt-BR')}`);
    lines.push('═══════════════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * Formatar relatório de presenças como texto
   */
  static formatAttendanceReportAsText(data: AttendanceReportData): string {
    const lines: string[] = [];
    
    lines.push('═══════════════════════════════════════════');
    lines.push('      RELATÓRIO DE PRESENÇAS - VIDEIRA');
    lines.push('═══════════════════════════════════════════');
    lines.push('');
    
    if (data.cell) {
      lines.push(`Célula: ${data.cell.cell_name}`);
      lines.push('');
    }
    
    lines.push(`Período: ${new Date(data.startDate + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(data.endDate + 'T00:00:00').toLocaleDateString('pt-BR')}`);
    lines.push('');
    lines.push('───────────────────────────────────────────');
    lines.push('                  RESUMO');
    lines.push('───────────────────────────────────────────');
    lines.push('');
    lines.push(`Total de Reuniões: ${data.summary.totalSessions}`);
    lines.push(`Média de Presença: ${data.summary.averageAttendance}%`);
    lines.push(`Melhor Presença: ${data.summary.bestAttendance}%`);
    lines.push(`Pior Presença: ${data.summary.worstAttendance}%`);
    lines.push('');
    lines.push('───────────────────────────────────────────');
    lines.push('            DETALHES POR SEMANA');
    lines.push('───────────────────────────────────────────');
    lines.push('');

    data.records.forEach(record => {
      const date = new Date(record.date + 'T00:00:00');
      lines.push(`▸ ${date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}`);
      lines.push(`  Presentes: ${record.present}/${record.total} (${record.percentage}%)`);
      lines.push('');
      
      const present = record.members.filter(m => m.present);
      const absent = record.members.filter(m => !m.present);
      
      if (present.length > 0) {
        lines.push('  ✓ Presentes:');
        present.forEach(m => lines.push(`    • ${m.name}`));
      }
      
      if (absent.length > 0) {
        lines.push('  ✗ Ausentes:');
        absent.forEach(m => lines.push(`    • ${m.name}`));
      }
      
      lines.push('');
    });

    lines.push('───────────────────────────────────────────');
    lines.push(`Gerado em: ${new Date(data.generatedAt).toLocaleString('pt-BR')}`);
    lines.push('═══════════════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * Exportar relatório como arquivo de texto
   */
  static async exportReport(
    content: string,
    filename: string
  ): Promise<boolean> {
    if (Platform.OS === 'web') {
      // Na web, criar um blob e fazer download
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    }

    try {
      const fileUri = `${FileSystem.documentDirectory || ''}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, content);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/plain',
          dialogTitle: 'Compartilhar Relatório',
        });
      }

      return true;
    } catch (error) {
      console.error('Error exporting report:', error);
      return false;
    }
  }

  /**
   * Compartilhar relatório via Share API
   */
  static async shareReport(content: string, title: string): Promise<boolean> {
    try {
      await Share.share({
        message: content,
        title,
      });
      return true;
    } catch (error) {
      console.error('Error sharing report:', error);
      return false;
    }
  }
}
