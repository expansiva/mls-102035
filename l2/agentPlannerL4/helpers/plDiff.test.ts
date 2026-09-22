/// <mls fileReference="_102035_/l2/agentPlannerL4/helpers/plDiff.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { prepareL4Change, sealL4Revision } from '/_102035_/l2/newRelease/helpers/moduleRevision.js';
import { sha256Tobe } from '/_102035_/l2/newRelease/tobeDiff.js';
import { setModuleRoot } from '/_102035_/l2/solution/fs.js';
import {
  gatherPlEntryFacts,
  loadPlRevision,
  parsePlInvocation,
  plEntryRefusal,
  releaseMissingRefusal,
  revisionMissingRefusal,
  writePlRevision,
} from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
import {
  diffL4Snapshots,
  L4_DIFF_SCHEMA,
  parseDefsSource,
  resolveBase,
  runPlDiff,
  snapshotFromParsed,
  type L4DiffSnapshot,
} from '/_102035_/l2/agentPlannerL4/helpers/plDiff.js';
import type { Ns5RulesAny } from '/_102035_/l2/solution/types.js';

type Stored = {
  project: number; level: number; folder: string; shortName: string; extension: string;
  status: string; versionRef: string; content: string;
  getValueInfo: () => Promise<{ content: string }>;
  getContent: () => Promise<string>;
};

type Host = { files: Record<string, Stored> };

const PROJECT = 102047;
const MODULE = 'mensalidadesAcademia';
const FIXTURE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../steps/diff20/fixtures/mensalidadesAcademia',
);
const RULE_OLD = 'O valor de cada pagamento deve ser positivo.';
const RULE_NEW = 'O valor de cada pagamento deve ser estritamente positivo.';

function keyOf(info: { project: number | string; level: number | string; folder: string; shortName: string; extension: string }): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

function installHost(): Host {
  const host: Host = { files: {} };
  (globalThis as unknown as Record<string, unknown>).mls = {
    actualProject: PROJECT,
    events: { addEventListener() {}, removeEventListener() {}, dispatch() {} },
    stor: {
      files: host.files,
      getKeyToFile: keyOf,
      addOrUpdateFile: async (params: { project: number; level: number; folder: string; shortName: string; extension: string }) => {
        const file: Stored = {
          project: params.project, level: params.level, folder: params.folder,
          shortName: params.shortName, extension: params.extension,
          status: 'new', versionRef: '0', content: '',
          getValueInfo: async () => ({ content: file.content }),
          getContent: async () => file.content,
        };
        host.files[keyOf(file)] = file;
        return file;
      },
      localStor: {
        setContent: async (file: Stored, value: { content: string }) => { file.content = value.content; },
        listFolder: () => [],
        deleteFile: (file: Stored) => { file.status = 'deleted'; },
      },
    },
  };
  return host;
}

function seed(
  host: Host,
  info: { level: number; folder: string; shortName: string; extension: string },
  content: string,
): Stored {
  const file: Stored = {
    project: PROJECT, ...info, status: 'changed', versionRef: '1', content,
    getValueInfo: async () => ({ content: file.content }),
    getContent: async () => file.content,
  };
  host.files[keyOf(file)] = file;
  return file;
}

function loadFixtureFiles(): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (dir: string, prefix: string) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      const rel = prefix ? `${prefix}/${name}` : name;
      if (statSync(full).isDirectory()) walk(full, rel);
      else out.set(rel, readFileSync(full, 'utf8'));
    }
  };
  walk(FIXTURE, '');
  return out;
}

function splitRel(rel: string): { folder: string; shortName: string; extension: string } {
  const last = rel.lastIndexOf('/');
  const folderPart = last < 0 ? '' : rel.slice(0, last);
  const name = last < 0 ? rel : rel.slice(last + 1);
  const dot = name.indexOf('.');
  return {
    folder: folderPart,
    shortName: dot < 0 ? name : name.slice(0, dot),
    extension: dot < 0 ? '' : name.slice(dot),
  };
}

function seedTree(host: Host, root: string, files: Map<string, string>): void {
  for (const [rel, content] of files) {
    const parts = splitRel(rel);
    const folder = parts.folder ? `${root}/${parts.folder}` : root;
    seed(host, { level: 4, folder, shortName: parts.shortName, extension: parts.extension }, content);
  }
}

function fingerprint(files: Map<string, string>): string {
  const hash = createHash('sha256');
  for (const rel of [...files.keys()].sort()) {
    hash.update(rel);
    hash.update('\0');
    hash.update(files.get(rel) || '');
    hash.update('\0');
  }
  return hash.digest('hex');
}

function canonicalFromHost(host: Host, files: Map<string, string>): Map<string, string> {
  const out = new Map<string, string>();
  for (const rel of files.keys()) {
    const parts = splitRel(rel);
    const folder = parts.folder ? `${MODULE}/${parts.folder}` : MODULE;
    const key = keyOf({
      project: PROJECT, level: 4, folder, shortName: parts.shortName, extension: parts.extension,
    });
    out.set(rel, host.files[key]?.content || '');
  }
  return out;
}

function rulesSnapshot(source: string): L4DiffSnapshot {
  const rules = parseDefsSource<Ns5RulesAny>(source);
  assert.ok(rules);
  return snapshotFromParsed({ entities: [], rules, access: null, workflows: null, integration: null });
}

void test('diff of two identical snapshots is empty', () => {
  const source = loadFixtureFiles().get('rules.defs.ts') || '';
  const snap = rulesSnapshot(source);
  assert.deepEqual(diffL4Snapshots(snap, snap), []);
});

void test('one hand-edited rule is exactly one rule:changed item', () => {
  const original = loadFixtureFiles().get('rules.defs.ts') || '';
  const edited = original.replace(RULE_OLD, RULE_NEW);
  assert.notEqual(edited, original);
  const items = diffL4Snapshots(rulesSnapshot(original), rulesSnapshot(edited));
  assert.equal(items.length, 1);
  assert.equal(items[0].kind, 'rule');
  assert.equal(items[0].op, 'changed');
  assert.equal(items[0].changeId, 'rule:paymentAmountPositive');
  assert.equal(items[0].entity, '');
  assert.equal(items[0].source, 'rules.defs.ts');
});

void test('runPlDiff without /candidate writes empty items and does not touch canonical l4', async () => {
  const files = loadFixtureFiles();
  const before = fingerprint(files);
  const host = installHost();
  seedTree(host, MODULE, files);
  try {
    setModuleRoot(MODULE, null);
    const diff = await runPlDiff(MODULE);
    assert.equal(diff.schemaVersion, L4_DIFF_SCHEMA);
    assert.deepEqual(diff.items, []);
    assert.equal(diff.base, '');
    assert.equal(diff.candidate, '');
    assert.equal(diff.revision, null);
    assert.equal(fingerprint(canonicalFromHost(host, files)), before);
  } finally {
    setModuleRoot(MODULE, null);
  }
});

void test('T3: two real l4s of mensalidadesAcademia differ by one rule; canonical fingerprint is unchanged', async () => {
  const files = loadFixtureFiles();
  assert.equal(files.size >= 10, true);
  const originalRules = files.get('rules.defs.ts') || '';
  assert.match(originalRules, new RegExp(RULE_OLD.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const candidateFiles = new Map(files);
  candidateFiles.set('rules.defs.ts', originalRules.replace(RULE_OLD, RULE_NEW));
  const before = fingerprint(files);
  const host = installHost();
  seedTree(host, MODULE, files);
  seedTree(host, `${MODULE}/pipeline/releases/base1/l4`, files);
  seedTree(host, `${MODULE}/tobe/plan`, candidateFiles);
  seed(
    host,
    { level: 4, folder: `${MODULE}/pipeline/releases`, shortName: 'index', extension: '.json' },
    `${JSON.stringify({
      schemaVersion: '2026-09-20-nr-module-revision-v1',
      releases: [{ baseId: 'base1', createdAt: '2026-09-20T00:00:00.000Z', provenance: { status: 'unverified', label: 'test' } }],
    }, null, 2)}\n`,
  );
  try {
    setModuleRoot(MODULE, `${MODULE}/tobe/plan`);
    const diff = await runPlDiff(MODULE);
    assert.equal(diff.schemaVersion, L4_DIFF_SCHEMA);
    assert.equal(diff.moduleName, MODULE);
    assert.equal(diff.base, `${MODULE}/pipeline/releases/base1/l4`);
    assert.equal(diff.candidate, `${MODULE}/tobe/plan`);
    assert.equal(diff.items.length, 1);
    assert.equal(diff.items[0].kind, 'rule');
    assert.equal(diff.items[0].op, 'changed');
    assert.equal(diff.items[0].changeId, 'rule:paymentAmountPositive');
    assert.equal(fingerprint(canonicalFromHost(host, files)), before);
    const l1 = host.files[keyOf({
      project: PROJECT, level: 4, folder: `${MODULE}/tobe/plan/pool/l1/web`, shortName: 'l4diff', extension: '.json',
    })];
    const l2 = host.files[keyOf({
      project: PROJECT, level: 4, folder: `${MODULE}/tobe/plan/pool/l2/web`, shortName: 'l4diff', extension: '.json',
    })];
    assert.equal(l1?.content, l2?.content);
    const written = JSON.parse(l1?.content || 'null') as { items: unknown[]; revision: unknown };
    assert.equal(written.items.length, 1);
    assert.equal(written.revision, null);
    assert.equal(diff.revision, null);
  } finally {
    setModuleRoot(MODULE, null);
  }
});

void test('without a sealed release, one changed rule against canonical l4 is one rule:changed item', async () => {
  const files = loadFixtureFiles();
  const originalRules = files.get('rules.defs.ts') || '';
  const candidateFiles = new Map(files);
  candidateFiles.set('rules.defs.ts', originalRules.replace(RULE_OLD, RULE_NEW));
  const before = fingerprint(files);
  const host = installHost();
  seedTree(host, MODULE, files);
  seedTree(host, `${MODULE}/tobe/plan`, candidateFiles);
  try {
    setModuleRoot(MODULE, `${MODULE}/tobe/plan`);
    const diff = await runPlDiff(MODULE);
    assert.equal(diff.schemaVersion, L4_DIFF_SCHEMA);
    assert.equal(diff.base, 'canonical');
    assert.equal(diff.candidate, `${MODULE}/tobe/plan`);
    assert.equal(diff.items.length, 1);
    assert.equal(diff.items[0].kind, 'rule');
    assert.equal(diff.items[0].op, 'changed');
    assert.equal(diff.items[0].changeId, 'rule:paymentAmountPositive');
    assert.equal((diff.items[0].before as { description?: string } | undefined)?.description, RULE_OLD);
    assert.equal((diff.items[0].after as { description?: string } | undefined)?.description, RULE_NEW);
    assert.equal(fingerprint(canonicalFromHost(host, files)), before);
    const written = JSON.parse(host.files[keyOf({
      project: PROJECT, level: 4, folder: `${MODULE}/tobe/plan/pool/l2/web`, shortName: 'l4diff', extension: '.json',
    })]?.content || 'null') as { base: string; items: unknown[]; revision: unknown };
    assert.equal(written.base, 'canonical');
    assert.equal(written.items.length, 1);
    assert.equal(written.revision, null);
    assert.equal(diff.revision, null);
    await writePlRevision(MODULE, null);
    const pipeline = JSON.parse(host.files[keyOf({
      project: PROJECT, level: 4, folder: `${MODULE}/tobe/plan/pipeline`, shortName: 'pipeline', extension: '.json',
    })]?.content || 'null') as { revision: unknown };
    assert.equal(pipeline.revision, null);
  } finally {
    setModuleRoot(MODULE, null);
  }
});

void test('identical candidate against canonical base yields empty items', async () => {
  const files = loadFixtureFiles();
  const host = installHost();
  seedTree(host, MODULE, files);
  seedTree(host, `${MODULE}/tobe/plan`, files);
  try {
    setModuleRoot(MODULE, `${MODULE}/tobe/plan`);
    const diff = await runPlDiff(MODULE);
    assert.equal(diff.base, 'canonical');
    assert.equal(diff.candidate, `${MODULE}/tobe/plan`);
    assert.deepEqual(diff.items, []);
  } finally {
    setModuleRoot(MODULE, null);
  }
});

void test('without canonical module, base is empty and every item is added', async () => {
  const files = loadFixtureFiles();
  const host = installHost();
  seedTree(host, `${MODULE}/tobe/plan`, files);
  try {
    setModuleRoot(MODULE, `${MODULE}/tobe/plan`);
    const diff = await runPlDiff(MODULE);
    assert.equal(diff.base, '');
    assert.equal(diff.candidate, `${MODULE}/tobe/plan`);
    assert.equal(diff.items.length > 0, true);
    assert.equal(diff.items.every(item => item.op === 'added'), true);
    assert.equal(diff.revision, null);
  } finally {
    setModuleRoot(MODULE, null);
  }
});

function seedL5(host: Host): void {
  seed(host, { level: 5, folder: '', shortName: 'config', extension: '.json' }, `${JSON.stringify({
    workspaceDependencies: ['102020', '102021'],
  })}\n`);
}

void test('resolveBase uses manifest baseId and refuses when that release folder is missing', async () => {
  const host = installHost();
  const root = `${MODULE}/pipeline/changes/c1/revisions/rev-1/l4`;
  seed(host, { level: 4, folder: MODULE, shortName: 'module', extension: '.defs.ts' }, 'export default {}\n');
  seed(
    host,
    { level: 4, folder: `${MODULE}/pipeline/changes/c1/revisions/rev-1`, shortName: 'manifest', extension: '.json' },
    `${JSON.stringify({ baseId: 'base1' })}\n`,
  );
  seed(host, { level: 4, folder: `${MODULE}/pipeline/releases/base1/l4`, shortName: 'module', extension: '.defs.ts' }, 'export default {}\n');
  try {
    setModuleRoot(MODULE, root);
    const present = await resolveBase(MODULE);
    assert.equal(present.refusal, '');
    assert.equal(present.base, `${MODULE}/pipeline/releases/base1/l4`);
    assert.equal(present.root, present.base);
    const release = host.files[keyOf({
      project: PROJECT, level: 4, folder: `${MODULE}/pipeline/releases/base1/l4`, shortName: 'module', extension: '.defs.ts',
    })];
    release.status = 'deleted';
    const missing = await resolveBase(MODULE);
    assert.equal(missing.refusal, releaseMissingRefusal(MODULE, 'base1'));
    assert.equal(missing.base, '');
    await assert.rejects(runPlDiff(MODULE), new RegExp(releaseMissingRefusal(MODULE, 'base1').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.equal(host.files[keyOf({
      project: PROJECT, level: 4, folder: `${root}/pool/l2/web`, shortName: 'l4diff', extension: '.json',
    })], undefined);
  } finally {
    setModuleRoot(MODULE, null);
  }
});

void test('p4_13: a sealed revision is accepted without pipeline.json and records revision; one altered byte is refused', async () => {
  const files = loadFixtureFiles();
  const host = installHost();
  seedTree(host, MODULE, files);
  seedL5(host);
  const sealed = await (async () => {
    await prepareL4Change(PROJECT, MODULE);
    return sealL4Revision(PROJECT, MODULE, null);
  })();
  const root = `${MODULE}/pipeline/changes/${sealed.changeId}/revisions/${sealed.revisionId}/l4`;
  const pipelineKey = keyOf({
    project: PROJECT, level: 4, folder: `${root}/pipeline`, shortName: 'pipeline', extension: '.json',
  });
  const pipelineBefore = host.files[pipelineKey];
  assert.equal(pipelineBefore, undefined);
  const invocation = parsePlInvocation(`${MODULE} /candidate pipeline/changes/${sealed.changeId}/revisions/${sealed.revisionId}/l4`);
  try {
    setModuleRoot(MODULE, root);
    const facts = await gatherPlEntryFacts(MODULE);
    assert.equal(facts.pipelineStatus, '');
    assert.equal(plEntryRefusal(invocation, facts), '');
    assert.equal(facts.revision?.changeId, sealed.changeId);
    assert.equal(facts.revision?.revisionId, sealed.revisionId);
    assert.equal(facts.revision?.baseId, sealed.baseId);
    assert.equal(facts.revision?.manifestHash, await sha256Tobe(sealed.files));
    await writePlRevision(MODULE, facts.revision ?? null);
    const diff = await runPlDiff(MODULE);
    assert.equal(diff.base, `${MODULE}/pipeline/releases/${sealed.baseId}/l4`);
    assert.equal(diff.candidate, root);
    assert.deepEqual(diff.revision, facts.revision);
    const pipeline = JSON.parse(host.files[pipelineKey]?.content || 'null') as { revision: { revisionId: string } };
    assert.equal(pipeline.revision.revisionId, sealed.revisionId);
    for (const box of ['l1', 'l2'] as const) {
      const written = JSON.parse(host.files[keyOf({
        project: PROJECT, level: 4, folder: `${root}/pool/${box}/web`, shortName: 'l4diff', extension: '.json',
      })]?.content || 'null') as { revision: { revisionId: string }; base: string };
      assert.equal(written.revision.revisionId, sealed.revisionId);
      assert.equal(written.base, diff.base);
    }
    const rules = host.files[keyOf({
      project: PROJECT, level: 4, folder: root, shortName: 'rules', extension: '.defs.ts',
    })];
    assert.ok(rules);
    const beforeKeys = Object.keys(host.files).length;
    rules.content = `${rules.content.slice(0, -1)} `;
    const tampered = await gatherPlEntryFacts(MODULE);
    assert.equal(
      plEntryRefusal(invocation, tampered),
      revisionMissingRefusal(MODULE, sealed.changeId, sealed.revisionId),
    );
    await assert.rejects(
      runPlDiff(MODULE),
      new RegExp(revisionMissingRefusal(MODULE, sealed.changeId, sealed.revisionId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    );
    assert.equal(Object.keys(host.files).length, beforeKeys);
  } finally {
    setModuleRoot(MODULE, null);
  }
});
