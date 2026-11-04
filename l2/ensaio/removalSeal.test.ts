/// <mls fileReference="_102035_/l2/ensaio/removalSeal.test.ts" enhancement="_blank" />

/**
 * l4_p4_96, found by the real removal flow on `tarefas`: after the request agent removes a journey from the candidate
 * (the file and its index entry), saving the change request has to seal a candidate without that journey.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { saveChangeRequest } from '../newRelease/helpers/revisionSelection.js';
import { prepareL4Change, readActiveSealedL4Candidate } from '../solution/candidate/moduleRevision.js';
import { readSourceText } from '../solution/fs.js';
import { setDescribeEffortImporter } from '/_102035_/l2/solution/effortRegistry.js';
import { createMemoryIndexedDb } from './hostSimulado.js';
import { PROJECT, installTarefasOn } from './tarefasStor.js';
import { installMlsStub } from '../../../test/mlsStub.js';

const installTarefas = () => { installMlsStub({ actualProject: PROJECT }); return installTarefasOn(); };

void test('removing a journey from the candidate and saving the request seals a candidate without it', { todo: 'prepareL4Change, called by saveChangeRequest for an active change, writes back every release file that is missing from tobe/plan: the removed journey comes back and assertCandidateIndex refuses candidate_index_mismatch:journeys/<id>.defs.ts' }, async () => {
  Object.assign(globalThis, { document: { documentElement: { lang: 'en' }, createTreeWalker: () => ({ nextNode: () => null, currentNode: null }), createElement: (tag: string) => ({ tagName: tag.toUpperCase(), textContent: '' }), createComment: () => ({}), head: { querySelector: () => null, appendChild: () => undefined } }, window: globalThis, customElements: { define() {}, get() {} }, HTMLElement: class {} });
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: createMemoryIndexedDb() });
  setDescribeEffortImporter(async () => { throw new Error('no master'); });
  const stor = installTarefas();
  const files = stor.files as unknown as Record<string, { status: string; content: string }>;
  try {
    const prepared = await prepareL4Change(102047, 'tarefas');
    const planRoot = 'tarefas/tobe/plan';
    const key = (folder: string, shortName: string) => `102047|4|${folder}|${shortName}|.defs.ts`;
    // What the request agent leaves: the journey file gone and its entry out of the index.
    files[key(`${planRoot}/journeys`, 'resumoDiario')].status = 'deleted';
    const indexFile = files[key(`${planRoot}/journeys`, 'index')];
    const entry = /\n    \{\n      "journeyId": "resumoDiario",.*?\n    \},?(?=\n)/su;
    assert.match(indexFile.content, entry);
    indexFile.content = indexFile.content.replace(entry, '').replace('},\n  ]', '}\n  ]');
    assert.equal(await readSourceText({ project: 102047, level: 4, folder: `${planRoot}/journeys`, shortName: 'index', extension: '.defs.ts' }).then(text => text.includes('resumoDiario')), false);
    const selection = await saveChangeRequest(102047, 'tarefas', 'remover a jornada resumoDiario', prepared.change.changeId, prepared.change.activeRevisionId);
    const sealed = await readActiveSealedL4Candidate(102047, 'tarefas');
    assert.ok(selection.revisionId && sealed);
    assert.equal(Object.keys(sealed.sources).some(path => path.includes('resumoDiario')), false, 'the sealed candidate has no resumoDiario');
  } finally { setDescribeEffortImporter(undefined); stor.restore(); }
});
