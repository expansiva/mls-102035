/// <mls fileReference="_102035_/l2/solution/effortRegistry.ts" enhancement="_blank"/>

import type { EffortAnswer, EffortInput } from '/_102035_/l2/solution/poolPlan.js';

export type DescribeEffortFn = (input: EffortInput) => EffortAnswer | Promise<EffortAnswer>;

export type EffortRegistry = Record<string, { describeEffort: DescribeEffortFn } | undefined>;

/** Empty until How publishes one neutral `describeEffort` module per master. The ensaio mutates this object. */
export const effortRegistry: EffortRegistry = {};

export type DescribeEffortImporter = (specifier: string) => Promise<unknown>;

const resolvedByProject = new Map<string, DescribeEffortFn | undefined>();
const failureByProject = new Map<string, string>();

const defaultDescribeEffortImporter: DescribeEffortImporter = (specifier) => import(specifier);
let describeEffortImporter: DescribeEffortImporter = defaultDescribeEffortImporter;

/**
 * `undefined` restores the real `import()`. A replacement is the ensaio default (no master):
 * resolution does not load a module and does not record a load failure.
 * Either way the cache is cleared.
 */
export function setDescribeEffortImporter(fn: DescribeEffortImporter | undefined): void {
  describeEffortImporter = fn ?? defaultDescribeEffortImporter;
  clearDescribeEffortCache();
}

function modulePath(project: string): string | undefined {
  if (!/^[0-9]+$/.test(project)) return undefined;
  return `/_${project}_/l2/helpers/effort/describeEffort.js`;
}

/** Path is built only from the numeric master project. Nothing from the request. Hidden while a replacement importer is installed. */
export function describeEffortModulePath(project: string): string | undefined {
  if (describeEffortImporter !== defaultDescribeEffortImporter) return undefined;
  return modulePath(project);
}

export function clearDescribeEffortCache(): void {
  resolvedByProject.clear();
  failureByProject.clear();
}

/** Why the cached resolution for `project` is missing, if the load was attempted and failed. */
export function describeEffortFailure(project: string): string | undefined {
  return failureByProject.get(project);
}

function asDescribeEffort(mod: unknown): DescribeEffortFn | undefined {
  if (!mod || typeof mod !== 'object' || !('describeEffort' in mod)) return undefined;
  const fn = (mod as { describeEffort?: unknown }).describeEffort;
  return typeof fn === 'function' ? fn as DescribeEffortFn : undefined;
}

/**
 * Injected `effortRegistry[project]` wins. Otherwise one dynamic import per project, cached
 * (including a failed import or a module that does not export `describeEffort`).
 */
export async function resolveDescribeEffort(
  project: string,
  importer?: DescribeEffortImporter,
): Promise<DescribeEffortFn | undefined> {
  const injected = effortRegistry[project]?.describeEffort;
  if (injected) return injected;
  if (resolvedByProject.has(project)) return resolvedByProject.get(project);

  const load = importer ?? describeEffortImporter;
  if (!importer && describeEffortImporter !== defaultDescribeEffortImporter) {
    const specifier = modulePath(project);
    if (specifier) {
      try { await load(specifier); } catch { /* replacement importer: no master */ }
    }
    resolvedByProject.set(project, undefined);
    return undefined;
  }

  const specifier = modulePath(project);
  if (!specifier) {
    resolvedByProject.set(project, undefined);
    return undefined;
  }
  let fn: DescribeEffortFn | undefined;
  let failure: string | undefined;
  try {
    fn = asDescribeEffort(await load(specifier));
    if (!fn) failure = 'module does not export describeEffort';
  } catch (error) {
    fn = undefined;
    const message = error instanceof Error ? error.message : String(error);
    failure = `load failed: ${message}`;
  }
  resolvedByProject.set(project, fn);
  if (failure) {
    failureByProject.set(project, failure);
    console.warn(`describeEffort unavailable at ${specifier}: ${failure}`);
  }
  return fn;
}
