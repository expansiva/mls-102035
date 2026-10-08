/// <mls fileReference="_102035_/l2/newRelease/widgets/changeEffortModel.ts" enhancement="_blank" />

import type { ReviewArtifactRead } from '/_102035_/l2/newRelease/helpers/backendReader.js';
import type { ChangeEffortFile, EffortAnswer, L4DiffItem } from '/_102035_/l2/solution/poolPlan.js';
import { validateChangeEffort } from '/_102035_/l2/solution/gates/changeEffort/gate.js';

export interface ChangeEffortViewItem {
  item: Pick<L4DiffItem, 'kind' | 'op' | 'entity'> & { id: L4DiffItem['changeId'] };
  answers: EffortAnswer[];
}

export type ChangeEffortView = {
  kind: 'ready';
  errorCode: '';
  status: ChangeEffortFile['status'];
  items: ChangeEffortViewItem[];
  merged: ChangeEffortFile['merged'];
  untouched: ChangeEffortFile['untouched'];
} | {
  kind: 'missing' | 'invalid';
  errorCode: '' | 'review.effort.invalid';
  status: '';
  items: ChangeEffortViewItem[];
  merged: null;
  untouched: null;
};

export function buildChangeEffortView(read: ReviewArtifactRead): ChangeEffortView {
  const empty = { status: '' as const, items: [], merged: null, untouched: null };
  if (read.status === 'missing') return { ...empty, kind: 'missing', errorCode: '' };
  const result = read.status === 'ok' ? validateChangeEffort(read.value) : null;
  if (!result?.ok) return { ...empty, kind: 'invalid', errorCode: 'review.effort.invalid' };
  const file = result.file;
  return {
    kind: 'ready', errorCode: '', status: file.status,
    items: file.request.items.map(item => ({
      item: { kind: item.kind, op: item.op, entity: item.entity, id: item.changeId },
      answers: file.perItem.filter(row => row.item === item.changeId).flatMap(row => row.answers),
    })),
    merged: file.merged,
    untouched: file.untouched,
  };
}
