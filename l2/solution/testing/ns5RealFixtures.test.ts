/// <mls fileReference="_102035_/l2/solution/testing/ns5RealFixtures.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import {
  ns5OntologyEntityIds,
  ns5OntologyEntityViews,
  type Ns5OntologyAnyIndex,
} from '/_102035_/l2/solution/ontologyView.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { extractNs4ClassicJsonObject } from '/_102035_/l2/solution/helpers/ns4ClassicDefs.js';
import { NS5_RULES_SCHEMA_VERSION_V2 } from '/_102035_/l2/solution/types.js';
import type { Ns5OracleSources } from '/_102035_/l2/solution/gates/finalize80/contracts.js';
import type {
  Ns5AccessArtifact,
  Ns5IntegrationArtifact,
  Ns5JourneyArtifact,
  Ns5JourneyIndexArtifact,
  Ns5ModuleActor,
  Ns5ModuleArtifact,
  Ns5OntologyEntityArtifact,
  Ns5OntologyIndexArtifact,
  Ns5RulesAny,
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

/**
 * `financeiro` is the only leva-final module without a replay pack: leva 1+2 both
 * failed on content (`journeys20` collapsed to 1 journey). Not a form defect.
 */
export const NS5_LEVA_REPLAY_EXCLUDED: Readonly<Record<string, string>> = {
  financeiro: 'content: journeys20 collapsed to 1 journey (leva final 1+2); ns5_pendencias_fase2 P3',
};

const REPLAY_PACK = [
  ['fixtures/module10', '-draft.json'],
  ['fixtures/module10', '-module.defs.ts'],
  ['fixtures/journeys20', '-draft.json'],
  ['fixtures/ontology30', '-plan-draft.json'],
  ['fixtures/ontology30', '-bindings-draft.json'],
  ['fixtures/rules40', '-draft.json'],
  ['fixtures/workflows50', '-draft.json'],
  ['fixtures/access60', '-draft.json'],
  ['fixtures/integration70', '-draft.json'],
  ['fixtures/finalize80', '-finalize-report.json'],
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
  const folder = ns5FixturePath('fixtures', step, moduleName);
  return readdirSync(folder).filter((name: string) => name.endsWith('.defs.ts')).sort();
}

export function loadNs5Module(moduleName: string): Ns5ModuleArtifact {
  return loadNs5Defs<Ns5ModuleArtifact>('fixtures/module10', `${moduleName}-module.defs.ts`);
}

/** Actors born by module10 (pipeline state). Fixtures keep them on the module10 draft. */
export function loadNs5Actors(moduleName: string): Ns5ModuleActor[] {
  return loadNs5FixtureJson<{ actors: Ns5ModuleActor[] }>('fixtures/module10', `${moduleName}-draft.json`).actors;
}

export function loadNs5Journeys(moduleName: string): Ns5JourneyArtifact[] {
  return listNs5DefsFiles('journeys20', moduleName)
    .filter((name: string) => name !== 'index.defs.ts')
    .map((name: string) => loadNs5Defs<Ns5JourneyArtifact>('fixtures/journeys20', moduleName, name));
}

export function loadNs5JourneyIndex(moduleName: string): Ns5JourneyIndexArtifact {
  return loadNs5Defs<Ns5JourneyIndexArtifact>('fixtures/journeys20', moduleName, 'index.defs.ts');
}

/**
 * ns5_43 T7. The eleven recorded modules stay v2 until ns5_44 regenerates them, so the replay must read
 * BOTH forms rather than assume one: the entity ids come from `ns5OntologyEntityIds`, which answers for
 * a v2 `string[]` and for a v3 `[{ entityId, … }]` alike.
 */
export function loadNs5Entities(moduleName: string): Ns5OntologyAnyEntity[] {
  const index = loadNs5OntologyIndex(moduleName);
  return ns5OntologyEntityIds(index).map(entityId =>
    loadNs5Defs<Ns5OntologyAnyEntity>('fixtures/ontology30', moduleName, `${entityId}.defs.ts`),
  );
}

export function loadNs5OntologyIndex(moduleName: string): Ns5OntologyAnyIndex {
  return loadNs5Defs<Ns5OntologyAnyIndex>('fixtures/ontology30', moduleName, 'index.defs.ts');
}

/** The thirteen recorded catalogs are v1 arrays; `Ns5OracleSources.rules` takes either form (ns5_45). */
export function loadNs5Rules(moduleName: string): Ns5RulesArtifact {
  return loadNs5Defs<Ns5RulesArtifact>('fixtures/rules40', `${moduleName}-rules.defs.ts`);
}

/** The same catalog in the v2 map form, for a reader that must answer for both. */
export function asNs5RulesV2(artifact: Ns5RulesArtifact): Ns5RulesAny {
  const rules: Record<string, string> = {};
  for (const rule of artifact.rules) rules[rule.ruleId] = rule.description;
  return { schemaVersion: NS5_RULES_SCHEMA_VERSION_V2, moduleName: artifact.moduleName, rules };
}

export function loadNs5Workflows(moduleName: string): Ns5WorkflowsArtifact {
  return loadNs5Defs<Ns5WorkflowsArtifact>('fixtures/workflows50', `${moduleName}-workflows.defs.ts`);
}

export function loadNs5Access(moduleName: string): Ns5AccessArtifact {
  return loadNs5Defs<Ns5AccessArtifact>('fixtures/access60', `${moduleName}-access.defs.ts`);
}

export function loadNs5Integration(moduleName: string): Ns5IntegrationArtifact {
  return loadNs5Defs<Ns5IntegrationArtifact>('fixtures/integration70', `${moduleName}-integration.defs.ts`);
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
    entities: ns5OntologyEntityViews(loadNs5Entities(moduleName)),
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

void test('leva replay set is the 11 complete modules; financeiro stays out (content)', () => {
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
  assert.equal(hasNs5ReplayFixtures('financeiro'), false);
  assert.match(NS5_LEVA_REPLAY_EXCLUDED.financeiro, /journeys20 collapsed to 1 journey/);
  const expected = [
    ...NS5_REAL_MODULES,
    ...NS5_LEVA_MODULES.filter(name => name !== 'financeiro'),
  ];
  assert.deepEqual(ns5ReplayModules(), expected);
  assert.equal(ns5ReplayModules().length, 13);
});
