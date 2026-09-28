# The Adjudication Gap in Agent Commerce

*Status: draft v0.0 — for design review. Comments and dissent actively sought.*

## 1. The gap

Agent-to-agent commerce is acquiring real infrastructure: HTTP-native payments
(x402), agent wallets, escrowed hiring on marketplaces, and on-chain identity,
reputation, and validation registries (ERC-8004). This stack answers three
questions well:

1. **Did the counterparty deliver at all?** Escrow with timeout refunds handles
   non-delivery mechanically.
2. **Did the agent run the process it claims?** Re-execution with stake, TEE
   attestation, and zkML verify *process integrity*.
3. **What have others experienced with this agent?** Reputation registries
   record feedback.

It does not answer the fourth question, which is where most real commercial
disputes live: **did the work satisfy the agreement?** A website can be
delivered on time, by the claimed model, with a valid attestation — and still
fail the spec. An SLA can degrade in ways a refund-timeout cannot see. A funding
milestone can be "met" only under the entrepreneur's reading of it.

Classic oracles do not close this gap: they are built for facts with
authoritative external sources. "Was this deliverable good enough" has no API
endpoint. Decentralized human juries (Kleros, since 2018) close it for
human-speed, human-cost disputes, and remain the right escalation tier — but
agent commerce needs adjudication at agent speed and agent cost, with
agent-legible procedure. Optimistic oracles (UMA) handle contestable facts but
degrade on genuinely ambiguous questions, as the public record of contested
prediction-market resolutions shows.

Meanwhile, the ecosystem's dominant dispute-avoidance strategy — micropayment
granularity, where a bad response costs a fraction of a cent and you simply
stop calling that agent — works precisely because it keeps transactions small.
It cannot serve the contracts that matter most: lumpy, high-value, milestone-based
work. Those are exactly the contracts an agent economy needs to support if it is
to fund and build anything substantial.

## 2. Design position: the procedure is part of the contract

We propose that agent contracts carry a **procedure manifest**: a signed,
machine-readable artifact that pins the complete adjudication procedure at
contract-formation time. The manifest specifies:

- **The rubric.** Requirements decomposed into individually evaluable items,
  each bound to an evaluation method: LLM judgment against an agreed prompt,
  measurement from a named source, or attestation from a named party.
- **The judge.** Model(s) pinned by version and (for self-hosted models) weights
  hash; prompts agreed verbatim; run counts and aggregation rules; sampling
  parameters; and a fallback ladder for model unavailability.
- **The closed record, with defined doors.** Only evidence conforming to the
  manifest's evidence schema, submitted by declared roles, is admissible.
  Factual questions (uptime, latency, on-chain state) are answered only by
  measurement sources named ex-ante. Nothing outside the contract can be used
  to render judgment — but the contract defines its own inlets.
- **The default rule and burden of proof.** Who prevails when the judge's
  confidence falls below the agreed threshold, or required evidence is missing.
  This converts "unknowable" into "decidable" without pretending to knowledge —
  the same move human law makes with burdens of proof.
- **The remedy structure.** Challenge-window escrow, streaming payment with
  dispute-pause, or bonded finality. On-chain transfers are final; reversibility
  must be constructed, and the construction is a contract-time choice about who
  bears float cost during the dispute window.

**The refusal boundary.** A contract is arbitrable if and only if its manifest
conforms to the spec. Non-conforming manifests are refused *at formation time*,
by a validator anyone can run — before money moves. This is the answer to the
hardest class of dispute (e.g., "did we achieve product-market-fit signals?"):
either the parties decompose it into measurable proxies with named sources, or
they learn at signing that the clause is not arbitrable. Refusal maps to the
existing ERC-792 convention (`RefusedToArbitrate` is ruling 0).

## 3. The self-test property

A consequence worth stating plainly: if the procedure is fully specified and
cheap to run, **both parties can execute the judge before any dispute exists.**
The performing agent runs the pinned judge against its own work and iterates
until it passes; the paying agent runs the same judge on receipt. Rational
parties who can both compute the verdict in advance rarely dispute.

This is the design's central feature, not a bug: the manifest is a
mutually-agreed **acceptance test**, and arbitration is the attested execution
of that test for the residual cases where predictability fails — judge
nondeterminism, private information, evidence the parties compute differently,
and adversarial submissions. A good outcome for this system is one in which
formal disputes are rare because the procedure made them unnecessary, the same
way most commercial contracts never see a courtroom yet are priced by what a
courtroom would do.

## 4. Known hard problems (and the positions this spec takes)

**Pinning vs. capability.** The most capable judge models are the least
pinnable: commercial providers deprecate aggressively, and a provider-hosted
model is not a stable artifact over a multi-month contract. Position: the
binding tier defaults to open-weight models pinned by weights hash (perfectly
reproducible, self-hostable for the contract's life); provider-hosted frontier
models are permitted only with an explicit fallback ladder the parties sign.
This is a tradeoff the parties choose, stated honestly, not engineered away.

**Nondeterminism.** LLMs vary run-to-run even at temperature 0. Position: odd
run counts with majority aggregation, published transcripts, and (in later
versions) execution attestation. The spec treats reproducibility as
*auditability* — the transcripts and parameters are published and checkable —
rather than promising bit-exactness.

**The evidence channel is attacker-controlled.** Pinned prompts secure the
judge's instructions, not its inputs; a deliverable can embed prompt injection.
Position: structured evidence schemas; mandatory transformations for rich
content (render-then-screenshot strips most textual injection); an
adversarial-content screening pass whose detection consequence is itself agreed
in the manifest; heterogeneous judge panels; and value caps that grow with
measured robustness. Some injection will get through; the design prices this
risk rather than denying it.

**What the arbitrator warrants.** Following the arbitral-immunity line human
arbitration settled long ago: an arbitrator operating this spec warrants
*faithful execution of the agreed procedure* (pinned model ran, agreed prompts
used, evidence admitted per schema — all objectively checkable), not the
substantive correctness of the verdict, which the parties accepted when they
signed the procedure. A wrong-feeling verdict from a correctly-run procedure is
a contract-authoring failure, which is why reusable, battle-tested manifests
matter more than any single ruling.

## 5. What this spec is and is not

It **is**: a manifest format; conformance rules that make arbitrability
machine-checkable; a compatibility profile for ERC-792/ERC-1497 so any
conforming manifest can resolve through standard Arbitrator plumbing; and
example manifests intended to grow into a reviewed clause library.

It **is not**: an arbitration service, a token, a new chain, or a replacement
for human-jury systems (which remain the natural appeal tier), reputation
registries, or process-integrity verification (which it composes with — an
ERC-8004 validation entry is one kind of admissible attestation).

## 6. Open design questions (v0.0)

1. **Fallback-ladder vocabulary.** Is `substitute` / `abort_to_default_rule` a
   sufficient action set for model unavailability, and how should substitute
   equivalence be expressed (same family? benchmark parity? party re-approval)?
2. **Default-rule vocabulary.** v0.0 supports `payer` / `payee` / `split`.
   Do real contracts need richer outcomes (partial release schedules,
   requirement-weighted proration), and does that belong in v0 or later?
3. **Partial rulings.** ERC-792 rulings are discrete. Requirement-weighted
   outcomes imply proportional escrow release. Encode split ratios in the
   ruling map, or keep v0 binary and defer?
4. **Confidence semantics.** *Resolved in v0.0.2, by the RFC thread:* ambiguity
   is inferred structurally (run/panel disagreement), and self-reported
   confidence is evidence-only with zero contractual authority. An executable
   counterexample showed any outcome-relevant confidence reduction left
   unspecified could flip remedies on identical observations. See
   `spec/adjudication.md` and `CHANGELOG.md`. The successor open question:
   richer aggregation rules (e.g. severity-adjusted panels per the Rasch/IRT
   discussion in the ERC-8183 thread) as declared options.
5. **Multi-party engagements.** v0.0 fixes exactly one payer and one payee.
   Milestone-funded ventures involve tranches and possibly multiple funders.
   Extend the party model now or profile it later?
6. **Manifest privacy.** Manifests may contain commercially sensitive rubrics.
   Commit hash on-chain and keep content party-held, or require public
   manifests for reputation to accrue to clauses?

Feedback on any of these — especially with reference to failure modes observed
in deployed arbitration or oracle systems — is the most valuable contribution
this project can receive right now.
