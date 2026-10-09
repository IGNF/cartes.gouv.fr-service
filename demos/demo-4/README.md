# demo-4 : persistance de la connexion sur plusieurs pages

Application Vue 3 + vue-router qui montre que les informations de connexion
(utilisateur, documents, session) sont partagées et persistées sur l'ensemble de l'application.

## Pages

| Route | Contenu |
|---|---|
| `/` | Connexion / déconnexion SSO (équivalent de `Service.vue` des autres demos) |
| `/profil` | Profil de l'utilisateur connecté (store) |
| `/documents` | Liste des documents chargés à la connexion (store), avec rafraîchissement via l'API |
| `/session` | État de la session persistée (les jetons ne sont pas affichés) |

## Fonctionnement

- [src/composables/useSession.js](src/composables/useSession.js) crée **une seule** instance de service
  (réhydratée depuis le store persisté dans le `localStorage`) et appelle `useAuth()` **une seule fois**.
  Toutes les pages réutilisent cette instance et les refs `isAuthenticated` / `user`.
- Les pages lisent les données dans le store Pinia (`useStore()`), persisté par `pinia-plugin-store`.
- Le callback OAuth revient sur la racine de l'application (`routing: false`).

Pour vérifier la persistance : se connecter, naviguer entre les pages, recharger une page
(ex. `/demo/documents`) ou ouvrir un nouvel onglet.

## Lancement

```sh
# à la racine du projet : génération du package
npm run generate-package

cd demos/demo-4
npm run update
npm run dev
```
