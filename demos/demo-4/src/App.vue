<script setup>
import { RouterLink, RouterView } from 'vue-router';
import { useSession } from './composables/useSession';

// initialise l'authentification une seule fois pour toute l'application
const { isAuthenticated, user } = useSession();
</script>

<template>
  <header>
    <img alt="logo" class="logo" src="./assets/logo.svg" width="64" height="64" />
    <div>
      <h1>Demo 4 - Persistance de la connexion</h1>
      <p class="status">
        <span v-if="isAuthenticated">🟢 Connecté : <strong>{{ user }}</strong></span>
        <span v-else>⚪ Non connecté</span>
      </p>
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
