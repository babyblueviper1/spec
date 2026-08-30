# Why `nonconforming-pmf-milestone.manifest.json` Is Refused

This manifest is the canonical hard case: an investor agent funding a venture
agent against a "product-market fit" milestone. It is deliberately written the
way such a clause would naively be written — and it is refused at formation
time, *before* $250,000 moves. Each defect below is a real design lesson, not a
formality. Rule ids reference `spec/conformance.md`.

## The defects

**R1 has no agreed evaluation prompt (C3).** `method: llm_judge` with no
`judge_prompt_id`. There is no procedure the parties signed for how "product-market
fit signals" gets judged — which means the judgment would be improvised at
dispute time, which is exactly what this spec exists to prevent. (Even if a
prompt were referenced, note P1's instruction to use "any knowledge you have
about the venture and current market conditions" — that reaches outside the
closed record. The spec's placeholder grammar makes outside knowledge
structurally inexpressible, but a prompt inviting it is a clause-quality smell
the eventual clause library should reject.)

**R2 names no measurement source (C2).** "Strong momentum" in MRR, measured by
whom, over what window, in what units? There is no `measurement_source_id`, and
no `measurement_sources` section at all. A factual requirement without a named
door in the closed record is unanswerable.

**The judge is unpinned (C12).** `version: "latest"` of
`best-available-frontier-model` is not a judge; it is a promise to improvise
one later. Whatever model resolves this dispute in month 18 is not the model
anyone signed.

**Provider-hosted model with an empty fallback ladder (C5).** Even if the model
were pinned, it is `provider_api`-hosted with no agreed answer to deprecation.

**Even run count (C4).** `runs: 4` can tie. Majority aggregation requires odd.

**Temperature is not 0 (C9).** `0.7` makes the verdict a sample, not a ruling.

**Injection screening disabled with an LLM-judged requirement (C10).** E1 is a
payee-controlled deck being read by a judge with screening off.

**Raw URL evidence into an LLM judge (C11).** E1 is `type: url` with
`transformation: none` supporting R1. The judge would ingest arbitrary live
content controlled by the interested party. Conformance requires
`render_screenshot`.

**Undeclared submitter (C8).** E2 is submitted by role `attestor`, but no
attestor party is declared. An "advisor memo" from a party who never signed the
manifest is not admissible evidence; it is hearsay with a filename.

**Split default with no ratio (C7).** `default_rule.outcome: "split"` without
`split_ratio_payer_bps`. "We'll split it somehow" is not a default rule.

**Missing challenge window (C6).** `challenge_window_escrow` with no
`challenge_window_seconds`: the remedy structure is named but not parameterized.

## The lesson

None of these defects make the *deal* bad. They make it **unadjudicable as
written** — and the refusal boundary's job is to say so while it is still cheap
to fix. The conforming path for this exact deal is to decompose "product-market
fit" into proxies the parties actually accept: e.g., MRR from a named revenue
attestor (Stripe-style read-only oracle), retention cohorts from a named
analytics source with a defined query, pinned judges for any residual
qualitative requirement, an odd panel at temperature 0, screening on,
render-then-judge for the deck, a declared attestor if the advisor's view
matters, and an explicit default rule for the genuinely ambiguous residue.

If the parties cannot agree on those proxies, the refusal has told them
something true: they do not yet have an agreement about what the milestone
means — and they should learn that before the tranche moves, not after.
