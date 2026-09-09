# Conformance Rules (v0.0.2)

Structural validity against `procedure-manifest.schema.json` is **necessary but
not sufficient**. A manifest is **arbitrable** only if it also satisfies every
rule below. The reference validator enforces all of them; a manifest failing any
rule is *refused at formation time* — the refusal boundary, executable before
money moves.

Rules are stated as MUST requirements on the manifest. Rule ids are stable and
citable. Rules revised in v0.0.2 are marked.

| Id | Rule |
|----|------|
| **C1** | Exactly one party MUST have role `payer` and exactly one MUST have role `payee`. |
| **C2** | Every requirement with `evaluation.method = "measurement"` MUST reference, via `measurement_source_id`, a source declared in `measurement_sources`. |
| **C3** | Every requirement with `evaluation.method = "llm_judge"` MUST reference, via `judge_prompt_id`, a prompt declared in `judge.prompts` with `role = "evaluation"`. |
| **C4** | Every panel member's `runs` MUST be odd. *(Revised in v0.0.2: the odd-panel-under-majority clause is withdrawn — across-panel aggregation is unanimous-only, so panel size is unconstrained.)* |
| **C5** | *(Revised in v0.0.2 — now universal.)* `judge.fallback_ladder` MUST be present and non-empty for **every** manifest, regardless of hosting: pinned hashes pin a name, not continued availability, so every judge needs a liveness policy agreed at formation. Every ladder entry with `action = "substitute"` MUST include a pinned `substitute` (with `version`; with `weights_hash` if self-hosted). |
| **C6** | If `remedy.structure = "challenge_window_escrow"`, `challenge_window_seconds` MUST be present. If `"streaming"`, `stream` MUST be present. If `"bonded_finality"`, `bond` MUST be present. |
| **C7** | If `adjudication.default_rule.outcome = "split"`, `split_ratio_payer_bps` MUST be present. If `adjudication.outcome_rule.rule = "weighted_threshold"`, `weights` MUST cover every requirement id exactly, and `pass_threshold_bps` MUST be present. |
| **C8** | Every evidence item's `submitter_role` MUST correspond to at least one declared party with that role. Every requirement with `evaluation.method = "attestation"` MUST name, via `attestor_role_name`, a declared attestor party's `name`. |
| **C9** | `judge.sampling.temperature` MUST be `0`. |
| **C10** | If any requirement uses `llm_judge`, `adjudication.injection_screening.enabled` MUST be `true`. |
| **C11** | Every requirement MUST be supported by at least one evidence item (`supports` containing its id) **or** be a `measurement`/`attestation` requirement. Every evidence item of `type = "url"` supporting an `llm_judge` requirement MUST have `transformation = "render_screenshot"`. |
| **C12** | Every panel model (and every self-hosted substitute) with `hosting = "self_hosted"` MUST include `weights_hash`. No model `version` may be `"latest"` or empty. |
| **C13** | *(New in v0.0.2.)* `adjudication.policy_on_unresolved.policy` MUST be `"resolve_against_burden"`. The remaining enum values (`count_as_pass`, `count_as_fail`, `escalate_to_default_outcome`) are reserved: schema-known but **refused**, because an unimplemented policy is not an executable procedure. Implementations of reserved policies are welcome as contributions (see `spec/adjudication.md` §3). |
| **C14** | *(New in v0.0.2.)* Aggregation MUST be fully parameterized: `within_judge.rule = "majority_with_dissent_cap"` with `max_dissents` present and `max_dissents < runs / 2` for **every** panel judge (so a tolerated majority is always a strict majority); `across_panel.rule = "unanimous"`. |
| **C15** | *(New in v0.0.2.)* Every evidence item with `transformation != "none"` MUST include `transformation_pin` (pinned tool+version or content hash). An outcome-relevant transformation is part of the committed procedure; a deterministic judge over an unpinned, lossy, or adversarial transformation is not a closed procedure. |

## Semantic conformance (new in v0.0.2)

Static rules C1–C15 are checked against the manifest text. v0.0.2 adds a
**semantic** conformance property, checked by execution:

> Given the same committed manifest and the same complete run observations,
> two independent conforming implementations MUST derive the same requirement
> resolutions, the same contract outcome, and the same authorized remedy.

The reference validator ships a deterministic replay harness
(`validator/src/replay.ts`) implementing the normative state machine in
`spec/adjudication.md`, plus regression fixtures under `validator/fixtures/`.
Fixture #1 is the observation set that falsified v0.0.1's closure claim in the
RFC thread (an unspecified confidence-reduction step allowed mean vs. median to
flip the remedy). Under v0.0.2 the same observations produce a single
deterministic outcome, and the harness asserts the result is invariant under
permutation of the (now evidence-only) confidence values.

Independent implementations SHOULD run their pipelines against these fixtures;
divergence from the expected outcomes means an outcome-relevant transformation
remains outside the manifest, which is a bug in the implementation or a defect
report against this spec — both are welcome.

## Notes

- **C4/C9** exist because reproducibility in v0.0.2 is achieved by odd-run
  aggregation at temperature 0 with published transcripts — auditability, not
  bit-exactness. The spec explicitly disclaims byte-identical reruns; see
  `spec/adjudication.md` §4.
- **C5/C12** encode the pinning-vs-capability tradeoff and (as of v0.0.2) the
  model-retirement reality: liveness policies are universal.
- **C10/C11/C15** are the minimum injection-and-provenance posture: screening
  on, rendered (not raw) representation for rich remote content reaching an
  LLM judge, and pinned transformations with originals preserved.
- **Refusal semantics.** Formation-time refusal means the validator rejects the
  manifest before signing. If a defect is discovered post-signing, the
  arbitrator returns ERC-792 ruling 0 (`RefusedToArbitrate`) and funds follow
  `remedy.ruling_map.refused`.

## Anti-goals

Conformance does not certify that a rubric is *wise*, that prompts are
well-crafted, or that a burden allocation is *fair*. It certifies that the
procedure is complete, closed, and executable — that nothing essential to
rendering a decision is left undefined. **Conforming → procedurally closed and
executable; never → fair or correct.** Quality of clauses is the concern of a
reviewed clause library, which this spec enables but does not contain.
