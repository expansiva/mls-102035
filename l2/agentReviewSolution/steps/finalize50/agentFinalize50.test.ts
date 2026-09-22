import assert from 'node:assert/strict';
import test from 'node:test';
import type { ReviewEntrySnapshot } from '/_102035_/l2/agentReviewSolution/helpers/entrySnapshot.js';
import { buildReviewTaskState } from '/_102035_/l2/agentReviewSolution/helpers/reviewTaskState.js';
import {
  beforeValidate40Step,
  createValidate40Step,
  VALIDATE40_PRIVATE_STATE_VERSION,
  type Validate40PrivateState,
} from '/_102035_/l2/agentReviewSolution/steps/validate40/agentValidate40.js';
import { validate40Private, type Validate40Input, type Validate40Result } from '/_102035_/l2/agentReviewSolution/steps/validate40/validate40.js';
import { RECONCILE30_PRIVATE_STATE_VERSION, type Reconcile30PrivateState } from '/_102035_/l2/agentReviewSolution/steps/reconcile30/agentReconcile30.js';
import { REVIEW20_PRIVATE_STATE_VERSION } from '/_102035_/l2/agentReviewSolution/steps/review20/agentReview20.js';
import { beforeCorrection45Step } from '/_102035_/l2/agentReviewSolution/steps/correction45/agentCorrection45.js';
import {
  loadNs5Access, loadNs5Entities, loadNs5Integration, loadNs5JourneyIndex, loadNs5Journeys,
  loadNs5Module, loadNs5OntologyIndex, loadNs5Rules, loadNs5Workflows,
} from '/_102035_/l2/agentNewSolution5/helpers/ns5RealFixtures.test.js';
import { L4_REVISION_SCHEMA, type L4SealedCandidateSnapshot } from '/_102035_/l2/newRelease/helpers/moduleRevision.js';
import { buildCandidateSnapshot, type CandidateReadResult } from '/_102035_/l2/newRelease/helpers/candidateGateway.js';
import { unavailableCandidateCoverage } from '/_102035_/l2/newRelease/helpers/candidateValidation.js';
import { normalizeTobeArtifactPath } from '/_102035_/l2/newRelease/tobe.js';
import { renderDefsSource } from '/_102035_/l2/solution/fs.js';
import {
  beforeFinalize50Step,
  createFinalize50Step,
  materializeFinalize50Sources,
  reviewPlannerPipeline,
  splitDefsEnvelope,
  type Finalize50Runtime,
} from './agentFinalize50.js';

const paths = [
  'access.defs.ts', 'integration.defs.ts', 'journeys/index.defs.ts', 'module.defs.ts',
  'ontology/AA.defs.ts', 'ontology/Aa.defs.ts', 'ontology/index.defs.ts',
  'rules.defs.ts', 'workflows.defs.ts',
] as const;
const invocation = {
  moduleName: 'agendaClinica',
  originalL4Path: 'l4/agendaClinica/pipeline/releases/base-1/l4',
  temporaryL4Path: 'l4/agendaClinica/tobe/plan',
  request: 'Change the title.',
  expectedRevisionId: 'rev-1',
};

void test('review pipeline sidecar is complete and identifies the sealed revision', () => {
  const value = reviewPlannerPipeline({
    project: 102047, moduleName: 'agendaClinica', changeId: 'change-1', revisionId: 'review-1',
    baseId: 'base-1', manifestHash: `sha256:${'a'.repeat(64)}`,
    validationContextHash: `sha256:${'b'.repeat(64)}`, correctionAttemptsUsed: 1,
    reviewSealHash: 'c'.repeat(64),
  });
  assert.equal(value.flowId, 'agentReviewSolution');
  assert.equal(value.status, 'complete');
  assert.equal(value.revision.revisionId, 'review-1');
  assert.equal(value.reviewSealHash, 'c'.repeat(64));
});

function defs(path: string, value: Record<string, unknown>): string {
  const name = path.replace(/[^A-Za-z0-9]/gu, '_');
  return `/// preserved:${path}\n\nexport const ${name} = ${JSON.stringify(value, null, 2)} as const;\n\nexport default ${name};\n`;
}

function inventory(title = 'Old title'): Record<string, Record<string, unknown>> {
  return Object.fromEntries(paths.map(path => [path, path === 'module.defs.ts'
    ? { schemaVersion: 'v2', moduleName: 'agendaClinica', title }
    : { schemaVersion: 'v2', moduleName: 'agendaClinica', path }]));
}

function sourceMap(values: Record<string, Record<string, unknown>>): Record<string, string> {
  return Object.fromEntries(paths.map(path => [path, defs(path, values[path])]));
}

async function prefixedHash(source: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  return `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

async function makeSnapshot(sources: Record<string, string>): Promise<ReviewEntrySnapshot> {
  const hashes = Object.fromEntries(await Promise.all(paths.map(async path => [path, await prefixedHash(sources[path])])));
  return {
    project: 102047,
    moduleName: 'agendaClinica',
    originalL4Path: invocation.originalL4Path,
    temporaryL4Path: invocation.temporaryL4Path,
    request: invocation.request,
    baseId: 'base-1',
    changeId: 'change-1',
    revisionId: 'rev-1',
    requestRevision: 3,
    originalHashes: { ...hashes },
    candidateHashes: { ...hashes },
    changedPaths: [],
  };
}

async function makeSnapshotForSources(sources: Record<string, string>): Promise<ReviewEntrySnapshot> {
  const sourcePaths = Object.keys(sources).sort();
  const hashes = Object.fromEntries(await Promise.all(sourcePaths.map(async path => [path, await prefixedHash(sources[path])])));
  return {
    project: 102047, moduleName: 'agendaClinica', originalL4Path: invocation.originalL4Path,
    temporaryL4Path: invocation.temporaryL4Path, request: invocation.request, baseId: 'base-1', changeId: 'change-1',
    revisionId: 'rev-1', requestRevision: 3, originalHashes: { ...hashes }, candidateHashes: { ...hashes }, changedPaths: [],
  };
}

function realInventory(): Record<string, unknown> {
  const values: Record<string, unknown> = {
    'module.defs.ts': loadNs5Module('agendaClinica'),
    'journeys/index.defs.ts': loadNs5JourneyIndex('agendaClinica'),
    'ontology/index.defs.ts': loadNs5OntologyIndex('agendaClinica'),
    'rules.defs.ts': loadNs5Rules('agendaClinica'),
    'workflows.defs.ts': loadNs5Workflows('agendaClinica'),
    'access.defs.ts': loadNs5Access('agendaClinica'),
    'integration.defs.ts': loadNs5Integration('agendaClinica'),
  };
  for (const journey of loadNs5Journeys('agendaClinica')) values[`journeys/${journey.journeyId}.defs.ts`] = journey;
  for (const entity of loadNs5Entities('agendaClinica')) values[`ontology/${entity.entityId}.defs.ts`] = entity;
  return values;
}

function sourceMapFor(values: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).map(([path, value]) => [path, defs(path, value as Record<string, unknown>)]));
}

test('materialization preserves wrappers and byte-identical unchanged files', async () => {
  const current = inventory();
  const sources = sourceMap(current);
  const snapshot = await makeSnapshot(sources);
  const draft = structuredClone(current);
  draft['module.defs.ts'].title = 'New title';
  const result = await materializeFinalize50Sources(snapshot, draft,
    async (_snapshot, path) => sources[path], async (_snapshot, path) => sources[path]);
  const changed = result.find(item => item.path === 'module.defs.ts')!;
  const originalEnvelope = splitDefsEnvelope(sources['module.defs.ts']);
  const outputEnvelope = splitDefsEnvelope(changed.outputSource);
  assert.equal(outputEnvelope.prefix, originalEnvelope.prefix);
  assert.equal(outputEnvelope.suffix, originalEnvelope.suffix);
  assert.equal((JSON.parse(outputEnvelope.objectSource) as { title: string }).title, 'New title');
  assert.equal(changed.changed, true);
  for (const unchanged of result.filter(item => item.path !== 'module.defs.ts')) {
    assert.equal(unchanged.outputSource, unchanged.inputSource);
    assert.equal(unchanged.changed, false);
  }
});

test('materialization fails closed for stale bytes, path changes and ambiguous wrappers', async () => {
  const current = inventory();
  const sources = sourceMap(current);
  const snapshot = await makeSnapshot(sources);
  await assert.rejects(() => materializeFinalize50Sources(snapshot, current,
    async (_snapshot, path) => sources[path], async (_snapshot, path) =>
      path === 'module.defs.ts' ? `${sources[path]} ` : sources[path]), /bytes are stale/u);
  const added = { ...current, 'workspaces/newPage.defs.ts': { schemaVersion: 'v2' } };
  await assert.rejects(() => materializeFinalize50Sources(snapshot, added,
    async (_snapshot, path) => sources[path], async (_snapshot, path) => sources[path]),
    /new, removed or renamed/u);
  const removed = { ...current };
  delete removed['rules.defs.ts'];
  await assert.rejects(() => materializeFinalize50Sources(snapshot, removed,
    async (_snapshot, path) => sources[path], async (_snapshot, path) => sources[path]),
    /new, removed or renamed/u);

  const ambiguous = `${sources['module.defs.ts']}\nexport const second = {};\n`;
  const ambiguousSnapshot = await makeSnapshot(sources);
  ambiguousSnapshot.candidateHashes['module.defs.ts'] = await prefixedHash(ambiguous);
  await assert.rejects(() => materializeFinalize50Sources(ambiguousSnapshot, current,
    async (_snapshot, path) => sources[path], async (_snapshot, path) =>
      path === 'module.defs.ts' ? ambiguous : sources[path]), /unsafe defs wrapper/u);
});

test('shared scanner handles nested braces and escaped quotes and rejects an unsafe suffix', async () => {
  const value = { schemaVersion: 'v2', text: 'quoted: \\"; export const inside = {}; braces: { nested }', nested: { ok: true } };
  const baseSource = defs('module.defs.ts', value);
  assert.deepEqual(JSON.parse(splitDefsEnvelope(baseSource).objectSource), value);
  const unsafe = baseSource.replace(/export default [A-Za-z0-9_]+;\n$/u, 'doDangerousThing();\n');
  const current = inventory();
  current['module.defs.ts'] = value;
  const sources = sourceMap(current);
  sources['module.defs.ts'] = baseSource;
  const snapshot = await makeSnapshot(sources);
  snapshot.candidateHashes['module.defs.ts'] = await prefixedHash(unsafe);
  await assert.rejects(() => materializeFinalize50Sources(snapshot, current,
    async (_snapshot, path) => sources[path], async (_snapshot, path) =>
      path === 'module.defs.ts' ? unsafe : sources[path]), /unsafe defs wrapper/u);
});

test('materialization accepts a canonical generated wrapper when it differs from the base wrapper', async () => {
  const current = inventory();
  const baseSources = sourceMap(current);
  const candidateSources: Record<string, string> = { ...baseSources, 'module.defs.ts': renderDefsSource({
    project: 102047, level: 4, folder: 'agendaClinica/tobe/plan', shortName: 'module', extension: '.defs.ts',
  }, 'agendaClinicaModule', current['module.defs.ts'], 'Ns5ModuleArtifact') };
  const snapshot = await makeSnapshot(baseSources);
  snapshot.candidateHashes['module.defs.ts'] = await prefixedHash(candidateSources['module.defs.ts']);
  const output = await materializeFinalize50Sources(snapshot, current,
    async (_snapshot, path) => baseSources[path], async (_snapshot, path) => candidateSources[path]);
  assert.equal(output.find(item => item.path === 'module.defs.ts')?.outputSource, candidateSources['module.defs.ts']);
});

test('finalize50 confirms mark, publishes in order and serializes no snapshot bytes', async () => withProject(async () => {
  const current = inventory();
  const draft = structuredClone(current);
  draft['module.defs.ts'].title = `New title ${'x'.repeat(120_000)}`;
  const sources = sourceMap(current);
  const snapshot = await makeSnapshot(sources);
  const taskState = await buildReviewTaskState(snapshot, { v2: { registryModuleNames: ['agendaClinica'] } }, 0);
  const validate = validateState(snapshot, taskState.validationContextHash, taskState.requestKey, draft);
  const inputSnapshot = await buildCandidateSnapshot({
    baseId: snapshot.baseId, requestRevision: snapshot.requestRevision, request: snapshot.request,
    sources: paths.map(path => ({ path, source: sources[path] })),
  });
  let confirmed: CandidateReadResult | null = null;
  let marked = 0;
  let markedArtifacts: Array<{ path: string; sha256: string }> = [];
  let markedResultId = '';
  let publishedSnapshot: Awaited<ReturnType<typeof buildCandidateSnapshot>> | null = null;
  const events: string[] = [];
  const initial: CandidateReadResult = { status: 'read', pointer: {
    changeId: snapshot.changeId, revisionId: snapshot.revisionId, snapshotHash: inputSnapshot.hash, revisionNumber: 7,
  }, snapshot: inputSnapshot };
  const runtime: Finalize50Runtime = {
    readSnapshot: async () => structuredClone(snapshot),
    readSealedCandidate: async () => sealed(snapshot, sources),
    readBaseSource: async (_frozen, path) => sources[path],
    buildSnapshot: buildCandidateSnapshot,
    replaySubmitted: async () => { events.push('replay-miss'); return null; },
    readAuthoritative: async () => {
      events.push(confirmed ? 'read-confirmed' : 'read-input');
      return confirmed || initial;
    },
    buildResult: async input => {
      markedArtifacts = structuredClone(input.result.artifacts);
      return { ...input, resultHash: await bareHash(JSON.stringify(input.result)) };
    },
    markResult: async input => {
      events.push('mark');
      marked += 1;
      markedResultId = input.resultId;
      assert.equal(input.outputSnapshot.hash, input.result.outputSnapshotHash);
      confirmed = { status: 'read', pointer: {
        ...initial.pointer!, resultRevisionId: input.expectedRevisionId,
        resultSnapshotHash: input.expectedSnapshotHash, resultRevisionNumber: input.expectedRevisionNumber,
        resultId: input.resultId, resultHash: input.resultHash,
      }, snapshot: inputSnapshot, result: {
        resultRevisionId: input.expectedRevisionId, resultSnapshotHash: input.expectedSnapshotHash,
        resultRevisionNumber: input.expectedRevisionNumber, resultId: input.resultId,
        resultHash: input.resultHash, manifest: input.result,
      } as never };
      return { status: 'marked', pointer: confirmed.pointer!, permit: {
        resultId: input.resultId,
        resultHash: input.resultHash,
        inputRevisionId: input.expectedRevisionId,
        inputSnapshotHash: input.expectedSnapshotHash,
        inputRevisionNumber: input.expectedRevisionNumber,
        outputSnapshotHash: input.result.outputSnapshotHash,
      } };
    },
    publishWithPermit: async (_scope, input) => {
      events.push('publish');
      publishedSnapshot = structuredClone(input.snapshot);
      return { status: 'committed', pointer: {
        changeId: input.changeId,
        revisionId: input.revisionId,
        snapshotHash: input.snapshot.hash,
        revisionNumber: 8,
      } };
    },
    writePlannerPipeline: async input => {
      events.push('pipeline');
      assert.equal(input.revisionId.startsWith('review-'), true);
      assert.equal(input.manifestHash, publishedSnapshot?.hash);
    },
    validateDraft: publishableValidation,
  };
  const intents = await beforeFinalize50Step(context(snapshot, taskState, validate), parent(), step(), 50, runtime);
  assert.deepEqual(intents.map(intent => intent.type), ['add-step', 'update-status']);
  assert.equal(marked, 1);
  assert.deepEqual(markedArtifacts.map(item => item.path), [...paths].sort());
  assert.deepEqual(events, ['replay-miss', 'read-input', 'mark', 'read-confirmed', 'publish', 'pipeline']);
  const serialized = ((intents[0] as mls.msg.AgentIntentAddStep).step as mls.msg.AIResultStep).result;
  assert.equal(serialized.includes('contentBase64'), false);
  assert.equal(serialized.includes('x'.repeat(100)), false);
  assert.ok(serialized.length < 5_000);
  const result = JSON.parse(serialized) as {
    outputSnapshotHash: string;
    correctionState: { requestKey: string; correctionAttemptsUsed: number };
    summary: { fileCount: number; changedPaths: string[] };
    pointer: { snapshotHash: string };
  };
  assert.ok(publishedSnapshot);
  assert.equal(result.pointer.snapshotHash, result.outputSnapshotHash);
  assert.deepEqual(result.correctionState, { requestKey: taskState.requestKey, correctionAttemptsUsed: 0 });
  assert.equal(result.summary.fileCount, paths.length);
  assert.deepEqual(result.summary.changedPaths, ['module.defs.ts']);
  const expectedResultIdHash = await bareHash(JSON.stringify({
    project: snapshot.project,
    moduleName: snapshot.moduleName,
    changeId: snapshot.changeId,
    inputRevisionId: snapshot.revisionId,
    inputSnapshotHash: inputSnapshot.hash,
    outputSnapshotHash: result.outputSnapshotHash,
    validationContextHash: validate.validationContextHash,
    correctionState: validate.correctionState,
  }));
  assert.equal(markedResultId, `result-${expectedResultIdHash.slice(0, 32)}`);
  const exactPublished = publishedSnapshot as unknown as Awaited<ReturnType<typeof buildCandidateSnapshot>>;
  const moduleFile = exactPublished.files.find(file => file.path === 'module.defs.ts')!;
  const outputSource = Buffer.from(moduleFile.contentBase64, 'base64').toString('utf8');
  const envelope = splitDefsEnvelope(outputSource);
  assert.equal(envelope.prefix, splitDefsEnvelope(sources['module.defs.ts']).prefix);
  assert.equal((JSON.parse(envelope.objectSource) as { title: string }).title, draft['module.defs.ts'].title);
}));

test('finalize50 rejects byte tamper before mark and preserves the private draft', async () => withProject(async () => {
  const current = inventory();
  const sources = sourceMap(current);
  const snapshot = await makeSnapshot(sources);
  const taskState = await buildReviewTaskState(snapshot, { v2: { registryModuleNames: ['agendaClinica'] } }, 0);
  const draft = structuredClone(current);
  draft['module.defs.ts'].title = 'New title';
  let marks = 0;
  const runtime: Finalize50Runtime = {
    readSnapshot: async () => structuredClone(snapshot),
    readSealedCandidate: async () => {
      const tampered: Record<string, string> = { ...sources, 'module.defs.ts': `${sources['module.defs.ts']} ` };
      return { ...sealed(snapshot, sources), sources: paths.map(path => ({ path, source: tampered[path] })) };
    },
    readBaseSource: async (_frozen, path) => sources[path],
    buildSnapshot: buildCandidateSnapshot,
    replaySubmitted: async () => { throw new Error('must not replay before byte integrity'); },
    readAuthoritative: async () => { throw new Error('must not read authoritative state'); },
    buildResult: async input => ({ ...input, resultHash: 'f'.repeat(64) }),
    markResult: async () => { marks += 1; throw new Error('must not mark'); },
    publishWithPermit: async () => { throw new Error('must not publish'); },
    validateDraft: publishableValidation,
  };
  const intents = await beforeFinalize50Step(
    context(snapshot, taskState, validateState(snapshot, taskState.validationContextHash, taskState.requestKey, draft)),
    parent(), step(), 51, runtime,
  );
  assert.equal((intents[0] as mls.msg.AgentIntentUpdateStatus).status, 'failed');
  assert.match(String((intents[0] as mls.msg.AgentIntentUpdateStatus).traceMsg), /bytes are stale/u);
  assert.equal(marks, 0);
}));

test('finalize50 replays a durable committed submission after ack loss without a second mark', async () => withProject(async () => {
  const current = inventory();
  const draft = structuredClone(current);
  draft['module.defs.ts'].title = 'New title';
  const sources = sourceMap(current);
  const snapshot = await makeSnapshot(sources);
  const taskState = await buildReviewTaskState(snapshot, { v2: { registryModuleNames: ['agendaClinica'] } }, 0);
  const inputSnapshot = await buildCandidateSnapshot({
    baseId: snapshot.baseId, requestRevision: snapshot.requestRevision, request: snapshot.request,
    sources: paths.map(path => ({ path, source: sources[path] })),
  });
  let confirmed: CandidateReadResult | null = null;
  let committed: { changeId: string; revisionId: string; snapshotHash: string; revisionNumber: number } | null = null;
  let submitted: { changeId: string; revisionId: string; snapshotHash: string } | null = null;
  let marks = 0;
  const events: string[] = [];
  const initial: CandidateReadResult = { status: 'read', pointer: {
    changeId: snapshot.changeId, revisionId: snapshot.revisionId, snapshotHash: inputSnapshot.hash, revisionNumber: 7,
  }, snapshot: inputSnapshot };
  const runtime: Finalize50Runtime = {
    readSnapshot: async () => structuredClone(snapshot),
    readSealedCandidate: async () => sealed(snapshot, sources),
    readBaseSource: async (_frozen, path) => sources[path],
    buildSnapshot: buildCandidateSnapshot,
    replaySubmitted: async (_scope, input) => {
      if (submitted && committed && submitted.changeId === input.changeId
        && submitted.revisionId === input.revisionId && submitted.snapshotHash === input.snapshot.hash) {
        events.push('replay-hit');
        return { status: 'committed', pointer: committed };
      }
      events.push('replay-miss');
      return null;
    },
    readAuthoritative: async () => {
      if (committed) return { status: 'read', pointer: committed, snapshot: inputSnapshot };
      events.push(confirmed ? 'read-confirmed' : 'read-input');
      return confirmed || initial;
    },
    buildResult: async input => ({ ...input, resultHash: await bareHash(JSON.stringify(input.result)) }),
    markResult: async input => {
      events.push('mark');
      marks += 1;
      const permit = {
        resultId: input.resultId, resultHash: input.resultHash,
        inputRevisionId: input.expectedRevisionId, inputSnapshotHash: input.expectedSnapshotHash,
        inputRevisionNumber: input.expectedRevisionNumber, outputSnapshotHash: input.result.outputSnapshotHash,
      };
      confirmed = { status: 'read', pointer: {
        ...initial.pointer!, resultRevisionId: input.expectedRevisionId,
        resultSnapshotHash: input.expectedSnapshotHash, resultRevisionNumber: input.expectedRevisionNumber,
        resultId: input.resultId, resultHash: input.resultHash,
      }, snapshot: inputSnapshot, result: {
        resultRevisionId: input.expectedRevisionId, resultSnapshotHash: input.expectedSnapshotHash,
        resultRevisionNumber: input.expectedRevisionNumber, resultId: input.resultId,
        resultHash: input.resultHash, manifest: input.result,
      } as never };
      return { status: 'marked', pointer: confirmed.pointer!, permit };
    },
    publishWithPermit: async () => {
      throw new Error('unreachable');
    },
    validateDraft: publishableValidation,
  };
  runtime.publishWithPermit = async (_scope, input) => {
    events.push('publish-crash');
    submitted = { changeId: input.changeId, revisionId: input.revisionId, snapshotHash: input.snapshot.hash };
    committed = {
      changeId: input.changeId, revisionId: input.revisionId,
      snapshotHash: input.snapshot.hash, revisionNumber: 8,
    };
    throw new Error('candidate.transport_ack_lost');
  };
  const readyContext = context(
    snapshot,
    taskState,
    validateState(snapshot, taskState.validationContextHash, taskState.requestKey, draft),
  );
  const first = await beforeFinalize50Step(
    readyContext,
    parent(), step(), 52, runtime,
  );
  assert.deepEqual(events, ['replay-miss', 'read-input', 'mark', 'read-confirmed', 'publish-crash']);
  assert.equal(first.length, 1);
  assert.equal((first[0] as mls.msg.AgentIntentUpdateStatus).status, 'failed');
  assert.match(String((first[0] as mls.msg.AgentIntentUpdateStatus).traceMsg), /transport_ack_lost/u);
  assert.equal(marks, 1);

  events.length = 0;
  const second = await beforeFinalize50Step(
    readyContext,
    parent(), step(), 53, runtime,
  );
  assert.deepEqual(events, ['replay-hit']);
  assert.deepEqual(second.map(intent => intent.type), ['add-step', 'update-status']);
  assert.equal(marks, 1);
  const replayResult = JSON.parse(((second[0] as mls.msg.AgentIntentAddStep).step as mls.msg.AIResultStep).result) as {
    outputSnapshotHash: string; pointer: { snapshotHash: string };
  };
  assert.equal(replayResult.outputSnapshotHash, committed!.snapshotHash);
  assert.equal(replayResult.pointer.snapshotHash, committed!.snapshotHash);

  events.length = 0;
  const mismatchDraft = structuredClone(draft);
  mismatchDraft['module.defs.ts'].title = 'Different output';
  const mismatch = await beforeFinalize50Step(
    context(snapshot, taskState, validateState(snapshot, taskState.validationContextHash, taskState.requestKey, mismatchDraft)),
    parent(), step(), 54,
    runtime,
  );
  assert.deepEqual(events, ['replay-miss']);
  assert.equal(mismatch.length, 1);
  assert.equal((mismatch[0] as mls.msg.AgentIntentUpdateStatus).status, 'failed');
  assert.match(String((mismatch[0] as mls.msg.AgentIntentUpdateStatus).traceMsg), /Authoritative candidate differs/u);
  assert.equal(marks, 1);
}));

test('correction45 to validate40 ready reaches finalize50 with the authoritative counter and exact publish', async () => withProject(async () => {
  const prepared = await prepareCorrectedFlow();
  const inputSnapshot = await buildCandidateSnapshot({
    baseId: prepared.snapshot.baseId,
    requestRevision: prepared.snapshot.requestRevision,
    request: prepared.snapshot.request,
    sources: Object.keys(prepared.sources).sort().map(path => ({ path, source: prepared.sources[path] })),
  });
  let confirmed: CandidateReadResult | null = null;
  let marked = 0;
  let published: Awaited<ReturnType<typeof buildCandidateSnapshot>> | null = null;
  const initial: CandidateReadResult = { status: 'read', pointer: {
    changeId: prepared.snapshot.changeId, revisionId: prepared.snapshot.revisionId,
    snapshotHash: inputSnapshot.hash, revisionNumber: 9,
  }, snapshot: inputSnapshot };
  const runtime: Finalize50Runtime = {
    readSnapshot: async () => structuredClone(prepared.snapshot),
    readSealedCandidate: async () => sealed(prepared.snapshot, prepared.sources),
    readBaseSource: async (_snapshot, path) => prepared.sources[path],
    buildSnapshot: buildCandidateSnapshot,
    replaySubmitted: async () => null,
    readAuthoritative: async () => confirmed || initial,
    buildResult: async input => ({ ...input, resultHash: await bareHash(JSON.stringify(input.result)) }),
    markResult: async input => {
      marked += 1;
      confirmed = { status: 'read', pointer: {
        ...initial.pointer!, resultRevisionId: input.expectedRevisionId,
        resultSnapshotHash: input.expectedSnapshotHash, resultRevisionNumber: input.expectedRevisionNumber,
        resultId: input.resultId, resultHash: input.resultHash,
      }, snapshot: inputSnapshot, result: {
        resultRevisionId: input.expectedRevisionId, resultSnapshotHash: input.expectedSnapshotHash,
        resultRevisionNumber: input.expectedRevisionNumber, resultId: input.resultId,
        resultHash: input.resultHash, manifest: input.result,
      } as never };
      return { status: 'marked', pointer: confirmed.pointer!, permit: {
        resultId: input.resultId, resultHash: input.resultHash,
        inputRevisionId: input.expectedRevisionId, inputSnapshotHash: input.expectedSnapshotHash,
        inputRevisionNumber: input.expectedRevisionNumber, outputSnapshotHash: input.result.outputSnapshotHash,
      } };
    },
    publishWithPermit: async (_scope, input) => {
      published = structuredClone(input.snapshot);
      return { status: 'committed', pointer: {
        changeId: input.changeId, revisionId: input.revisionId,
        snapshotHash: input.snapshot.hash, revisionNumber: 10,
      } };
    },
    validateDraft: validate40Private,
  };
  const intents = await beforeFinalize50Step(prepared.context, parent(), prepared.finalizeStep, 60, runtime);
  assert.deepEqual(intents.map(intent => intent.type), ['add-step', 'update-status']);
  assert.equal(marked, 1);
  const final = JSON.parse(((intents[0] as mls.msg.AgentIntentAddStep).step as mls.msg.AIResultStep).result) as {
    correctionState: { requestKey: string; correctionAttemptsUsed: number };
  };
  assert.deepEqual(final.correctionState, { requestKey: prepared.taskState.requestKey, correctionAttemptsUsed: 1 });
  assert.ok(published);
  const output = published as unknown as Awaited<ReturnType<typeof buildCandidateSnapshot>>;
  const moduleSource = Buffer.from(output.files.find(file => file.path === 'module.defs.ts')!.contentBase64, 'base64').toString('utf8');
  const rulesSource = Buffer.from(output.files.find(file => file.path === 'rules.defs.ts')!.contentBase64, 'base64').toString('utf8');
  assert.equal(
    (JSON.parse(splitDefsEnvelope(moduleSource).objectSource) as { title: string }).title,
    (prepared.base['module.defs.ts'] as ReturnType<typeof loadNs5Module>).title,
  );
  assert.match(
    (JSON.parse(splitDefsEnvelope(rulesSource).objectSource) as ReturnType<typeof loadNs5Rules>).rules[0].description,
    /Clarified\.$/u,
  );
}));

test('finalize50 refuses a tampered ready private result before mark or publish', async () => withProject(async () => {
  const prepared = await prepareCorrectedFlow();
  const steps = prepared.context.task!.iaCompressed!.nextSteps as mls.msg.AIPayload[];
  const ready = steps.find(item => item.type === 'result' && item.planning?.planId === 'validate40-private-result') as mls.msg.AIResultStep;
  const tampered = JSON.parse(ready.result) as Validate40PrivateState;
  tampered.affectedAreas = ['module', 'rules'];
  ready.result = JSON.stringify(tampered);
  let writes = 0;
  const runtime: Finalize50Runtime = {
    readSnapshot: async () => structuredClone(prepared.snapshot),
    readSealedCandidate: async () => { throw new Error('must reject before sealed bytes'); },
    readBaseSource: async () => { throw new Error('must reject before source reads'); },
    buildSnapshot: buildCandidateSnapshot,
    replaySubmitted: async () => { writes += 1; throw new Error('must not replay'); },
    readAuthoritative: async () => { writes += 1; throw new Error('must not read candidate'); },
    buildResult: async input => ({ ...input, resultHash: 'f'.repeat(64) }),
    markResult: async () => { writes += 1; throw new Error('must not mark'); },
    publishWithPermit: async () => { writes += 1; throw new Error('must not publish'); },
    validateDraft: validate40Private,
  };
  const intents = await beforeFinalize50Step(prepared.context, parent(), prepared.finalizeStep, 61, runtime);
  assert.equal((intents[0] as mls.msg.AgentIntentUpdateStatus).status, 'failed');
  assert.match(String((intents[0] as mls.msg.AgentIntentUpdateStatus).traceMsg), /altered|deterministic validation/u);
  assert.equal(writes, 0);
}));

function sealed(snapshot: ReviewEntrySnapshot, sources: Record<string, string>): L4SealedCandidateSnapshot {
  return {
    manifest: {
      schemaVersion: L4_REVISION_SCHEMA,
      project: snapshot.project,
      moduleName: snapshot.moduleName,
      changeId: snapshot.changeId,
      revisionId: snapshot.revisionId,
      baseId: snapshot.baseId,
      createdAt: '2026-09-21T00:00:00.000Z',
      files: { ...snapshot.candidateHashes },
      changedPaths: [...snapshot.changedPaths],
      requestRevision: snapshot.requestRevision,
      requestHash: 'sha256:sealed-by-test-runtime',
    },
    request: snapshot.request,
    sources: Object.keys(sources).sort().map(path => ({ path: normalizeTobeArtifactPath(path), source: sources[path] })),
  };
}

function validateState(
  snapshot: ReviewEntrySnapshot,
  validationContextHash: string,
  requestKey: string,
  draft: Record<string, unknown>,
): Validate40PrivateState {
  const coverage = unavailableCandidateCoverage('Not affected.');
  coverage.module = { status: 'checked' };
  return {
    schemaVersion: VALIDATE40_PRIVATE_STATE_VERSION,
    sourceReconcileSchemaVersion: RECONCILE30_PRIVATE_STATE_VERSION,
    project: snapshot.project,
    moduleName: snapshot.moduleName,
    baseId: snapshot.baseId,
    changeId: snapshot.changeId,
    revisionId: snapshot.revisionId,
    requestRevision: snapshot.requestRevision,
    originalHashes: { ...snapshot.originalHashes },
    candidateHashes: { ...snapshot.candidateHashes },
    validationContextHash,
    correctionState: { requestKey, correctionAttemptsUsed: 0 },
    status: 'ready',
    coreStatus: 'publishable',
    publishable: true,
    mayCorrect: false,
    schemaFamily: 'v2',
    affectedAreas: ['module'],
    unsupportedPaths: [],
    reasons: [],
    draft,
    validation: { ok: true, oracle: null, coverage, issues: [] },
  };
}

function context(snapshot: ReviewEntrySnapshot, taskState: Awaited<ReturnType<typeof buildReviewTaskState>>, validate: Validate40PrivateState): mls.msg.ExecutionContext {
  const reconciled = reconcileState(snapshot, taskState, validate.draft);
  const reconcileResult: mls.msg.AIResultStep = {
    type: 'result', stepId: 31, status: 'completed', interaction: null, nextSteps: [], result: JSON.stringify(reconciled),
    planning: { planId: 'reconcile30-private-result', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  };
  const result: mls.msg.AIResultStep = {
    type: 'result', stepId: 41, status: 'completed', interaction: null, nextSteps: [], result: JSON.stringify(validate),
    planning: { planId: 'validate40-private-result', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  };
  return workflowContext(snapshot, taskState, [reconcileResult, result]);
}

function workflowContext(
  snapshot: ReviewEntrySnapshot,
  taskState: Awaited<ReturnType<typeof buildReviewTaskState>>,
  nextSteps: mls.msg.AIPayload[],
): mls.msg.ExecutionContext {
  return {
    message: { orderAt: 'order', threadId: 'thread' },
    task: { PK: 'task#one', iaCompressed: { longMemory: {
      entrySnapshot: JSON.stringify(snapshot), reviewPrivateState: JSON.stringify(taskState),
    }, nextSteps } },
    isTest: true,
  } as unknown as mls.msg.ExecutionContext;
}

function reconcileState(
  snapshot: ReviewEntrySnapshot,
  taskState: Awaited<ReturnType<typeof buildReviewTaskState>>,
  draft: Record<string, unknown>,
  base: Record<string, unknown> = inventory(),
): Reconcile30PrivateState {
  const changedPaths = [...new Set([...Object.keys(base), ...Object.keys(draft)])].sort()
    .filter(path => JSON.stringify(base[path]) !== JSON.stringify(draft[path]));
  const directAreas = [...new Set(changedPaths.flatMap(path => path === 'module.defs.ts' ? ['module']
    : path === 'rules.defs.ts' ? ['rules'] : path.startsWith('journeys/') ? ['journeys']
      : path.startsWith('ontology/') ? ['ontologyAssembly', 'ontologyEntities']
        : path === 'workflows.defs.ts' ? ['workflows'] : path === 'access.defs.ts' ? ['access']
          : path === 'integration.defs.ts' ? ['integration'] : []))] as Reconcile30PrivateState['directAreas'];
  return {
    schemaVersion: RECONCILE30_PRIVATE_STATE_VERSION,
    sourceReviewSchemaVersion: REVIEW20_PRIVATE_STATE_VERSION,
    project: snapshot.project,
    moduleName: snapshot.moduleName,
    baseId: snapshot.baseId,
    changeId: snapshot.changeId,
    revisionId: snapshot.revisionId,
    requestRevision: snapshot.requestRevision,
    originalHashes: { ...snapshot.originalHashes },
    candidateHashes: { ...snapshot.candidateHashes },
    validationContextHash: taskState.validationContextHash,
    correctionState: { requestKey: taskState.requestKey, correctionAttemptsUsed: taskState.correctionAttemptsUsed },
    status: 'ready',
    schemaFamily: 'v2',
    changedPaths,
    directAreas,
    dependencyAreas: [...directAreas],
    diagnostics: directAreas.map(area => ({ area, status: 'checked', reason: 'Checked by test fixture.', issues: [] })),
    clarification: '',
    base: structuredClone(base),
    draft: structuredClone(draft),
    mutations: [],
  };
}

async function prepareCorrectedFlow(): Promise<{
  base: Record<string, unknown>;
  sources: Record<string, string>;
  snapshot: ReviewEntrySnapshot;
  taskState: Awaited<ReturnType<typeof buildReviewTaskState>>;
  context: mls.msg.ExecutionContext;
  finalizeStep: mls.msg.AIAgentStep;
}> {
  const base = realInventory();
  const sources = sourceMapFor(base);
  const snapshot = await makeSnapshotForSources(sources);
  const validationContext = { v2: { registryModuleNames: ['agendaClinica'] } };
  const taskState = await buildReviewTaskState(snapshot, validationContext, 0);
  const draft = structuredClone(base);
  (draft['module.defs.ts'] as ReturnType<typeof loadNs5Module>).title = '';
  (draft['rules.defs.ts'] as ReturnType<typeof loadNs5Rules>).rules[0].description += ' Clarified.';
  const reconciled = reconcileState(snapshot, taskState, draft, base);
  const reconcileResult: mls.msg.AIResultStep = {
    type: 'result', stepId: 31, status: 'completed', interaction: null, nextSteps: [], result: JSON.stringify(reconciled),
    planning: { planId: 'reconcile30-private-result', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  };
  const context = workflowContext(snapshot, taskState, [reconcileResult]);
  const initialValidate = { ...createValidate40Step(JSON.stringify(invocation)), stepId: 40 };
  const first = await beforeValidate40Step(context, parent(), initialValidate, 70);
  const invalidResult = (first[0] as mls.msg.AgentIntentAddStep).step as mls.msg.AIResultStep;
  const correctionStep = (first[1] as mls.msg.AgentIntentAddStep).step as mls.msg.AIAgentStep;
  assert.equal(invalidResult.planning?.planId, 'validate40-private-terminal-0');
  assert.equal(correctionStep.planning?.planId, 'correction45-attempt-1');
  (context.task!.iaCompressed!.nextSteps as mls.msg.AIPayload[]).push(invalidResult);

  const correction = await beforeCorrection45Step(context, parent(), correctionStep, 71);
  const correctionResult = (correction[0] as mls.msg.AgentIntentAddStep).step as mls.msg.AIResultStep;
  const retryStep = (correction[1] as mls.msg.AgentIntentAddStep).step as mls.msg.AIAgentStep;
  assert.equal(correctionResult.planning?.planId, 'correction45-private-result-1', invalidResult.result);
  assert.equal(retryStep.planning?.planId, 'validate40-attempt-1');
  (context.task!.iaCompressed!.nextSteps as mls.msg.AIPayload[]).push(correctionResult);

  const retry = await beforeValidate40Step(context, parent(), retryStep, 72);
  const readyResult = (retry[0] as mls.msg.AgentIntentAddStep).step as mls.msg.AIResultStep;
  const finalizeStep = (retry[1] as mls.msg.AgentIntentAddStep).step as mls.msg.AIAgentStep;
  assert.equal(readyResult.planning?.planId, 'validate40-private-result');
  assert.equal(finalizeStep.planning?.planId, 'finalize50');
  (context.task!.iaCompressed!.nextSteps as mls.msg.AIPayload[]).push(readyResult);
  return { base, sources, snapshot, taskState, context, finalizeStep };
}

async function publishableValidation(input: Validate40Input): Promise<Validate40Result> {
  const coverage = unavailableCandidateCoverage('Not affected.');
  coverage.module = { status: 'checked' };
  return {
    status: 'publishable', publishable: true, mayCorrect: false, schemaFamily: 'v2', affectedAreas: ['module'],
    unsupportedPaths: [], state: { ...input.state }, draft: structuredClone(input.proposal),
    validation: { ok: true, oracle: null, coverage, issues: [] }, reasons: [],
  };
}

function parent(): mls.msg.AIAgentStep {
  return { type: 'agent', agentName: 'agentReviewSolution', stepId: 1, status: 'in_progress', interaction: null, nextSteps: [], rags: [] };
}

function step(): mls.msg.AIAgentStep {
  return { ...createFinalize50Step(JSON.stringify(invocation)), stepId: 50, status: 'waiting_dependency' };
}

async function bareHash(source: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function withProject<T>(fn: () => Promise<T>): Promise<T> {
  const previous = (globalThis as { mls?: unknown }).mls;
  (globalThis as { mls?: unknown }).mls = { actualProject: 102047, stor: { files: {} } };
  try { return await fn(); }
  finally { (globalThis as { mls?: unknown }).mls = previous; }
}
