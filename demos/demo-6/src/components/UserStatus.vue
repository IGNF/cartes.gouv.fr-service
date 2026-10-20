<script setup>
import { computed } from 'vue';
import { useStore } from 'cartes.gouv.fr-service';

const store = useStore();
const isAuthenticated = computed(() => Boolean(store.connexion?.authenticated));
const userName = computed(() => {
  const user = store.connexion?.user || {};
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  return user.user_name || user.email || user.user_identifier || '';
});
</script>

<template>
  <p>
    <span v-if="isAuthenticated">Connecté : <strong>{{ userName }}</strong></span>
    <span v-else>Non connecté</span>
  </p>
</template>
