import ServiceBase from "./ServiceBase";
import { logger } from '../utils/logger.js';

import { useServiceStore } from '../store/ServiceStore.js';

class ServiceRemote extends ServiceBase {

  constructor(options) {
    options = options || {};
    super(options);

    this.api = this.settings.IamEntrepotApiUrlRemote || null;
    this.setFetch(window.fetch);

    return this;
  }

  async resolveAccessStatus () {
    const emitter = this.getEmitter ? this.getEmitter() : null;
    var store = useServiceStore();

    const bLogin = location.href.includes("login");
    logger.debug("route login ?", bLogin, location.href);

    // si IAM, on récupère les informations dans l'url
    const queryString = location.search;
    const urlParams = new URLSearchParams(queryString);
    // parametres
    var auth_failed = urlParams.get('authentication_failed'); // utilisé ?
    var auth_success = urlParams.get('success');

    var promise = null;
    var status = "no-auth";

    // IAM login distant
    if (bLogin && auth_success !== null) {
      if (parseInt(auth_success, 10)) {
        this.authenticated = true;
        status = "login";
        try {
          // @ts-ignore
          const user = await this.getUserMe();
          if (!user) {
            throw new Error('User profile unavailable from API');
          }
          logger.debug(user);
          if (emitter) {
            emitter.dispatchEvent("service:user:loaded", {
              bubbles: true,
              detail: user
            });
          }

          
          // @ts-ignore
          const documents = await this.getDocuments();
          if (emitter) {
            emitter.dispatchEvent("service:documents:loaded", {
              bubbles: true,
              detail: documents
            });
          }

          promise = Promise.resolve(status);
        } catch (e) {
          logger.error('Error:', e);
          const message = e instanceof Error ? e.message : String(e);
          promise = Promise.reject('Error to get user info or documents (' + message + ')');
        };
      } else {
        promise = Promise.reject("Erreur inattendue !");
      }
    }

    // IAM logout
    if (!bLogin && auth_success !== null) {
      this.authenticated = false;
      this.user = {};
      this.documents = {};
      this.error = {};
      status = "logout";
      promise = Promise.resolve(status);
    }
    
    if (auth_failed !== null) {
      promise = Promise.reject("Erreur inattendue !");
    }
    
    // enregistrement dans le storage du statut de la connexion
    store.setService(this);
    return promise || Promise.resolve(status);
  }

  async getAccessLogin() {
    return `${this.settings.IamRedirectRemote}/login?app=entree-carto`;
  }

  async getAccessLogout() {
    return `${this.settings.IamRedirectRemote}/logout?app=entree-carto`;
  }

  async getAccessToken() {
    // Implémentation de la méthode getAccessToken si nécessaire
  }
}

export default ServiceRemote;
