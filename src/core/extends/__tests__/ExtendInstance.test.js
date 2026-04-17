import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('setInstance', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('applique les méthodes/propriétés d\'instance au service', async () => {
    const { setInstance, applyInstance } = await import('../ExtendInstance?t=' + Date.now());

    class ExtraFeature {
      constructor() {
        this.counter = 2;
      }

      getDouble() {
        return this.counter * 2;
      }
    }

    const service = { counter: 5 };
    setInstance(new ExtraFeature());
    applyInstance(service);

    expect(service.counter).toBe(2);
    expect(typeof service.getDouble).toBe('function');
    expect(service.getDouble()).toBe(4);
  });

  it('réapplique les fonctionnalités injectées après normalisation factory', async () => {
    vi.stubGlobal('location', { origin: 'http://localhost' });

    const { setInstance } = await import('../ExtendInstance?t=' + Date.now());
    const { serviceFactoryCreate } = await import('../../ServiceFactory?t=' + Date.now());

    setInstance({
      getInjectedMode() {
        return this.mode;
      }
    });

    const service = serviceFactoryCreate({ mode: 'custom' });

    expect(typeof service.getInjectedMode).toBe('function');
    expect(service.getInjectedMode()).toBe('custom');
  });
});
