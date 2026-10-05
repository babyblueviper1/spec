# v0.0.3 acquisition-boundary fixtures (DRAFT)

Executable fixtures F1–F6 for [@chugarchugarr's v0.0.3 acquisition-boundary draft](https://github.com/chugarchugarr/technocore-chat/blob/main/docs/procedure-manifest-v0.0.3-acquisition-boundary.md)
(eth-magicians [t/29563](https://ethereum-magicians.org/t/29563) #17). Section 10 of that draft says the boundary should not merge
without executable fixtures for at least F1–F6. **None of this is spec text in this repo yet.** The fixtures and
`src/eligibility.ts` are there so the draft's rules C16–C21 can be checked when #5 lands. Field names follow #5: `observed_scope`, `allowed_after: ["ATTESTED_NO_RESULT"]`, and the fixed predicate `required_scope ⊆ observed_scope`.

`npm test` group [4/4] runs every vector against `src/eligibility.ts`. It then switches C16–C21 off one at a time, and each
rule must be caught by at least one vector. The same vectors pass a separate Python checker in
[babyblueviper1/preaction-governance-conformance `examples/procedure-manifest-v003`](https://github.com/babyblueviper1/preaction-governance-conformance/tree/main/examples/procedure-manifest-v003).
That checker was written from the draft text alone and has its own `mutation_check.py`.

| vector | expect | what it pins |
|---|---|---|
| P1–P5 | RESULT / RESULT / RESULT / UNRESOLVED / RESULT | positive controls: a valid run; a retry after an attested NO_RESULT; an identical duplicate terminal; an explicit TERMINAL_UNRESOLVED; P5, where `committed_at` is later than `accepted_at` but the attested ordering log puts the dispute first (a clock cannot break order either) |
| F1 authentic double terminal | UNRESOLVED (EQUIVOCATION) | C19 |
| F2 suppressed unfavorable result | UNRESOLVED | C20: a local timeout is not NO_RESULT |
| F3 right slot, wrong request | UNRESOLVED | C17 |
| F4 authentic, insufficient scope | UNRESOLVED | C21 |
| F5 submission without admission | UNRESOLVED, state AUTHORIZED | §2 / C18: the commitment verifies and is kept as evidence |
| F1b authentic double claim | UNRESOLVED (EQUIVOCATION) | C18 claim uniqueness: two distinct authentic claims for one `attempt_id` |
| F6 namespace regeneration | UNRESOLVED | C16 |
| F6b unauthoritative predecessor ordering | UNRESOLVED, `authorized_execution: cannot_establish` | C16: `committed_at` precedes `accepted_at`, but there is no ordering proof |
| F6c log orders dispute after claim | UNRESOLVED, `false` | C16: the clocks say before, the attested log says after |
| N2 checkpoint not by anchor | UNRESOLVED, `cannot_establish` | C16: an order attested by the provider is the executor side's own assertion |
| N1 claim signed by requester | UNRESOLVED | C18 |
| R-F3 / R-P / R-F5 | UNRESOLVED | real objects: a live admission receipt and a live requester-signed commitment (see below) |

**C16 ordering (hardened text in #5).** Precedence is read only from the profile's `ordering_proof`. In the fixture profile
(`pm003-bip340-v0`) that is a hash-chained ordering log: `entry_hash = H({seq, kind, ref, prev})`, a `dispute_commitment`
entry with `ref = H(dispute_state)`, and one `claim` entry per claim with `ref = H({run_id, attempt_id, request_hash})`. Each claim's
`ordering_proof` is its own `entry_hash`, and the claim's signature covers it. The log head is attested by the
manifest-pinned `ordering_anchor_pubkey`, which stands in for an OpenTimestamps or on-chain inclusion proof. Log position is the order.
`committed_at` and `accepted_at` are kept as evidence and never compared.

**Encodings the draft leaves open.** These choices are the fixtures' own, listed in the header of `src/eligibility.ts`:
`H` = sha256 over canonical JSON; the derivations for `dispute_id`, `run_id` and `attempt_id`; `request_hash = H(request)`;
BIP-340 attestations. If the spec picks different encodings, the vectors get regenerated from the builders in the
repository linked above.

**Real-object vectors.** R-* use a real admission receipt (invinoveritas `/review`, admission index 240, 2026-09-28) and
a real requester-signed `submission_commitment` (t/29563 #16). They verify offline: the receipt's `receipt_hash`
recomputes, and the commitment's BIP-340 signature is valid. That live profile has no pre-authorized run slots, so
`authorized_execution` is `cannot_establish` there. Under the draft's own rule, that means UNRESOLVED even when request
binding holds (R-P). The vectors mark this as a gap in the live profile, not a pass.
