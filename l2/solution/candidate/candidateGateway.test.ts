/// <mls fileReference="_102035_/l2/solution/candidate/candidateGateway.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { fileExists, readJson, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import {
  buildCandidateResult,
  buildCandidateSnapshot,
  candidateMarkResult,
  candidatePublish,
  candidateRead,
  CandidateGatewayError,
  verifyCandidateSnapshot,
} from '/_102035_/l2/solution/candidate/candidateGateway.js';
import { L4_REVISION_SCHEMA, originalL4FileInfo } from '/_102035_/l2/solution/candidate/moduleRevision.js';
import { tobeArtifactFileInfo, type Ns5TobeArtifactPath } from '/_102035_/l2/solution/candidate/tobePaths.js';

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
const baseId = 'base-one';
const request = 'Review the title';

const shaPref = (source: string) => `sha256:${createHash('sha256').update(source).digest('hex')}`;

function coreSources(title: string): Array<{ path: Ns5TobeArtifactPath; source: string }> {
  const values: Array<[Ns5TobeArtifactPath, object]> = [
    ['module.defs.ts', { schemaVersion: '2026-09-10-ns5-module-v2', moduleName: scope.moduleName, title }],
    ['journeys/index.defs.ts', { schemaVersion: 'fixture', journeys: [] }],
    ['ontology/index.defs.ts', { schemaVersion: 'fixture', entities: [] }],
    ['rules.defs.ts', { schemaVersion: 'fixture' }],
    ['workflows.defs.ts', { schemaVersion: 'fixture' }],
    ['access.defs.ts', { schemaVersion: 'fixture' }],
    ['integration.defs.ts', { schemaVersion: 'fixture' }],
  ];
  return values.map(([path, value]) => ({ path, source: `export const fixture = ${JSON.stringify(value)} as const;\n` }));
}

function installStor() {
  const previous = (globalThis as { mls?: unknown }).mls;
  const files: Record<string, {
    project: number; level: number; folder: string; shortName: string; extension: string;
    status: string; versionRef: string;
    getContent: () => Promise<string>;
    getValueInfo: () => Promise<{ content: string }>;
  }> = {};
  const contents = new Map<string, string>();
  const keyOf = (info: Ns5FileInfo) => `${info.project}:${info.level}:${info.folder || ''}:${info.shortName}${info.extension}`;
  const add = (info: Ns5FileInfo, content = '') => {
    const key = keyOf(info);
    contents.set(key, content);
    return files[key] = {
      ...info, status: 'unchanged', versionRef: '1',
      getContent: async () => contents.get(key) || '',
      getValueInfo: async () => ({ content: contents.get(key) || '' }),
    };
  };
  (globalThis as { mls?: unknown }).mls = {
    stor: {
      files,
      getKeyToFile: keyOf,
      addOrUpdateFile: async (info: Ns5FileInfo) => add(info),
      localStor: { setContent: async (file: Ns5FileInfo, value: { content: string }) => { contents.set(keyOf(file), value.content); } },
    },
    editor: { models: {}, getKeyModel: () => '' },
    common: { crc: { crc32: () => 0 } },
  };
  const json = (folder: string, shortName: string, value: unknown) => add({
    project: scope.project, level: 4, folder: `${scope.moduleName}/${folder}`, shortName, extension: '.json',
  }, JSON.stringify(value));
  return { add, json, restore: () => { (globalThis as { mls?: unknown }).mls = previous; } };
}

function revisionFile(changeId: string, revisionId: string, path: Ns5TobeArtifactPath): Ns5FileInfo {
  const origin = tobeArtifactFileInfo(scope.project, scope.moduleName, path, 'asis');
  const prefix = `${scope.moduleName}/pipeline/changes/${changeId}/revisions/${revisionId}/l4`;
  return { ...origin, folder: `${prefix}${origin.folder === scope.moduleName ? '' : origin.folder.slice(scope.moduleName.length)}` };
}

function plantRelease(fx: ReturnType<typeof installStor>, sources: Array<{ path: Ns5TobeArtifactPath; source: string }>) {
  for (const item of sources) fx.add(originalL4FileInfo(scope.project, scope.moduleName, baseId, item.path), item.source);
  fx.json('pipeline/releases', 'index', { releases: [{ baseId }] });
  fx.json(`pipeline/releases/${baseId}`, 'manifest', {
    schemaVersion: L4_REVISION_SCHEMA, project: scope.project, moduleName: scope.moduleName, baseId,
    files: Object.fromEntries(sources.map(item => [item.path, shaPref(item.source)])),
    schemas: {
      'module.defs.ts': '2026-09-10-ns5-module-v2',
      'journeys/index.defs.ts': 'fixture',
      'ontology/index.defs.ts': 'fixture',
      'rules.defs.ts': 'fixture',
      'workflows.defs.ts': 'fixture',
      'access.defs.ts': 'fixture',
      'integration.defs.ts': 'fixture',
    },
  });
}

function plantRevision(
  fx: ReturnType<typeof installStor>,
  changeId: string,
  revisionId: string,
  sources: Array<{ path: Ns5TobeArtifactPath; source: string }>,
  requestText = request,
) {
  for (const item of sources) fx.add(revisionFile(changeId, revisionId, item.path), item.source);
  fx.json(`pipeline/changes/${changeId}/revisions/${revisionId}`, 'manifest', {
    schemaVersion: L4_REVISION_SCHEMA, project: scope.project, moduleName: scope.moduleName,
    changeId, revisionId, baseId, createdAt: '2026-11-01T00:00:00.000Z',
    files: Object.fromEntries(sources.map(item => [item.path, shaPref(item.source)])),
    requestRevision: 1, requestHash: shaPref(requestText),
  });
  fx.json(`pipeline/changes/${changeId}/requests`, 'request-1', {
    schemaVersion: L4_REVISION_SCHEMA, revision: 1, request: requestText, createdAt: '2026-11-01T00:00:00.000Z',
  });
}

async function snapshotOf(sources: Array<{ path: string; source: string }>, requestText = request) {
  return buildCandidateSnapshot({ baseId, requestRevision: 1, request: requestText, sources });
}

function artifactsOf(value: Awaited<ReturnType<typeof snapshotOf>>) {
  return value.files.map(({ path, sha256 }) => ({ path, sha256 }));
}

async function rejectsCode(work: () => Promise<unknown>, statusCode: number, code: string): Promise<void> {
  await assert.rejects(work, (error: unknown) => {
    assert.ok(error instanceof CandidateGatewayError);
    assert.equal(error.statusCode, statusCode);
    assert.equal(error.code, code);
    return true;
  });
}

function manifestFor(output: Awaited<ReturnType<typeof snapshotOf>>) {
  return {
    runId: 'run-one', taskId: 'task-one', status: 'completed' as const, traceHash: 'c'.repeat(64),
    outputSnapshotHash: output.hash, artifacts: artifactsOf(output),
  };
}

test('read without a pointer is an explicit empty state and does not fetch', async () => {
  const fx = installStor();
  let fetched = false;
  const previous = globalThis.fetch;
  globalThis.fetch = (() => { fetched = true; return Promise.reject(new Error('fetch')); }) as typeof fetch;
  try {
    const result = await candidateRead(scope);
    assert.deepEqual(result, { status: 'read', pointer: null, snapshot: null });
    assert.equal(fetched, false);
    assert.equal(fileExists({ project: scope.project, level: 4, folder: `${scope.moduleName}/tobe/candidate`, shortName: 'pointer', extension: '.json' }), false);
  } finally {
    globalThis.fetch = previous;
    fx.restore();
  }
});

test('publish writes the pointer and the read recomputes the sealed snapshot', async () => {
  const fx = installStor();
  const sources = coreSources('one');
  plantRelease(fx, sources);
  plantRevision(fx, 'change-one', 'rev-one', sources);
  const snap = await snapshotOf(sources);
  try {
    const committed = await candidatePublish({
      ...scope, expectedRevisionId: null, requestId: 'request-one',
      changeId: 'change-one', revisionId: 'rev-one', snapshot: snap,
    });
    assert.equal(committed.status, 'committed');
    if (committed.status !== 'committed') return;
    assert.equal(committed.pointer.snapshotHash, snap.hash);
    assert.equal(committed.pointer.revisionNumber, 1);
    const read = await candidateRead(scope);
    assert.equal(read.snapshot?.hash, snap.hash);
    assert.equal(read.snapshot?.files.length, sourcePaths.length);
    const pointer = await readJson<Record<string, unknown>>({
      project: scope.project, level: 4, folder: `${scope.moduleName}/tobe/candidate`, shortName: 'pointer', extension: '.json',
    });
    assert.equal(pointer?.requestId, undefined);
  } finally { fx.restore(); }
});

test('publish conflicts when expectedRevisionId does not match the pointer', async () => {
  const fx = installStor();
  const sources = coreSources('one');
  plantRelease(fx, sources);
  plantRevision(fx, 'change-one', 'rev-one', sources);
  plantRevision(fx, 'change-one', 'rev-two', sources);
  const snap = await snapshotOf(sources);
  try {
    await candidatePublish({
      ...scope, expectedRevisionId: null, requestId: 'request-one',
      changeId: 'change-one', revisionId: 'rev-one', snapshot: snap,
    });
    const conflict = await candidatePublish({
      ...scope, expectedRevisionId: null, requestId: 'request-two',
      changeId: 'change-one', revisionId: 'rev-two', snapshot: snap,
    });
    assert.equal(conflict.status, 'conflict');
    assert.equal(conflict.status === 'conflict' ? conflict.pointer?.revisionId : undefined, 'rev-one');
  } finally { fx.restore(); }
});

test('publish rejects a snapshot whose hash does not match the seal', async () => {
  const fx = installStor();
  const sources = coreSources('one');
  plantRelease(fx, sources);
  plantRevision(fx, 'change-one', 'rev-one', coreSources('other'));
  const snap = await snapshotOf(sources);
  try {
    await rejectsCode(() => candidatePublish({
      ...scope, expectedRevisionId: null, requestId: 'request-one',
      changeId: 'change-one', revisionId: 'rev-one', snapshot: snap,
    }), 502, 'candidate.invalid_snapshot_hash');
  } finally { fx.restore(); }
});

test('a tampered pointer hash is refused on read', async () => {
  const fx = installStor();
  const sources = coreSources('one');
  plantRelease(fx, sources);
  plantRevision(fx, 'change-one', 'rev-one', sources);
  const snap = await snapshotOf(sources);
  try {
    await candidatePublish({
      ...scope, expectedRevisionId: null, requestId: 'request-one',
      changeId: 'change-one', revisionId: 'rev-one', snapshot: snap,
    });
    const info = { project: scope.project, level: 4, folder: `${scope.moduleName}/tobe/candidate`, shortName: 'pointer', extension: '.json' };
    const pointer = await readJson<Record<string, unknown>>(info);
    fx.add(info, JSON.stringify({ ...pointer, snapshotHash: 'f'.repeat(64) }));
    await rejectsCode(() => candidateRead(scope), 502, 'candidate.invalid_snapshot_hash');
  } finally { fx.restore(); }
});

test('supersede records the previous pointer and rejects a permit', async () => {
  const fx = installStor();
  const first = coreSources('one');
  const next = coreSources('next');
  plantRelease(fx, first);
  plantRevision(fx, 'change-one', 'rev-one', first);
  plantRevision(fx, 'change-two', 'rev-two', next);
  const firstSnap = await snapshotOf(first);
  const nextSnap = await snapshotOf(next);
  try {
    await candidatePublish({
      ...scope, expectedRevisionId: null, requestId: 'request-one',
      changeId: 'change-one', revisionId: 'rev-one', snapshot: firstSnap,
    });
    const input = {
      ...scope, expectedRevisionId: 'rev-one', requestId: 'request-two',
      changeId: 'change-two', revisionId: 'rev-two', snapshot: nextSnap,
      supersede: { changeId: 'change-one', revisionId: 'rev-one' },
    };
    await rejectsCode(() => candidatePublish({ ...input, expectedRevisionId: null }), 409, 'candidate.supersede_mismatch');
    await rejectsCode(() => candidatePublish({
      ...input,
      permit: {
        resultId: 'result-one', resultHash: 'a'.repeat(64), inputRevisionId: 'rev-one',
        inputSnapshotHash: firstSnap.hash, inputRevisionNumber: 1, outputSnapshotHash: nextSnap.hash,
      },
    }), 400, 'candidate.supersede_with_permit');
    const committed = await candidatePublish(input);
    assert.equal(committed.status, 'committed');
    assert.deepEqual(committed.status === 'committed' ? committed.pointer.supersedes : undefined, {
      changeId: 'change-one', revisionId: 'rev-one', revisionNumber: 1,
    });
  } finally { fx.restore(); }
});

test('markResult stores the permit and the next publish checks it', async () => {
  const fx = installStor();
  const inputSources = coreSources('input');
  const outputSources = coreSources('output');
  plantRelease(fx, inputSources);
  plantRevision(fx, 'change-one', 'rev-one', inputSources);
  plantRevision(fx, 'change-one', 'rev-two', outputSources);
  const inputSnap = await snapshotOf(inputSources);
  const outputSnap = await snapshotOf(outputSources);
  try {
    const published = await candidatePublish({
      ...scope, expectedRevisionId: null, requestId: 'request-one',
      changeId: 'change-one', revisionId: 'rev-one', snapshot: inputSnap,
    });
    assert.equal(published.status, 'committed');
    const markedInput = await buildCandidateResult({
      ...scope, expectedRevisionId: 'rev-one', expectedSnapshotHash: inputSnap.hash,
      expectedRevisionNumber: 1, resultId: 'result-one', outputSnapshot: outputSnap,
      result: manifestFor(outputSnap),
    });
    const marked = await candidateMarkResult(markedInput);
    assert.equal(marked.status, 'marked');
    if (marked.status !== 'marked') return;
    assert.equal(marked.permit.outputSnapshotHash, outputSnap.hash);
    assert.equal(marked.permit.inputSnapshotHash, inputSnap.hash);
    const read = await candidateRead(scope);
    assert.equal(read.status === 'read' && read.result ? read.result.manifest.runId : undefined, 'run-one');
    await rejectsCode(() => candidatePublish({
      ...scope, expectedRevisionId: 'rev-one', requestId: 'request-two',
      changeId: 'change-one', revisionId: 'rev-two', snapshot: outputSnap,
    }), 409, 'candidate.result_permit_required');
    const again = await candidatePublish({
      ...scope, expectedRevisionId: 'rev-one', requestId: 'request-two',
      changeId: 'change-one', revisionId: 'rev-two', snapshot: outputSnap, permit: marked.permit,
    });
    assert.equal(again.status, 'committed');
    assert.equal(again.status === 'committed' ? again.pointer.source?.resultId : undefined, 'result-one');
    assert.equal(again.status === 'committed' ? again.pointer.revisionNumber : undefined, 2);
    await rejectsCode(() => candidatePublish({
      ...scope, expectedRevisionId: 'rev-one', requestId: 'request-bad',
      changeId: 'change-one', revisionId: 'rev-two', snapshot: outputSnap,
      permit: { ...marked.permit, outputSnapshotHash: 'f'.repeat(64) },
    }), 409, 'candidate.result_permit_mismatch');
  } finally { fx.restore(); }
});

test('markResult conflicts when the expected revision is not current', async () => {
  const fx = installStor();
  const sources = coreSources('one');
  plantRelease(fx, sources);
  plantRevision(fx, 'change-one', 'rev-one', sources);
  const snap = await snapshotOf(sources);
  try {
    const markedInput = await buildCandidateResult({
      ...scope, expectedRevisionId: 'rev-missing', expectedSnapshotHash: snap.hash,
      expectedRevisionNumber: 1, resultId: 'result-one', outputSnapshot: snap,
      result: manifestFor(snap),
    });
    const conflict = await candidateMarkResult(markedInput);
    assert.deepEqual(conflict, { status: 'conflict', pointer: null });
  } finally { fx.restore(); }
});

test('publish freezes the input before the first await', async () => {
  const fx = installStor();
  const sources = coreSources('frozen');
  plantRelease(fx, sources);
  plantRevision(fx, 'change-frozen', 'rev-frozen', sources);
  const snap = await snapshotOf(sources);
  const input = {
    ...scope, expectedRevisionId: null as string | null, requestId: 'request-frozen',
    changeId: 'change-frozen', revisionId: 'rev-frozen', snapshot: snap,
  };
  try {
    const pending = candidatePublish(input);
    input.changeId = 'mutated-change';
    input.revisionId = 'mutated-revision';
    input.project = 9;
    const committed = await pending;
    assert.equal(committed.status === 'committed' ? committed.pointer.changeId : undefined, 'change-frozen');
    assert.equal(committed.status === 'committed' ? committed.pointer.revisionId : undefined, 'rev-frozen');
  } finally { fx.restore(); }
});

test('a stor write failure becomes candidate.storage_unavailable', async () => {
  const fx = installStor();
  const sources = coreSources('one');
  plantRelease(fx, sources);
  plantRevision(fx, 'change-one', 'rev-one', sources);
  const snap = await snapshotOf(sources);
  const host = (globalThis as { mls: { stor: { localStor: { setContent: () => Promise<void> } } } }).mls;
  host.stor.localStor.setContent = async () => { throw new Error('disk'); };
  try {
    await rejectsCode(() => candidatePublish({
      ...scope, expectedRevisionId: null, requestId: 'request-one',
      changeId: 'change-one', revisionId: 'rev-one', snapshot: snap,
    }), 503, 'candidate.storage_unavailable');
  } finally { fx.restore(); }
});

test('mark-result rejects arbitrary artifact hashes, output hash and divergent bytes locally', async () => {
  const output = await snapshotOf(coreSources('output'));
  const base = {
    ...scope, expectedRevisionId: 'rev-one', expectedSnapshotHash: 'a'.repeat(64),
    expectedRevisionNumber: 1, resultId: 'result-one', outputSnapshot: output,
  };
  const manifest = manifestFor(output);
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

test('tampered bytes, file hash and snapshot hash are rejected', async () => {
  const snap = await snapshotOf(coreSources('one'));
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
  const snap = await snapshotOf(coreSources('one'));
  await rejectsCode(() => verifyCandidateSnapshot({ ...snap, files: snap.files.slice(1) }), 502, 'candidate.incomplete_snapshot');
  await rejectsCode(() => verifyCandidateSnapshot({ ...snap, files: [...snap.files, snap.files[0]] }), 502, 'candidate.invalid_snapshot');
});

test('snapshot builder uses the canonical L4 path grammar shared with CBE and host', async () => {
  for (const path of acceptedExtraPaths) {
    const built = await buildCandidateSnapshot({
      baseId, requestRevision: 1, request: 'paths',
      sources: [...sourcePaths, path].map(item => ({ path: item, source: `// ${item}\n` })),
    });
    assert.equal(built.files.some(file => file.path === path), true);
  }
  for (const path of rejectedExtraPaths) {
    await rejectsCode(() => buildCandidateSnapshot({
      baseId, requestRevision: 1, request: 'paths',
      sources: [...sourcePaths, path].map(item => ({ path: item, source: `// ${item}\n` })),
    }), 400, 'candidate.invalid_file');
  }
});

test('mr_19 s1 accepts a real platform taskId and rejects path and empty ids', async () => {
  const output = await snapshotOf(coreSources('output'));
  const base = {
    ...scope, expectedRevisionId: 'rev-one', expectedSnapshotHash: 'a'.repeat(64),
    expectedRevisionNumber: 1, resultId: 'result-one', outputSnapshot: output,
  };
  const manifest = { ...manifestFor(output), taskId: '20261007053809.1001' };
  const built = await buildCandidateResult({ ...base, result: manifest });
  assert.equal(built.result.taskId, '20261007053809.1001');
  for (const taskId of ['../x', '']) {
    await rejectsCode(
      () => buildCandidateResult({ ...base, result: { ...manifest, taskId } }),
      400,
      'candidate.invalid_result',
    );
  }
});
