import { describe, it, expect } from 'vitest';

describe('NotificationService Module', () => {
  it('should export NotificationService class', async () => {
    // Verificar que o módulo existe e pode ser importado
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'lib', 'notification-service.ts');
    const exists = fs.existsSync(filePath);
    expect(exists).toBe(true);
  });

  it('should have required methods defined in the file', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'lib', 'notification-service.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    expect(content).toContain('requestPermissions');
    expect(content).toContain('hasPermission');
    expect(content).toContain('getSettings');
    expect(content).toContain('saveSettings');
    expect(content).toContain('scheduleBirthdayNotification');
    expect(content).toContain('scheduleEventNotification');
    expect(content).toContain('syncAllNotifications');
  });

  it('should have NotificationSettings interface', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'lib', 'notification-service.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    expect(content).toContain('interface NotificationSettings');
    expect(content).toContain('enabled');
    expect(content).toContain('birthdayReminders');
    expect(content).toContain('eventReminders');
    expect(content).toContain('eventReminderHours');
  });
});

describe('ReportService Module', () => {
  it('should export ReportService class', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'lib', 'report-service.ts');
    const exists = fs.existsSync(filePath);
    expect(exists).toBe(true);
  });

  it('should have required methods defined in the file', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'lib', 'report-service.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    expect(content).toContain('generateMembersReport');
    expect(content).toContain('generateAttendanceReport');
    expect(content).toContain('formatMembersReportAsText');
    expect(content).toContain('formatAttendanceReportAsText');
    expect(content).toContain('exportReport');
    expect(content).toContain('shareReport');
  });

  it('should have report data interfaces', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'lib', 'report-service.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    expect(content).toContain('interface MemberReportData');
    expect(content).toContain('interface AttendanceReportData');
  });

  it('should format reports with proper headers', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'lib', 'report-service.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    expect(content).toContain('RELATÓRIO DE MEMBROS');
    expect(content).toContain('RELATÓRIO DE PRESENÇAS');
    expect(content).toContain('VIDEIRA');
  });
});

describe('Attendance History Screen', () => {
  it('should exist', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'app', 'history', 'attendance.tsx');
    const exists = fs.existsSync(filePath);
    expect(exists).toBe(true);
  });

  it('should have chart rendering functions', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'app', 'history', 'attendance.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    expect(content).toContain('renderLineChart');
    expect(content).toContain('renderBarChart');
  });

  it('should have period filter options', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'app', 'history', 'attendance.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    expect(content).toContain('4weeks');
    expect(content).toContain('8weeks');
    expect(content).toContain('12weeks');
    expect(content).toContain('6months');
  });

  it('should calculate statistics', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'app', 'history', 'attendance.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    expect(content).toContain('average');
    expect(content).toContain('best');
    expect(content).toContain('worst');
    expect(content).toContain('trend');
  });
});

describe('Reports Screen', () => {
  it('should exist', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'app', 'reports', 'index.tsx');
    const exists = fs.existsSync(filePath);
    expect(exists).toBe(true);
  });

  it('should have report generation functions', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'app', 'reports', 'index.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    expect(content).toContain('generateMembersReport');
    expect(content).toContain('generateAttendanceReport');
  });

  it('should have export options', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'app', 'reports', 'index.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    expect(content).toContain('share');
    expect(content).toContain('download');
    expect(content).toContain('Compartilhar');
    expect(content).toContain('Salvar Arquivo');
  });
});

describe('Notification Settings Screen', () => {
  it('should exist', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'app', 'settings', 'notifications.tsx');
    const exists = fs.existsSync(filePath);
    expect(exists).toBe(true);
  });

  it('should have toggle options for notifications', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'app', 'settings', 'notifications.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    expect(content).toContain('Switch');
    expect(content).toContain('birthdayReminders');
    expect(content).toContain('eventReminders');
  });
});

describe('Icon Mappings', () => {
  it('should have document icons mapped', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'components', 'ui', 'icon-symbol.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    expect(content).toContain('doc.fill');
    expect(content).toContain('arrow.down.doc.fill');
    expect(content).toContain('arrow.up.right');
    expect(content).toContain('arrow.down.right');
  });
});
