import { describe, it, expect } from 'vitest';
import { getBusinessPlan } from '@/lib/billing';

describe('billing', () => {
  describe('getBusinessPlan', () => {
    it('should return "free" for any business ID', async () => {
      const result = await getBusinessPlan('business-123');
      expect(result).toBe('free');
    });

    it('should return "free" for empty business ID', async () => {
      const result = await getBusinessPlan('');
      expect(result).toBe('free');
    });
  });
});