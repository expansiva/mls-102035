/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/finalize80/contracts.ts" enhancement="_blank"/>

import type { Ns5SiblingModule } from '/_102035_/l2/agentNewSolution5/helpers/ns5Siblings.js';
import type {
  Ns5AccessArtifact,
  Ns5IntegrationArtifact,
  Ns5JourneyArtifact,
  Ns5JourneyIndexArtifact,
  Ns5ModuleArtifact,
  Ns5OntologyEntityArtifact,
  Ns5OntologyIndexArtifact,
  Ns5RulesArtifact,
  Ns5WorkflowsArtifact,
} from '/_102035_/l2/solution/types.js';

export const NS5_FINALIZE_REPORT_SCHEMA_VERSION = '2026-09-10-ns5-finalize-report-v1' as const;

export const NS5_ORACLE_CHECK_IDS = ['I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7', 'I8', 'I9', 'I10', 'I11', 'I12'] as const;
export type Ns5OracleCheckId = typeof NS5_ORACLE_CHECK_IDS[number];
export const NS5_FINALIZE_I7_ORPHAN_FILE = 'NS5_FINALIZE_I7_ORPHAN_FILE' as const;
export const NS5_FINALIZE_I2_ACT_WITHOUT_TRANSITION = 'NS5_FINALIZE_I2_ACT_WITHOUT_TRANSITION' as const;
export const NS5_FINALIZE_I2_POSSIBLE_MISSING_TRANSITION_REF =
  'NS5_FINALIZE_I2_POSSIBLE_MISSING_TRANSITION_REF' as const;
export const NS5_FINALIZE_I8_LOGIN_PERSON_WITHOUT_REGISTRATION =
  'NS5_FINALIZE_I8_LOGIN_PERSON_WITHOUT_REGISTRATION' as const;
export const NS5_FINALIZE_I6_SYSTEM_TRANSITION_UNOWNED =
  'NS5_FINALIZE_I6_SYSTEM_TRANSITION_UNOWNED' as const;
export const NS5_FINALIZE_I11_INBOUND_PENDING_IN_SIBLING =
  'NS5_FINALIZE_I11_INBOUND_PENDING_IN_SIBLING' as const;
export type Ns5OracleIssueCode =
  | `NS5_FINALIZE_${Exclude<Ns5OracleCheckId, 'I7' | 'I8' | 'I11'>}`
  | typeof NS5_FINALIZE_I7_ORPHAN_FILE
  | typeof NS5_FINALIZE_I2_ACT_WITHOUT_TRANSITION
  | typeof NS5_FINALIZE_I2_POSSIBLE_MISSING_TRANSITION_REF
  | typeof NS5_FINALIZE_I8_LOGIN_PERSON_WITHOUT_REGISTRATION
  | typeof NS5_FINALIZE_I6_SYSTEM_TRANSITION_UNOWNED
  | typeof NS5_FINALIZE_I11_INBOUND_PENDING_IN_SIBLING;

export interface Ns5OracleSources {
  module: Ns5ModuleArtifact;
  journeys: Ns5JourneyArtifact[];
  journeyIndex: Ns5JourneyIndexArtifact;
  entities: Ns5OntologyEntityArtifact[];
  ontologyIndex: Ns5OntologyIndexArtifact;
  rules: Ns5RulesArtifact;
  workflows: Ns5WorkflowsArtifact;
  access: Ns5AccessArtifact;
  integration: Ns5IntegrationArtifact;
  /** shortNames of `journeys/*.defs.ts` on disk (including `index`). Omit to skip I7. */
  journeyDiskFiles?: string[];
  /** shortNames of `ontology/*.defs.ts` on disk (including `index`). Omit to skip I7. */
  ontologyDiskFiles?: string[];
  /**
   * From `pipeline.json` ontology30: entity ids absorbed into `module.details`.
   * I1 treats a journey `entity`/`affects` of one of these as a module.details ref
   * when that map still has keys.
   */
  liftedAggregateEntities?: string[];
  /** Sibling modules from the organization registry. I11/I12. */
  siblings?: Ns5SiblingModule[];
  /** Platform catalog event ids. `inbound.from: organization`. */
  platformEventIds?: string[];
}

export interface Ns5OracleIssue {
  checkId: Ns5OracleCheckId;
  code: Ns5OracleIssueCode;
  path: string;
  message: string;
}

export interface Ns5OracleCheckSummary {
  checkId: Ns5OracleCheckId;
  status: 'passed' | 'failed' | 'warned';
  errorCount: number;
  warningCount: number;
}

export interface Ns5FinalizeReport {
  schemaVersion: typeof NS5_FINALIZE_REPORT_SCHEMA_VERSION;
  moduleName: string;
  finalStatus: 'passed' | 'failed';
  checks: Ns5OracleCheckSummary[];
  errors: Ns5OracleIssue[];
  warnings: Ns5OracleIssue[];
  counts: {
    actors: number;
    journeys: number;
    entities: number;
    rules: number;
    processes: number;
    grants: number;
  };
}

export function oracleCode(checkId: Ns5OracleCheckId): Ns5OracleIssue['code'] {
  if (checkId === 'I7') return NS5_FINALIZE_I7_ORPHAN_FILE;
  if (checkId === 'I8') return NS5_FINALIZE_I8_LOGIN_PERSON_WITHOUT_REGISTRATION;
  if (checkId === 'I11') return NS5_FINALIZE_I11_INBOUND_PENDING_IN_SIBLING;
  return `NS5_FINALIZE_${checkId}` as `NS5_FINALIZE_${Exclude<Ns5OracleCheckId, 'I7' | 'I8' | 'I11'>}`;
}

export function buildNs5FinalizeReport(
  moduleName: string,
  errors: Ns5OracleIssue[],
  warnings: Ns5OracleIssue[],
  counts: Ns5FinalizeReport['counts'],
): Ns5FinalizeReport {
  const checks: Ns5OracleCheckSummary[] = NS5_ORACLE_CHECK_IDS.map(checkId => {
    const errorCount = errors.filter(issue => issue.checkId === checkId).length;
    const warningCount = warnings.filter(issue => issue.checkId === checkId).length;
    const status: Ns5OracleCheckSummary['status'] = errorCount
      ? 'failed'
      : warningCount
        ? 'warned'
        : 'passed';
    return { checkId, status, errorCount, warningCount };
  });
  return {
    schemaVersion: NS5_FINALIZE_REPORT_SCHEMA_VERSION,
    moduleName,
    finalStatus: errors.length ? 'failed' : 'passed',
    checks,
    errors,
    warnings,
    counts,
  };
}

export function formatNs5Oracle(report: Ns5FinalizeReport): string {
  return report.errors.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n');
}

export function ensureConfigListsModule(
  config: Record<string, unknown>,
  moduleName: string,
  userLanguage: string,
  projectId: number,
): Record<string, unknown> {
  const next = { ...config };
  const patch = {
    moduleId: moduleName,
    basePath: `/${moduleName}`,
    userLanguage,
    navigation: [] as unknown[],
    headerLinks: [] as unknown[],
  };
  if (isRecord(next.projects)) {
    const projects = { ...next.projects as Record<string, unknown> };
    const requested = projects[String(projectId)];
    const clientKey = isRecord(requested)
      ? String(projectId)
      : Object.keys(projects).find(key => isRecord(projects[key]) && (projects[key] as { type?: string }).type === 'client');
    if (clientKey) {
      const client = isRecord(projects[clientKey]) ? { ...projects[clientKey] as Record<string, unknown> } : {};
      client.modules = mergeModuleList(client.modules, patch);
      projects[clientKey] = client;
      next.projects = projects;
      return next;
    }
  }
  next.modules = mergeModuleList(next.modules, patch);
  return next;
}

function mergeModuleList(value: unknown, patch: Record<string, unknown>): Record<string, unknown>[] {
  const modules = Array.isArray(value)
    ? value.filter(isRecord).map(item => ({ ...item }))
    : [];
  const index = modules.findIndex(item => item.moduleId === patch.moduleId);
  if (index >= 0) modules[index] = { ...modules[index], ...patch };
  else modules.push(patch);
  return modules;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
