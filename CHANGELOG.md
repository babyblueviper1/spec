# Changelog

## v0.0.2 — September 2026

Response to design review in the Ethereum Magicians RFC thread. The headline:
the v0.0.1 closure claim was **falsified** by an executable counterexample
(@chugarchugarr) — an unspecified confidence-reduction step allowed two
conforming implementations to derive opposite remedies from identical frozen
observations. v0.0.2 adopts the resulting invariant: every outcome-relevant
value enters through an explicit result contract, and every outcome-relevant
transformation is committed in the manifest.

- **Confidence removed from the binding projection** (`confidence_threshold`
  deleted). Self-reported confidence is evidence-only — preserved in
  transcripts with zero contractual authority — per convergent thread
  feedback (@chugarchugarr, @cedricbrown, @babyblueviper1).
- **Ambiguity is now structural**: aggregation is fully parameterized as
  `within_judge: majority_with_dissent_cap` (declared `max_dissents`) and
  `across_panel: unanimous`. Any non-unanimous panel yields UNRESOLVED
  (@cedricbrown's split-rate proposal, taken to its strict limit).
- **UNRESOLVED is first-class** at run, judge, and requirement level, with
  declared `policy_on_unresolved` in @chugarchugarr's literal
  `policy(UNRESOLVED)` shape. v0.0.2 implements `resolve_against_burden`
  (*si non paret, absolvito*); `count_as_pass`, `count_as_fail`, and
  `escalate_to_default_outcome` are reserved, validator-refused, and open for
  contribution.
- **Judge Result Contract** (`spec/judge-result.schema.json`): authoritative
  result object, strict final-line parse rule, no salvage parsing;
  nonconforming runs are UNRESOLVED runs.
- **Normative state machine** (`spec/adjudication.md`) with the semantic
  conformance property: same manifest + same frozen observations ⇒ same
  authorized remedy across independent implementations.
- **Replay harness + regression fixtures** (`validator/src/replay.ts`,
  `validator/fixtures/`): fixture #1 is the falsifying observation set;
  tests assert outcome-invariance under adversarial permutation of
  (evidence-only) confidence values.
- **Evidence provenance** (new C15): non-trivial transformations require a
  `transformation_pin`; originals, transformed representations, and pins are
  preserved.
- **Universal judge liveness** (C5 revised): every manifest requires a
  fallback ladder, self-hosted judges included — a pinned hash pins a name,
  not continued availability (@cedricbrown).
- **REPRODUCED vs. VERIFIED trust vocabulary** adopted
  (@babyblueviper1); the spec explicitly disclaims byte-identical rerun
  expectations (per the batch-variance analysis of hosted inference).
- **ERC-8210 composition stub** (`arbitrator.erc8210_profile`, draft,
  non-normative): a manifest ruling as EvaluatorDispute attestation;
  `bonded_finality` compiling to an AAP JobAssurance.
- Scope language narrowed throughout: conforming ⇒ procedurally closed and
  executable; never ⇒ fair or correct.
- Hard version break: `spec_version` is `0.0.2`; v0.0.1 manifests are not
  accepted.

## v0.0.1 — August 2026

Initial public draft: manifest schema, conformance rules C1–C12, three
example manifests, reference conformance validator.
