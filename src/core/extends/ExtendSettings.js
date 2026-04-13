/**
 * Paramétrage global du service d'authentification et des URLs applicatives.
 *
 * Les clés restent volontairement "plates" afin de simplifier la configuration
 * et les surcharges partielles selon l'environnement.
 * @typedef {Object} ServiceSettings
 * @property {string} [BaseUrl] URL de base applicative.
 * @property {string} [IamAuthMode] Mode d'authentification IAM (ex: keycloak).
 * @property {boolean|string} [IamCheckSsoDisable] Désactive le contrôle SSO silencieux.
 * @property {boolean|string} [IamCheckSsoAutoAuth] Active la redirection automatique vers /login après détection de session IAM.
 * @property {string} [IamCheckSsoType] Type d'adaptateur utilisé pour le check SSO.
 * @property {number|string} [IamCheckSsoTimeout] Délai (ms) du contrôle SSO silencieux.
 * @property {string} [IamCheckSsoClientId] Client IAM utilisé pour le contrôle SSO.
 * @property {boolean|string} [IamDisable] Désactive complètement la couche IAM.
 * @property {string} [IamUrl] URL du serveur IAM.
 * @property {string} [IamRealm] Realm IAM.
 * @property {string} [IamClientId] Client IAM principal.
 * @property {string} [IamClientSecret] Secret du client IAM.
 * @property {string} [IamEntrepotApiUrl] URL de l'API Entrepôt (mode local/IAM).
 * @property {string} [IamEntrepotApiUrlRemote] URL de l'API Entrepôt en mode distant.
 * @property {string} [IamRedirectRemote] URL de redirection IAM en mode distant.
 */

/**
 * Paramètres globaux actifs.
 * @type {ServiceSettings}
 */
let globalSettings = {
  BaseUrl: '',
  IamAuthMode: 'keycloak',
  IamCheckSsoDisable: true,
  IamCheckSsoAutoAuth: false,
  IamCheckSsoType: 'check-sso',
  IamCheckSsoTimeout: 2000,
  IamCheckSsoClientId: 'cartes-gouv-public',
  IamDisable: false,
  IamUrl: 'https://sso.geopf.fr',
  IamRealm: 'geoplateforme',
  IamClientId: 'cartes-gouv-public',
  IamClientSecret: '',
  IamEntrepotApiUrl: 'https://data.geopf.fr/api'
};

/**
 * Remplace entièrement les paramètres globaux.
 *
 * Note: la fusion est volontairement simple (écrasement total) pour garder
 * un comportement prévisible entre environnements.
 * @param {ServiceSettings} settings Paramètres à appliquer.
 * @returns {void}
 */
export function setSettings(settings) {
  globalSettings = { ...(settings || {}) };
}

/**
 * Retourne une copie défensive des paramètres globaux.
 * @returns {ServiceSettings}
 */
export function getSettings() {
  return { ...globalSettings };
}
