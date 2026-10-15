<script setup lang = "js">

import { getService, useAuth, setSettings } from 'cartes.gouv.fr-service';
import { useLogger } from 'vue-logger-plugin';
import { onMounted, ref } from 'vue';

// Instance du logger
const log = useLogger();

// Optionnel: Désactiver le logger
log.apply({ enabled: true });

// Optionnel: Masquer les logs debug/info (garder seulement warn/error)
log.apply({ level: 'debug' });

setSettings({ 
  BaseUrl: import.meta.env.BASE_URL,
  IamClientId: import.meta.env.IAM_CLIENT_ID,
  IamClientSecret: import.meta.env.IAM_CLIENT_SECRET
});

const service = /** @type {any} */ (getService({ mode :'local' }));

const {
  isAuthenticated,
  user
} = useAuth({
    service,
    onLogin: () => { log.info('→ Callback login: utilisateur connecté !'); }, // optionnel
    onLogout: () => { log.info('→ Callback logout: utilisateur déconnecté !'); }, // optionnel
    onError: (err) => { log.error('→ Callback erreur:', err); }, // optionnel
    options: { routing: false } // optionnel
});

const onConnect = () => {
  service.getAccessLogin()
  .then((/** @type {any} */ url) => {
    location.href = url; // redirection vers la page sso
  });
}
const onDisconnect = () => {
  // document.getElementById('documents-details').classList.add('hidden');
  service.getAccessLogout()
  .then((/** @type {any} */ url) => {
    location.href = url; // redirection vers la page sso
  });
}

const documents = ref({});
const onDocs = async () => {
  const docs = await service.getDocuments();
  log.info("→ Documents:", docs);
  document.getElementById('documents-details').classList.remove('hidden');
  documents.value = docs;
}

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
      <button @click="onDocs">Get Documents</button>

      <details id="documents-details" class="hidden">
        <summary>Documents brutes (store)</summary>
        <pre>{{ documents }}</pre>
      </details>
    </div>

    <div v-else>
      <button @click="onConnect">Connect</button>
    </div>
  </div>
</template>

<style scoped>
  .hidden {
    display: none;
  }
</style>