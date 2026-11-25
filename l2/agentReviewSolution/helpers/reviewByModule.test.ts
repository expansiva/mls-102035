/// <mls fileReference="_102035_/l2/agentReviewSolution/helpers/reviewByModule.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { candidateRead } from '/_102035_/l2/solution/candidate/candidateGateway.js';
import { L4_REVISION_SCHEMA, originalL4FileInfo, readActiveL4Change, sealL4Revision } from '/_102035_/l2/solution/candidate/moduleRevision.js';
import { tobeArtifactFileInfo, type Ns5TobeArtifactPath } from '/_102035_/l2/solution/candidate/tobePaths.js';
import { setModuleRoot, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { parseReviewInvocation } from '/_102035_/l2/agentReviewSolution/helpers/invocation.js';
import { reviewInvocationForModule, reviewModuleToken } from '/_102035_/l2/agentReviewSolution/helpers/reviewByModule.js';

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


void test('l4_p4_165: `@@agentReviewSolution <module>` names only the module; anything else is the screen form', () => {
  assert.equal(reviewModuleToken('@@agentReviewSolution telegram'), 'telegram');
  assert.equal(reviewModuleToken('@@agentReviewSolution   telegram  '), 'telegram');
  assert.equal(reviewModuleToken('@@agentReviewSolution {"moduleName":"telegram"}'), '');
  assert.equal(reviewModuleToken('@@agentReviewSolution'), '');
});

void test('l4_p4_165: the module form prepares the entry like the screen and returns the invocation the agent takes', async () => {
  const fixture = await install();
  try {
    const invocation = await reviewInvocationForModule(project, moduleName, 'wagner@example.test');
    const parsed = parseReviewInvocation(invocation, project);
    const change = await readActiveL4Change(project, moduleName);
    assert.equal(parsed.moduleName, moduleName);
    assert.equal(parsed.baseId, 'base1');
    assert.equal(parsed.expectedRevisionId, change?.activeRevisionId);
    assert.equal(parsed.request, 'pedido');
    // the candidate pointer the agent's final step marks is published
    const read = await candidateRead({ project, moduleName });
    assert.equal(read.pointer?.revisionId, change?.activeRevisionId);
  } finally { fixture.restore(); }
});

void test('l4_p4_165: with no active change, no text of the request or no user, it refuses and leaves the module as it is', async () => {
  const refused = async (prepare: (fixture: Awaited<ReturnType<typeof install>>) => void, code: RegExp, userId = 'wagner@example.test') => {
    const fixture = await install();
    try {
      prepare(fixture);
      const before = JSON.stringify([...fixture.contents.entries()].filter(([key]) => !key.includes('/pipeline/changes/') || key.includes('active')));
      await assert.rejects(() => reviewInvocationForModule(project, moduleName, userId), code);
      assert.equal(JSON.stringify([...fixture.contents.entries()].filter(([key]) => !key.includes('/pipeline/changes/') || key.includes('active'))), before);
      assert.equal(fixture.canonical('rules.defs.ts'), fixture.rulesBefore);
    } finally { fixture.restore(); }
  };
  await refused(() => undefined, /review\.user_unknown/, '');
  await refused(fixture => { fixture.contents.set(`${project}:4:${moduleName}/pipeline/changes:active.json`, JSON.stringify({ changeId: '' })); }, /review\.no_active_change/);
  await refused(fixture => {
    const key = `${project}:4:${moduleName}/pipeline/changes/change1/requests:request-1.json`;
    fixture.contents.set(key, JSON.stringify({ request: '   ' }));
  }, /review\.no_request_text|Change request|request/);
});
