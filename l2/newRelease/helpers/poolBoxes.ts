/// <mls fileReference="_102035_/l2/newRelease/helpers/poolBoxes.ts" enhancement="_blank" />

import { displayPath } from '/_102035_/l2/solution/fs.js';
import {
  listPoolBoxForProject,
  POOL_MAX_ROUND,
  readPoolMessage,
  type PoolBox,
} from '/_102035_/l2/solution/pool.js';

const REVIEW_POOL_BOXES: readonly PoolBox[] = ['l4', 'l2', 'l1'];

export interface ReviewPoolMessageView {
  file: string;
  from: string;
  round: number;
  maxRound: number;
  mode: string;
  subject: string;
  unreadable: boolean;
}

export interface ReviewPoolBoxView {
  box: PoolBox;
  messages: ReviewPoolMessageView[];
}

/** Diagnostic listing of the three pool boxes for the selected project. Read only. */
export async function readReviewPoolBoxes(project: number, moduleName: string): Promise<ReviewPoolBoxView[]> {
  if (!project || !moduleName) {
    return REVIEW_POOL_BOXES.map(box => ({ box, messages: [] }));
  }
  const boxes: ReviewPoolBoxView[] = [];
  for (const box of REVIEW_POOL_BOXES) {
    const messages: ReviewPoolMessageView[] = [];
    for (const file of listPoolBoxForProject(project, moduleName, box)) {
      try {
        const message = await readPoolMessage(file);
        messages.push({
          file: displayPath(file),
          from: message.from,
          round: message.round,
          maxRound: POOL_MAX_ROUND,
          mode: message.mode,
          subject: message.subject,
          unreadable: false,
        });
      } catch {
        messages.push({
          file: displayPath(file),
          from: '',
          round: 0,
          maxRound: POOL_MAX_ROUND,
          mode: '',
          subject: '',
          unreadable: true,
        });
      }
    }
    boxes.push({ box, messages });
  }
  return boxes;
}
