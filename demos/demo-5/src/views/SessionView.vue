<script setup lang="js">
import { computed } from 'vue';
import { useStore } from 'cartes.gouv.fr-service';
import NotConnected from '../components/NotConnected.vue';

const store = useStore();

const isAuthenticated = computed(() => Boolean(store.connexion?.authenticated));

const connexion = computed(() => store.connexion || {});
const token = computed(() => connexion.value.token || {});

const formatDate = (/** @type {number|undefined} */ ts) => (ts ? new Date(ts).toLocaleString('fr-FR') : '-');
</script>

<template>
  <section>
    <h2>Session</h2>

    <NotConnected v-if="!isAuthenticated" />

    <div v-else>
      <p>Informations de connexion persistées (les jetons ne sont volontairement pas affichés).</p>
      <dl>
        <dt>Authentifié</dt><dd>{{ connexion.authenticated ? 'oui' : 'non' }}</dd>
        <dt>Mode</dt><dd>{{ connexion.mode }}</dd>
        <dt>Session SSO</dt><dd>{{ connexion.session || '-' }}</dd>
        <dt>API</dt><dd>{{ connexion.api || '-' }}</dd>
        <dt>Access token</dt><dd>{{ token.accessToken ? 'présent' : 'absent' }}</dd>
        <dt>Refresh token</dt><dd>{{ token.refreshToken ? 'présent' : 'absent' }}</dd>
        <dt>Expiration</dt><dd>{{ formatDate(token.expiresAt) }}</dd>
      </dl>
    </div>
  </section>
</template>

<style scoped>
dl {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.25rem 1rem;
}

dt {
  font-weight: 600;
}
</style>
