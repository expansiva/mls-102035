/// <mls fileReference="_102035_/l2/newRelease/widgets/benchImports.test.ts" enhancement="_blank"/>

// No test in this project may import from a bancada (a generated client project, `mls-1020xx`).
//
// WHY THIS EXISTS. Until 2026-09-18 two tests here imported the real `compras` artifacts straight
// from `mls-102047/l4/` — `integrationModel.test.ts` and `workflowsModel.test.ts`. The bancada is
// regenerated whenever the l4 front delivers a new leva, so those imports made the certification of
// THIS project depend on the contents of another one. The damage was not theoretical: after the 12
// v4 modules landed on the bancada (ns5_59), `run-tests 102035 l2` went from one red to two, and the
// one red it already had was the same disease wearing a different name — a stale v2 expectation that
// had been read as "ambiental" for weeks. A red that moves when a different project changes teaches
// the reader to ignore reds.
//
// The rule that replaced them: a test that needs a real generated artifact carries a FROZEN COPY,
// byte for byte, under `fixtures/`. Then the assertion states what the model does with that shape,
// and regenerating the bancada cannot move this project's scoreboard.
//
// This guard checks the IMPORT, not the number. `102047` as a project id inside inline test data is
// fine and common — what is banned is reaching across the repo boundary to read another project's
// generated output.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/** This project's l2 — everything the agent ships. */
const L2 = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const SELF = fileURLToPath(import.meta.url);

/** An import specifier that leaves this project for a generated client project. */
const BENCH_IMPORT = /(?:import|require)[^\n]*['"][^'"\n]*(?:mls-1020\d\d|\/_1020\d\d_)[^'"\n]*['"]/g;

/** The libraries this project legitimately builds on. Everything else under mls-1020xx is a bancada. */
const ALLOWED = new Set(['102020', '102021', '102025', '102027', '102029', '102033', '102034', '102035', '102036']);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.test.ts') && full !== SELF) out.push(full);
  }
  return out;
}

void test('no test imports from a bancada — a frozen fixture carries the artifact instead', () => {
  const offenders: string[] = [];
  for (const file of walk(L2)) {
    const source = readFileSync(file, 'utf8');
    for (const hit of source.match(BENCH_IMPORT) || []) {
      const project = /1020\d\d/u.exec(hit)?.[0] || '';
      if (ALLOWED.has(project)) continue;
      offenders.push(`${relative(L2, file)}: ${hit.trim()}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `A test reads a generated client project. Freeze the artifact byte for byte under a \`fixtures/\`\n`
      + `folder next to the test and import that instead, so regenerating the bancada cannot move this\n`
      + `project's scoreboard (ns5_58):\n  ${offenders.join('\n  ')}`,
  );
});
