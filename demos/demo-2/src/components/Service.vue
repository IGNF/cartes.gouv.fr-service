<script setup lang = "js">

import { getService, useAuth, setSettings, useStore, logger } from 'cartes.gouv.fr-service';
import { computed, onMounted } from 'vue';

const store = useStore();

setSettings({ 
  BaseUrl: import.meta.env.BASE_URL,
  IamClientId: import.meta.env.IAM_CLIENT_ID,
  IamClientSecret: import.meta.env.IAM_CLIENT_SECRET
});

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
const documents = computed(() => store.connexion.documents || {});
const profile = computed(() => store.connexion.user || {});

onMounted(() => {
  
});

</script>

<template>
  <div>
    <h1>Playground</h1>
    <p class="status">
      <span v-if="isAuthenticated">🟢 Connecté</span>
      <span v-else>⚪ Non connecté</span>
    </p>
    <div v-if="isAuthenticated">
      <pre>{{ user }}</pre>

      <button @click="onDisconnect">Disconnect</button>
      
      <details>
        <summary>Informations brutes (store)</summary>
        <pre>{{ profile }}</pre>
      </details>

      <details>
        <summary>Documents brutes (store)</summary>
        <pre>{{ documents }}</pre>
      </details>
    </div>

    <div v-else>
      <button @click="onConnect">Connect</button>
    </div>
  </div>
</template>

<style>
</style>