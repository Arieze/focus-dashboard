# Mode de fenêtre — 0.5.4

L’option **Paramètres → Fenêtre Windows → Plein écran sans bordures** utilise désormais le plein écran natif sur le moniteur de la fenêtre, au lieu de retirer uniquement ses décorations. Elle couvre aussi la barre des tâches. La désactiver quitte le plein écran et rétablit les décorations Windows.

Le choix est sauvegardé avec le paramètre existant `borderless` et réappliqué avant l’affichage des widgets au démarrage. Les changements de mode sont sérialisés dans `src/services/windowMode.ts` et déclenchent le recalcul des plateformes du compagnon.

Compilation TypeScript/Vite et Windows effectuée ; validation visuelle laissée à l’utilisateur selon sa préférence.
