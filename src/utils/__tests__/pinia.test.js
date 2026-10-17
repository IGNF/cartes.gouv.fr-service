import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, nextTick, watch } from 'vue';
import { createPinia, disposePinia, setActivePinia } from 'pinia';
import { createStorage } from './storage.js';

describe('service store persistence', () => {
  /** @type {import('pinia').Pinia[]} */
  let instances;

  beforeEach(() => {
    vi.resetModules();
    instances = [];
    vi.stubGlobal('localStorage', createStorage());
    vi.stubGlobal('sessionStorage', createStorage());
    vi.stubGlobal('location', { origin: 'https://app.example.org', search: '' });
    vi.stubGlobal('window', { crypto, fetch });
  });

  afterEach(() => {
    instances.forEach(disposePinia);
    setActivePinia(undefined);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function initialize() {
    const { pinia } = await import('../pinia.js');
    instances.push(pinia);
    createApp({}).use(pinia);
    const { useServiceStore } = await import('../../store/ServiceStore.js');
    return useServiceStore(pinia);
  }

  it('does not access localStorage while importing the public entry point', async () => {
    vi.stubGlobal('localStorage', undefined);
    const api = await import('../../index.js');
    expect(api.configurePersistence).toBeTypeOf('function');
    expect(api.pinia).toBeDefined();
  });

  it('hydrates and persists the service store by default', async () => {
    localStorage.setItem('service', JSON.stringify({ connexion: { user: { id: 'saved-user' } }, authentificateSyncNeeded: false }));
    const store = await initialize();
    expect(store.connexion.user.id).toBe('saved-user');
    store.setAuthentificateSyncNeeded(true);
    await nextTick();
    expect(JSON.parse(localStorage.getItem('service')).authentificateSyncNeeded).toBe(true);
  });

  it.each(['local', 'remote'])('keeps %s connection and documents reactive without serialization', async (mode) => {
    localStorage.setItem('service', JSON.stringify({ connexion: { user: { id: 'old-user' } } }));
    const { configurePersistence } = await import('../persistence.js');
    configurePersistence({ mode: 'memory' });
    vi.clearAllMocks();
    const store = await initialize();
    expect(store.connexion).toEqual({});
    const changes = vi.fn();
    const stop = watch(() => store.connexion.documents, changes, { deep: true });
    store.setService({ mode, authenticated: true, token: { accessToken: 'private-token' }, user: { id: 'new-user' }, documents: { drawing: { title: 'private-document' } } });
    store.setAuthentificateSyncNeeded(true);
    await nextTick();
    store.connexion.documents.drawing.title = 'updated-document';
    await nextTick();

    expect(store.getService().user.id).toBe('new-user');
    expect(store.getService().documents.drawing.title).toBe('updated-document');
    expect(store.isAuthentificateSyncNeeded).toBe(true);
    expect(changes).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem).not.toHaveBeenCalled();
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(localStorage.removeItem).not.toHaveBeenCalled();
    expect(sessionStorage.setItem).not.toHaveBeenCalled();
    stop();
  });

  it('starts empty in a new application context in memory mode', async () => {
    const { configurePersistence } = await import('../persistence.js');
    configurePersistence({ mode: 'memory' });
    const store = await initialize();
    store.setService({ mode: 'local', authenticated: true, user: { id: 'private-user' }, documents: { private: true } });
    await nextTick();

    vi.resetModules();
    const reloaded = await import('../persistence.js');
    reloaded.configurePersistence({ mode: 'memory' });
    const newStore = await initialize();
    expect(newStore.connexion).toEqual({});
    expect(newStore.authentificateSyncNeeded).toBe(false);
  });

  it.each(['store', 'local', 'remote'])('rejects late configuration after creating %s', async (usage) => {
    const { configurePersistence } = await import('../persistence.js');
    if (usage === 'store') {
      const customPinia = createPinia();
      instances.push(customPinia);
      const { useServiceStore } = await import('../../store/ServiceStore.js');
      useServiceStore(customPinia);
    } else {
      const { serviceFactoryCreate } = await import('../../core/ServiceFactory.js');
      serviceFactoryCreate({ mode: usage });
    }
    expect(() => configurePersistence({ mode: 'memory' })).toThrow('before creating');
  });
});
