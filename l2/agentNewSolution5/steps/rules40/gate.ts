/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/rules40/gate.ts" enhancement="_blank"/>

import type { Ns5Rule } from '/_102035_/l2/solution/types.js';

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
}

export function validateNs5Rules(
  rules: Ns5Rule[],
  _context: Ns5RulesGateContext = {},
): Ns5RulesGateResult {
  const issues: Ns5RulesGateIssue[] = [];
  const ruleIds = new Set<string>();

  rules.forEach((rule, index) => {
    const base = `rules[${index}]`;
    if (!MEMBER_ID.test(rule.ruleId)) {
      error(issues, 'NS5_RULES_ID', 'ruleId must be lowerCamel.', `${base}.ruleId`);
    }
    if (rule.ruleId && ruleIds.has(rule.ruleId)) {
      error(issues, 'NS5_RULES_ID_DUPLICATE', `Duplicate ruleId ${rule.ruleId}.`, `${base}.ruleId`);
    }
    if (rule.ruleId) ruleIds.add(rule.ruleId);
    if (!rule.description.trim()) {
      error(issues, 'NS5_RULES_DESCRIPTION', 'Business description is required.', `${base}.description`);
    }
  });

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
