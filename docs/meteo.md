# Widget météo — Focus Dashboard 0.7.0

Choisir une ville uniquement dans Paramètres → Météo. Si aucune ville n’est définie, le widget propose un bouton pour ouvrir les paramètres. Aucune localisation n’est présélectionnée. Le bouton « Utiliser ma position » demande explicitement la géolocalisation ; si Windows/WebView la refuse, la recherche manuelle reste disponible.

Journée : conditions actuelles, ressenti, minimum/maximum, humidité, vent, précipitations, risque de pluie, UV horaire prévu et maximum quotidien, huit prochaines heures. Vue 3 jours : minima/maxima, conditions, pluie, UV maximum et lever/coucher du soleil. Les heures utilisent le fuseau renvoyé pour la ville choisie. Les dates restent explicites sur un cache ancien.

Les préférences rejoignent la sauvegarde SQLite existante. Le cache météo local est séparé par coordonnées et unité ; il conserve uniquement de vraies réponses Open-Meteo. Actualisation toutes les 30 minutes, reprise à la réactivation et bouton manuel. En cas d’erreur, les données précédentes restent visibles avec un avertissement. Sans données, aucune température fictive n’est affichée.

## Fichiers

- `src/weather/settings.ts` : préférences et localisation.
- `src/weather/data.ts` : service, validation des réponses, cache, fuseaux, codes WMO et seuils UV.
- `src/weather/Weather.tsx` : vues Journée/3 jours, indicateur UV et actualisation.
- `src/weather/WeatherSettings.tsx` : recherche, géolocalisation et préférences.
- `src/weather/WeatherIcon.tsx` : pictogrammes et animations canvas.
- `src/weather/weather.css` : présentation responsive.
- `src/weather/weather.test.ts` : seuils, codes, fuseaux, clés de cache et migration.
- `src-tauri/src/weather.rs` : commandes HTTPS limitées aux services Open-Meteo.
- Intégration dans `src/models.ts`, `src/App.tsx`, `src/components/SettingsPanel.tsx`, `src/upgrade.test.ts`, `src-tauri/src/lib.rs`, `src-tauri/permissions/desktop.toml`.
- Versions et prise en charge HTTPS : `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`.

## Ressources

Sept spritesheets dans `public/weather/cooked-fx/`, intégrées au build :

| Feuille | Frames | Cellule | Usage |
|---|---:|---:|---|
| env_sun_rays | 48 | 192 | Soleil de jour |
| env_rain | 24 | 192 | Pluie et bruine |
| env_snowfall | 48 | 192 | Neige |
| env_fog | 48 | 256 | Brouillard |
| env_hail_top | 24 | 128 | Orage avec grêle |
| env_lightning_flash | 48 | 192 | Orage, pause de 6 secondes entre séquences |
| env_wind_gust | 24 | 192 | Vent ≥ 25 km/h sans autre effet, séquence unique puis pause de 4 secondes |

Cadence source : 24 images/s. Dessin transparent carré, sans déformation. Chargement des images partagé, mise à jour hors React. Arrêt hors écran, fenêtre inactive, document masqué, réduction des animations ou option désactivée.

Le pack fourni est **Soft Glass**, décrit par son auteur comme une variante vectorielle rasterisée ; il ne s’agit pas de la variante Pixel native. Les effets sont complémentaires aux pictogrammes Lucide : soleil, lune, éclaircies, nuages, brouillard, pluie, neige, orage. Les nuages et la lune conservent un pictogramme classique sans effet inadapté. Un asset manquant laisse toujours le pictogramme visible.

Licence, notice et métadonnées originales : `resources/weather/cooked-fx/`. Les planches du pack doivent être installées localement selon leur licence ; voir `docs/ASSETS.md`. Crédit : **Effects: Cooked FX by The Cooked Works**. La licence permet l’intégration dans une application terminée, mais interdit de redistribuer les fichiers comme ressources autonomes.

## Contrôles et limites

Avant la demande d’arrêt des vérifications : lint sans erreur, 32 tests automatisés réussis, compilation TypeScript/Vite réussie. Contrôle visuel Brave non effectué, lancement non autorisé. L’utilisateur réalise les vérifications d’usage ; aucun test supplémentaire après sa demande. La compilation Windows sert à produire l’exécutable final.

Compilation Windows 0.7.0 réussie : `src-tauri/target/release/focus-dashboard.exe`, remplacé au même emplacement après fermeture normale de l’ancienne fenêtre. Aucune validation interactive de l’exécutable final n’a été réalisée.

La géolocalisation dépend des autorisations Windows/WebView. Les données actuelles Open-Meteo sont des estimations météorologiques ; l’UV est une prévision horaire, distincte du maximum quotidien. Le cache local peut être indisponible si le stockage WebView est saturé. Le build Vite conserve un avertissement de taille du bundle global (plus de 500 kB).

Documentation : https://open-meteo.com/en/docs et https://open-meteo.com/en/docs/geocoding-api. Service gratuit destiné ici à l’usage personnel non commercial.
