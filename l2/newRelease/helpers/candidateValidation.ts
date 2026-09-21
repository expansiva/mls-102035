/// <mls fileReference="_102035_/l2/newRelease/helpers/candidateValidation.ts" enhancement="_blank" />

/** Pure validation of an already assembled L4 candidate. No NS5 hooks or writes. */
import type { MdmOntology, DataFamilyOntology } from '/_102034_/l1/mdm/defs/ontologyTypes.js';
import { validateNs5ModuleArtifact } from '/_102035_/l2/agentNewSolution5/steps/module10/gate.js';
import { validateNs5Journeys } from '/_102035_/l2/agentNewSolution5/steps/journeys20/gate.js';
import { validateNs5OntologyAssemblyV3, validateNs5OntologyEntityV3 } from '/_102035_/l2/agentNewSolution5/steps/ontology30/gateV3.js';
import type { Ns5OntologyV3PlanDraft } from '/_102035_/l2/agentNewSolution5/steps/ontology30/contractsV3.js';
import { validateNs5Rules } from '/_102035_/l2/agentNewSolution5/steps/rules40/gate.js';
import { validateNs5Workflows } from '/_102035_/l2/agentNewSolution5/steps/workflows50/gate.js';
import { validateNs5Access } from '/_102035_/l2/agentNewSolution5/steps/access60/gate.js';
import { validateNs5Integration } from '/_102035_/l2/agentNewSolution5/steps/integration70/gate.js';
import { ns5OntologyEdges, ns5OntologyEntityViews } from '/_102035_/l2/solution/ontologyView.js';
import { ns5RuleRecord } from '/_102035_/l2/solution/rulesView.js';
import { isNs5OntologyV3Version, type Ns5OntologyEntityV3, type Ns5OntologyIndexV3 } from '/_102035_/l2/solution/types.js';
import type { NewReleaseOverlaySources, NewReleaseOverlayValidation, NewReleaseValidationIssue, Ns5TobeArtifactPath } from '/_102035_/l2/newRelease/tobe.js';

export type CandidateArea = 'module' | 'journeys' | 'ontologyAssembly' | 'ontologyEntities' | 'rules' | 'workflows' | 'access' | 'integration' | 'oracle';
export type CandidateCoverageStatus = 'checked' | 'unsupported' | 'error';
export type CandidateCoverage = Record<CandidateArea, { status: CandidateCoverageStatus; reason?: string }>;

export interface CandidateV3Context {
  mdm?: MdmOntology;
  tdm?: DataFamilyOntology;
  ddm?: DataFamilyOntology;
  ontologyPlan?: Ns5OntologyV3PlanDraft | null;
  registryModuleNames?: string[];
}

const AREAS: CandidateArea[] = ['module', 'journeys', 'ontologyAssembly', 'ontologyEntities', 'rules', 'workflows', 'access', 'integration', 'oracle'];

export function unavailableCandidateCoverage(reason: string): CandidateCoverage {
  return Object.fromEntries(AREAS.map(area => [area, { status: 'unsupported', reason }])) as CandidateCoverage;
}

export function candidateCanPublish(validation: NewReleaseOverlayValidation, affected: readonly CandidateArea[]): boolean {
  return affected.length > 0
    && affected.every(area => validation.coverage[area].status === 'checked')
    && !validation.issues.some(issue => issue.severity === 'error');
}

export function validateV3Candidate(
  sources: NewReleaseOverlaySources,
  context: CandidateV3Context = {},
): NewReleaseOverlayValidation {
  const coverage = unavailableCandidateCoverage('Gate has not run.');
  const issues: NewReleaseValidationIssue[] = [];
  const module = sources.module.value;
  const journeyIndex = sources.journeyIndex.value;
  const journeys = sources.journeys.map(item => item.value).filter((item): item is NonNullable<typeof item> => item !== null);
  const index = sources.ontologyIndex.value;
  const entities = sources.entities.map(item => item.value).filter((item): item is NonNullable<typeof item> => item !== null);
  const rules = sources.rules.value;
  const workflows = sources.workflows.value;
  const access = sources.access.value;
  const integration = sources.integration.value;

  function issue(artifact: Ns5TobeArtifactPath | 'module', code: string, message: string, path = '$'): void {
    issues.push({ artifact, path, severity: 'error', code, message, source: 'gate' });
  }
  function check(area: CandidateArea, artifact: Ns5TobeArtifactPath, run: () => ReadonlyArray<{ severity: 'error' | 'warning'; code: string; message: string; path?: string }>,
    artifactOf?: (path: string) => Ns5TobeArtifactPath): void {
    try {
      const found = run();
      for (const item of found) issues.push({ artifact: artifactOf?.(item.path || '') || artifact, path: item.path || '$', severity: item.severity, code: item.code, message: item.message, source: 'gate' });
      coverage[area] = { status: found.some(item => item.severity === 'error') ? 'error' : 'checked' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      coverage[area] = { status: 'error', reason: message };
      issue(artifact, 'NR_GATE_EXCEPTION', message);
    }
  }
  function missing(area: CandidateArea, artifact: Ns5TobeArtifactPath, reason: string): void {
    coverage[area] = { status: 'error', reason };
    issue(artifact, 'NR_ARTIFACT_MISSING', reason);
  }

  if (module) check('module', 'module.defs.ts', () => validateNs5ModuleArtifact(module, { fixedModuleName: module.moduleName, actors: access?.actors }).issues);
  else missing('module', 'module.defs.ts', 'Module artifact is missing.');
  if (module && journeyIndex && journeys.length === sources.journeys.length) {
    check('journeys', 'journeys/index.defs.ts', () => {
      const issues = validateNs5Journeys(journeys.map(journey => ({ journeyId: journey.journeyId, business: journey.business })), {
        actors: access?.actors || [], moduleName: module.moduleName,
      }).issues;
      const expected = new Set(journeyIndex.journeys.map(item => item.journeyId));
      const actual = new Set(journeys.map(item => item.journeyId));
      for (const id of expected) if (!actual.has(id)) issues.push({ severity: 'error', code: 'NR_JOURNEY_MISSING', message: `Indexed journey ${id} is missing.`, path: `journeys.${id}` });
      for (const id of actual) if (!expected.has(id)) issues.push({ severity: 'error', code: 'NR_JOURNEY_UNINDEXED', message: `Journey ${id} is not indexed.`, path: `journeys.${id}` });
      return issues;
    });
  } else missing('journeys', 'journeys/index.defs.ts', 'Journey index, module or one of its files is missing.');

  if (!index || !isNs5OntologyV3Version(index.schemaVersion)) {
    missing('ontologyAssembly', 'ontology/index.defs.ts', 'A v3 ontology index is required.');
    coverage.ontologyEntities = { status: 'error', reason: 'A v3 ontology index is required.' };
  } else if (!context.mdm || !context.tdm || !context.ddm) {
    coverage.ontologyAssembly = { status: 'unsupported', reason: 'Platform MDM/TDM/DDM catalogs are unavailable.' };
    coverage.ontologyEntities = { status: 'unsupported', reason: 'Platform MDM/TDM/DDM catalogs are unavailable.' };
  } else {
    const v3Index = index as Ns5OntologyIndexV3;
    const v3Entities = entities.filter((entity): entity is Ns5OntologyEntityV3 => isNs5OntologyV3Version(entity.schemaVersion));
    check('ontologyAssembly', 'ontology/index.defs.ts', () => {
      const found = validateNs5OntologyAssemblyV3(v3Index, v3Entities, {
        moduleName: module?.moduleName || v3Index.moduleName, mdm: context.mdm!, tdm: context.tdm!, ddm: context.ddm!,
        journeys, workflows, actors: access?.actors.map(actor => actor.actorId) || [],
      }).issues;
      const expected = new Set(v3Index.entities.map(entity => entity.entityId));
      for (const entity of entities) {
        if (!isNs5OntologyV3Version(entity.schemaVersion)) found.push({ severity: 'error', code: 'NR_ONTOLOGY_SCHEMA', message: `${entity.entityId} is not v3.`, path: `entities.${entity.entityId}` });
        if (!expected.has(entity.entityId)) found.push({ severity: 'error', code: 'NR_ONTOLOGY_UNINDEXED_ENTITY', message: `${entity.entityId} is not indexed.`, path: `entities.${entity.entityId}` });
      }
      return found;
    });
    const plan = context.ontologyPlan;
    if (!plan || !planMatchesIndex(plan, v3Index)) {
      coverage.ontologyEntities = { status: 'unsupported', reason: 'A matching frozen ontology plan is required for entity gates.' };
    } else {
      check('ontologyEntities', 'ontology/index.defs.ts', () => v3Entities.flatMap(entity => validateNs5OntologyEntityV3(entity, plan, {
        moduleName: v3Index.moduleName, mdm: context.mdm!, tdm: context.tdm!, ddm: context.ddm!,
        journeys, workflows, evidenceText: [module?.sourcePrompt || '', ...journeys.map(journey => JSON.stringify(journey.business))].join('\n'),
        actors: access?.actors.map(actor => actor.actorId) || [],
      }).issues), path => {
        const match = /^entities\.([A-Z][A-Za-z0-9]*)/u.exec(path);
        return match ? `ontology/${match[1]}.defs.ts` : 'ontology/index.defs.ts';
      });
    }
  }

  if (rules) check('rules', 'rules.defs.ts', () => validateNs5Rules(ns5RuleRecord(rules), { moduleName: module?.moduleName }).issues);
  else missing('rules', 'rules.defs.ts', 'Rules artifact is missing.');

  let views: ReturnType<typeof ns5OntologyEntityViews> = [];
  try {
    if (entities.length === sources.entities.length) views = ns5OntologyEntityViews(entities);
  } catch (error) {
    issue('ontology/index.defs.ts', 'NR_ONTOLOGY_VIEW', error instanceof Error ? error.message : String(error));
  }
  const hasViews = views.length > 0 && views.length === sources.entities.length && !!index;
  if (workflows && module && hasViews) check('workflows', 'workflows.defs.ts', () => validateNs5Workflows(workflows.processes, {
    moduleName: module.moduleName, actorIds: access?.actors.map(actor => actor.actorId) || [], journeys, entities: views,
    journeyDecisions: workflows.journeyDecisions,
  }).issues);
  else missing('workflows', 'workflows.defs.ts', 'Workflow, module or ontology context is missing.');
  if (access && module && index && hasViews) check('access', 'access.defs.ts', () => validateNs5Access(access.grants, {
    moduleName: module.moduleName, actors: access.actors, entities: views, relationships: ns5OntologyEdges(index), journeys,
  }).issues);
  else missing('access', 'access.defs.ts', 'Access, module or ontology context is missing.');
  if (integration && module && hasViews) check('integration', 'integration.defs.ts', () => validateNs5Integration(
    integration.inbound, integration.outbound, integration.plugins, {
      moduleName: module.moduleName, actors: access?.actors || [], entities: views,
      registryModuleNames: context.registryModuleNames || [module.moduleName], sourcePrompt: module.sourcePrompt,
      journeySteps: journeys.map(journey => ({ journeyId: journey.journeyId, stepIds: journey.business.steps.map(step => step.stepId) })),
      processTasks: workflows?.processes.map(process => ({ processId: process.processId, taskIds: process.tasks.map(task => task.taskId) })) || [],
    },
  ).issues);
  else missing('integration', 'integration.defs.ts', 'Integration, module or ontology context is missing.');

  coverage.oracle = { status: 'unsupported', reason: 'The v2 oracle does not accept v3 ontology; no v3 oracle is available.' };
  return { ok: AREAS.every(area => coverage[area].status === 'checked') && !issues.some(item => item.severity === 'error'), issues, oracle: null, coverage };
}

function planMatchesIndex(plan: Ns5OntologyV3PlanDraft, index: Ns5OntologyIndexV3): boolean {
  if (plan.moduleName !== index.moduleName || plan.entities.length !== index.entities.length || plan.relationships.length !== index.relationships.length) return false;
  const entities = new Map(plan.entities.map(row => [row.entityId, row]));
  const relations = new Map(plan.relationships.map(row => [row.relationshipId, row]));
  return index.entities.every(row => {
    const planned = entities.get(row.entityId);
    return planned && planned.kind === row.kind && (row.kind !== 'role' || planned.subtype === row.subtype)
      && (row.kind !== 'entity' || planned.class === row.class);
  }) && index.relationships.every(row => {
    const planned = relations.get(row.relationshipId);
    return planned && planned.from === row.from && planned.to === row.to && planned.type === row.type
      && planned.mode === row.mode && planned.field === row.field;
  });
}
