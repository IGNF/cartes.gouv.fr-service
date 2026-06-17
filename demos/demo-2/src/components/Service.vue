<script setup lang = "js">

import { getService, useAuth, setSettings, useStore, logger } from 'cartes.gouv.fr-service';
import { onMounted } from 'vue';

const store = useStore();

setSettings({ BaseUrl: import.meta.env.BASE_URL });

let persistedConnexion = null;

if (store.connexion && Object.keys(store.connexion).length) {
  persistedConnexion = store.connexion;
} else {
  try {
    const persistedState = JSON.parse(localStorage.getItem('service') || '{}');
    if (persistedState?.connexion && Object.keys(persistedState.connexion).length) {
      persistedConnexion = persistedState.connexion;
    }
  } catch (error) {
    console.warn('Unable to parse persisted service state from localStorage.', error);
  }
}

const service = getService({ mode: 'local', ...(persistedConnexion || {}) });
store.setService(service);

const {
  isAuthenticated,
  user
} = useAuth({
    service,
    onLogin: () => { logger.info('→ Callback login: utilisateur connecté !'); }, // optionnel
    onLogout: () => { logger.info('→ Callback logout: utilisateur déconnecté !'); }, // optionnel
    onError: (err) => { logger.error('→ Callback erreur:', err); }, // optionnel
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
  logger.info('→ Documents:', docs);
}

onMounted(() => {
  
});

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

<style>
</style>