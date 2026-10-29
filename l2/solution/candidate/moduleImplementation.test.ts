import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { acceptL4Implementation, L4_IMPLEMENTATION_SCHEMA, readL4Implementation, readInitialImplementationPlan, implementationCommands, INITIAL_PLAN_PATHS } from './moduleImplementation.js';
import { L4_REVISION_SCHEMA } from './moduleRevision.js';
import type { Ns5FileInfo } from '../fs.js';

const project = 102035;
const moduleName = 'fixture';
const golden = JSON.parse(readFileSync(new URL('../fixtures/changeEffort/agendaClinica-regra-anotacao/changeEffort.json', import.meta.url), 'utf8'));
golden.module = moduleName;
const source = JSON.stringify(golden);
const hash = (value: string) => `sha256:${createHash('sha256').update(value).digest('hex')}`;
const input = { revisionId: 'rev1', acceptedBy: 'reviewer', hashes: { changeEffort: hash(source) } };

function installStorFixture() {
  const previous = (globalThis as any).mls;
  const files: Record<string, any> = {};
  const contents = new Map<string, string>();
  let writes = 0;
  const keyOf = (info: Ns5FileInfo) => `${info.project}:${info.level}:${info.folder}:${info.shortName}${info.extension}`;
  const add = (info: Ns5FileInfo, content = '') => {
    const key = keyOf(info);
    contents.set(key, content);
    return files[key] = { ...info, status: 'unchanged', versionRef: '1',
      getContent: async () => contents.get(key) || '',
      getValueInfo: async () => ({ content: contents.get(key) || '' }),
    };
  };
  (globalThis as any).mls = {
    stor: { files, getKeyToFile: keyOf, addOrUpdateFile: async (info: Ns5FileInfo) => add(info),
      localStor: { setContent: async (file: Ns5FileInfo, value: { content: string }) => {
        writes++; contents.set(keyOf(file), value.content);
      } },
    },
    editor: { models: {}, getKeyModel: () => '' },
  };
  const json = (folder: string, shortName: string, value: unknown) => add({ project, level: 4, folder: `${moduleName}/${folder}`, shortName, extension: '.json' }, JSON.stringify(value));
  const activate = (changeId = 'change1', activeRevisionId: string | null = 'rev1', resultRevisionId: string | null = 'rev1') => {
    json('pipeline/changes', 'active', { changeId });
    json(`pipeline/changes/${changeId}`, 'change', {
      schemaVersion: L4_REVISION_SCHEMA, project, moduleName, changeId, baseId: 'base1',
      activeRevisionId, resultRevisionId, requestRevision: 1, sourcePrompt: 'pedido', updatedAt: '2026-10-08T00:00:00.000Z',
    });
    json(`pipeline/changes/${changeId}/revisions/${resultRevisionId}/l4/pool/l4`, 'changeEffort', golden);
  };
  const effortKey = (changeId = 'change1', revisionId = 'rev1') => `${project}:4:${moduleName}/pipeline/changes/${changeId}/revisions/${revisionId}/l4/pool/l4:changeEffort.json`;
  return { activate, add, json, files, contents, effortKey, writes: () => writes, restore: () => { (globalThis as any).mls = previous; } };
}

test('mr_10 s1 accepts the current result and persists the change record', async () => {
  const fixture = installStorFixture();
  try {
    fixture.activate();
    const record = await acceptL4Implementation(project, moduleName, input);
    assert.deepEqual(record, { schemaVersion: L4_IMPLEMENTATION_SCHEMA, changeId: 'change1', ...input, acceptedAt: record.acceptedAt, merged: golden.merged, phases: [] });
    assert.ok(Number.isFinite(Date.parse(record.acceptedAt)));
    assert.deepEqual(await readL4Implementation(project, moduleName), record);
    assert.ok(fixture.contents.has(`${project}:4:fixture/pipeline/changes/change1:implementation.json`));
  } finally { fixture.restore(); }
});

test('mr_10 s1 repetition preserves acceptance without writing', async () => {
  const fixture = installStorFixture();
  try {
    fixture.activate();
    const record = await acceptL4Implementation(project, moduleName, input);
    const writes = fixture.writes();
    assert.deepEqual(await acceptL4Implementation(project, moduleName, { ...input, acceptedBy: 'other' }), record);
    assert.equal(fixture.writes(), writes);
  } finally { fixture.restore(); }
});

test('mr_10 s1 different hashes or revision conflict without overwriting acceptance', async () => {
  const fixture = installStorFixture();
  try {
    fixture.activate();
    const record = await acceptL4Implementation(project, moduleName, input);
    const writes = fixture.writes();
    await assert.rejects(acceptL4Implementation(project, moduleName, { ...input, hashes: { changeEffort: 'different' } }), /l4.implementation_conflict/);
    fixture.activate('change1', 'rev2', 'rev2');
    await assert.rejects(acceptL4Implementation(project, moduleName, { ...input, revisionId: 'rev2' }), /l4.implementation_conflict/);
    assert.equal(fixture.writes(), writes);
    assert.deepEqual(await readL4Implementation(project, moduleName), record);
  } finally { fixture.restore(); }
});

test('mr_10 s1 missing or stale result is not ready', async () => {
  const fixture = installStorFixture();
  try {
    assert.equal(await readL4Implementation(project, moduleName), null);
    await assert.rejects(acceptL4Implementation(project, moduleName, input), /l4.implementation_not_ready/);
    for (const [active, result] of [['rev1', null], ['rev2', 'rev1'], ['rev1', 'rev2'], [null, null]]) {
      fixture.activate('change1', active, result);
      await assert.rejects(acceptL4Implementation(project, moduleName, input), /l4.implementation_not_ready/);
    }
    assert.equal(fixture.writes(), 0);
  } finally { fixture.restore(); }
});

test('mr_10 s1 a new change does not inherit acceptance', async () => {
  const fixture = installStorFixture();
  try {
    fixture.activate();
    await acceptL4Implementation(project, moduleName, input);
    fixture.activate('change2');
    assert.equal(await readL4Implementation(project, moduleName), null);
    assert.equal((await acceptL4Implementation(project, moduleName, input)).changeId, 'change2');
  } finally { fixture.restore(); }
});

test('mr_10 s1 concurrent different hashes accept only one record', async () => {
  const fixture = installStorFixture();
  try {
    fixture.activate();
    const results = await Promise.allSettled([
      acceptL4Implementation(project, moduleName, input),
      acceptL4Implementation(project, moduleName, { ...input, hashes: { changeEffort: 'different' } }),
    ]);
    assert.equal(results[0].status, 'fulfilled');
    assert.equal(results[1].status, 'rejected');
    if (results[1].status === 'rejected') assert.match(results[1].reason.message, /l4.implementation_conflict/);
    assert.deepEqual((await readL4Implementation(project, moduleName))?.hashes, input.hashes);
  } finally { fixture.restore(); }
});

test('mr_11 s1 stor read errors propagate for active pointer and implementation', async () => {
  const fixture = installStorFixture();
  try {
    fixture.activate();
    await acceptL4Implementation(project, moduleName, input);
    const files = (globalThis as any).mls.stor.files;
    for (const suffix of ['pipeline/changes/change1:implementation.json', 'pipeline/changes:active.json']) {
      const file = files[`${project}:4:fixture/${suffix}`];
      const read = file.getValueInfo;
      file.getValueInfo = async () => { throw new Error('stor read failed'); };
      await assert.rejects(readL4Implementation(project, moduleName), /stor read failed/);
      file.getValueInfo = read;
    }
  } finally { fixture.restore(); }
});

test('mr_28 s1 checks current effort bytes before and after acceptance', async () => {
  const fixture = installStorFixture();
  try {
    fixture.activate();
    fixture.contents.set(fixture.effortKey(), `${source}\n`);
    await assert.rejects(acceptL4Implementation(project, moduleName, input), /l4.implementation_conflict/);
    assert.equal(fixture.writes(), 0);
    fixture.contents.set(fixture.effortKey(), source);
    await acceptL4Implementation(project, moduleName, input);
    const writes = fixture.writes();
    fixture.contents.set(fixture.effortKey(), `${source}\n`);
    await assert.rejects(acceptL4Implementation(project, moduleName, input), /l4.implementation_conflict/);
    assert.equal(fixture.writes(), writes);
  } finally { fixture.restore(); }
});

test('mr_28 s1 rejects missing, invalid, blocked and regeneration', async () => {
  const fixture = installStorFixture();
  try {
    fixture.activate();
    const key = fixture.effortKey();
    fixture.contents.delete(key);
    await assert.rejects(acceptL4Implementation(project, moduleName, input), /l4.implementation_not_ready/);
    fixture.contents.set(key, '{');
    await assert.rejects(acceptL4Implementation(project, moduleName, input), /l4.implementation_not_ready/);
    const blocked = structuredClone(golden);
    blocked.perItem[0].answers[0].status = 'abend';
    blocked.perItem[0].answers[0].abend = { reason: 'unavailable' };
    blocked.merged.abend = [{ item: blocked.perItem[0].item, master: blocked.perItem[0].answers[0].master, reason: 'unavailable' }];
    blocked.status = 'blocked';
    fixture.contents.set(key, JSON.stringify(blocked));
    await assert.rejects(acceptL4Implementation(project, moduleName, { ...input, hashes: { changeEffort: hash(JSON.stringify(blocked)) } }), /l4.implementation_blocked/);
    const regenerate = structuredClone(golden);
    const unit = { kind: 'page', id: 'agenda_diaria', path: 'l2/agendaClinica/web/contracts/agenda_diaria.defs.ts' };
    regenerate.perItem[0].answers[0].regenerateDefs = [unit];
    regenerate.perItem[0].answers[0].materialize = [];
    regenerate.merged.regenerateDefs = [{ project: '102020', ...unit }];
    regenerate.merged.materialize = regenerate.merged.materialize.filter((item: { project: string; id: string }) => item.project !== '102020' || item.id !== unit.id);
    fixture.contents.set(key, JSON.stringify(regenerate));
    assert.ok((await acceptL4Implementation(project, moduleName, { ...input, hashes: { changeEffort: hash(JSON.stringify(regenerate)) } })).merged.regenerateDefs.length);
    assert.equal(fixture.writes(), 2);
  } finally { fixture.restore(); }
});


function initialFixture() {
  const fixture = installStorFixture();
  fixture.activate('change1', 'rev1', null);
  const values: Array<[string, { schemaVersion: string; moduleName?: string; journeys?: unknown[]; entities?: unknown[] }]> = [
    ['module.defs.ts', { schemaVersion: '2026-09-10-ns5-module-v2', moduleName }],
    ['journeys/index.defs.ts', { schemaVersion: 'fixture', journeys: [] }],
    ['ontology/index.defs.ts', { schemaVersion: 'fixture', entities: [] }],
    ...['rules', 'workflows', 'access', 'integration'].map(name => [`${name}.defs.ts`, { schemaVersion: 'fixture' }] as [string, { schemaVersion: string }]),
  ];
  const sources = values.map(([path, value]) => ({ path, source: `export const fixture = ${JSON.stringify(value)} as const;\n` }));
  const files = Object.fromEntries(sources.map(item => [item.path, hash(item.source)]));
  const identity = { schemaVersion: L4_REVISION_SCHEMA, project, moduleName, baseId: 'base1' };
  fixture.json('pipeline/releases', 'index', { releases: [{ baseId: 'base1' }] });
  fixture.json('pipeline/releases/base1', 'manifest', { ...identity, files, schemas: Object.fromEntries(values.map(([path, value]) => [path, value.schemaVersion])) });
  fixture.json('pipeline/changes/change1/revisions/rev1', 'manifest', {
    ...identity, changeId: 'change1', revisionId: 'rev1', files, changedPaths: [], requestRevision: 0, requestHash: hash(''),
  });
  for (const { path, source } of sources) {
    const slash = path.lastIndexOf('/');
    const folder = slash < 0 ? '' : `/${path.slice(0, slash)}`;
    const shortName = path.slice(slash + 1, -8);
    for (const root of [moduleName, `${moduleName}/pipeline/releases/base1/l4`, `${moduleName}/pipeline/changes/change1/revisions/rev1/l4`]) {
      fixture.add({ project, level: 4, folder: root + folder, shortName, extension: '.defs.ts' }, source).updatedAt = '2026-10-29T10:00:00.000Z';
    }
  }
  for (const path of INITIAL_PLAN_PATHS) {
    const slash = path.lastIndexOf('/');
    fixture.json(path.slice(0, slash), path.slice(slash + 1, -5), { moduleName }).updatedAt = '2026-10-29T10:01:00.000Z';
  }
  for (const side of ['l1', 'l2']) {
    fixture.json(`pool/${side}`, 'pipeline', { moduleName, status: 'complete', thread: 'initial-plan' }).updatedAt = '2026-10-29T10:01:00.000Z';
  }
  fixture.json('pipeline/changes/change1', 'change', {
    ...identity, changeId: 'change1', activeRevisionId: 'rev1', resultRevisionId: null,
    promotedRevisionId: 'rev1', promotedAt: '2026-10-29T10:02:00.000Z',
  });
  return fixture;
}

test('mr41 s3a initial acceptance binds neutral promoted revision and four plans without maintenance effort', async () => {
  const fixture = initialFixture();
  try {
    const plan = await readInitialImplementationPlan(project, moduleName);
    assert.equal(plan.fresh, true);
    // Promotion re-stamps bytes: freshness comes from the verified pre-promotion snapshot.
    fixture.files[`${project}:4:${moduleName}:module.defs.ts`].updatedAt = '2026-10-29T10:02:00.000Z';
    const request = { kind: 'initial' as const, revisionId: 'rev1', acceptedBy: 'reviewer', plan };
    const record = await acceptL4Implementation(project, moduleName, request);
    assert.equal(record.initial?.replan, false);
    assert.equal(record.hashes.changeEffort, undefined);
    assert.deepEqual(record.hashes.plans, plan.hashes);
    assert.deepEqual(implementationCommands(record, project, moduleName).map(ref => ref.command), [
      '@@agentDefsL2 fixture', '@@agentDefsL1 fixture /run', '@@agentMaterializeL2 fixture', '@@agentMaterializeL1 {"scope":"fixture"}',
    ]);
    const writes = fixture.writes();
    assert.deepEqual(await acceptL4Implementation(project, moduleName, request), record);
    assert.equal(fixture.writes(), writes);
    assert.deepEqual(await readL4Implementation(project, moduleName), record);
  } finally { fixture.restore(); }
});

for (const stale of ['missing-date', 'old-plan', 'edited-revision'] as const) {
  test(`mr41 s3a ${stale} requires ordinary PlannerL4 before generation`, async () => {
    const fixture = initialFixture();
    try {
      if (stale === 'missing-date') delete fixture.files[`${project}:4:${moduleName}:module.defs.ts`].updatedAt;
      if (stale === 'old-plan') fixture.files[`${project}:4:${moduleName}/pool/l2/web:menu.json`].updatedAt = '2026-10-29T09:59:00.000Z';
      if (stale === 'edited-revision') {
        const key = `${project}:4:${moduleName}/pipeline/changes/change1/revisions/rev1:manifest.json`;
        const manifest = JSON.parse(fixture.contents.get(key)!);
        manifest.changedPaths = ['module.defs.ts'];
        fixture.contents.set(key, JSON.stringify(manifest));
      }
      const plan = await readInitialImplementationPlan(project, moduleName);
      const record = await acceptL4Implementation(project, moduleName, { kind: 'initial', revisionId: 'rev1', acceptedBy: 'reviewer', plan });
      assert.equal(record.initial?.replan, true);
      assert.equal(implementationCommands(record, project, moduleName)[0].command, '@@agentPlannerL4 fixture');
      assert.ok(implementationCommands(record, project, moduleName).every(ref => !ref.command.includes('/candidate') && !ref.agent.startsWith('agentNewRelease')));
    } finally { fixture.restore(); }
  });
}

for (const invalid of ['revision', 'promotion', 'plan-bytes', 'foreign-plan', 'sealed-source', 'pipeline'] as const) {
  test(`mr41 s3a rejects ${invalid} without persisting acceptance`, async () => {
    const fixture = initialFixture();
    try {
      const plan = await readInitialImplementationPlan(project, moduleName);
      if (invalid === 'plan-bytes') fixture.contents.set(`${project}:4:${moduleName}/pool/l2/web:menu.json`, JSON.stringify({ moduleName, changed: true }));
      if (invalid === 'foreign-plan') plan.moduleName = 'other';
      if (invalid === 'sealed-source') fixture.contents.set(`${project}:4:${moduleName}/pipeline/changes/change1/revisions/rev1/l4:module.defs.ts`, 'tampered');
      if (invalid === 'pipeline') fixture.contents.set(`${project}:4:${moduleName}/pool/l1:pipeline.json`, JSON.stringify({ moduleName, status: 'partial', thread: 'initial-plan' }));
      if (invalid === 'promotion') {
        const key = `${project}:4:${moduleName}/pipeline/changes/change1:change.json`;
        const change = JSON.parse(fixture.contents.get(key)!);
        delete change.promotedRevisionId;
        fixture.contents.set(key, JSON.stringify(change));
      }
      await assert.rejects(acceptL4Implementation(project, moduleName, { kind: 'initial', revisionId: invalid === 'revision' ? 'other' : 'rev1', acceptedBy: 'reviewer', plan }));
      assert.equal(fixture.writes(), 0);
    } finally { fixture.restore(); }
  });
}
