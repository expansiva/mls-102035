import test from 'node:test';
import assert from 'node:assert/strict';
import type { InitialReviewDependencies } from './review.js';
import type { InitialImplementationPlan, L4ImplementationRecord } from '../../solution/candidate/moduleImplementation.js';
import type { L4SealedCandidateSnapshot, L4ChangeRecord, L4ReleaseManifest } from '../../solution/candidate/moduleRevision.js';

const documentStub = globalThis.document as Document & Record<string, unknown>;
documentStub.createTreeWalker = (() => ({ nextNode: () => null, currentNode: null })) as never;
documentStub.createElement = ((tag: string) => ({ tagName: tag.toUpperCase(), textContent: '' })) as never;
documentStub.createComment = (() => ({})) as never;
documentStub.head = { querySelector: () => null, appendChild: () => undefined } as never;
(globalThis as unknown as { window: typeof globalThis }).window = globalThis;
if (!globalThis.customElements) (globalThis as unknown as { customElements: unknown }).customElements = { define() {}, get() {} };
if (!globalThis.HTMLElement) (globalThis as unknown as { HTMLElement: unknown }).HTMLElement = class extends EventTarget {};
const storage = new Map<string, string>([['serviceCollabMessages', JSON.stringify({ userId: 'reviewer' })]]);
(globalThis as unknown as { localStorage: unknown }).localStorage = { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) };

const loader = require('node:module') as { _load: (request: string, ...args: unknown[]) => any };
const previousLoad = loader._load;
let reviewModule: typeof import('./review.ts');
try {
  loader._load = function (request, ...args) {
    if (request === 'lit/decorators.js') return { customElement: () => () => undefined,
      property: () => () => undefined, state: () => () => undefined, query: () => () => undefined };
    return previousLoad.call(this, request, ...args);
  };
  reviewModule = require('./review.ts');
} finally { loader._load = previousLoad; }
const { applyInitialReview, reviewInitialCandidate, NewReleaseReview102035 } = reviewModule;
const { implementationCommands } = require('../../solution/candidate/moduleImplementation.ts') as typeof import('../../solution/candidate/moduleImplementation.ts');
const { L4_REVISION_SCHEMA } = require('../../solution/candidate/moduleRevision.ts') as typeof import('../../solution/candidate/moduleRevision.ts');

function setup(edited = false, fresh = true) {
  const calls: string[] = [];
  const project = 102035;
  const moduleName = 'fixture';
  const changeId = 'change1';
  const baseId = 'base1';
  const plan: InitialImplementationPlan = { project, moduleName, fresh, hashes: {
    'pool/l2/web/menu.json': 'menu-hash', 'pool/l1/web/needs.json': 'needs-hash', 'pool/l2/web/backend.json': 'backend-hash', 'pool/l2/web/effort.json': 'effort-hash',
  }, pipelines: { l1: 'l1-hash', l2: 'l2-hash' }, l4Hashes: { 'module.defs.ts': 'source-hash' } };
  const manifest = { schemaVersion: L4_REVISION_SCHEMA, project, moduleName, changeId, baseId,
    revisionId: 'rev1', createdAt: '', files: plan.l4Hashes, changedPaths: edited ? ['module.defs.ts'] : [], requestRevision: edited ? 1 : 0, requestHash: 'request-hash' };
  const sealed: L4SealedCandidateSnapshot = { manifest, request: edited ? 'saved structured edits' : '', sources: [] };
  const change: L4ChangeRecord = { schemaVersion: L4_REVISION_SCHEMA, project, moduleName, changeId, baseId,
    activeRevisionId: edited ? 'before-seal' : null, resultRevisionId: null, requestRevision: edited ? 1 : 0, sourcePrompt: '', updatedAt: '' };
  const release: L4ReleaseManifest = { schemaVersion: L4_REVISION_SCHEMA, project, moduleName, baseId,
    createdAt: '', files: plan.l4Hashes, schemas: {}, provenance: { status: 'unverified', label: '' } };
  let accepted: L4ImplementationRecord | undefined;
  const dependencies: InitialReviewDependencies = {
    plan: async () => { calls.push('plan'); return plan; },
    prepare: async () => { calls.push('prepare'); return { change, release, created: !edited }; },
    seal: async (_project, _module, expected) => { calls.push('seal'); assert.equal(expected, change.activeRevisionId); return manifest; },
    readSealed: async () => { calls.push('readSealed'); return sealed; },
    review: async (snapshot, userId) => { calls.push('review'); assert.equal(userId, 'reviewer'); return { ...snapshot, manifest: { ...snapshot.manifest, revisionId: 'reviewed' } }; },
    sealLayers: async () => { calls.push('layers'); return { schemaVersion: '2026-10-08-module-layers-v1', project, moduleName, baseId, createdAt: '', files: [] }; },
    promote: async (_project, _module, expectedChange, revisionId) => { calls.push('promote'); assert.equal(expectedChange, changeId); assert.equal(revisionId, edited ? 'reviewed' : 'rev1'); return { ...change, activeRevisionId: revisionId, promotedRevisionId: revisionId }; },
    accept: async (_project, _module, input) => {
      calls.push('accept'); assert.equal(input.kind, 'initial');
      if (input.kind !== 'initial') throw new Error('Expected initial acceptance');
      assert.deepEqual(input.plan, plan);
      accepted = { schemaVersion: '2026-10-08-nr-module-implementation-v1', changeId, revisionId: input.revisionId, acceptedBy: input.acceptedBy, acceptedAt: '',
        hashes: { plans: plan.hashes }, merged: { create: [], regenerateDefs: [], materialize: [], remove: [], runAgents: [], abend: [] },
        initial: { plan, replan: edited || !fresh, promotedAt: '' }, phases: [] };
      return accepted;
    },
  };
  return { calls, plan, change, sealed, dependencies, input: { project, moduleName, acceptedBy: 'reviewer', changeId: edited ? changeId : null, revisionId: edited ? 'before-seal' : null }, accepted: () => accepted };
}

for (const edited of [false, true]) test(`mr41 s3c Apply ${edited ? 'edited' : 'neutral'} creates and accepts initial revision in order`, async () => {
  const f = setup(edited);
  const record = await applyInitialReview(f.input, f.dependencies);
  assert.deepEqual(f.calls, ['plan', 'prepare', 'seal', 'readSealed', ...(edited ? ['review'] : []), 'layers', 'promote', 'accept']);
  assert.equal(record.revisionId, edited ? 'reviewed' : 'rev1');
  assert.equal(record.initial?.replan, edited);
  assert.equal(implementationCommands(record, 102035, 'fixture')[0].agent, edited ? 'agentPlannerL4' : 'agentDefsL2');
  assert.ok(implementationCommands(record, 102035, 'fixture').every(ref => !ref.command.includes('/candidate') && !ref.agent.startsWith('agentNewRelease')));
});

test('mr41 s3c old planning reaches acceptance with the original stale snapshot', async () => {
  const f = setup(false, false);
  const record = await applyInitialReview(f.input, f.dependencies);
  assert.equal(record.initial?.plan.fresh, false);
  assert.equal(implementationCommands(record, 102035, 'fixture')[0].command, '@@agentPlannerL4 fixture');
  assert.ok(!f.calls.includes('review'));
});

test('mr41 s3c refused reviewer stops before promotion and acceptance', async () => {
  const f = setup(true);
  f.dependencies.review = async () => { f.calls.push('review'); throw new Error('refused: invalid edit'); };
  await assert.rejects(applyInitialReview(f.input, f.dependencies), /refused/);
  assert.deepEqual(f.calls, ['plan', 'prepare', 'seal', 'readSealed', 'review']);
});

test('mr41 s3c changed active revision or changed screen context stops Apply', async () => {
  const f = setup();
  f.dependencies.current = () => f.calls.length < 2;
  await assert.rejects(applyInitialReview(f.input, f.dependencies), /implementation_conflict/);
  assert.ok(!f.calls.includes('promote'));
  const other = setup(true);
  other.input.revisionId = 'other';
  await assert.rejects(applyInitialReview(other.input, other.dependencies), /implementation_conflict/);
  assert.deepEqual(other.calls, ['plan', 'prepare']);
});

function widget() {
  const element = new NewReleaseReview102035();
  const review = element as unknown as Record<string, any>;
  review.project = 102035; review.moduleName = 'fixture'; review.version = 'asis';
  review.loading = false; review.hasRelease = false; review.initialPlan = setup().plan;
  review.data = { pipeline: { status: 'complete' }, validation: { ok: true }, diffs: [], changeId: null, revisionId: null };
  review.loadedFor = { project: review.project, moduleName: review.moduleName, version: review.version, data: review.data };
  review.t = (key: string) => key;
  return review;
}
function templateText(value: any): string {
  if (value?.strings) return value.strings.reduce((text: string, part: string, index: number) => text + part + templateText(value.values[index]), '');
  return Array.isArray(value) ? value.map(templateText).join('') : typeof value === 'string' ? value : '';
}

test('mr41 s3c new planned module without active change has Apply and never Calculate', () => {
  const review = widget();
  const action = review.actionPresentation(review.view(), true);
  assert.equal(action.kind, 'continue'); assert.equal(action.disabled, false);
  assert.equal(action.labelKey, 'review.implementation.accept');
  const output = templateText(review.render());
  assert.match(output, /review\.implementation\.accept/);
  assert.doesNotMatch(output, /review\.calculate/);
  review.version = 'release:old';
  assert.notEqual(review.actionPresentation(review.view(), true).labelKey, 'review.implementation.accept');
});

test('mr41 s3c completed initial implementation shows unchanged with generated L2', async () => {
  const f = setup();
  const record = await applyInitialReview(f.input, f.dependencies);
  record.phases = implementationCommands(record, 102035, 'fixture').map((ref, index) => ({ ...ref, name: `runAgents:${index}`, attempt: 1, taskId: String(index), threadId: 'thread', messageId: 'message', status: 'done', startedAt: '' }));
  const review = widget();
  review.version = 'tobe'; review.hasRelease = true; review.implementation = record;
  review.data = { ...review.data, changeId: record.changeId, revisionId: record.revisionId };
  review.loadedFor = { project: review.project, moduleName: review.moduleName, version: review.version, data: review.data };
  assert.equal(review.implementationComplete(), true);
  assert.match(templateText(review.render()), /review\.release\.unchanged/);
});


test('mr41 s3c exact Apply click emits tobe only after persisting initial acceptance', async () => {
  const f = setup();
  const record = await applyInitialReview(f.input, f.dependencies);
  const review = widget();
  Object.defineProperty(review, 'isConnected', { value: true });
  let accepts = 0;
  review.initialApply = async (input: unknown) => { accepts++; assert.deepEqual(input, f.input); return record; };
  const previousDispatch = window.dispatchEvent;
  const events: CustomEvent[] = [];
  window.dispatchEvent = ((event: CustomEvent) => {
    assert.equal(review.implementation, record);
    events.push(event); return true;
  }) as typeof window.dispatchEvent;
  try {
    await review.runReviewPrimaryAction();
    assert.equal(accepts, 1);
    assert.deepEqual(events[0].detail, { project: 102035, moduleName: 'fixture', version: 'tobe' });
    assert.equal(events[0].type, 'nr-tobe-updated');
    assert.equal(review.initialPlan, null);
    await review.runReviewPrimaryAction();
    assert.equal(accepts, 1);
    // The context owner now supplies tobe data. The persisted record is pending for load() to resume.
    review.version = 'tobe'; review.data = { ...review.data, changeId: record.changeId, revisionId: record.revisionId };
    assert.equal(review.implementationPending(), true);
  } finally { window.dispatchEvent = previousDispatch; }
});

for (const reason of ['refused: invalid revision', 'failed: invalid revision']) {
  test(`mr41 s3c reviewer terminal done with ${reason.split(':')[0]} is rejected before reading output`, async () => {
    const f = setup(true);
    const commands: string[] = [];
    await assert.rejects(reviewInitialCandidate(f.sealed, 'reviewer', {
      prepare: async () => ({ input: {} as never, userId: 'reviewer' }),
      thread: async () => ({ threadId: 'thread' }),
      context: (threadId, senderId, content) => ({ message: { threadId, senderId, content } } as never),
      execute: async (agent, context) => {
        assert.equal(agent, 'agentReviewSolution');
        commands.push(context.message.content);
        context.task = { PK: 'task/reviewer', status: 'in progress' } as never;
      },
      wait: async () => undefined,
      task: async () => ({ PK: 'task/reviewer', status: 'done' }) as never,
      message: async () => ({ taskResults: [reason] }) as never,
    }), { message: reason });
    assert.equal(commands.length, 1);
    assert.ok(!commands[0].includes('/candidate'));
    assert.match(commands[0], /expectedRevisionId/);
  });
}


test('mr41 s3c initial reviewer uses authoritative result with input pointer and real sealed pipeline gate', async () => {
  const { buildCandidateSnapshot } = require('../../solution/candidate/candidateGateway.ts') as typeof import('../../solution/candidate/candidateGateway.ts');
  const { readCandidateWorkerGate } = require('../helpers/candidateWorkerGate.ts') as typeof import('../helpers/candidateWorkerGate.ts');
  const f = setup(true);
  const suffix = '2b9774db38c20e91680bb38a671c1588';
  const outputId = `review-${suffix}`;
  const sources = (['module.defs.ts', 'journeys/index.defs.ts', 'ontology/index.defs.ts', 'rules.defs.ts', 'workflows.defs.ts', 'access.defs.ts', 'integration.defs.ts'] as const).map(path => ({ path, source: `export const fixture = '${path}';` }));
  const outputSnapshot = await buildCandidateSnapshot({ baseId: 'base1', requestRevision: 1, request: f.sealed.request, sources });
  const output = { ...f.sealed, sources, manifest: { ...f.sealed.manifest, revisionId: outputId,
    files: Object.fromEntries(outputSnapshot.files.map(file => [file.path, `sha256:${file.sha256}`])) } };
  const revision = { changeId: 'change1', revisionId: outputId, baseId: 'base1', manifestHash: outputSnapshot.hash };
  const seal = { schemaVersion: '2026-09-22-agent-review-planner-seal-v1', flowId: 'agentReviewSolution', moduleName: 'fixture', revision };
  const traceHash = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(seal)))).toString('hex');
  const pipeline = { schemaVersion: '2026-09-22-agent-review-planner-pipeline-v1', flowId: 'agentReviewSolution', moduleName: 'fixture', status: 'complete', revision, reviewSeal: seal, reviewSealHash: traceHash };
  let adopted = 0;
  let resultStatus: 'completed' | 'failed' = 'completed';
  let published = false;
  const dependencies: import('./review.js').InitialSealDependencies = {
    prepare: async () => ({ input: { userId: 'reviewer', project: 102035, moduleName: 'fixture', changeId: 'change1', inputRevisionId: 'rev1', inputSnapshotHash: 'sha256:input', baseId: 'base1', requestRevision: 1, requestHash: 'sha256:request' }, userId: 'reviewer' }),
    thread: async () => ({ threadId: 'thread' }),
    context: (threadId, senderId, content) => ({ message: { threadId, senderId, content } } as never),
    execute: async (_agent, context) => { context.task = { PK: 'task/reviewer', status: 'done' } as never; },
    message: async () => ({ taskResults: ['review complete'] }) as never,
    candidate: async () => ({ status: 'read', pointer: published ? { changeId: 'change1', revisionId: outputId, snapshotHash: outputSnapshot.hash, revisionNumber: 2, source: { resultId: 'result1', resultHash: 'result-hash', revisionId: 'rev1', snapshotHash: 'input', revisionNumber: 1 } } : { changeId: 'change1', revisionId: 'rev1', snapshotHash: 'input', revisionNumber: 1 }, snapshot: outputSnapshot,
      result: { resultRevisionId: 'rev1', resultSnapshotHash: 'input', resultRevisionNumber: 1, resultId: 'result1', resultHash: 'result-hash', manifest: { runId: `result-${suffix}`, taskId: `task-${suffix}`, status: resultStatus, outputSnapshotHash: outputSnapshot.hash, artifacts: [], traceHash } } }),
    gate: async run => readCandidateWorkerGate(run, { readSourceText: async () => JSON.stringify(pipeline), readSealedL4Candidate: async () => output }),
    readSealed: async (_project, _module, _change, revisionId) => { assert.equal(revisionId, outputId); return output; },
    adopt: async (_project, _module, input) => { assert.deepEqual(input, { inputRevisionId: 'rev1', outputRevisionId: outputId }); adopted++; return { ...f.change, activeRevisionId: outputId, resultRevisionId: outputId }; },
    active: async () => ({ ...f.change, activeRevisionId: outputId, resultRevisionId: outputId }),
  };
  assert.equal((await reviewInitialCandidate(f.sealed, 'reviewer', dependencies)).manifest.revisionId, outputId);
  assert.equal(adopted, 1);
  published = true;
  assert.equal((await reviewInitialCandidate(f.sealed, 'reviewer', dependencies)).manifest.revisionId, outputId);
  assert.equal(adopted, 2);
  resultStatus = 'failed';
  await assert.rejects(reviewInitialCandidate(f.sealed, 'reviewer', dependencies), /implementation_conflict/);
  assert.equal(adopted, 2);
  resultStatus = 'completed';
  pipeline.status = 'failed';
  await assert.rejects(reviewInitialCandidate(f.sealed, 'reviewer', dependencies), /implementation_not_ready/);
  assert.equal(adopted, 2);
  pipeline.status = 'complete'; pipeline.reviewSealHash = 'foreign';
  await assert.rejects(reviewInitialCandidate(f.sealed, 'reviewer', dependencies), /implementation_not_ready/);
  assert.equal(adopted, 2);
});


test('mr41 s3c reloading after L2 generation keeps initial lifecycle until L1 materialization finishes', async () => {
  const f = setup();
  const record = await applyInitialReview(f.input, f.dependencies);
  record.phases = implementationCommands(record, 102035, 'fixture').slice(0, -1).map((ref, index) => ({ ...ref, name: `runAgents:${index}`, attempt: 1, taskId: String(index), threadId: 'thread', messageId: 'message', status: 'done', startedAt: '' }));
  const review = widget();
  review.version = 'tobe'; review.hasRelease = true; review.implementation = record;
  review.data = { ...review.data, changeId: record.changeId, revisionId: record.revisionId };
  review.loadedFor = { project: review.project, moduleName: review.moduleName, version: review.version, data: review.data };
  assert.equal(review.implementationComplete(), false);
  assert.equal(review.implementationPending(), true);
  assert.match(templateText(review.render()), /review\.release\.new/);
  assert.doesNotMatch(templateText(review.render()), /review\.release\.unchanged/);
});


test('mr41 s3c maintenance result retains blocked reason and maintenance handler without generated source fixture', async () => {
  const { mergeChangeEffort } = require('../../solution/gates/changeEffort/gate.ts') as typeof import('../../solution/gates/changeEffort/gate.ts');
  const golden = structuredClone(require('./fixtures/changeEffort-agendaClinica-regra-anotacao.json'));
  const blocked = structuredClone(golden);
  blocked.status = 'blocked';
  blocked.perItem[0].answers[0].status = 'abend';
  blocked.perItem[0].answers[0].abend = { reason: 'master unavailable' };
  blocked.merged = mergeChangeEffort(blocked.perItem);
  const review = widget();
  review.version = 'tobe'; review.data.resultCurrent = true; review.effortCurrent = true;
  review.changeEffortRead = { status: 'ok', path: 'effort', value: blocked };
  review.canImplement = () => false;
  assert.equal(review.actionPresentation(review.view(), true).descriptionKey, 'review.effort.status.blocked');
  let maintenance = 0;
  review.changeEffortRead = { status: 'ok', path: 'effort', value: golden };
  review.canImplement = () => true;
  review.acceptImplementation = async () => { maintenance++; };
  review.acceptInitialImplementation = async () => { assert.fail('Maintenance must retain its own handler'); };
  review.loadedFor = { project: review.project, moduleName: review.moduleName, version: review.version, data: review.data };
  await review.runReviewPrimaryAction();
  assert.equal(maintenance, 1);
});

test('mr41 s3c reviewer seal alone remains initial without maintenance effort', () => {
  const review = widget();
  review.version = 'tobe'; review.data.resultCurrent = true;
  review.changeEffortRead = { status: 'missing', path: 'effort' };
  assert.equal(review.actionPresentation(review.view(), true).descriptionKey, 'review.panels.fullGenerationBody');
});

test('review effort hides missing pool coverage but keeps invalid pool warning', () => {
  const review = widget();
  review.hasRelease = true;
  review.renderChangeEffort = () => '';
  review.renderMenu = () => '';
  review.renderBackend = () => '';
  const ready = { kind: 'ready', status: 'simple', items: [], merged: null, untouched: null, errorCode: '' };
  review.effortRead = { status: 'missing', path: 'pool' };
  assert.equal(templateText(review.renderEffort(ready)), '');
  assert.match(templateText(review.renderEffortPanel({}, ready, true, [])), /review\.effort\.status\.simple/);
  review.effortRead = { status: 'invalid', path: 'pool' };
  assert.match(templateText(review.renderEffort(ready)), /review\.backend\.effortInvalid/);
  assert.match(templateText(review.renderEffortPanel({}, ready, true, [])), /review\.backend\.effortInvalid/);
});
