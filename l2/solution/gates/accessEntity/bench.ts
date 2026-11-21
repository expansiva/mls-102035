/// <mls fileReference="_102035_/l2/solution/gates/accessEntity/bench.ts" enhancement="_blank"/>
/**
 * Bench fora da suíte (l4_p4_140 s2b). Lê o L4 do 102047 e imprime quem lê entidade sem grant.
 * Uso: pnpm exec tsx l2/solution/gates/accessEntity/bench.ts   (cwd: mls-102035)
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkEntityGrants } from './contracts.js';
import type { EntityGrantRow, EntityGrantStepRow } from './contracts.js';

const here = dirname(fileURLToPath(import.meta.url));
const l4Root = join(here, '..', '..', '..', '..', '..', 'mls-102047', 'l4');

function objectLiteral(source: string): unknown {
  const eq = source.indexOf('= {');
  if (eq < 0) throw new Error('object literal not found');
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

function main(): void {
  const modules = readdirSync(l4Root, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name !== 'organization')
    .map(entry => entry.name).sort();
  for (const moduleName of modules) {
    const dir = join(l4Root, moduleName);
    const accessFile = join(dir, 'access.defs.ts');
    const journeysDir = join(dir, 'journeys');
    if (!existsSync(accessFile) || !existsSync(journeysDir)) { console.log(`${moduleName}\t(sem access ou journeys)`); continue; }
    const access = objectLiteral(readFileSync(accessFile, 'utf8')) as { grants: Array<{ grantId: string; actorRef: string; entityRefs: string[] }> };
    const grants: EntityGrantRow[] = access.grants.map(grant => ({ grantId: grant.grantId, actorId: grant.actorRef, entityRefs: grant.entityRefs }));
    const steps: EntityGrantStepRow[] = [];
    for (const name of readdirSync(journeysDir).filter(item => item.endsWith('.defs.ts') && item !== 'index.defs.ts')) {
      const journey = objectLiteral(readFileSync(join(journeysDir, name), 'utf8')) as {
        journeyId: string;
        business: { actorRef: string; steps: Array<{ stepId: string; kind: string; entity?: string }> };
      };
      for (const step of journey.business.steps) {
        steps.push({ journeyId: journey.journeyId, stepId: step.stepId, kind: step.kind, actorId: journey.business.actorRef, entityId: step.entity ?? '' });
      }
    }
    const issues = checkEntityGrants(steps, grants);
    console.log(`${moduleName}\t${issues.length} issue(s)`);
    for (const issue of issues) console.log(`   ${issue.actorId}\t${issue.entityId}\t${issue.message.slice(0, 120)}`);
  }
}

main();
