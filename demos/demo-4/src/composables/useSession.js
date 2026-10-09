import { getService, useAuth, setSettings, useStore, logger } from 'cartes.gouv.fr-service';

/**
 * État d'authentification partagé par toute l'application.
 * useAuth() n'est appelé qu'une seule fois (au premier appel, depuis App.vue) :
 * les pages réutilisent la même instance de service et les mêmes refs réactives.
 * @type {{ service: any, store: any, isAuthenticated: import('vue').Ref<boolean>, user: import('vue').Ref<any> } | null}
 */
let session = null;

/**
 * Restaure la connexion persistée (localStorage) par pinia-plugin-store.
 * @param {any} store
 * @returns {Object|null}
 */
const getPersistedConnexion = (store) => {
  if (store.connexion && Object.keys(store.connexion).length) {
    return store.connexion;
  }
  try {
    const persistedState = JSON.parse(localStorage.getItem('service') || '{}');
    if (persistedState?.connexion && Object.keys(persistedState.connexion).length) {
      return persistedState.connexion;
    }
  } catch (error) {
    logger.warn('Unable to parse persisted service state from localStorage.', error);
  }
  return null;
};

export function useSession () {
  if (session) {
    return session;
  }

  setSettings({
    BaseUrl: import.meta.env.BASE_URL,
    IamCheckSsoDisable: import.meta.env.IAM_CHECK_SSO_DISABLE,
    IamCheckSsoAutoAuth: import.meta.env.IAM_CHECK_SSO_AUTO_AUTH,
    IamCheckSsoType: import.meta.env.IAM_CHECK_SSO_TYPE,
    IamCheckSsoTimeout: import.meta.env.IAM_CHECK_SSO_TIMEOUT,
    IamCheckSsoClientId: import.meta.env.IAM_CHECK_SSO_CLIENT_ID,
    IamDisable: import.meta.env.IAM_DISABLE,
    IamAuthMode: import.meta.env.IAM_AUTH_MODE,
    IamUrl: import.meta.env.IAM_URL,
    IamRealm: import.meta.env.IAM_REALM,
    IamClientId: import.meta.env.IAM_CLIENT_ID,
    IamEntrepotApiUrl: import.meta.env.IAM_ENTREPOT_API_URL
  });

  const store = useStore();
  const persistedConnexion = getPersistedConnexion(store);

  const service = /** @type {any} */ (getService({ mode: 'local', ...(persistedConnexion || {}) }));
  store.setService(service);

  const { isAuthenticated, user } = useAuth({
    service,
    onLogin: () => { logger.info('→ Callback login: utilisateur connecté !'); },
    onLogout: () => { logger.info('→ Callback logout: utilisateur déconnecté !'); },
    onError: (err) => { logger.error('→ Callback erreur:', err); },
    // le callback OAuth revient sur la racine de l'application
    options: { routing: false }
  });

  session = { service, store, isAuthenticated, user };
  return session;
}
