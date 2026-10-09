import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { storePlugin } from 'pinia-plugin-store';
import { OAuth2Fetch } from '@badgateway/oauth2-client';
import { serviceFactoryCreate } from '../ServiceFactory.js';
import { useServiceStore } from '../../store/ServiceStore.js';

function createStorage() {
  const entries = new Map();
  return {
    get length() { return entries.size; },
    key: (index) => Array.from(entries.keys()).at(index) ?? null,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, String(value)),
    removeItem: (key) => entries.delete(key)
  };
}

describe('ServiceLocal logout', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorage());
    vi.stubGlobal('sessionStorage', createStorage());
    vi.stubGlobal('location', {
      origin: 'https://app.example.org',
      search: '?session_state=previous-session'
    });
    const pinia = createPinia();
    pinia.use(storePlugin({ stores: ['service'], storage: localStorage }));
    createApp({}).use(pinia);
    setActivePinia(pinia);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    setActivePinia(undefined);
    vi.unstubAllGlobals();
  });

  it('cleans persisted authentication and OAuth2 data without clearing unrelated storage', async () => {
    const service = /** @type {import('../ServiceLocal.js').default} */ (serviceFactoryCreate({
      mode: 'local',
      authenticated: true,
      session: 'previous-session',
      code: 'previous-code',
      codeVerifier: 'previous-verifier',
      token: { accessToken: 'previous-access', refreshToken: 'previous-refresh' },
      user: { id: 'previous-user' },
      documents: { private: true }
    }));
    const store = useServiceStore();
    store.setService(service);
    await nextTick();
    localStorage.setItem('codeVerifier', 'legacy-verifier');
    localStorage.setItem('theme', 'light');
    sessionStorage.setItem('oauth2:state', 'encrypted-state');
    sessionStorage.setItem('oauth2:pkce:encrypted-state', 'current-verifier');
    sessionStorage.setItem('oauth2:pkce:old-state', 'old-verifier');
    localStorage.setItem('oauth2:state', 'legacy-state');
    localStorage.setItem('oauth2:pkce:legacy-state', 'legacy-verifier');
    sessionStorage.setItem('unrelated', 'keep');

    expect(await service.resolveAccessStatus()).toBe('logout');
    await nextTick();

    expect(service.authenticated).toBe(false);
    expect(service.token).toBeNull();
    expect(service.session).toBeNull();
    expect(service.code).toBeNull();
    expect(service.codeVerifier).toBe('');
    expect(service.user).toEqual({});
    expect(service.documents).toEqual({});
    expect(localStorage.getItem('codeVerifier')).toBeNull();
    expect(sessionStorage.getItem('oauth2:state')).toBeNull();
    expect(sessionStorage.getItem('oauth2:pkce:encrypted-state')).toBeNull();
    expect(sessionStorage.getItem('oauth2:pkce:old-state')).toBeNull();
    expect(localStorage.getItem('oauth2:state')).toBeNull();
    expect(localStorage.getItem('oauth2:pkce:legacy-state')).toBeNull();
    expect(localStorage.getItem('theme')).toBe('light');
    expect(sessionStorage.getItem('unrelated')).toBe('keep');
    const persisted = JSON.parse(localStorage.getItem('service') || '{}');
    expect(persisted.connexion.authenticated).toBe(false);
    expect(persisted.connexion.codeVerifier).toBe('');
    expect(persisted.connexion.token).toBeFalsy();
    expect(persisted.connexion.user).toEqual({});
    expect(persisted.connexion.documents).toEqual({});
  });

  it('stops refresh scheduling and ignores tokens received after logout', async () => {
    vi.useFakeTimers();
    const accessTokenSpy = vi.spyOn(OAuth2Fetch.prototype, 'getAccessToken').mockResolvedValue('previous-access');
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
    const service = /** @type {import('../ServiceLocal.js').default} */ (serviceFactoryCreate({ mode: 'local', session: 'previous-session' }));
    await service.getFetch()('https://api.example.org/data');
    const wrapper = /** @type {any} */ (accessTokenSpy.mock.contexts.at(0));
    wrapper.token = { accessToken: 'previous-access', refreshToken: 'previous-refresh' };
    wrapper.refreshTimer = setTimeout(() => wrapper.refreshToken(), 60000);
    /** @type {(token: object) => void} */
    let finishRefresh = () => { throw new Error('Refresh has not started'); };
    vi.spyOn(wrapper.options.client, 'refreshToken').mockImplementation(() => new Promise((resolve) => {
      finishRefresh = resolve;
    }));
    const refresh = wrapper.refreshToken();

    expect(await service.resolveAccessStatus()).toBe('logout');
    finishRefresh({ accessToken: 'late-access', refreshToken: 'late-refresh', expiresAt: Date.now() + 300000 });
    await refresh;
    await nextTick();

    expect(vi.getTimerCount()).toBe(0);
    expect(service.token).toBeNull();
    expect(useServiceStore().connexion.token).toBeFalsy();
    expect(JSON.parse(localStorage.getItem('service') || '{}').connexion.token).toBeFalsy();
    await expect(service.getFetch()('https://api.example.org/data')).rejects.toThrow('OAuth2 session logged out');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const nextToken = { accessToken: 'next-access', refreshToken: 'next-refresh', expiresAt: Date.now() + 300000 };
    vi.spyOn(Object.getPrototypeOf(wrapper.options.client.authorizationCode), 'getTokenFromCodeRedirect').mockResolvedValue(nextToken);
    service.codeVerifier = 'next-verifier';
    location.search = '?code=next-code&session_state=next-session';
    expect(await service.getAccessToken()).toEqual(nextToken);
    accessTokenSpy.mockRestore();
    await service.getFetch()('https://api.example.org/data');
    expect(fetchMock.mock.lastCall?.at(0).headers.get('Authorization')).toBe('Bearer next-access');
  });

  it('preserves pending OAuth2 data when no logout callback is present', async () => {
    location.search = '';
    const service = serviceFactoryCreate({ mode: 'local', session: 'active-session' });
    sessionStorage.setItem('oauth2:state', 'pending-state');
    sessionStorage.setItem('oauth2:pkce:pending-state', 'pending-verifier');
    localStorage.setItem('codeVerifier', 'legacy-verifier');

    expect(await service.resolveAccessStatus()).toBe('no-auth');
    expect(sessionStorage.getItem('oauth2:state')).toBe('pending-state');
    expect(sessionStorage.getItem('oauth2:pkce:pending-state')).toBe('pending-verifier');
    expect(localStorage.getItem('codeVerifier')).toBe('legacy-verifier');
  });
});