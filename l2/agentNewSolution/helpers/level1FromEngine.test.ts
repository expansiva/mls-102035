/// <mls fileReference="_102035_/l2/agentNewSolution/helpers/level1FromEngine.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseNs4ClassicDefsSource } from '/_102035_/l2/agentNewSolution/helpers/ns4ClassicDefs.js';
import {
  buildNs4Level1Artifacts,
  NS4_LEVEL1_IDENTIFICATION_FIELD_IDS,
  parseEngineTypeUnion,
} from '/_102035_/l2/agentNewSolution/helpers/level1FromEngine.js';
import { ns4Level1Catalog } from '/_102035_/l2/agentNewSolution/helpers/level1Catalog.js';
import type { Ns4Level1EntityArtifact, Ns4Level1IndexArtifact } from '/_102035_/l2/agentNewSolution/helpers/organizationTypes.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MLS_BASE = path.resolve(HERE, '../../../..');
const ENGINE_ONTOLOGY = path.join(MLS_BASE, 'mls-102034/l1/mdm/defs/ontology.ts');
const ENGINE_MODULE = path.join(MLS_BASE, 'mls-102034/l1/mdm/module.ts');
const DEFS_DIR = path.join(MLS_BASE, 'mls-102035/l4/organization/ontology');

function engineSources(): { ontologySource: string; moduleSource: string } {
  return {
    ontologySource: readFileSync(ENGINE_ONTOLOGY, 'utf8'),
    moduleSource: readFileSync(ENGINE_MODULE, 'utf8'),
  };
}

test('level-1 defs match the engine subtype union and field catalogs', () => {
  const sources = engineSources();
  const expected = buildNs4Level1Artifacts(sources);
  const engineSubtypes = parseEngineTypeUnion(sources.ontologySource, 'MdmSubtype');
  assert.equal(engineSubtypes.length, 13);
  assert.deepEqual(expected.index.subtypes, engineSubtypes);

  const defFiles = readdirSync(DEFS_DIR).filter(name => name.endsWith('.defs.ts') && name !== 'index.defs.ts');
  assert.deepEqual(defFiles.map(name => name.replace(/\.defs\.ts$/, '')).sort(), [...engineSubtypes].sort());

  const index = parseNs4ClassicDefsSource<Ns4Level1IndexArtifact>(
    readFileSync(path.join(DEFS_DIR, 'index.defs.ts'), 'utf8'),
  );
  assert.ok(index);
  assert.deepEqual(index, expected.index);

  for (const subtype of engineSubtypes) {
    const written = parseNs4ClassicDefsSource<Ns4Level1EntityArtifact>(
      readFileSync(path.join(DEFS_DIR, `${subtype}.defs.ts`), 'utf8'),
    );
    const built = expected.entities.find(entity => entity.subtype === subtype);
    assert.ok(written, `missing defs for ${subtype}`);
    assert.ok(built);
    assert.deepEqual(written, built);
    assert.deepEqual(written.identification.map(field => field.fieldId), [...NS4_LEVEL1_IDENTIFICATION_FIELD_IDS]);
  }
});

test('level-1 catalog loader exposes every engine subtype', () => {
  const engineSubtypes = parseEngineTypeUnion(readFileSync(ENGINE_ONTOLOGY, 'utf8'), 'MdmSubtype');
  const catalog = ns4Level1Catalog();
  assert.deepEqual([...catalog.index.subtypes], engineSubtypes);
  assert.deepEqual(catalog.entities.map(entity => entity.subtype), engineSubtypes);
});
