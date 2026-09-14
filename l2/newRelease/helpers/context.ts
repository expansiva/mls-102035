/// <mls fileReference="_102035_/l2/newRelease/helpers/context.ts" enhancement="_blank" />

export type NewReleaseVersion = 'asis' | 'tobe';

export interface NewReleaseContext {
  project: number;
  moduleName: string;
  version: NewReleaseVersion;
}

export const NEW_RELEASE_CONTEXT_EVENT = 'new-release-context-change';
export const NEW_RELEASE_TOBE_UPDATED_EVENT = 'nr-tobe-updated';

export function announceNewReleaseContext(context: NewReleaseContext): void {
  window.dispatchEvent(new CustomEvent<NewReleaseContext>(NEW_RELEASE_CONTEXT_EVENT, { detail: context }));
}
