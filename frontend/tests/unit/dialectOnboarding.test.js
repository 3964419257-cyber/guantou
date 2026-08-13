import { describe, expect, it } from 'vitest';
import {
  IDENTITY_DIALECTS,
  mergeIdentityDialects,
} from '@/const/identityDialects';
import { needsDialectOnboarding } from '@/services/dialectOnboarding';

describe('needsDialectOnboarding', () => {
  it('requires onboarding when primary dialect is missing', () => {
    expect(needsDialectOnboarding({})).toBe(true);
    expect(needsDialectOnboarding({ primary_dialect: null })).toBe(true);
    expect(needsDialectOnboarding({ primary_dialect: '' })).toBe(true);
  });

  it('skips onboarding when primary dialect exists', () => {
    expect(needsDialectOnboarding({
      primary_dialect: { id: 1, name: '四川话' },
    })).toBe(false);
  });

  it('treats null user as no forced onboarding', () => {
    expect(needsDialectOnboarding(null)).toBe(false);
    expect(needsDialectOnboarding(undefined)).toBe(false);
  });
});

describe('mergeIdentityDialects', () => {
  it('keeps local example words when API has no metadata', () => {
    const merged = mergeIdentityDialects([
      { name: '四川话', code: 'sichuan', metadata: {} },
    ]);
    const sichuan = merged.find((item) => item.name === '四川话');
    expect(sichuan.example).toBe('巴适');
  });

  it('appends unknown API dialect families', () => {
    const merged = mergeIdentityDialects([
      { name: '潮汕话', code: 'chaoshan', metadata: { example: '食未' } },
    ]);
    expect(merged.some((item) => item.name === '潮汕话')).toBe(true);
    expect(merged.length).toBeGreaterThan(IDENTITY_DIALECTS.length);
  });
});
