import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('setClass', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('applique les méthodes de classe injectée au service', async () => {
    const { setClass, applyClass } = await import('../ExtendClass?t=' + Date.now());

    class ExtraClass {
      getRole() {
        return 'admin';
      }
    }

    const service = {};
    setClass(ExtraClass);
    applyClass(service);

    expect(typeof service.getRole).toBe('function');
    expect(service.getRole()).toBe('admin');
  });
});
