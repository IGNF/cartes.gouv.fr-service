<script setup lang="js">
import { computed } from 'vue';
import { useStore } from 'cartes.gouv.fr-service';
import NotConnected from '../components/NotConnected.vue';

const store = useStore();

const isAuthenticated = computed(() => Boolean(store.connexion?.authenticated));
const profile = computed(() => store.connexion?.user || {});
</script>

<template>
  <section>
    <h2>Profil</h2>

    <NotConnected v-if="!isAuthenticated" />

    <div v-else>
      <dl>
        <dt>Prénom</dt><dd>{{ profile.first_name || '-' }}</dd>
        <dt>Nom</dt><dd>{{ profile.last_name || '-' }}</dd>
        <dt>Identifiant</dt><dd>{{ profile.user_name || '-' }}</dd>
        <dt>Email</dt><dd>{{ profile.email || '-' }}</dd>
        <dt>Créé le</dt><dd>{{ profile.creation || '-' }}</dd>
      </dl>

      <details>
        <summary>Données brutes (store)</summary>
        <pre>{{ profile }}</pre>
      </details>
    </div>
  </section>
</template>

<style scoped>
dl {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.25rem 1rem;
  margin-bottom: 1rem;
}

dt {
  font-weight: 600;
}
</style>
