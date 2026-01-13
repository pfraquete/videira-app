import { describe, it, expect, vi } from 'vitest';

// Mock do Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        in: vi.fn(() => ({
          gte: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 1 }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 1 }, error: null })),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));

describe('DataService', () => {
  describe('Member Operations', () => {
    it('should have getMember function', async () => {
      const { DataService } = await import('../lib/data-service');
      expect(typeof DataService.getMember).toBe('function');
    });

    it('should have updateMember function', async () => {
      const { DataService } = await import('../lib/data-service');
      expect(typeof DataService.updateMember).toBe('function');
    });

    it('should have deleteMember function', async () => {
      const { DataService } = await import('../lib/data-service');
      expect(typeof DataService.deleteMember).toBe('function');
    });

    it('should have createMember function', async () => {
      const { DataService } = await import('../lib/data-service');
      expect(typeof DataService.createMember).toBe('function');
    });

    it('should have getMembers function', async () => {
      const { DataService } = await import('../lib/data-service');
      expect(typeof DataService.getMembers).toBe('function');
    });
  });

  describe('Cell Operations', () => {
    it('should have getCell function', async () => {
      const { DataService } = await import('../lib/data-service');
      expect(typeof DataService.getCell).toBe('function');
    });

    it('should have getCellStats function', async () => {
      const { DataService } = await import('../lib/data-service');
      expect(typeof DataService.getCellStats).toBe('function');
    });
  });

  describe('Attendance Operations', () => {
    it('should have getAttendanceByDate function', async () => {
      const { DataService } = await import('../lib/data-service');
      expect(typeof DataService.getAttendanceByDate).toBe('function');
    });

    it('should have saveAttendance function', async () => {
      const { DataService } = await import('../lib/data-service');
      expect(typeof DataService.saveAttendance).toBe('function');
    });

    it('should have saveBulkAttendance function', async () => {
      const { DataService } = await import('../lib/data-service');
      expect(typeof DataService.saveBulkAttendance).toBe('function');
    });
  });
});

describe('HierarchyService', () => {
  describe('Role Verification', () => {
    it('should have isPastor function', async () => {
      const { HierarchyService } = await import('../lib/hierarchy-service');
      expect(typeof HierarchyService.isPastor).toBe('function');
    });

    it('should have isDiscipulador function', async () => {
      const { HierarchyService } = await import('../lib/hierarchy-service');
      expect(typeof HierarchyService.isDiscipulador).toBe('function');
    });
  });

  describe('Pastor Operations', () => {
    it('should have getPastor function', async () => {
      const { HierarchyService } = await import('../lib/hierarchy-service');
      expect(typeof HierarchyService.getPastor).toBe('function');
    });

    it('should have getPastorStats function', async () => {
      const { HierarchyService } = await import('../lib/hierarchy-service');
      expect(typeof HierarchyService.getPastorStats).toBe('function');
    });

    it('should have getPastorDiscipuladores function', async () => {
      const { HierarchyService } = await import('../lib/hierarchy-service');
      expect(typeof HierarchyService.getPastorDiscipuladores).toBe('function');
    });

    it('should have getPastorCells function', async () => {
      const { HierarchyService } = await import('../lib/hierarchy-service');
      expect(typeof HierarchyService.getPastorCells).toBe('function');
    });
  });

  describe('Discipulador Operations', () => {
    it('should have getDiscipulador function', async () => {
      const { HierarchyService } = await import('../lib/hierarchy-service');
      expect(typeof HierarchyService.getDiscipulador).toBe('function');
    });

    it('should have getDiscipuladorStats function', async () => {
      const { HierarchyService } = await import('../lib/hierarchy-service');
      expect(typeof HierarchyService.getDiscipuladorStats).toBe('function');
    });

    it('should have getDiscipuladorCells function', async () => {
      const { HierarchyService } = await import('../lib/hierarchy-service');
      expect(typeof HierarchyService.getDiscipuladorCells).toBe('function');
    });
  });
});

describe('Type Definitions', () => {
  it('should export supabase client', async () => {
    const module = await import('../lib/supabase');
    // Check that the module exports the supabase client
    expect(module.supabase).toBeDefined();
  });

  it('should export HierarchyService from hierarchy-service', async () => {
    const module = await import('../lib/hierarchy-service');
    // Check that the module exports the expected service
    expect(module.HierarchyService).toBeDefined();
  });
});
