/// <mls fileReference="_102035_/l2/newRelease/widgets/iconModel.ts" enhancement="_blank" />

import { LUCIDE_ICONS, isLucideIcon } from '../../solution/lucideIcons.js';
import type { Ns5JourneyStep, Ns5WorkflowTask } from '../../solution/types.js';
export type LucideName = typeof LUCIDE_ICONS[number];
export const JOURNEY_ICON_DEFAULTS: Readonly<Record<Ns5JourneyStep['kind'], LucideName>> = {
  locate: 'search', inspect: 'eye', act: 'check', decide: 'git-branch', handoff: 'arrow-right-left',
};
export const WORKFLOW_ICON_DEFAULTS: Readonly<Record<Ns5WorkflowTask['kind'] | 'system', LucideName>> = {
  human: 'user', mechanical: 'settings', system: 'settings', llm: 'bot', wait: 'clock', alert: 'bell',
};
export function resolveNewReleaseIcon(value: string | undefined, fallback: LucideName): LucideName {
  return value && isLucideIcon(value) ? value as LucideName : fallback;
}
export function iconNeedsFallback(value: string | undefined): boolean { return !value || !isLucideIcon(value); }
export function searchNewReleaseIcons(query: string): readonly LucideName[] {
  const search = query.trim().toLowerCase();
  return LUCIDE_ICONS.filter(name => name.includes(search));
}
/** Only catalog selections reach the editor; empty selection removes the optional property. */
export function withNewReleaseIcon<T extends { icon?: string }>(item: T, value: string): T {
  if (value && !isLucideIcon(value)) return item;
  const next: T = { ...item };
  if (value) next.icon = value; else delete next.icon;
  return next;
}
