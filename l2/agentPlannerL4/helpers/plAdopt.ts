/// <mls fileReference="_102035_/l2/agentPlannerL4/helpers/plAdopt.ts" enhancement="_blank"/>

import { adoptL4Output } from '/_102035_/l2/solution/candidate/moduleAdopt.js';
import { existingModuleName } from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';

export interface PlAdoptDependencies {
  adopt?: typeof adoptL4Output;
  project?: number;
}

/** `/adopt`: the adoption of the review output that the New Release screen does, without the screen. `adopted: {…}` or `refused: <why>`. */
export async function plAdoptText(moduleToken: string, dependencies: PlAdoptDependencies = {}): Promise<string> {
  const moduleName = existingModuleName(moduleToken);
  if (!moduleName) return `refused: module "${moduleToken}" does not exist in l4/.`;
  try {
    const result = await (dependencies.adopt ?? adoptL4Output)(dependencies.project ?? Number(mls.actualProject || 0), moduleName);
    return `adopted: ${JSON.stringify({ moduleName, ...result })}`;
  } catch (error) {
    console.error('[agentPlannerL4] adopt refused', error);
    return `refused: ${error instanceof Error ? error.message : String(error)}`;
  }
}
