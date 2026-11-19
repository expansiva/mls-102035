/// <mls fileReference="_102035_/l2/newRelease/integrationRequests.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { readIntegrationWorkspace } from './integrationRequests.js';

const project = 102047;
const info = (folder: string, shortName: string) => ({ project, level: 4, folder, shortName, extension: '.defs.ts' });
const defs = (value: unknown) => `export const artifact = ${JSON.stringify(value)} as const;`;

test('reads sibling systems, accepts absent sibling integration, and reports read failures', async () => {
  const saved = globalThis.mls;
  const files: Record<string, unknown> = {};
  const key = (file: object) => JSON.stringify(file);
  globalThis.mls = { stor: { files, getKeyToFile: key } } as unknown as typeof mls;
  const put = (file: object, value: unknown) => {
    files[key(file)] = { ...file, getContent: async () => defs(value) };
  };
  try {
    put(info('organization', 'registry'), { modules: [
      { moduleName: 'orders', roles: [] }, { moduleName: 'billing', roles: [] },
      { moduleName: 'empty', roles: [] }, { moduleName: 'broken', roles: [] },
    ] });
    const system = { id: 'payments', title: 'Payments', description: 'Pay', settings: [], operations: [] };
    put(info('billing', 'integration'), { externalSystems: [system] });
    files[key(info('broken', 'integration'))] = {
      ...info('broken', 'integration'), getContent: async () => { throw new Error('storage failed'); },
    };
    const workspace = await readIntegrationWorkspace(project, 'orders');
    assert.deepEqual(workspace.siblingSystems, [system]);
    assert.deepEqual(workspace.errors, [{ path: 'l4/broken/integration.defs.ts', message: 'storage failed' }]);
    assert.equal(workspace.siblings.length, 3);
  } finally { globalThis.mls = saved; }
});

