/**
 * Instance Pinia centralisée pour la librairie cartes.gouv.fr-service.
 * Fournit une instance Pinia unique pré-configurée avec:
 * - Les stores de la librairie (useServiceStore)
 * - Le plugin de persistance (pinia-plugin-store)
 * 
 * Usage:
 * - Dans main.js du client: import { pinia } from 'cartes.gouv.fr-service'; app.use(pinia);
 * - Les composables/services utilisent useServiceStore() automatiquement résolu via cette instance
 * - La persistance localStorage est déjà configurée pour le store 'service'
 */

import { createPinia } from 'pinia';
import { storePlugin } from 'pinia-plugin-store';

/**
 * Instance Pinia unique pour la librairie, pré-configurée avec persistance.
 * @type {Object}
 */
const pinia = createPinia();

// Configure la persistance du store 'service' dans localStorage
const storePluginInstance = storePlugin({
  stores: ['service'],
  storage: localStorage,
});
pinia.use(storePluginInstance);

export { pinia };
