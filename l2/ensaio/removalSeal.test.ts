/// <mls fileReference="_102035_/l2/ensaio/removalSeal.test.ts" enhancement="_blank" />

/**
 * l4_p4_97, found by the real removal flow on `tarefas` (l4_p4_96): after the request agent removes a file from the candidate
 * (a journey or an entity, and its entry in the index), saving the request has to seal a candidate without it.
 * The scenario is the `tarefas` fixture in the in-memory stor, never the disk of a project.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { saveChangeRequest } from '../newRelease/helpers/revisionSelection.js';
import { prepareL4Change, readActiveSealedL4Candidate, revertL4CandidatePath } from '../solution/candidate/moduleRevision.js';
import { setDescribeEffortImporter } from '/_102035_/l2/solution/effortRegistry.js';
import { createMemoryIndexedDb } from './hostSimulado.js';
import { PROJECT, installTarefasOn } from './tarefasStor.js';
import { installMlsStub } from '../../../test/mlsStub.js';

type StorFile = { status: string; content: string };
const PLAN = 'tarefas/tobe/plan';
const key = (folder: string, shortName: string) => `${PROJECT}|4|${folder}|${shortName}|.defs.ts`;
const ENTRY = (field: string, id: string) => new RegExp(`\\n    \\{\\n      "${field}": "${id}",.*?\\n    \\},?(?=\\n)`, 'su');

async function withCandidate(run: (context: { files: Record<string, StorFile>; prepared: Awaited<ReturnType<typeof prepareL4Change>> }) => Promise<void>) {
  Object.assign(globalThis, { document: { documentElement: { lang: 'en' }, createTreeWalker: () => ({ nextNode: () => null, currentNode: null }), createElement: (tag: string) => ({ tagName: tag.toUpperCase(), textContent: '' }), createComment: () => ({}), head: { querySelector: () => null, appendChild: () => undefined } }, window: globalThis, customElements: { define() {}, get() {} }, HTMLElement: class {} });
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: createMemoryIndexedDb() });
  setDescribeEffortImporter(async () => { throw new Error('no master'); });
  installMlsStub({ actualProject: PROJECT });
  const stor = installTarefasOn();
  try {
    const prepared = await prepareL4Change(PROJECT, 'tarefas');
    await run({ files: stor.files as unknown as Record<string, StorFile>, prepared });
  } finally { setDescribeEffortImporter(undefined); stor.restore(); }
}

/** What the request agent leaves: the file gone and its entry out of the index. */
function remove(files: Record<string, StorFile>, folder: string, id: string, field: string): void {
  files[key(`${PLAN}/${folder}`, id)].status = 'deleted';
  const index = files[key(`${PLAN}/${folder}`, 'index')];
  assert.match(index.content, ENTRY(field, id));
  index.content = index.content.replace(ENTRY(field, id), '').replace('},\n  ]', '}\n  ]');
}

void test('removing a journey from the candidate and saving the request seals a candidate without it', async () => {
  await withCandidate(async ({ files, prepared }) => {
    remove(files, 'journeys', 'resumoDiario', 'journeyId');
    const selection = await saveChangeRequest(PROJECT, 'tarefas', 'remover a jornada resumoDiario', prepared.change.changeId, prepared.change.activeRevisionId);
    const sealed = await readActiveSealedL4Candidate(PROJECT, 'tarefas');
    assert.ok(selection.revisionId && sealed);
    assert.equal(Object.keys(sealed.sources).some(path => path.includes('resumoDiario')), false, 'the sealed candidate has no resumoDiario');
    assert.equal(sealed.manifest.fileStates['journeys/resumoDiario.defs.ts'], 'removed');
  });
});

void test('removing an entity of the ontology is sealed the same way', async () => {
  await withCandidate(async ({ files, prepared }) => {
    remove(files, 'ontology', 'ItemChecklist', 'entityId');
    await saveChangeRequest(PROJECT, 'tarefas', 'remover a entidade ItemChecklist', prepared.change.changeId, prepared.change.activeRevisionId);
    const sealed = await readActiveSealedL4Candidate(PROJECT, 'tarefas');
    assert.ok(sealed);
    assert.equal(sealed.manifest.fileStates['ontology/ItemChecklist.defs.ts'], 'removed');
  });
});

void test('a second save keeps the removal, and undoing it in the same candidate puts the journey back', async () => {
  await withCandidate(async ({ files, prepared }) => {
    remove(files, 'journeys', 'resumoDiario', 'journeyId');
    const first = await saveChangeRequest(PROJECT, 'tarefas', 'remover a jornada resumoDiario', prepared.change.changeId, prepared.change.activeRevisionId);
    const second = await saveChangeRequest(PROJECT, 'tarefas', 'remover a jornada resumoDiario', prepared.change.changeId, first.revisionId);
    const kept = await readActiveSealedL4Candidate(PROJECT, 'tarefas');
    assert.equal(kept?.manifest.fileStates['journeys/resumoDiario.defs.ts'], 'removed', `still removed after the second save (${second.revisionId})`);
    // Undo: the original journey file and its index entry come back from the base.
    files[key(`${PLAN}/journeys`, 'resumoDiario')].status = 'unchanged';
    await revertL4CandidatePath(PROJECT, 'tarefas', 'journeys/index.defs.ts', second.revisionId);
    const restored = await readActiveSealedL4Candidate(PROJECT, 'tarefas');
    assert.ok(restored);
    assert.notEqual(restored.manifest.fileStates['journeys/resumoDiario.defs.ts'], 'removed');
  });
});

void test('a fixed file that is missing from the candidate is put back; only indexed files can be removed', async () => {
  await withCandidate(async ({ files, prepared }) => {
    files[key(PLAN, 'rules')].status = 'deleted';
    await prepareL4Change(PROJECT, 'tarefas');
    assert.notEqual(files[key(PLAN, 'rules')].status, 'deleted');
    void prepared;
  });
});
