<script setup>
import { computed } from 'vue';
import { useStore } from 'cartes.gouv.fr-service';

const store = useStore();

const isAuthenticated = computed(() => Boolean(store.connexion?.authenticated));
const userName = computed(() => {
  const u = store.connexion?.user || {};
  if (u.first_name && u.last_name) {
    return `${u.first_name} ${u.last_name}`;
  }
  return u.user_name || u.email || u.user_identifier || '';
});
</script>

<template>
  <p class="status">
    <span v-if="isAuthenticated">🟢 Connecté : <strong>{{ userName }}</strong></span>
    <span v-else>⚪ Non connecté</span>
  </p>
</template>
