import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { animations } from "../src/companion/sprites.ts";
for (const root of ["public", "dist"]) {
  for (const a of Object.values(animations)) {
    const png = readFileSync(`${root}${a.file}`);
    assert.equal(png.readUInt32BE(16), a.width*a.durations.length, a.file);
    assert.equal(png.readUInt32BE(20), a.height, a.file);
  }
}
console.log("14 spritesheets: source and packaged PNG dimensions verified.");
