/// <mls fileReference="_102035_/l2/agentPlannerL4/helpers/plDiff.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { setModuleRoot } from '/_102035_/l2/solution/fs.js';
import {
  diffL4Snapshots,
  L4_DIFF_SCHEMA,
  parseDefsSource,
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
    const written = JSON.parse(l1?.content || 'null') as { items: unknown[] };
    assert.equal(written.items.length, 1);
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
    })]?.content || 'null') as { base: string; items: unknown[] };
    assert.equal(written.base, 'canonical');
    assert.equal(written.items.length, 1);
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
  } finally {
    setModuleRoot(MODULE, null);
  }
});
