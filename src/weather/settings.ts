import { z } from "zod";
export const locationSchema = z.object({ name: z.string().max(200), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) });
export const weatherDefaults = { location: null, mode: "day", unit: "celsius", animations: true, intensity: "subtle" } as const;
export const weatherSchema = z.object({
  location: locationSchema.nullable().default(null),
  mode: z.enum(["day", "three"]).default("day"),
  unit: z.enum(["celsius", "fahrenheit"]).default("celsius"),
  animations: z.boolean().default(true),
  intensity: z.enum(["subtle", "normal"]).default("subtle"),
}).default(weatherDefaults);
export type WeatherSettings = z.infer<typeof weatherSchema>;
export type Location = z.infer<typeof locationSchema>;
