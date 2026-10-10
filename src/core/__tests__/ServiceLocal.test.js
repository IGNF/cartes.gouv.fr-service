import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { storePlugin } from 'pinia-plugin-store';
import { OAuth2Client, OAuth2Fetch } from '@badgateway/oauth2-client';
import { serviceFactoryCreate } from '../ServiceFactory.js';
import { encryptValue, decryptValue } from '../ServiceEncrypt.js';
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

describe('ServiceLocal authentication', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { crypto });
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

  it.each([false, true])('creates a login URL with PKCE and stored state with routing=%s', async (routing) => {
    const service = /** @type {import('../ServiceLocal.js').default} */ (serviceFactoryCreate({
      mode: 'local',
      routing,
      client: { settings: {
        server: 'https://sso.example.org',
        clientId: 'test-client',
        authorizationEndpoint: '/authorize',
        tokenEndpoint: '/token'
      } }
    }));
    service.url = 'http://localhost:5173/demo/';

    const loginUrl = new URL(await service.getAccessLogin());
    const storedState = sessionStorage.getItem('oauth2:state');
    const challengeBytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(service.codeVerifier));
    const expectedChallenge = btoa(String.fromCharCode(...new Uint8Array(challengeBytes)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    expect(loginUrl.origin + loginUrl.pathname).toBe('https://sso.example.org/authorize');
    expect(loginUrl.searchParams.get('redirect_uri')).toBe(`http://localhost:5173/demo${routing ? '/login' : ''}`);
    expect(loginUrl.searchParams.get('client_id')).toBe('test-client');
    expect(loginUrl.searchParams.get('response_type')).toBe('code');
    expect(loginUrl.searchParams.get('scope')).toBe('openid profile email');
    expect(loginUrl.searchParams.get('code_challenge_method')).toBe('S256');
    expect(loginUrl.searchParams.get('code_challenge')).toBe(expectedChallenge);
    expect(service.codeVerifier).toMatch(/^[A-Za-z0-9._~-]{43,128}$/);
    expect(storedState).toBeTruthy();
    expect(await decryptValue(storedState)).toBe(loginUrl.searchParams.get('state'));
    expect(sessionStorage.getItem(`oauth2:pkce:${storedState}`)).toBe(service.codeVerifier);
    expect(localStorage.getItem('codeVerifier')).toBe(service.codeVerifier);
  });

  it.each([false, true])('exchanges a login code and cleans temporary OAuth data with routing=%s', async (routing) => {
    const adapterPrototype = Object.getPrototypeOf(new OAuth2Client({ server: 'https://sso.example.org', clientId: 'test-client' }).authorizationCode);
    const token = { accessToken: 'new-access', refreshToken: 'new-refresh', expiresAt: Date.now() + 300000 };
    const exchange = vi.spyOn(adapterPrototype, 'getTokenFromCodeRedirect').mockResolvedValue(token);
    const service = /** @type {import('../ServiceLocal.js').default} */ (serviceFactoryCreate({ mode: 'local', routing, codeVerifier: 'new-verifier' }));
    service.url = 'http://localhost:5173/demo/';
    location.search = '?code=new-code&session_state=new-session&state=expected-state';
    const storedState = await encryptValue('expected-state');
    sessionStorage.setItem('oauth2:state', storedState);
    sessionStorage.setItem(`oauth2:pkce:${storedState}`, 'new-verifier');
    sessionStorage.setItem('unrelated', 'keep');
    localStorage.setItem('codeVerifier', 'new-verifier');

    expect(await service.getAccessToken()).toEqual(token);
    expect(exchange).toHaveBeenCalledExactlyOnceWith(location, {
      redirectUri: `http://localhost:5173/demo${routing ? '/login' : ''}`,
      state: 'expected-state',
      codeVerifier: 'new-verifier'
    });
    expect(service.token).toEqual(token);
    expect(useServiceStore().connexion.token).toEqual(token);
    expect(sessionStorage.getItem('oauth2:state')).toBeNull();
    expect(sessionStorage.getItem(`oauth2:pkce:${storedState}`)).toBeNull();
    expect(localStorage.getItem('codeVerifier')).toBeNull();
    expect(sessionStorage.getItem('unrelated')).toBe('keep');
  });

  it('rejects a mismatched OAuth state before exchanging the code', async () => {
    const adapterPrototype = Object.getPrototypeOf(new OAuth2Client({ server: 'https://sso.example.org', clientId: 'test-client' }).authorizationCode);
    const exchange = vi.spyOn(adapterPrototype, 'getTokenFromCodeRedirect');
    const service = serviceFactoryCreate({ mode: 'local', codeVerifier: 'pending-verifier' });
    location.search = '?code=new-code&session_state=new-session&state=unexpected-state';
    const storedState = await encryptValue('expected-state');
    sessionStorage.setItem('oauth2:state', storedState);

    await expect(service.getAccessToken()).rejects.toThrow('OAuth state mismatch');
    expect(exchange).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('oauth2:state')).toBe(storedState);
  });

  it('rejects a login callback without a PKCE verifier before exchanging the code', async () => {
    const adapterPrototype = Object.getPrototypeOf(new OAuth2Client({ server: 'https://sso.example.org', clientId: 'test-client' }).authorizationCode);
    const exchange = vi.spyOn(adapterPrototype, 'getTokenFromCodeRedirect');
    const service = serviceFactoryCreate({ mode: 'local' });
    location.search = '?code=new-code&session_state=new-session';

    await expect(service.getAccessToken()).rejects.toThrow('Missing PKCE code verifier');
    expect(exchange).not.toHaveBeenCalled();
  });

  it('resolves login after loading the token, profile and documents in order', async () => {
    location.search = '?code=new-code&session_state=new-session';
    const emitter = { dispatchEvent: vi.fn() };
    const service = /** @type {import('../ServiceLocal.js').default & { getUserMe: () => Promise<object>, getDocuments: () => Promise<object> }} */ (serviceFactoryCreate({ mode: 'local', emitter }));
    const token = { accessToken: 'new-access' };
    const user = { id: 'new-user' };
    const documents = [{ id: 'new-document' }];
    const calls = [];
    vi.spyOn(service, 'getAccessToken').mockImplementation(async () => {
      calls.push('token');
      service.token = token;
      return token;
    });
    vi.spyOn(service, 'getUserMe').mockImplementation(async () => {
      calls.push('user');
      service.user = user;
      return user;
    });
    vi.spyOn(service, 'getDocuments').mockImplementation(async () => {
      calls.push('documents');
      service.documents = documents;
      return documents;
    });

    expect(await service.resolveAccessStatus()).toBe('login');
    expect(calls).toEqual(['token', 'user', 'documents']);
    expect(service.authenticated).toBe(true);
    expect(service.session).toBe('new-session');
    expect(service.code).toBe('new-code');
    expect(useServiceStore().connexion.user).toEqual(user);
    expect(useServiceStore().connexion.documents).toEqual(documents);
    expect(emitter.dispatchEvent).toHaveBeenNthCalledWith(1, 'service:user:loaded', { bubbles: true, detail: user });
    expect(emitter.dispatchEvent).toHaveBeenNthCalledWith(2, 'service:documents:loaded', { bubbles: true, detail: documents });
  });

  it('does not load profile or documents when the token exchange fails', async () => {
    location.search = '?code=new-code&session_state=new-session';
    const service = /** @type {import('../ServiceLocal.js').default & { getUserMe: () => Promise<object>, getDocuments: () => Promise<object> }} */ (serviceFactoryCreate({ mode: 'local' }));
    vi.spyOn(service, 'getAccessToken').mockRejectedValue(new Error('Token endpoint unavailable'));
    const getUser = vi.spyOn(service, 'getUserMe');
    const getDocuments = vi.spyOn(service, 'getDocuments');

    await expect(service.resolveAccessStatus()).rejects.toThrow('Token endpoint unavailable');
    expect(getUser).not.toHaveBeenCalled();
    expect(getDocuments).not.toHaveBeenCalled();
  });

  it('reports errors returned by the IAM login callback', async () => {
    location.search = '?error=access_denied&error_description=Login%20cancelled';
    const service = serviceFactoryCreate({ mode: 'local', session: 'pending-session' });
    const exchange = vi.spyOn(service, 'getAccessToken');

    await expect(service.resolveAccessStatus()).rejects.toEqual({ name: 'access_denied', message: 'Login cancelled' });
    expect(service.error).toEqual({ name: 'access_denied', message: 'Login cancelled' });
    expect(exchange).not.toHaveBeenCalled();
  });

  it.each([false, true])('keeps the logout redirect URI fixed with routing=%s', async (routing) => {
    const service = serviceFactoryCreate({ mode: 'local', routing, session: 'previous-session' });
    service.url = 'http://localhost:5173/demo/';

    const logoutUrl = new URL(await service.getAccessLogout());

    expect(logoutUrl.searchParams.get('post_logout_redirect_uri')).toBe(`http://localhost:5173/demo${routing ? '/logout' : ''}`);
    expect(logoutUrl.searchParams.get('state')).toBe('previous-session');
    expect(logoutUrl.searchParams.has('client_id')).toBe(true);
    expect(logoutUrl.searchParams.has('response_type')).toBe(false);
    expect(logoutUrl.searchParams.has('scope')).toBe(false);
    expect(logoutUrl.searchParams.has('approval_prompt')).toBe(false);
    expect(logoutUrl.toString()).toContain('post_logout_redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fdemo');
  });

  it('uses the same fixed redirect URI for silent logout', async () => {
    const service = /** @type {import('../ServiceLocal.js').default} */ (serviceFactoryCreate({ mode: 'local', session: 'previous-session', token: { idToken: 'previous-id-token' } }));
    service.url = 'http://localhost:5173/demo/';

    const logoutUrl = new URL(await service.getAccessLogoutSilent());

    expect(logoutUrl.searchParams.get('post_logout_redirect_uri')).toBe('http://localhost:5173/demo');
    expect(logoutUrl.searchParams.get('state')).toBe('previous-session');
    expect(logoutUrl.searchParams.get('id_token_hint')).toBe('previous-id-token');
  });

  it('cleans authentication on the matching logout state callback', async () => {
    location.search = '?state=previous-session';
    const service = /** @type {import('../ServiceLocal.js').default} */ (serviceFactoryCreate({ mode: 'local', authenticated: true, session: 'previous-session', token: { accessToken: 'previous-access' } }));

    expect(await service.resolveAccessStatus()).toBe('logout');
    expect(service.authenticated).toBe(false);
    expect(service.token).toBeNull();
  });

  it('does not treat an unrelated OAuth state as a logout callback', async () => {
    location.search = '?state=unrelated-state';
    const service = serviceFactoryCreate({ mode: 'local', authenticated: true, session: 'previous-session' });

    expect(await service.resolveAccessStatus()).toBe('no-auth');
    expect(service.authenticated).toBe(true);
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