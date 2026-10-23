# Compagnon — Focus Dashboard 0.5

## Mise à jour 0.5.3

Le chargement des widgets et du compagnon attend désormais l’application du mode de fenêtre sauvegardé. La détection des plateformes suit également la taille de l’en-tête et du conteneur principal, ainsi que l’ajout des messages au-dessus des widgets. Des mesures différées après les changements de fenêtre et de viewport prennent en compte la stabilisation de WebView2. L’ancrage vertical conserve la position fractionnaire réelle de la bordure, sans arrondi au pixel CSS. Les essais en fenêtre sans bordures restent confiés à l’utilisateur.

## Mise à jour 0.5.2

Lors d’un changement de widget, le compagnon peut désormais effectuer une roulade sur place, puis une rotation aérienne en descendant directement sur le widget inférieur. Ce trajet est choisi aléatoirement lorsque le widget suivant se trouve sous sa position. Le sommet du widget de départ est temporairement traversable pendant cette descente volontaire ; les autres sommets restent des surfaces d’atterrissage. La chute suit la gravité et se termine par l’animation d’atterrissage. Le personnage peut ainsi passer visuellement devant le contenu du widget, sans intercepter les clics. Les trajets par les côtés et les remontées restent disponibles.

## Mise à jour 0.5.1

Le réglage de vitesse se trouve à droite d’« Afficher le compagnon ». Il règle désormais l’horloge commune de déplacement, de physique et d’animation : les frames restent synchronisées avec les pas et les sauts. La position, la direction et le délai initiaux sont aléatoires ; deux choix de comportement identiques consécutifs sont évités. Après un séjour prolongé sur un widget, un changement de plateforme est privilégié.

Les trajets latéraux permettent désormais de remonter vers le widget immédiatement supérieur : le personnage rejoint le côté libre, saute verticalement avec une impulsion adaptée à la hauteur, attrape le rebord et grimpe. Les grands sauts sont limités à 1 400 px de dénivelé et les passages obstrués sont refusés. Dans une fenêtre étroite, une partie du personnage peut être masquée au bord pendant ce trajet extérieur. Les essais d’utilisation de cette mise à jour sont laissés à l’utilisateur.

Le compagnon est activé par défaut. Paramètres → Compagnon permet de le masquer, de choisir sa taille et sa vitesse, et de couper séparément les comportements aléatoires et les réactions. Ces préférences passent par la sauvegarde native existante ; les anciennes sauvegardes reçoivent les valeurs par défaut sans perdre leurs données.

## Ressources

Source : archive locale **Pixel Art Character Template.zip**, pack **Free Animated Character Template**, Deymoon, fourni par l’utilisateur. L’archive originale n’a pas été modifiée. Seuls les PNG ont été extraits dans `public/companions/default`. Aucune image de remplacement ni source Aseprite copiée. Les métadonnées Aseprite ont été lues directement dans l’archive pour les cadences, puis comparées aux PNG exportés.

| Animation | PNG | Cases | Cadence |
|---|---:|---:|---|
| Idle | 288 × 48 | 6 × 48² | 100 ms |
| Walk | 384 × 48 | 8 × 48² | 100 ms |
| Run | 384 × 48 | 8 × 48² | 100 ms |
| Jump | 192 × 48 | 4 × 48² | 100 ms |
| Land | 144 × 48 | 3 × 48² | 65 ms |
| Roll | 528 × 48 | 11 × 48² | 9 × 50 ms puis 2 × 100 ms |
| Ledge Grab | 48 × 48 | 1 × 48² | fixe |
| Ledge Climb | 240 × 48 | 5 × 48² | 100 ms |
| Crouch Idle | 192 × 48 | 4 × 48² | 100 ms |
| Air Spin | 384 × 48 | 8 × 48² | 65 ms |

Les dix animations conservées sont utilisées par les comportements. Les quatre animations inutilisées (Crouch Walk, Crouch Idle New, Wall Land, Wall Slide) ont été retirées du projet et du chargement. L’export Crouch Idle comporte quatre cases ; le moteur utilise les cases réellement présentes dans le PNG.

## Architecture

- `src/companion/Companion.tsx` : couche canvas transparente, pixel art, rendu impératif sans mise à jour React par image, chargement/arrêt/nettoyage.
- `sprites.ts`, `animation.ts` : définition du modèle, fichiers, cases, ancres, durées individuelles, chargement et contrôle des dimensions.
- `engine.ts` : machine à états explicite, physique, fin des animations non interruptibles, réactions différées.
- `platforms.ts` : mesures des widgets en coordonnées document, ResizeObserver et MutationObserver, recalcul lors des déplacements ; pause pendant le glisser-déposer.
- `navigation.ts` : trajectoires balistiques et collisions ; refus des sauts impossibles ou traversant un widget.
- `behaviors.ts` : choix pondérés, marche, course, repos accroupi, changement de direction, roulade et voyage.
- `events.ts` : bus typé ; tâche accomplie, lecture musicale et CPU ≥ 85 °C connectés. Le signal agenda est prêt mais non émis dans cette version.
- `settings.ts`, `CompanionSettings.tsx` : validation, valeurs par défaut, réglages intégrés au système de sauvegarde existant.
- Intégration dans `App.tsx`, `models.ts`, `SettingsPanel.tsx`, `Music.tsx`, `PcInfo.tsx` et `styles.css`.

La couche ne reçoit aucun événement de pointeur, ne participe pas à la mise en page et reste sous les fenêtres modales. Le défilement modifie uniquement les coordonnées du rendu. Les mesures DOM ne sont pas effectuées dans la boucle d’animation. La visibilité du document arrête requestAnimationFrame. La préférence de réduction des animations immobilise le compagnon au sol ; une traversée déjà engagée se termine avant l’immobilisation.

Les widgets empilés sont des obstacles : le personnage descend par leur extérieur, attrape la bordure du widget suivant et grimpe. Il saute entre sommets seulement si la trajectoire est accessible. Il ne se téléporte pas vers le haut d’une grande pile de widgets. Le mouvement ne suit pas automatiquement le viewport pendant le défilement.

## Réactions et extensions

Tâche terminée : petit saut et étincelle. Musique lancée : signe musical et changement de direction. Température élevée : pause accroupie et signe de température. Ces réactions sont sobres et espacées ; aucune fausse animation de danse ou de réparation.

Danse, sommeil, nettoyage, marteau, échelle, football, fléchettes, accessoires et modèles supplémentaires nécessitent leurs propres ressources. Ajouter leurs descriptions au modèle, leurs comportements et leurs transitions explicites. Le rappel agenda pourra réutiliser le signal `agenda-upcoming`.

## Validation réalisée

Avant la demande de l’utilisateur de prendre en charge les tests : ESLint, 22 tests Vitest (dont 7 nouveaux tests du compagnon), compilation TypeScript/Vite et contrôle des dimensions des 14 PNG sources et compilés réussis. Le contrôle des ressources est reproductible avec `node scripts/companion-assets.mjs` après compilation. Les tests vérifient notamment les collisions, l’accrochage/escalade, les changements de disposition, les réglages, la migration et l’aller-retour JSON des préférences.

Les vérifications visuelles dans Brave et le cycle réel fermeture/réouverture Windows restent à effectuer par l’utilisateur, à sa demande. La persistance du compagnon réutilise le même chemin natif que les autres paramètres ; aucun résultat de test Windows n’est prétendu.
