/** @typedef {'localStorage' | 'memory'} PersistenceMode */

/** @type {PersistenceMode} */
let mode = 'localStorage';
let initialized = false;

/**
 * Configure la persistance avant toute creation de service ou de store.
 * Le mode memoire supprime les anciennes donnees locales de la librairie.
 * Les donnees OAuth temporaires restent dans sessionStorage.
 * @param {{ mode: PersistenceMode }} options
 * @returns {void}
 */
export function configurePersistence(options) {
  if (initialized) {
    throw new Error('Configure persistence before creating a service or store.');
  }
  if (!options || !['localStorage', 'memory'].includes(options.mode)) {
    throw new Error('Invalid persistence mode: expected "localStorage" or "memory".');
  }
  if (options.mode === 'memory') {
    try {
      const storage = localStorage;
      const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
      for (const key of keys) {
        if (key === 'service' || key === 'codeVerifier' || key === 'oauth2:state' ||
          key === 'oauth2:pkce' || key?.startsWith('oauth2:pkce:')) {
          storage.removeItem(key);
        }
      }
    } catch (error) {
      throw new Error('Unable to clear persisted service data before enabling memory mode.', { cause: error });
    }
  }
  mode = options.mode;
}

/** @returns {boolean} */
export function isPersistenceEnabled() {
  return mode === 'localStorage';
}

/** @returns {void} */
export function lockPersistence() {
  initialized = true;
}
