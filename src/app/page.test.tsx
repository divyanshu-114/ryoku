import { describe, it, expect } from 'vitest';
import * as page from '@/app/page';

describe('LandingPage', () => {
  it('should export default component', () => {
    expect(page.default).toBeDefined();
    expect(typeof page.default).toBe('function');
  });
});