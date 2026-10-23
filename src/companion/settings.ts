import { z } from "zod";

export const companionDefaults = {
  enabled: true,
  model: "deymoon" as const,
  size: "normal" as const,
  random: true,
  reactions: true,
};
export const companionSchema = z
  .object({
    enabled: z.boolean().default(true),
  })
  .default(companionDefaults)
  .transform((value) => ({ ...companionDefaults, enabled: value.enabled }));
export type CompanionSettings = z.infer<typeof companionSchema>;
export const scales = { small: 1, normal: 2, large: 3 };
