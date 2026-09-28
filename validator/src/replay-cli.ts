#!/usr/bin/env tsx
/** pm-replay <manifest.json> <observations.json> — deterministic pipeline from
 *  frozen observations to authorized remedy (spec/adjudication.md). */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { replay } from "./replay.ts";

const [mPath, oPath] = process.argv.slice(2);
if (!mPath || !oPath) { console.error("usage: pm-replay <manifest.json> <observations.json>"); process.exit(2); }
const manifest = JSON.parse(readFileSync(resolve(mPath), "utf8"));
const observations = JSON.parse(readFileSync(resolve(oPath), "utf8"));
const out = replay(manifest, observations);
console.log(JSON.stringify(out, null, 2));
