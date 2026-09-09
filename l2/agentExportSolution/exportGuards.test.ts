/// <mls fileReference="_102035_/l2/agentExportSolution/exportGuards.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(HERE, '../..');
const ENTRY = path.join(HERE, 'agentExportSolution.ts');

const IMPORT_FROM = /\b(?:import|export)\s+(type\s+)?(?:([\s\S]*?)\s+from\s+)?['"]([^'"]+)['"]/g;
const FORBIDDEN_GLOBALS = /\b(?:window|document|indexedDB)\b|\bmls\.editor\b/g;
const ACCENT = /[À-ÿ]/;

const TOUCHED = [
  'agentExportSolution.ts',
  'promptCatalog.md',
  'docs/flow.json',
  'readme.md',
  'helpers/packSolution.ts',
  'helpers/storedZip.ts',
  'textPathsCoverage.test.ts',
  'packSolution.test.ts',
  'exportGuards.test.ts',
];

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function isTypeOnlyClause(clause: string | undefined, typeKeyword: string | undefined): boolean {
  if (typeKeyword) return true;
  if (!clause) return false;
  const trimmed = clause.trim();
  if (trimmed.startsWith('type ') || trimmed.startsWith('type\t')) return true;
  const inner = trimmed.match(/^\{([\s\S]*)\}$/);
  if (!inner) return false;
  const specs = inner[1].split(',').map(part => part.trim()).filter(Boolean);
  return specs.length > 0 && specs.every(spec => /^type\s/.test(spec));
}

function staticImportSpecifiers(source: string): string[] {
  const text = stripComments(source);
  const specs: string[] = [];
  IMPORT_FROM.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = IMPORT_FROM.exec(text))) {
    if (isTypeOnlyClause(match[2], match[1])) continue;
    specs.push(match[3]);
  }
  return specs;
}

function forbiddenImportReason(spec: string): string | null {
  if (/(?:^|\/)monaco(?:-editor)?(?:\/|$)/.test(spec)) return `static import of monaco (${spec})`;
  if (spec === 'lit' || spec.startsWith('lit/')) return `static import of lit (${spec})`;
  if (/(?:^|\/)widgets\//.test(spec)) return `static import of widgets (${spec})`;
  if (spec.includes('collabMessagesHelper')) return `static import of collabMessagesHelper (${spec})`;
  return null;
}

function resolveInProject(fromFile: string, spec: string): string | null {
  let candidate: string | null = null;
  if (spec.startsWith('/_102035_/')) {
    candidate = path.join(PROJECT_ROOT, spec.replace(/^\/_102035_\//, '').replace(/\.js$/, '.ts'));
  } else if (spec.startsWith('.')) {
    candidate = path.resolve(path.dirname(fromFile), spec.replace(/\.js$/, '.ts'));
  }
  if (!candidate || !existsSync(candidate)) return null;
  const rel = path.relative(PROJECT_ROOT, candidate);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return candidate;
}

test('createAgent static graph has no monaco/lit/widgets/DOM host deps', () => {
  assert.equal(existsSync(ENTRY), true);
  const entrySource = readFileSync(ENTRY, 'utf8');
  assert.match(entrySource, /export function createAgent\s*\(/);
  const queue = [ENTRY];
  const seen = new Set<string>();
  const offences: string[] = [];
  while (queue.length) {
    const file = queue.pop();
    if (!file || seen.has(file)) continue;
    seen.add(file);
    const source = readFileSync(file, 'utf8');
    const stripped = stripComments(source);
    if (FORBIDDEN_GLOBALS.test(stripped) && !file.includes('exportGuards.test.ts')) {
      offences.push(`${path.relative(HERE, file)}: host global`);
    }
    for (const spec of staticImportSpecifiers(source)) {
      const reason = forbiddenImportReason(spec);
      if (reason) offences.push(`${path.relative(HERE, file)}: ${reason}`);
      const next = resolveInProject(file, spec);
      if (next) queue.push(next);
    }
  }
  assert.deepEqual(offences, []);
});

test('n14 touched export files stay English in comments and identifiers', () => {
  for (const relative of TOUCHED) {
    const abs = path.join(HERE, relative);
    if (!existsSync(abs)) continue;
    const source = readFileSync(abs, 'utf8');
    assert.doesNotMatch(source, /portuguese\s*\?/, relative);
    for (const line of source.split('\n')) {
      const trimmed = line.trim();
      const isComment = trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*') || trimmed.startsWith('<!--');
      if (!isComment) continue;
      assert.doesNotMatch(line, ACCENT, `${relative}: ${trimmed}`);
    }
    const stripped = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/`(?:\\.|[^`])*`/g, '')
      .replace(/'(?:\\.|[^'\\])*'/g, '')
      .replace(/"(?:\\.|[^"\\])*"/g, '');
    assert.doesNotMatch(stripped, ACCENT, relative);
  }
});

test('catalog prompt declares modelType general', () => {
  const prompt = readFileSync(path.join(HERE, 'promptCatalog.md'), 'utf8');
  assert.match(prompt, /<!--\s*modelType:\s*general\s*-->/);
  assert.doesNotMatch(prompt, /\/todo\//);
});
