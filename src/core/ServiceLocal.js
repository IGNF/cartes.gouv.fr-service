import ServiceBase from './ServiceBase.js';
import { encryptValue, decryptValue } from './ServiceEncrypt.js';
import { logger } from '../utils/logger.js';

import { useServiceStore } from '../store/ServiceStore.js';

import { OAuth2Client, OAuth2Fetch } from '@badgateway/oauth2-client';
import { generateCodeVerifier } from '@badgateway/oauth2-client';

const SESSION_EXPIRED_SILENT_LOGOUT_DELAY_MS = 12 * 60 * 60 * 1000;

const OAUTH_PKCE_STORAGE_KEY = "oauth2:pkce";
const OAUTH_STATE_STORAGE_KEY = "oauth2:state";

function buildOAuthState () {
  if (window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * ServiceLocal est une implémentation de ServiceBase qui gère l'authentification 
 * via OAuth2 en mode local.
 * 
 * Il utilise la librairie @badgateway/oauth2-client pour gérer 
 * le flux d'authentification OAuth2 avec PKCE.
 * 
 * Le mode local implique que l'application gère directement le flux 
 * d'authentification avec le serveur IAM (ex. Keycloak) sans passer
 * par une API intermédiaire.
 * @extends ServiceBase
 */
class ServiceLocal extends ServiceBase {

  #client
  #fetchWrapper

  constructor(options) {
    options = options || {};
    super(options);

    /** state session */
    this.session = options.session || "";
    /** code verificated */
    this.codeVerifier = options.codeVerifier || "";
    /** code */
    this.code = options.code || "";
    /** token */
    this.token = options.token || "";
    /** erreurs */
    this.error = options.error || {};
    /** routing: si true, les redirectUri utilisent les routes /login et /logout */
    this.routing = options.routing || false;

    // variables à instancier !
    this.#client = null;
    this.#fetchWrapper = null;

    this.api = this.settings.IamEntrepotApiUrl || null;
    
    this.#initialize(options);
    
    return this;
  }
  
  /**
   * Retourne la redirectUri pour un chemin donné.
   * Si routing est actif, on appende le chemin (ex. /login, /logout).
   * Sinon, on reste sur this.url (baseUrl).
   * @param {string} route - ex. '/login' ou '/logout'
   * @returns {string}
   */
  #redirectUri (route) {
    if (!this.routing) {
      return this.url.replace(/\/$/, '');
    }
    return this.url.replace(/\/$/, '') + route;
  }

  /**
   * Initialisation du client oauth
  */
  #initialize (options) {
    const realm = this.settings.IamRealm;

    var settings = options.client ? options.client.settings : {
      server: `${this.settings.IamUrl}`,
  
      clientId: `${this.settings.IamClientId}`,
      clientSecret: `${this.settings.IamClientSecret}`,
      index: `${realm}`,
  
      tokenEndpoint: `/realms/${realm}/protocol/openid-connect/token`,
      authorizationEndpoint: `/realms/${realm}/protocol/openid-connect/auth`,
      discoveryEndpoint: `/realms/${realm}/.well-known/openid-configuration`,
      revocationEndpoint: `/realms/${realm}/protocol/openid-connect/revoke`
    };
  
    this.#client = new OAuth2Client(settings);

    this.#fetchWrapper = new OAuth2Fetch({
      client: this.#client,
      scheduleRefresh: true,
      getNewToken: async () => {
        // en mode distant, on ne redemande pas de jeton
        if (this.token && Object.keys(this.token).length && this.token.expiresAt > Date.now()) {
          return this.token;
        }
        var token = await this.#client.authorizationCode.getToken({
          code: this.code,
          redirectUri: this.url,
          code_verifier: this.codeVerifier
        });
        return token;
      },
      storeToken: (token) => {
        this.token = token;
      },
      getStoredToken: () => {
        const token = this.#getTokenStorage();
        if (token && Object.keys(token).length) {
          return token;
        }
        return null;
      },
      onError: (e) => {
        logger.error(e);
        this.error = e;
      }
    });

    this.setFetch(this.#fetchWrapper.fetch.bind(this.#fetchWrapper));
  }

  /**
   * Retourne le token d'authentification du localStorage
   * @returns {Object} auth
   * @example
   * {
   *    "authenticator": "authenticator:oauth2",
   *    "access_token": "phwt5hfbfzequdvrl9uaqfblucocgdlm62wqvom6",
   *    "expires_in": 3600,
   *    "token_type": "Bearer",
   *    "scope": "basic",
   *    "refresh_token": "t7vni7a8nptovlbzfl4et15wfmvp9knja0y1fe5v",
   *    "expires_at": 1730393104613
   * }
   */
  #getTokenStorage () {
    var service = JSON.parse(localStorage.getItem("service") || '{}');
    if (service) {
      return service.connexion.token;
    }
    return null;
  }

  /**
   * Verifie la session Keycloak en utilisant (iframe)
   * - soit via la méthode native/oauth2 (spécifique au local)
   * - soit via l'implémentation de ServiceBase (keycloak par défaut)
   * @param {String} adapter - natif | oauth2 | keycloak (par defaut)
   * @returns {Promise<Boolean>} - true if session is active, false otherwise
   */
  async checkKeycloakSession (adapter) {
    if (adapter !== "keycloak") {
      return this.#checkKeycloakSessionAdapterOAuth();
    }

    // Delegate keycloak (et fallback) au comportement par defaut
    // de ServiceBase.
    return super.checkKeycloakSession('keycloak');
  }

  /**
   * Experimental !
   * Adapter utilisant une approche plus "native" pour vérifier la session SSO via OAuth2
   * - Avantages : plus léger, pas besoin de charger la librairie Keycloak
   * - Inconvénients : moins robuste, peut ne pas gérer correctement tous les cas de figure (session expirée, rafraîchissement de token, etc.)
   * @returns 
   */
  async #checkKeycloakSessionAdapterOAuth () {
    const checkSsoClientId = this.settings.IamCheckSsoClientId || this.settings.IamClientId || "";
    const checkSsoTimeout = Number(this.settings.IamCheckSsoTimeout || 5000);

    logger.log("use checkKeycloakSessionAdapter oauth");
    return new Promise(async (resolve) => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';

        // const checkUrl = new URL(this.#client.settings.server + this.#client.settings.authorizationEndpoint);
        // checkUrl.searchParams.set('client_id', checkSsoClientId);
        // checkUrl.searchParams.set('redirect_uri', this.url + '/silent-check-sso-oauth.html');
        // checkUrl.searchParams.set('response_type', 'code');
        // checkUrl.searchParams.set('scope', 'openid');
        // checkUrl.searchParams.set('prompt', 'none');
        // iframe.src = checkUrl.toString();
        
        const checkClient = new OAuth2Client({
          ...this.#client.settings,
          clientId: checkSsoClientId,
        });
        
        const codeVerifier = await generateCodeVerifier();
        const state = buildOAuthState();
        
        // INFO
        // 'prompt=none' is required for silent authentication;
        // it prevents the OAuth2 server from showing any user interaction prompts in the iframe and
        // instead immediately returns an error if the user is not already authenticated.
        const checkUrl = await checkClient.authorizationCode.getAuthorizeUri({
          redirectUri: this.url.replace(/\/$/, '') + '/silent-check-sso-oauth.html',
          state,
          codeVerifier,
          scope: ['openid'],
          extraParams: {
            // En iframe, aucun prompt utilisateur n'est autorise.
            prompt: 'none'
          },
          responseMode: 'query'
        });

        iframe.src = checkUrl;
        document.body.appendChild(iframe);
        
        const timeout = setTimeout(() => {
          cleanup();
          resolve(false); // Timeout = pas de session
        }, checkSsoTimeout);
        
        function cleanup() {
          clearTimeout(timeout);
          window.removeEventListener('message', handleMessage);
          iframe.remove();
        }
        
        function handleMessage(event) {
          if (event.origin !== window.location.origin) return;
          
          cleanup();
          
          if (event.data.code) {
            // Session Keycloak active !
            resolve(true);
          } else {
            // Pas de session
            resolve(false);
          }
        }
        
        window.addEventListener('message', handleMessage);
    });
  }

  async resolveAccessStatus () {
    const emitter = this.getEmitter ? this.getEmitter() : null;
    var store = useServiceStore();

    // si IAM, on récupère les informations dans l'url
    const queryString = location.search;
    const urlParams = new URLSearchParams(queryString);
    // parametres
    var code = urlParams.get('code');
    var session = urlParams.get('session_state');
    var error = urlParams.get('error');

    // INFO
    // on retourne une promise avec le statut 
    // - login
    // - logout
    // - unknow
    var promise = null;

    var status = "no-auth";

    // IAM login local
    if (code && session) {
      this.session = session;
      this.code = code;
      this.authenticated = true;
      status = "login";
      // on demande un token...
      // et, ensuite, on met en place une serie de promise chainées :
      // - getUserMe
      // - getDocuments
      promise = this.getAccessToken()
        .then((token) => {
          if (token) {
            // on execute une autre promise chainée
            // ex. les informations de l'utilisateur !
            // @ts-ignore
            return this.getUserMe()
            .then((user) => {
              if (!user) {
                throw new Error('User profile unavailable from API');
              }
              logger.debug(user);
              if (emitter) {
                emitter.dispatchEvent("service:user:loaded", {
                  bubbles : true,
                  detail : user
                });
              }
              // on execute une autre promise chainée
              // ex. les favoris !
              // @ts-ignore
              return this.getDocuments()
              .then((documents) => {
                if (emitter) {
                  emitter.dispatchEvent("service:documents:loaded", {
                    bubbles : true,
                    detail : documents
                  });
                }
              })
              .catch((e) => {
                throw new Error('Error to get documents (' + e.message + ')');
              }) 
            })
            .catch((e) => {
              throw new Error('Error to get user info (' + e.message + ')');
            })
          }
        })
        .then(() => {
          // on enregistre le statut une fois toutes les données chargées
          store.setService(this);
          return status;
        })
        .catch((e) => {
          throw new Error('Error to get token (' + e.message + ')');
        })
    }
    // IAM logout local
    if (!code && (session !== null || session === this.session)) {
      this.session = null;
      this.code = null;
      this.authenticated = false;
      this.token = null;
      this.user = {};
      this.documents = {};
      this.error = {};
      status = "logout";
      promise = new Promise((resolve) => {
        resolve(status);
      });
    }

    // FIXME on ne traite pas les erreurs !?
    if (error) {
      this.error = {
        name: error,
        message: urlParams.get('error_description')
      };
      promise = new Promise((resolve, reject) => {
        reject(this.error);
      });
    }

    // enregistrement dans le storage du statut de la connexion
    // (uniquement pour les cas logout et no-auth, le login est géré dans la chaîne de promises)
    if (status !== "login") {
      store.setService(this);
    }

    return promise || Promise.resolve(status);
  }

  /** 
   * IAM pour se connecter
   * 
   * @returns {Promise<string>}
   * @see Login
   * @example
   * // requête :
   * https://sso.geopf.fr/realms/geoplateforme/protocol/openid-connect/auth?
   *  scope=openid%20profile%20email&
   *  response_type=code&
   *  approval_prompt=auto&
   *  redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fcartes.gouv.fr-entree-carto/login&
   *  client_id=IAM_CLIENT_ID
   * // réponse avec redirection :
   * http://localhost:5173/cartes.gouv.fr-entree-carto/login?
   *  session_state=968321a6-385e-4058-a17a-571ab08303bd&
   *  iss=https%3A%2F%2Fsso.geopf.fr%2Frealms%2Fgeoplateforme&
   *  code=168e7dd8-ae1f-4f8b-99f7-ae0aac066067.968321a6-385e-4058-a17a-571ab08303bd.3038d336-2dfa-4c2e-954e-090ee781ed7f
   * 
   */
  async getAccessLogin () {
    // INFO
    // Dans le mode auth local
    // La réponse fournit le 'code', 
    // et il doit être utiliser pour obtenir le token 
    // cf. getAccessToken()

    const url = this.#redirectUri('/login');
    const codeVerifier = await generateCodeVerifier();
    const state = buildOAuthState();

    this.codeVerifier = codeVerifier;
    const encryptedState = await encryptValue(state);
    sessionStorage.setItem(`${OAUTH_PKCE_STORAGE_KEY}:${encryptedState}`, codeVerifier);
    sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, encryptedState);
    // Compatibilite avec les anciennes sessions/login en cours.
    localStorage.setItem("codeVerifier", codeVerifier);
    
    var responseIAM = await this.#client.authorizationCode.getAuthorizeUri({
      redirectUri: url,
      state,
      codeVerifier,
      scope: ['openid','profile','email'],
      extraParams: {
        approval_prompt: "auto"
      },
      responseMode: "query"
    });

    return responseIAM;
  }

  /** 
   * IAM pour se deconnecter
   * 
   * @returns {Promise<string>}
   * @see Logout
   * @example
   * // requête :
   * https://sso.geopf.fr/realms/geoplateforme/protocol/openid-connect/logout?
   *  post_logout_redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fcartes.gouv.fr-entree-carto/logout&
   *  scope=profile%20email&
   *  response_type=code&
   *  approval_prompt=auto&
   *  client_id=IAM_CLIENT_ID
   * // réponse avec redirection :
   * http://localhost:5173/cartes.gouv.fr-entree-carto/?
   *  session_state=968321a6-385e-4058-a17a-571ab08303bd
   */
  async getAccessLogout () {
    // INFO
    // La reponse fournit la 'session',
    // et la session doit être identique à celle issue de login

    const url = this.#redirectUri('/logout');

    var responseIAM = `${this.#client.settings.server}/realms/${this.#client.settings.index}/protocol/openid-connect/logout?
      scope=openid%20profile%20email&
      approval_prompt=auto&
      response_type=code&
      post_logout_redirect_uri=${url}?session_state=${this.session}&
      client_id=${this.#client.settings.clientId}`.replace(/ /g, '');

    return Promise.resolve(responseIAM);
  }

  /**
   * IAM pour se deconnecter silencieusement
   * 
   * @returns {Promise<string>}
   * @see Logout
   * @example
   * GET /realms/{realm}/protocol/openid-connect/logout?
   *   id_token_hint=<id_token>
   *   &post_logout_redirect_uri=https://myapp.com/loggedout
   *   &client_id=my-client
   */
  async getAccessLogoutSilent () {
    const url = this.#redirectUri('/logout');

    if (!this.token || !this.token.idToken) {
      return Promise.reject(new Error('No ID token available for silent logout'));
    }
    
    var responseIAM = `${this.#client.settings.server}/realms/${this.#client.settings.index}/protocol/openid-connect/logout?
      id_token_hint=${this.token.idToken}&
      post_logout_redirect_uri=${url}?session_state=${this.session}&
      client_id=${this.#client.settings.clientId}`.replace(/ /g, '');

    return Promise.resolve(responseIAM);
  } 
  
  /** 
   * IAM pour obtenir le token
   * 
   * @returns {Promise<object>}
   * @see resolveAccessStatus
   * @example
   * POST https://sso.geopf.fr/realms/geoplateforme/protocol/openid-connect/token
   * content-type: application/x-www-form-urlencoded
   * data : {
   *   "grant_type": "authorization_code",
   *   "code": "558c7a7d-40f6-4bef-b326-445238e6e594.77d96aef-44c3-42fb-a542-c1d0a521ce29.c24814cd-85a8-4e3c-919f-22664ec080cc",
   *   "redirect_uri": "http://localhost/redirect",
   *   "client_id": "...",
   *   "client_secret": "..."
   * }
   * // réponse :
   * {
   *    "access_token": "...",
   *    "token_type": "Bearer",
   *    "expires_in": 43200,
   *    "session_state": "77d96aef-44c3-42fb-a542-c1d0a521ce29",
   *    ...
   * }
  */
  async getAccessToken () {
    const url = this.#redirectUri('/login');
    const urlParams = new URLSearchParams(location.search);
    const stateFromRedirect = urlParams.get('state');
    const storedState = sessionStorage.getItem(OAUTH_STATE_STORAGE_KEY);
    const storedStateDecrypted = storedState ? await decryptValue(storedState) : null;
    
    if (stateFromRedirect && storedStateDecrypted && stateFromRedirect !== storedStateDecrypted) {
      throw new Error('OAuth state mismatch');
    }

    const expectedState = stateFromRedirect || storedStateDecrypted;
    const codeVerifierFromState = expectedState
      ? sessionStorage.getItem(`${OAUTH_PKCE_STORAGE_KEY}:${expectedState}`)
      : null;
      
    var codeVerifier = this.codeVerifier || codeVerifierFromState || localStorage.getItem("codeVerifier");

    if (!codeVerifier) {
      throw new Error('Missing PKCE code verifier');
    }
    
    var token = await this.#client.authorizationCode.getTokenFromCodeRedirect(
      location,
      {
        redirectUri: url,
        state: expectedState || undefined,
        codeVerifier,
      }
    );
    this.token = token;
  
    const today = new Date(token.expiresAt);
    logger.debug("expires token", today);

    this.#fetchWrapper.token = token; // HACK !?

    if (storedState) {
      sessionStorage.removeItem(`${OAUTH_PKCE_STORAGE_KEY}:${storedState}`);
    }
    sessionStorage.removeItem(OAUTH_STATE_STORAGE_KEY);
    localStorage.removeItem("codeVerifier");

    var store = useServiceStore();
    store.setService(this);

    return this.token;
  }

  /**
   * Not used !
   * Indique si le token est expiré depuis plus de 12h.
   * @description
   * Cette vérification devait être utilisée pour déclencher une déconnexion 
   * silencieuse lorsque le token est expiré depuis plus de 12 heures.
   * Mais, le nouveau workflow de deconnexion ne se base plus sur cette logique...
   * @returns {Boolean}
   */
  isTokenExpiredForMoreThan12h () {
    if (!this.token || !this.token.expiresAt) {
      return true;
    }

    const expiresAt = Number(this.token.expiresAt);

    if (!Number.isFinite(expiresAt)) {
      return false;
    }

    return (Date.now() - expiresAt) >= SESSION_EXPIRED_SILENT_LOGOUT_DELAY_MS;
  }
}

export default ServiceLocal;