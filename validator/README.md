# Validator: Conformance + Semantic Replay

Two executables live here. The **conformance validator** checks a manifest
against the schema and rules C1–C15 (the static refusal boundary). The
**replay harness** executes the normative adjudication state machine over a
manifest plus frozen observations (the semantic conformance property). Both
are deterministic; both are the reference implementations for
`spec/conformance.md` and `spec/adjudication.md`.

## Setup

```bash
cd validator
npm install          # Node >= 20
```

## Manual validation walkthrough

Every step lists its expected result. If you see something else, that is
either a bug here or a defect in the spec — both are reportable.

**Step 1 — the test suite.**

```bash
npm test
```

Expected: `ALL TESTS PASSED` (exit 0), covering four groups: static
conformance of the examples, semantic replay fixtures, the
confidence-invariance property, and the v0.0.3 draft acquisition-boundary
fixtures (`fixtures/v0.0.3/`, not yet spec text; see its README).

**Step 2 — conforming manifests are accepted.**

```bash
npm run validate ../examples/website-delivery.manifest.json ../examples/data-feed-sla.manifest.json
```

Expected: both report `CONFORMS — arbitrable under spec v0.0.2` (exit 0).

**Step 3 — the refusal boundary refuses, with reasons.**

```bash
npm run validate ../examples/nonconforming-pmf-milestone.manifest.json
```

Expected: `REFUSED — 14 defect(s)`, exit 1, with a defect list matching
`examples/WHY-NONCONFORMING.md` line for line.

**Step 4 — the closure counterexample resolves deterministically.**

This is the observation set that falsified v0.0.1 in the RFC thread (an
unspecified confidence-reduction let mean-vs-median flip the remedy between
release and refund):

```bash
npm run replay ../examples/website-delivery.manifest.json fixtures/closure-counterexample.observations.json
```

Expected: JSON output ending in `"contractOutcome": "payer_wins"` and
`"authorizedRemedy": "refund"`, with `R1: "UNRESOLVED"` in
`requirementVerdicts` — J1's 3–2 split exceeds the declared dissent cap, the
panel is non-unanimous, and the payee-side burden resolves R1 not-passed.
Confidence values play no role: run `npm test` and note the
confidence-permutation test, which adversarially rewrites every confidence
value (including the exact ones that flipped v0.0.1) and asserts the outcome
is unchanged.

**Step 5 — the parse rule and burden allocation.**

```bash
npm run replay ../examples/data-feed-sla.manifest.json fixtures/parse-rule.observations.json
```

Expected: `R4: "UNRESOLVED"` (one clean result-contract line, one prose run,
one schema-nonconforming run — the latter two are UNRESOLVED with no salvage
parsing), yet `"contractOutcome": "payee_wins"` / `"resume_stream"`: this
manifest allocates the burden to the payer alleging breach, so the unproven
claim resolves for the payee. *Si non paret, absolvito.* Compare with Step 4,
where the burden sits with the payee — the two fixtures together demonstrate
that burden allocation, not implementation choice, decides ambiguous outcomes.

**Step 6 (optional) — falsify us.**

Write your own observation bundle against either example manifest (format
documented at the top of `src/replay.ts`), run it through `npm run replay`,
and check whether any implementation choice of yours could produce a different
authorized remedy from the same inputs. If you find one, an outcome-relevant
transformation has escaped the manifest: please open an issue with the bundle
attached — that is precisely the class of contribution that produced v0.0.2.

## Files

| Path | Role |
|---|---|
| `src/cli.ts` | Conformance CLI (`npm run validate`) |
| `src/conformance.ts` | Static rules C1–C15 |
| `src/replay.ts` | Normative state-machine executor |
| `src/replay-cli.ts` | Replay CLI (`npm run replay`) |
| `src/test.ts` | Test suite (`npm test`) |
| `fixtures/*.observations.json` | Frozen-observation regression fixtures with expected outcomes |
