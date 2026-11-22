/// <mls fileReference="_102035_/l2/solution/gates/workflowReceives/contracts.ts" enhancement="_blank"/>

export interface WorkflowReceivesFunctionRow {
  processId: string;
  functionId: string;
  receives?: string;
  /** True when the process of the function has a `wait` task. */
  processHasWait: boolean;
  /** The `trigger.event` of the process, when it starts on an event. */
  processTriggerEvent?: string;
}

export interface WorkflowReceivesIssue {
  path: string;
  message: string;
}

/** Code of the error for a `receives` that names no serve operation, repeats an operation, or sits in a process that neither waits for it nor starts on it. */
export const WORKFLOW_RECEIVES = 'WORKFLOW_RECEIVES';

/** `receives` names a `serve` operation of the integration, at most one function per operation, in a process that waits for the arrival (a `wait` task) or starts on it (`trigger.event` is that operation). */
export function checkWorkflowReceives(
  functions: readonly WorkflowReceivesFunctionRow[],
  serveOperations: readonly string[],
): WorkflowReceivesIssue[] {
  const known = new Set(serveOperations);
  const seen = new Map<string, string>();
  const issues: WorkflowReceivesIssue[] = [];
  for (const fn of functions) {
    if (fn.receives === undefined) continue;
    const path = `workflows.${fn.processId}.functions.${fn.functionId}.receives`;
    if (!known.has(fn.receives)) {
      issues.push({ path, message: `receives ${fn.receives} of ${fn.functionId} is not a serve operation of the integration (${[...known].join(', ') || 'none'}).` });
      continue;
    }
    const first = seen.get(fn.receives);
    if (first !== undefined) {
      issues.push({ path, message: `${fn.receives} is received by ${first} and by ${fn.functionId}: at most one function receives an operation.` });
      continue;
    }
    seen.set(fn.receives, fn.functionId);
    if (!fn.processHasWait && fn.processTriggerEvent !== fn.receives) {
      issues.push({ path, message: `${fn.functionId} receives ${fn.receives} but process ${fn.processId} has no wait task for the occurrence to wait in and does not start on ${fn.receives} (its trigger.event).` });
    }
  }
  return issues;
}
