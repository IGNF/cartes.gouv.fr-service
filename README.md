# ![image](docs/cartes-gouv-logo.svg) cartes.gouv.fr-service

Bibliotheque de services pour l'authentification et l'acces API (mode local et distant).

## 📦 Installation

**TODO**

```bash
npm install cartes.gouv.fr-service
```

## ⚡ Quick Start (5 minutes)

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

## 🧩 Usage

Au préalable, il faut mettre en place un store Pinia. La persistance dans
localStorage est active par défaut, mais peut être désactivée.
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

### Conserver la connexion et les documents uniquement en mémoire

Configurez le mode avant de créer un service ou un store, par exemple dans
`main.js`, avant `app.use(pinia)` :

```js
import { createApp } from 'vue';
import App from './App.vue';
import { configurePersistence, pinia } from 'cartes.gouv.fr-service';

configurePersistence({ mode: 'memory' });

createApp(App)
  .use(pinia)
  .mount('#app');
```

Cette option est globale et s'applique aux modes d'authentification `local` et
`remote`. Le store reste réactif, mais la connexion, les jetons, le profil et
les documents ne sont plus sérialisés dans localStorage.

- L'activation supprime les anciennes clés localStorage de la librairie :
  `service`, `codeVerifier`, `oauth2:state`, `oauth2:pkce` et `oauth2:pkce:*`.
  Les autres clés ne sont pas modifiées. Un échec de nettoyage lève une erreur
  et empêche l'activation du mode mémoire.
- Après ce nettoyage initial, la librairie n'accède plus au localStorage en
  mode mémoire.
- Un rechargement ou une fermeture de page fait perdre les données en mémoire.
  La session IAM peut toutefois permettre une nouvelle authentification SSO.
- Pour permettre la redirection OAuth, le `state` et le vérificateur PKCE
  restent temporairement dans sessionStorage. Ils sont supprimés après un
  échange de jeton réussi ou une déconnexion. Les marqueurs techniques SSO en
  sessionStorage et les cookies IAM ne sont pas désactivés.
- Le mode doit être choisi à chaque démarrage de l'application. Le changement
  après création d'un service ou d'un store lève une erreur.

Sans configuration, le comportement historique reste inchangé. Pour le choisir
explicitement, utilisez `configurePersistence({ mode: 'localStorage' })`.

**Avec votre propre instance Pinia :** appelez également `configurePersistence`
avant de créer le service/store et n'installez pas de plugin de persistance pour
le store `service` en mode mémoire. La librairie ne peut pas désactiver un plugin
que votre application installe indépendamment.

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

## 🛠️ Package: bundle vs sources

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

## 🧪 Exemple (playground)

> Le playground utilise directement les sources dans un env vite / vue3

Lancer l'exemple

```bash
npm run dev
```

## 🎬 Demo

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

* demo-4 :
  exemple multi-pages (vue-router) : une page de connexion et des pages (profil, documents, session)
  qui exploitent les informations de connexion persistées, partagées sur l'ensemble de l'application

* demo-5 :
  variante de la demo-4 où chaque page / composant lit les informations de connexion
  directement dans le store (`useStore()`), sans composable intermédiaire

* [demo-6](demos/demo-6/README.md) :
  exemple multi-pages avec `configurePersistence({ mode: 'memory' })` :
  connexion, profil et documents uniquement en mémoire, sans persistance dans
  localStorage ; les données sont perdues au rechargement

## ⚙️ Configuration

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

## ✅ Tests

> Fonctionnement des classes pour etendre les fonctionnalités du service

Lancer les test

```bash
npm run test
```

## 📁 Contenu du package npm

Le tarball genere par `npm pack` inclut notamment:

- `dist/`
- `docs/`
- `src/`
- `README.md`
- `package.json`

## 🔐 Diagrammes de Séquences - Authentification

cf. [docs/authentication-sequence.md](docs/authentication-sequence.md)

## 📚 Documentation interne

- Fonctionnement interne + guide d'implementation utilisateur: [docs/internal-architecture.md](docs/internal-architecture.md)
