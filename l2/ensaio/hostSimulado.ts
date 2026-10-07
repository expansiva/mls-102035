/// <mls fileReference="_102035_/l2/ensaio/hostSimulado.ts" enhancement="_blank" />

import type { IAgentAsync } from '/_102027_/l2/aiAgentBase.js';

interface AgentEntry { createAgent(): IAgentAsync; }
export type RecordedAnswers = Record<string, mls.msg.AIPayload | mls.msg.AIPayload[]>;

/** Browser storage surface used by the real candidate draft store in this sequential replay. */
export function createMemoryIndexedDb(): IDBFactory {
  const databases = new Map<string, Map<string, Map<string, unknown>>>();
  return {
    open(name: string) {
      const fresh = !databases.has(name);
      if (fresh) databases.set(name, new Map());
      const stores = databases.get(name)!;
      const database = {
        objectStoreNames: { contains: (store: string) => stores.has(store) },
        createObjectStore: (store: string) => { stores.set(store, new Map()); },
        close() {},
        transaction(storeName: string) {
          const rows = stores.get(storeName);
          if (!rows) throw new Error(`Unknown replay object store ${storeName}`);
          let pending = 0;
          let aborted = false;
          const transaction: any = {
            abort() { aborted = true; queueMicrotask(() => transaction.onabort?.()); },
            objectStore() {
              function request(operation: () => unknown) {
                pending++;
                const result: any = {};
                queueMicrotask(() => {
                  if (aborted) return;
                  try { result.result = structuredClone(operation()); result.onsuccess?.(); }
                  catch (error) { result.error = error; result.onerror?.(); transaction.abort(); }
                  pending--;
                  if (!pending && !aborted) queueMicrotask(() => transaction.oncomplete?.());
                });
                return result;
              }
              return {
                get: (key: string) => request(() => rows.get(key)),
                getAll: () => request(() => [...rows.values()]),
                add: (row: { key: string }) => request(() => {
                  if (rows.has(row.key)) throw new Error('ConstraintError');
                  rows.set(row.key, structuredClone(row)); return row.key;
                }),
                put: (row: { key: string }) => request(() => { rows.set(row.key, structuredClone(row)); return row.key; }),
                delete: (key: string) => request(() => { rows.delete(key); }),
              };
            },
          };
          return transaction;
        },
      };
      const request: any = { result: database };
      queueMicrotask(() => { if (fresh) request.onupgradeneeded?.(); request.onsuccess?.(); });
      return request;
    },
  } as unknown as IDBFactory;
}

/** In-memory host: the agent sees its public hooks and the same task tree throughout the run. */
export async function runUntilDone(
  agentEntry: AgentEntry,
  context: mls.msg.ExecutionContext,
  answers: RecordedAnswers,
  entries: AgentEntry[] = [],
) {
  const agent = agentEntry.createAgent();
  const agents = new Map([agent, ...entries.map(entry => entry.createAgent())].map(item => [item.agentName, item]));
  if (!agent.beforePromptImplicit || !agent.beforePromptStep || !agent.afterPromptStep) {
    throw new Error('The replay requires the three public prompt lifecycle hooks.');
  }
  const steps: mls.msg.AIPayload[] = [];
  const intents: mls.msg.AgentIntent[] = [];
  const executedPlans: string[] = [];
  const parents = new Map<number, mls.msg.AIAgentStep>();
  let nextId = 1;
  let hookSequential = 0;
  let activeStep: mls.msg.AIAgentStep | undefined;

  function apply(batch: mls.msg.AgentIntent[]) {
    for (const intent of batch) {
      intents.push(intent);
      if (intent.type === 'add-message-ai') {
        if (!intent.skipRootLLM) throw new Error('The replay requires a root with skipRootLLM.');
        const root: mls.msg.AIAgentStep = {
          type: 'agent', stepId: nextId++, agentName: intent.request.agentName,
          status: 'completed', rags: [], nextSteps: [],
          interaction: { input: structuredClone(intent.request.inputAI), cost: 0, trace: [], payload: [] },
        };
        context.task = {
          PK: 'task/#ensaio', SK: 'metadata', title: intent.request.taskTitle,
          owner: context.message.senderId, team: null, status: 'in progress',
          last_updated: 0, last_update_log: null,
          iaCompressed: { nextSteps: [root], longMemory: { ...intent.request.longTermMemory },
            queueBackEnd: [], queueFrontEnd: [], isTest: context.isTest },
        };
        context.message.taskId = 'ensaio';
        steps.push(root);
      } else if (intent.type === 'add-step') {
        const parent = steps.find(item => item.stepId === intent.parentStepId);
        if (!parent || parent.type !== 'agent') throw new Error(`Unknown parent step ${intent.parentStepId}`);
        const step = structuredClone(intent.step);
        step.stepId = nextId++;
        (parent.nextSteps ??= []).push(step);
        steps.push(step);
        parents.set(step.stepId, parent);
      } else if (intent.type === 'update-status') {
        const step = steps.find(item => item.stepId === intent.stepId);
        if (!step || step.type !== 'agent') throw new Error(`Unknown update step ${intent.stepId}`);
        step.status = intent.status;
        if (intent.traceMsg) {
          step.interaction ??= { input: [], cost: 0, trace: [], payload: null };
          step.interaction.trace.push(intent.traceMsg);
        }
        if (intent.cleaner && step.interaction) {
          step.interaction.input = [];
          if (intent.cleaner === 'input_output') step.interaction.payload = null;
        }
        if (intent.newTaskTitle && context.task) context.task.title = intent.newTaskTitle;
      } else if (intent.type === 'prompt_ready') {
        const step = activeStep;
        if (!step || parents.get(step.stepId)?.stepId !== intent.parentStepId
          || intent.hookSequential !== hookSequential) throw new Error('Prompt does not match the current hook.');
        step.interaction = { input: [
          ...(intent.systemPrompt ? [{ type: 'system' as const, content: intent.systemPrompt }] : []),
          { type: 'human', content: intent.humanPrompt },
        ], tools: intent.tools, toolChoice: intent.toolChoice, cost: 0, trace: [], payload: null };
      } else if (intent.type !== 'remove-hook') {
        throw new Error(`Unsupported replay intent ${intent.type}`);
      }
    }
  }

  apply(await agent.beforePromptImplicit(agent, context, context.message.content));
  for (let iteration = 0; iteration < 100; iteration++) {
    const failed = steps.find(step => step.status === 'failed');
    if (failed) {
      if (!context.task) throw new Error('The agent did not create a task.');
      context.task.status = 'failed';
      context.task.last_update_log = `Task failed at ${new Date().toISOString()} | reason: ${failed.interaction?.trace.at(-1) ?? ''}`;
      return { context, steps, executedPlans, intents };
    }
    const pending = steps.filter(step => step.status !== 'completed');
    if (!pending.length) {
      if (!context.task) throw new Error('The agent did not create a task.');
      context.task.status = 'done';
      return { context, steps, executedPlans, intents };
    }
    const step = pending.find(item => (item.planning?.dependsOn ?? []).every(id =>
      steps.some(dependency => dependency.planning?.planId === id && dependency.status === 'completed')));
    if (!step || step.type !== 'agent') throw new Error('Replay stopped with unresolved step dependencies.');
    const parent = parents.get(step.stepId)!;
    const planId = step.planning?.planId ?? String(step.stepId);
    activeStep = step;
    executedPlans.push(planId);
    const stepAgent = agents.get(step.agentName);
    if (!stepAgent?.beforePromptStep || !stepAgent.afterPromptStep) throw new Error(`Missing public entry for ${step.agentName}`);
    apply(await stepAgent.beforePromptStep(stepAgent, context, parent, step, ++hookSequential));
    if (step.status !== 'completed' && step.status !== 'failed') {
      if (!step.interaction?.input.length) throw new Error(`Step ${planId} neither completed nor prepared a prompt.`);
      const answer = answers[planId];
      if (!answer) throw new Error(`Missing recorded answer for ${planId}`);
      step.interaction.payload = structuredClone(Array.isArray(answer) ? answer : [answer]);
      step.status = 'waiting_after_prompt';
      apply(await stepAgent.afterPromptStep(stepAgent, context, parent, step, ++hookSequential));
    }
  }
  throw new Error('Replay exceeded 100 hook iterations.');
}
