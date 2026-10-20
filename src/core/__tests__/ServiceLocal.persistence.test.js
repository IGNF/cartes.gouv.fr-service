import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, nextTick } from 'vue';
import { disposePinia, setActivePinia } from 'pinia';
import { OAuth2Client } from '@badgateway/oauth2-client';
import { createStorage } from '../../utils/__tests__/storage.js';

describe.each(['memory', 'localStorage'])('OAuth persistence: %s', (mode) => {
  /** @type {import('pinia').Pinia} */
  let pinia;
  /** @type {typeof import('../ServiceFactory.js').serviceFactoryCreate} */
  let createService;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubGlobal('localStorage', createStorage());
    vi.stubGlobal('sessionStorage', createStorage());
    vi.stubGlobal('window', { crypto, fetch });
    vi.stubGlobal('location', { origin: 'https://app.example.org', search: '' });
    const { configurePersistence } = await import('../../utils/persistence.js');
    configurePersistence({ mode: /** @type {'memory' | 'localStorage'} */ (mode) });
    ({ pinia } = await import('../../utils/pinia.js'));
    createApp({}).use(pinia);
    setActivePinia(pinia);
    ({ serviceFactoryCreate: createService } = await import('../ServiceFactory.js'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    disposePinia(pinia);
    setActivePinia(undefined);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function makeService() {
    return /** @type {import('../ServiceLocal.js').default} */ (createService({
      mode: 'local',
      client: { settings: {
        server: 'https://sso.example.org',
        clientId: 'test-client',
        authorizationEndpoint: '/authorize',
        tokenEndpoint: '/token'
      } }
    }));
  }

  function expectNoLocalStorageAccess() {
    if (mode === 'memory') {
      expect(localStorage.getItem).not.toHaveBeenCalled();
      expect(localStorage.setItem).not.toHaveBeenCalled();
      expect(localStorage.removeItem).not.toHaveBeenCalled();
      expect(localStorage.key).not.toHaveBeenCalled();
    }
  }

  it.each([false, true])('exchanges PKCE after redirect in a fresh instance with routing=%s', async (routing) => {
    const beforeRedirect = makeService();
    beforeRedirect.routing = routing;
    const loginUrl = new URL(await beforeRedirect.getAccessLogin());
    const verifier = beforeRedirect.codeVerifier;
    const token = { accessToken: 'new-access', refreshToken: 'new-refresh', expiresAt: Date.now() + 300000 };
    const adapter = new OAuth2Client({ server: 'https://sso.example.org', clientId: 'test-client' }).authorizationCode;
    const exchange = vi.spyOn(Object.getPrototypeOf(adapter), 'getTokenFromCodeRedirect').mockResolvedValue(token);
    location.search = `?code=new-code&session_state=new-session&state=${loginUrl.searchParams.get('state')}`;
    const afterRedirect = makeService();
    afterRedirect.routing = routing;
    expect(afterRedirect.codeVerifier).toBe('');

    expect(await afterRedirect.getAccessToken()).toEqual(token);
    await nextTick();
    expect(exchange).toHaveBeenCalledExactlyOnceWith(location, {
      redirectUri: `https://app.example.org${routing ? '/login' : ''}`,
      state: loginUrl.searchParams.get('state'),
      codeVerifier: verifier
    });
    expect(sessionStorage.getItem('oauth2:state')).toBeNull();
    expect(sessionStorage.length).toBe(0);
    const { useServiceStore } = await import('../../store/ServiceStore.js');
    expect(useServiceStore().connexion.token).toEqual(token);
    expectNoLocalStorageAccess();
  });

  it('rejects a mismatched callback before exchanging its code', async () => {
    await makeService().getAccessLogin();
    location.search = '?code=new-code&state=wrong-state';
    const adapter = new OAuth2Client({ server: 'https://sso.example.org', clientId: 'test-client' }).authorizationCode;
    const exchange = vi.spyOn(Object.getPrototypeOf(adapter), 'getTokenFromCodeRedirect');
    await expect(makeService().getAccessToken()).rejects.toThrow('OAuth state mismatch');
    expect(exchange).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('oauth2:state')).toBeTruthy();
    expectNoLocalStorageAccess();
  });

  it('rejects a callback without a verifier', async () => {
    location.search = '?code=new-code&state=missing-state';
    await expect(makeService().getAccessToken()).rejects.toThrow('Missing PKCE code verifier');
    expectNoLocalStorageAccess();
  });

  it('uses the legacy localStorage verifier only in persistent mode', async () => {
    localStorage.setItem('codeVerifier', 'legacy-verifier');
    vi.clearAllMocks();
    location.search = '?code=new-code';
    const adapter = new OAuth2Client({ server: 'https://sso.example.org', clientId: 'test-client' }).authorizationCode;
    const exchange = vi.spyOn(Object.getPrototypeOf(adapter), 'getTokenFromCodeRedirect').mockResolvedValue({ accessToken: 'new-access' });
    if (mode === 'memory') {
      await expect(makeService().getAccessToken()).rejects.toThrow('Missing PKCE code verifier');
      expect(exchange).not.toHaveBeenCalled();
    } else {
      await expect(makeService().getAccessToken()).resolves.toEqual({ accessToken: 'new-access' });
      expect(exchange).toHaveBeenCalledWith(location, expect.objectContaining({ codeVerifier: 'legacy-verifier' }));
    }
    expectNoLocalStorageAccess();
  });

  it('reads persisted tokens only in persistent mode', async () => {
    localStorage.setItem('service', JSON.stringify({ connexion: { token: { accessToken: 'old-access', expiresAt: null } } }));
    vi.clearAllMocks();
    const adapter = new OAuth2Client({ server: 'https://sso.example.org', clientId: 'test-client' }).authorizationCode;
    const exchange = vi.spyOn(Object.getPrototypeOf(adapter), 'getToken').mockResolvedValue({ accessToken: 'fresh-access', expiresAt: null });
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
    await makeService().getFetch()('https://api.example.org/data');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = fetchMock.mock.calls[0][0];
    expect(request.headers.get('Authorization')).toBe(mode === 'memory' ? 'Bearer fresh-access' : 'Bearer old-access');
    expect(exchange).toHaveBeenCalledTimes(mode === 'memory' ? 1 : 0);
    expectNoLocalStorageAccess();
  });

  it('clears memory state and temporary OAuth data on logout without touching other keys', async () => {
    const service = makeService();
    await service.getAccessLogin();
    service.authenticated = true;
    service.session = 'previous-session';
    service.token = { accessToken: 'private-token' };
    service.user = { id: 'private-user' };
    service.documents = { private: true };
    sessionStorage.setItem('unrelated', 'keep');
    vi.clearAllMocks();
    location.search = '?state=previous-session';

    expect(await service.resolveAccessStatus()).toBe('logout');
    await nextTick();
    expect(service.token).toBeNull();
    expect(service.user).toEqual({});
    expect(service.documents).toEqual({});
    expect(sessionStorage.getItem('oauth2:state')).toBeNull();
    expect(sessionStorage.length).toBe(1);
    expect(sessionStorage.getItem('unrelated')).toBe('keep');
    expectNoLocalStorageAccess();
  });
});
