/// <mls fileReference="_102035_/l2/newRelease/editContract.ts" enhancement="_blank" />

import type { NewReleaseValidationIssue, Ns5TobeArtifactPath } from '/_102035_/l2/solution/candidate/tobePaths.js';

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
  languageOnly?: boolean;
  complete?: (error?: unknown) => void;
}


export const NEW_RELEASE_CHANGED_EVENT = 'nr-changed';

export function announceNewReleaseChange(target: EventTarget, detail: NewReleaseChangedDetail): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const complete = (error?: unknown) => error ? reject(error) : resolve();
    const accepted = !target.dispatchEvent(new CustomEvent<NewReleaseChangedDetail>(NEW_RELEASE_CHANGED_EVENT, {
      bubbles: true, composed: true, cancelable: true, detail: { ...detail, complete },
    }));
    if (!accepted) reject(new Error('new-release.save.unhandled'));
  });
}

/** Shared navigation contract: tabs provide semantic nodes and handle their IDs. */
export interface NewReleaseTextNode {
  id: string;
  label: string;
  changed?: boolean;
  suffix?: string;
  value: string;
  children: NewReleaseTextNode[];
}

export interface NewReleaseTabPresentation {
  nodes: NewReleaseTextNode[];
  detail: boolean;
  canBack?: boolean;
  filters?: {id: string; label: string; rootIds: string[]}[];
  select: (id: string) => void;
  back: () => void;
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


/** Ask the common container before discarding a tab's draft. */
export function canDiscardNewReleaseDraft(target: EventTarget): boolean {
  return target.dispatchEvent(new CustomEvent('nr-before-discard', { bubbles: true, cancelable: true }));
}

/** Explicit accepted navigation only; never emitted from render/updated. */
export interface NewReleasePresentationRequest { mode: 'graph' | 'text'; }
export function requestNewReleasePresentation(target: EventTarget, mode: NewReleasePresentationRequest['mode']) {
  target.dispatchEvent(new CustomEvent<NewReleasePresentationRequest>('nr-presentation-request', {bubbles: true, composed: true, detail: {mode}}));
}

export interface NewReleaseEditRequest { id: string }
export const NEW_RELEASE_GENERAL_INDICATORS_EDIT_ID = 'general:indicators';
export function requestNewReleaseEdit(target: EventTarget, id: string) {
  target.dispatchEvent(new CustomEvent<NewReleaseEditRequest>('nr-request-edit', {bubbles: true, composed: true, detail: {id}}));
}
