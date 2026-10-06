/**
 * Eligibility checker for the v0.0.3 acquisition boundary (DRAFT: not yet spec text in this repo).
 *
 * Source: @chugarchugarr's v0.0.3 acquisition-boundary draft
 * (chugarchugarr/technocore-chat docs/procedure-manifest-v0.0.3-acquisition-boundary.md; eth-magicians t/29563 #17),
 * rules C16-C21 (section 9), fixtures F1-F6 (section 10). Ported from the Python checker in
 * babyblueviper1/preaction-governance-conformance examples/procedure-manifest-v003 (check.py), which was
 * written from the draft text alone. Both implementations run the same 15 vectors in fixtures/v0.0.3/.
 *
 *   eligible(o) = authorized_execution ∧ exact_request_binding ∧ unique_terminal_execution ∧ sufficient_scope
 *
 * Each term is reported as "true" | "false" | "cannot_establish". Anything short of four "true"s maps the run to
 * UNRESOLVED ("If any term is false or cannot be established ... map the run to UNRESOLVED").
 *
 * The draft leaves these encodings open. The choices below are the fixtures' own, and a spec decision replaces them:
 *   H(x)            = sha256 over canonical JSON (sorted keys, no whitespace)
 *   manifest_hash   = H(manifest)
 *   dispute_id      = H({manifest_hash, contract_id, dispute_nonce}) from dispute_state            (C16)
 *   ordering        = C16 as hardened in formulary-systems/spec#5: precedence of the dispute commitment over every claim
 *                     is read ONLY from the profile's ordering_proof -- a hash-chained ordering log whose head is attested
 *                     by the manifest-pinned ordering_anchor_pubkey (a stand-in for OTS / chain inclusion); log position
 *                     is the order. committed_at / accepted_at are carried as evidence and never compared.
 *   run_id          = H({manifest_hash, dispute_id, requirement_id, judge_id, run_index})          (section 1)
 *   attempt_id      = H({run_id, attempt_index}), attempt_index < retry_policy.max_attempts      (section 5)
 *   request_hash    = H(requirement.request)                                                       (section 3)
 *   attestations    = BIP-340 Schnorr by the manifest-pinned provider key over H(record without "attestation")
 */
import { createHash } from "node:crypto";
import { schnorr } from "@noble/curves/secp256k1";

export type Term = "true" | "false" | "cannot_establish";
export interface Evaluation {
  terms: Record<string, Term>;
  reasons: string[];
  state: string;
  evidence: Record<string, unknown>;
  eligible?: boolean;
  run_verdict?: "RESULT" | "UNRESOLVED";
  output_hash?: string;
}

/** Test hook: switch single rules off to prove each one is load-bearing (mutation check). */
export const DISABLED = new Set<string>();

export function canon(o: unknown): string {
  if (o === null || typeof o !== "object") return JSON.stringify(o);
  if (Array.isArray(o)) return "[" + o.map(canon).join(",") + "]";
  const rec = o as Record<string, unknown>;
  return "{" + Object.keys(rec).sort().map((k) => JSON.stringify(k) + ":" + canon(rec[k])).join(",") + "}";
}
const sha = (s: string | Uint8Array) => createHash("sha256").update(s).digest();
export const H = (o: unknown) => sha(canon(o)).toString("hex");
const hexb = (h: string) => Uint8Array.from(Buffer.from(h, "hex"));

function verify(msg32: Uint8Array, pubHex: string, sigHex: string): boolean {
  try { return schnorr.verify(hexb(sigHex), msg32, hexb(pubHex)); } catch { return false; }
}

function sigOk(record: Record<string, any>, pubkey: string): boolean {
  const { attestation, ...body } = record;
  return typeof attestation === "string" && verify(sha(canon(body)), pubkey, attestation);
}

/** submission_commitment v0 (requester-signed; shape from t/29563 #13/#15). Evidence only, never admission (C18). */
function commitmentOk(c: Record<string, any>): boolean {
  if (c?.type !== "submission_commitment") return false;
  const body: Record<string, unknown> = {};
  for (const k of ["type", "version", "request_digest", "attempt_id", "sent_at", "requester_pubkey"]) {
    if (!(k in c)) return false;
    body[k] = c[k];
  }
  return verify(sha(canon(body)), c.requester_pubkey, c.sig);
}

/** invinoveritas-admission-chain-v1 profile: receipt_hash = H({admission_index, accepted_at, request_digest,
 *  prev_receipt_hash[, submission_commitment_ref]}). This is the profile of the three real-object vectors. */
function admissionReceiptRecomputes(r: Record<string, any>): boolean {
  const p: Record<string, unknown> = {
    admission_index: r.admission_index, accepted_at: r.accepted_at,
    request_digest: r.artifact_hash, prev_receipt_hash: r.prev_receipt_hash,
  };
  if (r.submission_commitment_ref != null) p.submission_commitment_ref = r.submission_commitment_ref;
  return H(p) === r.receipt_hash;
}

const ZERO = "0".repeat(64);
const claimCore = (c: any) => ({ run_id: c.run_id, attempt_id: c.attempt_id, request_hash: c.request_hash });

/** C16 ordering under the fixture profile. Never reads a clock value. */
function ordering(pkg: Record<string, any>, acq: Record<string, any>, ds: unknown, claims: any[]): [Term, string | undefined] {
  const log = pkg.ordering_log, anchor = acq.ordering_anchor_pubkey;
  if (!log || !anchor) return ["cannot_establish", "no authoritative ordering mechanism: a bare committed_at cannot establish precedence (C16, F6b)"];
  const entries: any[] = log.entries ?? [];
  let prev = ZERO;
  const byHash = new Map<string, any>();
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.seq !== i || e.prev !== prev || e.entry_hash !== H({ seq: e.seq, kind: e.kind, ref: e.ref, prev: e.prev }))
      return ["cannot_establish", `ordering log entry ${i} does not chain (C16)`];
    prev = e.entry_hash; byHash.set(prev, e);
  }
  const cp = log.checkpoint ?? {};
  if (cp.head !== prev || cp.seq !== entries.length - 1 || !sigOk(cp, anchor))
    return ["cannot_establish", "ordering checkpoint is not attested by the manifest-pinned anchor over the log head (C16)"];
  const dseq = [...byHash.values()].filter((e) => e.kind === "dispute_commitment" && e.ref === H(ds)).map((e) => e.seq);
  if (!dseq.length) return ["cannot_establish", "dispute state is not in the ordering log (C16)"];
  const cseq: number[] = [];
  for (const c of claims) {
    const e = byHash.get(c.ordering_proof);
    if (!e || e.kind !== "claim" || e.ref !== H(claimCore(c)))
      return ["cannot_establish", "a claim's ordering_proof does not resolve to its own entry in the ordering log (C16)"];
    cseq.push(e.seq);
  }
  if (cseq.length && Math.min(...dseq) > Math.min(...cseq))
    return ["false", "the ordering log places the dispute commitment AFTER a claim (C16)"];
  return ["true", undefined];
}

export function evaluate(pkg: Record<string, any>): Evaluation {
  const m = pkg.manifest, acq = m.acquisition, reqDef = m.requirements[0];
  const out: Evaluation = { terms: {}, reasons: [], state: "AUTHORIZED", evidence: {} };
  const T = out.terms;

  const subs: any[] = pkg.submission_commitments ?? [];
  out.evidence.submission_commitments_valid = subs.map(commitmentOk);

  // Real-object profile: a live admission receipt. The profile has no pre-authorized run slots.
  if (acq.provenance_profile === "invinoveritas-admission-chain-v1") {
    const rec = pkg.admission_receipt;
    if (!rec) {
      Object.assign(T, { authorized_execution: "false", exact_request_binding: "cannot_establish",
        unique_terminal_execution: "cannot_establish", sufficient_scope: "cannot_establish" });
      out.reasons.push("not_claimed: no provider admission; a submission_commitment alone is not admission (C18)");
    } else {
      const ok = admissionReceiptRecomputes(rec);
      out.state = ok ? "CLAIMED" : "AUTHORIZED";
      T.authorized_execution = "cannot_establish";
      out.reasons.push("slot authorization cannot be established: this profile has no pre-authorized run_id (C16)");
      const want = sha(reqDef.request_text).toString("hex");
      T.exact_request_binding = (ok && rec.artifact_hash === want) || DISABLED.has("C17") ? "true" : "false";
      if (T.exact_request_binding === "false") out.reasons.push("request_hash differs from the manifest-committed request (C17)");
      T.unique_terminal_execution = "cannot_establish"; T.sufficient_scope = "cannot_establish";
    }
    return finish(out, undefined);
  }

  // section 7 (formulary-systems/spec#5 final, 2026-10-06): the manifest commits the retry predicate and it may only be ATTESTED_NO_RESULT.
  // TERMINAL_UNRESOLVED consumes the run and can never open a retry, so a manifest that says otherwise is refused at formation.
  const allowed: string[] = acq.retry_policy?.allowed_after ?? [];
  const retryCommitted = allowed.includes("ATTESTED_NO_RESULT");
  if (allowed.some((x) => x !== "ATTESTED_NO_RESULT") && !DISABLED.has("C20")) {
    out.state = "FORMATION_REFUSED";
    Object.assign(T, { authorized_execution: "false", exact_request_binding: "cannot_establish",
      unique_terminal_execution: "cannot_establish", sufficient_scope: "cannot_establish" });
    out.reasons.push(`retry_policy.allowed_after [${[...allowed].sort()}] commits a retry predicate other than ATTESTED_NO_RESULT; `
      + "TERMINAL_UNRESOLVED consumes the run (section 7, C20) -> refused at formation");
    return finish(out, undefined);
  }

  const manifestHash = H(m);
  const ds = pkg.dispute_state;
  const derivedDispute = H({ manifest_hash: manifestHash, contract_id: ds.contract_id, dispute_nonce: ds.dispute_nonce });
  const claims: any[] = pkg.claims ?? [];
  let derivedOk = pkg.dispute_id === derivedDispute;
  const runId = H({ manifest_hash: manifestHash, dispute_id: pkg.dispute_id, requirement_id: reqDef.requirement_id,
    judge_id: reqDef.judge_id, run_index: 0 });
  const maxAtt = Number(acq.retry_policy.max_attempts);
  const attemptIds = Array.from({ length: maxAtt }, (_, k) => H({ run_id: runId, attempt_index: k }));
  const prov: string = acq.provider_pubkey;

  const claimValid = (c: any) => c.run_id === runId && attemptIds.includes(c.attempt_id)
    && c.provenance_profile === acq.provenance_profile && (sigOk(c, prov) || DISABLED.has("C18"));
  const validClaims = claims.filter(claimValid)
    .sort((a, b) => attemptIds.indexOf(a.attempt_id) - attemptIds.indexOf(b.attempt_id));

  let [order, why] = ordering(pkg, acq, ds, validClaims);
  if (DISABLED.has("C16")) { derivedOk = true; order = "true"; why = undefined; }
  if (!derivedOk) out.reasons.push("dispute_id is not the derivation from committed dispute state (C16, F6)");
  if (why) out.reasons.push(why);
  const auth16: Term = !derivedOk || order === "false" ? "false" : order;   // true / false / cannot_establish
  if (!validClaims.length) {
    Object.assign(T, { authorized_execution: "false", exact_request_binding: "cannot_establish",
      unique_terminal_execution: "cannot_establish", sufficient_scope: "cannot_establish" });
    if (subs.length && !claims.length)
      out.reasons.push("not_claimed: submission preserved as evidence; no provider claim, so not CLAIMED (C18)");
    else if (claims.length)
      out.reasons.push("no claim is provider-attested for an enumerated attempt of the authorized slot (C18/C16)");
    return finish(out, undefined);
  }
  out.state = "CLAIMED";
  const perAttempt = new Map<string, Set<string>>();
  for (const c of validClaims) {
    if (!perAttempt.has(c.attempt_id)) perAttempt.set(c.attempt_id, new Set());
    perAttempt.get(c.attempt_id)!.add(H(c));
  }
  if ([...perAttempt.values()].some((v) => v.size > 1) && !DISABLED.has("C18")) {
    out.state = "EQUIVOCATION";
    Object.assign(T, { authorized_execution: "false", exact_request_binding: "cannot_establish",
      unique_terminal_execution: "cannot_establish", sufficient_scope: "cannot_establish" });
    out.reasons.push("two distinct authentic claims for one authorized attempt_id; neither may acquire authority (C18, F1b)");
    return finish(out, undefined);
  }

  const terminalsFor = (c: any) => {
    const crh = H(c);
    return (pkg.terminals ?? []).filter((t: any) => t.claim_receipt_hash === crh && sigOk(t, prov));
  };

  // Walk attempts in order. A retry is authorized only after an attested NO_RESULT (C20); a consuming terminal ends the run.
  let chosen: [any, any, string] | undefined, retryViolation = false;
  for (let k = 0; k < validClaims.length; k++) {
    const c = validClaims[k];
    const ts = terminalsFor(c);
    const distinct = new Map<string, any>();
    for (const t of ts) distinct.set(JSON.stringify([t.terminal_status, t.output_hash ?? null]), t);
    if (distinct.size > 1 && !DISABLED.has("C19")) {
      out.state = "EQUIVOCATION";
      Object.assign(T, { authorized_execution: auth16, exact_request_binding: "cannot_establish",
        unique_terminal_execution: "false", sufficient_scope: "cannot_establish" });
      out.reasons.push("conflicting attested terminals for one claimed attempt; none may be chosen (C19)");
      return finish(out, undefined);
    }
    const status: string | undefined = distinct.size ? [...distinct.values()][0].terminal_status : undefined;
    const later = validClaims.slice(k + 1);
    if (status === "NO_RESULT") {
      if (!later.length) out.state = "ATTESTED_NO_RESULT";
      if (retryCommitted || DISABLED.has("C20") || !later.length) continue;   // opens the next attempt only if the manifest committed it
      out.state = "ATTESTED_NO_RESULT";
      retryViolation = true;
      out.reasons.push("retry after an attested NO_RESULT, but the manifest committed no ATTESTED_NO_RESULT retry predicate (section 7, C20)");
      break;
    }
    if (later.length && !DISABLED.has("C20")) {
      retryViolation = true;
      out.reasons.push("retry after an attempt that was not provider-attested NO_RESULT: caller timeout or "
        + "unfavorable result does not authorize another attempt (C20)");
    }
    if (later.length && status === undefined && DISABLED.has("C20")) continue;   // mutant: naive retry acceptance
    if (status === undefined) {
      if (retryViolation) break;                 // the run's only authorized attempt has no attested terminal
      out.reasons.push("claimed attempt has no attested terminal record");
      break;
    }
    chosen = [c, ts[0], status];
    break;
  }

  T.authorized_execution = retryViolation ? "false" : auth16;
  if (!chosen) {
    T.exact_request_binding ??= "cannot_establish";
    T.unique_terminal_execution ??= "cannot_establish";
    T.sufficient_scope ??= "cannot_establish";
    return finish(out, undefined);
  }
  const [c, t, status] = chosen;
  out.state = status === "RESULT" || status === "UNRESOLVED" ? "TERMINAL_" + status : status;
  T.unique_terminal_execution = "true";
  T.exact_request_binding = c.request_hash === H(reqDef.request) || DISABLED.has("C17") ? "true" : "false";
  if (T.exact_request_binding === "false")
    out.reasons.push("claim binds the right slot to a request_hash that differs from the committed request (C17)");
  const need: string[] = reqDef.required_scope, got = new Set<string>(t.observed_scope ?? []);
  T.sufficient_scope = need.every((s) => got.has(s)) || DISABLED.has("C21") ? "true" : "false";
  if (T.sufficient_scope === "false")
    out.reasons.push(`observation scope [${[...got].sort()}] does not cover required_scope [${[...need].sort()}] (C21)`);
  if (status === "UNRESOLVED") {
    out.reasons.push("terminal is explicitly UNRESOLVED: consumes the run, carries no result");
    return finish(out, undefined);
  }
  return finish(out, t.output_hash);
}

function finish(out: Evaluation, outputHash: string | undefined): Evaluation {
  const eligible = Object.keys(out.terms).length === 4 && Object.values(out.terms).every((v) => v === "true");
  out.eligible = eligible;
  out.run_verdict = eligible && outputHash ? "RESULT" : "UNRESOLVED";
  if (out.run_verdict === "RESULT") out.output_hash = outputHash;
  return out;
}

/** Does an evaluation match a vector's `expect` block? */
export function matches(r: Evaluation, e: Record<string, any>): boolean {
  return r.run_verdict === e.run_verdict && r.eligible === e.eligible && r.state === e.state
    && Object.entries<string>(e.terms ?? {}).every(([k, v]) => r.terms[k] === v);
}
