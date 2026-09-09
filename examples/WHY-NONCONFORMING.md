# Why `nonconforming-pmf-milestone.manifest.json` Is Refused

This manifest is the canonical hard case: an investor agent funding a venture
agent against a "product-market fit" milestone. It is deliberately written the
way such a clause would naively be written — and it is refused at formation
time, *before* $250,000 moves, with **14 defects**. Each is a real design
lesson. Rule ids reference `spec/conformance.md`; run it yourself:

```bash
cd validator && npm install && npm run validate ../examples/nonconforming-pmf-milestone.manifest.json
```

## The defects (in validator output order)

**[SCHEMA] `/adjudication` must NOT have additional properties.** The manifest
still carries `confidence_threshold`, which v0.0.2 removed: self-reported
confidence has no contractual authority (see `spec/adjudication.md` §2 and the
RFC-thread closure counterexample that forced this). A field the spec no longer
defines is a field whose semantics nobody committed to.

**[C3] R1 has no agreed evaluation prompt.** `method: llm_judge` with no
`judge_prompt_id`: there is no procedure the parties signed for how
"product-market fit signals" gets judged — it would be improvised at dispute
time, which is exactly what this spec exists to prevent. (P1's text also
invites the judge to use "any knowledge you have about the venture" — reaching
outside the closed record is a clause-quality smell even where it isn't a
conformance defect.)

**[C2] R2 names no measurement source.** "Strong momentum" in MRR — measured
by whom, over what window, in what units? A factual requirement without a
named door in the closed record is unanswerable.

**[C4] Even run count.** `runs: 4` cannot produce a clean strict majority
with a dissent cap. Odd runs only.

**[C5] Empty fallback ladder.** v0.0.2 makes liveness universal: a pinned
hash pins a name, not continued availability. Every judge — self-hosted
included — needs a deprecation/unavailability policy agreed at formation.

**[C6] Missing challenge window.** `challenge_window_escrow` is named but not
parameterized.

**[C7] Split default with no ratio.** "We'll split it somehow" is not a
default rule.

**[C8] Undeclared submitter.** E2 is an "advisor memo" from an `attestor`
role no declared party holds: hearsay with a filename.

**[C9] Temperature is not 0.** `0.7` makes the verdict a sample, not a ruling.

**[C10] Injection screening disabled** while a payee-controlled deck feeds an
LLM judge.

**[C11] Raw URL evidence into an LLM judge.** E1 is `type: url` with
`transformation: none`: the judge would ingest arbitrary live content
controlled by the interested party. Conformance requires
`render_screenshot` (and C15 would then require a `transformation_pin`).

**[C12] The judge is unpinned.** `version: "latest"` of
`best-available-frontier-model` is not a judge; it is a promise to improvise
one later.

**[C13] Reserved unresolved-policy.** `policy_on_unresolved: count_as_pass`
is schema-known but not implemented in v0.0.2 — and an unimplemented policy is
not an executable procedure, so the manifest is refused rather than silently
reinterpreted. (`resolve_against_burden` is the implemented v0.0.2 policy;
implementations of the reserved values are welcome as contributions.)

**[C14] Dissent cap defeats the majority.** `max_dissents: 2` with `runs: 4`
means a "majority" could be tolerated that isn't strict. The cap must satisfy
`max_dissents < runs/2`.

## The lesson

None of these defects make the *deal* bad. They make it **unadjudicable as
written** — and the refusal boundary's job is to say so while it is still
cheap to fix. The conforming path for this exact deal: decompose
"product-market fit" into proxies the parties actually accept (MRR from a
named revenue attestor, retention cohorts from a named analytics source with a
defined query), pin the judges, odd runs at temperature 0 with a declared
dissent cap and unanimous panel rule, screening on, render-then-judge for the
deck with a pinned transformation, a declared attestor if the advisor's view
matters, an explicit burden allocation — and accept that under
`resolve_against_burden`, whoever bears the burden loses the genuinely
ambiguous residue. If the parties cannot agree on those terms, the refusal has
told them something true: they do not yet have an agreement about what the
milestone means — better learned before the tranche moves than after.
