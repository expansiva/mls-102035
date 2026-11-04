/// <mls fileReference="_102035_/l2/ensaio/hostSimulado.ts" enhancement="_blank" />

import type { IAgentAsync } from '/_102027_/l2/aiAgentBase.js';
import type { createRecordedLlm } from '/_102035_/l2/solution/testing/recordedLlm.js';

interface AgentEntry { createAgent(): IAgentAsync; }
export type RecordedAnswers = Record<string, mls.msg.AIPayload | mls.msg.AIPayload[]>;

/** The model of the rehearsal for steps that have no hand-written answer: `replay` returns the recording, `record` makes the real call. */
export type RehearsalLlm = ReturnType<typeof createRecordedLlm>;

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
  llm?: RehearsalLlm,
) {
  const agent = agentEntry.createAgent();
  const agents = new Map([agent, ...entries.map(entry => entry.createAgent())].map(item => [item.agentName, item]));
  if (!agent.beforePromptImplicit || !agent.beforePromptStep) {
    throw new Error('The replay requires beforePromptImplicit and beforePromptStep.');
  }
  const steps: mls.msg.AIPayload[] = [];
  const intents: mls.msg.AgentIntent[] = [];
  const executedPlans: string[] = [];
  const parents = new Map<number, mls.msg.AIAgentStep>();
  /** Fan-out parents (`executionMode: { type: 'parallel' }`): the worker steps the host made for them. Run one after the other here. */
  const fanouts = new Map<number, number[]>();
  /** Steps whose beforePrompt left them `in_progress` with no prompt: they wait for fan-out children and a barrier step closes them. */
  const started = new Set<number>();
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
        const mode = (intent as { executionMode?: { type?: string; args?: string[] } }).executionMode;
        if (mode?.type === 'parallel') {
          // Like the real host: one child per arg, the arg is the child prompt; the parent closes when its children do.
          const children: number[] = [];
          for (const arg of mode.args ?? []) {
            const planId = (JSON.parse(arg) as { planId?: string }).planId;
            const child: mls.msg.AIAgentStep = {
              type: 'agent', stepId: nextId++, interaction: null, nextSteps: [], status: 'waiting_human_input',
              agentName: step.type === 'agent' ? step.agentName : parent.agentName, stepTitle: planId ?? 'worker', prompt: arg, rags: [],
              planning: { planId: planId ?? String(nextId), dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
            } as mls.msg.AIAgentStep;
            ((step as mls.msg.AIAgentStep).nextSteps ??= []).push(child);
            steps.push(child);
            parents.set(child.stepId, step as mls.msg.AIAgentStep);
            children.push(child.stepId);
          }
          fanouts.set(step.stepId, children);
        }
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
    for (const [parentId, children] of fanouts) {
      const parentStep = steps.find(item => item.stepId === parentId);
      if (parentStep && parentStep.status !== 'completed'
        && children.every(id => ['completed', 'failed'].includes(steps.find(item => item.stepId === id)?.status ?? ''))) parentStep.status = 'completed';
    }
    const unfinished = steps.filter(step => step.status !== 'completed' && !fanouts.has(step.stepId));
    const pending = unfinished.filter(step => !started.has(step.stepId));
    if (!pending.length && unfinished.length) throw new Error(`Replay stopped: ${unfinished.map(step => step.planning?.planId ?? step.stepId).join(', ')} wait for children that never closed them.`);
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
    if (!stepAgent?.beforePromptStep) throw new Error(`Missing public entry for ${step.agentName}`);
    // A fan-out child gets its arg as the sixth parameter, as the real host passes it.
    const args = fanouts.has(parent.stepId) ? String(step.prompt ?? '') : undefined;
    apply(await (stepAgent.beforePromptStep as (...rest: unknown[]) => Promise<mls.msg.AgentIntent[]>)(stepAgent, context, parent, step, ++hookSequential, args));
    if (step.status === 'in_progress' && !step.interaction?.input.length) { started.add(step.stepId); continue; }
    if (step.status !== 'completed' && step.status !== 'failed') {
      if (!step.interaction?.input.length) throw new Error(`Step ${planId} neither completed nor prepared a prompt.`);
      const answer = answers[planId];
      if (!answer && !llm) throw new Error(`Missing recorded answer for ${planId}`);
      if (answer) {
        step.interaction.payload = structuredClone(Array.isArray(answer) ? answer : [answer]);
      } else {
        const system = step.interaction.input.find(item => item.type === 'system');
        const human = step.interaction.input.find(item => item.type === 'human');
        // The raw answer of the provider, as the step stores it before any normalization.
        const raw = await llm!.respond(step.agentName, planId, {
          systemPrompt: system ? String(system.content) : '', humanPrompt: human ? String(human.content) : '',
          tools: step.interaction.tools ?? null,
        });
        step.interaction.payload = [raw as unknown as mls.msg.AIPayload];
      }
      step.status = 'waiting_after_prompt';
      if (!stepAgent.afterPromptStep) throw new Error(`${step.agentName} prepared a prompt for ${planId} and has no afterPromptStep.`);
      apply(await (stepAgent.afterPromptStep as (...rest: unknown[]) => Promise<mls.msg.AgentIntent[]>)(stepAgent, context, parent, step, ++hookSequential, args));
    }
  }
  throw new Error('Replay exceeded 100 hook iterations.');
}
