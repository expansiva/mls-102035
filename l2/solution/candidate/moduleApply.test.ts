/// <mls fileReference="_102035_/l2/solution/candidate/moduleApply.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { applyL4Revision } from '/_102035_/l2/solution/candidate/moduleApply.js';
import { L4_REVISION_SCHEMA, markL4Result, originalL4FileInfo, readActiveL4Change, sealL4Revision } from '/_102035_/l2/solution/candidate/moduleRevision.js';
import { tobeArtifactFileInfo, type Ns5TobeArtifactPath } from '/_102035_/l2/solution/candidate/tobePaths.js';
import { mergeChangeEffort } from '/_102035_/l2/solution/gates/changeEffort/gate.js';
import { CHANGE_EFFORT_SCHEMA_VERSION } from '/_102035_/l2/solution/poolPlan.js';
import { setModuleRoot, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';

const project = 102035;
const moduleName = 'fixture';
const sha = (source: string) => `sha256:${createHash('sha256').update(source).digest('hex')}`;
const defs = (value: unknown) => `export const fixture = ${JSON.stringify(value)} as const;\n`;

/** A module with one change: the base, the edited version, a sealed revision, its effort and its result. */
async function install(effort: { status?: string; structural?: boolean } = {}) {
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
  const l2 = { project: '102020', kind: 'l2' as const, device: 'web' as const };
  const structural = effort.structural ? [{
    item: 'rule:x',
    answers: [{ master: l2, item: 'rule:x', status: 'computed' as const, create: [], regenerateDefs: [], materialize: [{ kind: 'page' as const, id: 'agenda', path: 'pages/agenda' }], remove: [], runAgents: [], contract: 'keep' as const }],
  }] : [];
  const perItem = effort.structural ? structural : effort.status === 'blocked' ? [{
    item: 'rule:x',
    answers: [{ master, item: 'rule:x', status: 'abend' as const, create: [], regenerateDefs: [], materialize: [], remove: [], runAgents: [], contract: 'keep' as const, abend: { reason: 'sem defs gerados' } }],
  }] : [];
  const merged = mergeChangeEffort(perItem);
  const effortFile = {
    schemaVersion: CHANGE_EFFORT_SCHEMA_VERSION, module: moduleName,
    base: { baseId: 'base1', revisionId, candidateRoot: `${moduleName}/pipeline/changes/change1/revisions/${revisionId}/l4` },
    request: { text: 'pedido', items: perItem.length ? [{ changeId: 'rule:x', kind: 'rule', op: 'changed', entity: '', source: 'rules/x' }] : [] },
    masters: effort.structural ? [l2] : perItem.length ? [master] : [], perItem, merged,
    untouched: { count: 0, sealHash: 'sha256:abc' }, status: effort.status === 'blocked' ? 'blocked' : 'simple',
  };
  const effortPath = { project, level: 4 as const, folder: `${moduleName}/pipeline/changes/change1/revisions/${revisionId}/l4/pool/l4`, shortName: 'changeEffort', extension: '.json' };
  add(effortPath, JSON.stringify(effortFile));
  await markL4Result(project, moduleName, revisionId);
  const canonical = (path: string) => contents.get(keyOf(tobeArtifactFileInfo(project, moduleName, path as Ns5TobeArtifactPath, 'asis')));
  return {
    contents, files, add, keyOf, canonical, revisionId, rulesBefore: defs(rulesBefore), rulesAfter: defs(rulesAfter), effortPath,
    restore: () => { setModuleRoot(moduleName, null); (globalThis as any).mls = previous; },
  };
}

void test('l4_p4_164: applies the sealed revision like the button: the module becomes the candidate, accepted by who ran it, and the change completes', async () => {
  const fixture = await install();
  try {
    assert.equal(fixture.canonical('rules.defs.ts'), fixture.rulesBefore);
    const result = await applyL4Revision(project, moduleName, 'wagner@example.test');
    assert.equal(result.revisionId, fixture.revisionId);
    assert.equal(result.acceptedBy, 'wagner@example.test');
    assert.equal(result.pendingCommands, 0);
    assert.equal(result.completed, true);
    assert.equal(fixture.canonical('rules.defs.ts'), fixture.rulesAfter);
    const confirmation = JSON.parse(fixture.contents.get(`${project}:4:${moduleName}/pipeline/changes/change1:confirmation.json`) || '{}');
    assert.equal(confirmation.confirmedBy, 'wagner@example.test');
    assert.equal(await readActiveL4Change(project, moduleName), null);
    const record = JSON.parse(fixture.contents.get(`${project}:4:${moduleName}/pipeline/changes/change1:implementation.json`) || '{}');
    assert.equal(record.acceptedBy, 'wagner@example.test');
  } finally { fixture.restore(); }
});

void test('l4_p4_164: refuses, leaving the module as it is, when the effort is stale, blocked or missing, or the result is not current', async () => {
  const refused = async (prepare: (fixture: Awaited<ReturnType<typeof install>>) => Promise<void> | void, code: string, effort: { status?: string } = {}) => {
    const fixture = await install(effort);
    try {
      await prepare(fixture);
      await assert.rejects(() => applyL4Revision(project, moduleName, 'wagner@example.test'), new RegExp(code));
      assert.equal(fixture.canonical('rules.defs.ts'), fixture.rulesBefore, code);
    } finally { fixture.restore(); }
  };
  await refused(fixture => {
    // the edited version moved after the effort was calculated
    fixture.contents.set(fixture.keyOf(tobeArtifactFileInfo(project, moduleName, 'rules.defs.ts', 'tobe')), defs({ schemaVersion: 'fixture', rules: ['outra'] }));
  }, 'l4.apply_effort_stale');
  await refused(() => undefined, 'l4.implementation_blocked', { status: 'blocked' });
  await refused(fixture => {
    fixture.contents.delete(fixture.keyOf(fixture.effortPath)); delete fixture.files[fixture.keyOf(fixture.effortPath)];
  }, 'l4.apply_effort_missing');
  await refused(fixture => {
    const key = `${project}:4:${moduleName}/pipeline/changes/change1:change.json`;
    fixture.contents.set(key, JSON.stringify({ ...JSON.parse(fixture.contents.get(key)!), resultRevisionId: null }));
  }, 'l4.apply_result_not_current');
  await refused(fixture => {
    fixture.add({ project, level: 4, folder: `${moduleName}/pool/l2`, shortName: '20261125000000_x_1', extension: '.json' }, '{}');
  }, 'l4.apply_pool_not_empty');
});

void test('l4_p4_164: a failure after the application was sealed restores it and leaves the module as it was', async () => {
  const fixture = await install();
  try {
    let restored = 0;
    await assert.rejects(() => applyL4Revision(project, moduleName, 'wagner@example.test', {
      promote: async () => { throw new Error('module-promotion.revision_mismatch'); },
      restoreApplication: async () => { restored += 1; return undefined as never; },
    }), /module-promotion\.revision_mismatch/);
    assert.equal(restored, 1);
    assert.equal(fixture.canonical('rules.defs.ts'), fixture.rulesBefore);
    assert.equal((await readActiveL4Change(project, moduleName))?.changeId, 'change1');
  } finally { fixture.restore(); }
});

void test('l4_p4_164: when the effort still asks for L2/L1 phases, it applies and accepts but does not complete, and runs no agent', async () => {
  const fixture = await install({ structural: true });
  try {
    const result = await applyL4Revision(project, moduleName, 'wagner@example.test');
    assert.equal(result.completed, false);
    assert.ok(result.pendingCommands > 0);
    assert.equal(fixture.canonical('rules.defs.ts'), fixture.rulesAfter);
    // still the active change, promoted and accepted: the screen resumes the phases from here
    const change = await readActiveL4Change(project, moduleName);
    assert.equal(change?.promotedRevisionId, fixture.revisionId);
    assert.equal(fixture.contents.has(`${project}:4:${moduleName}/pipeline/changes/change1:confirmation.json`), false);
  } finally { fixture.restore(); }
});
