# Playlists du widget Musique

Le menu « Playlist affichée » au-dessus du classement Albums / Artistes reprend les playlists existantes de foobar2000, par exemple Rap FR. « Toutes les playlists » affiche la bibliothèque complète. Choisir une playlist filtre les albums et artistes ; sélectionner un album affiche ses titres à gauche. Les pistes sans tag album sont regroupées sous « Sans album ».

Le choix est conservé dans `settings.musicPlaylist`, avec les autres préférences sauvegardées. Les caches de bibliothèque sont séparés par playlist. Le bouton d’actualisation recharge également les noms des playlists. Les playlists ne sont ni créées, ni modifiées par le dashboard.

Le scan est limité à 20 000 titres et affiche un avertissement si cette limite est atteinte. Une playlist supprimée reste sélectionnée jusqu’au choix d’une autre, avec une bibliothèque vide. Les contrôles de lecture continuent de commander foobar2000 ; changer le filtre n’interrompt pas le morceau en cours.

Fichiers modifiés : `src/components/Albums.tsx`, `src/widgets/Music.tsx`, `src/services/music.ts`, `src/models.ts`, `src/App.tsx` et `src-tauri/src/music.rs`. Aucun test exécuté à la demande de l’utilisateur.
