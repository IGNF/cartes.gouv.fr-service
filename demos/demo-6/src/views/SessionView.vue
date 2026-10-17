<script setup>
import { computed } from 'vue';
import { useStore } from 'cartes.gouv.fr-service';
import NotConnected from '../components/NotConnected.vue';

const store = useStore();
const isAuthenticated = computed(() => Boolean(store.connexion?.authenticated));
const connexion = computed(() => store.connexion || {});
const token = computed(() => connexion.value.token || {});
const formatDate = (timestamp) => timestamp ? new Date(timestamp).toLocaleString('fr-FR') : '-';
</script>

<template>
  <section>
    <h2>Session en mémoire</h2>
    <p>Persistance localStorage désactivée. Les valeurs des jetons ne sont pas affichées.</p>
    <NotConnected v-if="!isAuthenticated" />
    <dl v-else>
      <dt>Authentifié</dt><dd>{{ connexion.authenticated ? 'oui' : 'non' }}</dd>
      <dt>Mode</dt><dd>{{ connexion.mode }}</dd>
      <dt>Session SSO</dt><dd>{{ connexion.session || '-' }}</dd>
      <dt>API</dt><dd>{{ connexion.api || '-' }}</dd>
      <dt>Access token</dt><dd>{{ token.accessToken ? 'présent' : 'absent' }}</dd>
      <dt>Refresh token</dt><dd>{{ token.refreshToken ? 'présent' : 'absent' }}</dd>
      <dt>Expiration</dt><dd>{{ formatDate(token.expiresAt) }}</dd>
    </dl>
  </section>
</template>
