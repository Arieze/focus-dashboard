# Bourse

Le widget affiche une sélection de démonstration par catégorie : ETF, action et Bitcoin. Pour personnaliser les valeurs, modifiez `src/markets/instruments.ts` et la liste fermée `SYMBOLS` dans `src-tauri/src/markets.rs`.

Les cours proviennent de Yahoo Finance et s'actualisent toutes les cinq minutes, avec un cache natif d'une minute. Les nouvelles demandes sont suspendues en arrière-plan. Les cours sont affichés dans leur devise de cotation et peuvent être différés. Le widget ne contient aucune quantité détenue, prix de revient ou performance de portefeuille.
