/// <mls fileReference="_102035_/l2/agentNewSolution5/helpers/ns5Compile.ts" enhancement="_blank"/>

// p4_20: the last gate of every step that writes a `.defs.ts` is the Studio compiler (conduta
// 28/09, regra 3). Same path as the M2 (`/_102035_/l2/solution/studioCompile.ts`); never a disk tsc.

import { displayPath, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import type { Ns5CompileRecord, Ns5PipelineState, Ns5StepId } from '/_102035_/l2/solution/types.js';

export const NS5_NO_COMPILE_CAPABILITY = 'no compile capability: mls.l2.typescript is not available (Studio extra-libs not loaded)';

/** Steps that write the module's `.defs.ts`; finalize80 requires a clean compile from each. */
export const NS5_DEFS_WRITING_STEPS: readonly Ns5StepId[] = [
  'module10', 'journeys20', 'ontology30', 'rules40', 'workflows50', 'access60', 'integration70',
];

/**
 * Compile the `.defs.ts` a step just wrote. `errors` wins over `unavailable`: a real diagnostic goes
 * to the step's repair even if another file could not be compiled. A file with no model, or with an
 * import that could not be loaded (it would resolve to `any`), is `unavailable`, never clean.
 */
export async function compileNs5Defs(files: readonly Ns5FileInfo[]): Promise<Ns5CompileRecord> {
  // Behind import(): the compile path touches the editor registry, and createAgent() must load on a
  // host without Monaco (ns5CreateAgentGraph.test.ts).
  const {
    compileStudioFile,
    enterStudioCompile,
    formatUnknownError,
    leaveStudioCompile,
    preloadStudioImports,
    releaseBorrowedModelScope,
    studioCompileAvailable,
  } = await import('/_102035_/l2/solution/studioCompile.js');
  if (!studioCompileAvailable()) return { status: 'unavailable', files: files.length, reason: NS5_NO_COMPILE_CAPABILITY };
  const errors: string[] = [];
  const unavailable: string[] = [];
  enterStudioCompile();
  try {
    for (const file of files) {
      const path = displayPath(file);
      try {
        const missing = await preloadStudioImports(file);
        const compiled = await compileStudioFile(file);
        if (!compiled) {
          unavailable.push(`${path}: no model to compile`);
          continue;
        }
        errors.push(...compiled.errors.map(error => `${path}: ${error}`));
        if (!compiled.errors.length && missing.length) unavailable.push(`${path}: imports not loaded: ${missing.join(', ')}`);
      } catch (error) {
        errors.push(`${path}: compile failed: ${formatUnknownError(error)}`);
      }
    }
  } finally {
    leaveStudioCompile();
    releaseBorrowedModelScope();
  }
  if (errors.length) return { status: 'errors', files: files.length, errors };
  if (unavailable.length) return { status: 'unavailable', files: files.length, reason: unavailable.join('; ') };
  return { status: 'clean', files: files.length };
}

/** The repair feedback of a compile with errors, in the same slot the gate issues use. */
export function formatNs5CompileFeedback(record: Ns5CompileRecord): string {
  return [
    'The Studio compiler rejected the written .defs.ts; fix the value so it satisfies its type:',
    ...(record.errors || []).map(error => `- ${error}`),
  ].join('\n');
}

/**
 * finalize80: every writing step must have recorded a clean compile before the oracle runs. One line
 * per step that did not — `unavailable` included (the absence of the compiler is not a proof).
 */
export function ns5CompileBlockers(pipeline: Ns5PipelineState): string[] {
  const blockers: string[] = [];
  for (const stepId of NS5_DEFS_WRITING_STEPS) {
    const compile = pipeline.steps[stepId]?.compile;
    if (compile?.status === 'clean') continue;
    if (!compile) blockers.push(`${stepId}: no compile recorded`);
    else if (compile.status === 'unavailable') blockers.push(`${stepId}: not compiled (${compile.reason || NS5_NO_COMPILE_CAPABILITY})`);
    else blockers.push(`${stepId}: compile errors: ${(compile.errors || []).slice(0, 5).join('; ')}`);
  }
  return blockers;
}
