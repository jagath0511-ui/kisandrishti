import { describe, it, expect } from 'vitest';

describe('App Shell Setup', () => {
  it('loads environment defaults', () => {
    expect(process.env.GEMINI_MODEL || 'gemini-2.5-flash').toBe('gemini-2.5-flash');
  });
});
