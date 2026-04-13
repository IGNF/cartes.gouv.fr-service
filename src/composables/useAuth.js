import { ref } from 'vue';

import { useServiceStore } from '@/store/ServiceStore';
import { logger } from '@/utils/logger';

import { getSettings } from '@/core/extends/ExtendSettings';

const AUTO_SSO_ATTEMPTED_KEY = 'auth:auto-sso-attempted';

/**
 * Dépendances acceptées par useAuth.
 * @typedef {Object} UseAuthDeps
 * @property {Object} [service] Implémentation du service d'authentification (requise à l'exécution).
 * @property {Object} [store] Instance Pinia optionnelle.
 * @property {Object|null} [router] Instance Vue Router optionnelle.
 * @property {() => void} [onLogin] Callback exécuté lorsqu'un login est détecté.
 * @property {() => void} [onLogout] Callback exécuté lorsqu'un logout est détecté.
 * @property {(error: unknown) => void} [onError] Callback exécuté en cas d'erreur d'authentification.
 */

/**
 * API publique retournée par useAuth.
 * @typedef {Object} UseAuthResult
 * @property {import('vue').Ref<boolean>} isAuthenticated État d'authentification réactif.
 * @property {import('vue').Ref<Object>} user Données utilisateur authentifié en réactif.
 * @property {() => Promise<void>} checkAuthentication Résout et synchronise l'état d'authentification.
 * @property {() => Promise<boolean>} checkSession Exécute la détection de session SSO silencieuse. 
 */

/**
 * Composable d'authentification qui résout le statut, synchronise l'état
 * et peut déclencher un contrôle SSO silencieux.
 * @param {UseAuthDeps} [deps={}] Dépendances et callbacks d'exécution.
 * @returns {UseAuthResult}
 * @example
 * const service = getService({ mode : 'local'});
 * const { isAuthenticated, user, checkAuthentication } = useAuth({
 *   service,
 *   onLogin: () => logger.log('User logged in!'),
 *   onLogout: () => logger.log('User logged out!'),
 *   onError: (e) => logger.error('Auth error:', e)
 * });
 */
export function useAuth(deps = {}) {
  // service
  const service = deps.service;
  // store (optionnel)
  const serviceStore = deps.store ?? useServiceStore();
  // router (optionnel)
  const router = deps.router ?? null;
  // actions (optionnel)
  const onLogin = deps.onLogin ?? (() => {});
  const onLogout = deps.onLogout ?? (() => {});
  const onError = deps.onError ?? ((e) => { logger.error('Authentication error :', e); });

  // le service est requis pour le fonctionnement de ce composable
  if (!service) {
    throw new Error('Missing "service" injection for useAuth().');
  }

  // export
  const isAuthenticated = ref(false);
  const user = ref({});

  /**
   * Remplace l'URL courante avec ou sans query params.
   * Utilise le router injecté lorsqu'il est disponible,
   * sinon bascule sur history.replaceState.
   * @param {{ path?: string, query?: Record<string, string>|undefined }} [target]
   * @returns {Promise<void>}
   */
  const replaceUrl = async (target = {}) => {
    const path = target.path ?? '/';
    const query = target.query;

    if (router) {
      await router.replace({ path, query });
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    url.pathname = path;

    if (!query || Object.keys(query).length === 0) {
      url.search = '';
    } else {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.set(key, String(value));
        }
      });
      url.search = params.toString();
    }

    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(window.history.state, '', nextUrl);
  };

  /**
    * Supprime le marqueur de tentative auto-SSO pour l'onglet courant.
   * @returns {void}
   */
  const cleanAutoSSOAttemptedFlag = () => {
    try {
      sessionStorage.removeItem(AUTO_SSO_ATTEMPTED_KEY);
    } catch (error) {
      logger.warn('Unable to clean auto-SSO flag from sessionStorage.', error);
    }
  };

  /**
    * Marque le contrôle auto-SSO comme déjà tenté pour l'onglet courant.
   * @returns {void}
   */
  const setAutoSSOAttemptedFlag = () => {
    try {
      sessionStorage.setItem(AUTO_SSO_ATTEMPTED_KEY, '1');
    } catch (error) {
      logger.warn('Unable to set auto-SSO flag in sessionStorage.', error);
    }
  };

  /**
    * Indique si l'auto-SSO a déjà été tenté pour l'onglet courant.
   * @returns {boolean}
   */
  const hasAutoSSOBeenAttempted = () => {
    try {
      return sessionStorage.getItem(AUTO_SSO_ATTEMPTED_KEY) === '1';
    } catch (error) {
      logger.warn('Unable to read auto-SSO flag from sessionStorage.', error);
      return false;
    }
  };
  
  /**
   * Exécute la détection de session SSO silencieuse et redirige optionnellement vers /login.
   * Retourne true uniquement lorsqu'une redirection a été déclenchée.
   * @fixme en mode de navigation privée, des exceptions sont levées lors de l'accès au "silent SSO en iframe"
   * car l’accès storage/cookies tiers est bloqué !
   * > requestStorageAccess: Must be handling a user gesture to use.
   * > requestStorageAccess: Permission denied.
   * @returns {Promise<boolean>}
   */
  const checkSession = async () => {
    const settings = getSettings();
    const IAM_CHECK_SSO_DISABLE = settings?.IamCheckSsoDisable;
    const IAM_CHECK_SSO_TYPE = settings?.IamCheckSsoType;
    const IAM_CHECK_SSO_AUTO_AUTH = settings?.IamCheckSsoAutoAuth;

    if (IAM_CHECK_SSO_DISABLE === '1') {
      return false;
    }

    const autoSsoAlreadyAttempted = hasAutoSSOBeenAttempted();

    if (autoSsoAlreadyAttempted) {
      return false;
    }

    let hasKeycloakSession = false;
    try {
      logger.debug('Checking Keycloak session...');
      hasKeycloakSession = await service.checkKeycloakSession(IAM_CHECK_SSO_TYPE);
      logger.debug(`Keycloak session check : ${hasKeycloakSession} !`);
    } catch (error) {
      setAutoSSOAttemptedFlag();
      logger.warn('Keycloak session check failed, disabling auto-SSO retry for this tab session.', error);
      return false;
    }

    if (hasKeycloakSession) {
      setAutoSSOAttemptedFlag();
      logger.debug('Keycloak session detected, redirecting to /login for silent auto-auth.');
      if (IAM_CHECK_SSO_AUTO_AUTH === '1' && router) {
        await router.push({ path: '/login', query: { from: 'auto-sso' } });
        return true;
      }
      return false;
    }

    return false;
  };

  /**
   * Résout le statut d'authentification et synchronise l'état réactif local.
   * @returns {Promise<void>}
   */
  const checkAuthentication = async () => {
    isAuthenticated.value = Boolean(service.authenticated);

    try {
      const status = await service.resolveAccessStatus();

      if (status === 'login' || status === 'logout') {
        logger.debug(`Access validated : ${status} !`);
        serviceStore.setAuthentificateSyncNeeded(false);
        await replaceUrl({ path: '/', query: undefined });
      }

      if (status === 'login') {
        logger.debug('User connected.');
        cleanAutoSSOAttemptedFlag();
        isAuthenticated.value = true;
        user.value = service.getUser();
        onLogin();
        return;
      }

      if (status === 'logout') {
        logger.debug('User disconnected.');
        cleanAutoSSOAttemptedFlag();
        isAuthenticated.value = false;
        user.value = {};
        onLogout();
        return;
      }

      if (service.isAuthenticatedLocally()) {
        logger.debug('User already authenticated locally, checking session validity...');
        const isValid = await service.validateAuthentication();
        logger.debug(`Checking session validity : ${isValid} !`);
        isAuthenticated.value = Boolean(isValid);

        if (!isValid) {
          user.value = {};
        } else {
          user.value = service.getUser();
        }

        if (!isValid && service.authenticated) {
          logger.warn('Inconsistent local session (401 côté IAM/API), redirect to logout.');
          isAuthenticated.value = false;
          if (router) {
            router.push({ path: '/logout', query: { from: 'authInvalid' } });
          }
          return;
        }

        logger.debug('validateAuthentication() finished !');
      } else {
        isAuthenticated.value = false;
        user.value = {};
      }
    } catch (e) {
      logger.warn(e);
      isAuthenticated.value = false;
      user.value = {};
      onError(e);
    } finally {
      logger.debug('resolveAccessStatus() finished !');
    }
  };

  /**
   * Exécute le flux complet d'authentification utilisé au démarrage.
   * 1) Résout le statut d'authentification.
   * 2) Si non authentifié, tente la détection de session SSO silencieuse.
   * @returns {Promise<void>}
   */
  const runAuthenticationFlow = async () => {
    await checkAuthentication();
    if (!isAuthenticated.value) {
      await checkSession();
    }
  };

  runAuthenticationFlow()
  .then(() => {
    logger.debug('Authentication check completed !');
  })
  .catch((e) => {
    logger.error('Authentication check failed :', e);
  });

  return {
    isAuthenticated,
    user,
    checkAuthentication,
    checkSession
  };
}
