import { useEffect, useRef, useState } from "react";
import { RefreshCw, Disc3 } from "lucide-react";
import Select from "./Select";
import { musicProvider, type Album, type Playlist } from "../services/music";
export default function Albums({
  connected,
  playlistId,
  onPlaylistChange,
  onSelect,
  currentAlbum,
  currentArtist,
}: {
  connected: boolean;
  onSelect: (album: Album | null) => void;
  playlistId: string;
  onPlaylistChange: (id: string) => void;
  currentAlbum: string;
  currentArtist: string;
}) {
  const [albums, setAlbums] = useState<Album[]>(() => {
      try {
        const data = JSON.parse(
          localStorage.getItem("focus-music-library:v2:" + playlistId) || "[]",
        );
        return Array.isArray(data)
          ? data.filter(
              (a) =>
                typeof a.title === "string" &&
                typeof a.artist === "string" &&
                Array.isArray(a.items) &&
                a.items.every(
                  (t: Album["items"][number]) =>
                    typeof t.title === "string" &&
                    typeof t.duration === "string" &&
                    typeof t.playlistId === "string" &&
                    typeof t.index === "number",
                ),
            )
          : [];
      } catch {
        return [];
      }
    }),
    [playlists, setPlaylists] = useState<Playlist[]>([]),
    [loadedPlaylist, setLoadedPlaylist] = useState(playlistId),
    [grouping, setGrouping] = useState("albums"),
    [artist, setArtist] = useState(""),
    [search, setSearch] = useState(""),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [truncated, setTruncated] = useState(false);
  useEffect(() => {
    if (!connected || !musicProvider.albums) return;
    let disposed = false;
    setLoading(true);
    setError("");
    void musicProvider
      .albums(playlistId)
      .then((data) => {
        if (!disposed) {
          setAlbums(data.albums);
          setLoadedPlaylist(playlistId);
          setPlaylists(data.playlists);
          try {
            localStorage.setItem(
              "focus-music-library:v2:" + playlistId,
              JSON.stringify(data.albums),
            );
          } catch {
            /* Cache is optional. */
          }
          setTruncated(data.truncated);
          setError("");
        }
      })
      .catch((e) => {
        if (!disposed) setError(String(e));
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, [connected, revision, playlistId]);
  const selectionInitialized = useRef(false);
  const followedAlbum = useRef("");
  const requestedAlbum = useRef("");
  useEffect(() => {
    if (loadedPlaylist !== playlistId) return;
    const key = JSON.stringify([playlistId, currentAlbum, currentArtist]);
    if (connected && currentAlbum && key !== followedAlbum.current) {
      const matches = albums.filter((a) => a.title === currentAlbum);
      const album =
        matches.find((a) => a.artist === currentArtist) ||
        (matches.length === 1 ? matches[0] : undefined);
      if (album) {
        followedAlbum.current = key;
        selectionInitialized.current = true;
        onSelect(album);
        return;
      }
      // Refresh once when playback reaches an album added since the last scan.
      if (!loading && musicProvider.albums && requestedAlbum.current !== key) {
        requestedAlbum.current = key;
        setRevision((n) => n + 1);
      }
    }
    if (!selectionInitialized.current && albums[0]) {
      selectionInitialized.current = true;
      onSelect(albums[0]);
    }
  }, [albums, currentAlbum, currentArtist, connected, loading, onSelect, playlistId, loadedPlaylist]);
  const visibleAlbums = loadedPlaylist === playlistId ? albums : [];
  const query = search.trim().toLocaleLowerCase("fr");
  const matchingAlbums = visibleAlbums.filter((album) =>
    (!artist || query || album.artist === artist) &&
    (!query ||
      album.title.toLocaleLowerCase("fr").includes(query) ||
      album.artist.toLocaleLowerCase("fr").includes(query) ||
      album.items.some((song) => song.title.toLocaleLowerCase("fr").includes(query))),
  );
  return (
    <aside className="album-library">
      <div className="section-line">
        <strong>
          Bibliothèque <small>{visibleAlbums.length || ""}</small>
        </strong>
        <button
          title="Actualiser les albums"
          disabled={!connected || loading}
          onClick={() => setRevision((n) => n + 1)}
        >
          <RefreshCw size={14} />
        </button>
      </div>
      <Select
        aria-label="Playlist affichée"
        value={playlistId}
        onChange={(e) => {
          selectionInitialized.current = false;
          followedAlbum.current = "";
          requestedAlbum.current = "";
          setArtist("");
          setSearch("");
          onSelect(null);
          onPlaylistChange(e.target.value);
        }}
      >
        <option value="">Toutes les playlists</option>
        {playlistId && !playlists.some(p => p.id === playlistId) && <option value={playlistId}>Playlist enregistrée</option>}
        {playlists.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
      </Select>
      <Select
        aria-label="Classer la musique"
        value={grouping}
        onChange={(e) => {
          setGrouping(e.target.value);
          setArtist("");
        }}
      >
        <option value="albums">Albums</option>
        <option value="artists">Artistes</option>
      </Select>
      {artist && <button onClick={() => setArtist("")}>← {artist}</button>}
      <input
        aria-label="Rechercher un album, un artiste ou un titre"
        placeholder="Rechercher…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="album-list">
        {grouping === "artists" && !artist && !query
          ? [...new Set(visibleAlbums.map((a) => a.artist))]
              .sort((a, b) => a.localeCompare(b, "fr"))
              .filter((a) => a.toLowerCase().includes(search.toLowerCase()))
              .map((a) => (
                <button
                  className="album-item"
                  key={a}
                  onClick={() => {
                    setArtist(a);
                    setSearch("");
                  }}
                >
                  <Disc3 size={17} />
                  <span>
                    <strong>{a || "Artiste inconnu"}</strong>
                    <small>
                      {visibleAlbums.filter((album) => album.artist === a).length}{" "}
                      albums
                    </small>
                  </span>
                </button>
              ))
          : matchingAlbums
              .map((a) => (
                <button
                  className="album-item"
                  key={a.title + "|" + a.artist}
                  title={"Afficher les titres de " + a.title}
                  onClick={() => onSelect(a)}
                >
                  <Disc3 size={17} />
                  <span>
                    <strong>{a.title}</strong>
                    <small>
                      {a.artist} · {a.tracks} titres
                    </small>
                  </span>
                </button>
              ))}
      </div>
      {!loading && query && visibleAlbums.length > 0 && matchingAlbums.length === 0 && (
        <p className="empty">Aucun album trouvé pour cette recherche.</p>
      )}
      {loading && <p className="empty">Chargement…</p>}
      {!loading && !visibleAlbums.length && !error && (
        <p className="empty">
          {connected
            ? playlistId ? "Aucun titre dans cette playlist, ou playlist supprimée." : "Aucun album dans les playlists."
            : "Connexion à la bibliothèque…"}
        </p>
      )}
      {truncated && <small>Limite de 20 000 titres atteinte.</small>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </aside>
  );
}
