/// <mls fileReference="_102035_/l2/solution/testing/agentPrivateImports.test.ts" enhancement="_blank"/>

// Code under `l2/<agent>/` is private to that agent. A path into it may appear only inside the agent.
// The search is the bare string, not an `from` regex: most measured hits were dynamic `import()`.
// The forbidden path is joined so this file does not itself contain the bare string it forbids.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/** This project's l2 — the scope named `mls-102035/l2`. */
const L2 = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

/** `{ string proibida, onde vale, quem pode }`. Later tasks append rows. */
const RULES: { forbidden: string; scope: string; allowed: string }[] = [
  { forbidden: ['/_102035_/l2/', 'ensaio/'].join(''), scope: 'mls-102035/l2', allowed: 'l2/ensaio/' },
  {
    forbidden: ['/_102035_/l2/', 'agentNewSolution5/'].join(''),
    scope: 'mls-102035/l2',
    allowed: 'l2/agentNewSolution5/',
  },
  {
    forbidden: ['list', 'Folder'].join(''),
    scope: 'newRelease/,agentReviewSolution/,agentPlannerL4/,solution/',
    allowed: '*.test.ts',
  },
  {
    forbidden: ['/_102035_/l2/', 'newRelease/'].join(''),
    scope: 'agent',
    allowed: '(nenhum)',
  },
  {
    forbidden: ['/_102035_/l2/', 'newRelease/'].join(''),
    scope: 'solution/',
    allowed: '(nenhum)',
  },
  {
    forbidden: ['project: ', '102034'].join(''),
    scope: 'mls-102035/l2',
    allowed: '*.test.ts,fixtures/',
  },
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.ts')) out.push(full);
  }
  return out;
}

void test('agent-private paths stay inside the agent that owns them', () => {
  const offenders: string[] = [];
  for (const rule of RULES) {
    const scopes = rule.scope === 'mls-102035/l2' ? [''] : rule.scope.split(',');
    for (const file of walk(L2)) {
      const rel = relative(L2, file).split('\\').join('/');
      if (!scopes.some(prefix => rel.startsWith(prefix))) continue;
      const allowed = rule.allowed.split(',').some(spec => {
        if (spec.startsWith('*')) return rel.endsWith(spec.slice(1));
        const specRel = spec.replace(/^l2\//, '');
        return rel === specRel.slice(0, -1) || rel.startsWith(specRel)
          || (spec === 'fixtures/' && rel.includes('/fixtures/'));
      });
      if (allowed) continue;
      const source = readFileSync(file, 'utf8');
      let from = 0;
      while (from < source.length) {
        const at = source.indexOf(rule.forbidden, from);
        if (at < 0) break;
        const line = source.slice(0, at).split('\n').length;
        offenders.push(`${rel}:${line}`);
        from = at + rule.forbidden.length;
      }
    }
  }
  assert.deepEqual(offenders, [], offenders.join('\n'));
});

function privateReplayImports(source: string): string[] {
  const prefix = ['/_102035_/l2/', 'agent'].join('');
  return [...source.matchAll(/(?:from\s*|import\s*\(\s*|require\s*\(\s*|import\s*)['"]([^'"\n]+)['"]/gu)]
    .map(match => match[1]).filter(path => {
      if (!path.startsWith(prefix)) return false;
      const [agent, ...rest] = path.slice('/_102035_/l2/'.length).split('/');
      return rest.join('/') !== `${agent}.js`;
    });
}

test('replay imports only the public agent entry', () => {
  const offenders = walk(join(L2, 'ensaio')).flatMap(file =>
    privateReplayImports(readFileSync(file, 'utf8')).map(path => `${relative(L2, file)}: ${path}`));
  assert.deepEqual(offenders, []);
});

test('replay guard detects private steps and accepts the public entry', () => {
  const prefix = ['/_102035_/l2/', 'agentReviewSolution/'].join('');
  assert.deepEqual(privateReplayImports(`import { hook } from '${prefix}steps/review20/agentReview20.js';`),
    [`${prefix}steps/review20/agentReview20.js`]);
  assert.deepEqual(privateReplayImports(`import * as entry from '${prefix}agentReviewSolution.js';`), []);
});
