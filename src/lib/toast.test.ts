import { describe, it, expect } from 'vitest';

describe('toast', () => {
  it('should export showToast function', async () => {
    const { showToast } = await import('@/lib/toast');
    expect(typeof showToast).toBe('function');
  });
});