/**
 * MANUAL, not a test (no `.test.ts`, the runner skips it). Runs, in node, the library steps of the New Release screen on the
 * disk of a project (l4_p4_96, new screen): `STEP=A` prepares the change (release copy and change record) and writes them to the
 * disk; after the prompt agent edited `tobe/plan` through `collabmsg`, `DUMP=1` seals the revision (`saveChangeRequest`) and writes it.
 * Run: `STEP=A npx tsx --import ./test/register-hooks.mjs --test mls-102035/l2/ensaio/revisaoNoDisco.manual.ts`
 * The `.manual.ts` name is for reading; to run it, copy it to a `.test.ts` next to it (and delete the copy).
 */
import test from 'node:test';
import { installMlsStub } from '../../../test/mlsStub.js';
import { createMemoryIndexedDb } from './hostSimulado.js';
import { installDiskStor, writeStorToDisk } from './diskBridge.js';
import { saveChangeRequest } from '../newRelease/helpers/revisionSelection.js';
import { readActiveSealedL4Candidate, resolveL4Folders } from '../solution/candidate/moduleRevision.js';
import { prepareReviewStartInput } from '../newRelease/helpers/reviewStart.js';
import { setDescribeEffortImporter } from '/_102035_/l2/solution/effortRegistry.js';

test('step2', async () => {
  Object.assign(globalThis, { document: { documentElement: { lang: 'en' }, createTreeWalker: () => ({ nextNode: () => null, currentNode: null }), createElement: (t: string) => ({ tagName: t.toUpperCase(), textContent: '' }), createComment: () => ({}), head: { querySelector: () => null, appendChild: () => undefined } }, window: globalThis, customElements: { define() {}, get() {} }, HTMLElement: class {} });
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: createMemoryIndexedDb() });
  setDescribeEffortImporter(async () => { throw new Error('no master'); });
  installMlsStub({ actualProject: 102047 });
  const { files } = installDiskStor(102047, ['tarefas']);
  const request = 'criar uma tela nova para o responsável avisar o gestor quando uma tarefa vai atrasar';
  try {
    if (process.env.STEP === 'A') {
      const { prepareL4Change } = await import('../solution/candidate/moduleRevision.js');
      const prepared = await prepareL4Change(102047, 'tarefas');
      console.log('PREP', JSON.stringify({ changeId: prepared.change.changeId, active: prepared.change.activeRevisionId, created: prepared.created }));
      const written = writeStorToDisk(files, 102047, 4, ['tarefas/pipeline', 'tarefas/tobe']);
      console.log('WROTE', written.length, written.slice(0, 4).join(' | '));
      return;
    }
    const { readActiveL4Change } = await import('../solution/candidate/moduleRevision.js');
    const active = await readActiveL4Change(102047, 'tarefas');
    const selection = await saveChangeRequest(102047, 'tarefas', request, active!.changeId, active!.activeRevisionId);
    console.log('SEL', JSON.stringify(selection));
    const loaded = await readActiveSealedL4Candidate(102047, 'tarefas');
    const prepared = await prepareReviewStartInput({ project: 102047, moduleName: 'tarefas', ...selection, request, userId: 'ensaio', loaded: loaded! });
    const { originalL4Path, temporaryL4Path } = resolveL4Folders(102047, 'tarefas', prepared.input.baseId);
    console.log('CMD', `@@agentReviewSolution ${JSON.stringify({ moduleName: 'tarefas', originalL4Path, temporaryL4Path, request, expectedRevisionId: selection.revisionId })}`);
    const written = process.env.DUMP ? writeStorToDisk(files, 102047, 4, ['tarefas/pipeline']) : [];
    console.log('WROTE', written.length, written.slice(0, 5).join(' | '));
  } catch (error) { console.log('ERR', String(error).slice(0, 600)); }
});
