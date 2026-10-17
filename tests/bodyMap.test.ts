import { describe, expect, it } from 'vitest';
import { blockedReason, bodySections, canToggle, isValidSelection, sectionForRegion, toggleSection } from '../src/bodyMap';
import { regionCatalog } from '../src/regions/catalog';

describe('body map selection rules', () => {
  it('maps every catalog region to exactly one section', () => {
    for (const region of regionCatalog) expect(sectionForRegion(region.id)).toBeDefined();
    expect(bodySections.map(section => section.id)).toHaveLength(7);
  });
  it('allows touching sections on one side only', () => {
    expect(isValidSelection(['right-foot-ankle', 'right-hip-leg'])).toBe(true);
    expect(isValidSelection(['right-foot-ankle', 'left-foot-ankle'])).toBe(false);
    expect(isValidSelection(['left-hip-leg', 'right-hip-leg'])).toBe(false);
  });
  it('makes both arms and Back available together', () => {
    expect(canToggle([], 'right-arm-back')).toBe(true);
    expect(isValidSelection(['right-arm-back','back'])).toBe(true);
    expect(isValidSelection(['back'])).toBe(true);
    expect(blockedReason([], 'left-arm-back')).toBeNull();
    expect(isValidSelection(['left-arm-back','back','right-arm-back'])).toBe(true);
    expect(toggleSection(['right-arm-back','back'],'left-arm-back')).toEqual(['right-arm-back','back','left-arm-back']);
    expect(canToggle(['right-arm-back','back'],'left-arm-back')).toBe(true);
    expect(isValidSelection(['left-arm-back','right-foot-ankle'])).toBe(false);
  });
  it('explains why a section cannot be added', () => {
    expect(blockedReason(['right-foot-ankle'], 'left-hip-leg')).toMatch(/left side/);
    expect(blockedReason(['right-foot-ankle'], 'right-hip-leg')).toBeNull();
    expect(blockedReason(['right-foot-ankle'], 'right-foot-ankle')).toBeNull();
  });
});
