/// <mls fileReference="_102035_/l2/newRelease/widgets/changeEffortModel.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { readReviewArtifact, reviewArtifactFile } from '../helpers/backendReader.js';
import type { ChangeEffortFile } from '/_102035_/l2/solution/poolPlan.js';
import { mergeChangeEffort } from '/_102035_/l2/solution/gates/changeEffort/gate.js';
import { buildChangeEffortView } from './changeEffortModel.js';

function fixture(): ChangeEffortFile {
  return JSON.parse(readFileSync(new URL('./fixtures/changeEffort-agendaClinica-regra-anotacao.json', import.meta.url), 'utf8'));
}

test('golden fixture preserves the item, two master answers and merged effort', () => {
  const value = fixture();
  const view = buildChangeEffortView({ status: 'ok', path: '', value });
  assert.equal(view.kind, 'ready');
  assert.equal(view.status, 'simple');
  assert.equal(view.items.length, 1);
  assert.deepEqual(view.items[0].item, {
    id: value.request.items[0].changeId, kind: 'rule', op: 'changed', entity: 'Consulta',
  });
  assert.equal(view.items[0].answers.length, 2);
  assert.deepEqual(view.items[0].answers, value.perItem[0].answers);
  assert.deepEqual(view.merged, value.merged);
  assert.deepEqual(view.untouched, value.untouched);
});

test('blocked effort exposes only the validated abend reason', () => {
  const value = fixture();
  const answer = value.perItem[0].answers[0];
  answer.status = 'abend';
  answer.abend = { reason: 'unsupported change' };
  Object.assign(answer.abend, { internal: 'not part of the contract' });
  value.merged = mergeChangeEffort(value.perItem);
  value.status = 'blocked';
  const view = buildChangeEffortView({ status: 'ok', path: '', value });
  assert.equal(view.kind, 'ready');
  assert.equal(view.status, 'blocked');
  assert.deepEqual(view.items[0].answers[0].abend, { reason: 'unsupported change' });
});

test('missing and invalid reads stay distinct and invalid structure is rejected by the gate', () => {
  assert.equal(buildChangeEffortView({ status: 'missing', path: '' }).kind, 'missing');
  for (const read of [
    { status: 'invalid' as const, path: '' },
    { status: 'ok' as const, path: '', value: '{' },
    { status: 'ok' as const, path: '', value: { ...fixture(), merged: {} } },
  ]) {
    const view = buildChangeEffortView(read);
    assert.equal(view.kind, 'invalid');
    assert.equal(view.errorCode, 'review.effort.invalid');
    assert.deepEqual(view.items, []);
  }
});

test('reader uses Studio files at normal and candidate roots and preserves existing artifacts', async () => {
  const savedMls = globalThis.mls;
  const files: Record<string, unknown> = {};
  const getKeyToFile = (file: ReturnType<typeof reviewArtifactFile>) => JSON.stringify(file);
  globalThis.mls = { stor: { files, getKeyToFile } } as unknown as typeof mls;
  try {
    for (const root of [undefined, 'agendaClinica/tobe/changes/change1/revisions/rev1/candidate']) {
      for (const name of ['changeEffort', 'backend', 'effort'] as const) {
        const file = reviewArtifactFile(102047, 'agendaClinica', name, root);
        const folder = `${root || 'agendaClinica'}/pool/${name === 'changeEffort' ? 'l4' : 'l2/web'}`;
        assert.deepEqual(file, { project: 102047, level: 4, folder, shortName: name, extension: '.json' });
        const key = getKeyToFile(file);
        const path = `l4/${folder}/${name}.json`;
        assert.deepEqual(await readReviewArtifact(102047, 'agendaClinica', name, root), { status: 'missing', path });
        const value = name === 'changeEffort' ? fixture() : { artifact: name };
        files[key] = { getContent: async () => JSON.stringify(value) };
        assert.deepEqual(await readReviewArtifact(102047, 'agendaClinica', name, root), { status: 'ok', path, value });
        files[key] = { getContent: async () => '{' };
        assert.deepEqual(await readReviewArtifact(102047, 'agendaClinica', name, root), { status: 'invalid', path });
        files[key] = { getContent: async () => { throw new Error('Studio unavailable'); } };
        assert.deepEqual(await readReviewArtifact(102047, 'agendaClinica', name, root), { status: 'invalid', path });
        files[key] = { status: 'deleted' };
        assert.deepEqual(await readReviewArtifact(102047, 'agendaClinica', name, root), { status: 'missing', path });
      }
    }
  } finally {
    globalThis.mls = savedMls;
  }
});
