<script setup>
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
      </dl>
      <details>
        <summary>Données du profil en mémoire</summary>
        <pre>{{ profile }}</pre>
      </details>
    </div>
  </section>
</template>
