/// <mls fileReference="_102035_/l2/agentExportSolution/packSolution.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildNs4RulesArtifact } from '/_102035_/l2/agentNewSolution/steps/e5/contracts.js';
import {
  isPipelinePath,
  packSolution,
  packSolutionZip,
  parseArtifact,
  parseExportInvocation,
  recomputeArtifactHashes,
  restoreL4Header,
  stripRecomputableHashes,
} from '/_102035_/l2/agentExportSolution/helpers/packSolution.js';
import { decodeStoredZip } from '/_102035_/l2/agentExportSolution/helpers/storedZip.js';
import { extractI18n, injectI18n, textPathsForArtifact } from '/_102035_/l2/agentNewSolution/helpers/ns4TextPaths.js';

const FIXTURE = fileURLToPath(new URL('./fixtures/ordenServicioEs/', import.meta.url));

function loadFixture(): Array<{ relativePath: string; content: string }> {
  const files: Array<{ relativePath: string; content: string }> = [];
  function walk(dir: string, prefix: string) {
    for (const name of readdirSync(dir).sort()) {
      const relative = prefix ? `${prefix}/${name}` : name;
      const abs = join(dir, name);
      if (statSync(abs).isDirectory()) walk(abs, relative);
      else files.push({ relativePath: relative, content: readFileSync(abs, 'utf8') });
    }
  }
  walk(FIXTURE, '');
  return files;
}

test('parseExportInvocation reads module names and ignores flags', () => {
  assert.deepEqual(parseExportInvocation('ordenServicioEs locacaoEquipamentos'), ['ordenServicioEs', 'locacaoEquipamentos']);
  assert.deepEqual(parseExportInvocation('@@exportSolution ordenServicioEs'), ['ordenServicioEs']);
});

test('pack omits pipeline, strips hashes, normalizes l4 headers and extracts i18n', () => {
  const files = loadFixture();
  assert.ok(files.some(file => isPipelinePath(file.relativePath)));
  const packed = packSolution({
    modules: [{
      moduleName: 'ordenServicioEs',
      sourceLanguage: 'es',
      sourcePrompt: 'crear el módulo ordenServicio, en español.',
      files,
    }],
    sourceProjectId: 102035,
    level1SchemaVersion: 'ns4-level1-v1',
    level1Roles: [{ mdmSubtype: 'Person', role: 'ordenServicioEs.Cliente', namespace: 'ordenServicioEs' }],
    actors: [{ moduleName: 'ordenServicioEs', actorId: 'cliente', kind: 'external' }],
    platformCommit: 'test',
    catalogDescription: 'Taller de electrónica para recepción y presupuesto.',
  });
  assert.equal(packed.files.some(file => file.path.includes('/pipeline/')), false);
  assert.ok(packed.files.some(file => file.path === 'solution.json'));
  assert.ok(packed.files.some(file => file.path === 'i18n/ordenServicioEs/es.json'));
  const rules = packed.files.find(file => file.path.endsWith('/rules/rules.defs.ts'));
  assert.ok(rules && typeof rules.content === 'string');
  assert.match(rules.content, /fileReference="_\{\s*project\s*\}_\/l4\//);
  assert.equal(rules.content.includes('_102035_/l4/'), false);
  assert.match(rules.content, /\/_102035_\/l2\/agentNewSolution\/types\.js/);
  const artifact = parseArtifact(rules.content);
  assert.ok(artifact);
  assert.equal('rulesHash' in artifact, false);
  const i18n = packed.i18n.ordenServicioEs.es['rules/rules.defs.ts'];
  assert.equal(i18n['rules[0].description']?.includes('órdenes') || i18n['rules[0].description']?.includes('piezas'), true);
  const zip = packSolutionZip(packed);
  const unzipped = decodeStoredZip(zip);
  assert.equal(unzipped.some(entry => entry.path.includes('/pipeline/')), false);
  assert.ok(unzipped.some(entry => entry.path === 'solution.json'));
});

test('reinject i18n and recompute hashes restores the original artifact JSON minus pipeline', async () => {
  const files = loadFixture().filter(file => !isPipelinePath(file.relativePath) && file.relativePath.endsWith('.defs.ts'));
  const packed = packSolution({
    modules: [{ moduleName: 'ordenServicioEs', sourceLanguage: 'es', sourcePrompt: 'crear', files: loadFixture() }],
    sourceProjectId: 102035,
    level1SchemaVersion: 'ns4-level1-v1',
    level1Roles: [],
    actors: [],
    platformCommit: 'test',
  });
  const i18nByFile = packed.i18n.ordenServicioEs.es;
  for (const file of files) {
    const original = parseArtifact(file.content);
    if (!original) continue;
    const packedFile = packed.files.find(item => item.path === `l4/ordenServicioEs/${file.relativePath}`);
    assert.ok(packedFile && typeof packedFile.content === 'string', file.relativePath);
    const exported = parseArtifact(packedFile.content);
    assert.ok(exported, file.relativePath);
    const restoredHeader = restoreL4Header(packedFile.content, 102035);
    assert.match(restoredHeader, /fileReference="_102035_\/l4\//);
    const fileI18n = i18nByFile[file.relativePath] || {};
    const injected = injectI18n(exported, fileI18n);
    const paths = textPathsForArtifact(file.relativePath, original);
    const originalText = extractI18n(original, paths);
    const injectedText = extractI18n(injected, paths);
    for (const [path, value] of Object.entries(originalText)) {
      assert.equal(injectedText[path], value, `${file.relativePath}:${path}`);
    }
    assert.deepEqual(stripRecomputableHashes(injected), stripRecomputableHashes(exported));
    assert.deepEqual(stripRecomputableHashes(original), stripRecomputableHashes(exported));
  }
  const rules = await buildNs4RulesArtifact({
    planId: 'e5-rules-review',
    moduleName: 'ordenServicioEs',
    userLanguage: 'es',
    title: 'Reglas',
    reviewRound: 1,
    rules: [{ id: 'clienteSoloConsultaSusOrdenes', description: 'El cliente ve sólo sus propias órdenes.' }],
    changeSummary: [],
  }, 'auto', '2026-09-09T00:00:00.000Z');
  const stripped = stripRecomputableHashes(rules);
  const recomputed = await recomputeArtifactHashes(stripped as Record<string, unknown>);
  assert.equal(recomputed.rulesHash, rules.rulesHash);
});
