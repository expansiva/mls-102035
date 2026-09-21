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
  tobeManifestFileInfo,
  validateNs5Overlay,
  type NewReleaseArtifact,
  type NewReleaseOverlaySources,
} from './tobe.js';
import { tabForArtifactPath } from './editContract.js';
import { sha256Tobe } from './tobeDiff.js';
import { markL4Result, readActiveL4Change, readL4Release, readL4Revision, resolveL4Folders, sealL4Revision } from './helpers/moduleRevision.js';
import { historicalReleaseId } from './helpers/context.js';
import { ChangeRequestDrafts, contextStillCurrent, listReleaseChoices, readChangeRequest, reuseHistoricalRelease, revisionsForKnob, saveChangeRequest, selectedRevisionIndex } from './helpers/revisionSelection.js';

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
  assert.throws(() => normalizeTobeArtifactPath('/module.defs.ts'), /Unsupported tobe artifact path/);
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
  return { source, files, contents, keyOf, add };
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
    expectedRevisionId: null,
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
  assert.equal(discarded.deleted.some(path => path.endsWith('/module.defs.ts')), false);
  const restored = await readNs5Overlay(project, moduleName, 'tobe');
  assert.equal(restored.sources.module.source, 'asis');
  assert.equal(restored.sources.module.value?.title, fixture.source.module.title);
  assert.equal(restored.diffs.length, 0);
  assert.ok(Object.values(fixture.files).some((file: any) => String(file.folder).includes('/tobe/plan')));
});

test('runtime full discard removes every prepared artifact and the manifest', async () => {
  const project = 102047;
  const moduleName = 'ordenServicio5';
  const fixture = installStorFixture(project, moduleName);
  const first = await saveTobeArtifact(project, moduleName, 'module.defs.ts', fixture.source.module, { author: 'tester@example.com', expectedRevisionId: null });
  await saveTobeArtifact(project, moduleName, 'rules.defs.ts', fixture.source.rules, { author: 'tester@example.com', expectedRevisionId: first.revisionId ?? null });

  const discarded = await discardTobe(project, moduleName);
  assert.equal(discarded.manifest, null);
  assert.ok(discarded.deleted.some(path => path.endsWith('/module.defs.ts')));
  assert.ok(discarded.deleted.some(path => path.endsWith('/rules.defs.ts')));
  assert.ok(discarded.deleted.some(path => path.endsWith('/tobe.json')));
  assert.equal(Object.values(fixture.files).some((file: any) => String(file.folder).includes('/tobe/plan')), false);
});

test('base snapshot is complete, byte-stable and separate from the temporary candidate', async () => {
  const project = 102047;
  const moduleName = 'ordenServicio5';
  const fixture = installStorFixture(project, moduleName);
  fixture.add('workspace-model.defs.ts', { menu: [{ workspaceId: 'overview', label: 'Overview' }] });
  fixture.add('workspaces/overview.defs.ts', { workspaceId: 'overview', title: 'Overview' });
  const before = new Map(fixture.contents);
  const prepared = await readNs5Overlay(project, moduleName, 'tobe');
  assert.equal(prepared.diffs.length, 0);
  assert.ok(prepared.sources.all.every(item => item.source === 'asis'));
  const change = await readActiveL4Change(project, moduleName);
  assert.ok(change);
  const release = await readL4Release(project, moduleName, change.baseId);
  assert.ok(release);
  assert.equal(Object.keys(release.files).length, prepared.sources.all.length + 2);
  assert.equal(release.schemas['module.defs.ts'], fixture.source.module.schemaVersion);
  assert.equal(release.schemas['journeys/index.defs.ts'], fixture.source.journeyIndex.schemaVersion);
  assert.equal(release.schemas['workspace-model.defs.ts'], null);
  assert.equal(release.schemas['workspaces/overview.defs.ts'], null);
  const folders = resolveL4Folders(project, moduleName, change.baseId, change.changeId, 'rev-test');
  assert.notEqual(folders.originalL4Path, folders.temporaryL4Path);
  for (const [key, source] of before) {
    assert.equal(fixture.contents.get(key), source);
    const parts = key.split(':');
    const baseKey: string = `${project}:4:${parts[2].replace(moduleName, `${moduleName}/pipeline/releases/${change.baseId}/l4`)}:${parts[3]}`;
    const tempKey: string = `${project}:4:${parts[2].replace(moduleName, `${moduleName}/tobe/plan`)}:${parts[3]}`;
    assert.equal(fixture.contents.get(baseKey), source);
    assert.equal(fixture.contents.get(tempKey), source);
  }
  assert.throws(() => resolveL4Folders(project, '../escape', change.baseId), /Invalid module name/);
  assert.throws(() => resolveL4Folders(project, moduleName, '../escape'), /Invalid revision identifier/);
  const manifestKey = `${project}:4:${moduleName}/pipeline/releases/${change.baseId}:manifest.json`;
  const corrupted = JSON.parse(fixture.contents.get(manifestKey) || '{}');
  corrupted.schemas['module.defs.ts'] = 'unsupported-schema';
  fixture.contents.set(manifestKey, JSON.stringify(corrupted));
  assert.equal(await readL4Release(project, moduleName, change.baseId), null);
});

test('revision selection keeps stable release IDs and ignores stale module responses', async () => {
  const project = 102047;
  const moduleName = 'ordenServicio5';
  const fixture = installStorFixture(project, moduleName);
  const prepared = await readNs5Overlay(project, moduleName, 'tobe');
  const choices = await listReleaseChoices(project, moduleName);
  assert.equal(choices.length, 1);
  const versions = revisionsForKnob(choices);
  assert.deepEqual(versions, ['asis', 'tobe', `release:${choices[0].baseId}`]);
  assert.equal(selectedRevisionIndex(versions, versions[2]), 3);
  assert.equal(selectedRevisionIndex(versions, 'release:removed'), 1);
  assert.equal(historicalReleaseId(versions[2]), choices[0].baseId);
  assert.throws(() => historicalReleaseId('release:../escape'), /Invalid release identifier/);
  assert.equal(contextStillCurrent({ project, moduleName, version: versions[2] }, { project, moduleName: 'other', version: versions[2] }), false);
  assert.equal(contextStillCurrent({ project, moduleName, version: versions[2] }, { project, moduleName, version: 'asis' }), false);
  assert.equal(contextStillCurrent({ project, moduleName, version: versions[2] }, { project, moduleName, version: versions[2] }), true);

  const changed = { ...fixture.source.module, title: 'New candidate' };
  await saveTobeArtifact(project, moduleName, 'module.defs.ts', changed, {
    author: 'tester', expectedChangeId: prepared.changeId, expectedRevisionId: prepared.revisionId,
  });
  const history = await readNs5Overlay(project, moduleName, versions[2]);
  assert.equal(history.sources.module.value?.title, fixture.source.module.title);
  assert.equal(history.changeId, null);
  assert.equal(history.manifest, null);
  await assert.rejects(() => readNs5Overlay(project, moduleName, 'release:missing'), /Historical release is incomplete/);
});

test('unsaved request draft stays with its candidate across a structured-edit reload and never leaks to another module', () => {
  const drafts = new ChangeRequestDrafts();
  const first = ChangeRequestDrafts.key(102047, 'agendaClinica', 'change-1');
  const other = ChangeRequestDrafts.key(102047, 'financeiro', 'change-2');
  drafts.remember(first, 'Draft after editing a rule', 'Previously saved');
  assert.equal(drafts.restore(other, 'Previously saved'), null);
  assert.equal(drafts.restore(first, 'Previously saved'), 'Draft after editing a rule');
  assert.equal(drafts.restore(ChangeRequestDrafts.key(102047, 'agendaClinica', 'change-3'), 'Previously saved'), null);
  assert.equal(drafts.restore(first, 'Another session saved a new request'), null);
  drafts.remember(first, 'Saved now', 'Previously saved');
  drafts.forget(first);
  assert.equal(drafts.restore(first, 'Saved now'), null);
});

test('a draft typed on Current follows only the candidate created by its first structured save', () => {
  const drafts = new ChangeRequestDrafts();
  const current = ChangeRequestDrafts.key(102047, 'agendaClinica', null);
  const candidate = ChangeRequestDrafts.key(102047, 'agendaClinica', 'change-1');
  const otherModule = ChangeRequestDrafts.key(102047, 'financeiro', 'change-1');
  const otherProject = ChangeRequestDrafts.key(102048, 'agendaClinica', 'change-1');
  drafts.remember(current, 'Keep this request while editing a rule', '');
  drafts.move(current, candidate);
  assert.equal(drafts.restore(candidate, ''), 'Keep this request while editing a rule');
  assert.equal(drafts.restore(current, ''), null);
  assert.equal(drafts.restore(otherModule, ''), null);
  assert.equal(drafts.restore(otherProject, ''), null);
});

test('text-only request survives reload, invalidates result, and stale save is rejected', async () => {
  const project = 102047;
  const moduleName = 'ordenServicio5';
  const fixture = installStorFixture(project, moduleName);
  const first = await saveChangeRequest(project, moduleName, 'Change the welcome text', null, null);
  assert.equal((await readChangeRequest(project, moduleName))?.text, 'Change the welcome text');
  assert.equal((await readChangeRequest(project, moduleName))?.resultCurrent, false);
  assert.equal(fixture.source.module.sourcePrompt, (await readNs5Overlay(project, moduleName, 'asis')).sources.module.value?.sourcePrompt);
  await markL4Result(project, moduleName, first.revisionId);
  assert.equal((await readChangeRequest(project, moduleName))?.resultCurrent, true);
  const second = await saveChangeRequest(project, moduleName, 'Adjust it again', first.changeId, first.revisionId);
  assert.notEqual(second.revisionId, first.revisionId);
  assert.equal((await readChangeRequest(project, moduleName))?.resultCurrent, false);
  await assert.rejects(() => saveChangeRequest(project, moduleName, 'Late write', first.changeId, first.revisionId), /revision conflict/);
});

test('reusing a historical base creates a candidate and never modifies the current source', async () => {
  const project = 102047;
  const moduleName = 'ordenServicio5';
  const fixture = installStorFixture(project, moduleName);
  const first = await readNs5Overlay(project, moduleName, 'tobe');
  const baseId = (await readActiveL4Change(project, moduleName))!.baseId;
  await discardTobe(project, moduleName);
  const revisionId = await reuseHistoricalRelease(project, moduleName, `release:${baseId}`);
  assert.ok(revisionId);
  assert.notEqual((await readActiveL4Change(project, moduleName))?.changeId, first.changeId);
  assert.equal((await readNs5Overlay(project, moduleName, 'asis')).sources.module.value?.title, fixture.source.module.title);
  assert.equal((await readNs5Overlay(project, moduleName, 'tobe')).sources.module.value?.title, fixture.source.module.title);
  await assert.rejects(() => reuseHistoricalRelease(project, moduleName, `release:${baseId}`), /Discard the active candidate/);
});

test('revisions retain request separately, reject late saves, and keep prior snapshot after a failed write', async () => {
  const project = 102047;
  const moduleName = 'ordenServicio5';
  const fixture = installStorFixture(project, moduleName);
  const first = await saveTobeArtifact(project, moduleName, 'module.defs.ts', { ...fixture.source.module, title: 'First title' }, {
    author: 'tester@example.com', expectedRevisionId: null,
  });
  assert.ok(first.changeId && first.revisionId && first.baseId);
  const firstRevision = await readL4Revision(project, moduleName, first.changeId, first.revisionId);
  assert.equal(firstRevision?.changedPaths[0], 'module.defs.ts');
  await assert.rejects(() => saveTobeArtifact(project, moduleName, 'module.defs.ts', { ...fixture.source.module, title: 'Late title' }, {
    author: 'tester@example.com', expectedRevisionId: null,
  }), /revision conflict/);
  const request = await sealL4Revision(project, moduleName, first.revisionId, 'Adjust the title');
  const changed = await readActiveL4Change(project, moduleName);
  assert.equal(changed?.requestRevision, 1);
  assert.equal(changed?.sourcePrompt, fixture.source.module.sourcePrompt);
  assert.equal(changed?.resultRevisionId, null);
  assert.equal(request.requestRevision, 1);
  const requestKey = `${project}:4:${moduleName}/pipeline/changes/${first.changeId}/requests:request-1.json`;
  assert.equal(JSON.parse(fixture.contents.get(requestKey) || '{}').request, 'Adjust the title');
  await assert.rejects(() => markL4Result(project, moduleName, first.revisionId!), /result is stale/);
  assert.equal((await markL4Result(project, moduleName, request.revisionId)).resultRevisionId, request.revisionId);
  const originalSet = (globalThis as any).mls.stor.localStor.setContent;
  (globalThis as any).mls.stor.localStor.setContent = async (file: any, value: { content: string }) => {
    if (String(file.folder).includes('/revisions/')) throw new Error('synthetic revision write failure');
    return originalSet(file, value);
  };
  await assert.rejects(() => saveTobeArtifact(project, moduleName, 'module.defs.ts', { ...fixture.source.module, title: 'Failed title' }, {
    author: 'tester@example.com', expectedRevisionId: request.revisionId,
  }), /synthetic revision write failure/);
  assert.ok(await readL4Revision(project, moduleName, first.changeId, first.revisionId));
  assert.equal((await readActiveL4Change(project, moduleName))?.activeRevisionId, request.revisionId);
});

test('pre-existing partial overlay survives first full-copy preparation', async () => {
  const project = 102047;
  const moduleName = 'ordenServicio5';
  const fixture = installStorFixture(project, moduleName);
  const changed = { ...fixture.source.module, title: 'Prior draft' };
  const planned = tobeArtifactFileInfo(project, moduleName, 'module.defs.ts', 'tobe');
  const planFile = await (globalThis as any).mls.stor.addOrUpdateFile(planned);
  await (globalThis as any).mls.stor.localStor.setContent(planFile, { content: `export const fixture = ${JSON.stringify(changed)} as const;` });
  const baseHash = await sha256Tobe(fixture.source.module);
  const legacy = recordTobeSave(null, 'module.defs.ts', '$.title', baseHash, 'tester@example.com');
  const manifestInfo = tobeManifestFileInfo(project, moduleName);
  const manifestFile = await (globalThis as any).mls.stor.addOrUpdateFile(manifestInfo);
  await (globalThis as any).mls.stor.localStor.setContent(manifestFile, { content: JSON.stringify(legacy) });
  const prepared = await readNs5Overlay(project, moduleName, 'tobe');
  assert.equal(prepared.sources.module.value?.title, 'Prior draft');
  assert.equal(prepared.sources.module.source, 'tobe');
  assert.equal(prepared.diffs.length, 1);
  assert.ok(prepared.sources.all.slice(1).every(item => item.source === 'asis'));
});

test('stale legacy overlay cannot be promoted to a captured base', async () => {
  const project = 102047;
  const moduleName = 'ordenServicio5';
  const fixture = installStorFixture(project, moduleName);
  const old = recordTobeSave(null, 'module.defs.ts', '$.title', 'sha256:obsolete', 'tester@example.com');
  const info = tobeManifestFileInfo(project, moduleName);
  const file = await (globalThis as any).mls.stor.addOrUpdateFile(info);
  await (globalThis as any).mls.stor.localStor.setContent(file, { content: JSON.stringify(old) });
  await assert.rejects(() => readNs5Overlay(project, moduleName, 'tobe'), /stale base/);
  assert.equal(Object.values(fixture.files).some((item: any) => String(item.folder).endsWith('/pipeline/releases')), false);
});

test('incomplete release capture never appears in the catalog', async () => {
  const project = 102047;
  const moduleName = 'ordenServicio5';
  const fixture = installStorFixture(project, moduleName);
  const setContent = (globalThis as any).mls.stor.localStor.setContent;
  (globalThis as any).mls.stor.localStor.setContent = async (file: any, value: { content: string }) => {
    if (String(file.folder).includes('/pipeline/releases/') && file.shortName === 'manifest') throw new Error('synthetic capture failure');
    return setContent(file, value);
  };
  await assert.rejects(() => readNs5Overlay(project, moduleName, 'tobe'), /synthetic capture failure/);
  assert.equal(Object.values(fixture.files).some((file: any) => String(file.folder).endsWith('/pipeline/releases') && file.shortName === 'index'), false);
});

test('concurrent saves with the same expected revision admit only one writer', async () => {
  const project = 102047;
  const moduleName = 'ordenServicio5';
  const fixture = installStorFixture(project, moduleName);
  const results = await Promise.allSettled([
    saveTobeArtifact(project, moduleName, 'module.defs.ts', { ...fixture.source.module, title: 'Writer A' }, { author: 'tester', expectedRevisionId: null }),
    saveTobeArtifact(project, moduleName, 'module.defs.ts', { ...fixture.source.module, title: 'Writer B' }, { author: 'tester', expectedRevisionId: null }),
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter(result => result.status === 'rejected' && /revision conflict/.test(String(result.reason))).length, 1);
});

test('a save from an older change cannot enter a new candidate with the same null revision', async () => {
  const project = 102047;
  const moduleName = 'ordenServicio5';
  const fixture = installStorFixture(project, moduleName);
  const first = await saveTobeArtifact(project, moduleName, 'module.defs.ts', fixture.source.module, {
    author: 'tester', expectedChangeId: null, expectedRevisionId: null,
  });
  await discardTobe(project, moduleName);
  const fresh = await readNs5Overlay(project, moduleName, 'tobe');
  assert.notEqual(fresh.changeId, first.changeId);
  assert.equal(fresh.revisionId, null);
  await assert.rejects(() => saveTobeArtifact(project, moduleName, 'module.defs.ts', fixture.source.module, {
    author: 'tester', expectedChangeId: first.changeId, expectedRevisionId: null,
  }), /L4 change conflict/);
});

test('fixed millisecond clock cannot reuse a change or revision id', async () => {
  const project = 102047;
  const moduleName = 'ordenServicio5';
  const fixture = installStorFixture(project, moduleName);
  const actualNow = Date.now;
  Date.now = () => 1_780_000_000_000;
  try {
    const initial = await readNs5Overlay(project, moduleName, 'tobe');
    assert.ok(initial.changeId);
    await discardTobe(project, moduleName);
    const next = await readNs5Overlay(project, moduleName, 'tobe');
    assert.ok(next.changeId);
    assert.notEqual(initial.changeId, next.changeId);
    const earlierChangeKey = `${project}:4:${moduleName}/pipeline/changes/${initial.changeId}:change.json`;
    assert.ok(fixture.contents.has(earlierChangeKey));

    const first = await saveTobeArtifact(project, moduleName, 'module.defs.ts', { ...fixture.source.module, title: 'Same tick' }, {
      author: 'tester', expectedChangeId: next.changeId, expectedRevisionId: null,
    });
    const second = await saveTobeArtifact(project, moduleName, 'module.defs.ts', { ...fixture.source.module, title: 'Same tick' }, {
      author: 'tester', expectedChangeId: next.changeId, expectedRevisionId: first.revisionId!,
    });
    assert.notEqual(first.revisionId, second.revisionId);
    assert.ok(await readL4Revision(project, moduleName, next.changeId, first.revisionId!));
    assert.ok(await readL4Revision(project, moduleName, next.changeId, second.revisionId!));
  } finally {
    Date.now = actualNow;
  }
});
