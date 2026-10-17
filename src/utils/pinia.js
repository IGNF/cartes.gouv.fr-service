/**
 * Instance Pinia centralisée pour la librairie cartes.gouv.fr-service.
 * Fournit une instance Pinia unique pré-configurée avec:
 * - Les stores de la librairie (useServiceStore)
 * - Le plugin de persistance optionnel (pinia-plugin-store)
 * 
 * Usage:
 * - Dans main.js du client: import { pinia } from 'cartes.gouv.fr-service'; app.use(pinia);
 * - Les composables/services utilisent useServiceStore() automatiquement résolu via cette instance
 * - La persistance localStorage est active par defaut pour le store 'service'
 * - configurePersistence({ mode: 'memory' }) la desactive avant le premier usage
 */

import { createPinia } from 'pinia';
import { storePlugin } from 'pinia-plugin-store';
import { isPersistenceEnabled, lockPersistence } from './persistence.js';

/**
 * Instance Pinia unique pour la librairie, avec persistance configurable.
 * @type {import('pinia').Pinia}
 */
const pinia = createPinia();

pinia.use((context) => {
  if (context.store.$id === 'service') {
    lockPersistence();
    if (isPersistenceEnabled()) {
      storePlugin({ stores: ['service'], storage: localStorage })(context);
    }
  }
});

export { pinia };
