/// <mls fileReference="_102035_/l2/newRelease/helpers/changedDot.ts" enhancement="_blank" />

import { html, nothing } from 'lit';
import type { NewReleaseTranslate } from '/_102035_/l2/newRelease/helpers/i18n.js';

export function changedDot(changed: boolean, t: NewReleaseTranslate) {
  return changed ? html`<span class="nr-item__changed" role="img" aria-label=${t('tobe.itemChanged')} title=${t('tobe.itemChanged')}></span>` : nothing;
}
