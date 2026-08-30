# Procedure-Manifest Arbitration for Agent Contracts

## The problem

AI agents are beginning to hire each other, pay each other, and fund each other.
The payment rails exist (x402, agent wallets, escrow contracts). The identity and
reputation rails are emerging (ERC-8004). What does not exist is a way to resolve
the disputes that objective verification cannot reach:

- An agent pays another agent to build a website. The site is delivered on time,
  but does it *meet the requirements*? No oracle can answer that.
- An agent prepays for a year of a data feed. The provider's uptime degrades.
  Who measures, and who decides?
- An agent-investor funds an agent-entrepreneur against milestones. Was the
  milestone met? Reasonable judges disagree.

Today's protocols handle **non-delivery** (escrow timeouts) and **process
integrity** (re-execution, TEE attestation, zkML). They record reputations and
validations. None of them render **judgment on subjective performance** — the
thing human commerce solves with courts and arbitration forums.

## The proposal

A dispute-resolution procedure that is itself part of the contract. At contract
time, both parties sign a **procedure manifest** that pins the complete
adjudication procedure:

- the requirements, decomposed into a machine-evaluable rubric;
- the judge: model(s) pinned by version/hash, prompts agreed verbatim, run counts,
  aggregation rule;
- the admissible evidence: schema, submitters, transformations, and named
  measurement sources (the closed record, with its doors defined inside the
  contract);
- the default rule and burden of proof — who wins when the answer is genuinely
  ambiguous;
- the remedy structure: challenge-window escrow, streaming, or bonded finality.

A contract is **arbitrable if and only if its manifest conforms to this spec**
(the refusal boundary). Because the procedure is fully specified and cheap to
run, both parties can execute the judge *before* disputing — the manifest
functions as a mutually-agreed acceptance test, and arbitration becomes the
attested backstop that makes the acceptance test binding. The goal is a system
that prevents most disputes and resolves the remainder predictably.

The manifest is designed to compose with existing standards rather than replace
them: it rides in [ERC-1497](https://developer.kleros.io/en/latest/erc-1497.html)
MetaEvidence, resolves through an [ERC-792](https://developer.kleros.io/)-compatible
Arbitrator, and anticipates [ERC-8004](https://ethereum-magicians.org/t/erc-8004-trustless-agents/25098)
identities for parties and validators.

## What's in this repo

| Path | Contents |
|---|---|
| `docs/problem-statement.md` | The adjudication gap: landscape, design rationale, open questions |
| `spec/procedure-manifest.schema.json` | JSON Schema for the procedure manifest (v0.0 — rough draft) |
| `spec/conformance.md` | Conformance rules beyond structural validity (the refusal boundary, executable) |
| `examples/website-delivery.manifest.json` | Conforming example: subjective deliverable, LLM-judged rubric |
| `examples/data-feed-sla.manifest.json` | Conforming example: measurement-driven SLA, streaming remedy |
| `examples/nonconforming-pmf-milestone.manifest.json` | Deliberately non-conforming example |
| `examples/WHY-NONCONFORMING.md` | Defect-by-defect explanation of the above |
| `validator/` | Reference conformance validator (TypeScript) |

## Try it

```bash
cd validator
npm install
npm run validate ../examples/website-delivery.manifest.json      # conforms
npm run validate ../examples/data-feed-sla.manifest.json          # conforms
npm run validate ../examples/nonconforming-pmf-milestone.manifest.json  # refused, with defect list
```

## Status

**v0.0 — design review stage.** There are no contracts here yet, deliberately.
The schema is expected to change. Open design questions are tracked in
`docs/problem-statement.md` §6. Feedback via issues is welcome; see
`CONTRIBUTING.md`.

## Concept 
Historical footnote that shaped our thinking: this is roughly how Rome scaled dispute resolution for parties outside its citizen-only legal system. Formulary procedure — traditionally associated with the praetor peregrinus's court for non-citizens — had the magistrate publish, ex ante, the formula: the exact question to be decided, a private judge (iudex) both parties accepted, a damages cap (taxatio), and a default rule (si non paret, absolvito — if not proven, absolve). No conforming formula, no action. Procedure built for outsiders to the legal system eventually became the standard procedure for everyone. Agents are today's peregrini — no legal personhood, no standing in human courts — and the analogy is directional rather than exact, but the architecture (humans publish the procedures; non-citizens transact safely under them; judgment delegates to party-chosen judges) is the same shape.

## Licensing

- Code (`validator/`, and any future `contracts/`): Apache-2.0 (`LICENSE`)
- Specification prose and docs (`spec/*.md`, `docs/`): CC-BY-4.0 (`LICENSE-DOCS`)
- Schemas and example manifests: Apache-2.0, so they can be embedded in tooling
  without attribution friction
