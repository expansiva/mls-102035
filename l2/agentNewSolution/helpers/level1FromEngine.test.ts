/// <mls fileReference="_102035_/l2/agentNewSolution/helpers/level1FromEngine.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseEngineTypeUnion } from '/_102034_/l1/mdm/defs/level1FromEngine.js';
import { ns4Level1Catalog } from '/_102035_/l2/agentNewSolution/helpers/level1Catalog.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENGINE_ONTOLOGY = path.resolve(HERE, '../../../../mls-102034/l1/mdm/defs/ontology.ts');

test('level-1 catalog loader reads every engine subtype from 102034', () => {
  const engineSubtypes = parseEngineTypeUnion(readFileSync(ENGINE_ONTOLOGY, 'utf8'), 'MdmSubtype');
  const catalog = ns4Level1Catalog();
  assert.deepEqual([...catalog.index.subtypes], engineSubtypes);
  assert.deepEqual(catalog.entities.map(entity => entity.subtype), engineSubtypes);
  assert.equal(catalog.platform.catalogVersion, '2026-09-11-mdm-platform-v1');
  assert.ok(catalog.platform.services.some(service => service.service === 'attachments'));
  const person = catalog.entities.find(entity => entity.subtype === 'Person');
  const guardian = person?.allowedRelationships.find(item => item.type === 'GuardianOf');
  assert.equal(guardian?.as, 'both');
  assert.deepEqual(guardian?.otherSubtypes, ['Person', 'Animal']);
});
