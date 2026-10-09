<script setup>
import { RouterLink, RouterView } from 'vue-router';
import { getService, useAuth, setSettings, useStore, logger } from 'cartes.gouv.fr-service';
import UserStatus from './components/UserStatus.vue';

// Initialisation unique de l'authentification (traitement du callback SSO, check SSO...).
// Ensuite, pages et composants lisent directement le store : aucune ref n'est propagée.
setSettings({
  BaseUrl: import.meta.env.BASE_URL,
  IamCheckSsoDisable: import.meta.env.IAM_CHECK_SSO_DISABLE,
  IamCheckSsoAutoAuth: import.meta.env.IAM_CHECK_SSO_AUTO_AUTH,
  IamCheckSsoType: import.meta.env.IAM_CHECK_SSO_TYPE,
  IamCheckSsoTimeout: import.meta.env.IAM_CHECK_SSO_TIMEOUT,
  IamCheckSsoClientId: import.meta.env.IAM_CHECK_SSO_CLIENT_ID,
  IamDisable: import.meta.env.IAM_DISABLE,
  IamAuthMode: import.meta.env.IAM_AUTH_MODE,
  IamUrl: import.meta.env.IAM_URL,
  IamRealm: import.meta.env.IAM_REALM,
  IamClientId: import.meta.env.IAM_CLIENT_ID,
  IamEntrepotApiUrl: import.meta.env.IAM_ENTREPOT_API_URL
});

const store = useStore();

// le store est réhydraté depuis le localStorage par pinia-plugin-store
const persisted = store.connexion && Object.keys(store.connexion).length ? { ...store.connexion } : {};
const service = getService({ mode: 'local', ...persisted });
store.setService(service);

useAuth({
  service,
  onLogin: () => { logger.info('→ Callback login: utilisateur connecté !'); },
  onLogout: () => { logger.info('→ Callback logout: utilisateur déconnecté !'); },
  onError: (err) => { logger.error('→ Callback erreur:', err); },
  options: { routing: false }
});
</script>

<template>
  <header>
    <img alt="logo" class="logo" src="./assets/logo.svg" width="64" height="64" />
    <div>
      <h1>Demo 5 - Connexion via le store</h1>
      <UserStatus />
      <nav>
        <RouterLink to="/">Connexion</RouterLink>
        <RouterLink to="/profil">Profil</RouterLink>
        <RouterLink to="/documents">Documents</RouterLink>
        <RouterLink to="/session">Session</RouterLink>
      </nav>
    </div>
  </header>

  <main>
    <RouterView />
  </main>
</template>

<style scoped>
header {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

h1 {
  font-size: 1.5rem;
  font-weight: 500;
}

nav {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
  font-weight: 600;
}
</style>
