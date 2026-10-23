import { invoke, isTauri } from "@tauri-apps/api/core";
import { z } from "zod";
const responseSchema = z.object({
  player: z.object({
    info: z.object({
      name: z.string(),
      version: z.string().optional(),
      pluginVersion: z.string().optional(),
    }),
    playbackState: z.enum(["playing", "paused", "stopped"]),
    activeItem: z
      .object({
        columns: z.array(z.string()).default([]),
        position: z.number().default(0),
        duration: z.number().default(0),
      })
      .nullish(),
    volume: z
      .object({
        type: z.string(),
        min: z.number(),
        max: z.number(),
        value: z.number(),
      })
      .optional(),
  }),
});
export interface MusicState {
  connected: boolean;
  message: string;
  player?: z.infer<typeof responseSchema>["player"];
}
export type MusicAction =
  "play-pause" | "previous" | "next" | "seek" | "volume";
export interface MusicProvider {
  status(): Promise<MusicState>;
  control?(action: MusicAction, value?: number): Promise<void>;
  artwork?(): Promise<string>;
  launch?(): Promise<void>;
  albums?(playlistId?: string): Promise<{ albums: Album[]; playlists: Playlist[]; truncated: boolean }>;
  playAlbum?(album: Pick<Album, "playlistId" | "index">): Promise<void>;
}
export interface Playlist { id: string; title: string; }
export interface Album {
  title: string;
  artist: string;
  playlistId: string;
  index: number;
  tracks: number;
  items: {
    title: string;
    duration: string;
    playlistId: string;
    index: number;
  }[];
}
export class BeefwebProvider implements MusicProvider {
  constructor(
    private request: (action: string, value?: number) => Promise<unknown> = (
      action,
      value,
    ) => invoke("music_request", { action, value }),
  ) {}
  async status(): Promise<MusicState> {
    try {
      const { player } = responseSchema.parse(await this.request("status"));
      if (!player.info.name.toLowerCase().includes("foobar"))
        throw Error("Le service détecté n’est pas foobar2000.");
      return {
        connected: true,
        message: `foobar2000 ${player.info.version || ""}`,
        player,
      };
    } catch (e) {
      return { connected: false, message: String(e) };
    }
  }
  async control(action: MusicAction, value?: number) {
    await this.request(action, value);
  }
  async launch() {
    await this.request("launch");
  }
  async albums(playlistId = "") {
    return invoke<{ albums: Album[]; playlists: Playlist[]; truncated: boolean }>("music_albums", { playlistId });
  }
  async playAlbum(album: Pick<Album, "playlistId" | "index">) {
    await invoke("music_play_album", {
      playlistId: album.playlistId,
      index: album.index,
    });
  }
  async artwork() {
    return z
      .string()
      .startsWith("data:image/")
      .parse(await this.request("artwork"));
  }
}
export class DisconnectedProvider implements MusicProvider {
  async status() {
    return {
      connected: false,
      message:
        "foobar2000 n’est pas connecté. Configurez un composant HTTP local pour activer le contrôle.",
    };
  }
}
export const musicProvider: MusicProvider = isTauri()
  ? new BeefwebProvider()
  : new DisconnectedProvider();
