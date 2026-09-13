/// <mls fileReference="_102035_/l2/newRelease/l4Reader.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  failedStepOf,
  listNs5ModulesFromFiles,
  listReadableProjectsFromFiles,
  runtimeConfigHasModules,
} from './helpers/l4Reader.js';
import type { Ns5PipelineState } from '../solution/types.js';

const files = {
  first: { project: 102047, level: 4, folder: 'financeiro', shortName: 'module', extension: '.defs.ts' },
  second: { project: 102047, level: 4, folder: 'mensalidadesAcademia', shortName: 'module', extension: '.defs.ts' },
  nested: { project: 102047, level: 4, folder: 'financeiro/ontology', shortName: 'module', extension: '.defs.ts' },
  deleted: { project: 102048, level: 4, folder: 'ignored', shortName: 'module', extension: '.defs.ts', status: 'deleted' },
  other: { project: 102035, level: 2, folder: '', shortName: 'module', extension: '.ts' },
};

test('module discovery is project-explicit and accepts only l4 module roots', () => {
  assert.deepEqual(listReadableProjectsFromFiles(files), [102047]);
  assert.deepEqual(listNs5ModulesFromFiles(files, 102047), ['financeiro', 'mensalidadesAcademia']);
  assert.deepEqual(listNs5ModulesFromFiles(files, 102035), []);
});

test('failed step comes from the pipeline, not from module ordering', () => {
  const pipeline = {
    steps: {
      module10: { status: 'approved' },
      ontology30: { status: 'failed' },
    },
  } as Ns5PipelineState;
  assert.equal(failedStepOf(pipeline), 'ontology30');
  assert.equal(failedStepOf(null), null);
});

test('project eligibility requires its own module list in l5/config.json', () => {
  const config = {
    projects: {
      '102047': { type: 'client', modules: [{ moduleId: 'agendaClinica' }] },
      '102048': { type: 'client', modules: [] },
    },
  };
  assert.equal(runtimeConfigHasModules(config, 102047), true);
  assert.equal(runtimeConfigHasModules(config, 102048), false);
  assert.equal(runtimeConfigHasModules({}, 102047), false);
});
