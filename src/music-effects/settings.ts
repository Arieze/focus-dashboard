import { z } from "zod";
export const musicEffectsDefaults = {
  enabled: true,
};
export const musicEffectsSchema = z
  .object({
    enabled: z.boolean().default(true),
  })
  .default(musicEffectsDefaults);
export type MusicEffectsSettings = z.infer<typeof musicEffectsSchema>;
