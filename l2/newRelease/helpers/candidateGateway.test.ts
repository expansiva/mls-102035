/// <mls fileReference="_102035_/l2/newRelease/helpers/candidateGateway.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCandidateSnapshot,
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

async function snapshot(title = 'one') {
  return buildCandidateSnapshot({
    baseId: 'base-one', requestRevision: 1, request: 'Review the title',
    sources: sourcePaths.map(path => ({ path, source: `export const value = ${JSON.stringify({ path, title })};\n` })),
  });
}

function pointer(hash: string, revisionId = 'rev-one'): CandidatePointer {
  return { changeId: 'change-one', revisionId, snapshotHash: hash, revisionNumber: 1 };
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
