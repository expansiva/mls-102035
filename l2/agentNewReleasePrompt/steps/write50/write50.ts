/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/steps/write50/write50.ts" enhancement="_blank" />

import { NRP_AGENT_NAME, NRP_CANDIDATE_REL } from '/_102035_/l2/agentNewReleasePrompt/helpers/invocation.js';
import type { NrpModuleArtifacts } from '/_102035_/l2/agentNewReleasePrompt/helpers/compactIndex.js';
import {
  nrpMayWrite,
  type NrpAppliedEdit,
  type NrpGateIssue,
} from '/_102035_/l2/agentNewReleasePrompt/helpers/releaseGate.js';
import type { NrpTriage } from '/_102035_/l2/agentNewReleasePrompt/steps/triage20/triage20.js';
import {
  accessFile,
  integrationFile,
  journeyFile,
  journeyIndexFile,
  ontologyEntityFile,
  ontologyIndexFile,
  pipelineJsonFileForProject,
  rulesFile,
  setModuleRoot,
  workflowsFile,
  writeDefs,
  writeJson,
} from '/_102035_/l2/solution/fs.js';
import { ns5OntologyEntityIds } from '/_102035_/l2/solution/ontologyView.js';
import { isNs5RulesV2 } from '/_102035_/l2/solution/rulesView.js';
import { isNs5OntologyV3Version } from '/_102035_/l2/solution/types.js';

export interface NrpWritePayload {
  moduleName: string;
  project: number;
  request: string;
  triage: NrpTriage;
  artifacts: NrpModuleArtifacts;
  applied: NrpAppliedEdit[];
  issues: NrpGateIssue[];
  allowWrite: boolean;
  modelCalls: number;
}

export interface NrpPersistPlan {
  written: boolean;
  reason: string | null;
  files: string[];
}

export function planNrpPersistence(allowWrite: boolean, files: readonly string[]): NrpPersistPlan {
  if (!allowWrite || !nrpMayWrite('write')) {
    return { written: false, reason: 'Verification failed. Nothing was written.', files: [] };
  }
  return { written: true, reason: null, files: [...files] };
}

export function createWrite50Step(payload: NrpWritePayload): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    nextSteps: [],
    status: 'waiting_human_input',
    agentName: NRP_AGENT_NAME,
    stepTitle: 'Write the edited version',
    prompt: JSON.stringify({ nrpWrite: payload }),
    rags: [],
    planning: { planId: 'write50', dependsOn: ['gate40-done'], executionMode: 'sequential', executionHost: 'client' },
  };
}

export async function beforeNrpWriteStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const base = {
    messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task?.PK || '', parentStepId: parentStep.stepId,
  };
  try {
    const payload = readPayload(step.prompt);
    const planned = planNrpPersistence(payload.allowWrite, fileNames(payload));
    const writtenFiles = planned.written ? await persistNrp(payload, planned.files) : [];
    return [
      {
        type: 'add-step', ...base, step: {
          type: 'result', stepId: 0, status: 'completed', interaction: null, nextSteps: [],
          stepTitle: planned.written ? 'Version written' : 'Version not written',
          result: JSON.stringify({ written: planned.written, reason: planned.reason, files: writtenFiles, report: reportOf(payload, planned) }),
          planning: { planId: 'write50-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
        } as mls.msg.AIResultStep,
      },
      {
        type: 'update-status', ...base, stepId: step.stepId, hookSequential,
        status: 'completed', cleaner: 'input_output',
        traceMsg: planned.written ? `write50 wrote ${writtenFiles.length} files.` : 'write50 wrote nothing: verification failed.',
      },
    ];
  } catch (error) {
    console.error('[agentNewReleasePrompt] write50 failed', error);
    return [{
      type: 'update-status', ...base, stepId: step.stepId, hookSequential,
      status: 'failed', cleaner: 'input_output',
      traceMsg: error instanceof Error ? error.message : String(error),
    }];
  }
}

async function persistNrp(payload: NrpWritePayload, files: readonly string[]): Promise<string[]> {
  setModuleRoot(payload.moduleName, `${payload.moduleName}/${NRP_CANDIDATE_REL}`);
  const written: string[] = [];
  const artifacts = payload.artifacts;
  const kinds = new Set(payload.triage.artifacts);
  if (kinds.has('rules') && files.includes('rules.defs.ts')) {
    const typeName = isNs5RulesV2(artifacts.rules) ? 'Ns5RulesArtifactV2' : 'Ns5RulesArtifact';
    written.push(await writeDefs(rulesFile(payload.moduleName), `${payload.moduleName}Rules`, artifacts.rules, typeName));
  }
  if (kinds.has('access') && files.includes('access.defs.ts')) {
    written.push(await writeDefs(accessFile(payload.moduleName), `${payload.moduleName}Access`, artifacts.access, 'Ns5AccessArtifact'));
  }
  if (kinds.has('workflows') && files.includes('workflows.defs.ts')) {
    written.push(await writeDefs(workflowsFile(payload.moduleName), `${payload.moduleName}Workflows`, artifacts.workflows, 'Ns5WorkflowsArtifact'));
  }
  if (kinds.has('integration') && files.includes('integration.defs.ts')) {
    written.push(await writeDefs(integrationFile(payload.moduleName), `${payload.moduleName}Integration`, artifacts.integration, 'Ns5IntegrationArtifact'));
  }
  if (kinds.has('journeys')) {
    for (const journey of artifacts.journeys) {
      written.push(await writeDefs(journeyFile(payload.moduleName, journey.journeyId), `${journey.journeyId}Journey`, journey, 'Ns5JourneyArtifact'));
    }
    written.push(await writeDefs(journeyIndexFile(payload.moduleName), `${payload.moduleName}JourneyIndex`, artifacts.journeyIndex, 'Ns5JourneyIndexArtifact'));
  }
  if (kinds.has('ontology')) {
    const indexType = isNs5OntologyV3Version(artifacts.ontologyIndex.schemaVersion) ? 'Ns5OntologyIndexV3' : 'Ns5OntologyIndex';
    for (const entityId of ns5OntologyEntityIds(artifacts.ontologyIndex)) {
      const entity = artifacts.entities.find(item => item.entityId === entityId);
      if (!entity) continue;
      const entityType = isNs5OntologyV3Version(entity.schemaVersion) ? 'Ns5OntologyEntityV3' : 'Ns5OntologyEntityArtifact';
      written.push(await writeDefs(ontologyEntityFile(payload.moduleName, entityId), entityId, entity, entityType));
    }
    written.push(await writeDefs(ontologyIndexFile(payload.moduleName), `${payload.moduleName}OntologyIndex`, artifacts.ontologyIndex, indexType));
  }
  const reportFile = pipelineJsonFileForProject(payload.project, payload.moduleName, 'newReleasePrompt');
  if (reportFile.folder.startsWith(`${payload.moduleName}/${NRP_CANDIDATE_REL}`)) {
    reportFile.folder = `${payload.moduleName}/pipeline`;
  }
  written.push(await writeJson(reportFile, reportOf(payload, { written: true, reason: null, files: written })));
  return written;
}

function fileNames(payload: NrpWritePayload): string[] {
  const names: string[] = [];
  for (const kind of payload.triage.artifacts) {
    if (kind === 'journeys') names.push('journeys/index.defs.ts');
    else if (kind === 'ontology') names.push('ontology/index.defs.ts');
    else names.push(`${kind === 'rules' ? 'rules' : kind}.defs.ts`);
  }
  names.push('pipeline/newReleasePrompt.json');
  return names;
}

function reportOf(payload: NrpWritePayload, planned: NrpPersistPlan): Record<string, unknown> {
  const modelKinds = payload.applied.filter(edit => edit.mode === 'model').map(edit => edit.kind);
  return {
    request: payload.request,
    triage: payload.triage,
    changed: payload.triage.artifacts,
    mechanical: payload.triage.mechanical,
    modelKinds,
    checks: payload.issues,
    calls: payload.modelCalls,
    costUsd: 0,
    written: planned.written,
    reason: planned.reason,
  };
}

function readPayload(prompt: unknown): NrpWritePayload {
  let raw: unknown;
  try { raw = JSON.parse(String(prompt || '')); }
  catch (error) {
    console.error('[agentNewReleasePrompt] write prompt is not JSON', error);
    throw new Error('Write step prompt must be JSON.');
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Write step prompt must be an object.');
  const body = (raw as { nrpWrite?: NrpWritePayload }).nrpWrite;
  if (!body || typeof body !== 'object') throw new Error('Write step payload is missing.');
  return body;
}

