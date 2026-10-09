# Revue de sécurité — Authentification SSO / Keycloak

Date : 2026-10-09
Périmètre : flux OAuth2/OIDC (PKCE), intégration keycloak-js (silent SSO), gestion des tokens, logout, usage du `localStorage` / `sessionStorage`.

## Synthèse

| # | Sévérité | Fichier | Lignes | Vulnérabilité | Confiance |
|---|----------|---------|--------|---------------|-----------|
| 1 | 🟡 MEDIUM | [src/core/ServiceLocal.js](src/core/ServiceLocal.js) | 104, 335, 544 (+ [src/store/ServiceStore.js](src/store/ServiceStore.js) l.66) | Le logout ne réinitialise pas le `#fetchWrapper` OAuth : l'ancien access token reste envoyé (`Authorization: Bearer …`) | 9/10 |

## 1. Logout incomplet — token toujours utilisable

La branche logout vide `this.token`, les données utilisateur et le token persisté, mais n'invalide jamais `#fetchWrapper`. Les appels suivants via le fetch du service existant continuent d'attacher l'ancien access token. L'instance recréée par le store peut aussi conserver l'ancien token, car son wrapper lit le stockage avant que la persistance du logout ne l'écrase.

Reproduction hors ligne (classes réelles, persistance Pinia réelle, tokens synthétiques) : après logout, `authenticated: false` et le token persisté est vide, mais les requêtes partent toujours avec l'ancien bearer.

**Scénario** : sur un poste partagé, sans rechargement de l'application, des requêtes peuvent être émises sous l'identité de l'utilisateur précédent tant que le token est valide côté serveur.

**Correctif recommandé** :
- centraliser l'invalidation au logout (désactiver/réinitialiser tous les wrappers OAuth, annuler les refresh en cours, empêcher un refresh en vol de restaurer les credentials) ;
- vider l'état persistant avant de construire de nouveaux clients ;
- ajouter un test de non-régression vérifiant qu'aucun bearer n'est envoyé après logout ;
- si une invalidation immédiate est requise, révoquer le token / la session côté Keycloak.

## Inventaire du stockage navigateur

Le niveau de risque décrit la sensibilité de la donnée, pas une vulnérabilité prouvée.

| Stockage | Clé | Contenu | Risque / cycle de vie |
|---|---|---|---|
| localStorage | `service` | State Pinia complet : `connexion.token.accessToken`, `refreshToken`, `idToken`, expiration, statut, identifiant de session, code d'autorisation / verifier, paramètres, profil utilisateur, métadonnées de documents | **Élevé.** Persistant, lisible par tout JS same-origin. Vidé au logout reconnu, la clé reste |
| localStorage | `codeVerifier` | PKCE verifier en clair (fallback de compatibilité) | **Moyen.** Supprimé après échange réussi ; pas de nettoyage en cas d'échec/abandon ni au logout |
| sessionStorage | `oauth2:state` | State OAuth attendu, chiffré | **Moyen.** Clé de chiffrement dérivable de constantes du code ; ne protège pas contre du JS same-origin |
| sessionStorage | `oauth2:pkce:<encryptedState>` | PKCE verifier en clair | **Moyen.** Entrées abandonnées conservées jusqu'à la fin de la session d'onglet |
| sessionStorage | `auth:auto-sso-attempted` | `"1"` | Faible |
| sessionStorage | `auth:keycloak-silent-sso-blocked` | `"1"` | Faible. Jamais supprimé explicitement |
| localStorage (keycloak-js) | `kc-test` | `"test"` | Faible. Supprimé immédiatement |
| localStorage (keycloak-js) | `kc-callback-<state>` | state, nonce, redirect URI, options, PKCE verifier, expiration (pas de tokens) | Moyen. Expiration 1 h |
| Cookie JS (fallback keycloak-js) | `kc-callback-<state>` | Idem ci-dessus si localStorage indisponible | Moyen. Pas de `Secure` / `SameSite` / `Path` explicites, lisible en JS |
| localStorage (docs générées) | `tsd-theme`, `filter-*`, `tsd-accordion-*` | Préférences d'affichage | Faible |

### Emplacements

- Persistance de `service` : [src/utils/pinia.js](src/utils/pinia.js) (l.25), [playground/main.js](playground/main.js) (l.11), [demos/demo-1/src/main.js](demos/demo-1/src/main.js) (l.13), [demos/demo-3/src/main.js](demos/demo-3/src/main.js) (l.13). Aucune liste blanche de champs.
- Lectures directes de `service` : [src/core/ServiceLocal.js](src/core/ServiceLocal.js) (l.153), [demos/demo-2/src/components/Service.vue](demos/demo-2/src/components/Service.vue) (l.16).
- State / verifier OAuth : [src/core/ServiceLocal.js](src/core/ServiceLocal.js) (l.406, 513, 547).
- Flag auto-SSO : [src/composables/useAuth.js](src/composables/useAuth.js) (l.120, 132, 144).
- Flag silent SSO bloqué : [src/core/ServiceBase.js](src/core/ServiceBase.js) (l.172, 205).
- keycloak-js 26.2.4 : `node_modules/keycloak-js/lib/keycloak.js` (l.1757, 1863).

## Faiblesses sans exploit démontré

- **Validation du state** ([src/core/ServiceLocal.js](src/core/ServiceLocal.js) l.515) : la comparaison n'a lieu que si les deux valeurs existent ; si le state stocké est absent, le state du callback est accepté. → Rendre la vérification obligatoire (échec si absent).
- **Clé PKCE incohérente** : écrite sous le state chiffré, relue avec le state en clair → le fallback `localStorage["codeVerifier"]` est systématiquement utilisé après rechargement. → Corriger la clé et supprimer le fallback.
- **Nonce / ID token** : le flux OAuth principal ne valide ni nonce ni ID token (utilisé uniquement comme `id_token_hint` au logout).
- **Secret client** : [playground/App.vue](playground/App.vue) (l.46) expose `IAM_CLIENT_SECRET` au front s'il est renseigné. Les valeurs committées sont vides ; un secret de client confidentiel ne doit jamais y être configuré.

## Non-constats

- **XSS** : aucun sink HTML exploitable par un attaquant identifié (interpolation Vue échappée). Le stockage des tokens n'est donc pas exploitable seul, mais toute XSS future permettrait leur exfiltration.
- **Autorisation** : aucune décision d'autorisation basée sur des rôles stockés côté navigateur.
- **Redirections** : pas d'open redirect identifié dans la construction des URLs login/logout.
- **Secrets** : aucun secret Keycloak non vide dans les fichiers suivis ni leur historique.

## Hors périmètre / non vérifiable

Le dépôt ne contient ni backend d'authentification, ni export de realm/client Keycloak, ni configuration CSP/en-têtes de production. Restent à vérifier : validation JWT côté serveur (signature, issuer, audience, expiration), durée de vie des tokens, politiques PKCE/redirect URIs du client Keycloak, CSP déployée.

## Recommandations prioritaires

1. Corriger l'invalidation au logout (constat n°1) avec test de non-régression.
2. Exclure `accessToken` / `refreshToken` / `idToken` / verifier de la persistance Pinia (`pick`/`omit`), conserver les tokens en mémoire ; idéalement migrer vers un BFF avec cookies `HttpOnly; Secure; SameSite`.
3. Rendre la vérification du state obligatoire, corriger la clé PKCE, supprimer `localStorage["codeVerifier"]` et nettoyer les entrées abandonnées.
4. Déployer une CSP stricte (`script-src` sans `unsafe-inline`) pour réduire l'impact d'une XSS.
5. Réduire la durée de vie des access tokens et activer la rotation des refresh tokens dans Keycloak.
