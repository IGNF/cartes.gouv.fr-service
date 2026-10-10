# Revue de sécurité — Authentification SSO / Keycloak

Dernière revue : 2026-10-10.

Périmètre : flux OAuth2/OIDC (PKCE), intégration keycloak-js (silent SSO), gestion des tokens, logout, usage du `localStorage` / `sessionStorage`.

## Synthèse

| # | Sévérité | Fichier | Lignes | Vulnérabilité | Confiance |
|---|----------|---------|--------|---------------|-----------|
| 1 | 🟡 MEDIUM | [src/core/ServiceLocal.js](src/core/ServiceLocal.js) | 120, 349–365 | Le logout invalide le wrapper courant, mais n'est pas propagé aux autres instances ou onglets actifs | 9/10 |

### État du correctif précédent

**Verdict : corrigé sur l'instance déconnectée ; invalidation globale encore incomplète.**

Le constat initial concernait un wrapper OAuth qui conservait le bearer après le logout. Le correctif dans [ServiceLocal.js](src/core/ServiceLocal.js) :

- désactive le rafraîchissement automatique, arrête le timer et invalide le wrapper courant ;
- remplace le fetch du service déconnecté par un rejet explicite (`OAuth2 session logged out`) ;
- empêche un refresh tardif de réenregistrer ses credentials dans cette instance ;
- vide les informations utilisateur, documents et credentials, puis nettoie le stockage avant la reconstruction du service dans le store ;
- supprime le verifier de compatibilité et les entrées OAuth state/PKCE dans les deux stockages.

Le défaut initial n'est donc plus présenté comme actif sur cette instance.

### Logout non propagé aux autres instances actives

Chaque instance conserve son propre `OAuth2Fetch` et son token en mémoire. Le logout n'invalide que le wrapper de l'instance courante ; aucune propagation inter-onglets n'a été identifiée.

**Reproduction** : une vérification locale avec deux clients synthétiques indépendants a confirmé que le second client envoyait encore un en-tête `Authorization` après le logout du premier.

**Scénario** : deux onglets sont connectés. Après une déconnexion dans le premier, le second peut continuer à envoyer l'ancien bearer. Sur un poste partagé, des requêtes peuvent encore être émises sous l'identité précédente **tant que le serveur accepte ce token**.

Cette reproduction démontre l'envoi du bearer, pas son acceptation par l'API après révocation. Elle ne démontre ni contournement de la révocation Keycloak ni accès au-delà de l'expiration du token.

**Correctif recommandé** :

- propager le logout via `BroadcastChannel` ou l'événement `storage`, puis invalider les wrappers et refresh des autres instances ;
- ajouter un test avec deux instances actives ;
- vérifier les contrôles de révocation/session côté serveur si une invalidation immédiate des accès est requise.

### Vérification

Commande exécutée lors de la revue :

```sh
npm test -- --run src/core/__tests__/ServiceLocal.test.js
```

Résultat : **3 tests réussis** dans [ServiceLocal.test.js](src/core/__tests__/ServiceLocal.test.js). `git diff --check` a également réussi lors de la revue.

La couverture vérifie :

- le nettoyage des credentials et entrées OAuth, sans suppression des données sans rapport avec l'authentification ;
- l'arrêt du timer et l'absence de restauration des credentials par un refresh terminé après logout ;
- le rejet des requêtes suivantes sur l'instance déconnectée ;
- la conservation des données OAuth en attente lorsqu'aucun callback de logout n'est présent.

Tests à ajouter :

- une requête via l'instance reconstruite dans le store après logout (son état persisté est testé, mais pas directement son fetch) ;
- la propagation du logout entre instances ou onglets ;
- un échange de code OAuth en cours pendant le logout.

## Inventaire du stockage navigateur

Le niveau de risque décrit la sensibilité de la donnée, pas une vulnérabilité prouvée.

| Stockage | Clé | Contenu | Risque / cycle de vie |
|---|---|---|---|
| localStorage | `service` | State Pinia complet : `connexion.token.accessToken`, `refreshToken`, `idToken`, expiration, statut, identifiant de session, code d'autorisation / verifier, paramètres, profil utilisateur, métadonnées de documents | **Élevé.** Persistant, lisible par tout JS same-origin. Supprimé au logout reconnu puis réécrit par la persistance avec un état déconnecté |
| localStorage | `codeVerifier` | PKCE verifier en clair (fallback de compatibilité) | **Moyen.** Supprimé après échange réussi et au logout reconnu ; pas de nettoyage identifié en cas d'échec/abandon sans logout |
| sessionStorage | `oauth2:state` | State OAuth attendu, chiffré | **Moyen.** Clé de chiffrement dérivable de constantes du code ; ne protège pas contre du JS same-origin. Supprimé après échange réussi et au logout reconnu |
| sessionStorage | `oauth2:pkce:<encryptedState>` | PKCE verifier en clair | **Moyen.** Entrée courante supprimée après échange réussi ; toutes les entrées OAuth PKCE sont nettoyées au logout reconnu. Sans logout, les entrées abandonnées peuvent rester jusqu'à la fin de la session d'onglet |
| sessionStorage | `auth:auto-sso-attempted` | `"1"` | Faible. Supprimé au login/logout reconnu |
| sessionStorage | `auth:keycloak-silent-sso-blocked` | `"1"` | Faible. Pas de suppression explicite identifiée |
| localStorage (keycloak-js) | `kc-test` | `"test"` | Faible. Supprimé immédiatement |
| localStorage (keycloak-js) | `kc-callback-<state>` | state, nonce, redirect URI, options, PKCE verifier, expiration (pas de tokens) | Moyen. Expiration 1 h ; supprimé à la consommation, entrées expirées nettoyées lors des opérations de stockage suivantes |
| Cookie JS (fallback keycloak-js) | `kc-callback-<state>` | Idem ci-dessus si localStorage indisponible | Moyen. Pas de `Secure` / `SameSite` / `Path` explicites, lisible en JS ; expiration 1 h |
| localStorage (docs générées) | `tsd-theme`, `filter-*`, `tsd-accordion-*` | Préférences d'affichage | Faible |

### Emplacements

- Persistance de `service` : [src/utils/pinia.js](src/utils/pinia.js), [playground/main.js](playground/main.js), [demos/demo-1/src/main.js](demos/demo-1/src/main.js), [demos/demo-3/src/main.js](demos/demo-3/src/main.js). Aucune liste blanche de champs dans ces configurations.
- Lectures directes de `service` : [src/core/ServiceLocal.js](src/core/ServiceLocal.js), [demos/demo-2/src/components/Service.vue](demos/demo-2/src/components/Service.vue).
- State / verifier OAuth : [src/core/ServiceLocal.js](src/core/ServiceLocal.js) (l.425, 532, 540, 568). Nettoyage au logout : l.356–364.
- Flag auto-SSO : [src/composables/useAuth.js](src/composables/useAuth.js).
- Flag silent SSO bloqué : [src/core/ServiceBase.js](src/core/ServiceBase.js).
- Stockage de callback et cookie de secours : keycloak-js 26.2.4, version installée examinée lors de l'analyse initiale.

## Faiblesses sans exploitation démontrée

- **Validation du state** ([src/core/ServiceLocal.js](src/core/ServiceLocal.js) l.535) : la comparaison n'a lieu que si les deux valeurs existent ; si le state stocké est absent, le state du callback est accepté. → Rendre la vérification obligatoire (échec si absent). Aucun contournement PKCE ni exploit de login-CSRF n'a été démontré.
- **Clé PKCE incohérente** : écrite sous le state chiffré, relue avec le state en clair → après rechargement, la recherche ne retrouve pas l'entrée créée et utilise le fallback de compatibilité. → Corriger la clé et supprimer le fallback.
- **Nonce / ID token** : le flux OAuth principal ne valide ni nonce ni ID token (utilisé comme `id_token_hint` au logout, sans autorité d'autorisation démontrée).
- **Échange de code en vol au logout** : après l'attente de l'échange, [src/core/ServiceLocal.js](src/core/ServiceLocal.js) (l.558, 563–566) peut réinstaller un token et un wrapper. Cette concurrence n'a pas été démontrée dans le parcours normal de navigation. → Ajouter un test dédié et empêcher un échange devenu obsolète de restaurer les credentials.

## Non constaté

- **XSS** : aucun sink HTML exploitable par un attaquant identifié dans le périmètre examiné. La persistance des tokens n'est pas une preuve de XSS ; une XSS future permettrait leur exfiltration.
- **Autorisation** : aucune décision d'autorisation basée sur des rôles stockés côté navigateur identifiée.
- **Redirections** : pas d'open redirect identifié dans la construction des URLs login/logout.
- **Secrets** : aucun secret Keycloak non vide identifié dans les fichiers suivis ni leur historique examinés lors de l'analyse initiale.

## Hors périmètre / non vérifiable

Le dépôt ne contient ni backend d'authentification, ni export de realm/client Keycloak, ni configuration CSP/en-têtes de production. 

Restent à vérifier : validation JWT côté serveur (signature, issuer, audience, expiration), durée de vie et révocation effective des tokens, politiques PKCE/redirect URIs du client Keycloak, CSP déployée.

La revue du 2026-10-10 se concentre sur le correctif du logout et ses comportements couplés ; elle ne constitue pas une nouvelle certification exhaustive de toutes les surfaces ou dépendances du projet.

## Recommandations prioritaires

1. Compléter l'invalidation du logout pour les autres instances/onglets (constat n°1), et tester le fetch de l'instance reconstruite ainsi que l'échange de code en vol.
2. Exclure `accessToken` / `refreshToken` / `idToken` / verifier de la persistance Pinia, conserver les tokens en mémoire ; idéalement migrer vers un BFF avec cookies `HttpOnly; Secure; SameSite`.
3. Rendre la vérification du state obligatoire, corriger la clé PKCE, supprimer le fallback `codeVerifier` et nettoyer les entrées abandonnées.
4. Déployer une CSP stricte adaptée à l'application pour réduire le risque et l'impact d'une XSS.
5. Vérifier et adapter la durée de vie des access tokens, la rotation des refresh tokens et les contrôles de révocation dans Keycloak et l'API.
