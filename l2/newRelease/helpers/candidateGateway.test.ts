/// <mls fileReference="_102035_/l2/newRelease/helpers/candidateGateway.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCandidateSnapshot,
  buildCandidateResult,
  candidateMarkResult,
  candidatePublish,
  candidateRead,
  CandidateGatewayError,
  verifyCandidateSnapshot,
  type CandidatePointer,
} from './candidateGateway.js';

const scope = { project: 102047, moduleName: 'agendaClinica' };
const sourcePaths = [
  'module.defs.ts', 'journeys/index.defs.ts', 'ontology/index.defs.ts',
  'rules.defs.ts', 'workflows.defs.ts', 'access.defs.ts', 'integration.defs.ts',
] as const;
const acceptedExtraPaths = [
  'workspace-model.defs.ts',
  'journeys/checkIn2.defs.ts',
  'ontology/Patient2.defs.ts',
  'workspaces/mainDesk2.defs.ts',
] as const;
const rejectedExtraPaths = [
  'other/Patient.defs.ts',
  'journeys/CheckIn.defs.ts',
  'ontology/patient.defs.ts',
  'workspaces/MainDesk.defs.ts',
  'ontology/nested/Patient.defs.ts',
  'ontology/Patient-2.defs.ts',
  'journeys/check_in.defs.ts',
] as const;

async function snapshot(title = 'one') {
  return buildCandidateSnapshot({
    baseId: 'base-one', requestRevision: 1, request: 'Review the title',
    sources: sourcePaths.map(path => ({ path, source: `export const value = ${JSON.stringify({ path, title })};\n` })),
  });
}

function pointer(hash: string, revisionId = 'rev-one'): CandidatePointer {
  return { changeId: 'change-one', revisionId, snapshotHash: hash, revisionNumber: 1 };
}

function artifactsOf(value: Awaited<ReturnType<typeof snapshot>>) {
  return value.files.map(({ path, sha256 }) => ({ path, sha256 }));
}

function answer(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ statusCode: status, ...body }), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}

async function rejectsCode(work: () => Promise<unknown>, statusCode: number, code: string): Promise<void> {
  await assert.rejects(work, (error: unknown) => {
    assert.ok(error instanceof CandidateGatewayError);
    assert.equal(error.statusCode, statusCode);
    assert.equal(error.code, code);
    return true;
  });
}

test('read uses the dedicated same-origin route and verifies every returned byte', async () => {
  const snap = await snapshot();
  let seenUrl = '';
  let seenInit: RequestInit | undefined;
  const result = await candidateRead(scope, { fetchImpl: async (url, init) => {
    seenUrl = String(url); seenInit = init;
    return answer(200, { status: 'read', pointer: pointer(snap.hash), snapshot: snap });
  } });
  assert.equal(seenUrl, '/exec/candidate');
  assert.equal(seenInit?.credentials, 'include');
  assert.equal(seenInit?.redirect, 'error');
  assert.equal(result.pointer?.snapshotHash, snap.hash);
  assert.equal(result.snapshot?.files.length, sourcePaths.length);
});

test('default production read consumes the restricted host candidateIO when injected', async () => {
  const snap = await snapshot();
  const host = globalThis as typeof globalThis & { mls?: unknown };
  const previous = host.mls;
  let received: unknown;
  let fetched = false;
  host.mls = {
    candidateIO: {
      read: async (input: unknown) => {
        received = structuredClone(input);
        return { statusCode: 200, status: 'read', pointer: pointer(snap.hash), snapshot: snap };
      },
      publish: async () => { throw new Error('unexpected publish'); },
      markResult: async () => { throw new Error('unexpected mark'); },
    },
  };
  try {
    const result = await candidateRead(scope);
    assert.deepEqual(received, scope);
    assert.equal(result.snapshot?.hash, snap.hash);
    await candidateRead(scope, { fetchImpl: async () => {
      fetched = true;
      return answer(200, { status: 'read', pointer: null });
    } });
    assert.equal(fetched, true, 'an explicit transport must override the host capability');
  } finally {
    host.mls = previous;
  }
});

test('empty authoritative state is represented explicitly', async () => {
  const result = await candidateRead(scope, {
    endpoint: 'https://example.test/candidate',
    fetchImpl: async () => answer(200, { status: 'read', pointer: null }),
  });
  assert.deepEqual(result, { status: 'read', pointer: null, snapshot: null });
});

test('wire payload allowlists fields and cannot have its action overridden', async () => {
  let body: Record<string, unknown> | undefined;
  await candidateRead({ ...scope, action: 'candidatePublish', injected: true } as typeof scope, {
    fetchImpl: async (_url, init) => {
      body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return answer(200, { status: 'read', pointer: null });
    },
  });
  assert.deepEqual(body, { action: 'candidateRead', project: scope.project, moduleName: scope.moduleName });
});

test('publish preserves 409 and its winning pointer as data', async () => {
  const snap = await snapshot();
  const winner = { ...pointer('f'.repeat(64), 'rev-winner'), revisionNumber: 4 };
  const result = await candidatePublish({
    ...scope, expectedRevisionId: null, requestId: 'request-loser',
    changeId: 'change-one', revisionId: 'rev-loser', snapshot: snap,
  }, { fetchImpl: async () => answer(409, { status: 'conflict', pointer: winner }) });
  assert.deepEqual(result, { status: 'conflict', pointer: winner });
});

test('publish accepts only a committed pointer for the submitted immutable bytes', async () => {
  const snap = await snapshot();
  const input = {
    ...scope, expectedRevisionId: null, requestId: 'request-one',
    changeId: 'change-one', revisionId: 'rev-one', snapshot: snap,
  };
  const committed = await candidatePublish(input, {
    fetchImpl: async () => answer(200, { status: 'committed', pointer: pointer(snap.hash) }),
  });
  assert.equal(committed.status, 'committed');
  await rejectsCode(() => candidatePublish(input, {
    fetchImpl: async () => answer(200, { status: 'committed', pointer: pointer('f'.repeat(64)) }),
  }), 502, 'candidate.invalid_response');
});

test('mark-result binds a canonical manifest to the expected revision and preserves conflict', async () => {
  const output = await snapshot('output');
  const input = await buildCandidateResult({
    ...scope, expectedRevisionId: 'rev-one', expectedSnapshotHash: 'a'.repeat(64),
    expectedRevisionNumber: 1, resultId: 'result-one', outputSnapshot: output,
    result: {
      runId: 'run-one', taskId: 'task-one', status: 'completed', traceHash: 'c'.repeat(64),
      outputSnapshotHash: output.hash, artifacts: artifactsOf(output),
    },
  });
  const markedPointer = {
    ...pointer('a'.repeat(64)), resultRevisionId: 'rev-one',
    resultSnapshotHash: 'a'.repeat(64), resultRevisionNumber: 1,
    resultId: input.resultId, resultHash: input.resultHash,
  };
  const posted: Array<Record<string, unknown>> = [];
  const marked = await candidateMarkResult(input, {
    fetchImpl: async (_request, init) => {
      posted.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return answer(200, { status: 'marked', pointer: markedPointer });
    },
  });
  assert.deepEqual(marked, {
    status: 'marked', pointer: markedPointer,
    permit: {
      resultId: input.resultId, resultHash: input.resultHash,
      inputRevisionId: input.expectedRevisionId, inputSnapshotHash: input.expectedSnapshotHash,
      inputRevisionNumber: input.expectedRevisionNumber, outputSnapshotHash: output.hash,
    },
  });
  assert.deepEqual(posted[0]?.outputSnapshot, output);
  const winner = { ...pointer('f'.repeat(64), 'rev-two'), revisionNumber: 2 };
  const conflict = await candidateMarkResult(input, {
    fetchImpl: async () => answer(409, { status: 'conflict', pointer: winner }),
  });
  assert.deepEqual(conflict, { status: 'conflict', pointer: winner });
});

test('mark-result rejects arbitrary artifact hashes, output hash and divergent bytes locally', async () => {
  const output = await snapshot('output');
  const base = {
    ...scope, expectedRevisionId: 'rev-one', expectedSnapshotHash: 'a'.repeat(64),
    expectedRevisionNumber: 1, resultId: 'result-one', outputSnapshot: output,
  };
  const manifest = {
    runId: 'run-one', taskId: 'task-one', status: 'completed' as const, traceHash: 'c'.repeat(64),
    outputSnapshotHash: output.hash, artifacts: artifactsOf(output),
  };
  const arbitrary = structuredClone(manifest);
  arbitrary.artifacts[0].sha256 = 'f'.repeat(64);
  await rejectsCode(() => buildCandidateResult({ ...base, result: arbitrary }), 400, 'candidate.result_output_mismatch');
  await rejectsCode(() => buildCandidateResult({
    ...base, result: { ...manifest, outputSnapshotHash: 'e'.repeat(64) },
  }), 400, 'candidate.result_output_mismatch');
  const divergent = structuredClone(output);
  divergent.files[0].contentBase64 = btoa('different bytes');
  await rejectsCode(() => buildCandidateResult({ ...base, outputSnapshot: divergent, result: manifest }), 400, 'candidate.invalid_snapshot');
});

test('read verifies terminal result manifest against pointer hash', async () => {
  const snap = await snapshot();
  const output = await snapshot('output');
  const result = await buildCandidateResult({
    ...scope, expectedRevisionId: 'rev-one', expectedSnapshotHash: snap.hash,
    expectedRevisionNumber: 1, resultId: 'result-one', outputSnapshot: output,
    result: {
      runId: 'run-one', taskId: 'task-one', status: 'completed', traceHash: 'c'.repeat(64),
      outputSnapshotHash: output.hash, artifacts: artifactsOf(output),
    },
  });
  const current = {
    ...pointer(snap.hash), resultRevisionId: 'rev-one', resultSnapshotHash: snap.hash,
    resultRevisionNumber: 1, resultId: result.resultId, resultHash: result.resultHash,
  };
  const read = await candidateRead(scope, { fetchImpl: async () => answer(200, {
    status: 'read', pointer: current, snapshot: snap,
    result: { resultRevisionId: 'rev-one', resultSnapshotHash: snap.hash, resultRevisionNumber: 1,
      resultId: result.resultId, resultHash: result.resultHash, manifest: result.result },
  }) });
  assert.equal('result' in read ? read.result?.manifest.runId : undefined, 'run-one');
  await rejectsCode(() => candidateRead(scope, { fetchImpl: async () => answer(200, {
    status: 'read', pointer: current, snapshot: snap,
    result: { resultRevisionId: 'rev-one', resultSnapshotHash: snap.hash, resultRevisionNumber: 1,
      resultId: result.resultId, resultHash: result.resultHash, manifest: { ...result.result, taskId: 'tampered' } },
  }) }), 502, 'candidate.invalid_result_hash');
});

test('non-initial publish requires and forwards the exact result permit', async () => {
  const snap = await snapshot('output');
  const base = {
    ...scope, expectedRevisionId: 'rev-input', requestId: 'request-next',
    changeId: 'change-next', revisionId: 'rev-next', snapshot: snap,
  };
  await rejectsCode(() => candidatePublish(base), 409, 'candidate.result_permit_required');
  const permit = {
    resultId: 'result-one', resultHash: 'a'.repeat(64), inputRevisionId: 'rev-input',
    inputSnapshotHash: 'b'.repeat(64), inputRevisionNumber: 3, outputSnapshotHash: snap.hash,
  };
  let body: Record<string, unknown> | undefined;
  await candidatePublish({ ...base, permit }, { fetchImpl: async (_url, init) => {
    body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return answer(200, { status: 'committed', pointer: {
      changeId: base.changeId, revisionId: base.revisionId,
      snapshotHash: snap.hash, revisionNumber: 4,
    } });
  } });
  assert.deepEqual(body?.permit, permit);
  await rejectsCode(() => candidatePublish({ ...base, permit: { ...permit, outputSnapshotHash: 'f'.repeat(64) } }),
    409, 'candidate.result_permit_mismatch');
});

test('tampered bytes, file hash and snapshot hash are rejected', async () => {
  const snap = await snapshot();
  const tamperedBytes = structuredClone(snap);
  tamperedBytes.files[0].contentBase64 = btoa('different bytes');
  await rejectsCode(() => verifyCandidateSnapshot(tamperedBytes), 502, 'candidate.invalid_snapshot');

  const tamperedHash = structuredClone(snap);
  tamperedHash.files[0].sha256 = '0'.repeat(64);
  await rejectsCode(() => verifyCandidateSnapshot(tamperedHash), 502, 'candidate.invalid_snapshot');

  const tamperedManifest = structuredClone(snap);
  tamperedManifest.hash = '0'.repeat(64);
  await rejectsCode(() => verifyCandidateSnapshot(tamperedManifest), 502, 'candidate.invalid_snapshot_hash');

  const tamperedRequest = structuredClone(snap);
  tamperedRequest.request = 'Different request';
  await rejectsCode(() => verifyCandidateSnapshot(tamperedRequest), 502, 'candidate.invalid_snapshot_hash');
});

test('missing core source and duplicate path fail closed', async () => {
  const snap = await snapshot();
  await rejectsCode(() => verifyCandidateSnapshot({ ...snap, files: snap.files.slice(1) }), 502, 'candidate.incomplete_snapshot');
  await rejectsCode(() => verifyCandidateSnapshot({ ...snap, files: [...snap.files, snap.files[0]] }), 502, 'candidate.invalid_snapshot');
});

test('snapshot builder uses the canonical L4 path grammar shared with CBE and host', async () => {
  for (const path of acceptedExtraPaths) {
    const built = await buildCandidateSnapshot({
      baseId: 'base-one', requestRevision: 1, request: 'paths',
      sources: [...sourcePaths, path].map(item => ({ path: item, source: `// ${item}\n` })),
    });
    assert.equal(built.files.some(file => file.path === path), true);
  }
  for (const path of rejectedExtraPaths) {
    await rejectsCode(() => buildCandidateSnapshot({
      baseId: 'base-one', requestRevision: 1, request: 'paths',
      sources: [...sourcePaths, path].map(item => ({ path: item, source: `// ${item}\n` })),
    }), 400, 'candidate.invalid_file');
  }
});

test('publish captures and freezes every input field before the first await', async () => {
  const snap = await snapshot('immutable-publish');
  const input = {
    ...scope, expectedRevisionId: null, requestId: 'request-immutable',
    changeId: 'change-immutable', revisionId: 'rev-immutable', snapshot: snap,
  };
  const expected = structuredClone(input);
  let body: Record<string, unknown> | undefined;
  const pending = candidatePublish(input, {
    fetchImpl: async (_url, init) => {
      body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return answer(200, { status: 'committed', pointer: {
        changeId: expected.changeId, revisionId: expected.revisionId,
        snapshotHash: expected.snapshot.hash, revisionNumber: 1,
      } });
    },
  });
  input.project = 999999;
  input.moduleName = 'otherModule';
  input.requestId = 'mutated-request';
  input.changeId = 'mutated-change';
  input.revisionId = 'mutated-revision';
  input.snapshot.baseId = 'mutated-base';
  input.snapshot.files[0].path = 'other/Illegal.defs.ts';
  assert.equal((await pending).status, 'committed');
  assert.deepEqual(body, { action: 'candidatePublish', ...expected });
});

test('markResult captures and freezes every input field before the first await', async () => {
  const output = await snapshot('immutable-mark');
  const input = await buildCandidateResult({
    ...scope, expectedRevisionId: 'rev-one', expectedSnapshotHash: 'a'.repeat(64),
    expectedRevisionNumber: 1, resultId: 'result-one', outputSnapshot: output,
    result: {
      runId: 'run-one', taskId: 'task-one', status: 'completed', traceHash: 'c'.repeat(64),
      outputSnapshotHash: output.hash, artifacts: artifactsOf(output),
    },
  });
  const expected = structuredClone(input);
  let body: Record<string, unknown> | undefined;
  const markedPointer = {
    ...pointer(expected.expectedSnapshotHash), resultRevisionId: expected.expectedRevisionId,
    resultSnapshotHash: expected.expectedSnapshotHash, resultRevisionNumber: expected.expectedRevisionNumber,
    resultId: expected.resultId, resultHash: expected.resultHash,
  };
  const pending = candidateMarkResult(input, {
    fetchImpl: async (_url, init) => {
      body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return answer(200, { status: 'marked', pointer: markedPointer });
    },
  });
  input.project = 999999;
  input.moduleName = 'otherModule';
  input.expectedRevisionId = 'mutated-revision';
  input.expectedSnapshotHash = 'e'.repeat(64);
  input.expectedRevisionNumber = 9;
  input.resultId = 'mutated-result';
  input.resultHash = 'f'.repeat(64);
  input.result.taskId = 'mutated-task';
  input.outputSnapshot.baseId = 'mutated-base';
  input.outputSnapshot.files[0].path = 'other/Illegal.defs.ts';
  assert.equal((await pending).status, 'marked');
  assert.deepEqual(body, { action: 'candidateMarkResult', ...expected });
});

test('authentication, authorization, storage and transport failures never become local success', async () => {
  for (const [status, expected] of [[401, 'candidate.unauthorized'], [403, 'candidate.forbidden'], [503, 'candidate.storage_unavailable']] as const) {
    await rejectsCode(() => candidateRead(scope, {
      fetchImpl: async () => answer(status, { status: 'error', msg: expected }),
    }), status, expected);
  }
  await rejectsCode(() => candidateRead(scope, {
    fetchImpl: async () => { throw new Error('offline'); },
  }), 503, 'candidate.transport_unavailable');
});

test('malformed success and mismatched pointer/snapshot are rejected', async () => {
  const snap = await snapshot();
  await rejectsCode(() => candidateRead(scope, {
    fetchImpl: async () => answer(200, { status: 'read', pointer: pointer('f'.repeat(64)), snapshot: snap }),
  }), 502, 'candidate.invalid_snapshot_hash');
  await rejectsCode(() => candidateRead(scope, {
    fetchImpl: async () => new Response('not json', { status: 200 }),
  }), 502, 'candidate.invalid_response');
});
