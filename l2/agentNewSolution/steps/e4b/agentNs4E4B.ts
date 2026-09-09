/// <mls fileReference="_102035_/l2/agentNewSolution/steps/e4b/agentNs4E4B.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { resolveNs4MutableParent } from '/_102035_/l2/agentNewSolution/helpers/ns4StepTree.js';
import {
  createNs4E4BStep, isNs4Pipeline, markNs4E4BApproved, markNs4E4BFailed, markNs4E4BRunning,
  markNs4E4Stale, markNs4ModuleE4BApproved, Ns4PipelineState,
} from '/_102035_/l2/agentNewSolution/helpers/ns4Core.js';
import {
  readNs4ApprovedAccess, readNs4ApprovedJourneys, readNs4ApprovedOntology,
} from '/_102035_/l2/agentNewSolution/helpers/ns4ApprovedArtifacts.js';
import {
  ns4AccessMatrixFile, ns4OntologyIndexFile, ns4RulesFile, readNs4AgentText, readNs4DefsJson, readNs4Module,
  readNs4Pipeline, writeNs4AccessBindings, writeNs4Module, writeNs4OntologyEntity, writeNs4Pipeline,
} from '/_102035_/l2/agentNewSolution/helpers/ns4Fs.js';
import type { Ns4AccessMatrixArtifact } from '/_102035_/l2/agentNewSolution/steps/e3/contracts.js';
import {
  NS4_ONTOLOGY_SCHEMA_VERSION, type Ns4DerivationOp, type Ns4OntologyEntity, type Ns4OntologyEntityArtifact,
  type Ns4OntologyIndexArtifact,
} from '/_102035_/l2/agentNewSolution/steps/e4/contracts.js';
import {
  compileNs4AccessBindings, ns4EntityIdsCoveredByGrant, ns4NeedsDisclosureProjection,
  type Ns4E4BFinding, type Ns4E4BProposal, type Ns4E4BSources,
} from '/_102035_/l2/agentNewSolution/steps/e4b/contracts.js';
import { validateNs4AccessBindings } from '/_102035_/l2/agentNewSolution/steps/e4b/gate.js';

interface Ns4E4BArgs {
  planId: 'e4b-access-realization';
  moduleName?: string;
  repairAttempt?: number;
  gateFeedback?: string;
}

const MAX_REPAIRS = 1;

export async function beforeNs4E4BPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentNewSolution:e4b] task invalid');
  let moduleName = '';
  try {
    const parsed = resolveArgs(context, args || step.prompt);
    moduleName = parsed.moduleName;
    const pipeline = await requirePipeline(moduleName);
    if (pipeline.steps.e4?.status !== 'approved') throw new Error(`E4 approved pipeline not found for ${moduleName}.`);
    await writeNs4Pipeline(markNs4E4BRunning(pipeline));
    const sources = await readSources(moduleName);
    const compiled = await compileNs4AccessBindings(sources);
    if (!compiled.findings.length) {
      const gate = validateNs4AccessBindings(compiled.artifact, sources, compiled.projections);
      if (gate.ok) return persist(context, parentStep, step, hookSequential, moduleName, compiled.artifact, compiled.projections, sources);
      const ontologyIssues = gate.issues.filter(issue => issue.repairStep === 'e4-ontology');
      if (ontologyIssues.length && parsed.repairAttempt) {
        return failToOntology(context, parentStep, step, hookSequential, moduleName, ontologyIssues);
      }
      if (!grantsNeedingAnchor(sources).length) {
        return scheduleRepairOrFail(context, parentStep, step, hookSequential, parsed, moduleName, gate.issues);
      }
    }
    const prompt = await readNs4AgentText('steps/e4b', 'prompt');
    const humanPrompt = [
      `## Required identity\nmoduleName=${moduleName}; userLanguage=${sources.access.userLanguage || 'en'}`,
      `## Grants that need a person-scope path\n${JSON.stringify(grantsNeedingAnchor(sources), null, 2)}`,
      `## Grants that need a disclosure projection\n${JSON.stringify(grantsNeedingDisclosure(sources), null, 2)}`,
      `## Referenced rule descriptions\n${JSON.stringify(rulesForDisclosure(sources), null, 2)}`,
      `## Ontology fields and relationships\n${JSON.stringify(compactOntology(sources), null, 2)}`,
      parsed.gateFeedback ? `## Deterministic repair required\n${parsed.gateFeedback}` : '',
    ].filter(Boolean).join('\n\n');
    return [promptReady(context, parentStep, hookSequential, args || String(step.prompt || ''), prompt, humanPrompt)];
  } catch (error) {
    const message = errorMessage(error);
    await recordFailure(moduleName, message);
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', message, 'input_output')];
  }
}

export async function afterNs4E4BPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  let moduleName = '';
  try {
    const parsed = resolveArgs(context, args || step.prompt);
    moduleName = parsed.moduleName;
    const sources = await readSources(moduleName);
    const proposals = readProposals(unwrap(step.interaction?.payload?.[0]));
    const compiled = await compileNs4AccessBindings(sources, proposals);
    const missing = compiled.findings.filter(finding => finding.code === 'NS4_E4B_ANCHOR_FIELD_MISSING');
    if (missing.length) return failToOntology(context, parentStep, step, hookSequential, moduleName, missing);
    if (compiled.findings.length) {
      return scheduleRepairOrFail(context, parentStep, step, hookSequential, parsed, moduleName, compiled.findings);
    }
    const gate = validateNs4AccessBindings(compiled.artifact, sources, compiled.projections);
    if (!gate.ok) {
      const ontologyIssues = gate.issues.filter(issue => issue.repairStep === 'e4-ontology');
      if (ontologyIssues.length) return failToOntology(context, parentStep, step, hookSequential, moduleName, ontologyIssues);
      return scheduleRepairOrFail(context, parentStep, step, hookSequential, parsed, moduleName, gate.issues);
    }
    return persist(context, parentStep, step, hookSequential, moduleName, compiled.artifact, compiled.projections, sources);
  } catch (error) {
    const message = errorMessage(error);
    await recordFailure(moduleName, message);
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', message, 'input_output')];
  }
}

async function persist(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  moduleName: string,
  artifact: Awaited<ReturnType<typeof compileNs4AccessBindings>>['artifact'],
  projections: Ns4OntologyEntity[],
  sources: Ns4E4BSources,
): Promise<mls.msg.AgentIntent[]> {
  const approvedAt = new Date().toISOString();
  const artifactPaths = [await writeNs4AccessBindings(moduleName, artifact)];
  for (const entity of projections) {
    artifactPaths.push(await writeNs4OntologyEntity(
      moduleName, entity.entityId, asProjectionArtifact(entity, sources, approvedAt),
    ));
  }
  const moduleArtifact = await readNs4Module(moduleName);
  if (!moduleArtifact) throw new Error(`Module artifact not found for ${moduleName}.`);
  await writeNs4Module(moduleName, markNs4ModuleE4BApproved(moduleArtifact, approvedAt));
  await writeNs4Pipeline(markNs4E4BApproved(await requirePipeline(moduleName), artifactPaths, approvedAt));
  const mutationParent = findParent(context, parentStep, step);
  return [
    resultStep(context, mutationParent, {
      moduleName, bindingCount: artifact.bindings.length, synthesizedCount: artifact.synthesizedAuthorities.length,
      projectionCount: projections.length, artifactPath: artifactPaths[0],
    }),
    updateStatus(context, mutationParent, step, hookSequential, 'completed',
      `E4B wrote ${artifact.bindings.length} access bindings, ${artifact.synthesizedAuthorities.length} synthesized authorities and ${projections.length} disclosure projections.`,
      'input_output'),
  ];
}

async function failToOntology(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  moduleName: string,
  findings: Ns4E4BFinding[],
): Promise<mls.msg.AgentIntent[]> {
  const message = formatGate(findings);
  const pipeline = await requirePipeline(moduleName);
  await writeNs4Pipeline(markNs4E4Stale(markNs4E4BFailed(pipeline, message), message));
  return [updateStatus(context, parentStep, step, hookSequential, 'failed', message, 'input_output')];
}

function scheduleRepairOrFail(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  parsed: Ns4E4BArgs & { moduleName: string },
  moduleName: string,
  issues: Ns4E4BFinding[],
): mls.msg.AgentIntent[] | Promise<mls.msg.AgentIntent[]> {
  const feedback = formatGate(issues);
  const attempt = parsed.repairAttempt || 0;
  if (attempt < MAX_REPAIRS) {
    const mutationParent = findParent(context, parentStep, step);
    return [
      addStep(context, mutationParent, createNs4E4BStep(moduleName, [], undefined, feedback, attempt + 1)),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', 'E4B gate scheduled one bounded repair.', 'input_output'),
    ];
  }
  return recordFailure(moduleName, feedback).then(() => [
    updateStatus(context, parentStep, step, hookSequential, 'failed', feedback, 'input_output'),
  ]);
}

async function readSources(moduleName: string): Promise<Ns4E4BSources> {
  const [access, ontology, journeys, matrix, ontologyIndex, rules] = await Promise.all([
    readNs4ApprovedAccess(moduleName),
    readNs4ApprovedOntology(moduleName),
    readNs4ApprovedJourneys(moduleName),
    readNs4DefsJson<Ns4AccessMatrixArtifact>(ns4AccessMatrixFile(moduleName), true),
    readNs4DefsJson<Ns4OntologyIndexArtifact>(ns4OntologyIndexFile(moduleName), true),
    readNs4DefsJson<{ rules?: Array<{ id: string; description: string }> }>(ns4RulesFile(moduleName), false),
  ]);
  return {
    moduleName,
    access,
    ontology,
    journeys,
    accessHash: matrix?.accessHash || 'sha256:access',
    ontologyHash: ontologyIndex?.ontologyHash || 'sha256:ontology',
    ...(rules?.rules?.length ? { rules: rules.rules } : {}),
  };
}

function grantsNeedingAnchor(sources: Ns4E4BSources): Array<Record<string, unknown>> {
  return sources.access.grants
    .filter(grant => grant.dataScope.mode === 'own' || grant.dataScope.mode === 'assigned' || grant.dataScope.mode === 'related')
    .map(grant => ({
      profileRef: grant.profileRef,
      authorityRef: grant.authorityRef,
      dataScope: grant.dataScope,
      entityRefs: sources.access.authorities.find(item => item.authorityRef === grant.authorityRef)?.journeyStepRefs || [],
    }));
}

function grantsNeedingDisclosure(sources: Ns4E4BSources): Array<Record<string, unknown>> {
  const entityById = new Map(sources.ontology.entities.map(entity => [entity.entityId, entity]));
  const profileById = new Map(sources.access.profiles.map(profile => [profile.profileId, profile]));
  const rows: Array<Record<string, unknown>> = [];
  for (const grant of sources.access.grants) {
    const profile = profileById.get(grant.profileRef);
    if (!ns4NeedsDisclosureProjection(grant, profile?.kind)) continue;
    const entities = ns4EntityIdsCoveredByGrant(grant, sources.access, sources.journeys)
      .map(entityId => entityById.get(entityId))
      .filter((entity): entity is NonNullable<typeof entity> => !!entity)
      .map(entity => ({
        entityId: entity.entityId,
        fields: entity.fields.map(field => ({
          fieldId: field.fieldId, title: field.title || field.fieldId, type: field.type,
        })),
      }));
    rows.push({
      profileRef: grant.profileRef,
      profileKind: profile?.kind,
      authorityRef: grant.authorityRef,
      disclosure: grant.disclosure,
      useRules: grant.useRules,
      entities,
    });
  }
  return rows;
}

function rulesForDisclosure(sources: Ns4E4BSources): Array<{ id: string; description: string }> {
  const wanted = new Set<string>();
  const profileById = new Map(sources.access.profiles.map(profile => [profile.profileId, profile]));
  for (const grant of sources.access.grants) {
    if (!ns4NeedsDisclosureProjection(grant, profileById.get(grant.profileRef)?.kind)) continue;
    for (const ruleId of grant.useRules) wanted.add(ruleId);
  }
  return (sources.rules || []).filter(rule => wanted.has(rule.id));
}

function asProjectionArtifact(
  entity: Ns4OntologyEntity,
  sources: Ns4E4BSources,
  approvedAt: string,
): Ns4OntologyEntityArtifact {
  return {
    schemaVersion: NS4_ONTOLOGY_SCHEMA_VERSION,
    moduleName: sources.moduleName,
    userLanguage: sources.access.userLanguage || 'en',
    solutionMode: 'new',
    ...entity,
    ontologyHash: sources.ontologyHash,
    approvedBy: 'auto',
    approvedAt,
  };
}

function compactOntology(sources: Ns4E4BSources): unknown {
  return {
    entities: sources.ontology.entities.map(entity => ({
      entityId: entity.entityId,
      mdmSubtype: entity.mdmSubtype,
      party: entity.party,
      fields: entity.fields.map(field => ({
        fieldId: field.fieldId, title: field.title || field.fieldId, type: field.type,
      })),
    })),
    relationships: sources.ontology.relationships.map(relationship => ({
      relationshipId: relationship.relationshipId,
      fromEntity: relationship.fromEntity,
      toEntity: relationship.toEntity,
      realization: relationship.realization,
    })),
  };
}

function readProposals(value: unknown): Ns4E4BProposal[] {
  const root = isRecord(value) ? value : {};
  const byKey = new Map<string, Ns4E4BProposal>();
  const list = Array.isArray(root.proposals) ? root.proposals : [];
  for (const item of list) {
    const record = isRecord(item) ? item : {};
    const hops = Array.isArray(record.hops) ? record.hops : [];
    const missing = isRecord(record.missingField) ? record.missingField : null;
    const nested = isRecord(record.projection) ? record.projection : null;
    const proposal: Ns4E4BProposal = {
      profileRef: text(record.profileRef),
      authorityRef: text(record.authorityRef),
      entityRef: text(record.entityRef),
      hops: hops.map(hop => {
        const edge = isRecord(hop) ? hop : {};
        return {
          entityRef: text(edge.entityRef),
          fieldId: text(edge.fieldId),
          targetEntityRef: text(edge.targetEntityRef),
          direction: edge.direction === 'incoming' ? 'incoming' as const : 'forward' as const,
        };
      }),
      ...(missing && text(missing.entityRef) && text(missing.fieldId)
        ? { missingField: { entityRef: text(missing.entityRef), fieldId: text(missing.fieldId) } }
        : {}),
      ...(nested ? { projection: readProjectionBody(nested) } : {}),
    };
    if (proposal.profileRef && proposal.authorityRef && proposal.entityRef) {
      byKey.set(`${proposal.profileRef}|${proposal.authorityRef}|${proposal.entityRef}`, proposal);
    }
  }
  const projections = Array.isArray(root.projections) ? root.projections : [];
  for (const item of projections) {
    const record = isRecord(item) ? item : {};
    const profileRef = text(record.profileRef);
    const authorityRef = text(record.authorityRef);
    const entityRef = text(record.entityRef);
    if (!profileRef || !authorityRef || !entityRef) continue;
    const key = `${profileRef}|${authorityRef}|${entityRef}`;
    const existing = byKey.get(key) || { profileRef, authorityRef, entityRef, hops: [] };
    existing.projection = readProjectionBody(record);
    byKey.set(key, existing);
  }
  return [...byKey.values()];
}

function readProjectionBody(record: Record<string, unknown>): NonNullable<Ns4E4BProposal['projection']> {
  const fields = Array.isArray(record.fields) ? record.fields.map(value => text(value)).filter(Boolean) : [];
  const excludedFields = Array.isArray(record.excludedFields)
    ? record.excludedFields.map(value => text(value)).filter(Boolean)
    : [];
  const aggregate = Array.isArray(record.aggregate) ? record.aggregate.flatMap(item => {
    const entry = isRecord(item) ? item : {};
    const fieldId = text(entry.fieldId);
    const op = derivationOp(entry.op);
    if (!fieldId || !op) return [];
    return [{
      fieldId,
      op,
      ...(text(entry.sourceField) ? { sourceField: text(entry.sourceField) } : {}),
    }];
  }) : [];
  return {
    fields,
    excludedFields,
    ...(aggregate.length ? { aggregate } : {}),
  };
}

async function requirePipeline(moduleName: string): Promise<Ns4PipelineState> {
  const state = await readNs4Pipeline(moduleName);
  if (!isNs4Pipeline(state)) throw new Error(`agentNewSolution pipeline not found for ${moduleName}.`);
  return state;
}
async function recordFailure(moduleName: string, error: string): Promise<void> {
  if (!moduleName) return;
  try {
    const state = await readNs4Pipeline(moduleName);
    if (isNs4Pipeline(state)) await writeNs4Pipeline(markNs4E4BFailed(state, error));
  } catch { /* task trace fallback */ }
}
function resolveArgs(context: mls.msg.ExecutionContext, value: unknown): Ns4E4BArgs & { moduleName: string } {
  const root = parse(value);
  if (!isRecord(root) || root.planId !== 'e4b-access-realization') throw new Error('Invalid E4B step arguments.');
  const moduleName = text(root.moduleName) || findE4Module(context) || memoryString(context, 'resumeModule');
  if (!moduleName) throw new Error('E4 module result not found for E4B.');
  return {
    planId: 'e4b-access-realization',
    moduleName,
    ...(number(root.repairAttempt) ? { repairAttempt: number(root.repairAttempt) } : {}),
    ...(text(root.gateFeedback) ? { gateFeedback: text(root.gateFeedback) } : {}),
  };
}
function findE4Module(context: mls.msg.ExecutionContext): string {
  const result = getAllSteps(context.task?.iaCompressed?.nextSteps).find(item => item.planning?.planId === 'e4-result');
  const parsed = result?.type === 'result' ? parse(result.result) : null;
  return isRecord(parsed) ? text(parsed.moduleName) : '';
}
function findParent(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, phaseStep?: mls.msg.AIAgentStep): mls.msg.AIAgentStep {
  return resolveNs4MutableParent(getAllSteps(context.task?.iaCompressed?.nextSteps), parentStep, phaseStep);
}
function promptReady(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, hookSequential: number, args: string, systemPrompt: string, humanPrompt: string): mls.msg.AgentIntentPromptReady {
  return {
    type: 'prompt_ready', args, messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task?.PK || '', hookSequential, parentStepId: parentStep.stepId, systemPrompt, humanPrompt,
  };
}
function addStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIPayload): mls.msg.AgentIntentAddStep {
  return { type: 'add-step', messageId: context.message.orderAt, threadId: context.message.threadId, taskId: context.task?.PK || '', parentStepId: parentStep.stepId, step };
}
function resultStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, saved: { moduleName: string; bindingCount: number; synthesizedCount: number; projectionCount: number; artifactPath: string }): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, {
    type: 'result', stepId: 0, interaction: null, stepTitle: 'E4B access realization compiled', status: 'completed', nextSteps: [],
    result: JSON.stringify({ ...saved, completedStep: 'e4b-access-realization', nextStep: 'e5-rules' }, null, 2),
    planning: { planId: 'e4b-result', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  } as mls.msg.AIResultStep);
}
function updateStatus(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIPayload, step: mls.msg.AIPayload, hookSequential: number, status: mls.msg.AIStepStatus, traceMsg?: string, cleaner?: 'input' | 'input_output'): mls.msg.AgentIntentUpdateStatus {
  return {
    type: 'update-status', hookSequential, messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task?.PK || '', parentStepId: parentStep.stepId, stepId: step.stepId, status,
    ...(traceMsg ? { traceMsg } : {}), ...(cleaner ? { cleaner } : {}),
  };
}
function unwrap(value: unknown): unknown {
  const root = parse(value);
  return isRecord(root) && root.type === 'flexible' ? parse(root.result) : root;
}
function parse(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); } catch { return value; }
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function derivationOp(value: unknown): Ns4DerivationOp | undefined {
  const op = text(value);
  if (op === 'count' || op === 'sum' || op === 'min' || op === 'max' || op === 'first' || op === 'groupKey') return op;
  return undefined;
}
function number(value: unknown): number { return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 0; }
function memoryString(context: mls.msg.ExecutionContext, key: string): string {
  const value = context.task?.iaCompressed?.longMemory?.[key];
  return typeof value === 'string' ? value.trim() : '';
}
function formatGate(issues: Ns4E4BFinding[]): string {
  return issues.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n');
}
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
