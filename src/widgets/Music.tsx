import {
  Music2,
  Radio,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RefreshCw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Albums from "../components/Albums";
import MusicParticles from "../music-effects/MusicParticles";
import type { MusicEffectsSettings } from "../music-effects/settings";
import { emitCompanionEvent } from "../companion/events";
import {
  musicProvider,
  type MusicState,
  type Album,
  type MusicAction,
} from "../services/music";
const time = (n: number) =>
  `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
export default function Music({ effects, playlistId, onPlaylistChange }: { effects: MusicEffectsSettings; playlistId: string; onPlaylistChange: (id: string) => void }) {
  const [state, setState] = useState<MusicState>({
      connected: false,
      message: "Vérification du lecteur…",
    }),
    [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null),
    [art, setArt] = useState(""),
    [error, setError] = useState("");
  const track = useRef("");
  const playback = useRef("");
  const lastConnectAttempt = useRef(0);
  const refresh = async () => {
    const s = await musicProvider.status();
    setState(s);
    if (s.player?.playbackState === "playing" && playback.current !== "playing")
      emitCompanionEvent("music-playing");
    playback.current = s.player?.playbackState || "";
    if (
      !s.connected &&
      musicProvider.launch &&
      Date.now() - lastConnectAttempt.current > 30000
    ) {
      lastConnectAttempt.current = Date.now();
      try {
        await musicProvider.launch();
      } catch (e) {
        setError(String(e));
      }
    }
    if (s.connected) setError("");
    const key = JSON.stringify(s.player?.activeItem?.columns || []);
    if (!s.connected) setArt("");
    if (key !== track.current) {
      track.current = key;
      setArt("");
      if (s.connected && musicProvider.artwork)
        void musicProvider
          .artwork()
          .then(setArt)
          .catch(() => {});
    }
  };
  useEffect(() => {
    let disposed = false;
    let timeout: ReturnType<typeof setTimeout>;
    const poll = async () => {
      await refresh();
      if (!disposed) timeout = setTimeout(() => void poll(), 3000);
    };
    void poll();
    return () => {
      disposed = true;
      clearTimeout(timeout);
    };
  }, []);
  const control = async (action: MusicAction, value?: number) => {
    try {
      await musicProvider.control?.(action, value);
      setError("");
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  };
  const p = state.player,
    item = p?.activeItem;
  return (
    <div className="music-columns">
      <div className="music-player">
        <div className="music-layout">
          <div className="music-cover">
            <div className="album">
              {art ? (
                <img
                  src={art}
                  alt="Pochette de l’album"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: 12,
                  }}
                />
              ) : (
                <Music2 size={34} />
              )}
            </div>
            <MusicParticles
              playback={
                state.connected ? p?.playbackState || "stopped" : "stopped"
              }
              track={JSON.stringify(item?.columns || [])}
              settings={effects}
            />
          </div>
          <div className="grow">
            <h3 className="now-playing-title">
              {state.connected
                ? item?.columns[0] || "Aucune piste en lecture"
                : "Musique"}
            </h3>
            <p className="hint">
              {state.connected ? (
                `${item?.columns[1] || ""}${item?.columns[2] ? " · " + item.columns[2] : ""}`
              ) : (
                <span title={state.message}>Connexion à la bibliothèque…</span>
              )}
            </p>
            <span className="status" title={state.message}>
              <Radio size={12} />
              {state.connected ? "Connecté" : "Déconnecté"}
            </span>
          </div>
          {!state.connected && (
            <button
              title="Réessayer la connexion"
              onClick={() => void refresh()}
            >
              <RefreshCw size={17} />
            </button>
          )}
        </div>
        {state.connected && (
          <>
            <div className="section-line">
              <button
                title="Piste précédente"
                onClick={() => void control("previous")}
              >
                <SkipBack size={18} />
              </button>
              <button
                title="Lecture ou pause"
                onClick={() => void control("play-pause")}
              >
                {p?.playbackState === "playing" ? (
                  <Pause size={19} />
                ) : (
                  <Play size={19} />
                )}
              </button>
              <button
                title="Piste suivante"
                onClick={() => void control("next")}
              >
                <SkipForward size={18} />
              </button>
              {item && item.duration > 0 && (
                <>
                  <small>{time(item.position)}</small>
                  <input
                    className="grow"
                    aria-label="Position de lecture"
                    type="range"
                    min={0}
                    max={item.duration || 1}
                    value={item.position}
                    onChange={(e) =>
                      void control("seek", Number(e.target.value))
                    }
                  />
                  <small>{time(item.duration)}</small>
                </>
              )}
            </div>
            {p?.volume?.type === "db" && (
              <label className="check">
                Volume
                <input
                  aria-label="Volume musical"
                  type="range"
                  min={p.volume.min}
                  max={p.volume.max}
                  value={p.volume.value}
                  onChange={(e) =>
                    void control("volume", Number(e.target.value))
                  }
                />
              </label>
            )}
          </>
        )}
        {selectedAlbum ? (
          <section className="album-tracks" aria-label="Titres de l’album">
            <strong>{selectedAlbum.title}</strong>
            <div className="track-list" key={JSON.stringify([selectedAlbum.title, selectedAlbum.artist])}>
              {selectedAlbum.items.map((song, index) => (
                <button
                  key={song.playlistId + ":" + song.index}
                  className={
                    song.title === item?.columns[0] &&
                    selectedAlbum.title === item?.columns[2]
                      ? "track-row active"
                      : "track-row"
                  }
                  disabled={!state.connected}
                  onClick={async () => {
                    try {
                      await musicProvider.playAlbum?.(song);
                      await refresh();
                      setError("");
                    } catch (e) {
                      setError(String(e));
                    }
                  }}
                >
                  <small>{index + 1}</small>
                  <span>{song.title}</span>
                  <small>{song.duration}</small>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="album-tracks">
            <p className="empty">
              Sélectionnez un album à droite pour afficher ses titres.
            </p>
          </section>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </div>
      <Albums
        playlistId={playlistId}
        onPlaylistChange={onPlaylistChange}
        connected={state.connected}
        onSelect={setSelectedAlbum}
        currentAlbum={item?.columns[2] || ""}
        currentArtist={item?.columns[3] || item?.columns[1] || ""}
      />
    </div>
  );
}
