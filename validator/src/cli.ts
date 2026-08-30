#!/usr/bin/env tsx
/**
 * pm-validate <manifest.json> [...more]
 *
 * Verdict per file:
 *   CONFORMS — structurally valid AND passes conformance rules C1-C12.
 *   REFUSED  — anything else, with a defect list.
 *
 * Exit code: 0 if all inputs conform, 1 otherwise.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
const addFormats = (addFormatsModule as any).default ?? addFormatsModule;
import { checkConformance, type Defect } from "./conformance.ts";

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(here, "../../spec/procedure-manifest.schema.json");
const schema = JSON.parse(readFileSync(schemaPath, "utf8"));

const ajv = new (Ajv2020 as any)({ allErrors: true, strict: false });
addFormats(ajv as any);
const validateStructure = ajv.compile(schema);

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: pm-validate <manifest.json> [...more]");
  process.exit(2);
}

let anyRefused = false;

for (const file of files) {
  let manifest: unknown;
  console.log(`\n=== ${file}`);
  try {
    manifest = JSON.parse(readFileSync(resolve(file), "utf8"));
  } catch (err: any) {
    console.log(`REFUSED — unreadable or invalid JSON: ${err?.message}`);
    anyRefused = true;
    continue;
  }

  const structuralDefects: Defect[] = [];
  if (!validateStructure(manifest)) {
    for (const e of validateStructure.errors ?? []) {
      structuralDefects.push({
        rule: "SCHEMA",
        message: `${e.instancePath || "/"} ${e.message ?? ""}`.trim(),
      });
    }
  }

  const conformanceDefects = checkConformance(manifest);
  const defects = [...structuralDefects, ...conformanceDefects];

  if (defects.length === 0) {
    console.log("CONFORMS — arbitrable under spec v0.0");
  } else {
    anyRefused = true;
    console.log(`REFUSED — ${defects.length} defect(s):`);
    for (const d of defects) console.log(`  [${d.rule}] ${d.message}`);
  }
}

process.exit(anyRefused ? 1 : 0);
