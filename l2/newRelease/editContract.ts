/// <mls fileReference="_102035_/l2/newRelease/editContract.ts" enhancement="_blank" />

import type { NewReleaseValidationIssue, Ns5TobeArtifactPath } from '/_102035_/l2/newRelease/tobe.js';

export type NewReleaseEditMode = 'view' | 'edit';
export type NewReleaseTabId = 'general' | 'journeys' | 'ontology' | 'access' | 'rules' | 'workflows' | 'integration';

export interface NewReleaseEditableTab<T = unknown> {
  mode: NewReleaseEditMode;
  readonly dirty: boolean;
  getDraft(): T;
  setIssues(issues: NewReleaseValidationIssue[]): void;
}

export interface NewReleaseChangedDetail {
  path: Ns5TobeArtifactPath;
  jsonPath: string;
  value: unknown;
}

export const NEW_RELEASE_CHANGED_EVENT = 'nr-changed';

export function announceNewReleaseChange(target: EventTarget, detail: NewReleaseChangedDetail): void {
  target.dispatchEvent(new CustomEvent<NewReleaseChangedDetail>(NEW_RELEASE_CHANGED_EVENT, {
    bubbles: true,
    composed: true,
    detail,
  }));
}

export function tabForArtifactPath(path: string): NewReleaseTabId {
  if (path === 'module.defs.ts') return 'general';
  if (path.startsWith('journeys/')) return 'journeys';
  if (path.startsWith('ontology/')) return 'ontology';
  if (path === 'access.defs.ts') return 'access';
  if (path === 'rules.defs.ts') return 'rules';
  if (path === 'workflows.defs.ts') return 'workflows';
  return 'integration';
}

