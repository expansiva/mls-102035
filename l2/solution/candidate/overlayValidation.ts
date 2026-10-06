/// <mls fileReference="_102035_/l2/solution/candidate/overlayValidation.ts" enhancement="_blank" />

import type { Ns5FinalizeReport, Ns5OracleSources } from '/_102035_/l2/solution/gates/finalize80/contracts.js';
import type { Ns5OntologyV3PlanDraft } from '/_102035_/l2/solution/gates/ontology30/contractsV3.js';
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
import type { CandidateArea, CandidateCoverage } from '/_102035_/l2/solution/candidate/candidateValidation.js';

// The complete gates depend on the backend-only level-1 catalog. Keep that graph out of the
// browser bundle: the review UI enforces its own edit invariants and the full validation still
// runs in Node/worker flows before apply or execute.
const validationRuntimePromise = typeof window === 'undefined'
  ? Promise.all([
    import('/_102035_/l2/solution/gates/module10/gate.js'),
    import('/_102035_/l2/solution/gates/journeys20/gate.js'),
    import('/_102035_/l2/solution/gates/ontology30/gate.js'),
    import('/_102035_/l2/solution/gates/rules40/gate.js'),
    import('/_102035_/l2/solution/gates/workflows50/gate.js'),
    import('/_102035_/l2/solution/gates/access60/gate.js'),
    import('/_102035_/l2/solution/gates/integration70/gate.js'),
    import('/_102035_/l2/solution/gates/finalize80/gate.js'),
  ] as const)
  : null;

const v3ValidationRuntimePromise = typeof window === 'undefined'
  ? Promise.all([
    import('/_102035_/l2/solution/candidate/candidateValidation.js'),
    import('/_102034_/l4/ontology/mdm.defs.js'),
    import('/_102034_/l4/ontology/tdm.defs.js'),
    import('/_102034_/l4/ontology/ddm.defs.js'),
  ] as const)
  : null;

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

function artifactForOraclePath(path: string): Ns5TobeArtifactPath | 'module' {
  const journey = /^journeys\.([a-z][A-Za-z0-9]*)/u.exec(path);
  if (journey) return `journeys/${journey[1]}.defs.ts`;
  const entity = /^ontology\.([A-Z][A-Za-z0-9]*)/u.exec(path);
  if (entity) return `ontology/${entity[1]}.defs.ts`;
  if (path.startsWith('journeys/index')) return 'journeys/index.defs.ts';
  if (path.startsWith('rules')) return 'rules.defs.ts';
  if (path.startsWith('workflows')) return 'workflows.defs.ts';
  if (path.startsWith('access')) return 'access.defs.ts';
  if (path.startsWith('integration')) return 'integration.defs.ts';
  return 'module';
}

export async function validateNs5Overlay(
  sources: NewReleaseOverlaySources,
  context?: { pipeline?: Ns5PipelineState | null; registryModuleNames?: string[]; ontologyPlan?: Ns5OntologyV3PlanDraft | null },
): Promise<NewReleaseOverlayValidation> {
  const issues: NewReleaseValidationIssue[] = [];
  const module = sources.module.value;
  const journeyIndex = sources.journeyIndex.value;
  const journeys = sources.journeys.map(item => item.value).filter((value): value is Ns5JourneyArtifact => !!value);
  const ontologyIndex = sources.ontologyIndex.value;
  const ontologyV3 = isNs5OntologyV3(ontologyIndex);
  if (ontologyV3) {
    if (v3ValidationRuntimePromise) {
      const [adapter, { mdm }, { tdm }, { ddm }] = await v3ValidationRuntimePromise;
      return adapter.validateV3Candidate(sources, { mdm, tdm, ddm, ontologyPlan: context?.ontologyPlan, registryModuleNames: context?.registryModuleNames });
    }
    const areas: CandidateArea[] = ['module', 'journeys', 'ontologyAssembly', 'ontologyEntities', 'rules', 'workflows', 'access', 'integration', 'oracle'];
    const coverage = Object.fromEntries(areas.map(area => [area, {
      status: 'unsupported', reason: 'Complete v3 gates run in the validator worker, not this browser.',
    }])) as CandidateCoverage;
    return {
      ok: false, oracle: null, coverage,
      issues: [{ artifact: 'ontology/index.defs.ts', path: '$', severity: 'warning', code: 'NR_VALIDATION_UNAVAILABLE', message: 'Complete v3 validation has not run in this browser.', source: 'gate' }],
    };
  }
  const entities = ontologyV3
    ? []
    : sources.entities.map(item => item.value).filter((value): value is Ns5OntologyEntityArtifact => !!value);
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
  const validationRuntime = validationRuntimePromise ? await validationRuntimePromise : null;
  if (validationRuntime) {
    const [moduleGate, journeysGate, ontologyGate, rulesGate, workflowsGate, accessGate, integrationGate, finalizeGate] = validationRuntime;
    if (module) { pushGate(issues, 'module.defs.ts', moduleGate.validateNs5ModuleArtifact(module, { fixedModuleName: module.moduleName, actors: access?.actors }).issues); checked('module'); }
    if (module && journeys.length) {
      pushGate(issues, 'journeys/index.defs.ts', journeysGate.validateNs5Journeys(
        journeys.map(journey => ({ journeyId: journey.journeyId, business: journey.business })),
        { actors: access?.actors || context?.pipeline?.steps.module10?.actors || [], moduleName: module.moduleName },
      ).issues);
      if (journeys.length === sources.journeys.length && journeyIndex) checked('journeys');
    }
    if (module && ontologyIndex && !ontologyV3 && entities.length) {
      pushGate(issues, 'ontology/index.defs.ts', ontologyGate.validateNs5OntologyAssembly(
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
    if (rules) { pushGate(issues, 'rules.defs.ts', rulesGate.validateNs5Rules(ns5RuleRecord(rules), { moduleName: module?.moduleName }).issues); checked('rules'); }
    if (workflows && !ontologyV3) { pushGate(issues, 'workflows.defs.ts', workflowsGate.validateNs5Workflows(workflows.processes, {
      moduleName: module?.moduleName,
      actorIds: (access?.actors || []).map(actor => actor.actorId),
      journeys,
      entities,
      journeyDecisions: workflows.journeyDecisions,
    }).issues); checked('workflows'); }
    if (access && ontologyIndex && !ontologyV3) { pushGate(issues, 'access.defs.ts', accessGate.validateNs5Access(access.grants, {
      moduleName: module?.moduleName,
      actors: access.actors,
      entities,
      relationships: ontologyIndex.relationships,
      journeys,
    }).issues); checked('access'); }
    if (integration && module && !ontologyV3) { pushGate(issues, 'integration.defs.ts', integrationGate.validateNs5Integration(
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

    if (!ontologyV3 && module && journeyIndex && ontologyIndex && rules && workflows && access && integration
      && journeys.length === sources.journeys.length && entities.length === sources.entities.length) {
      const oracleSources: Ns5OracleSources = {
        module, journeyIndex, journeys, ontologyIndex,
        // ns5_43: the oracle reads the normalized view of the ontology, not the raw v2 artifacts.
        entities: ns5OntologyEntityViews(entities),
        rules, workflows, access, integration,
        journeyDiskFiles: ['index', ...sources.journeys.map(item => pathParts(item.path).shortName)],
        ontologyDiskFiles: ['index', ...sources.entities.map(item => pathParts(item.path).shortName)],
        liftedAggregateEntities: context?.pipeline?.steps.ontology30?.liftedAggregateEntities,
      };
      oracle = finalizeGate.runNs5Oracle(oracleSources);
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
    }
  }
  if (!validationRuntime) issues.push({
    artifact: 'module.defs.ts', path: '$', severity: 'warning', code: 'NR_VALIDATION_UNAVAILABLE',
    message: 'Complete L4 gates have not run in this browser.', source: 'gate',
  });
  const areaArtifacts: Partial<Record<CandidateArea, string[]>> = {
    module: ['module.defs.ts'], journeys: ['journeys/index.defs.ts'], ontologyAssembly: ['ontology/index.defs.ts'],
    ontologyEntities: ['ontology/index.defs.ts'], rules: ['rules.defs.ts'], workflows: ['workflows.defs.ts'],
    access: ['access.defs.ts'], integration: ['integration.defs.ts'], oracle: [],
  };
  for (const area of Object.keys(coverage) as CandidateArea[]) {
    if (coverage[area].status !== 'checked') continue;
    if (issues.some(issue => issue.severity === 'error' && (issue.source === 'oracle' && area === 'oracle' || areaArtifacts[area]?.includes(issue.artifact)))) {
      coverage[area] = { status: 'error' };
    }
  }
  return { ok: Object.values(coverage).every(item => item.status === 'checked') && !issues.some(issue => issue.severity === 'error'), issues, oracle, coverage };
}

