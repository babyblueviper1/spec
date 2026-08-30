# Contributing

This project is at **design review stage** (spec v0.0). The most valuable
contributions right now are critique, prior art, and failure modes — especially
from anyone who has operated or attacked deployed arbitration, oracle, or
LLM-evaluation systems.

## How to contribute

- **Design feedback**: open an issue. Reference conformance rule ids (C1–C12)
  or open questions (OQ1–OQ6 in `docs/problem-statement.md` §6) where relevant.
  Dissent with reasoning is more useful than agreement.
- **Prior art**: if something here duplicates or conflicts with existing work
  (deployed or published), an issue with a link is a significant contribution.
- **Spec changes**: open an issue describing the problem before sending a PR
  that changes `spec/`. Schema changes must update the conformance rules,
  the examples, and the validator together — a PR that changes one without the
  others will be asked to complete the set.
- **New example manifests**: PRs welcome. A good example either exercises a
  rule combination the current examples don't, or captures a real contract
  shape from agent commerce. Non-conforming examples must include a
  defect-by-defect explanation (see `examples/WHY-NONCONFORMING.md`).

## Developer Certificate of Origin (DCO)

Contributions require a DCO sign-off — add `-s` to your commits
(`git commit -s`), certifying you have the right to submit the work under the
project licenses ([developercertificate.org](https://developercertificate.org)).
There is no CLA at this stage; if one is introduced later it will not apply
retroactively without contributor consent.

## Maintainership

The project currently has a single maintainer who acts as spec editor and makes
final decisions on design questions after discussion. This is deliberate at the
design-review stage; governance will be revisited if the contributor base grows.

## Licensing of contributions

- Code and schemas: Apache-2.0 (see `LICENSE`)
- Spec prose and docs: CC-BY-4.0 (see `LICENSE-DOCS`)

## Style

- Spec prose: RFC-2119 keywords (MUST/SHOULD/MAY) in conformance material only.
- Rule ids (C*) and open-question ids (OQ*) are stable once published; new
  rules get new ids, removed rules are marked withdrawn rather than reused.
