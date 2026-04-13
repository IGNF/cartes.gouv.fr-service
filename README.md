# @cartes.gouv.fr/service

Bibliotheque de services pour l'authentification et l'acces API (mode local et distant).

## Installation

```bash
npm install @cartes.gouv.fr/service
```

## Usage minimal

```js
import { getService, useAuth } from '@cartes.gouv.fr/service';

const service = getService({ mode: 'local' });
const { isAuthenticated, user } = useAuth({ service });
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
- `src/`
- `README.md`
- `package.json`
