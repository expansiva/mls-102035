/// <mls fileReference="_102035_/l2/newRelease/helpers/reviewStart.ts" enhancement="_blank" />

import type { ReviewRunStartInput } from './reviewRunWorker.js';
import { prepareReviewStartInput, type PreparedReviewStart } from '/_102035_/l2/solution/candidate/reviewStart.js';

export {
  prepareReviewStartInput,
  type PreparedReviewStart,
  type ReviewStartContext,
  type ReviewStartDependencies,
} from '/_102035_/l2/solution/candidate/reviewStart.js';

/** Exact handler seam: start is unreachable when authoritative preparation refuses the click. */
export async function executePreparedReviewStart<Run>(
  prepare: () => Promise<PreparedReviewStart>,
  start: (input: ReviewRunStartInput) => Promise<Run>,
): Promise<{ prepared: PreparedReviewStart; run: Run }> {
  const prepared = await prepare();
  return { prepared, run: await start(prepared.input) };
}
