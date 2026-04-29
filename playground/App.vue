<script setup>
import { getService, useAuth, setSettings } from '@/index.js'
import { useLogger } from 'vue-logger-plugin';
import { onMounted } from 'vue';

// Instance du logger
const log = useLogger();

// Optionnel: Désactiver le logger
log.apply({ enabled: true });

// Optionnel: Masquer les logs debug/info (garder seulement warn/error)
log.apply({ level: 'debug' });

// Si on souhaite un router après authentification, 
// il faut injecter le router dans useAuth (voir src/composables/useAuth.js)
// import { useRouter } from 'vue-router';
// const router = useRouter();

/**
 * Exemples disponibles dans ce playground :
 * - [x] minimal        : service local + useAuth({ service })
 * - [x] with-settings  : injecte setSettings() avec des variables d'environnement pour configurer le service et useAuth
 * - [ ] with-router    : injecte un router dans useAuth pour redirection après auth
 * - [x] with-callbacks : utilise des callbacks dans useAuth pour gérer les événements d'authentification
 * - [x] with-logger    : utilise le logger pour afficher les événements d'authentification et les erreurs
 * - [x] with-docs      : ajoute un bouton pour récupérer les documents de l'entrepôt après authentification (service.getDocuments())
 * - [ ] with-remote    : utilise un service en mode 'remote' pour se connecter à un serveur d'authentification distant (ex: Keycloak) et récupérer les documents de l'entrepôt distant
 */
const PLAYGROUND_EXAMPLE = import.meta.env.VITE_PLAYGROUND_EXAMPLE || 'minimal';

// Les paramètres d'authentification peuvent être injectés à la volée,
// ou via des variables d'environnement (voir playground/.env)
if (PLAYGROUND_EXAMPLE === 'with-settings') {
  setSettings({
    IamCheckSsoDisable : import.meta.env.IAM_CHECK_SSO_DISABLE,
    IamCheckSsoAutoAuth : import.meta.env.IAM_CHECK_SSO_AUTO_AUTH,
    IamCheckSsoType : import.meta.env.IAM_CHECK_SSO_TYPE,
    IamCheckSsoTimeout : import.meta.env.IAM_CHECK_SSO_TIMEOUT,
    IamCheckSsoClientId : import.meta.env.IAM_CHECK_SSO_CLIENT_ID,
    IamDisable : import.meta.env.IAM_DISABLE,
    IamAuthMode : import.meta.env.IAM_AUTH_MODE,
    IamUrl : import.meta.env.IAM_URL,
    IamRealm : import.meta.env.IAM_REALM,
    IamClientId : import.meta.env.IAM_CLIENT_ID,
    IamClientSecret : import.meta.env.IAM_CLIENT_SECRET,
    IamEntrepotApiUrl : import.meta.env.IAM_ENTREPOT_API_URL,
    IamRedirectRemote : import.meta.env.IAM_REDIRECT_REMOTE,
    IamEntrepotApiUrlRemote : import.meta.env.IAM_ENTREPOT_API_URL_REMOTE
  });
}

const service = /** @type {any} */ (getService({ mode :'local' }));

const {
  isAuthenticated,
  user
} = useAuth({
    service,
    onLogin: () => { console.info('→ Callback login: utilisateur connecté !'); }, // optionnel
    onLogout: () => { console.info('→ Callback logout: utilisateur déconnecté !'); }, // optionnel
    onError: (err) => { console.error('→ Callback erreur:', err); }, // optionnel
    options: { routing: false } // optionnel
});

const onConnect = () => {
  service.getAccessLogin()
  .then((/** @type {any} */ url) => {
    location.href = url; // redirection vers la page sso
  });
}
const onDisconnect = () => {
  service.getAccessLogout()
  .then((/** @type {any} */ url) => {
    location.href = url; // redirection vers la page sso
  });
}
const onDocs = async () => {
  const docs = await service.getDocuments();
  console.log("→ Documents:", docs);
}

onMounted(async () => {});

</script>

<template>
  <div>
    <h1>Playground</h1>

    <div v-if="isAuthenticated">
      <pre>{{ user }}</pre>

      <button @click="onDisconnect">Disconnect</button>
      <button @click="onDocs">Get Documents (console)</button>
    </div>

    <div v-else>
      <button @click="onConnect">Connect</button>
    </div>
  </div>
</template>