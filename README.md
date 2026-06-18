# ![image](docs/cartes-gouv-logo.svg) cartes.gouv.fr-service

Bibliotheque de services pour l'authentification et l'acces API (mode local et distant).

## Installation

**TODO**

```bash
npm install cartes.gouv.fr-service
```

## Quick Start (5 minutes)

### 1) Configurer les variables IAM (.env)

```ini
BASE_URL='/'
IAM_URL='https://sso.geopf.fr'
IAM_REALM='geoplateforme'
IAM_CLIENT_ID='cartes-gouv-public'
```

### 2) Brancher Pinia dans `main.js`

```js
import { createApp } from 'vue';
import App from './App.vue';
import { pinia } from 'cartes.gouv.fr-service';

createApp(App)
  .use(pinia)
  .mount('#app');
```

### 3) Initialiser le service et `useAuth`

```js
<script setup>
import { getService, setSettings, useAuth } from 'cartes.gouv.fr-service';

setSettings({
  BaseUrl: import.meta.env.BASE_URL,
  IamUrl: import.meta.env.IAM_URL,
  IamRealm: import.meta.env.IAM_REALM,
  IamClientId: import.meta.env.IAM_CLIENT_ID,
});

const service = getService({ mode: 'local' });
const { isAuthenticated, user } = useAuth({ service, options: { routing: false } });

const login = async () => {
  const url = await service.getAccessLogin();
  location.href = url;
};

const logout = async () => {
  const url = await service.getAccessLogout();
  location.href = url;
};
</script>
```

### 4) Afficher l'etat de connexion

```vue
<template>
  <div v-if="isAuthenticated">
    <pre>{{ user }}</pre>
    <button @click="logout">Se deconnecter</button>
  </div>
  <div v-else>
    <button @click="login">Se connecter</button>
  </div>
</template>
```

### 5) Lancer l'application

```bash
npm run dev
```

Si vous utilisez Vite avec des variables non prefixees par `VITE_`, autorisez le prefixe `IAM_` dans `vite.config.js` via `envPrefix`.

## Usage

Au préalable, il faut mettre en place un store avec une persistance.
Dans le fichier `main`, on ajoute :

```js
import { createPinia } from 'pinia'
import { storePlugin } from 'pinia-plugin-store'

const pinia = createPinia()
const store = storePlugin({
  stores: ['service'],
  storage: localStorage,
})
pinia.use(store)
...
app.use(pinia)
```

ou une version simplifiée et embarquée :

```js
import { pinia } from 'cartes.gouv.fr-service';
...
app.use(pinia)
```

### Usage minimal

```js
import { getService, useAuth } from 'cartes.gouv.fr-service';

const service = getService({ mode: 'local' });
const { isAuthenticated, user } = useAuth({ service });
```

### Usage avancé

```js
import { getService, useAuth, setSettings, logger } from 'cartes.gouv.fr-service';
import { useRouter } from 'vue-router';

// on utilise le router client
const router = useRouter();

// utilisation du fichier .env
setSettings({ BaseUrl: import.meta.env.BASE_URL });

const {
  isAuthenticated,
  user
} = useAuth({
    service,
    router,
  onLogin: () => { logger.info('→ Callback login: utilisateur connecté !'); },
  onLogout: () => { logger.info('→ Callback logout: utilisateur déconnecté !'); }, 
  onError: (err) => { logger.error('→ Callback erreur:', err); }, 
    options: { routing: false }
});

// avec l'options.routing à false, les pages SSO redirige vers la racine du site (base_url), et on n'utilise pas de routes /login ou /logout !
```

### Usage dans une page SPA

```js
<script setup>
import { getService, useAuth } from 'cartes.gouv.fr-service';

const service = getService({ mode: 'local' });
const { isAuthenticated, user } = useAuth({ service });

const onConnect = () => {
  service.getAccessLogin()
  .then((url) => {
    location.href = url; // redirection vers la page sso
  });
}
const onDisconnect = () => {
  service.getAccessLogout()
  .then((url) => {
    location.href = url; // redirection vers la page sso
  });
}
</script>

<template>
    <div v-if="isAuthenticated">
      <pre>{{ user }}</pre>
      <button @click="onDisconnect">Disconnect</button>
    </div>
    <div v-else>
      <button @click="onConnect">Connect</button>
    </div>
</template>
```

## Package: bundle vs sources

Par defaut, l'import racine utilise le bundle publie dans `dist/`:

```js
import { getService } from 'cartes.gouv.fr-service';
```

Si vous voulez explicitement consommer les sources (par exemple pour deboguer ou laisser la webapp rebundler le code), utilisez un sous-chemin `src`:

```js
import { getService } from 'cartes.gouv.fr-service/src/index.js';
```

Sous Vue / Vite, on configure l'utilisation des sources dans `vite.config.js` :

```js
resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'cartes.gouv.fr-service': fileURLToPath(new URL('./node_modules/cartes.gouv.fr-service/src/index.js', import.meta.url))
    }
  }
```

## Exemple (playground)

> Le playground utilise directement les sources dans un env vite / vue3

Lancer l'exemple

```bash
npm run dev
```

## Demo

> La demo utilise le package tgz généré avec `npm pack` dans un env vite / vue3

```bash
cd demo/demo-1/
npm run update
npm run dev
```

Fonctionnalités des demos :

* demo-1 :
  exemple minimaliste où l'utilisateur met en place son propre store

* demo-2 :
  exemple avancé où on utilise le store / logger interne et, on met en place un exemple d'implementation de la persistance de la connexion

* demo-3 :
  exemple avancé avec l'utilisation de la session keycloak pour une reconnexion auto si une session existe

## Configuration

Vous pouvez configurer les parametres IAM via `setSettings`:

```js
import { setSettings } from 'cartes.gouv.fr-service';

setSettings({
  BaseUrl: '/demo',
  IamUrl: 'https://sso.geopf.fr',
  IamRealm: 'geoplateforme',
  IamClientId: 'cartes-gouv-public'
});
```

Ou via l'utilisation d'un fichier .env

```ini
BASE_URL='/demo'
IAM_URL="https://sso.geopf.fr"
IAM_REALM="geoplateforme"
IAM_CLIENT_ID="cartes-gouv-public"
```

```js
import { setSettings } from 'cartes.gouv.fr-service';

setSettings({
  BaseUrl : import.meta.env.BASE_URL,
  IamUrl : import.meta.env.IAM_URL,
  IamRealm : import.meta.env.IAM_REALM,
  IamClientId : import.meta.env.IAM_CLIENT_ID,
});
```

**NOTE:**
> Il faut autoriser Vite à lire des variables d'environnements avec un prefixe `IAM`
> Dans `vite.config.js`, ajouter :
> `envPrefix: ["VITE_", "IAM_"]`
> Puis, pour utiliser un fichier d'environnement comme  `.env.development-local`, ajouter le mode :
> `vite --mode development-local`

## Tests

> Fonctionnement des classes pour etendre les fonctionnalités du service

Lancer les test

```bash
npm run test
```

## Contenu du package npm

Le tarball genere par `npm pack` inclut notamment:

- `dist/`
- `docs/`
- `src/`
- `README.md`
- `package.json`

## Diagrammes de Séquences - Authentification

cf. [docs/authentication-sequence.md](docs/authentication-sequence.md)

## Documentation interne

- Fonctionnement interne + guide d'implementation utilisateur: [docs/internal-architecture.md](docs/internal-architecture.md)
