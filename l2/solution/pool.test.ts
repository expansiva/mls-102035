/// <mls fileReference="_102035_/l2/solution/pool.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

type Stored = {
  project: number; level: number; folder: string; shortName: string; extension: string;
  status: string; versionRef: string; content: string;
  getValueInfo: () => Promise<{ content: string }>;
  getContent: () => Promise<string>;
};

type Host = {
  files: Record<string, Stored>;
  deleted: string[];
  listed: Record<string, Array<{ project: number; level: number; folder: string; shortName: string; extension: string }>>;
};

const PROJECT = 102047;

function keyOf(info: { project: number | string; level: number | string; folder: string; shortName: string; extension: string }): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

function seed(host: Host, folder: string, shortName: string, content = '', level = 4): Stored {
  const file: Stored = {
    project: PROJECT, level, folder, shortName, extension: '.json',
    status: 'changed', versionRef: '1', content,
    getValueInfo: async () => ({ content: file.content }),
    getContent: async () => file.content,
  };
  host.files[keyOf(file)] = file;
  return file;
}

/** Installs a host whose storage is a plain map; `writeText` takes the existing-file branch. */
function installHost(): Host {
  const host: Host = { files: {}, deleted: [], listed: {} };
  (globalThis as unknown as Record<string, unknown>).mls = {
    actualProject: PROJECT,
    events: { addEventListener() {}, removeEventListener() {}, dispatch() {} },
    stor: {
      files: host.files,
      getKeyToFile: keyOf,
      localStor: {
        setContent: async (file: Stored, value: { content: string }) => { file.content = value.content; },
        listFolder: (project: number, level: number, folder: string) => host.listed[`${project}_${level}_${folder}`] || [],
        deleteFile: (file: { folder: string; shortName: string }) => { host.deleted.push(`${file.folder}/${file.shortName}`); },
      },
    },
  };
  return host;
}

async function loadPool(): Promise<typeof import('/_102035_/l2/solution/pool.js')> {
  return import('/_102035_/l2/solution/pool.js');
}

const MESSAGE = {
  from: 'l4', to: 'l2', thread: 'mensalidadesAcademia-20260918103000', round: 1,
  mode: 'implement', subject: 'first contracts for the module',
  artifacts: ['l4/module.defs.ts', 'l4/journeys/index.defs.ts'], body: 'Please emit the workspace contracts.',
} as const;

const AT = new Date(Date.UTC(2026, 8, 18, 10, 30, 0));

void test('write then read is byte for byte the same message', async () => {
  const host = installHost();
  const pool = await loadPool();
  const info = { project: PROJECT, level: 4, folder: 'mensalidadesAcademia/pool/l2', shortName: '20260918103000_mensalidadesAcademia-20260918103000_1', extension: '.json' };
  seed(host, info.folder, info.shortName);

  const written = await pool.writePoolMessage('mensalidadesAcademia', MESSAGE, AT);
  assert.deepEqual(written, info);
  assert.equal(host.files[keyOf(info)].content, `${JSON.stringify(MESSAGE, null, 2)}\n`);
  assert.deepEqual(await pool.readPoolMessage(written), { ...MESSAGE, artifacts: [...MESSAGE.artifacts] });
});

void test('listPoolBoxForProject lists the selected project, not actualProject', async () => {
  const host = installHost();
  const pool = await loadPool();
  const folder = 'agendaClinica/pool/l4';
  seed(host, folder, '20260920120000_m-20260920120000_1');
  const other: Stored = {
    project: 102099, level: 4, folder, shortName: '20260920120000_other-20260920120000_1', extension: '.json',
    status: 'changed', versionRef: '1', content: '',
    getValueInfo: async () => ({ content: other.content }),
    getContent: async () => other.content,
  };
  host.files[keyOf(other)] = other;

  assert.deepEqual(pool.listPoolBoxForProject(PROJECT, 'agendaClinica', 'l4').map(file => file.shortName), [
    '20260920120000_m-20260920120000_1',
  ]);
  assert.deepEqual(pool.listPoolBoxForProject(102099, 'agendaClinica', 'l4').map(file => file.shortName), [
    '20260920120000_other-20260920120000_1',
  ]);
  assert.equal(pool.listPoolBoxForProject(102035, 'agendaClinica', 'l4').length, 0);
});

void test('listPoolBox is oldest first by name and sees the host disk', async () => {
  const host = installHost();
  const pool = await loadPool();
  const folder = 'mensalidadesAcademia/pool/l4';
  seed(host, folder, '20260918120000_m-20260918100000_2');
  seed(host, folder, '20260918090000_m-20260918090000_1');
  host.listed[`${PROJECT}_4_${folder}`] = [
    { project: PROJECT, level: 4, folder, shortName: '20260918110000_m-20260918100000_1', extension: '.json' },
  ];

  assert.deepEqual(pool.listPoolBox('mensalidadesAcademia', 'l4').map(file => file.shortName), [
    '20260918090000_m-20260918090000_1',
    '20260918110000_m-20260918100000_1',
    '20260918120000_m-20260918100000_2',
  ]);
  assert.equal(pool.poolHasPending('mensalidadesAcademia'), true);
  assert.equal(pool.listPoolBox('mensalidadesAcademia', 'l1').length, 0);
});

void test('poolHasPending is false when every box is empty', async () => {
  installHost();
  const pool = await loadPool();
  assert.equal(pool.poolHasPending('mensalidadesAcademia'), false);
});

void test('normalizePoolMessage refuses each invalid field with a named cause', async () => {
  const pool = await loadPool();
  const cases: Array<[Record<string, unknown>, RegExp]> = [
    [{ ...MESSAGE, from: undefined }, /message\.from is missing/],
    [{ ...MESSAGE, subject: undefined }, /message\.subject is missing/],
    [{ ...MESSAGE, to: 'l3' }, /message\.to must be one of/],
    [{ ...MESSAGE, to: 'l4' }, /both 'l4'/],
    [{ ...MESSAGE, round: 0 }, /message\.round must be an integer in 1\.\.3/],
    [{ ...MESSAGE, round: 4 }, /message\.round must be an integer in 1\.\.3/],
    [{ ...MESSAGE, round: 1.5 }, /message\.round must be an integer in 1\.\.3/],
    [{ ...MESSAGE, mode: 'plan' }, /message\.mode must be one of/],
    [{ ...MESSAGE, thread: '  ' }, /message\.thread must be a non-empty string/],
    [{ ...MESSAGE, thread: 'foo.bar-1' }, /message\.thread must be '<module>-<yyyymmddhhmmss>'/],
    [{ ...MESSAGE, subject: 'two\nlines' }, /message\.subject must be a single line/],
    [{ ...MESSAGE, artifacts: 'l4/module.defs.ts' }, /message\.artifacts must be an array/],
    [{ ...MESSAGE, artifacts: ['/abs/path.ts'] }, /must be relative to the module/],
    [{ ...MESSAGE, body: 12 }, /message\.body must be a string/],
  ];
  for (const [value, expected] of cases) {
    assert.throws(() => pool.normalizePoolMessage(value), expected, JSON.stringify(value));
  }
  assert.throws(() => pool.normalizePoolMessage([MESSAGE]), /message must be a JSON object/);
  assert.deepEqual(pool.normalizePoolMessage({ ...MESSAGE, artifacts: [] }).artifacts, []);
});

void test('tracePool appends to pipeline.json and deletePoolMessage demands the trace', async () => {
  const host = installHost();
  const pool = await loadPool();
  const folder = 'mensalidadesAcademia/pool/l2';
  const file = { project: PROJECT, level: 4, folder, shortName: '20260918103000_m-20260918103000_1', extension: '.json' };
  seed(host, folder, file.shortName, `${JSON.stringify(MESSAGE, null, 2)}\n`);
  const pipeline = seed(host, 'mensalidadesAcademia/pipeline', 'pipeline', JSON.stringify({
    schemaVersion: 'x', flowId: 'agentNewSolution5', moduleName: 'mensalidadesAcademia',
    status: 'done', steps: {}, sourcePrompt: '', invocation: { fast: false, module: 'mensalidadesAcademia', rebuildAll: false },
    updatedAt: AT.toISOString(),
  }));
  const path = 'l4/mensalidadesAcademia/pool/l2/20260918103000_m-20260918103000_1.json';

  await assert.rejects(pool.deletePoolMessage('mensalidadesAcademia', file, ''), /traceId is empty/);
  await assert.rejects(pool.deletePoolMessage('mensalidadesAcademia', file, path), /no trace line/);

  const traceId = await pool.tracePool('mensalidadesAcademia', {
    at: AT.toISOString(), file: path, from: 'l4', to: 'l2',
    thread: MESSAGE.thread, round: 1, mode: 'implement', outcome: 'processed',
  });
  assert.equal(traceId, path);
  assert.deepEqual((JSON.parse(pipeline.content).pool as unknown[]).length, 1);
  assert.equal((await pool.readPoolTrace('mensalidadesAcademia'))[0].outcome, 'processed');

  await assert.rejects(pool.tracePool('mensalidadesAcademia', {
    at: AT.toISOString(), file: path, from: 'l4', to: 'l2', thread: MESSAGE.thread, round: 1, mode: 'implement', outcome: 'ok',
  }), /trace\.outcome must be one of/);

  assert.equal(await pool.deletePoolMessage('mensalidadesAcademia', file, path), path);
  assert.deepEqual(host.deleted, [`${folder}/${file.shortName}`]);
});

void test('tracePool refuses a module without pipeline.json', async () => {
  installHost();
  const pool = await loadPool();
  await assert.rejects(pool.tracePool('semPipeline', {
    at: AT.toISOString(), file: 'l4/semPipeline/pool/l2/a.json', from: 'l4', to: 'l2',
    thread: 'semPipeline-20260918103000', round: 1, mode: 'estimate', outcome: 'delivered',
  }), /pipeline\.json not found/);
});

void test('nextThread is module plus stamp and POOL_MAX_ROUND is three', async () => {
  installHost();
  const pool = await loadPool();
  assert.equal(pool.nextThread('mensalidades Academia', AT), 'mensalidadesAcademia-20260918103000');
  assert.equal(pool.POOL_MAX_ROUND, 3);
  assert.deepEqual([...pool.POOL_BOXES], ['l1', 'l2', 'l4']);
});

const TRACE_LINE = {
  at: AT.toISOString(), file: 'l4/mensalidadesAcademia/pool/l2/a.json', from: 'l4', to: 'l2',
  thread: 'mensalidadesAcademia-20260918103000', round: 1, mode: 'implement', outcome: 'processed',
} as const;

void test('tracePoolAt writes on the fileInfo pipeline and does not mix two files', async () => {
  const host = installHost();
  const pool = await loadPool();
  const l4 = seed(host, 'mensalidadesAcademia/pipeline', 'pipeline', JSON.stringify({
    schemaVersion: 'x', flowId: 'agentNewSolution5', moduleName: 'mensalidadesAcademia',
    status: 'complete', steps: {}, sourcePrompt: '', invocation: { fast: false, module: 'mensalidadesAcademia', rebuildAll: false },
    updatedAt: AT.toISOString(),
  }));
  const l2 = seed(host, 'mensalidadesAcademia/pipeline', 'pipeline', JSON.stringify({
    schemaVersion: 'l2', moduleName: 'mensalidadesAcademia', updatedAt: AT.toISOString(),
  }), 2);
  const l4Info = { project: PROJECT, level: 4, folder: 'mensalidadesAcademia/pipeline', shortName: 'pipeline', extension: '.json' };
  const l2Info = { project: PROJECT, level: 2, folder: 'mensalidadesAcademia/pipeline', shortName: 'pipeline', extension: '.json' };

  const idL4 = await pool.tracePoolAt(l4Info, { ...TRACE_LINE, file: 'l4/mensalidadesAcademia/pool/l2/a.json' });
  const idL2 = await pool.tracePoolAt(l2Info, {
    ...TRACE_LINE, file: 'l2/mensalidadesAcademia/pipeline/note.json', outcome: 'delivered',
  });
  assert.equal(idL4, 'l4/mensalidadesAcademia/pool/l2/a.json');
  assert.equal(idL2, 'l2/mensalidadesAcademia/pipeline/note.json');
  assert.equal((JSON.parse(l4.content).pool as unknown[]).length, 1);
  assert.equal((JSON.parse(l2.content).pool as unknown[]).length, 1);
  assert.equal((await pool.readPoolTraceAt(l4Info))[0].outcome, 'processed');
  assert.equal((await pool.readPoolTraceAt(l2Info))[0].outcome, 'delivered');
  assert.equal((await pool.readPoolTrace('mensalidadesAcademia'))[0].outcome, 'processed');
});

void test('tracePoolAt refuses a missing pipeline.json with a named cause', async () => {
  installHost();
  const pool = await loadPool();
  const missing = { project: PROJECT, level: 2, folder: 'semPipeline/pipeline', shortName: 'pipeline', extension: '.json' };
  await assert.rejects(pool.tracePoolAt(missing, TRACE_LINE), /pipeline\.json not found/);
});

void test('deletePoolMessageAt checks the pointed pipeline, not the l4 one', async () => {
  const host = installHost();
  const pool = await loadPool();
  const folder = 'mensalidadesAcademia/pool/l2';
  const file = { project: PROJECT, level: 4, folder, shortName: '20260918103000_m-20260918103000_1', extension: '.json' };
  seed(host, folder, file.shortName, `${JSON.stringify(MESSAGE, null, 2)}\n`);
  seed(host, 'mensalidadesAcademia/pipeline', 'pipeline', JSON.stringify({
    schemaVersion: 'x', flowId: 'agentNewSolution5', moduleName: 'mensalidadesAcademia',
    status: 'complete', steps: {}, sourcePrompt: '', invocation: { fast: false, module: 'mensalidadesAcademia', rebuildAll: false },
    updatedAt: AT.toISOString(),
  }));
  const l2 = seed(host, 'mensalidadesAcademia/pipeline', 'pipeline', JSON.stringify({
    schemaVersion: 'l2', moduleName: 'mensalidadesAcademia', updatedAt: AT.toISOString(),
  }), 2);
  const l2Info = { project: PROJECT, level: 2, folder: 'mensalidadesAcademia/pipeline', shortName: 'pipeline', extension: '.json' };
  const path = 'l4/mensalidadesAcademia/pool/l2/20260918103000_m-20260918103000_1.json';

  const traceId = await pool.tracePoolAt(l2Info, { ...TRACE_LINE, file: path });
  assert.equal(traceId, path);
  assert.equal((JSON.parse(l2.content).pool as unknown[]).length, 1);
  assert.equal((await pool.readPoolTrace('mensalidadesAcademia')).length, 0);

  await assert.rejects(pool.deletePoolMessage('mensalidadesAcademia', file, path), /no trace line/);
  assert.equal(await pool.deletePoolMessageAt(l2Info, file, path), path);
  assert.deepEqual(host.deleted, [`${folder}/${file.shortName}`]);
});

// p2_09: o L2 guarda um `menu.json` dentro da própria caixa. Nome fixo, sem `_<thread>_<round>`, não é
// mensagem do pool — a caixa é do dono e ele pode guardar o que quiser lá. Ignorar, não recusar.
void test('listPoolBox ignores a .json that is not a pool message name, from index and from disk', async () => {
  const host = installHost();
  const pool = await loadPool();
  const folder = 'mensalidadesAcademia/pool/l2';
  seed(host, folder, '20260918090000_m-20260918090000_1');
  seed(host, folder, 'menu');
  host.listed[`${PROJECT}_4_${folder}`] = [
    { project: PROJECT, level: 4, folder, shortName: '20260918110000_m-20260918100000_1', extension: '.json' },
    { project: PROJECT, level: 4, folder, shortName: 'menu', extension: '.json' },
    { project: PROJECT, level: 4, folder, shortName: 'draft-notes', extension: '.json' },
  ];

  assert.deepEqual(pool.listPoolBox('mensalidadesAcademia', 'l2').map(file => file.shortName), [
    '20260918090000_m-20260918090000_1',
    '20260918110000_m-20260918100000_1',
  ]);
});

void test('a box with only non-message files is not pending', async () => {
  const host = installHost();
  const pool = await loadPool();
  seed(host, 'mensalidadesAcademia/pool/l2', 'menu');

  assert.equal(pool.poolHasPending('mensalidadesAcademia'), false);
});

void test('isPoolMessageShortName accepts what writePoolMessage generates and rejects the rest', async () => {
  const pool = await loadPool();
  assert.equal(pool.isPoolMessageShortName('20260918090000_mensalidadesAcademia-20260918090000_1'), true);
  assert.equal(pool.isPoolMessageShortName('menu'), false);
  assert.equal(pool.isPoolMessageShortName('20260918090000_m-20260918090000'), false);
  assert.equal(pool.isPoolMessageShortName('m-20260918090000_1'), false);
  // thread com underscore não é nome ilegal de arquivo; quem recusa isso é o normalize, na leitura.
  assert.equal(pool.isPoolMessageShortName('20260918090000_m_20260918090000_1'), true);
});
