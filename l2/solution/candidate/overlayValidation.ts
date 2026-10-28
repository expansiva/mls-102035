/// <mls fileReference="_102035_/l2/solution/candidate/overlayValidation.ts" enhancement="_blank" />

import type { Ns5FinalizeReport, Ns5OracleSources } from '/_102035_/l2/solution/gates/finalize80/contracts.js';
import type { Ns5OntologyV3PlanDraft } from '/_102035_/l2/solution/gates/ontology30/contractsV3.js';
import { validateNs5ModuleArtifact } from '/_102035_/l2/solution/gates/module10/gate.js';
import { validateNs5Journeys } from '/_102035_/l2/solution/gates/journeys20/gate.js';
import { validateNs5OntologyAssembly } from '/_102035_/l2/solution/gates/ontology30/gate.js';
import { validateNs5Rules } from '/_102035_/l2/solution/gates/rules40/gate.js';
import { validateNs5Workflows } from '/_102035_/l2/solution/gates/workflows50/gate.js';
import { validateNs5Access } from '/_102035_/l2/solution/gates/access60/gate.js';
import { validateNs5Integration } from '/_102035_/l2/solution/gates/integration70/gate.js';
import { mdm } from '/_102034_/l4/ontology/mdm.defs.js';
import { tdm } from '/_102034_/l4/ontology/tdm.defs.js';
import { ddm } from '/_102034_/l4/ontology/ddm.defs.js';
import { ns5OntologyEntityViews } from '/_102035_/l2/solution/ontologyView.js';
import { ns5RuleRecord } from '/_102035_/l2/solution/rulesView.js';
import type {
  Ns5JourneyArtifact,
  Ns5OntologyEntityArtifact,
  Ns5PipelineState,
} from '/_102035_/l2/solution/types.js';
import {
  isNs5OntologyV3,
  pathParts,
  type NewReleaseOverlaySources,
  type NewReleaseOverlayValidation,
  type NewReleaseValidationIssue,
  type Ns5TobeArtifactPath,
} from '/_102035_/l2/solution/candidate/tobePaths.js';
import { applyScreenBaseline, screenIssueKey, validateV3Candidate, type CandidateArea, type CandidateCoverage, type ScreenBlame } from '/_102035_/l2/solution/candidate/candidateValidation.js';
import { artifactForOraclePath, runCandidateOracle, type CandidateModule } from '/_102035_/l2/solution/candidate/moduleVerification.js';

interface GateIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

function missingIssue(path: Ns5TobeArtifactPath): NewReleaseValidationIssue {
  return { artifact: path, path: '$', severity: 'error', code: 'NR_ARTIFACT_MISSING', message: `Required artifact ${path} is missing.`, source: 'gate' };
}

function pushGate(issues: NewReleaseValidationIssue[], artifact: Ns5TobeArtifactPath, values: GateIssue[]): void {
  for (const issue of values) issues.push({ artifact, path: issue.path || '$', ...issue, source: 'gate' });
}

export async function validateNs5Overlay(
  sources: NewReleaseOverlaySources,
  context?: { pipeline?: Ns5PipelineState | null; registryModuleNames?: string[]; ontologyPlan?: Ns5OntologyV3PlanDraft | null },
  base?: NewReleaseOverlaySources,
): Promise<NewReleaseOverlayValidation> {
  const module = sources.module.value;
  const journeyIndex = sources.journeyIndex.value;
  const journeys = sources.journeys.map(item => item.value).filter((value): value is Ns5JourneyArtifact => !!value);
  const ontologyIndex = sources.ontologyIndex.value;
  if (isNs5OntologyV3(ontologyIndex)) {
    return validateV3Candidate(sources, { mdm, tdm, ddm, ontologyPlan: context?.ontologyPlan, registryModuleNames: context?.registryModuleNames }, base);
  }
  const issues: NewReleaseValidationIssue[] = [];
  const entities = sources.entities.map(item => item.value).filter((value): value is Ns5OntologyEntityArtifact => !!value);
  const rules = sources.rules.value;
  const workflows = sources.workflows.value;
  const access = sources.access.value;
  const integration = sources.integration.value;

  for (const artifact of sources.all) if (!artifact.value) issues.push(missingIssue(artifact.path));
  let oracle: Ns5FinalizeReport | null = null;
  const coverage: CandidateCoverage = Object.fromEntries(
    (['module', 'journeys', 'ontologyAssembly', 'ontologyEntities', 'rules', 'workflows', 'access', 'integration', 'oracle'] as CandidateArea[])
      .map(area => [area, { status: 'unsupported', reason: 'Gate has not run.' }]),
  ) as CandidateCoverage;
  const checked = (area: CandidateArea) => { coverage[area] = { status: 'checked' }; };
  if (module) { pushGate(issues, 'module.defs.ts', validateNs5ModuleArtifact(module, { fixedModuleName: module.moduleName, actors: access?.actors }).issues); checked('module'); }
  if (module && journeys.length) {
    pushGate(issues, 'journeys/index.defs.ts', validateNs5Journeys(
      journeys.map(journey => ({ journeyId: journey.journeyId, business: journey.business })),
      { actors: access?.actors || context?.pipeline?.steps.module10?.actors || [], moduleName: module.moduleName },
    ).issues);
    if (journeys.length === sources.journeys.length && journeyIndex) checked('journeys');
  }
  if (module && ontologyIndex && entities.length) {
    pushGate(issues, 'ontology/index.defs.ts', validateNs5OntologyAssembly(
      { index: ontologyIndex, entities },
      {
        moduleName: module.moduleName,
        actors: access?.actors || context?.pipeline?.steps.module10?.actors || [],
        journeys,
        liftedAggregateEntityIds: context?.pipeline?.steps.ontology30?.liftedAggregateEntities,
      },
    ).issues);
    if (entities.length === sources.entities.length) { checked('ontologyAssembly'); checked('ontologyEntities'); }
  }
  if (rules) { pushGate(issues, 'rules.defs.ts', validateNs5Rules(ns5RuleRecord(rules), { moduleName: module?.moduleName }).issues); checked('rules'); }
  if (workflows) { pushGate(issues, 'workflows.defs.ts', validateNs5Workflows(workflows.processes, {
    moduleName: module?.moduleName,
    actorIds: (access?.actors || []).map(actor => actor.actorId),
    journeys,
    entities,
    journeyDecisions: workflows.journeyDecisions,
  }).issues); checked('workflows'); }
  if (access && ontologyIndex) { pushGate(issues, 'access.defs.ts', validateNs5Access(access.grants, {
    moduleName: module?.moduleName,
    actors: access.actors,
    entities,
    relationships: ontologyIndex.relationships,
    journeys,
  }).issues); checked('access'); }
  if (integration && module) { pushGate(issues, 'integration.defs.ts', validateNs5Integration(
    integration.inbound,
    integration.outbound,
    integration.plugins,
    {
      moduleName: module.moduleName,
      actors: access?.actors || [],
      entities,
      registryModuleNames: context?.registryModuleNames || [module.moduleName],
      sourcePrompt: module.sourcePrompt,
      journeySteps: journeys.map(journey => ({ journeyId: journey.journeyId, stepIds: journey.business.steps.map(step => step.stepId) })),
      processTasks: workflows?.processes.map(process => ({ processId: process.processId, taskIds: process.tasks.map(task => task.taskId) })) || [],
    },
  ).issues); checked('integration'); }

  if (module && journeyIndex && ontologyIndex && rules && workflows && access && integration
    && journeys.length === sources.journeys.length && entities.length === sources.entities.length) {
    const extras: Pick<Ns5OracleSources, 'journeyDiskFiles' | 'ontologyDiskFiles' | 'liftedAggregateEntities'> = {
      journeyDiskFiles: ['index', ...sources.journeys.map(item => pathParts(item.path).shortName)],
      ontologyDiskFiles: ['index', ...sources.entities.map(item => pathParts(item.path).shortName)],
      liftedAggregateEntities: context?.pipeline?.steps.ontology30?.liftedAggregateEntities,
    };
    const candidate: CandidateModule = {
      module, journeyIndex, journeys, ontologyIndex, entities, rules, workflows, access, integration,
    };
    const result = runCandidateOracle(candidate, extras);
    oracle = result.report;
    if (oracle) {
      checked('oracle');
      for (const issue of [...oracle.errors, ...oracle.warnings]) {
        issues.push({
          artifact: artifactForOraclePath(issue.path),
          path: issue.path,
          severity: oracle.errors.includes(issue) ? 'error' : 'warning',
          code: issue.code,
          message: issue.message,
          source: 'oracle',
        });
      }
    } else {
      for (const issue of result.issues) {
        issues.push({ artifact: 'module.defs.ts', path: issue.path, severity: 'error', code: issue.code, message: issue.message, source: 'oracle' });
      }
    }
  }
  const areaArtifacts: Partial<Record<CandidateArea, string[]>> = {
    module: ['module.defs.ts'], journeys: ['journeys/index.defs.ts'], ontologyAssembly: ['ontology/index.defs.ts'],
    ontologyEntities: ['ontology/index.defs.ts'], rules: ['rules.defs.ts'], workflows: ['workflows.defs.ts'],
    access: ['access.defs.ts'], integration: ['integration.defs.ts'], oracle: [],
  };
  const blame: ScreenBlame[] = [];
  for (const area of Object.keys(coverage) as CandidateArea[]) {
    if (coverage[area].status !== 'checked') continue;
    const matched = issues.filter(issue => issue.severity === 'error' && (issue.source === 'oracle' && area === 'oracle' || areaArtifacts[area]?.includes(issue.artifact)));
    for (const issue of matched) blame.push({ area, key: screenIssueKey(issue) });
    if (matched.length) coverage[area] = { status: 'error' };
  }
  const validation = { ok: Object.values(coverage).every(item => item.status === 'checked') && !issues.some(issue => issue.severity === 'error'), issues, oracle, coverage };
  if (!base) return validation;
  const baseline = await validateNs5Overlay(base, context);
  return applyScreenBaseline(validation, baseline.issues, blame);
}
