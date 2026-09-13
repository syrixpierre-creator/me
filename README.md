# SYRIX FLIX

Application de streaming (films, séries, anime, K-Dramas) — backend Node.js/Express + MongoDB, site web, app mobile Flutter.

## Qui sert quoi ?

- **Le backend (`src/`, à la racine)** sert :
  - l'**API** (`/api/v1/...`)
  - le **site web** statique (`/site/...`) — pages légales, FAQ, démo du lecteur, bannière APK, cookies
  - la **doc d'intégration API** (`/docs`)
  - le fichier **`.apk`** à télécharger (`/downloads/syrix-flix.apk`)
- **L'app mobile (`mobile/`, Flutter)** n'est PAS servie par le backend — c'est un
  binaire compilé (APK/IPA) que l'utilisateur installe sur son téléphone. Elle
  consomme l'API à distance, exactement comme un site tiers le ferait avec une
  clé API.

Concrètement : le backend est à la fois votre API et le serveur de votre site
web ; le mobile est un client indépendant du même backend.

## Arborescence (package.json à la racine — déploiement Railway/Render sans config)

```
syrix-flix/
├── package.json            # ← à la racine : Railway/Render le détectent automatiquement
├── .env.example
├── .gitignore
├── downloads/              # dépôt du .apk à servir (/downloads/syrix-flix.apk)
├── public/
│   └── docs.html           # doc d'intégration API, servie sur /docs
├── src/
│   ├── server.js           # point d'entrée Express
│   ├── config/db.js
│   ├── models/{User,Media}.js
│   ├── middleware/{auth,apiKeyAuth,catalogAccess}.js
│   ├── routes/{auth,profile,catalog}.routes.js
│   └── utils/{generateApiKey,extractDomain,proxyClient}.js
├── web/                    # site web statique, servi sur /site
│   ├── assets/{css,js}/
│   ├── player-demo.html
│   ├── confidentialite.html
│   ├── conditions-utilisation.html
│   └── faq.html
└── mobile/                 # app Flutter — build séparé, PAS déployé par Railway/Render
    ├── pubspec.yaml
    └── lib/...
```

## Déploiement Railway / Render

Comme `package.json` est à la racine du repo, **aucune configuration de
"root directory" ou de commande custom n'est nécessaire** — les deux
plateformes détectent Node automatiquement :

- **Build command** : `npm install` (par défaut)
- **Start command** : `npm start` (défini dans `package.json`)
- **Variables d'environnement à définir** sur la plateforme : `MONGO_URI`,
  `JWT_SECRET`, `JWT_EXPIRES_IN`, `CATALOG_API_BASE_URL`,
  `API_KEY_DOMAIN_ENFORCEMENT` (voir `.env.example`)
- **`PORT`** : Railway/Render l'injectent automatiquement, le code lit déjà
  `process.env.PORT` (fallback 4000 en local).

Le dossier `mobile/` (Flutter) reste dans le repo pour l'historique/versioning
mais n'est jamais buildé par Railway/Render : ces plateformes ne réagissent
qu'au `package.json`/`Procfile` Node à la racine et ignorent le reste.

## Le point clé : clé API liée à un DOMAINE, pas à l'IP du VPS

1. L'utilisateur génère sa clé depuis le profil (`POST /api/v1/profile/api-key`), domaine optionnel.
2. Sans domaine fourni, la clé se **verrouille automatiquement** sur le domaine détecté (`Origin`/`Referer`) au **premier appel réel**.
3. Tout appel ultérieur venant d'un autre domaine est rejeté (`domain_mismatch`).

Doc complète et exemple d'intégration : `GET /docs`.

## Démarrage local

```bash
npm install
cp .env.example .env   # renseignez vos variables
npm run dev
```

- API : `http://localhost:4000/api/v1/...`
- Site web : `http://localhost:4000/site/player-demo.html`
- Docs API : `http://localhost:4000/docs`

## Mobile (Flutter, build séparé)

```bash
cd mobile
flutter pub get
flutter run
```
Changez `ApiService.baseUrl` dans `mobile/lib/services/api_service.dart` pour
pointer vers votre backend déployé (Railway/Render).
