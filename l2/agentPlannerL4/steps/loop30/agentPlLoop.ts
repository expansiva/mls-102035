/// <mls fileReference="_102035_/l2/agentPlannerL4/steps/loop30/agentPlLoop.ts" enhancement="_blank"/>

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import {
  applyPlLoopDecision,
  createLoopInvokeStep,
  createPlInvokeStep,
  createPlLoopWaitStep,
  existingModuleName,
  findOldestBoxMessage,
  gatherPlLoopDecision,
  invokeSideOf,
  nextLoopWaitTick,
  PL_AGENT_NAME,
  PL_L2_AGENT,
  plInvokeOutput,
  plRoundPlanId,
  plRoundTitle,
  plannerAgentPresent,
  PL_L1_AGENT,
  writePlOrchestration,
  type PlLoopInvoke,
  type PlOrchestrationRow,
} from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
import {
  addPlStep,
  planIdOf,
  PL_STEP_HOOKS,
  updateStatus,
} from '/_102035_/l2/agentPlannerL4/helpers/plDispatch.js';
import { listPoolBox, tracePool } from '/_102035_/l2/solution/pool.js';

export async function beforePlLoopPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const all = getAllSteps(context.task?.iaCompressed?.nextSteps);
  if (all.some(item => item.planning?.planId === 'loop30-done')) {
    return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'loop30 already finished.')];
  }

  const moduleName = existingModuleName(memoryString(context, 'moduleName') || moduleNameFromPrompt(step))
    || memoryString(context, 'moduleName')
    || moduleNameFromPrompt(step);
  const thread = threadFromDispatch(all);
  const failed = failedInvoke(all);
  if (failed) {
    const message = `${failed} failed`;
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', message)];
  }

  const pending = pendingForeignPlanIds(all, planIdOf(step));
  if (pending.length) {
    return [
      addPlStep(context, parentStep, createPlLoopWaitStep(moduleName, pending, nextLoopWaitTick(planIdOf(step)))),
      updateStatus(context, parentStep, step, hookSequential, 'completed', `loop30 waiting for ${pending[0]}.`),
    ];
  }

  const now = new Date();
  const l1 = await maybeL1Step(moduleName, thread, all, now);
  if (l1) {
    return [
      addPlStep(context, parentStep, l1.step),
      addPlStep(context, parentStep, createPlLoopWaitStep(moduleName, [l1.planId], nextLoopWaitTick(planIdOf(step)))),
      updateStatus(context, parentStep, step, hookSequential, 'completed', `loop30 waiting for ${l1.planId}.`),
    ];
  }

  const effort = await maybeEffortStep(moduleName, thread, all, now);
  if (effort) {
    return [
      addPlStep(context, parentStep, effort.step),
      addPlStep(context, parentStep, createPlLoopWaitStep(moduleName, [effort.planId], nextLoopWaitTick(planIdOf(step)))),
      updateStatus(context, parentStep, step, hookSequential, 'completed', `loop30 waiting for ${effort.planId}.`),
    ];
  }

  const silent = await silentPlanId(moduleName, thread, all);
  if (silent) {
    const table = await orchestrationTable(all, 1, false, moduleName, thread);
    await writePlOrchestration(moduleName, table);
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', `${silent} ran without output`)];
  }

  const decision = await gatherPlLoopDecision(moduleName, thread);
  if (decision.invoke.length) {
    const chained = chainInvokes(moduleName, decision.invoke);
    const last = chained[chained.length - 1];
    const lastId = last?.planning?.planId || '';
    await applyPlLoopDecision(moduleName, decision, now);
    return [
      ...chained.map(child => addPlStep(context, parentStep, child)),
      addPlStep(context, parentStep, createPlLoopWaitStep(moduleName, [lastId], nextLoopWaitTick(planIdOf(step)))),
      updateStatus(context, parentStep, step, hookSequential, 'completed', `loop30 waiting for ${lastId}.`),
    ];
  }

  await applyPlLoopDecision(moduleName, decision, now);
  const table = await orchestrationTable(all, decision.maxRound, decision.disputed.length > 0, moduleName, thread);
  await writePlOrchestration(moduleName, table);
  const l1Count = listPoolBox(moduleName, 'l1').length;
  const l2Count = listPoolBox(moduleName, 'l2').length;
  const status = decision.status || `round ${decision.maxRound} complete.`;
  return [
    doneAnchor(context, parentStep, moduleName, status, decision.maxRound, l1Count, l2Count, table),
    updateStatus(context, parentStep, step, hookSequential, 'completed', status),
  ];
}

export async function afterPlLoopPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const message = 'loop30 is deterministic and must never receive an LLM response.';
  return [updateStatus(context, parentStep, step, hookSequential, 'failed', message)];
}

function doneAnchor(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  moduleName: string,
  status: string,
  maxRound: number,
  l1Count: number,
  l2Count: number,
  table: PlOrchestrationRow[],
): mls.msg.AgentIntentAddStep {
  return addPlStep(context, parentStep, {
    type: 'result',
    stepId: 0,
    interaction: null,
    stepTitle: 'Loop done',
    status: 'completed',
    nextSteps: [],
    result: JSON.stringify({
      moduleName, status, maxRound, l1Count, l2Count, table, completedStep: 'loop30', nextStep: '',
    }),
    planning: { planId: 'loop30-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  } as mls.msg.AIResultStep);
}

function threadFromDispatch(all: mls.msg.AIPayload[]): string {
  const done = all.find(item => item.planning?.planId === 'dispatch20-done');
  if (!done || done.type !== 'result') return '';
  try {
    const parsed = JSON.parse(String((done as mls.msg.AIResultStep).result)) as { thread?: unknown };
    return typeof parsed.thread === 'string' ? parsed.thread : '';
  } catch {
    return '';
  }
}

function stepByPlanId(all: mls.msg.AIPayload[], planId: string): mls.msg.AIPayload | undefined {
  return all.find(item => item.planning?.planId === planId);
}

function isOpen(step: mls.msg.AIPayload | undefined): boolean {
  if (!step) return false;
  return step.status !== 'completed' && step.status !== 'failed';
}

function failedInvoke(all: mls.msg.AIPayload[]): string {
  for (const item of all) {
    if (item.status !== 'failed') continue;
    const id = item.planning?.planId || '';
    if (/^(l2-r|l1-r|l2-effort-r)\d+$/.test(id)) return id;
  }
  return '';
}

/** Open L2/L1 steps (the agent step or the children it scheduled). dependsOn of an
 *  agent step fires at schedule time; the box is what waits for the artifact. */
function pendingForeignPlanIds(all: mls.msg.AIPayload[], currentPlanId: string): string[] {
  const ids: string[] = [];
  for (const item of all) {
    if (item.type !== 'agent') continue;
    if (!isOpen(item)) continue;
    const id = item.planning?.planId || '';
    if (!id || id === currentPlanId) continue;
    if (item.agentName === PL_AGENT_NAME) continue;
    ids.push(id);
  }
  return ids;
}

function latestCompletedRound(all: mls.msg.AIPayload[], side: 'l1' | 'l2' | 'effort'): number {
  const prefix = side === 'effort' ? 'l2-effort-r' : `${side}-r`;
  let max = 0;
  for (const item of all) {
    const id = item.planning?.planId || '';
    if (item.status !== 'completed' || !id.startsWith(prefix)) continue;
    const round = Number(id.slice(prefix.length));
    if (Number.isInteger(round)) max = Math.max(max, round);
  }
  return max;
}

async function maybeL1Step(
  moduleName: string,
  thread: string,
  all: mls.msg.AIPayload[],
  now: Date,
): Promise<{ step: mls.msg.AIAgentStep; planId: string } | null> {
  if (!thread || !plannerAgentPresent(PL_L1_AGENT)) return null;
  const l2Round = latestCompletedRound(all, 'l2');
  if (!l2Round) return null;
  const planId = plRoundPlanId('l1', l2Round);
  if (stepByPlanId(all, planId)) return null;
  const found = await findOldestBoxMessage(moduleName, 'l1', 'l2', thread);
  if (!found) return null;
  await tracePool(moduleName, {
    at: now.toISOString(),
    file: found.path,
    from: found.message.from,
    to: found.message.to,
    thread: found.message.thread,
    round: found.message.round,
    mode: found.message.mode,
    outcome: 'delivered',
  });
  return {
    planId,
    step: createPlInvokeStep({
      agentName: PL_L1_AGENT,
      moduleName,
      thread,
      file: found.path,
      planId,
      stepTitle: plRoundTitle('l1', l2Round),
    }),
  };
}

async function maybeEffortStep(
  moduleName: string,
  thread: string,
  all: mls.msg.AIPayload[],
  now: Date,
): Promise<{ step: mls.msg.AIAgentStep; planId: string } | null> {
  if (!thread || !plannerAgentPresent(PL_L2_AGENT)) return null;
  const l1Round = latestCompletedRound(all, 'l1');
  if (!l1Round) return null;
  const planId = plRoundPlanId('effort', l1Round);
  if (stepByPlanId(all, planId)) return null;
  const found = await findOldestBoxMessage(moduleName, 'l2', 'l1', thread);
  if (!found) return null;
  await tracePool(moduleName, {
    at: now.toISOString(),
    file: found.path,
    from: found.message.from,
    to: found.message.to,
    thread: found.message.thread,
    round: found.message.round,
    mode: found.message.mode,
    outcome: 'delivered',
  });
  return {
    planId,
    step: createPlInvokeStep({
      agentName: PL_L2_AGENT,
      moduleName,
      thread,
      file: found.path,
      planId,
      stepTitle: plRoundTitle('effort', l1Round),
    }),
  };
}

function chainInvokes(moduleName: string, invoke: PlLoopInvoke[]): mls.msg.AIAgentStep[] {
  const l2 = invoke.find(item => invokeSideOf(item) !== 'l1');
  const l1 = invoke.find(item => invokeSideOf(item) === 'l1');
  const steps: mls.msg.AIAgentStep[] = [];
  if (l2) steps.push(createLoopInvokeStep(moduleName, l2));
  if (l1) {
    const dependsOn = l2 ? [plRoundPlanId(invokeSideOf(l2), l2.round)] : [];
    steps.push(createLoopInvokeStep(moduleName, l1, dependsOn));
  }
  if (!l2 && !l1) {
    for (const item of invoke) steps.push(createLoopInvokeStep(moduleName, item));
  }
  return steps;
}

function cellOf(
  all: mls.msg.AIPayload[],
  planId: string,
  missing: boolean,
  disputed: boolean,
  produced: 'done' | 'no-output' = 'done',
): string {
  if (disputed) return 'disputed';
  const step = stepByPlanId(all, planId);
  if (step?.status === 'completed') return produced;
  if (step?.status === 'failed') return 'failed';
  if (missing) return 'missing';
  if (!step) return 'skipped';
  return step.status;
}

async function silentPlanId(moduleName: string, thread: string, all: mls.msg.AIPayload[]): Promise<string> {
  if (!thread) return '';
  const l2Round = latestCompletedRound(all, 'l2');
  const l1Round = latestCompletedRound(all, 'l1');
  const last = Math.max(l2Round, l1Round);
  for (let round = 1; round <= last; round += 1) {
    const l2Id = plRoundPlanId('l2', round);
    if (stepByPlanId(all, l2Id)?.status === 'completed' && await plInvokeOutput('l2', moduleName, thread) === 'no-output') {
      return l2Id;
    }
    const l1Id = plRoundPlanId('l1', round);
    if (stepByPlanId(all, l1Id)?.status === 'completed' && await plInvokeOutput('l1', moduleName, thread) === 'no-output') {
      return l1Id;
    }
  }
  return '';
}

async function orchestrationTable(
  all: mls.msg.AIPayload[],
  maxRound: number,
  disputed: boolean,
  moduleName: string,
  thread: string,
): Promise<PlOrchestrationRow[]> {
  const l2Missing = !plannerAgentPresent(PL_L2_AGENT);
  const l1Missing = !plannerAgentPresent(PL_L1_AGENT);
  const last = Math.max(1, maxRound);
  const l2Out = thread ? await plInvokeOutput('l2', moduleName, thread) : 'no-output';
  const l1Out = thread ? await plInvokeOutput('l1', moduleName, thread) : 'no-output';
  const rows: PlOrchestrationRow[] = [];
  for (let round = 1; round <= last; round += 1) {
    rows.push({
      round,
      l2: cellOf(all, plRoundPlanId('l2', round), l2Missing, disputed && round === last, l2Out),
      l1: cellOf(all, plRoundPlanId('l1', round), l1Missing, disputed && round === last, l1Out),
      effort: cellOf(all, plRoundPlanId('effort', round), l2Missing, false),
    });
  }
  return rows;
}

function memoryString(context: mls.msg.ExecutionContext, key: string): string {
  const value = context.task?.iaCompressed?.longMemory?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function moduleNameFromPrompt(step: mls.msg.AIAgentStep): string {
  try {
    const parsed = JSON.parse(String(step.prompt || '{}')) as { moduleName?: unknown };
    return typeof parsed.moduleName === 'string' ? parsed.moduleName : '';
  } catch {
    return '';
  }
}

PL_STEP_HOOKS.loop30 = {
  beforePromptStep: beforePlLoopPromptStep,
  afterPromptStep: afterPlLoopPromptStep,
};
