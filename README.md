# Focus Dashboard

Tableau de bord Windows local en français, construit avec React, TypeScript, Tauri 2 et SQLite.

## Fonctions

- Widgets déplaçables et activables dans les paramètres.
- Agenda mensuel avec événements sur plusieurs jours et tâches du jour.
- Notes Markdown et minuteur de concentration.
- Musique foobar2000 : playlists, artistes, albums, recherche et commandes de lecture.
- Météo par ville, indice UV et prévisions sur trois jours.
- Cours de bourse par catégorie, avec une sélection de démonstration.
- Accès aux projets, groupes de raccourcis, mesures PC et compagnon animé.
- Citation du jour, sauvegarde locale, export et import JSON.

## Développement

Prérequis : Windows x64, Node.js 24, Rust stable MSVC, Visual Studio Build Tools avec C++ Desktop et Windows SDK, WebView2.

```powershell
npm ci
npm run tauri -- dev
npm run verify
npm run test:persistence
npm run tauri -- build
```

L'exécutable est produit dans `src-tauri/target/release/focus-dashboard.exe`. L'installateur Windows est produit dans `src-tauri/target/release/bundle/nsis/`.
`npm run dev` ouvre un aperçu navigateur ; les fonctions natives nécessitent Tauri.

## Configuration

Choisissez votre ville et votre dossier de projets dans les paramètres. Configurez vos propres raccourcis et playlists. Le ping utilise Google (8.8.8.8).

Pour foobar2000 et Libre Hardware Monitor, consultez [les intégrations](docs/INTEGRATIONS.md).
Les effets météo Cooked FX doivent être ajoutés localement selon leur licence ; les pictogrammes météo restent disponibles sans ces fichiers. Voir [les ressources](docs/ASSETS.md).

## Données personnelles

L'agenda, les notes et les réglages sont enregistrés localement dans `%APPDATA%/fr.personalos.desktop/personal-os.db`. Les noms internes sont conservés pour la compatibilité.

Ce dépôt contient le code et des réglages neutres. Les bases de données, sauvegardes, captures, inventaires musicaux, exécutables et caches sont exclus. La liste boursière est un exemple, sans portefeuille ni montants personnels.

Les citations conservent leur [licence source](citaitons/LICENSE-source.txt). Les ressources tierces conservent leurs propres conditions d'utilisation.
