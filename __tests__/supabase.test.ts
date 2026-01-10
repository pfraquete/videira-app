import { describe, it, expect } from 'vitest';

describe('Supabase Configuration', () => {
  it('should have EXPO_PUBLIC_SUPABASE_URL environment variable set', () => {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    expect(url).toBeDefined();
    expect(url).not.toBe('');
    expect(url).toMatch(/^https:\/\/.+\.supabase\.co$/);
  });

  it('should have EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable set', () => {
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    expect(key).toBeDefined();
    expect(key).not.toBe('');
    // Supabase anon keys are JWT tokens that start with 'eyJ'
    expect(key).toMatch(/^eyJ/);
  });

  it('should be able to connect to Supabase', async () => {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      throw new Error('Supabase credentials not configured');
    }

    // Test connection by fetching the health endpoint
    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
    });

    // Should get a response (even if empty) if credentials are valid
    expect(response.status).toBeLessThan(500);
  });
});
