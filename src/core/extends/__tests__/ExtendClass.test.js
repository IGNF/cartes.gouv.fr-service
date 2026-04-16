import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('setClass', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('stocke une seule classe injectée', async () => {
    const { setClass, getClass } = await import('../ExtendClass?t=' + Date.now());

    class MyService {}
    setClass(MyService);

    expect(getClass()).toBe(MyService);
  });

  it('applique les méthodes de classe injectée au service', async () => {
    const { setClass, applyClasses } = await import('../ExtendClass?t=' + Date.now());

    class ExtraClass {
      getRole() {
        return 'admin';
      }
    }

    const service = {};
    setClass(ExtraClass);
    applyClasses(service);

    expect(typeof service.getRole).toBe('function');
    expect(service.getRole()).toBe('admin');
  });
});
