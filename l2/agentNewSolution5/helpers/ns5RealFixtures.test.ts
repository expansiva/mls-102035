/// <mls fileReference="_102035_/l2/agentNewSolution5/helpers/ns5RealFixtures.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { extractNs4ClassicJsonObject } from '/_102035_/l2/agentNewSolution/helpers/ns4ClassicDefs.js';
import type { Ns5OracleSources } from '/_102035_/l2/agentNewSolution5/steps/finalize80/contracts.js';
import type {
  Ns5AccessArtifact,
  Ns5IntegrationArtifact,
  Ns5JourneyArtifact,
  Ns5JourneyIndexArtifact,
  Ns5ModuleActor,
  Ns5ModuleArtifact,
  Ns5OntologyEntityArtifact,
  Ns5OntologyIndexArtifact,
  Ns5RulesArtifact,
  Ns5WorkflowsArtifact,
} from '/_102035_/l2/solution/types.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const NS5_REAL_MODULES = ['comandaRestaurante5', 'ordenServicio5'] as const;
export type Ns5RealModule = typeof NS5_REAL_MODULES[number];

/** 12 modules of the ns5_26 leva, in dispatch order (academia last: already on the bancada). */
export const NS5_LEVA_MODULES = [
  'comandaRestaurante',
  'ordenServicio',
  'financeiro',
  'controleEstoque',
  'compras',
  'agendaClinica',
  'reembolsoDespesas',
  'inscricaoEvento',
  'locacaoEquipamentos',
  'hiringPipeline',
  'manutencaoFrota',
  'mensalidadesAcademia',
] as const;
export type Ns5LevaModule = typeof NS5_LEVA_MODULES[number];

const REPLAY_PACK = [
  ['steps/module10/fixtures', '-draft.json'],
  ['steps/module10/fixtures', '-module.defs.ts'],
  ['steps/journeys20/fixtures', '-draft.json'],
  ['steps/ontology30/fixtures', '-plan-draft.json'],
  ['steps/ontology30/fixtures', '-bindings-draft.json'],
  ['steps/rules40/fixtures', '-draft.json'],
  ['steps/workflows50/fixtures', '-draft.json'],
  ['steps/access60/fixtures', '-draft.json'],
  ['steps/integration70/fixtures', '-draft.json'],
  ['steps/finalize80/fixtures', '-finalize-report.json'],
] as const;

export function hasNs5ReplayFixtures(moduleName: string): boolean {
  return REPLAY_PACK.every(([folder, suffix]) => existsSync(ns5FixturePath(folder, `${moduleName}${suffix}`)));
}

export function ns5ReplayModules(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const moduleName of [...NS5_REAL_MODULES, ...NS5_LEVA_MODULES]) {
    if (seen.has(moduleName) || !hasNs5ReplayFixtures(moduleName)) continue;
    seen.add(moduleName);
    out.push(moduleName);
  }
  return out;
}

export function ns5FixtureRoot(): string {
  return ROOT;
}

export function ns5FixturePath(...parts: string[]): string {
  return path.join(ROOT, ...parts);
}

export function loadNs5FixtureJson<T>(...parts: string[]): T {
  return JSON.parse(readFileSync(ns5FixturePath(...parts), 'utf8')) as T;
}

export function loadNs5FixtureText(...parts: string[]): string {
  return readFileSync(ns5FixturePath(...parts), 'utf8');
}

export function loadNs5Defs<T>(...parts: string[]): T {
  const source = loadNs5FixtureText(...parts);
  const json = extractNs4ClassicJsonObject(source);
  if (!json) throw new Error(`[ns5RealFixtures] no JSON object in ${parts.join('/')}`);
  return JSON.parse(json) as T;
}

export function listNs5DefsFiles(step: string, moduleName: string): string[] {
  const folder = ns5FixturePath('steps', step, 'fixtures', moduleName);
  return readdirSync(folder).filter((name: string) => name.endsWith('.defs.ts')).sort();
}

export function loadNs5Module(moduleName: string): Ns5ModuleArtifact {
  return loadNs5Defs<Ns5ModuleArtifact>('steps/module10/fixtures', `${moduleName}-module.defs.ts`);
}

/** Actors born by module10 (pipeline state). Fixtures keep them on the module10 draft. */
export function loadNs5Actors(moduleName: string): Ns5ModuleActor[] {
  return loadNs5FixtureJson<{ actors: Ns5ModuleActor[] }>('steps/module10/fixtures', `${moduleName}-draft.json`).actors;
}

export function loadNs5Journeys(moduleName: string): Ns5JourneyArtifact[] {
  return listNs5DefsFiles('journeys20', moduleName)
    .filter((name: string) => name !== 'index.defs.ts')
    .map((name: string) => loadNs5Defs<Ns5JourneyArtifact>('steps/journeys20/fixtures', moduleName, name));
}

export function loadNs5JourneyIndex(moduleName: string): Ns5JourneyIndexArtifact {
  return loadNs5Defs<Ns5JourneyIndexArtifact>('steps/journeys20/fixtures', moduleName, 'index.defs.ts');
}

export function loadNs5Entities(moduleName: string): Ns5OntologyEntityArtifact[] {
  const index = loadNs5OntologyIndex(moduleName);
  return index.entities.map(entityId =>
    loadNs5Defs<Ns5OntologyEntityArtifact>('steps/ontology30/fixtures', moduleName, `${entityId}.defs.ts`),
  );
}

export function loadNs5OntologyIndex(moduleName: string): Ns5OntologyIndexArtifact {
  return loadNs5Defs<Ns5OntologyIndexArtifact>('steps/ontology30/fixtures', moduleName, 'index.defs.ts');
}

export function loadNs5Rules(moduleName: string): Ns5RulesArtifact {
  return loadNs5Defs<Ns5RulesArtifact>('steps/rules40/fixtures', `${moduleName}-rules.defs.ts`);
}

export function loadNs5Workflows(moduleName: string): Ns5WorkflowsArtifact {
  return loadNs5Defs<Ns5WorkflowsArtifact>('steps/workflows50/fixtures', `${moduleName}-workflows.defs.ts`);
}

export function loadNs5Access(moduleName: string): Ns5AccessArtifact {
  return loadNs5Defs<Ns5AccessArtifact>('steps/access60/fixtures', `${moduleName}-access.defs.ts`);
}

export function loadNs5Integration(moduleName: string): Ns5IntegrationArtifact {
  return loadNs5Defs<Ns5IntegrationArtifact>('steps/integration70/fixtures', `${moduleName}-integration.defs.ts`);
}

export function loadNs5OracleSources(moduleName: string): Ns5OracleSources {
  const journeyIndex = loadNs5JourneyIndex(moduleName);
  const journeys = loadNs5Journeys(moduleName);
  const byId = new Map(journeys.map(journey => [journey.journeyId, journey]));
  return {
    module: loadNs5Module(moduleName),
    journeys: journeyIndex.journeys.map(entry => {
      const journey = byId.get(entry.journeyId);
      if (!journey) throw new Error(`[ns5RealFixtures] missing journey ${entry.journeyId}`);
      return journey;
    }),
    journeyIndex,
    entities: loadNs5Entities(moduleName),
    ontologyIndex: loadNs5OntologyIndex(moduleName),
    rules: loadNs5Rules(moduleName),
    workflows: loadNs5Workflows(moduleName),
    access: loadNs5Access(moduleName),
    integration: loadNs5Integration(moduleName),
  };
}

export function stripNs5Hashes<T>(value: T): T {
  if (Array.isArray(value)) return value.map(item => stripNs5Hashes(item)) as T;
  if (value && typeof value === 'object') {
    const next: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (/Hash$/.test(key)) continue;
      next[key] = stripNs5Hashes(nested);
    }
    return next as T;
  }
  return value;
}

export function stripNs5HashSource(source: string): string {
  return source.replace(/"([^"]*Hash)"\s*:\s*"sha256:[0-9a-f]+"/g, '"$1": "<hash>"');
}

void test('real fixture modules are the two complete NS5 runs', () => {
  assert.deepEqual([...NS5_REAL_MODULES], ['comandaRestaurante5', 'ordenServicio5']);
  assert.equal(loadNs5Actors('comandaRestaurante5').length, 2);
  assert.equal(loadNs5Actors('ordenServicio5').length, 3);
  assert.equal('actors' in loadNs5Module('comandaRestaurante5'), false);
  assert.equal(loadNs5Access('comandaRestaurante5').actors.length, 2);
});

void test('leva replay set is the 12 ns5_26 modules; byte copies land after the final leva', () => {
  assert.equal(NS5_LEVA_MODULES.length, 12);
  assert.deepEqual([...NS5_LEVA_MODULES], [
    'comandaRestaurante',
    'ordenServicio',
    'financeiro',
    'controleEstoque',
    'compras',
    'agendaClinica',
    'reembolsoDespesas',
    'inscricaoEvento',
    'locacaoEquipamentos',
    'hiringPipeline',
    'manutencaoFrota',
    'mensalidadesAcademia',
  ]);
  assert.deepEqual(ns5ReplayModules(), [...NS5_REAL_MODULES]);
});
