# ![image](docs/cartes-gouv-logo.svg) cartes.gouv.fr-service

Bibliotheque de services pour l'authentification et l'acces API (mode local et distant).

## Installation

**TODO**

```bash
npm install cartes.gouv.fr-service
```

## Usage minimal

```js
import { getService, useAuth } from '@cartes.gouv.fr/service';

const service = getService({ mode: 'local' });
const { isAuthenticated, user } = useAuth({ service });
```

## Usage avancé

```js
import { getService, useAuth, setSettings } from '@cartes.gouv.fr/service';
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
    onLogin: () => { console.info('→ Callback login: utilisateur connecté !'); },
    onLogout: () => { console.info('→ Callback logout: utilisateur déconnecté !'); }, 
    onError: (err) => { console.error('→ Callback erreur:', err); }, 
    options: { routing: false }
});

// avec l'options.routing à false, les pages SSO redirige vers la racine du site (base_url), et on n'utilise pas de routes /login ou /logout !
```

## Entrée package: bundle vs sources

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

## Usage dans une page SPA

```js
<script setup>
import { getService, useAuth } from '@cartes.gouv.fr/service';

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

## Exemple (playground)

> Le playground utilise directement les sources dans un env vite / vue3

Lancer l'exemple

```bash
npm run dev
```

## Demo

> La demo utilise le package tgz généré avec `npm pack` dans un env vite / vue3

```bash
cd demo/
npm i
npm run dev
```

## Configuration

Vous pouvez configurer les parametres IAM via `setSettings`:

```js
import { setSettings } from '@cartes.gouv.fr/service';

setSettings({
  BaseUrl: '/demo',
  IamUrl: 'https://sso.geopf.fr',
  IamRealm: 'geoplateforme',
  IamClientId: 'cartes-gouv-public'
});
```

Ou via l'utilisation d'un fichier .env (cf. playground)

```ini
BASE_URL='/demo'
IAM_URL="https://sso.geopf.fr"
IAM_REALM="geoplateforme"
IAM_CLIENT_ID="cartes-gouv-public"
```

```js
import { setSettings } from '@cartes.gouv.fr/service';

setSettings({
  BaseUrl : mport.meta.env.BASE_URL,
  IamUrl : import.meta.env.IAM_URL,
  IamRealm : import.meta.env.IAM_REALM,
  IamClientId : import.meta.env.IAM_CLIENT_ID,
});
```

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
