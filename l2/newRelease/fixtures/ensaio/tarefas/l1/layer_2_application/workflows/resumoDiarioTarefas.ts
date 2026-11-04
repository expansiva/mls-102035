/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/workflows/resumoDiarioTarefas.ts" enhancement="_blank"/>

import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { resolveRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
import { evaluateSchedule } from '/_102034_/l1/server/layer_2_application/schedule/evaluateSchedule.js';
import { occurrenceRecordId } from '/_102034_/l1/workflow/index.js';
import type { OccurrenceKey, TaskOccurrenceSnapshot, WorkflowExecutor } from '/_102034_/l1/workflow/index.js';
import type { TarefaRepository } from '/_102047_/l1/tarefas/layer_2_application/ports/tarefaRepository.js';
import type { Tarefa } from '/_102047_/l1/tarefas/layer_3_domain/entities/tarefa.js';
import { workflowEngine, workflowPlans, noticeState } from '/_102047_/l1/tarefas/layer_1_external/adapters/workflow/engine.js';

const PROJECT_ID = '102047';
const MODULE_ID = 'tarefas';
const PROCESS_ID = 'resumoDiarioTarefas';
const ENTITY = 'Participante';
const FIRST_STEP = 'avisarVencendo';
const SCHEDULE = 'Todo dia às 8h';
const NOT_CONFIRMED = 'NOTICE_DELIVERY_NOT_CONFIRMED';

const TEMPORARY_CODES: readonly string[] = [
  'WORKFLOW_CM_BUSY',
  'WORKFLOW_CM_TASK_INCOMPLETE',
  'WORKFLOW_CM_ROOM_UNAVAILABLE',
  'WORKFLOW_IDENTITY_INCOMPLETE',
];
const DEFINITIVE_CODES: readonly string[] = [
  'WORKFLOW_CM_REJECTED',
  'WORKFLOW_IDENTITY_UNLINKED',
  'WORKFLOW_IDENTITY_REMOVED',
];

// ---------------------------------------------------------------- types

export interface ListarResponsaveisResumoInput {
  /** Moment of the run; defaults to the context clock. */
  now?: Date;
}

export interface ListarResponsaveisResumoOutput {
  dia: string;
  responsaveis: string[];
}

export interface AbrirResumoDiarioInput {
  responsavelId: string;
  now?: Date;
}

export interface AbrirResumoDiarioOutput {
  responsavelId: string;
  dia: string;
  recordId: string | null;
  outcome: 'opened' | 'existing' | 'nothingDue' | 'pending' | 'failed';
  step: string | null;
  done: boolean;
  noticeState: 'sent' | 'pending' | null;
  motivoFalha?: string;
}

export interface ConcluirResumoDiarioInput {
  recordId: string;
}

export interface ConcluirResumoDiarioOutput {
  recordId: string;
  outcome: 'ended' | 'unchanged' | 'conflict';
  step: string;
  done: boolean;
}

// ---------------------------------------------------------------- helpers

function routine(functionId: string): WorkflowExecutor {
  return { kind: 'routine', name: `${MODULE_ID}.${PROCESS_ID}.${functionId}` };
}

function keyOf(recordId: string): OccurrenceKey {
  return { project: PROJECT_ID, module: MODULE_ID, processId: PROCESS_ID, entity: ENTITY, recordId };
}

function dayOf(ctx: RequestContext, date: Date): string {
  const timezone = ctx.organization.timezone;
  if (timezone === undefined || timezone === '') return date.toISOString().slice(0, 10);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function previousDay(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
}

function seedOf(responsavelId: string, day: string): string {
  return `${responsavelId}:${day}`;
}

function nowOf(ctx: RequestContext, now: Date | undefined): Date {
  return now ?? new Date(ctx.clock.nowIso());
}

function isDue(tarefa: Tarefa, day: string): boolean {
  if (tarefa.status === 'concluida' || tarefa.status === 'cancelada') return false;
  if (tarefa.prazo === undefined || tarefa.prazo === '') return false;
  return tarefa.prazo.slice(0, 10) <= day;
}

function latestNoticeState(snapshot: TaskOccurrenceSnapshot): 'sent' | 'pending' {
  const last = [...snapshot.history].reverse().find((entry) => entry.message !== undefined);
  return noticeState(last?.message);
}

function messageOf(tarefas: Tarefa[], day: string): string {
  const lines = tarefas.map((tarefa) => {
    const prazo = (tarefa.prazo ?? '').slice(0, 10);
    const situacao = prazo === day ? 'vence hoje' : `atrasada desde ${prazo}`;
    return `- ${tarefa.titulo} (${situacao})`;
  });
  return `Suas tarefas abertas que vencem hoje ou estão atrasadas:\n${lines.join('\n')}`;
}

async function endOccurrence(
  ctx: RequestContext,
  recordId: string,
  snapshot: TaskOccurrenceSnapshot,
  note: string,
): Promise<TaskOccurrenceSnapshot> {
  const result = await workflowEngine.advance(ctx, keyOf(recordId), {
    commandId: `${recordId}:end`,
    expectedRevision: snapshot.revision,
    from: snapshot.step,
    to: 'end',
    actorNow: null,
    executor: routine('abrirResumoDiario'),
    note,
  });
  return result.occurrence;
}

/** Settles an earlier notice of one recipient: sent closes with success, otherwise with failure. */
async function settleEarlier(
  ctx: RequestContext,
  recordId: string,
  snapshot: TaskOccurrenceSnapshot,
): Promise<TaskOccurrenceSnapshot> {
  if (latestNoticeState(snapshot) === 'sent') {
    return endOccurrence(ctx, recordId, snapshot, 'concluirAviso');
  }
  return endOccurrence(ctx, recordId, snapshot, `falharAviso motivoFalha=${NOT_CONFIRMED}`);
}

function describe(
  base: { responsavelId: string; dia: string },
  outcome: AbrirResumoDiarioOutput['outcome'],
  recordId: string | null,
  snapshot: TaskOccurrenceSnapshot | null,
  state: 'sent' | 'pending' | null,
): AbrirResumoDiarioOutput {
  return {
    responsavelId: base.responsavelId,
    dia: base.dia,
    recordId,
    outcome,
    step: snapshot === null ? null : snapshot.step,
    done: snapshot === null ? false : snapshot.done,
    noticeState: state,
  };
}

// ---------------------------------------------------------------- functions

export async function listarResponsaveisResumo(
  input: ListarResponsaveisResumoInput,
  ctx: RequestContext,
): Promise<ListarResponsaveisResumoOutput> {
  const dia = dayOf(ctx, nowOf(ctx, input.now));
  const repository = resolveRepository<TarefaRepository>(ctx, 'TarefaRepository');
  const tarefas = await repository.list({});
  const responsaveis: string[] = [];
  for (const tarefa of tarefas) {
    if (!isDue(tarefa, dia)) continue;
    if (tarefa.responsavelId === '') continue;
    if (!responsaveis.includes(tarefa.responsavelId)) responsaveis.push(tarefa.responsavelId);
  }
  return { dia, responsaveis };
}

export async function abrirResumoDiario(
  input: AbrirResumoDiarioInput,
  ctx: RequestContext,
): Promise<AbrirResumoDiarioOutput> {
  if (typeof input.responsavelId !== 'string' || input.responsavelId === '') {
    throw new AppError('RESPONSAVEL_REQUIRED', 'responsavelId is required to open the daily summary', 400, {
      ruleId: 'resumoDiarioOitoHoras',
    });
  }
  const responsavelId = input.responsavelId;
  const dia = dayOf(ctx, nowOf(ctx, input.now));
  const base = { responsavelId, dia };
  const recordId = occurrenceRecordId(ctx, PROCESS_ID, seedOf(responsavelId, dia));
  const key = keyOf(recordId);

  try {
    // Same day again: the existing occurrence is returned.
    const existing = await workflowEngine.find(ctx, key);
    if (existing !== null) {
      if (existing.done) return describe(base, 'existing', recordId, existing, latestNoticeState(existing));
      const state = latestNoticeState(existing);
      if (state === 'sent') {
        const ended = await endOccurrence(ctx, recordId, existing, 'concluirAviso');
        return describe(base, 'existing', recordId, ended, state);
      }
      return describe(base, 'existing', recordId, existing, state);
    }

    // An unfinished notice of this recipient from the earlier run is settled, only for this recipient.
    const previousId = occurrenceRecordId(ctx, PROCESS_ID, seedOf(responsavelId, previousDay(dia)));
    const previous = await workflowEngine.find(ctx, keyOf(previousId));
    if (previous !== null && !previous.done) {
      await settleEarlier(ctx, previousId, previous);
    }

    const repository = resolveRepository<TarefaRepository>(ctx, 'TarefaRepository');
    const doResponsavel = await repository.list({ responsavelId });
    const vencendo = doResponsavel.filter((tarefa) => tarefa.responsavelId === responsavelId && isDue(tarefa, dia));
    if (vencendo.length === 0) return describe(base, 'nothingDue', null, null, null);

    const opened = await workflowEngine.open(ctx, {
      key,
      plan: workflowPlans.resumoDiarioTarefas,
      title: `Resumo diário ${dia}`,
      firstStep: FIRST_STEP,
      actorNow: responsavelId,
      owner: responsavelId,
      origin: { kind: 'schedule', config: SCHEDULE },
      executor: routine('abrirResumoDiario'),
      room: { mode: 'person' },
      message: { content: messageOf(vencendo, dia) },
    });
    if (opened.outcome === 'existing') {
      return describe(base, 'existing', recordId, opened.occurrence, latestNoticeState(opened.occurrence));
    }
    const state = noticeState(opened.moduleMessage);
    if (state === 'sent') {
      const ended = await endOccurrence(ctx, recordId, opened.occurrence, 'concluirAviso');
      return describe(base, 'opened', recordId, ended, state);
    }
    return describe(base, 'opened', recordId, opened.occurrence, state);
  } catch (error) {
    if (error instanceof AppError && TEMPORARY_CODES.includes(error.code)) {
      ctx.log.info('resumoDiarioTarefas: temporary port error, notice stays pending', {
        responsavelId,
        code: error.code,
      });
      return { ...describe(base, 'pending', recordId, null, 'pending'), motivoFalha: error.code };
    }
    if (error instanceof AppError && DEFINITIVE_CODES.includes(error.code)) {
      ctx.log.error('resumoDiarioTarefas: definitive port error, notice failed', {
        responsavelId,
        code: error.code,
      });
      return { ...describe(base, 'failed', recordId, null, null), motivoFalha: error.code };
    }
    throw error;
  }
}

export async function concluirResumoDiario(
  input: ConcluirResumoDiarioInput,
  ctx: RequestContext,
): Promise<ConcluirResumoDiarioOutput> {
  if (typeof input.recordId !== 'string' || input.recordId === '') {
    throw new AppError('RECORD_ID_REQUIRED', 'recordId is required to finish the daily summary', 400, {
      ruleId: 'avisoNaoSobrepostoPorPessoa',
    });
  }
  const mdmId = ctx.sessionContext.person?.mdmId;
  if (mdmId === undefined || mdmId === '') {
    throw new AppError('PERSON_REQUIRED', 'A signed-in person is required to finish the daily summary', 403, {
      ruleId: 'avisoNaoSobrepostoPorPessoa',
    });
  }
  const requestId = ctx.requestMeta?.requestId;
  if (requestId === undefined || requestId === '') {
    throw new AppError('REQUEST_ID_REQUIRED', 'requestId is required to finish the daily summary', 400, {
      ruleId: 'avisoNaoSobrepostoPorPessoa',
    });
  }
  const key = keyOf(input.recordId);
  const snapshot = await workflowEngine.find(ctx, key);
  if (snapshot === null) {
    throw new AppError('SUMMARY_NOT_FOUND', 'Daily summary occurrence not found', 404, {
      ruleId: 'resumoDiarioOitoHoras',
    });
  }
  if (snapshot.owner !== mdmId) {
    throw new AppError('SUMMARY_NOT_OWNED', 'The daily summary belongs to another person', 403, {
      ruleId: 'avisoNaoSobrepostoPorPessoa',
    });
  }
  if (snapshot.done) {
    return { recordId: input.recordId, outcome: 'unchanged', step: snapshot.step, done: snapshot.done };
  }
  const result = await workflowEngine.advance(ctx, key, {
    commandId: requestId,
    expectedRevision: snapshot.revision,
    from: snapshot.step,
    to: 'end',
    actorNow: null,
    executor: { kind: 'person', mdmId },
  });
  const outcome: ConcluirResumoDiarioOutput['outcome'] =
    result.outcome === 'advanced' ? 'ended' : result.outcome === 'conflict' ? 'conflict' : 'unchanged';
  return {
    recordId: input.recordId,
    outcome,
    step: result.occurrence.step,
    done: result.occurrence.done,
  };
}

// ---------------------------------------------------------------- schedule

export async function onTick(ctx: RequestContext, now: Date): Promise<void> {
  const { dia, responsaveis } = await listarResponsaveisResumo({ now }, ctx);

  // lastRun is what the module recorded: the notices of today already stored.
  let lastRun: Date | null = null;
  let allStored = responsaveis.length > 0;
  for (const responsavelId of responsaveis) {
    const recordId = occurrenceRecordId(ctx, PROCESS_ID, seedOf(responsavelId, dia));
    const stored = await workflowEngine.find(ctx, keyOf(recordId));
    if (stored === null || stored.history.length === 0) {
      allStored = false;
      break;
    }
    const at = new Date(stored.history[0].at);
    if (lastRun === null || at.getTime() > lastRun.getTime()) lastRun = at;
  }
  if (!allStored) lastRun = null;

  const due = evaluateSchedule(SCHEDULE, now, lastRun);
  if (due === null) return;

  for (const responsavelId of responsaveis) {
    try {
      await abrirResumoDiario({ responsavelId, now }, ctx);
    } catch (error) {
      ctx.log.error('resumoDiarioTarefas: failure for one recipient, others continue', {
        responsavelId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
