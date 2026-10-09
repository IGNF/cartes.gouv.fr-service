<script setup lang="js">
import { RouterLink } from 'vue-router';
import { useSession } from '../composables/useSession';

const { service, isAuthenticated, user } = useSession();

const onConnect = async () => {
  location.href = await service.getAccessLogin(); // redirection vers la page sso
};

const onDisconnect = async () => {
  location.href = await service.getAccessLogout(); // redirection vers la page sso
};
</script>

<template>
  <section>
    <h2>Connexion</h2>

    <div v-if="isAuthenticated">
      <p>Bienvenue <strong>{{ user }}</strong> !</p>
      <p>
        Naviguez vers les autres pages (<RouterLink to="/profil">Profil</RouterLink>,
        <RouterLink to="/documents">Documents</RouterLink>, <RouterLink to="/session">Session</RouterLink>) :
        les informations de connexion sont conservées. Rechargez la page ou ouvrez un nouvel onglet :
        elles sont restaurées depuis le store persisté.
      </p>
      <button @click="onDisconnect">Se déconnecter</button>
    </div>

    <div v-else>
      <p>Connectez-vous via le SSO cartes.gouv.fr pour accéder à vos informations.</p>
      <button @click="onConnect">Se connecter</button>
    </div>
  </section>
</template>
