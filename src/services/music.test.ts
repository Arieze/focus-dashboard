import { it, expect, vi } from "vitest";
import { BeefwebProvider } from "./music";
it("convertit une panne en état déconnecté", async () => {
  const provider = new BeefwebProvider(async () => {
    throw Error("indisponible");
  });
  expect((await provider.status()).connected).toBe(false);
});
it("rejette une réponse HTTP de format inattendu", async () => {
  const provider = new BeefwebProvider(async () => ({ hello: true }));
  expect((await provider.status()).connected).toBe(false);
});
it("lit les métadonnées réelles et transmet les commandes", async () => {
  const request = vi.fn(async () => ({
    player: {
      info: { name: "foobar2000", version: "2" },
      playbackState: "playing",
      activeItem: {
        columns: ["Test", "Artiste", "Album"],
        position: 10,
        duration: 60,
      },
    },
  }));
  const provider = new BeefwebProvider(request);
  expect((await provider.status()).player?.activeItem?.columns[0]).toBe("Test");
  await provider.control("seek", 25);
  expect(request).toHaveBeenLastCalledWith("seek", 25);
});
