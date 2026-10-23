import { describe, expect, it } from "vitest";
import { condition, localHour, uvLevel, cacheKey, forecastSchema } from "./data";
import { initialState, parseStoredState } from "../models";
describe("météo", () => {
  it("classe les limites UV sans arrondir le risque", () => {
    expect([0,2.9,3,5.9,6,7.9,8,10.9,11].map(x => uvLevel(x)?.label)).toEqual(["Faible","Faible","Modéré","Modéré","Élevé","Élevé","Très élevé","Très élevé","Extrême"]);
    expect(uvLevel(null)).toBeNull(); expect(uvLevel(-1)).toBeNull();
  });
  it("couvre les codes WMO et les données manquantes", () => {
    for (const code of [0,1,2,3,45,48,51,53,55,56,57,61,63,65,66,67,71,73,75,77,80,81,82,85,86,95,96,99]) expect(condition(code).icon).not.toBe("unknown");
    expect(condition(null).icon).toBe("unknown"); expect(condition(0, false).icon).toBe("moon"); expect(condition(0, false).effect).toBeUndefined();
  });
  it("utilise le fuseau choisi même autour de minuit et du changement d’heure", () => {
    expect(localHour("Asia/Tokyo",new Date("2026-10-16T16:20:00Z"))).toBe("2026-10-17T01:00");
    expect(localHour("Europe/Paris",new Date("2026-10-25T01:20:00Z"))).toBe("2026-10-25T02:00");
  });
  it("isole le cache par lieu et unité", () => {
    const a = { name: "Lieu", latitude: 1, longitude: 2 };
    expect(cacheKey(a,"celsius")).not.toBe(cacheKey(a,"fahrenheit"));
    expect(cacheKey(a,"celsius")).not.toBe(cacheKey({...a,latitude:3},"celsius"));
    expect(forecastSchema.safeParse({error:true}).success).toBe(false);
  });
  it("conserve les réglages et migre une ancienne sauvegarde", () => {
    const old = JSON.parse(JSON.stringify(initialState)); delete old.settings.weather;
    old.settings.widgets = old.settings.widgets.filter((w: {id:string}) => w.id !== "weather");
    const migrated = parseStoredState(old);
    expect(migrated.settings.weather.location).toBeNull();
    migrated.settings.weather = { location: {name:"Lyon",latitude:45.75,longitude:4.85},mode:"three",unit:"fahrenheit",animations:false,intensity:"normal" };
    expect(parseStoredState(JSON.parse(JSON.stringify(migrated))).settings.weather).toEqual(migrated.settings.weather);
  });
});
