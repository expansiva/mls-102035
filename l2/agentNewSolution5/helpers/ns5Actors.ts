/// <mls fileReference="_102035_/l2/agentNewSolution5/helpers/ns5Actors.ts" enhancement="_blank"/>

import { readPipeline } from '/_102035_/l2/solution/fs.js';
import type { Ns5ModuleActor, Ns5PipelineState } from '/_102035_/l2/solution/types.js';

/**
 * Actors that survived journeys20's inferred-external drop.
 * Born on `pipeline.steps.module10.actors`; dropped ids on `steps.journeys20.droppedActors`.
 */
export function survivingNs5Actors(pipeline: Ns5PipelineState | null | undefined): Ns5ModuleActor[] {
  const born = pipeline?.steps.module10?.actors || [];
  const dropped = new Set(pipeline?.steps.journeys20?.droppedActors || []);
  return born.filter(actor => actor.actorId && !dropped.has(actor.actorId));
}

export async function readNs5Actors(moduleName: string): Promise<Ns5ModuleActor[]> {
  if (!moduleName) return [];
  return survivingNs5Actors(await readPipeline(moduleName));
}
