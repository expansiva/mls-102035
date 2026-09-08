/// <mls fileReference="_102035_/l2/agentNewSolution/helpers/nodejsLevel1FromEngine.ts" enhancement="_blank"/>

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildNs4Level1Artifacts } from '/_102035_/l2/agentNewSolution/helpers/level1FromEngine.js';
import { renderNs4TypedDefsSource } from '/_102035_/l2/agentNewSolution/helpers/ns4TypedDefs.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MLS_BASE = path.resolve(HERE, '../../../..');

async function main(): Promise<void> {
  const ontologySource = await readFile(path.join(MLS_BASE, 'mls-102034/l1/mdm/defs/ontology.ts'), 'utf8');
  const moduleSource = await readFile(path.join(MLS_BASE, 'mls-102034/l1/mdm/module.ts'), 'utf8');
  const artifacts = buildNs4Level1Artifacts({ ontologySource, moduleSource });
  const outDir = path.join(MLS_BASE, 'mls-102035/l4/organization/ontology');
  await mkdir(outDir, { recursive: true });
  for (const entity of artifacts.entities) {
    const source = renderNs4TypedDefsSource(
      { project: 102035, level: 4, folder: 'organization/ontology', shortName: entity.subtype, extension: '.defs.ts' },
      `level1${entity.subtype}`,
      entity,
      'Ns4Level1EntityArtifact',
    );
    await writeFile(path.join(outDir, `${entity.subtype}.defs.ts`), source);
  }
  const indexSource = renderNs4TypedDefsSource(
    { project: 102035, level: 4, folder: 'organization/ontology', shortName: 'index', extension: '.defs.ts' },
    'organizationLevel1Index',
    artifacts.index,
    'Ns4Level1IndexArtifact',
  );
  await writeFile(path.join(outDir, 'index.defs.ts'), indexSource);
  process.stdout.write(`wrote ${artifacts.entities.length} level-1 defs + index\n`);
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
