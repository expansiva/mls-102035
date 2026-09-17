/// <mls fileReference="_102035_/l2/newRelease/tobe.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { loadNs5Entities, loadNs5OracleSources } from '../agentNewSolution5/helpers/ns5RealFixtures.test.js';
import {
  isNs5OntologyV3,
  NS5_TOBE_MANIFEST_SCHEMA_VERSION,
  ns5OntologyEntityIds,
  normalizeTobeArtifactPath,
  discardTobe,
  readNs5Overlay,
  recordTobeDiscard,
  recordTobeSave,
  saveTobeArtifact,
  tobeArtifactFileInfo,
  validateNs5Overlay,
  type NewReleaseArtifact,
  type NewReleaseOverlaySources,
} from './tobe.js';
import { tabForArtifactPath } from './editContract.js';

test('v3 ontology index resolves descriptor rows to entity file ids without changing v2 ids', () => {
  const v3 = {
    schemaVersion: '2026-09-15-ns5-ontology-v3', moduleName: 'agendaClinica', businessDomain: 'Agenda',
    platformOntology: '/_102034_/l4/ontology/mdm.defs.ts', moduleNamespace: { key: 'agendaClinica', description: 'Módulo' },
    entities: [{ entityId: 'Paciente', kind: 'role', subtype: 'Person' }, { entityId: 'Consulta', kind: 'entity', class: 'core' }], relationships: [],
  } as const;
  assert.equal(isNs5OntologyV3(v3), true);
  assert.deepEqual(ns5OntologyEntityIds(v3), ['Paciente', 'Consulta']);
  assert.deepEqual(ns5OntologyEntityIds({
    schemaVersion: '2026-09-11-ns5-ontology-v2', moduleName: 'legacy', businessDomain: 'Legacy', entities: ['A'], relationships: [],
  }), ['A']);
});

test('manifest preserves first base hash and records each confirmed change', () => {
  const first = recordTobeSave(null, 'module.defs.ts', '$.title', 'sha256:first', 'user@example.com', '2026-09-13T00:00:00.000Z');
  const second = recordTobeSave(first, 'module.defs.ts', '$.sourcePrompt', 'sha256:later', 'user@example.com', '2026-09-13T00:01:00.000Z');
  assert.equal(second.schemaVersion, NS5_TOBE_MANIFEST_SCHEMA_VERSION);
  assert.equal(second.base['module.defs.ts'], 'sha256:first');
  assert.equal(second.changes.length, 2);
  assert.equal(recordTobeDiscard(second, 'module.defs.ts'), null);
});

test('artifact paths are allow-listed and map to an explicit project', () => {
  assert.equal(normalizeTobeArtifactPath('journeys/myJourney.defs.ts'), 'journeys/myJourney.defs.ts');
  assert.deepEqual(tobeArtifactFileInfo(102047, 'agendaClinica', 'journeys/myJourney.defs.ts', 'tobe'), {
    project: 102047,
    level: 4,
    folder: 'agendaClinica/tobe/plan/journeys',
    shortName: 'myJourney',
    extension: '.defs.ts',
  });
  assert.throws(() => normalizeTobeArtifactPath('../project.json'), /Unsupported tobe artifact path/);
});

test('journey files and their index share the future journeys tab seam', () => {
  assert.equal(tabForArtifactPath('journeys/index.defs.ts'), 'journeys');
  assert.equal(tabForArtifactPath('journeys/cadastrarCliente.defs.ts'), 'journeys');
  assert.equal(tabForArtifactPath('module.defs.ts'), 'general');
});

function artifact<T>(path: NewReleaseArtifact<T>['path'], value: T): NewReleaseArtifact<T> {
  return { path, source: 'asis', value };
}

function realOverlay(): NewReleaseOverlaySources {
  const source = loadNs5OracleSources('ordenServicio5');
  const module = artifact('module.defs.ts', source.module);
  const journeyIndex = artifact('journeys/index.defs.ts', source.journeyIndex);
  const journeys = source.journeys.map(value => artifact(`journeys/${value.journeyId}.defs.ts` as const, value));
  const ontologyIndex = artifact('ontology/index.defs.ts', source.ontologyIndex);
  const entities = loadNs5Entities('ordenServicio5').map(value => artifact(`ontology/${value.entityId}.defs.ts` as const, value));
  const rules = artifact('rules.defs.ts', source.rules);
  const workflows = artifact('workflows.defs.ts', source.workflows);
  const access = artifact('access.defs.ts', source.access);
  const integration = artifact('integration.defs.ts', source.integration);
  return {
    module, journeyIndex, journeys, ontologyIndex, entities, rules, workflows, access, integration,
    all: [module, journeyIndex, ...journeys, ontologyIndex, ...entities, rules, workflows, access, integration],
  };
}

test('overlay gates and in-memory oracle accept a real NS5 fixture', async () => {
  const sources = realOverlay();
  const result = await validateNs5Overlay(sources, { registryModuleNames: ['ordenServicio5'] });
  assert.equal(result.oracle?.finalStatus, 'passed', result.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.equal(result.ok, true, result.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

test('overlay reports an invalid prepared artifact before apply or execute', async () => {
  const sources = realOverlay();
  sources.module.value = { ...sources.module.value!, defaultLanguage: 'fr' };
  const result = await validateNs5Overlay(sources, { registryModuleNames: ['ordenServicio5'] });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(issue => issue.code === 'NS5_MODULE_DEFAULT_LANGUAGE' && issue.artifact === 'module.defs.ts'));
});

function installStorFixture(project: number, moduleName: string) {
  const source = loadNs5OracleSources(moduleName);
  const files: Record<string, any> = {};
  const contents = new Map<string, string>();
  const keyOf = (info: any) => `${info.project}:${info.level}:${info.folder || ''}:${info.shortName}${info.extension}`;
  const add = (path: NewReleaseArtifact<unknown>['path'], value: unknown) => {
    const info = tobeArtifactFileInfo(project, moduleName, path, 'asis');
    const key = keyOf(info);
    contents.set(key, `export const fixture = ${JSON.stringify(value, null, 2)} as const;\n`);
    files[key] = {
      ...info,
      status: 'unchanged',
      versionRef: '1',
      getContent: async () => contents.get(key) || '',
      getValueInfo: async () => ({ content: contents.get(key) || '' }),
    };
  };
  add('module.defs.ts', source.module);
  add('journeys/index.defs.ts', source.journeyIndex);
  source.journeys.forEach(value => add(`journeys/${value.journeyId}.defs.ts`, value));
  add('ontology/index.defs.ts', source.ontologyIndex);
  loadNs5Entities(moduleName).forEach(value => add(`ontology/${value.entityId}.defs.ts`, value));
  add('rules.defs.ts', source.rules);
  add('workflows.defs.ts', source.workflows);
  add('access.defs.ts', source.access);
  add('integration.defs.ts', source.integration);

  (globalThis as any).mls = {
    stor: {
      files,
      getKeyToFile: keyOf,
      addOrUpdateFile: async (info: any) => {
        const key = keyOf(info);
        const file = {
          ...info,
          status: 'new',
          versionRef: '0',
          getContent: async () => contents.get(key) || '',
          getValueInfo: async () => ({ content: contents.get(key) || '' }),
        };
        files[key] = file;
        return file;
      },
      localStor: {
        setContent: async (file: any, value: { content: string }) => {
          const key = keyOf(file);
          contents.set(key, value.content);
          files[key] = file;
          if (file.status !== 'new') file.status = 'changed';
        },
        listFolder: (wantedProject: number, level: number, folder: string) => Object.values(files)
          .filter((file: any) => file.project === wantedProject && file.level === level && (file.folder === folder || file.folder.startsWith(`${folder}/`))),
        deleteFile: async (file: any) => {
          const key = keyOf(file);
          delete files[key];
          contents.delete(key);
        },
      },
    },
    editor: { models: {}, getKeyModel: () => '' },
  };
  return { source, files, contents, keyOf };
}

test('runtime overlay saves one artifact, detects stale base, and discards with inventory', async () => {
  const project = 102047;
  const moduleName = 'ordenServicio5';
  const fixture = installStorFixture(project, moduleName);
  const changed = { ...fixture.source.module, title: 'Prepared title' };
  await saveTobeArtifact(project, moduleName, 'module.defs.ts', changed, {
    jsonPath: '$.title',
    author: 'tester@example.com',
    now: '2026-09-13T01:00:00.000Z',
  });

  const prepared = await readNs5Overlay(project, moduleName, 'tobe');
  assert.equal(prepared.sources.module.source, 'tobe');
  assert.equal(prepared.sources.module.value?.title, 'Prepared title');
  assert.equal(prepared.manifest?.changes.length, 1);
  assert.deepEqual(prepared.diffs[0]?.entries, [{ jsonPath: '$.title', before: fixture.source.module.title, after: 'Prepared title' }]);

  const asisInfo = tobeArtifactFileInfo(project, moduleName, 'module.defs.ts', 'asis');
  fixture.contents.set(fixture.keyOf(asisInfo), `export const fixture = ${JSON.stringify({ ...fixture.source.module, title: 'Regenerated title' })} as const;`);
  const stale = await readNs5Overlay(project, moduleName, 'tobe');
  assert.deepEqual(stale.stalePaths, ['module.defs.ts']);

  const discarded = await discardTobe(project, moduleName, 'module.defs.ts');
  assert.equal(discarded.manifest, null);
  assert.ok(discarded.deleted.some(path => path.endsWith('/module.defs.ts')));
  assert.equal(Object.values(fixture.files).some((file: any) => String(file.folder).includes('/tobe/plan')), false);
});

test('runtime full discard removes every prepared artifact and the manifest', async () => {
  const project = 102047;
  const moduleName = 'ordenServicio5';
  const fixture = installStorFixture(project, moduleName);
  await saveTobeArtifact(project, moduleName, 'module.defs.ts', fixture.source.module, { author: 'tester@example.com' });
  await saveTobeArtifact(project, moduleName, 'rules.defs.ts', fixture.source.rules, { author: 'tester@example.com' });

  const discarded = await discardTobe(project, moduleName);
  assert.equal(discarded.manifest, null);
  assert.ok(discarded.deleted.some(path => path.endsWith('/module.defs.ts')));
  assert.ok(discarded.deleted.some(path => path.endsWith('/rules.defs.ts')));
  assert.ok(discarded.deleted.some(path => path.endsWith('/tobe.json')));
  assert.equal(Object.values(fixture.files).some((file: any) => String(file.folder).includes('/tobe/plan')), false);
});
