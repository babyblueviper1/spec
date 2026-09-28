#!/usr/bin/env tsx
/**
 * Test suite: static conformance expectations, semantic replay fixtures, and
 * the confidence-invariance property (evidence-only fields cannot move outcomes).
 * Run: npm test   (exit 0 = all green)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import assert from "node:assert/strict";
import Ajv2020 from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { checkConformance } from "./conformance.ts";
import { replay, type Verdict } from "./replay.ts";

const addFormats = (addFormatsModule as any).default ?? addFormatsModule;
const here = dirname(fileURLToPath(import.meta.url));
const load = (p: string) => JSON.parse(readFileSync(resolve(here, p), "utf8"));

const schema = load("../../spec/procedure-manifest.schema.json");
const ajv = new (Ajv2020 as any)({ allErrors: true, strict: false });
addFormats(ajv as any);
const validateStructure = ajv.compile(schema);

let failures = 0;
const check = (name: string, fn: () => void) => {
  try { fn(); console.log(`  ok: ${name}`); }
  catch (e: any) { failures++; console.error(`FAIL: ${name}\n      ${e?.message}`); }
};

// ---------- 1. Static conformance expectations ----------
console.log("[1/3] static conformance");
const website = load("../../examples/website-delivery.manifest.json");
const datafeed = load("../../examples/data-feed-sla.manifest.json");
const noncon = load("../../examples/nonconforming-pmf-milestone.manifest.json");

check("website-delivery conforms (schema)", () => assert.ok(validateStructure(website), JSON.stringify(validateStructure.errors)));
check("website-delivery conforms (rules)", () => assert.deepEqual(checkConformance(website), []));
check("data-feed-sla conforms (schema)", () => assert.ok(validateStructure(datafeed), JSON.stringify(validateStructure.errors)));
check("data-feed-sla conforms (rules)", () => assert.deepEqual(checkConformance(datafeed), []));
check("nonconforming example is refused", () => {
  const schemaBad = !validateStructure(noncon);
  const defects = checkConformance(noncon);
  assert.ok(schemaBad || defects.length > 0, "expected refusal");
  const rules = new Set(defects.map((d) => d.rule));
  for (const expected of ["C2", "C3", "C4", "C5", "C9", "C10", "C11", "C8", "C7", "C6", "C13", "C14"])
    assert.ok(rules.has(expected), `expected defect ${expected}; got ${[...rules].join(",")}`);
});

// ---------- 2. Semantic replay fixtures ----------
console.log("[2/3] semantic replay fixtures");
const fixtures: Array<[string, any]> = [
  ["closure-counterexample", website],
  ["parse-rule", datafeed],
];
for (const [name, manifest] of fixtures) {
  const fx = load(`../fixtures/${name}.observations.json`);
  check(`fixture ${name}: expected outcome`, () => {
    const out = replay(manifest, fx);
    assert.deepEqual(out.requirementVerdicts, fx.expected.requirementVerdicts);
    assert.equal(out.contractOutcome, fx.expected.contractOutcome);
    assert.equal(out.authorizedRemedy, fx.expected.authorizedRemedy);
  });
}

// ---------- 3. Confidence-invariance property ----------
console.log("[3/3] confidence invariance (evidence-only fields cannot move outcomes)");
check("closure fixture outcome is invariant under confidence permutation", () => {
  const fx = load("../fixtures/closure-counterexample.observations.json");
  const base = replay(website, fx);
  // Adversarially rewrite every confidence value, including the exact values
  // that flipped the v0.0.1 outcome under mean-vs-median reduction.
  const mutated = JSON.parse(JSON.stringify(fx));
  const perturb = [0.0, 1.0, 0.5, 0.7, 0.71, 0.69];
  let i = 0;
  for (const req of Object.values<any>(mutated.requirements)) {
    for (const [k, runs] of Object.entries<any>(req)) {
      if (k === "__direct__" || !Array.isArray(runs)) continue;
      for (const run of runs) if ("confidence" in run) run.confidence = perturb[i++ % perturb.length];
    }
  }
  const after = replay(website, mutated);
  assert.deepEqual(after.requirementVerdicts, base.requirementVerdicts);
  assert.equal(after.contractOutcome, base.contractOutcome);
  assert.equal(after.authorizedRemedy, base.authorizedRemedy);
});

console.log(failures === 0 ? "\nALL TESTS PASSED" : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
