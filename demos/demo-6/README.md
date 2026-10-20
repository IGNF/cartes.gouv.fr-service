# demo-6 : connexion et documents en mémoire

Variante multi-pages de la [demo-5](../demo-5/README.md), utilisant le Pinia
embarqué de la librairie avec la persistance désactivée.

## Initialisation

[src/main.js](src/main.js) configure le mode avant la création de tout service
ou store :

```js
import { configurePersistence, pinia } from 'cartes.gouv.fr-service';

configurePersistence({ mode: 'memory' });
app.use(pinia);
```

Aucun plugin de persistance supplémentaire n'est installé. Le paquet
`pinia-plugin-store` reste une dépendance pair de la librairie, mais ne persiste
pas le store en mode mémoire.

[src/App.vue](src/App.vue) crée un service neuf, sans réhydratation depuis
localStorage, et initialise une seule fois `useAuth()`. Les pages lisent
directement le store avec `useStore()`. Les appels aux méthodes du service
utilisent `toRaw(store.getService())` pour accéder à ses champs privés.

## Pages

| Route | Contenu |
|---|---|
| `/` | Connexion / déconnexion SSO |
| `/profil` | Profil conservé en mémoire |
| `/documents` | Documents en mémoire et rafraîchissement depuis l'API |
| `/session` | Informations de session, sans afficher les valeurs des jetons |

## Comportement attendu

- Connexion, jetons, profil et documents restent réactifs pendant la navigation
  SPA, sans sérialisation dans localStorage.
- Recharger ou fermer la page fait perdre ces données. La vérification SSO
  automatique est désactivée dans cette démo pour rendre cet effet observable.
  Une connexion manuelle peut toutefois réutiliser la session IAM existante.
- Le `state` et le vérificateur PKCE restent temporairement en sessionStorage
  pour permettre le retour SSO. Ils sont nettoyés après un échange réussi ou une
  déconnexion. Le mode mémoire ne supprime pas les cookies IAM.
- Au démarrage, les anciennes clés localStorage de la librairie sont supprimées :
  `service`, `codeVerifier`, `oauth2:state`, `oauth2:pkce`, `oauth2:pkce:*`.
  Les autres clés sont conservées. **Une autre démo utilisant la même origine
  partage ce stockage et sera donc également affectée par ce nettoyage.**

## Lancement

```sh
# À la racine : inclure l'option memory dans le paquet utilisé par la démo.
npm run generate-package

cd demos/demo-6
npm run update
npm run dev
```

Ouvrir l'URL indiquée par Vite avec le chemin `/demo/`. Adapter au besoin les
variables IAM de [.env.development-local](.env.development-local), notamment le
client public et les URL de redirection autorisées côté IAM.

Pour une compilation utilisant cette configuration :

```sh
npm run build -- --mode development-local
```

## Vérification manuelle

1. Dans les outils de développement, ajouter une clé localStorage tierce
   (par exemple `demo6:keep`) et vérifier qu'elle reste présente au démarrage.
2. Se connecter via le SSO, puis naviguer vers le profil, les documents et la
   session : les informations restent disponibles sans clé `service` ou
   `codeVerifier` dans localStorage.
3. Rafraîchir les documents : le store réactif se met à jour sans persistance.
4. Recharger la page : l'état revient à « Non connecté », et les données privées
   ne sont plus affichées.
