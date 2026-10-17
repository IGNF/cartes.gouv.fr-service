<script setup>
import { computed, ref, toRaw } from 'vue';
import { useStore, logger } from 'cartes.gouv.fr-service';
import UserStatus from '../components/UserStatus.vue';

const store = useStore();
const isAuthenticated = computed(() => Boolean(store.connexion?.authenticated));
const error = ref('');
const pending = ref(false);

const redirect = async (login) => {
  error.value = '';
  pending.value = true;
  try {
    // Les champs prives du service ne sont pas accessibles via le Proxy Pinia.
    const service = toRaw(store.getService());
    location.href = await (login ? service.getAccessLogin() : service.getAccessLogout());
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
    logger.error('Redirection SSO impossible :', cause);
  } finally {
    pending.value = false;
  }
};
</script>

<template>
  <section>
    <h2>Connexion</h2>
    <UserStatus />
    <p v-if="isAuthenticated">
      Naviguez vers le profil, les documents ou la session : ces pages partagent le store en mémoire.
    </p>
    <p v-else>
      Connectez-vous via le SSO cartes.gouv.fr pour accéder à vos informations.
    </p>
    <button
      v-if="isAuthenticated"
      :disabled="pending"
      @click="redirect(false)"
    >
      Se déconnecter
    </button>
    <button
      v-else
      :disabled="pending"
      @click="redirect(true)"
    >
      Se connecter
    </button>
    <p
      v-if="error"
      role="alert"
      class="error"
    >
      {{ error }}
    </p>
  </section>
</template>
