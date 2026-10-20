import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStorage } from './storage.js';

describe('persistence configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('localStorage', createStorage());
    vi.stubGlobal('sessionStorage', createStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('defaults to localStorage and accepts an explicit localStorage mode', async () => {
    const { configurePersistence, isPersistenceEnabled } = await import('../persistence.js');
    expect(isPersistenceEnabled()).toBe(true);
    configurePersistence({ mode: 'localStorage' });
    expect(isPersistenceEnabled()).toBe(true);
    expect(localStorage.removeItem).not.toHaveBeenCalled();
  });

  it('removes only legacy library keys without reading their contents', async () => {
    for (const key of ['service', 'codeVerifier', 'oauth2:state', 'oauth2:pkce', 'oauth2:pkce:old']) {
      localStorage.setItem(key, 'private data');
    }
    localStorage.setItem('theme', 'light');
    localStorage.setItem('oauth2:unrelated', 'keep');
    sessionStorage.setItem('oauth2:state', 'pending-state');
    sessionStorage.setItem('oauth2:pkce:pending-state', 'pending-verifier');
    const { configurePersistence, isPersistenceEnabled } = await import('../persistence.js');

    configurePersistence({ mode: 'memory' });

    expect(isPersistenceEnabled()).toBe(false);
    expect(localStorage.getItem).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(2);
    expect(localStorage.getItem('theme')).toBe('light');
    expect(localStorage.getItem('oauth2:unrelated')).toBe('keep');
    expect(sessionStorage.getItem('oauth2:state')).toBe('pending-state');
    expect(sessionStorage.getItem('oauth2:pkce:pending-state')).toBe('pending-verifier');
  });

  it.each([undefined, null, {}, { mode: 'sessionStorage' }])('rejects invalid configuration %j', async (options) => {
    const { configurePersistence } = await import('../persistence.js');
    // @ts-expect-error Deliberately exercise invalid JavaScript consumer input.
    expect(() => configurePersistence(options)).toThrow('Invalid persistence mode');
    expect(localStorage.removeItem).not.toHaveBeenCalled();
  });

  it('rejects configuration after initialization', async () => {
    const { configurePersistence, lockPersistence } = await import('../persistence.js');
    lockPersistence();
    expect(() => configurePersistence({ mode: 'memory' })).toThrow('before creating');
    expect(localStorage.removeItem).not.toHaveBeenCalled();
  });

  it('reports cleanup failure and does not activate memory mode', async () => {
    localStorage.setItem('service', 'private data');
    vi.mocked(localStorage.removeItem).mockImplementation(() => { throw new Error('Storage denied'); });
    const { configurePersistence, isPersistenceEnabled } = await import('../persistence.js');

    expect(() => configurePersistence({ mode: 'memory' })).toThrow('Unable to clear persisted service data');
    expect(isPersistenceEnabled()).toBe(true);
  });
});
