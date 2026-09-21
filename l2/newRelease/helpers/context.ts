/// <mls fileReference="_102035_/l2/newRelease/helpers/context.ts" enhancement="_blank" />

export type NewReleaseVersion = 'asis' | 'tobe' | `release:${string}`;

export function historicalReleaseId(version: NewReleaseVersion): string | null {
  if (!version.startsWith('release:')) return null;
  const id = version.slice('release:'.length);
  if (!/^[a-zA-Z0-9-]+$/u.test(id)) throw new Error('Invalid release identifier.');
  return id;
}

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
