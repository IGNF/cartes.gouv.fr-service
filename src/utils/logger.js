/**
 * Logger centralisé utilisant vue-logger-plugin.
 * Fournit une instance configurée de vue-logger-plugin réutilisable dans tous les fichiers.
 * 
 * Usage:
 * - Dans les composables Vue: importer { logger } et utiliser logger.debug(), logger.warn(), etc
 * - Installer dans main.js: createApp(App).use(logger)
 * - Optionnellement dans les composables: utiliser useLogger() du plugin pour la version injectable
 */

import { createLogger } from 'vue-logger-plugin';

/**
 * Instance du logger configurée.
 * @type {Object}
 */
const logger = createLogger({
  enabled: true,
  level: 'debug',
  callerInfo: false,
  consoleEnabled: true
});

export { logger, createLogger };
