<script setup>
import { RouterLink, RouterView } from 'vue-router';
import { getService, useAuth, setSettings, useStore, logger } from 'cartes.gouv.fr-service';
import UserStatus from './components/UserStatus.vue';

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
const service = getService({ mode: 'local' });
store.setService(service);

useAuth({
  service,
  onLogin: () => { logger.info('Utilisateur connecté en mode mémoire.'); },
  onLogout: () => { logger.info('Utilisateur déconnecté.'); },
  onError: (error) => { logger.error('Erreur d’authentification :', error); },
  options: { routing: false }
});
</script>

<template>
  <header>
    <h1>Demo 6 - Connexion en mémoire</h1>
    <UserStatus />
    <nav aria-label="Navigation principale">
      <RouterLink to="/">
        Connexion
      </RouterLink>
      <RouterLink to="/profil">
        Profil
      </RouterLink>
      <RouterLink to="/documents">
        Documents
      </RouterLink>
      <RouterLink to="/session">
        Session
      </RouterLink>
    </nav>
  </header>
  <aside class="notice">
    <strong>Mode mémoire : aucune persistance dans localStorage.</strong>
    La connexion, le profil et les documents sont perdus au rechargement.
    Seules les données temporaires OAuth restent en sessionStorage pendant la connexion SSO.
  </aside>
  <main>
    <RouterView />
  </main>
</template>
