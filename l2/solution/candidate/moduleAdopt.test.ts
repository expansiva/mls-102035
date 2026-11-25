/// <mls fileReference="_102035_/l2/solution/candidate/moduleAdopt.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { buildCandidateSnapshot, candidateRead } from '/_102035_/l2/solution/candidate/candidateGateway.js';
import { adoptL4Output } from '/_102035_/l2/solution/candidate/moduleAdopt.js';
import { L4_REVISION_SCHEMA, originalL4FileInfo, readActiveL4Change, readSealedL4Candidate, sealL4Revision, writeL4OutputRevision } from '/_102035_/l2/solution/candidate/moduleRevision.js';
import { tobeArtifactFileInfo, type Ns5TobeArtifactPath } from '/_102035_/l2/solution/candidate/tobePaths.js';
import { setModuleRoot, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';

const project = 102035;
const moduleName = 'fixture';
const sha = (source: string) => `sha256:${createHash('sha256').update(source).digest('hex')}`;
const defs = (value: unknown) => `export const fixture = ${JSON.stringify(value)} as const;\n`;

/** A module with one change: the base, the edited version, a sealed revision, its effort and its result. */
async function install(effort: { status?: string; structural?: boolean } = {}, options: { noRequest?: boolean } = {}) {
  const previous = (globalThis as any).mls;
  const files: Record<string, any> = {};
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
  (globalThis as any).mls = {
    actualProject: project,
    stor: {
      files, getKeyToFile: keyOf, addOrUpdateFile: async (info: Ns5FileInfo) => add(info),
      localStor: {
        setContent: async (file: Ns5FileInfo, value: { content: string }) => { contents.set(keyOf(file), value.content); },
        deleteFile: async (file: Ns5FileInfo) => { contents.delete(keyOf(file)); delete files[keyOf(file)]; },
      },
    },
    editor: { models: {}, getKeyModel: () => '' },
    common: { crc: { crc32: () => 0 } },
  };
  const plain = { schemaVersion: 'fixture' };
  const rulesBefore = { schemaVersion: 'fixture', rules: [] as string[] };
  const rulesAfter = { schemaVersion: 'fixture', rules: ['novaRegra'] };
  const values: Array<[Ns5TobeArtifactPath, object]> = [
    ['module.defs.ts', { schemaVersion: '2026-09-10-ns5-module-v2', moduleName }],
    ['journeys/index.defs.ts', { schemaVersion: 'fixture', journeys: [] }],
    ['ontology/index.defs.ts', { schemaVersion: 'fixture', entities: [] }],
    ['rules.defs.ts', rulesBefore],
    ['workflows.defs.ts', plain],
    ['access.defs.ts', plain],
    ['integration.defs.ts', plain],
  ];
  const before = values.map(([path, value]) => ({ path, source: defs(value) }));
  const manifestFiles = Object.fromEntries(before.map(item => [item.path, sha(item.source)]));
  const schemas = Object.fromEntries(values.map(([path, value]) => [path, (value as { schemaVersion: string }).schemaVersion]));
  for (const item of before) {
    add(originalL4FileInfo(project, moduleName, 'base1', item.path), item.source);
    add(tobeArtifactFileInfo(project, moduleName, item.path, 'asis'), item.source);
    add(tobeArtifactFileInfo(project, moduleName, item.path, 'tobe'), item.path === 'rules.defs.ts' ? defs(rulesAfter) : item.source);
  }
  const json = (folder: string, shortName: string, value: unknown) => add(
    { project, level: 4, folder: `${moduleName}/${folder}`, shortName, extension: '.json' }, JSON.stringify(value));
  json('pipeline/releases', 'index', { releases: [{ baseId: 'base1' }] });
  json('pipeline/releases/base1', 'manifest', {
    schemaVersion: L4_REVISION_SCHEMA, project, moduleName, baseId: 'base1', files: manifestFiles, schemas,
  });
  json('pipeline/changes', 'active', { changeId: 'change1' });
  json('pipeline/changes/change1', 'change', {
    schemaVersion: L4_REVISION_SCHEMA, project, moduleName, changeId: 'change1', baseId: 'base1',
    activeRevisionId: 'rev1', requestRevision: 1, resultRevisionId: null, sourcePrompt: 'original', updatedAt: '2026-11-25T00:00:00.000Z',
  });
  json('pipeline/changes/change1/requests', 'request-1', { request: 'pedido' });
  const sealed = await sealL4Revision(project, moduleName, 'rev1');
  const revisionId = sealed.revisionId;
  // blocked: a master could not answer (the module has no generated L1); the status follows from the answers
  const master = { project: '102021', kind: 'l1' as const, device: 'web' as const };
  void effort; // no effort here: a review comes before it
  const canonical = (path: string) => contents.get(keyOf(tobeArtifactFileInfo(project, moduleName, path as Ns5TobeArtifactPath, 'asis')));
  return {
    contents, files, add, keyOf, canonical, revisionId, rulesBefore: defs(rulesBefore), rulesAfter: defs(rulesAfter),
    restore: () => { setModuleRoot(moduleName, null); (globalThis as any).mls = previous; },
  };
}



const OUTPUT = `review-${'a'.repeat(32)}`;

/** A change with its sealed input, the output revision the review wrote and the result it marked (as the local store would answer). */
async function reviewed(fixture: Awaited<ReturnType<typeof install>>) {
  const input = await readSealedL4Candidate(project, moduleName, 'change1', fixture.revisionId);
  assert.ok(input);
  const sources = input.sources.map(item => ({ path: item.path, source: item.source }));
  await writeL4OutputRevision(project, moduleName, {
    changeId: 'change1', revisionId: OUTPUT, baseId: 'base1', requestRevision: input.manifest.requestRevision,
    requestHash: input.manifest.requestHash as string, changedPaths: ['rules.defs.ts'], sources,
  });
  const inputSnapshot = await buildCandidateSnapshot({ baseId: 'base1', requestRevision: input.manifest.requestRevision, request: input.request, sources: input.sources });
  const outputSnapshot = await buildCandidateSnapshot({ baseId: 'base1', requestRevision: input.manifest.requestRevision, request: input.request, sources });
  const read = (override: { result?: boolean } = {}) => (async () => ({
    status: 'read', snapshot: null,
    pointer: { changeId: 'change1', revisionId: fixture.revisionId, snapshotHash: inputSnapshot.hash, revisionNumber: 1 },
    ...(override.result === false ? {} : { result: {
      resultRevisionId: fixture.revisionId, resultSnapshotHash: inputSnapshot.hash, resultRevisionNumber: 1, resultId: 'r1', resultHash: 'h1',
      manifest: { runId: `result-${'a'.repeat(32)}`, taskId: 't1', status: 'completed', outputSnapshotHash: outputSnapshot.hash, artifacts: [], traceHash: 'x' },
    } }),
  })) as unknown as typeof candidateRead;
  return { read, outputHash: outputSnapshot.hash };
}

void test('l4_p4_165: adopts the output of the review: it becomes the active and the result revision, and the module files follow it', async () => {
  const fixture = await install();
  try {
    const { read } = await reviewed(fixture);
    const result = await adoptL4Output(project, moduleName, { candidate: read(), gate: async () => ({ pipelineComplete: true }) });
    assert.equal(result.outputRevisionId, OUTPUT);
    assert.equal(result.inputRevisionId, fixture.revisionId);
    assert.equal(result.alreadyAdopted, false);
    const change = await readActiveL4Change(project, moduleName);
    assert.equal(change?.activeRevisionId, OUTPUT);
    assert.equal(change?.resultRevisionId, OUTPUT);
    // adopting again is a no-op
    const again = await adoptL4Output(project, moduleName, { candidate: read(), gate: async () => ({ pipelineComplete: true }) });
    assert.equal(again.alreadyAdopted, true);
  } finally { fixture.restore(); }
});

void test('l4_p4_165: refuses, leaving the change as it was, with no result, an incomplete pipeline seal, a stale input or a snapshot that does not match', async () => {
  const refused = async (code: RegExp, prepare: (fixture: Awaited<ReturnType<typeof install>>, base: Awaited<ReturnType<typeof reviewed>>) => { candidate?: typeof candidateRead; gate?: () => Promise<{ pipelineComplete?: boolean }> } | void) => {
    const fixture = await install();
    try {
      const base = await reviewed(fixture);
      const changed = prepare(fixture, base) || {};
      await assert.rejects(() => adoptL4Output(project, moduleName, {
        candidate: changed.candidate ?? base.read(), gate: (changed.gate ?? (async () => ({ pipelineComplete: true }))) as never,
      }), code);
      const change = await readActiveL4Change(project, moduleName);
      assert.equal(change?.resultRevisionId ?? null, null, String(code));
      assert.notEqual(change?.activeRevisionId, OUTPUT, String(code));
    } finally { fixture.restore(); }
  };
  await refused(/l4\.adopt_no_result/, (_fixture, base) => ({ candidate: base.read({ result: false }) }));
  await refused(/l4\.implementation_not_ready/, () => ({ gate: async () => ({ pipelineComplete: false }) }));
  await refused(/l4\.result_stale/, fixture => {
    const key = `${project}:4:${moduleName}/pipeline/changes/change1:change.json`;
    fixture.contents.set(key, JSON.stringify({ ...JSON.parse(fixture.contents.get(key)!), activeRevisionId: 'another-revision' }));
  });
  await refused(/l4\.implementation_conflict/, (_fixture, base) => ({
    candidate: (async () => {
      const read = await base.read()();
      return { ...read, result: { ...(read as any).result, manifest: { ...(read as any).result.manifest, outputSnapshotHash: 'f'.repeat(64) } } };
    }) as unknown as typeof candidateRead,
  }));
});
