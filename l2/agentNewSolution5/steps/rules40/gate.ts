/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/rules40/gate.ts" enhancement="_blank"/>

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;

export interface Ns5RulesGateIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

export interface Ns5RulesGateResult {
  ok: boolean;
  issues: Ns5RulesGateIssue[];
}

export interface Ns5RulesGateContext {
  moduleName?: string;
  /**
   * The ids `normalizeNs5RulesPayload` saw twice. The map it returns cannot hold a duplicate, so the
   * evidence only reaches the gate through here. ABSENT MEANS "NO EVIDENCE", NOT "NO DUPLICATES": a
   * catalog read straight off `rules.defs.ts` never passed through the normalize and has none to give.
   */
  duplicateRuleIds?: readonly string[];
}

/** The catalog in the artifact form: `ruleId` to the one business sentence. */
export function validateNs5Rules(
  rules: Readonly<Record<string, string>>,
  context: Ns5RulesGateContext = {},
): Ns5RulesGateResult {
  const issues: Ns5RulesGateIssue[] = [];

  for (const [ruleId, description] of Object.entries(rules)) {
    const base = `rules.${ruleId}`;
    if (!MEMBER_ID.test(ruleId)) {
      error(issues, 'NS5_RULES_ID', 'ruleId must be lowerCamel.', `${base}.ruleId`);
    }
    if (!description.trim()) {
      error(issues, 'NS5_RULES_DESCRIPTION', 'Business description is required.', `${base}.description`);
    }
  }

  for (const ruleId of context.duplicateRuleIds || []) {
    error(issues, 'NS5_RULES_ID_DUPLICATE', `Duplicate ruleId ${ruleId}.`, `rules.${ruleId}.ruleId`);
  }

  return { ok: !issues.some(issue => issue.severity === 'error'), issues };
}

export function formatNs5RulesGate(issues: Ns5RulesGateIssue[]): string {
  return issues
    .filter(issue => issue.severity === 'error')
    .map(issue => {
      const where = issue.path ? ` ${issue.path}` : '';
      return `${issue.code}${where}: ${issue.message}`;
    })
    .join('\n');
}

function error(issues: Ns5RulesGateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'error', code, message, ...(path ? { path } : {}) });
}
