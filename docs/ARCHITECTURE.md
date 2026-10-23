# Architecture

`src/widgets/` contient les six modules d’interface. `src/components/` contient les dialogues, paramètres et restauration. `src/models.ts` définit les modèles Zod et les types déduits. `src/domain.ts` contient les règles de dates, récurrence et fusion. `src/services/` isole stockage, notifications et musique. `src-tauri/` contient l’enveloppe native et les migrations SQLite. Les styles partagent des variables CSS de thème.

## Persistance et cohérence

La v0.1 stocke un agrégat JSON validé dans une ligne SQLite, plutôt que des tables séparées pour chaque collection. Ce choix garde atomiques les opérations liées (terminer une tâche et générer son occurrence, terminer le minuteur et ajouter l’historique). Chaque sauvegarde est un UPSERT unique transactionnel. Les écritures sont sérialisées ; un échec est signalé et n’empêche pas les tentatives suivantes. Le délai de 400 ms regroupe les frappes ; une fermeture normale attend une dernière écriture. Une coupure électrique pendant ces 400 ms peut perdre les dernières frappes.

La migration 1 crée l’état et les métadonnées de synchronisation réservées. La migration 2 crée les sauvegardes quotidiennes et leur trigger atomique. L’agrégat convient à un usage personnel modéré ; une future migration vers des tables indexées est préférable pour un historique très volumineux. Les modèles d’événements, tâches, objectifs, notes, sessions, widgets et paramètres sont distincts dans le code.

Les imports sont validés avant fusion. Les widgets doivent être uniques. L’import préserve les préférences et le minuteur courants ; la restauration complète rétablit les collections mais préserve les préférences système et arrête le minuteur. Une seule instance native peut fonctionner pour éviter les écritures concurrentes entre fenêtres.

## Frontières natives

Permissions déclarées par fenêtre dans `capabilities/default.json`. Pas de shell exposé au frontend. Les exports natifs utilisent un dialogue de fichier qui accorde l’accès au chemin choisi. Les notes n’interprètent pas le HTML brut. Une CSP bloque le contenu réseau dans la WebView de production.

Le backend musical n’accepte qu’une liste fermée d’actions. L’hôte et le port sont fixes, les redirections et proxies désactivés, le délai limité. Le frontend ne peut ni choisir une URL ni parcourir le système de fichiers du lecteur. Aucun identifiant externe ni secret n’est enregistré. Aucun serveur d’écoute n’est lancé par l’application.

## Dates et veille

Les dates civiles utilisent `yyyy-MM-dd`, le calendrier des semaines commence lundi. Les heures d’événements sont interprétées dans Europe/Paris via date-fns-tz. Le minuteur utilise une échéance en millisecondes Unix, pas un compteur dépendant de la fréquence des rafraîchissements. Son état est persisté et les sessions sont ajoutées en même temps que son effacement.

## Version 0.2
Le nom public est Focus Dashboard. L’identifiant de données reste stable. Le widget Objectifs est retiré ; son modèle historique reste lisible dans les sauvegardes. Les projets utilisent des commandes de lecture limitées au chemin racine choisi, avec contrôle du chemin canonique pour les sous-dossiers. L’ouverture lance uniquement l’Explorateur Windows. Les mesures utilisent un script PowerShell fixe, embarqué, exécuté sans fenêtre : aucune commande fournie par le frontend, et l’hôte du ping est validé. Les capteurs CPU sont facultatifs. Les albums proviennent des tags des playlists, sans création ni suppression de playlist. Les widgets sont directement déplaçables par leur en-tête et configurables dans les paramètres.
