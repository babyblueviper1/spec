# Adjudication: State Machine, Judge Result Contract, and Trust Vocabulary

*Normative for spec v0.0.2. This document exists because of the closure
counterexample presented by @chugarchugarr in the RFC thread: an
outcome-relevant transformation (confidence reduction) was left unspecified in
v0.0.1, allowing two conforming implementations to derive opposite remedies
from identical frozen observations. v0.0.2 adopts the resulting invariant:*

> **Every evaluation-produced value capable of altering aggregation,
> resolution, remedy selection, or contractual state MUST enter through an
> explicitly defined authoritative result contract, and every transformation
> of those authoritative values capable of altering the outcome MUST itself
> be committed by the procedure.**

## 1. The adjudication state machine

Each arrow is a distinct transformation. If an arrow can change contractual
state, its semantics are committed in the manifest. Nothing else has
contractual authority.

```
evidence (original + transformed + transformation_pin preserved)
  ↓
judge observation            (raw model output per run — evidence-only)
  ↓  parse rule (§2)
authoritative run result     (verdict ∈ {PASS, FAIL, UNRESOLVED})
  ↓  within-judge aggregation (majority_with_dissent_cap, declared max_dissents)
judge verdict                (PASS | FAIL | UNRESOLVED)
  ↓  across-panel aggregation (unanimous)
requirement verdict          (PASS | FAIL | UNRESOLVED)
  ↓  policy_on_unresolved (§3)
requirement resolution       (passed | not-passed)
  ↓  outcome_rule (all_must_pass | weighted_threshold)
contract outcome
  ↓  ruling_map
authorized remedy
  ↓  execution (out of scope for the manifest; see §5)
manifested consequence
```

**Semantic conformance property.** Given the same committed manifest and the
same complete run observations, two independent conforming implementations
MUST derive the same requirement resolutions, the same contract outcome, and
the same authorized remedy. The reference validator ships a replay harness
(`validator/src/replay.ts`) and regression fixtures that exercise this
property; fixture #1 is the falsifying observation set from the RFC thread.

## 2. The Judge Result Contract

The prompt constrains what the model is asked to say. The result contract
defines what implementations consume.

- Every evaluation prompt MUST instruct the model to end its output with a
  single line of strict JSON conforming to `spec/judge-result.schema.json`:

  ```json
  {"verdict": "PASS", "confidence": 0.92, "rationale": "..."}
  ```

- **Parse rule:** the final non-empty line of the model's raw output MUST
  parse as strict JSON conforming to the result schema. Any run violating
  this — no JSON, malformed JSON, schema-nonconforming JSON — is an
  **UNRESOLVED run**. There is no salvage parsing, no regex rescue, no
  "the model clearly meant PASS." Salvage heuristics are exactly the kind of
  unspecified outcome-relevant transformation this spec exists to eliminate.
- **Binding projection:** only `verdict` has contractual authority.
  `confidence`, `rationale`, and any other fields are **evidence-only**:
  preserved verbatim in the transcript for attribution, audit, and
  calibration research, with zero effect on aggregation, resolution, or
  remedy. This resolves v0.0.1's OQ4 as the RFC thread converged:
  self-reported confidence is poorly calibrated, and run-to-run disagreement
  is the sounder ambiguity signal — which aggregation now consumes directly.
- The full raw observation (complete model output, all runs, all judges) is
  preserved in the transcript. Nothing is discarded; authority is simply
  narrow.

## 3. UNRESOLVED and `policy_on_unresolved`

`UNRESOLVED` is a first-class verdict at every level (run, judge,
requirement). It records "the procedure could not establish this" without
converting that into the stronger claim "the challenger was right."

What an UNRESOLVED **requirement** resolves to is declared in the manifest
via `adjudication.policy_on_unresolved.policy`. The enum deliberately carries
the general shape (`policy(UNRESOLVED) → resolution`) proposed in the RFC
thread, but **v0.0.2 implements exactly one value**:

- **`resolve_against_burden`** *(implemented)*: the requirement resolves
  against the party bearing `burden_of_proof`. Payee bears the burden →
  an UNRESOLVED requirement counts as **not-passed** (zero weight under
  `weighted_threshold`; a failure under `all_must_pass`). Payer bears the
  burden → it counts as **passed**. This is the Roman default rendered
  executable: *si non paret, absolvito* — if it is not proven, absolve.

- `count_as_pass`, `count_as_fail`, `escalate_to_default_outcome`
  *(reserved)*: schema-known, validator-**refused** (conformance C13). A
  manifest declaring a reserved policy is not arbitrable in v0.0.2, because
  an unimplemented policy is not an executable procedure. These are open
  contribution surface: a PR implementing one must specify its complete
  state-transition semantics, extend the replay harness, and add fixtures.

Because unanimity is required across the panel (`across_panel: unanimous`),
any judge disagreement produces UNRESOLVED, and the burden allocation — not
an implementation's silent choice — decides the outcome. **This makes
`burden_of_proof` and `policy_on_unresolved` the most consequential fields
in the manifest.** Parties should negotiate them with the same care as price.

The contract-level `default_rule` remains as the declared floor for
contract-level indeterminacy that the manifest explicitly routes to it
(e.g. `on_missing_required_evidence: default_rule`). Under
`resolve_against_burden`, requirement-level ambiguity never reaches it.

## 4. Trust vocabulary: REPRODUCED vs. VERIFIED

Adopted from the RFC thread (@babyblueviper1):

- **REPRODUCED-shaped** claims are recomputable by any third party with zero
  trust: the manifest hash, the observation-bundle hash, the deterministic
  pipeline from frozen observations to authorized remedy (the replay harness
  recomputes this last one bit-for-bit).
- **VERIFIED-shaped** claims are attributable and tamper-evident but not
  independently re-derivable: that a specific committed run produced a
  specific observation. LLM judgment is not a pure function of its stated
  inputs — temperature 0 on hosted APIs does not guarantee determinism,
  because server-side batch composition changes floating-point reduction
  paths.

Consequences: the spec **disclaims byte-identical rerun expectations**. A
fresh rerun disagreeing with a frozen observation is not a violation of
anything; only disagreement with the **signed record** of what a committed
run actually said is. Reproducibility in v0.0.2 means auditability of the
pipeline over signed observations, not determinism of the model.

## 5. Scope boundary

Conformance establishes that the procedure is **complete, closed, and
executable** — never that it is fair, wise, or correct. Two parties can
deterministically agree to a bad rubric, a biased evidence transformation,
or a burden allocation one of them will regret. Execution of the authorized
remedy (escrow release, bond claim, stream halt) and its on-chain
manifestation are downstream of this spec: a consumer of a ruling should be
able to tell whether it is inheriting a judgment, an authorization, or an
observed state change, and this spec produces only the first two.
