/// <mls fileReference="_102035_/l2/solution/helpers/workflowReceivesForm.ts" enhancement="_blank"/>

/**
 * How a process function says which arrival of a connection it answers. One text for the workflows50 prompt
 * (`prompt.md`, placeholder below) and for the New Release edit of the workflows.
 */
export const NS5_WORKFLOW_RECEIVES_PLACEHOLDER = '{{ns5WorkflowReceivesForm}}';

export const NS5_WORKFLOW_RECEIVES_FORM =
  'A function that answers an arrival of a connection (the cm tells the module something) says so in `receives`, as `<connectionId>.<operationId>` of a `serve` row of the integration, for example `"receives": "cm.agentDraftReady"`. At most one function receives a given operation, and the function belongs to a process that has a `wait` task, which is where the occurrence waits for that arrival.';

/** Fills the placeholder of a prompt file with the shared text. */
export function withNs5WorkflowReceivesForm(prompt: string): string {
  return prompt.split(NS5_WORKFLOW_RECEIVES_PLACEHOLDER).join(NS5_WORKFLOW_RECEIVES_FORM);
}
