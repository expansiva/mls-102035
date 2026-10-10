/// <mls fileReference="_102035_/l2/newRelease/helpers/visibleDiffs.ts" enhancement="_blank" />

import { tabForArtifactPath, type NewReleaseTabId } from '/_102035_/l2/newRelease/editContract.js';
import type { NewReleaseTobeDiff } from '/_102035_/l2/newRelease/tobe.js';

export function visibleDiffs(diffs: readonly NewReleaseTobeDiff[], tab: NewReleaseTabId | 'review'): NewReleaseTobeDiff[] {
  return diffs
    .filter(diff => tab === 'review' || tabForArtifactPath(diff.path) === tab)
    .map(diff => ({ ...diff, entries: diff.entries.filter(entry => entry.jsonPath !== '$.businessHash') }))
    .filter(diff => diff.entries.length > 0);
}
