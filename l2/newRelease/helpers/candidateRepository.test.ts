/// <mls fileReference="_102035_/l2/newRelease/helpers/candidateRepository.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCandidateSnapshot, CandidateGatewayError,
  type CandidatePointer, type CandidatePublishInput, type CandidateReadResult,
} from './candidateGateway.js';
import {
  CandidateRepository, CandidateRepositoryError, candidateDraftKey, candidateDraftPrefix,
  type CandidateDraftIdentity, type CandidateDraftStore, type CandidateRepositoryOptions,
  type CandidateRepositoryPermittedPublishInput, type CandidateRepositoryPublishInput,
  type CandidateRepositoryTransport, type StoredCandidateDraft,
} from './candidateRepository.js';

const scope = { project: 102047, moduleName: 'agendaClinica' };
const sourcePaths = [
  'module.defs.ts', 'journeys/index.defs.ts', 'ontology/index.defs.ts',
  'rules.defs.ts', 'workflows.defs.ts', 'access.defs.ts', 'integration.defs.ts',
] as const;

async function snapshot(title: string) {
  return buildCandidateSnapshot({
    baseId: 'base-one', requestRevision: 1, request: 'Review it',
    sources: sourcePaths.map(path => ({ path, source: `export const value = ${JSON.stringify({ path, title })};\n` })),
  });
}

function pointer(hash: string, revisionId: string, changeId = 'change-one', revisionNumber = 1): CandidatePointer {
  return { changeId, revisionId, snapshotHash: hash, revisionNumber };
}

function emptyRead(): CandidateReadResult {
  return { status: 'read', pointer: null, snapshot: null };
}

function identity(input: CandidateRepositoryPublishInput): CandidateDraftIdentity {
  return { changeId: input.changeId, revisionId: input.revisionId, snapshotHash: input.snapshot.hash };
}

function withPermit(
  input: CandidateRepositoryPublishInput & { expectedRevisionId: string },
  current: CandidatePointer,
): CandidateRepositoryPermittedPublishInput {
  return {
    ...input,
    permit: {
      resultId: 'result-one', resultHash: 'a'.repeat(64),
      inputRevisionId: input.expectedRevisionId, inputSnapshotHash: current.snapshotHash,
      inputRevisionNumber: current.revisionNumber, outputSnapshotHash: input.snapshot.hash,
    },
  };
}

class MemoryStore implements CandidateDraftStore {
  rows = new Map<string, StoredCandidateDraft>();
  writes: StoredCandidateDraft[] = [];
  removedKeys: string[] = [];
  failRemoveKeys = new Set<string>();

  read(key: string): Promise<StoredCandidateDraft | null> {
    return Promise.resolve(this.rows.has(key) ? structuredClone(this.rows.get(key)!) : null);
  }

  list(prefix: string): Promise<Array<{ key: string; draft: StoredCandidateDraft }>> {
    return Promise.resolve([...this.rows.entries()]
      .filter(([key]) => key.startsWith(`${prefix}/`))
      .map(([key, draft]) => ({ key, draft: structuredClone(draft) })));
  }

  create(key: string, draft: StoredCandidateDraft): Promise<StoredCandidateDraft> {
    const existing = this.rows.get(key);
    if (existing) return Promise.resolve(structuredClone(existing));
    this.rows.set(key, structuredClone(draft));
    return Promise.resolve(structuredClone(draft));
  }

  write(key: string, draft: StoredCandidateDraft): Promise<void> {
    this.rows.set(key, structuredClone(draft));
    this.writes.push(structuredClone(draft));
    return Promise.resolve();
  }

  remove(key: string): Promise<void> {
    if (this.failRemoveKeys.has(key)) return Promise.reject(new Error('remove failed'));
    this.rows.delete(key);
    this.removedKeys.push(key);
    return Promise.resolve();
  }
}

function options(
  store: MemoryStore,
  transport: CandidateRepositoryTransport,
  overrides: Partial<CandidateRepositoryOptions> = {},
): CandidateRepositoryOptions {
  return {
    store, transport, inventory: async () => ({ ok: true }), validate: async () => ({ ok: true }),
    sealedLegacyExists: async () => true, createRequestId: () => 'request-one', ...overrides,
  };
}

async function rejectsRepository(
  work: () => Promise<unknown>, statusCode: number, code: string,
): Promise<CandidateRepositoryError> {
  let seen: CandidateRepositoryError | null = null;
  await assert.rejects(work, (error: unknown) => {
    assert.ok(error instanceof CandidateRepositoryError);
    assert.equal(error.statusCode, statusCode);
    assert.equal(error.code, code);
    seen = error;
    return true;
  });
  return seen!;
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

test('committed publication removes only its exact private draft and becomes authoritative', async () => {
  const store = new MemoryStore();
  const next = await snapshot('next');
  const input = { expectedRevisionId: null, changeId: 'change-one', revisionId: 'rev-next', snapshot: next };
  let remote = emptyRead();
  const transport: CandidateRepositoryTransport = {
    read: async () => structuredClone(remote),
    publish: async wire => {
      const committed = pointer(wire.snapshot.hash, wire.revisionId, wire.changeId);
      remote = { status: 'read', pointer: committed, snapshot: wire.snapshot };
      return { status: 'committed', pointer: committed };
    },
  };
  const repository = new CandidateRepository(scope, options(store, transport));
  await repository.read();
  const result = await repository.migrate(input);

  assert.equal(result.status, 'committed');
  assert.equal(repository.state.phase, 'ready');
  assert.equal(repository.state.authoritative?.pointer?.snapshotHash, next.hash);
  assert.equal(repository.state.drafts.length, 0);
  assert.deepEqual(store.removedKeys, [candidateDraftKey(scope, identity(input))]);
});

test('two instances preserve distinct drafts while one CAS wins and the other conflicts', async () => {
  const store = new MemoryStore();
  const current = await snapshot('current');
  const nextA = await snapshot('next-a');
  const nextB = await snapshot('next-b');
  let remote: CandidateReadResult = {
    status: 'read', pointer: pointer(current.hash, 'rev-current', 'change-current'), snapshot: current,
  };
  const bothEntered = deferred();
  const release = deferred();
  let entered = 0;
  const transport: CandidateRepositoryTransport = {
    read: async () => structuredClone(remote),
    publish: async wire => {
      entered += 1;
      if (entered === 2) bothEntered.resolve();
      await release.promise;
      if (wire.expectedRevisionId !== remote.pointer?.revisionId) return { status: 'conflict', pointer: remote.pointer };
      const committed = pointer(wire.snapshot.hash, wire.revisionId, wire.changeId, 2);
      remote = { status: 'read', pointer: committed, snapshot: wire.snapshot };
      return { status: 'committed', pointer: committed };
    },
  };
  const repositoryA = new CandidateRepository(scope, options(store, transport, { createRequestId: () => 'request-a' }));
  const repositoryB = new CandidateRepository(scope, options(store, transport, { createRequestId: () => 'request-b' }));
  await Promise.all([repositoryA.read(), repositoryB.read()]);
  const inputA = withPermit({ expectedRevisionId: 'rev-current', changeId: 'change-a', revisionId: 'rev-a', snapshot: nextA }, remote.pointer!);
  const inputB = withPermit({ expectedRevisionId: 'rev-current', changeId: 'change-b', revisionId: 'rev-b', snapshot: nextB }, remote.pointer!);
  const publishingA = repositoryA.publishWithPermit(inputA);
  const publishingB = repositoryB.publishWithPermit(inputB);
  await bothEntered.promise;
  assert.equal(store.rows.size, 2);
  release.resolve();
  const [resultA, resultB] = await Promise.all([publishingA, publishingB]);

  assert.deepEqual([resultA.status, resultB.status].sort(), ['committed', 'conflict']);
  const loserInput = resultA.status === 'conflict' ? inputA : inputB;
  const winnerInput = resultA.status === 'committed' ? inputA : inputB;
  const loserRepository = resultA.status === 'conflict' ? repositoryA : repositoryB;
  assert.equal(store.rows.size, 1);
  assert.ok(store.rows.has(candidateDraftKey(scope, identity(loserInput))));
  assert.ok(!store.rows.has(candidateDraftKey(scope, identity(winnerInput))));
  assert.equal(loserRepository.state.phase, 'conflict');
});

test('two instances starting the same immutable attempt share its atomic requestId', async () => {
  const store = new MemoryStore();
  const next = await snapshot('same-attempt');
  const seen: string[] = [];
  const transport: CandidateRepositoryTransport = {
    read: async () => emptyRead(),
    publish: async wire => {
      seen.push(wire.requestId);
      throw new CandidateGatewayError(503, 'candidate.transport_unavailable');
    },
  };
  const first = new CandidateRepository(scope, options(store, transport, { createRequestId: () => 'request-first' }));
  const second = new CandidateRepository(scope, options(store, transport, { createRequestId: () => 'request-second' }));
  await Promise.all([first.read(), second.read()]);
  const input = { expectedRevisionId: null, changeId: 'change-same', revisionId: 'rev-same', snapshot: next };
  await Promise.allSettled([first.migrate(input), second.migrate(input)]);

  assert.equal(seen.length, 2);
  assert.equal(seen[0], seen[1]);
  assert.ok(seen[0] === 'request-first' || seen[0] === 'request-second');
  assert.equal(store.rows.size, 1);
  assert.equal([...store.rows.values()][0]?.requestId, seen[0]);
});

test('retry after repository restart reuses the durable requestId', async () => {
  const store = new MemoryStore();
  const next = await snapshot('retry');
  const input = { expectedRevisionId: null, changeId: 'change-retry', revisionId: 'rev-retry', snapshot: next };
  const requestIds: string[] = [];
  let fail = true;
  let remote = emptyRead();
  const transport: CandidateRepositoryTransport = {
    read: async () => structuredClone(remote),
    publish: async wire => {
      requestIds.push(wire.requestId);
      if (fail) { fail = false; throw new CandidateGatewayError(503, 'candidate.transport_unavailable'); }
      const committed = pointer(wire.snapshot.hash, wire.revisionId, wire.changeId);
      remote = { status: 'read', pointer: committed, snapshot: wire.snapshot };
      return { status: 'committed', pointer: committed };
    },
  };
  const first = new CandidateRepository(scope, options(store, transport, { createRequestId: () => 'request-original' }));
  await first.read();
  await assert.rejects(() => first.migrate(input), CandidateGatewayError);
  assert.equal(store.rows.size, 1);

  const restarted = new CandidateRepository(scope, options(store, transport, { createRequestId: () => 'request-wrong' }));
  await restarted.read();
  assert.equal(restarted.state.draft?.requestId, 'request-original');
  assert.equal((await restarted.migrate(input)).status, 'committed');
  assert.deepEqual(requestIds, ['request-original', 'request-original']);
});

test('submitted retry is found by immutable output without caller permit and refreshes authority', async () => {
  const store = new MemoryStore();
  const currentSnapshot = await snapshot('current-permit');
  const next = await snapshot('next-permit');
  const current = pointer(currentSnapshot.hash, 'rev-current', 'change-current', 4);
  const input = withPermit({
    expectedRevisionId: current.revisionId, changeId: 'change-next', revisionId: 'rev-next', snapshot: next,
  }, current);
  let remote: CandidateReadResult = { status: 'read', pointer: current, snapshot: currentSnapshot };
  const seen: CandidatePublishInput[] = [];
  let fail = true;
  const transport: CandidateRepositoryTransport = {
    read: async () => structuredClone(remote),
    publish: async wire => {
      seen.push(structuredClone(wire));
      if (fail) { fail = false; throw new CandidateGatewayError(503, 'candidate.transport_unavailable'); }
      const committed = pointer(wire.snapshot.hash, wire.revisionId, wire.changeId, 5);
      remote = { status: 'read', pointer: committed, snapshot: wire.snapshot };
      return { status: 'committed', pointer: committed };
    },
  };
  const first = new CandidateRepository(scope, options(store, transport, { createRequestId: () => 'request-permit' }));
  await first.read();
  await assert.rejects(() => first.publishWithPermit(input), CandidateGatewayError);
  const restarted = new CandidateRepository(scope, options(store, transport, { createRequestId: () => 'wrong-request' }));
  assert.equal(await restarted.replaySubmitted({
    changeId: input.changeId, revisionId: input.revisionId, snapshot: currentSnapshot,
  }), null);
  assert.equal((await restarted.replaySubmitted({
    changeId: input.changeId, revisionId: input.revisionId, snapshot: input.snapshot,
  }))?.status, 'committed');
  assert.deepEqual(seen.map(item => item.requestId), ['request-permit', 'request-permit']);
  assert.deepEqual(seen.map(item => item.permit), [input.permit, input.permit]);
  assert.equal(restarted.state.authoritative?.pointer?.revisionId, input.revisionId);
  assert.equal(store.rows.size, 0);
});

test('an idempotent committed response never replaces a fresher authoritative read', async () => {
  const store = new MemoryStore();
  const currentSnapshot = await snapshot('input');
  const historicalOutput = await snapshot('historical-output');
  const latestSnapshot = await snapshot('latest-output');
  const current = pointer(currentSnapshot.hash, 'rev-input', 'change-input', 1);
  const historical = pointer(historicalOutput.hash, 'rev-output', 'change-output', 2);
  const latest = pointer(latestSnapshot.hash, 'rev-latest', 'change-latest', 3);
  let remote: CandidateReadResult = { status: 'read', pointer: current, snapshot: currentSnapshot };
  const repository = new CandidateRepository(scope, options(store, {
    read: async () => structuredClone(remote),
    publish: async () => {
      remote = { status: 'read', pointer: latest, snapshot: latestSnapshot };
      return { status: 'committed', pointer: historical };
    },
  }));
  await repository.read();
  const input = withPermit({
    expectedRevisionId: current.revisionId, changeId: historical.changeId,
    revisionId: historical.revisionId, snapshot: historicalOutput,
  }, current);
  assert.equal((await repository.publishWithPermit(input)).status, 'committed');
  assert.equal(repository.state.authoritative?.pointer?.revisionId, latest.revisionId);
  assert.equal(repository.state.authoritative?.pointer?.snapshotHash, latestSnapshot.hash);
});

test('authoritative read failure is fail-closed and retains recovered drafts', async () => {
  const store = new MemoryStore();
  const saved = await snapshot('saved');
  const input = { expectedRevisionId: null, changeId: 'change-saved', revisionId: 'rev-saved', snapshot: saved };
  const seed = new CandidateRepository(scope, options(store, {
    read: async () => emptyRead(),
    publish: async () => { throw new CandidateGatewayError(503, 'candidate.transport_unavailable'); },
  }, { createRequestId: () => 'request-saved' }));
  await seed.read();
  await assert.rejects(() => seed.migrate(input));

  const repository = new CandidateRepository(scope, options(store, {
    read: async () => { throw new CandidateGatewayError(503, 'candidate.transport_unavailable'); },
    publish: async () => { throw new Error('must not publish'); },
  }, { sealedLegacyExists: async () => true }));
  await assert.rejects(() => repository.read(), CandidateGatewayError);
  assert.equal(repository.state.phase, 'unavailable');
  assert.equal(repository.state.drafts[0]?.revisionId, 'rev-saved');
  assert.equal(repository.state.migrationRequired, false);
});

test('invalid inventory and validation block before transport and retain a durable blocked draft', async t => {
  for (const blocked of [
    { name: 'inventory', field: 'inventory' as const, code: 'candidate.invalid_inventory' },
    { name: 'validation', field: 'validate' as const, code: 'candidate.validation_failed' },
  ]) {
    await t.test(blocked.name, async () => {
      const store = new MemoryStore();
      const next = await snapshot(blocked.name);
      let publishCalls = 0;
      const repository = new CandidateRepository(scope, options(store, {
        read: async () => emptyRead(),
        publish: async () => { publishCalls += 1; throw new Error('must not publish'); },
      }, { [blocked.field]: async () => ({ ok: false, reasons: [`bad ${blocked.name}`] }) }));
      await repository.read();
      const error = await rejectsRepository(() => repository.migrate({
        expectedRevisionId: null, changeId: `change-${blocked.name}`,
        revisionId: `rev-${blocked.name}`, snapshot: next,
      }), 422, blocked.code);
      assert.deepEqual(error.reasons, [`bad ${blocked.name}`]);
      assert.equal(publishCalls, 0);
      assert.equal(repository.state.phase, 'blocked');
      assert.equal(repository.state.draft?.status, 'blocked');
      assert.equal(store.rows.size, 1);
    });
  }
});

test('a different attempt cannot overwrite blocked state without explicit reconciliation', async () => {
  const store = new MemoryStore();
  const oldSnapshot = await snapshot('blocked');
  const replacementSnapshot = await snapshot('replacement');
  let validate = false;
  let remote = emptyRead();
  const repository = new CandidateRepository(scope, options(store, {
    read: async () => structuredClone(remote),
    publish: async wire => {
      const committed = pointer(wire.snapshot.hash, wire.revisionId, wire.changeId);
      remote = { status: 'read', pointer: committed, snapshot: wire.snapshot };
      return { status: 'committed', pointer: committed };
    },
  }, { validate: async () => ({ ok: validate, reasons: validate ? [] : ['blocked'] }) }));
  await repository.read();
  const oldInput = { expectedRevisionId: null, changeId: 'change-old', revisionId: 'rev-old', snapshot: oldSnapshot };
  const replacement = { expectedRevisionId: null, changeId: 'change-new', revisionId: 'rev-new', snapshot: replacementSnapshot };
  await assert.rejects(() => repository.migrate(oldInput));
  await rejectsRepository(() => repository.migrate(replacement), 409, 'candidate.explicit_draft_resolution_required');
  assert.equal(store.rows.size, 1);

  validate = true;
  assert.equal((await repository.reconcile(identity(oldInput), replacement)).status, 'committed');
  assert.equal(store.rows.size, 0);
  assert.ok(store.removedKeys.includes(candidateDraftKey(scope, identity(oldInput))));
});

test('normal publish cannot bypass migration and explicit concurrent migration preserves the CAS loser', async () => {
  const store = new MemoryStore();
  const firstSnapshot = await snapshot('migration-a');
  const secondSnapshot = await snapshot('migration-b');
  let remote = emptyRead();
  const transport: CandidateRepositoryTransport = {
    read: async () => structuredClone(remote),
    publish: async wire => {
      if (remote.pointer !== null) return { status: 'conflict', pointer: remote.pointer };
      const committed = pointer(wire.snapshot.hash, wire.revisionId, wire.changeId);
      remote = { status: 'read', pointer: committed, snapshot: wire.snapshot };
      return { status: 'committed', pointer: committed };
    },
  };
  const migrationOptions = (requestId: string) => options(store, transport, {
    sealedLegacyExists: async () => true, createRequestId: () => requestId,
  });
  const first = new CandidateRepository(scope, migrationOptions('request-migration-a'));
  const second = new CandidateRepository(scope, migrationOptions('request-migration-b'));
  await Promise.all([first.read(), second.read()]);
  const inputA = { expectedRevisionId: null, changeId: 'change-migration-a', revisionId: 'rev-migration-a', snapshot: firstSnapshot };
  const inputB = { expectedRevisionId: null, changeId: 'change-migration-b', revisionId: 'rev-migration-b', snapshot: secondSnapshot };
  await rejectsRepository(() => first.publishWithPermit(withPermit({
    expectedRevisionId: 'rev-unavailable', changeId: inputA.changeId,
    revisionId: inputA.revisionId, snapshot: inputA.snapshot,
  }, pointer('a'.repeat(64), 'rev-unavailable'))), 409, 'candidate.migration_required');
  assert.equal(store.rows.size, 0);
  assert.equal((await first.migrate(inputA)).status, 'committed');
  assert.equal((await second.migrate(inputB)).status, 'conflict');
  assert.equal(second.state.phase, 'conflict');
  assert.ok(store.rows.has(candidateDraftKey(scope, identity(inputB))));
});

test('publish clones and freezes the complete input before any await', async () => {
  const store = new MemoryStore();
  const original = await snapshot('immutable');
  const changed = await snapshot('changed');
  const gate = deferred();
  const captured: CandidatePublishInput[] = [];
  let remote = emptyRead();
  const repository = new CandidateRepository(scope, options(store, {
    read: async () => structuredClone(remote),
    publish: async wire => {
      captured.push(structuredClone(wire));
      const committed = pointer(wire.snapshot.hash, wire.revisionId, wire.changeId);
      remote = { status: 'read', pointer: committed, snapshot: wire.snapshot };
      return { status: 'committed', pointer: committed };
    },
  }, { inventory: async () => { await gate.promise; return { ok: true }; } }));
  await repository.read();
  const mutable: CandidateRepositoryPublishInput = {
    expectedRevisionId: null, changeId: 'change-original', revisionId: 'rev-original', snapshot: original,
  };
  const publishing = repository.migrate(mutable);
  mutable.changeId = 'change-mutated';
  mutable.revisionId = 'rev-mutated';
  mutable.snapshot = changed;
  gate.resolve();
  await publishing;

  assert.equal(captured[0]?.changeId, 'change-original');
  assert.equal(captured[0]?.revisionId, 'rev-original');
  assert.equal(captured[0]?.snapshot.hash, original.hash);
  assert.equal(store.writes[0]?.changeId, 'change-original');
  assert.equal(store.writes[0]?.snapshot.hash, original.hash);
});

test('committed cleanup failure stays unavailable and restart read recovers exact commit', async () => {
  const store = new MemoryStore();
  const next = await snapshot('cleanup');
  const input = { expectedRevisionId: null, changeId: 'change-cleanup', revisionId: 'rev-cleanup', snapshot: next };
  let remote: CandidateReadResult = emptyRead();
  const transport: CandidateRepositoryTransport = {
    read: async () => structuredClone(remote),
    publish: async wire => {
      const committed = pointer(wire.snapshot.hash, wire.revisionId, wire.changeId);
      remote = { status: 'read', pointer: committed, snapshot: wire.snapshot };
      return { status: 'committed', pointer: committed };
    },
  };
  const key = candidateDraftKey(scope, identity(input));
  store.failRemoveKeys.add(key);
  const first = new CandidateRepository(scope, options(store, transport));
  await first.read();
  await assert.rejects(() => first.migrate(input), /remove failed/u);
  assert.equal(first.state.phase, 'unavailable');
  assert.ok(store.rows.has(key));

  store.failRemoveKeys.delete(key);
  const restarted = new CandidateRepository(scope, options(store, transport));
  await restarted.read();
  assert.equal(restarted.state.phase, 'ready');
  assert.equal(restarted.state.authoritative?.pointer?.revisionId, 'rev-cleanup');
  assert.equal(store.rows.size, 0);
});

test('divergent committed response fails closed and preserves the draft', async () => {
  const store = new MemoryStore();
  const next = await snapshot('divergent');
  const input = { expectedRevisionId: null, changeId: 'change-one', revisionId: 'rev-one', snapshot: next };
  const repository = new CandidateRepository(scope, options(store, {
    read: async () => emptyRead(),
    publish: async wire => ({ status: 'committed', pointer: pointer('f'.repeat(64), wire.revisionId, wire.changeId) }),
  }));
  await repository.read();
  await rejectsRepository(() => repository.migrate(input), 502, 'candidate.invalid_response');
  assert.equal(repository.state.phase, 'unavailable');
  assert.ok(store.rows.has(candidateDraftKey(scope, identity(input))));
});

test('discardDraft removes only the explicitly named private attempt', async () => {
  const store = new MemoryStore();
  const firstSnapshot = await snapshot('discard-a');
  const secondSnapshot = await snapshot('discard-b');
  let publishCount = 0;
  const transport: CandidateRepositoryTransport = {
    read: async () => emptyRead(),
    publish: async () => { publishCount += 1; throw new CandidateGatewayError(503, 'candidate.transport_unavailable'); },
  };
  const first = new CandidateRepository(scope, options(store, transport, { createRequestId: () => 'request-a' }));
  const second = new CandidateRepository(scope, options(store, transport, { createRequestId: () => 'request-b' }));
  await Promise.all([first.read(), second.read()]);
  const inputA = { expectedRevisionId: null, changeId: 'change-a', revisionId: 'rev-a', snapshot: firstSnapshot };
  const inputB = { expectedRevisionId: null, changeId: 'change-b', revisionId: 'rev-b', snapshot: secondSnapshot };
  await assert.rejects(() => first.migrate(inputA));
  await assert.rejects(() => second.migrate(inputB));
  assert.equal(store.rows.size, 2);
  await first.discardDraft(identity(inputA));
  assert.equal(store.rows.size, 1);
  assert.ok(store.rows.has(candidateDraftKey(scope, identity(inputB))));
  assert.equal(publishCount, 2);
});

test('draft keys are distinct and accept only safe path segments', async () => {
  const one = await snapshot('key-one');
  const two = await snapshot('key-two');
  const first = { changeId: 'change-one', revisionId: 'rev-one', snapshotHash: one.hash };
  const second = { changeId: 'change-two', revisionId: 'rev-two', snapshotHash: two.hash };
  assert.equal(candidateDraftPrefix(scope), 'candidate-drafts/102047/agendaClinica');
  assert.notEqual(candidateDraftKey(scope, first), candidateDraftKey(scope, second));
  assert.throws(() => candidateDraftKey({ project: 102047, moduleName: '../agendaClinica' }, first), CandidateRepositoryError);
});
