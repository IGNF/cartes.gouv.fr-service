# cartes.gouv.fr-service

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

## Exemple

Lancer l'exemple

```bash
npm run dev
```

## Configuration

Vous pouvez configurer les parametres IAM via `setSettings`:

```js
import { setSettings } from '@cartes.gouv.fr/service';

setSettings({
  IamUrl: 'https://sso.geopf.fr',
  IamRealm: 'geoplateforme',
  IamClientId: 'cartes-gouv-public'
});
```

Ou via l'utilisation d'un fichier .env (cf. playground)

```ini
IAM_URL="https://sso.geopf.fr"
IAM_REALM="geoplateforme"
IAM_CLIENT_ID="cartes-gouv-public"
```

```js
import { setSettings } from '@cartes.gouv.fr/service';

setSettings({
  IamUrl : import.meta.env.IAM_URL,
  IamRealm : import.meta.env.IAM_REALM,
  IamClientId : import.meta.env.IAM_CLIENT_ID,
});
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
