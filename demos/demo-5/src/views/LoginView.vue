<script setup lang="js">
import { computed, toRaw } from 'vue';
import { RouterLink } from 'vue-router';
import { useStore } from 'cartes.gouv.fr-service';
import UserStatus from '../components/UserStatus.vue';

const store = useStore();

const isAuthenticated = computed(() => Boolean(store.connexion?.authenticated));

// le service est récupéré dans le store au moment de l'appel ;
// toRaw() est requis car le service utilise des champs privés (#)
// inaccessibles à travers le Proxy réactif de Pinia
const getService = () => /** @type {any} */ (toRaw(store.getService()));

const onConnect = async () => {
  location.href = await getService().getAccessLogin(); // redirection vers la page sso
};

const onDisconnect = async () => {
  location.href = await getService().getAccessLogout(); // redirection vers la page sso
};
</script>

<template>
  <section>
    <h2>Connexion</h2>

    <div v-if="isAuthenticated">
      <UserStatus />
      <p>
        Naviguez vers les autres pages (<RouterLink to="/profil">Profil</RouterLink>,
        <RouterLink to="/documents">Documents</RouterLink>, <RouterLink to="/session">Session</RouterLink>) :
        chacune lit les informations de connexion directement dans le store persisté.
      </p>
      <button @click="onDisconnect">Se déconnecter</button>
    </div>

    <div v-else>
      <p>Connectez-vous via le SSO cartes.gouv.fr pour accéder à vos informations.</p>
      <button @click="onConnect">Se connecter</button>
    </div>
  </section>
</template>
