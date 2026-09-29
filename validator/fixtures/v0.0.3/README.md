# v0.0.3 acquisition-boundary fixtures (DRAFT)

Executable fixtures F1–F6 for [@chugarchugarr's v0.0.3 acquisition-boundary draft](https://github.com/chugarchugarr/technocore-chat/blob/main/docs/procedure-manifest-v0.0.3-acquisition-boundary.md)
(eth-magicians [t/29563](https://ethereum-magicians.org/t/29563) #17). Section 10 of that draft says the boundary should not merge
without executable fixtures for at least F1–F6. **None of this is spec text in this repo yet.** The fixtures and
`src/eligibility.ts` are there so the draft's rules C16–C21 can be checked when its text lands.

`npm test` group [4/4] runs every vector against `src/eligibility.ts`. It then switches C16–C21 off one at a time, and each
rule must be caught by at least one vector. The same vectors pass a separate Python checker in
[babyblueviper1/preaction-governance-conformance `examples/procedure-manifest-v003`](https://github.com/babyblueviper1/preaction-governance-conformance/tree/main/examples/procedure-manifest-v003).
That checker was written from the draft text alone and has its own `mutation_check.py`.

| vector | expect | what it pins |
|---|---|---|
| P1–P4 | RESULT / RESULT / RESULT / UNRESOLVED | positive controls: a valid run; a retry after an attested NO_RESULT; an identical duplicate terminal; an explicit TERMINAL_UNRESOLVED |
| F1 authentic double terminal | UNRESOLVED (EQUIVOCATION) | C19 |
| F2 suppressed unfavorable result | UNRESOLVED | C20: a local timeout is not NO_RESULT |
| F3 right slot, wrong request | UNRESOLVED | C17 |
| F4 authentic, insufficient scope | UNRESOLVED | C21 |
| F5 submission without admission | UNRESOLVED, state AUTHORIZED | §2 / C18: the commitment verifies and is kept as evidence |
| F6 namespace regeneration (+ F6b committed after claim) | UNRESOLVED | C16 |
| N1 claim signed by requester | UNRESOLVED | C18 |
| R-F3 / R-P / R-F5 | UNRESOLVED | real objects: a live admission receipt and a live requester-signed commitment (see below) |

**Encodings the draft leaves open.** These choices are the fixtures' own, listed in the header of `src/eligibility.ts`:
`H` = sha256 over canonical JSON; the derivations for `dispute_id`, `run_id` and `attempt_id`; `request_hash = H(request)`;
BIP-340 attestations. If the spec picks different encodings, the vectors get regenerated from the builders in the
repository linked above.

**Real-object vectors.** R-* use a real admission receipt (invinoveritas `/review`, admission index 240, 2026-09-28) and
a real requester-signed `submission_commitment` (t/29563 #16). They verify offline: the receipt's `receipt_hash`
recomputes, and the commitment's BIP-340 signature is valid. That live profile has no pre-authorized run slots, so
`authorized_execution` is `cannot_establish` there. Under the draft's own rule, that means UNRESOLVED even when request
binding holds (R-P). The vectors mark this as a gap in the live profile, not a pass.
