import {
  defineStore
} from 'pinia';

import { serviceFactoryCreate } from '@/core/ServiceFactory';

/**
 * État interne du store service.
 * @typedef {Object} ServiceStoreState
 * @property {Object} connexion Instance de service courante (normalisée via serviceFactoryCreate).
 * @property {boolean} authentificateSyncNeeded Indique si une synchronisation d'authentification est requise.
 * @example
 * service: {
 *   connexion: { 
 *    api: "https://data.geopf.fr/api",
 *    authenticated: true,
 *    code: "190dfa44-14f5-4284-b492-01b4ce918c33.726b9d84-9ebf-4c2e-9fb1-a998bec87be7.c1a6b58f-b93e-45d1-9108-001ddb59ac12",
 *    codeVerifier: "",
 *    mode: "remote",
 *    settings: { ... },
 *    session: "726b9d84-9ebf-4c2e-9fb1-a998bec87be7",
 *    user: { ... },
 *    documents: { ... },
 *    error: { ... },
 *    token: { ... },
 *    url: "http://localhost:5173/"
 *   },
 *   authentificateSyncNeeded: false
 * }
 */

/**
 * Store Pinia centralisant l'instance de service et l'état de synchronisation
 * d'authentification côté client.
 */
export const useServiceStore = defineStore({
  id: 'service',
  /** @returns {ServiceStoreState} */
  state: () => ({
    connexion: {},
    authentificateSyncNeeded: false
  }),
  getters: {
    /**
     * Retourne l'indicateur de synchronisation d'authentification.
     * @param {ServiceStoreState} state
     * @returns {boolean}
     */
    isAuthentificateSyncNeeded: (state) => state.authentificateSyncNeeded
  },
  actions: {
    /**
     * Retourne l'instance de service stockée.
     * @returns {Object}
     */
    getService () {
      return this.connexion;
    },

    /**
     * Définit l'instance de service en la normalisant via la factory.
     * @param {Object} s Paramètres/instance source du service.
     * @returns {void}
     */
    setService (s) {
      this.connexion = serviceFactoryCreate(s);
    },

    /**
     * Définit l'indicateur de synchronisation d'authentification.
     * @param {boolean} b Valeur souhaitée (coercée en booléen).
     * @returns {void}
     */
    setAuthentificateSyncNeeded (b) {
      const value = Boolean(b);
      this.authentificateSyncNeeded = value;
    },

    /**
     * Retourne l'indicateur brut de synchronisation d'authentification.
     * @returns {boolean}
     */
    getAuthentificateSyncNeeded () {
      return this.authentificateSyncNeeded;
    }
  }
});