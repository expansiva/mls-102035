/// <mls fileReference="_102035_/l2/newRelease/tobeSiblingSystems.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { extractNs4ClassicJsonObject } from '/_102035_/l2/solution/helpers/ns4ClassicDefs.js';
import { readNs5Overlay } from './tobe.js';

const project = 102047;
const fixtureRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/siblingSystemsCandidate');

function installFrozen(registrySource?: string): void {
  const files: Record<string, unknown> = {};
  const keyOf = (info: { project: number; level: number; folder?: string; shortName: string; extension: string }) =>
    `${info.project}:${info.level}:${info.folder || ''}:${info.shortName}${info.extension}`;
  const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
  for (const full of walk(fixtureRoot)) {
    const rel = path.relative(fixtureRoot, full).split(path.sep).join('/');
    const match = /^l4\/(.+)\/([^/]+)\.defs\.ts$/u.exec(rel);
    if (!match) continue;
    const info = { project, level: 4, folder: match[1], shortName: match[2], extension: '.defs.ts' };
    const content = rel === 'l4/organization/registry.defs.ts' && registrySource !== undefined
      ? registrySource
      : fs.readFileSync(full, 'utf8');
    files[keyOf(info)] = {
      ...info,
      status: 'unchanged',
      versionRef: '1',
      getContent: async () => content,
      getValueInfo: async () => ({ content }),
    };
  }
  (globalThis as { mls: unknown }).mls = {
    actualProject: project,
    stor: { files, getKeyToFile: keyOf },
  };
}

function registryWithoutRepoHost(): string {
  const source = fs.readFileSync(path.join(fixtureRoot, 'l4/organization/registry.defs.ts'), 'utf8');
  const json = extractNs4ClassicJsonObject(source);
  if (!json) throw new Error('Frozen registry has no JSON object.');
  const artifact = JSON.parse(json) as { modules: Array<{ moduleName: string }> };
  artifact.modules = artifact.modules.filter(module => module.moduleName !== 'repoHost');
  return `export const registry = ${JSON.stringify(artifact)} as const;\n`;
}

test('conteudo candidate accepts ContentFile on the system repoHost declares', async () => {
  installFrozen();
  const overlay = await readNs5Overlay(project, 'conteudo');
  const codes = overlay.validation.issues.map(issue => issue.code);
  assert.equal(codes.includes('NS5_INTEGRATION_ENTITY_SYSTEM_MISSING'), false, codes.join(','));
});

test('conteudo candidate reports the missing system when repoHost is not in the registry', async () => {
  installFrozen(registryWithoutRepoHost());
  const overlay = await readNs5Overlay(project, 'conteudo');
  assert.equal(overlay.validation.issues.some(issue => issue.code === 'NS5_INTEGRATION_ENTITY_SYSTEM_MISSING'), true);
});
