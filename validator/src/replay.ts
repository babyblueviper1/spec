/**
 * Replay harness — the semantic-conformance executor (spec/adjudication.md).
 *
 * Deterministically derives {requirement resolutions, contract outcome,
 * authorized remedy} from a committed manifest plus a frozen observation
 * bundle. Implements the normative state machine:
 *
 *   run observation → parse (Judge Result Contract) → run verdict
 *   → within-judge majority_with_dissent_cap → judge verdict
 *   → across-panel unanimous → requirement verdict
 *   → policy_on_unresolved (resolve_against_burden) → requirement resolution
 *   → outcome_rule → contract outcome → ruling_map → authorized remedy
 *
 * Only `verdict` in a run observation has contractual authority. Confidence
 * and rationale are carried through untouched and MUST NOT influence any
 * branch below — the regression tests assert outcome-invariance under
 * permutation of those fields.
 *
 * Observation bundle format (validator/fixtures/*.observations.json):
 * {
 *   "requirements": {
 *     "<reqId>": { "<judgeId>": [ {"verdict": "PASS", "confidence": 0.99, ...}
 *                                 | {"raw": "<full model output>"} , ... ] }
 *   }
 * }
 * Entries with "raw" are parsed per the parse rule (final non-empty line must
 * be strict JSON conforming to spec/judge-result.schema.json); entries with
 * "verdict" are treated as already-parsed authoritative results.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

const here = dirname(fileURLToPath(import.meta.url));
const resultSchema = JSON.parse(
  readFileSync(resolve(here, "../../spec/judge-result.schema.json"), "utf8")
);
const ajv = new (Ajv2020 as any)({ allErrors: true, strict: false });
const validateResult = ajv.compile(resultSchema);

export type Verdict = "PASS" | "FAIL" | "UNRESOLVED";

export interface ReplayOutcome {
  runVerdicts: Record<string, Record<string, Verdict[]>>;
  judgeVerdicts: Record<string, Record<string, Verdict>>;
  requirementVerdicts: Record<string, Verdict>;
  requirementResolutions: Record<string, "passed" | "not-passed">;
  contractOutcome: "payee_wins" | "payer_wins";
  authorizedRemedy: string;
}

/** Parse rule: final non-empty line must be strict JSON conforming to the
 *  Judge Result Contract; anything else is an UNRESOLVED run. No salvage. */
export function parseRun(obs: any): Verdict {
  if (obs && typeof obs.verdict === "string") {
    return validateResult(obs) ? (obs.verdict as Verdict) : "UNRESOLVED";
  }
  if (obs && typeof obs.raw === "string") {
    const lines = obs.raw.split("\n").map((l: string) => l.trim()).filter(Boolean);
    if (lines.length === 0) return "UNRESOLVED";
    try {
      const parsed = JSON.parse(lines[lines.length - 1]);
      return validateResult(parsed) ? (parsed.verdict as Verdict) : "UNRESOLVED";
    } catch {
      return "UNRESOLVED";
    }
  }
  return "UNRESOLVED";
}

/** within-judge: majority_with_dissent_cap. */
export function aggregateWithinJudge(verdicts: Verdict[], maxDissents: number): Verdict {
  const tally: Record<Verdict, number> = { PASS: 0, FAIL: 0, UNRESOLVED: 0 };
  for (const v of verdicts) tally[v]++;
  const candidates: Verdict[] = ["PASS", "FAIL"];
  for (const c of candidates) {
    if (tally[c] > verdicts.length / 2 && verdicts.length - tally[c] <= maxDissents) return c;
  }
  return "UNRESOLVED";
}

/** across-panel: unanimous. */
export function aggregateAcrossPanel(judgeVerdicts: Verdict[]): Verdict {
  if (judgeVerdicts.length === 0) return "UNRESOLVED";
  const first = judgeVerdicts[0];
  if (first === "UNRESOLVED") return "UNRESOLVED";
  return judgeVerdicts.every((v) => v === first) ? first : "UNRESOLVED";
}

export function replay(manifest: any, observations: any): ReplayOutcome {
  const pol = manifest?.adjudication?.policy_on_unresolved?.policy;
  if (pol !== "resolve_against_burden")
    throw new Error(`replay: policy '${pol}' is not implemented in v0.0.2 (C13)`);
  const burden = manifest?.adjudication?.burden_of_proof;
  const maxDissents = manifest?.judge?.aggregation?.within_judge?.max_dissents;
  const panel: any[] = manifest?.judge?.panel ?? [];

  const runVerdicts: ReplayOutcome["runVerdicts"] = {};
  const judgeVerdicts: ReplayOutcome["judgeVerdicts"] = {};
  const requirementVerdicts: ReplayOutcome["requirementVerdicts"] = {};
  const requirementResolutions: ReplayOutcome["requirementResolutions"] = {};

  for (const r of manifest?.requirements ?? []) {
    const method = r?.evaluation?.method;
    const perJudgeObs = observations?.requirements?.[r.id] ?? {};

    if (method === "llm_judge") {
      runVerdicts[r.id] = {};
      judgeVerdicts[r.id] = {};
      const panelVerdicts: Verdict[] = [];
      for (const j of panel) {
        const runs: any[] = perJudgeObs[j.id] ?? [];
        const rv = runs.map(parseRun);
        // Missing runs are UNRESOLVED runs: absence of an observation is not evidence.
        while (rv.length < (j.runs ?? 0)) rv.push("UNRESOLVED");
        runVerdicts[r.id][j.id] = rv;
        const jv = aggregateWithinJudge(rv, maxDissents);
        judgeVerdicts[r.id][j.id] = jv;
        panelVerdicts.push(jv);
      }
      requirementVerdicts[r.id] = aggregateAcrossPanel(panelVerdicts);
    } else {
      // measurement / attestation observations arrive pre-verdicted in the bundle
      const direct = perJudgeObs?.__direct__;
      requirementVerdicts[r.id] = direct === "PASS" || direct === "FAIL" ? direct : "UNRESOLVED";
    }

    // policy_on_unresolved: resolve_against_burden (si non paret, absolvito)
    const v = requirementVerdicts[r.id];
    if (v === "PASS") requirementResolutions[r.id] = "passed";
    else if (v === "FAIL") requirementResolutions[r.id] = "not-passed";
    else requirementResolutions[r.id] = burden === "payee" ? "not-passed" : "passed";
  }

  // outcome_rule
  const rule = manifest?.adjudication?.outcome_rule;
  let payeePrevails: boolean;
  if (rule?.rule === "all_must_pass") {
    payeePrevails = Object.values(requirementResolutions).every((x) => x === "passed");
  } else {
    const weights: Record<string, number> = rule?.weights ?? {};
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let passed = 0;
    for (const [id, w] of Object.entries(weights))
      if (requirementResolutions[id] === "passed") passed += w;
    payeePrevails = total > 0 && (passed / total) * 10000 >= rule.pass_threshold_bps;
  }

  const contractOutcome = payeePrevails ? "payee_wins" : "payer_wins";
  const authorizedRemedy = manifest?.remedy?.ruling_map?.[contractOutcome === "payee_wins" ? "payee_wins" : "payer_wins"];
  return { runVerdicts, judgeVerdicts, requirementVerdicts, requirementResolutions, contractOutcome, authorizedRemedy };
}
