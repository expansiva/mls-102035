/// <mls fileReference="_102035_/l2/newRelease/helpers/studioCandidateAdapter.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCandidateSnapshot,
  CandidateGatewayError,
  type CandidatePublishInput,
  type CandidateReadResult,
} from './candidateGateway.js';
import {
  CandidateRepositoryError,
  type CandidateDraftStore,
  type CandidateRepositoryTransport,
  type StoredCandidateDraft,
} from './candidateRepository.js';
import {
  createStudioCandidateAdapter,
  type StudioLegacyCandidateReader,
} from './studioCandidateAdapter.js';
import { L4SealedCandidateError, type L4SealedCandidateSnapshot } from './moduleRevision.js';

const scope = { project: 102047, moduleName: 'agendaClinica' };
const paths = [
  'module.defs.ts', 'journeys/index.defs.ts', 'ontology/index.defs.ts',
  'rules.defs.ts', 'workflows.defs.ts', 'access.defs.ts', 'integration.defs.ts',
] as const;

function sealed(title = 'legacy'): L4SealedCandidateSnapshot {
  const sources = paths.map(path => ({
    path,
    source: `export const value = ${JSON.stringify({ path, title })};\n`,
  }));
  return {
    manifest: {
      schemaVersion: '2026-09-20-nr-module-revision-v1',
      project: scope.project,
      moduleName: scope.moduleName,
      changeId: 'change-legacy',
      revisionId: 'rev-legacy',
      baseId: 'base-legacy',
      createdAt: '2026-09-21T00:00:00.000Z',
      files: Object.fromEntries(paths.map(path => [path, 'sha256:legacy'])),
      changedPaths: ['module.defs.ts'],
      requestRevision: 1,
    },
    request: 'Preserve this request',
    sources,
  };
}

class MemoryStore implements CandidateDraftStore {
  readonly rows = new Map<string, StoredCandidateDraft>();

  read(key: string): Promise<StoredCandidateDraft | null> {
    return Promise.resolve(this.rows.has(key) ? structuredClone(this.rows.get(key)!) : null);
  }

  list(prefix: string): Promise<Array<{ key: string; draft: StoredCandidateDraft }>> {
    return Promise.resolve([...this.rows.entries()]
      .filter(([key]) => key.startsWith(`${prefix}/`))
      .map(([key, draft]) => ({ key, draft: structuredClone(draft) })));
  }

  create(key: string, draft: StoredCandidateDraft): Promise<StoredCandidateDraft> {
    if (!this.rows.has(key)) this.rows.set(key, structuredClone(draft));
    return Promise.resolve(structuredClone(this.rows.get(key)!));
  }

  write(key: string, draft: StoredCandidateDraft): Promise<void> {
    this.rows.set(key, structuredClone(draft));
    return Promise.resolve();
  }

  remove(key: string): Promise<void> {
    this.rows.delete(key);
    return Promise.resolve();
  }
}

function legacyReader(read: () => L4SealedCandidateSnapshot | null): StudioLegacyCandidateReader & { locks: number } {
  return {
    locks: 0,
    read: async () => structuredClone(read()),
    async withStableCandidate<T>(_scope: typeof scope, work: () => Promise<T>): Promise<T> {
      this.locks += 1;
      return work();
    },
  };
}

function emptyRead(): CandidateReadResult {
  return { status: 'read', pointer: null, snapshot: null };
}

async function rejectsRepository(
  work: () => Promise<unknown>, statusCode: number, code: string,
): Promise<void> {
  await assert.rejects(work, (error: unknown) => {
    assert.ok(error instanceof CandidateRepositoryError);
    assert.equal(error.statusCode, statusCode);
    assert.equal(error.code, code);
    return true;
  });
}

test('explicit migration without injected checks preserves a private draft and never posts', async () => {
  const store = new MemoryStore();
  const legacy = legacyReader(() => sealed());
  let posts = 0;
  const adapter = createStudioCandidateAdapter(scope, {
    store,
    legacy,
    createRequestId: () => 'request-migration',
    transport: {
      read: async () => emptyRead(),
      publish: async () => { posts += 1; throw new Error('must not post'); },
    },
  });

  await assert.rejects(() => adapter.migrateLegacy(), (error: unknown) => {
    assert.ok(error instanceof CandidateRepositoryError);
    assert.equal(error.code, 'candidate.invalid_inventory');
    assert.deepEqual(error.reasons, ['candidate.finalize50_check_required']);
    return true;
  });
  assert.equal(posts, 0);
  assert.equal(legacy.locks, 1);
  assert.equal(store.rows.size, 1);
  assert.equal(adapter.state.phase, 'blocked');
  assert.equal(adapter.state.migrationRequired, true);
});

test('checked migration publishes exact sealed bytes and leaves the legacy reader untouched', async () => {
  const store = new MemoryStore();
  const original = sealed();
  const legacy = legacyReader(() => original);
  const published: CandidatePublishInput[] = [];
  let remote = emptyRead();
  const transport: CandidateRepositoryTransport = {
    read: async () => structuredClone(remote),
    publish: async input => {
      published.push(structuredClone(input));
      const committed = {
        status: 'committed',
        pointer: {
          changeId: input.changeId,
          revisionId: input.revisionId,
          snapshotHash: input.snapshot.hash,
          revisionNumber: 1,
        },
      } as const;
      remote = { status: 'read', pointer: committed.pointer, snapshot: input.snapshot };
      return committed;
    },
  };
  const adapter = createStudioCandidateAdapter(scope, {
    store,
    legacy,
    transport,
    createRequestId: () => 'request-migration',
    checks: {
      inventory: async () => ({ ok: true }),
      validate: async () => ({ ok: true }),
    },
  });

  const result = await adapter.migrateLegacy();
  assert.equal(result.status, 'committed');
  assert.equal(published.length, 1);
  assert.equal(published[0]?.snapshot.request, original.request);
  assert.equal(published[0]?.snapshot.files.length, paths.length);
  assert.equal(published[0]?.changeId, original.manifest.changeId);
  assert.equal(published[0]?.revisionId, original.manifest.revisionId);
  assert.deepEqual(original, sealed());
  assert.equal(store.rows.size, 0);
});

test('migration fails closed if the sealed legacy snapshot changes before checks', async () => {
  const store = new MemoryStore();
  let reads = 0;
  const legacy = legacyReader(() => {
    reads += 1;
    return reads < 3 ? sealed('first') : sealed('changed');
  });
  let posts = 0;
  const adapter = createStudioCandidateAdapter(scope, {
    store,
    legacy,
    transport: {
      read: async () => emptyRead(),
      publish: async () => { posts += 1; throw new Error('must not post'); },
    },
    checks: {
      inventory: async () => ({ ok: true }),
      validate: async () => ({ ok: true }),
    },
  });

  await assert.rejects(() => adapter.migrateLegacy(), (error: unknown) => {
    assert.ok(error instanceof CandidateRepositoryError);
    assert.deepEqual(error.reasons, ['candidate.legacy_snapshot_changed']);
    return true;
  });
  assert.equal(posts, 0);
  assert.equal(adapter.state.phase, 'blocked');
});

test('authoritative read failure never falls back to sealed legacy state', async () => {
  const adapter = createStudioCandidateAdapter(scope, {
    store: new MemoryStore(),
    legacy: legacyReader(() => sealed()),
    transport: {
      read: async () => { throw new Error('offline'); },
      publish: async () => { throw new Error('must not post'); },
    },
  });
  await assert.rejects(() => adapter.read(), /offline/u);
  assert.equal(adapter.state.phase, 'unavailable');
  assert.equal(adapter.state.authoritative, null);
});

test('legacy manifests without request hash are refused with an explicit migration code', async () => {
  let posts = 0;
  const legacy: StudioLegacyCandidateReader = {
    read: async () => { throw new L4SealedCandidateError('candidate.legacy_request_hash_missing'); },
    withStableCandidate: async (_scope, work) => work(),
  };
  const adapter = createStudioCandidateAdapter(scope, {
    store: new MemoryStore(),
    legacy,
    transport: {
      read: async () => emptyRead(),
      publish: async () => { posts += 1; throw new Error('must not post'); },
    },
  });

  await assert.rejects(() => adapter.migrateLegacy(), (error: unknown) => {
    assert.ok(error instanceof CandidateRepositoryError);
    assert.equal(error.statusCode, 409);
    assert.equal(error.code, 'candidate.legacy_request_hash_missing');
    return true;
  });
  assert.equal(posts, 0);
  assert.equal(adapter.state.phase, 'unavailable');
  assert.equal(adapter.state.errorCode, 'candidate.legacy_request_hash_missing');
});

test('publishWithPermit rechecks the complete authoritative mark and never exposes ordinary publish', async () => {
  const inputSnapshot = await buildCandidateSnapshot({
    baseId: 'base-one', requestRevision: 1, request: 'input',
    sources: paths.map(path => ({ path, source: `export const input = ${JSON.stringify(path)};\n` })),
  });
  const outputSnapshot = await buildCandidateSnapshot({
    baseId: 'base-one', requestRevision: 2, request: 'output',
    sources: paths.map(path => ({ path, source: `export const output = ${JSON.stringify(path)};\n` })),
  });
  const permit = {
    resultId: 'result-one', resultHash: 'a'.repeat(64), inputRevisionId: 'rev-input',
    inputSnapshotHash: inputSnapshot.hash, inputRevisionNumber: 1,
    outputSnapshotHash: outputSnapshot.hash,
  };
  const markedPointer = {
    changeId: 'change-input', revisionId: 'rev-input', snapshotHash: inputSnapshot.hash, revisionNumber: 1,
    resultRevisionId: 'rev-input', resultSnapshotHash: inputSnapshot.hash, resultRevisionNumber: 1,
    resultId: permit.resultId, resultHash: permit.resultHash,
  };
  let remote: CandidateReadResult = {
    status: 'read', pointer: markedPointer, snapshot: inputSnapshot,
    result: {
      resultRevisionId: 'rev-input', resultSnapshotHash: inputSnapshot.hash, resultRevisionNumber: 1,
      resultId: permit.resultId, resultHash: permit.resultHash,
      manifest: {
        runId: 'run-one', taskId: 'task-one', status: 'completed', traceHash: 'b'.repeat(64),
        outputSnapshotHash: outputSnapshot.hash,
        artifacts: outputSnapshot.files.map(({ path, sha256 }) => ({ path, sha256 })),
      },
    },
  };
  const published: CandidatePublishInput[] = [];
  const adapter = createStudioCandidateAdapter(scope, {
    store: new MemoryStore(), legacy: legacyReader(() => null), createRequestId: () => 'request-output',
    transport: {
      read: async () => structuredClone(remote),
      publish: async input => {
        published.push(structuredClone(input));
        const committed = {
          changeId: input.changeId, revisionId: input.revisionId,
          snapshotHash: input.snapshot.hash, revisionNumber: 2,
        };
        remote = { status: 'read', pointer: committed, snapshot: input.snapshot };
        return { status: 'committed', pointer: committed };
      },
    },
  });

  assert.equal('publish' in adapter, false);
  const publishInput = {
    changeId: 'change-output', revisionId: 'rev-output', snapshot: outputSnapshot, permit,
  };
  const expected = structuredClone(publishInput);
  const pending = adapter.publishWithPermit(publishInput);
  publishInput.changeId = 'mutated-change';
  publishInput.revisionId = 'mutated-revision';
  publishInput.permit.resultId = 'mutated-result';
  publishInput.snapshot.baseId = 'mutated-base';
  publishInput.snapshot.files[0].path = 'other/Illegal.defs.ts';
  const result = await pending;
  assert.equal(result.status, 'committed');
  assert.equal(published[0]?.changeId, expected.changeId);
  assert.equal(published[0]?.revisionId, expected.revisionId);
  assert.deepEqual(published[0]?.snapshot, expected.snapshot);
  assert.deepEqual(published[0]?.permit, expected.permit);
  assert.equal(adapter.state.authoritative?.pointer?.revisionId, 'rev-output');
});

test('publishWithPermit rejects partial artifacts and stale result identity before POST', async () => {
  const inputSnapshot = await buildCandidateSnapshot({
    baseId: 'base-one', requestRevision: 1, request: 'input',
    sources: [...paths, 'ontology/Patient.defs.ts'].map(path => ({
      path, source: `export const input = ${JSON.stringify(path)};\n`,
    })),
  });
  const outputSnapshot = await buildCandidateSnapshot({
    baseId: 'base-one', requestRevision: 2, request: 'output',
    sources: paths.map(path => ({ path, source: `export const output = ${JSON.stringify(path)};\n` })),
  });
  const permit = {
    resultId: 'result-one', resultHash: 'a'.repeat(64), inputRevisionId: 'rev-input',
    inputSnapshotHash: inputSnapshot.hash, inputRevisionNumber: 1,
    outputSnapshotHash: outputSnapshot.hash,
  };
  let posts = 0;
  const readFor = (resultId: string, artifacts = outputSnapshot.files.slice(1)) => ({
    status: 'read' as const,
    pointer: {
      changeId: 'change-input', revisionId: 'rev-input', snapshotHash: inputSnapshot.hash, revisionNumber: 1,
      resultRevisionId: 'rev-input', resultSnapshotHash: inputSnapshot.hash, resultRevisionNumber: 1,
      resultId, resultHash: permit.resultHash,
    },
    snapshot: inputSnapshot,
    result: {
      resultRevisionId: 'rev-input', resultSnapshotHash: inputSnapshot.hash, resultRevisionNumber: 1,
      resultId, resultHash: permit.resultHash,
      manifest: {
        runId: 'run-one', taskId: 'task-one', status: 'completed' as const, traceHash: 'b'.repeat(64),
        outputSnapshotHash: outputSnapshot.hash,
        artifacts: artifacts.map(({ path, sha256 }) => ({ path, sha256 })),
      },
    },
  });
  let remote: CandidateReadResult = readFor('result-one');
  const adapter = createStudioCandidateAdapter(scope, {
    store: new MemoryStore(), legacy: legacyReader(() => null),
    transport: {
      read: async () => structuredClone(remote),
      publish: async () => { posts += 1; throw new Error('must not publish'); },
    },
  });
  await rejectsRepository(() => adapter.publishWithPermit({
    changeId: 'change-output', revisionId: 'rev-output', snapshot: outputSnapshot, permit,
  }), 409, 'candidate.result_permit_artifacts_mismatch');
  remote = readFor('another-result', outputSnapshot.files);
  await rejectsRepository(() => adapter.publishWithPermit({
    changeId: 'change-output', revisionId: 'rev-output', snapshot: outputSnapshot, permit,
  }), 409, 'candidate.result_permit_mismatch');
  remote = readFor('result-one', outputSnapshot.files);
  await rejectsRepository(() => adapter.publishWithPermit({
    changeId: 'change-output', revisionId: 'rev-output', snapshot: outputSnapshot, permit,
  }), 409, 'candidate.result_permit_artifacts_mismatch');
  assert.equal(posts, 0);
});

test('restart replays a durable submitted permit before read, then refreshes authority with ordinal paths', async () => {
  const allPaths = [...paths, 'ontology/AA.defs.ts', 'ontology/Aa.defs.ts'] as const;
  const inputSnapshot = await buildCandidateSnapshot({
    baseId: 'base-one', requestRevision: 1, request: 'input',
    sources: allPaths.map(path => ({ path, source: `export const input = ${JSON.stringify(path)};\n` })),
  });
  const outputSnapshot = await buildCandidateSnapshot({
    baseId: 'base-one', requestRevision: 2, request: 'output',
    sources: allPaths.map(path => ({ path, source: `export const output = ${JSON.stringify(path)};\n` })),
  });
  const permit = {
    resultId: 'result-retry', resultHash: 'a'.repeat(64), inputRevisionId: 'rev-input',
    inputSnapshotHash: inputSnapshot.hash, inputRevisionNumber: 1,
    outputSnapshotHash: outputSnapshot.hash,
  };
  const markedPointer = {
    changeId: 'change-input', revisionId: 'rev-input', snapshotHash: inputSnapshot.hash, revisionNumber: 1,
    resultRevisionId: 'rev-input', resultSnapshotHash: inputSnapshot.hash, resultRevisionNumber: 1,
    resultId: permit.resultId, resultHash: permit.resultHash,
  };
  let remote: CandidateReadResult = {
    status: 'read', pointer: markedPointer, snapshot: inputSnapshot,
    result: {
      resultRevisionId: 'rev-input', resultSnapshotHash: inputSnapshot.hash, resultRevisionNumber: 1,
      resultId: permit.resultId, resultHash: permit.resultHash,
      manifest: {
        runId: 'run-retry', taskId: 'task-retry', status: 'completed', traceHash: 'b'.repeat(64),
        outputSnapshotHash: outputSnapshot.hash,
        artifacts: outputSnapshot.files.map(({ path, sha256 }) => ({ path, sha256 })).reverse(),
      },
    },
  };
  const committedPointer = {
    changeId: 'change-output', revisionId: 'rev-output', snapshotHash: outputSnapshot.hash, revisionNumber: 2,
  };
  const events: string[] = [];
  const posted: CandidatePublishInput[] = [];
  let loseAck = true;
  const transport: CandidateRepositoryTransport = {
    read: async () => { events.push('read'); return structuredClone(remote); },
    publish: async input => {
      events.push('publish');
      posted.push(structuredClone(input));
      remote = { status: 'read', pointer: committedPointer, snapshot: outputSnapshot };
      if (loseAck) {
        loseAck = false;
        throw new CandidateGatewayError(503, 'candidate.transport_unavailable');
      }
      return { status: 'committed', pointer: committedPointer };
    },
  };
  const store = new MemoryStore();
  const create = () => createStudioCandidateAdapter(scope, {
    store, legacy: legacyReader(() => null), transport, createRequestId: () => 'request-retry',
  });
  const input = { changeId: 'change-output', revisionId: 'rev-output', snapshot: outputSnapshot, permit };
  await assert.rejects(() => create().publishWithPermit(input), CandidateGatewayError);
  assert.equal([...store.rows.values()][0]?.status, 'submitted');

  events.length = 0;
  const restarted = create();
  assert.equal(await restarted.replaySubmitted({
    changeId: input.changeId, revisionId: input.revisionId, snapshot: inputSnapshot,
  }), null);
  assert.equal((await restarted.replaySubmitted({
    changeId: input.changeId, revisionId: input.revisionId, snapshot: outputSnapshot,
  }))?.status, 'committed');
  assert.deepEqual(events, ['publish', 'read']);
  assert.deepEqual(posted.map(item => item.requestId), ['request-retry', 'request-retry']);
  assert.deepEqual(posted.map(item => item.permit), [permit, permit]);
  assert.equal(restarted.state.authoritative?.pointer?.revisionId, 'rev-output');
  assert.equal(store.rows.size, 0);
});
