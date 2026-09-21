/// <mls fileReference="_102035_/l2/agentPlannerL4/stepIntents.test.ts" enhancement="_blank"/>

// A step never emits add-message-ai. That intent creates the task and is only legal in
// beforePromptImplicit; after the task exists the platform returns HTTP 409.
// Visible text goes through updateStatus(..., traceMsg) and an AIResultStep via addPlStep
// (the doneAnchor pattern). Tests are excluded so they can name the forbidden intent.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const STEPS = join(dirname(fileURLToPath(import.meta.url)), 'steps');
const FORBIDDEN = /['"]add-message-ai['"]|plStatusMessage/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.ts') && !full.endsWith('.test.ts')) out.push(full);
  }
  return out;
}

void test('a planner L4 step never emits add-message-ai — use updateStatus or an AIResultStep', () => {
  const offenders: string[] = [];
  for (const file of walk(STEPS)) {
    const source = readFileSync(file, 'utf8');
    if (FORBIDDEN.test(source)) offenders.push(relative(STEPS, file));
  }
  assert.deepEqual(
    offenders,
    [],
    `A step emitted add-message-ai (or called plStatusMessage). That intent is only legal in beforePromptImplicit; after the task exists the platform returns HTTP 409.\n`
      + `Use updateStatus(..., traceMsg) and an AIResultStep via addPlStep (the doneAnchor pattern).\n  ${offenders.join('\n  ')}`,
  );
});


