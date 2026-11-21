/// <mls fileReference="_102035_/l2/solution/gates/ownEntityRead/bench.ts" enhancement="_blank"/>
/**
 * Bench fora da suíte (l4_p4_140 s3d). Lê o L4 do 102047 e imprime as leituras de tabela propria por chamada de fora.
 * Uso: pnpm exec tsx l2/solution/gates/ownEntityRead/bench.ts   (cwd: mls-102035)
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkOwnEntityReads } from './contracts.js';
import type { OwnEntityReadStepRow } from './contracts.js';

const here = dirname(fileURLToPath(import.meta.url));
const l4Root = process.argv[2] || join(here, '..', '..', '..', '..', '..', 'mls-102047', 'l4');

function objectLiteral(source: string): any {
  const eq = source.indexOf('= {');
  let depth = 0;
  const start = eq + 2;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return JSON.parse(source.slice(start, index + 1));
    }
  }
  throw new Error('object literal not closed');
}

const modules = readdirSync(l4Root, { withFileTypes: true }).filter(e => e.isDirectory() && e.name !== 'organization').map(e => e.name).sort();
for (const moduleName of modules) {
  const dir = join(l4Root, moduleName);
  if (!existsSync(join(dir, 'integration.defs.ts')) || !existsSync(join(dir, 'ontology'))) continue;
  const integration = objectLiteral(readFileSync(join(dir, 'integration.defs.ts'), 'utf8'));
  const entities = readdirSync(join(dir, 'ontology')).filter(n => n.endsWith('.defs.ts') && n !== 'index.defs.ts')
    .map(n => objectLiteral(readFileSync(join(dir, 'ontology', n), 'utf8')) as { entityId: string; kind: string; writer?: string });
  const steps: OwnEntityReadStepRow[] = [];
  const jdir = join(dir, 'journeys');
  for (const n of readdirSync(jdir).filter(x => x.endsWith('.defs.ts') && x !== 'index.defs.ts')) {
    const j = objectLiteral(readFileSync(join(jdir, n), 'utf8'));
    for (const s of j.business.steps) steps.push({ journeyId: j.journeyId, stepId: s.stepId, kind: s.kind, entityId: s.entity ?? '' });
  }
  const issues = checkOwnEntityReads(steps, entities, integration.connections ?? []);
  console.log(`${moduleName}\t${issues.length} issue(s)`);
  for (const i of issues) console.log(`   ${i.entityId}\t${i.stepRef}\t${i.path}`);
}
