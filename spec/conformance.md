# Conformance Rules (v0.0)

Structural validity against `procedure-manifest.schema.json` is **necessary but
not sufficient**. A manifest is **arbitrable** only if it also satisfies every
rule below. The reference validator enforces all of them; a manifest failing any
rule is *refused at formation time* — the refusal boundary, executable before
money moves.

Rules are stated as MUST requirements on the manifest. Rule ids are stable and
citable.

| Id | Rule |
|----|------|
| **C1** | Exactly one party MUST have role `payer` and exactly one MUST have role `payee`. |
| **C2** | Every requirement with `evaluation.method = "measurement"` MUST reference, via `measurement_source_id`, a source declared in `measurement_sources`. |
| **C3** | Every requirement with `evaluation.method = "llm_judge"` MUST reference, via `judge_prompt_id`, a prompt declared in `judge.prompts` with `role = "evaluation"`. |
| **C4** | Every panel member's `runs` MUST be odd. If `aggregation.across_panel = "majority"`, the panel size MUST be odd. |
| **C5** | If any panel model has `hosting = "provider_api"`, `judge.fallback_ladder` MUST be present and non-empty, and every ladder entry with `action = "substitute"` MUST include a pinned `substitute` (with `version`; with `weights_hash` if self-hosted). |
| **C6** | If `remedy.structure = "challenge_window_escrow"`, `challenge_window_seconds` MUST be present. If `"streaming"`, `stream` MUST be present. If `"bonded_finality"`, `bond` MUST be present. |
| **C7** | If `adjudication.default_rule.outcome = "split"`, `split_ratio_payer_bps` MUST be present. If `adjudication.outcome_rule.rule = "weighted_threshold"`, `weights` MUST cover every requirement id exactly, and `pass_threshold_bps` MUST be present. |
| **C8** | Every evidence item's `submitter_role` MUST correspond to at least one declared party with that role. Every requirement with `evaluation.method = "attestation"` MUST name, via `attestor_role_name`, a declared attestor party's `name`. |
| **C9** | `judge.sampling.temperature` MUST be `0`. |
| **C10** | If any requirement uses `llm_judge`, `adjudication.injection_screening.enabled` MUST be `true`. |
| **C11** | Every requirement MUST be supported by at least one evidence item (`supports` containing its id) **or** be a `measurement`/`attestation` requirement. Every evidence item of `type = "url"` supporting an `llm_judge` requirement MUST have `transformation = "render_screenshot"`. |
| **C12** | Every panel model (and every self-hosted substitute) with `hosting = "self_hosted"` MUST include `weights_hash`. No model `version` may be `"latest"` or empty. |

## Notes

- **C4/C9** exist because reproducibility in v0.0 is achieved by odd-run
  majority at temperature 0 with published transcripts — auditability, not
  bit-exactness.
- **C5/C12** encode the pinning-vs-capability tradeoff: provider-hosted models
  are permitted, but only with a signed fallback ladder; self-hosted models
  must be content-addressed.
- **C10/C11** are the minimum injection posture: screening on, and rendered
  (not raw) representation for rich remote content reaching an LLM judge.
- **Refusal semantics.** Formation-time refusal means the validator rejects the
  manifest before signing. If a defect is discovered post-signing, the
  arbitrator returns ERC-792 ruling 0 (`RefusedToArbitrate`) and funds follow
  `remedy.ruling_map.refused`.

## Anti-goals

Conformance does not certify that a rubric is *wise*, that prompts are
well-crafted, or that a fallback substitute is a *good* judge. It certifies that
the procedure is complete, closed, and executable — that nothing essential to
rendering a decision is left undefined. Quality of clauses is the concern of a
reviewed clause library, which this spec enables but does not contain.
