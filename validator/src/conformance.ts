/**
 * Conformance rules C1-C12 (see spec/conformance.md).
 * Structural validity (JSON Schema) is checked separately and is a
 * precondition: these rules assume the shape is roughly right and use
 * defensive access so partial manifests still produce useful defect lists.
 */

export interface Defect {
  rule: string;
  message: string;
}

type Manifest = any;

const get = (obj: any, path: string[]): any =>
  path.reduce((o, k) => (o == null ? undefined : o[k]), obj);

export function checkConformance(m: Manifest): Defect[] {
  const defects: Defect[] = [];
  const add = (rule: string, message: string) => defects.push({ rule, message });

  const parties: any[] = Array.isArray(m?.parties) ? m.parties : [];
  const requirements: any[] = Array.isArray(m?.requirements) ? m.requirements : [];
  const evidenceItems: any[] = Array.isArray(get(m, ["evidence", "items"])) ? m.evidence.items : [];
  const sources: any[] = Array.isArray(m?.measurement_sources) ? m.measurement_sources : [];
  const panel: any[] = Array.isArray(get(m, ["judge", "panel"])) ? m.judge.panel : [];
  const prompts: any[] = Array.isArray(get(m, ["judge", "prompts"])) ? m.judge.prompts : [];
  const ladder: any[] = Array.isArray(get(m, ["judge", "fallback_ladder"])) ? m.judge.fallback_ladder : [];

  // ---- C1: exactly one payer, exactly one payee -------------------------
  const roleCount = (r: string) => parties.filter((p) => p?.role === r).length;
  if (roleCount("payer") !== 1)
    add("C1", `exactly one payer required; found ${roleCount("payer")}`);
  if (roleCount("payee") !== 1)
    add("C1", `exactly one payee required; found ${roleCount("payee")}`);

  // ---- C2 / C3 / C8(attestation): per-requirement method bindings -------
  const sourceIds = new Set(sources.map((s) => s?.id));
  const evalPromptIds = new Set(prompts.filter((p) => p?.role === "evaluation").map((p) => p?.id));
  const attestorNames = new Set(parties.filter((p) => p?.role === "attestor").map((p) => p?.name));

  for (const r of requirements) {
    const method = get(r, ["evaluation", "method"]);
    if (method === "measurement") {
      const ref = get(r, ["evaluation", "measurement_source_id"]);
      if (!ref) add("C2", `${r?.id}: measurement requirement has no measurement_source_id`);
      else if (!sourceIds.has(ref))
        add("C2", `${r?.id}: measurement_source_id '${ref}' not declared in measurement_sources`);
    }
    if (method === "llm_judge") {
      const ref = get(r, ["evaluation", "judge_prompt_id"]);
      if (!ref) add("C3", `${r?.id}: llm_judge requirement has no judge_prompt_id`);
      else if (!evalPromptIds.has(ref))
        add("C3", `${r?.id}: judge_prompt_id '${ref}' does not reference a declared evaluation prompt`);
    }
    if (method === "attestation") {
      const ref = get(r, ["evaluation", "attestor_role_name"]);
      if (!ref) add("C8", `${r?.id}: attestation requirement names no attestor_role_name`);
      else if (!attestorNames.has(ref))
        add("C8", `${r?.id}: attestor '${ref}' is not a declared attestor party`);
    }
  }

  // ---- C4: odd runs; odd panel under across-panel majority ---------------
  for (const j of panel) {
    if (typeof j?.runs === "number" && j.runs % 2 === 0)
      add("C4", `${j?.id}: runs must be odd; found ${j.runs}`);
  }
  if (get(m, ["judge", "aggregation", "across_panel"]) === "majority" && panel.length % 2 === 0)
    add("C4", `across_panel majority requires an odd panel size; found ${panel.length}`);

  // ---- C5: provider_api models require a pinned fallback ladder ----------
  const hasProviderApi = panel.some((j) => get(j, ["model", "hosting"]) === "provider_api");
  if (hasProviderApi) {
    if (ladder.length === 0)
      add("C5", "panel includes provider_api-hosted model(s) but fallback_ladder is empty");
    for (const step of ladder) {
      if (step?.action === "substitute") {
        const sub = step?.substitute;
        if (!sub) add("C5", "fallback step action=substitute has no substitute model");
        else {
          if (!sub.version || sub.version === "latest")
            add("C5", "fallback substitute must pin an exact version");
          if (sub.hosting === "self_hosted" && !sub.weights_hash)
            add("C5", "self-hosted fallback substitute must include weights_hash");
        }
      }
    }
  }

  // ---- C6: remedy structure fully parameterized --------------------------
  const structure = get(m, ["remedy", "structure"]);
  if (structure === "challenge_window_escrow" && get(m, ["remedy", "challenge_window_seconds"]) == null)
    add("C6", "challenge_window_escrow requires challenge_window_seconds");
  if (structure === "streaming" && get(m, ["remedy", "stream"]) == null)
    add("C6", "streaming remedy requires stream parameters");
  if (structure === "bonded_finality" && get(m, ["remedy", "bond"]) == null)
    add("C6", "bonded_finality remedy requires bond parameters");

  // ---- C7: split ratio; weighted_threshold coverage ----------------------
  const defaultRule = get(m, ["adjudication", "default_rule"]);
  if (defaultRule?.outcome === "split" && defaultRule?.split_ratio_payer_bps == null)
    add("C7", "default_rule outcome=split requires split_ratio_payer_bps");
  const outcomeRule = get(m, ["adjudication", "outcome_rule"]);
  if (outcomeRule?.rule === "weighted_threshold") {
    const weights = outcomeRule?.weights ?? {};
    const reqIds = new Set(requirements.map((r) => r?.id));
    const weightIds = new Set(Object.keys(weights));
    for (const id of reqIds)
      if (!weightIds.has(id as string)) add("C7", `weighted_threshold weights missing requirement ${id}`);
    for (const id of weightIds)
      if (!reqIds.has(id)) add("C7", `weighted_threshold weights include unknown requirement ${id}`);
    if (outcomeRule?.pass_threshold_bps == null)
      add("C7", "weighted_threshold requires pass_threshold_bps");
  }

  // ---- C8: evidence submitters must be declared parties ------------------
  const declaredRoles = new Set(parties.map((p) => p?.role));
  for (const e of evidenceItems) {
    if (e?.submitter_role && !declaredRoles.has(e.submitter_role))
      add("C8", `${e?.id}: submitter_role '${e.submitter_role}' has no declared party`);
  }

  // ---- C9: temperature 0 --------------------------------------------------
  const temp = get(m, ["judge", "sampling", "temperature"]);
  if (temp !== 0) add("C9", `sampling temperature must be 0 in v0.0; found ${temp}`);

  // ---- C10: injection screening on when llm_judge present ----------------
  const hasLlmJudge = requirements.some((r) => get(r, ["evaluation", "method"]) === "llm_judge");
  if (hasLlmJudge && get(m, ["adjudication", "injection_screening", "enabled"]) !== true)
    add("C10", "injection_screening.enabled must be true when any requirement uses llm_judge");

  // ---- C11: evidence coverage; rendered URL evidence for llm_judge -------
  const supportedReqIds = new Set(evidenceItems.flatMap((e) => (Array.isArray(e?.supports) ? e.supports : [])));
  for (const r of requirements) {
    const method = get(r, ["evaluation", "method"]);
    if (method === "llm_judge" && !supportedReqIds.has(r?.id))
      add("C11", `${r?.id}: llm_judge requirement has no supporting evidence item`);
  }
  const llmReqIds = new Set(
    requirements.filter((r) => get(r, ["evaluation", "method"]) === "llm_judge").map((r) => r?.id)
  );
  for (const e of evidenceItems) {
    const feedsLlm = (Array.isArray(e?.supports) ? e.supports : []).some((id: string) => llmReqIds.has(id));
    if (e?.type === "url" && feedsLlm && e?.transformation !== "render_screenshot")
      add("C11", `${e?.id}: url evidence supporting an llm_judge requirement must use transformation=render_screenshot`);
  }

  // ---- C12: self-hosted pinning; no 'latest' -----------------------------
  for (const j of panel) {
    const model = j?.model ?? {};
    if (model.hosting === "self_hosted" && !model.weights_hash)
      add("C12", `${j?.id}: self_hosted model must include weights_hash`);
    if (!model.version || model.version === "latest")
      add("C12", `${j?.id}: model version must be pinned; 'latest' is non-conforming`);
  }

  return defects;
}
