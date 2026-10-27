/// <mls fileReference="_102035_/l2/solution/lucideIcons.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { isLucideIcon, LUCIDE_ICONS, LUCIDE_PACKAGE, LUCIDE_VERSION } from '/_102035_/l2/solution/lucideIcons.js';

test('p4_74 lucide catalog is the pinned 1.62.0 name list', () => {
  assert.equal(LUCIDE_PACKAGE, 'lucide-static');
  assert.equal(LUCIDE_VERSION, '1.62.0');
  assert.equal(LUCIDE_ICONS.length, 2176);
  assert.equal(LUCIDE_ICONS.includes('clipboard-check'), true);
  assert.equal(isLucideIcon('clipboard-check'), true);
  assert.equal(isLucideIcon('not-an-icon'), false);
  const ordered = [...LUCIDE_ICONS].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  assert.deepEqual(ordered, [...LUCIDE_ICONS]);
});
