# Particules musicales — Focus Dashboard 0.6.1

Des petites notes montent autour de la pochette pendant la lecture. Elles utilisent les couleurs du thème, des trajectoires légèrement oscillantes et une durée de 1,5 à 3 secondes, avec huit notes maximum. Le réglage **Paramètres → Effets visuels musicaux** permet de les désactiver et de choisir une densité faible, normale (par défaut) ou élevée. Ces préférences sont sauvegardées dans l’état natif existant et les anciennes sauvegardes reçoivent les valeurs par défaut.

## Ressources utilisées

Le pack [Pixel Music Notes / Music Scale Ring — Hamuko27](https://hamuko27.itch.io/pixel-music-notes-free) a été fourni par l’utilisateur après la version 0.6.0. L'archive originale est exclue du dépôt. L’application utilise désormais sa planche PNG transparente originale de 100 × 100 pixels ; les SVG provisoires ont été supprimés.

Le tableau `noteSprites` sélectionne cinq notes de la planche en conservant leurs proportions. Le rendu par masque conserve la transparence et applique les couleurs du thème. L’anneau et les sources Aseprite restent dans l’archive, sans être chargés dans l’application.

## Synchronisation et performances

`Music.tsx` transmet directement `state.player.playbackState` et les métadonnées du morceau provenant du fournisseur foobar2000/Beefweb. Aucun état de lecture parallèle n’est inventé.

- Lecture : un générateur crée environ 1 à 3 notes par seconde.
- Pause : le générateur s’arrête ; les notes présentes terminent leur fondu.
- Arrêt ou déconnexion : toutes les animations et notes sont supprimées.
- Changement des métadonnées du morceau pendant la lecture : émission de 3 à 5 notes, dans la limite totale de huit.
- Désactivation, widget retiré, pochette hors écran, application masquée ou réduction des animations : arrêt et nettoyage.

Le contrôle lecture/pause de l’application rafraîchit l’état après la commande. Une action effectuée directement dans foobar2000 est détectée par l’interrogation existante, toutes les trois secondes environ. Deux morceaux aux métadonnées identiques ne déclenchent pas une émission supplémentaire ; l’émission normale continue.

Le conteneur est positionné relativement à la pochette : il suit naturellement déplacement, défilement et redimensionnement. Il ne reçoit aucun clic et ne change pas les dimensions du widget. Les animations utilisent Web Animations API ; aucune mise à jour React globale n’a lieu à chaque image. Le système de compagnon et son événement existant `music-playing` sont conservés, sans deuxième bus d’événements.

## Fichiers

- `src/music-effects/MusicParticles.tsx` : rendu, animations, visibilité et nettoyage.
- `src/music-effects/particles.ts` : générateur, plafond, variations et ressources remplaçables.
- `src/music-effects/settings.ts` : validation et préférences.
- `src/music-effects/particles.test.ts` : tests de transitions, limites, arrêt et sauvegarde.
- `public/music-effects/hamuko27/Music-Notes.png` : sprites originaux.
- `resources/music-notes/` : archive source et attribution.
- `src/widgets/Music.tsx`, `src/App.tsx`, `src/models.ts`, `src/components/SettingsPanel.tsx`, `src/styles.css` : intégration.
- `src/companion/platforms.ts` : ignore les ajouts et retraits de notes, qui ne modifient pas la disposition, pour ne pas perturber les trajets du compagnon.
- `scripts/music-effects-browser.js` : scénario isolé dans l’aperçu Brave avec fournisseur musical simulé ; ne modifie pas foobar2000.

## Validation

ESLint, les 27 tests Vitest et la compilation TypeScript/Vite ont réussi avant la demande de l’utilisateur de prendre en charge les vérifications. Le scénario Brave déjà lancé s’est terminé sans erreur : lecture/pause/reprise, changement de morceau, désactivation, réduction des animations, disparition hors écran, commandes cliquables et ancrage à 440 et 1080 px. Cela utilise un lecteur simulé et ne constitue pas une vérification de la lecture native foobar2000. Aucun autre test d’utilisation n’a été lancé après cette demande ; la vérification finale dans l’application reste à l’utilisateur.
