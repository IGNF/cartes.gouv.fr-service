# demo-5 : informations de connexion lues directement dans le store

Variante de la [demo-4](../demo-4/README.md) : même application multi-pages (vue-router),
mais sans composable `useSession()`. Chaque page ou composant interroge directement le store
de la librairie (`useStore()`), persisté dans le `localStorage` par `pinia-plugin-store`.

## Pages

| Route | Contenu |
|---|---|
| `/` | Connexion / déconnexion SSO |
| `/profil` | Profil de l'utilisateur (`store.connexion.user`) |
| `/documents` | Documents (`store.connexion.documents`), avec rafraîchissement via l'API |
| `/session` | État de la session persistée (les jetons ne sont pas affichés) |

Le composant [UserStatus.vue](src/components/UserStatus.vue) (en-tête et page de connexion)
lit lui aussi le store.

## Fonctionnement

- [src/App.vue](src/App.vue) initialise **une seule fois** l'authentification : réhydratation du service
  depuis le store, `store.setService(service)` puis `useAuth()` (traitement du callback SSO, check SSO).
- Les pages et composants lisent l'état via `useStore()` :

  ```js
  import { computed, toRaw } from 'vue';
  import { useStore } from 'cartes.gouv.fr-service';

  const store = useStore();
  const isAuthenticated = computed(() => Boolean(store.connexion?.authenticated));
  const user = computed(() => store.connexion?.user || {});
  const documents = computed(() => store.connexion?.documents || {});
  ```

- Pour appeler une méthode du service (`getDocuments()`, `getAccessLogin()`...), on le récupère
  dans le store **au moment de l'appel** avec `toRaw(store.getService())`.
  `toRaw()` est indispensable : le service utilise des champs privés (`#fetch`...) qui ne sont pas
  accessibles à travers le Proxy réactif de Pinia.
- Chaque `saveStore()` du service remplace `store.connexion` : toutes les pages se mettent à jour
  automatiquement.

## Différences avec la demo-4

| | demo-4 | demo-5 |
|---|---|---|
| Accès à l'état | refs `isAuthenticated` / `user` partagées par `useSession()` | `computed` sur `store.connexion` |
| Accès au service | instance unique partagée | `toRaw(store.getService())` |
| Couplage | pages dépendantes du composable applicatif | pages dépendantes uniquement de la librairie |

## Lancement

```sh
# à la racine du projet : génération du package
npm run generate-package

cd demos/demo-5
npm run update
npm run dev
```
