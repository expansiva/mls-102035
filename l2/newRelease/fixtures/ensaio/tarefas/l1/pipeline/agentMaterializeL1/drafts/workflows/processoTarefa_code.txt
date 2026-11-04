/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/workflows/processoTarefa.ts" enhancement="_blank"/>

import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { resolveRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
import { createOccurrenceContext, occurrenceRecordId } from '/_102034_/l1/workflow/index.js';
import type {
  OccurrenceKey,
  TaskOccurrenceAdvanceResult,
  TaskOccurrenceSnapshot,
  WorkflowExecutor,
} from '/_102034_/l1/workflow/index.js';
import {
  noticeState,
  transitionTo,
  workflowEngine,
  workflowPlans,
} from '/_102047_/l1/tarefas/layer_1_external/adapters/workflow/engine.js';
import type { Tarefa } from '/_102047_/l1/tarefas/layer_3_domain/entities/tarefa.js';
import type { TarefaRepository } from '/_102047_/l1/tarefas/layer_2_application/ports/tarefaRepository.js';
import { createTarefa } from '/_102047_/l1/tarefas/layer_2_application/usecases/createTarefa.js';
import { iniciar } from '/_102047_/l1/tarefas/layer_2_application/usecases/iniciar.js';
import { enviarParaRevisao } from '/_102047_/l1/tarefas/layer_2_application/usecases/enviarParaRevisao.js';
import { aceitar } from '/_102047_/l1/tarefas/layer_2_application/usecases/aceitar.js';
import { devolver } from '/_102047_/l1/tarefas/layer_2_application/usecases/devolver.js';
import { retomar } from '/_102047_/l1/tarefas/layer_2_application/usecases/retomar.js';

const PROJECT_ID = '102047';
const MODULE_ID = 'tarefas';
const PROCESS_ID = 'processoTarefa';
const ENTITY_ID = 'Tarefa';

export type AvisoEstado = 'sent' | 'pending' | null;
export type TransicaoTarefa = 'iniciar' | 'enviarParaRevisao' | 'aceitar' | 'devolver' | 'retomar';

const TRANSICOES: readonly TransicaoTarefa[] = ['iniciar', 'enviarParaRevisao', 'aceitar', 'devolver', 'retomar'];

interface Pessoa {
  mdmId: string;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function requirePerson(ctx: RequestContext): Pessoa {
  const person = ctx.sessionContext.person;
  if (!person || !person.mdmId) {
    throw new AppError('WORKFLOW_ACTOR_REQUIRED', 'The request has no identified person.', 403, {
      ruleId: 'podeCriarTarefasExigido',
    });
  }
  return { mdmId: person.mdmId };
}

function requireRequestId(ctx: RequestContext): string {
  const requestId = ctx.requestMeta?.requestId;
  if (!requestId) {
    throw new AppError('WORKFLOW_REQUEST_ID_REQUIRED', 'The request id is required to command the occurrence.', 400);
  }
  return requestId;
}

function keyOf(recordId: string): OccurrenceKey {
  return {
    project: PROJECT_ID,
    module: MODULE_ID,
    processId: PROCESS_ID,
    entity: ENTITY_ID,
    recordId,
  };
}

function executorOf(person: Pessoa): WorkflowExecutor {
  return { kind: 'person', mdmId: person.mdmId };
}

function isGestor(ctx: RequestContext): boolean {
  const scope = ctx.sessionContext.actorScope ?? ctx.sessionContext.actorSession.scope ?? [];
  return scope.includes('tarefas:gestor');
}

function destino(transicao: TransicaoTarefa): string {
  const status = transitionTo[`Tarefa.${transicao}`] ?? transitionTo[transicao];
  if (!status) {
    throw new AppError('WORKFLOW_TRANSITION_UNKNOWN', `No destination status for transition ${transicao}.`, 500);
  }
  return status;
}

function quemAge(status: string, responsavelId: string, criadorId: string): string | null {
  if (status === 'aFazer' || status === 'emAndamento') return responsavelId;
  if (status === 'emRevisao') return criadorId;
  return null;
}

async function readTarefa(repo: TarefaRepository, id: string): Promise<Tarefa> {
  if (!id) {
    throw new AppError('TAREFA_ID_REQUIRED', 'The task id is required.', 400);
  }
  const rows = await repo.list({ id });
  const found = rows.find((row) => row.id === id);
  if (!found) {
    throw new AppError('TAREFA_NOT_FOUND', 'Task not found.', 404);
  }
  return found;
}

async function findTarefaOptional(repo: TarefaRepository, id: string): Promise<Tarefa | undefined> {
  const rows = await repo.list({ id });
  return rows.find((row) => row.id === id);
}

async function readOccurrence(ctx: RequestContext, key: OccurrenceKey): Promise<TaskOccurrenceSnapshot> {
  const snapshot = await workflowEngine.find(ctx, key);
  if (!snapshot) {
    throw new AppError('WORKFLOW_OCCURRENCE_NOT_FOUND', 'The occurrence of this task is not open.', 404);
  }
  return snapshot;
}

function assertActsNow(snapshot: TaskOccurrenceSnapshot, person: Pessoa, ruleId: string): void {
  if (snapshot.actorNow !== person.mdmId) {
    throw new AppError('WORKFLOW_NOT_ACTOR_NOW', 'The person is not who acts now on this task.', 403, { ruleId });
  }
}

function assertStep(snapshot: TaskOccurrenceSnapshot, allowed: readonly string[], transicao: TransicaoTarefa): void {
  if (!allowed.includes(snapshot.step)) {
    throw new AppError(
      'WORKFLOW_TRANSITION_NOT_ALLOWED',
      `Transition ${transicao} is not allowed at step ${snapshot.step}.`,
      409,
    );
  }
}

function assertCriadorOuGestor(ctx: RequestContext, person: Pessoa, tarefa: Tarefa, ruleId: string): void {
  if (tarefa.criadorId !== person.mdmId && !isGestor(ctx)) {
    throw new AppError('WORKFLOW_ROLE_NOT_ALLOWED', 'Only the creator or the manager may do this.', 403, { ruleId });
  }
}

function avisoOf(result: TaskOccurrenceAdvanceResult): AvisoEstado {
  return noticeState(result.moduleMessage);
}

// ---------------------------------------------------------------------------
// definirQuemAgeAgora
// ---------------------------------------------------------------------------

export interface DefinirQuemAgeAgoraInput {
  status: string;
  responsavelId: string;
  criadorId: string;
}

export interface DefinirQuemAgeAgoraOutput {
  quemAgeAgora: string | null;
}

export async function definirQuemAgeAgora(
  input: DefinirQuemAgeAgoraInput,
  _ctx: RequestContext,
): Promise<DefinirQuemAgeAgoraOutput> {
  if (!input.status) {
    throw new AppError('TAREFA_STATUS_REQUIRED', 'The task status is required.', 400, {
      ruleId: 'quemAgeAgoraPorSituacao',
    });
  }
  return { quemAgeAgora: quemAge(input.status, input.responsavelId, input.criadorId) };
}

// ---------------------------------------------------------------------------
// abrirOcorrenciaTarefa
// ---------------------------------------------------------------------------

export interface AbrirOcorrenciaTarefaInput {
  titulo: string;
  prioridade: string;
  prazo?: string;
  listaId: string;
  responsavelId: string;
  tarefaPaiId?: string;
  details?: {
    descricao?: string;
    etiquetas?: string[];
  };
}

export interface AbrirOcorrenciaTarefaOutput {
  tarefaId: string;
  step: string;
  quemAgeAgora: string | null;
  outcome: 'created' | 'existing';
  aviso: AvisoEstado;
}

export async function abrirOcorrenciaTarefa(
  input: AbrirOcorrenciaTarefaInput,
  ctx: RequestContext,
): Promise<AbrirOcorrenciaTarefaOutput> {
  const person = requirePerson(ctx);
  const recordId = occurrenceRecordId(ctx, PROCESS_ID);
  const key = keyOf(recordId);

  const existing = await workflowEngine.find(ctx, key);
  if (existing) {
    return {
      tarefaId: recordId,
      step: existing.step,
      quemAgeAgora: existing.actorNow,
      outcome: 'existing',
      aviso: null,
    };
  }

  if (!input.titulo || input.titulo.trim() === '') {
    throw new AppError('TAREFA_TITULO_REQUIRED', 'The task title is required.', 400);
  }
  if (!input.responsavelId) {
    throw new AppError('TAREFA_RESPONSAVEL_REQUIRED', 'The task assignee is required.', 400, {
      ruleId: 'responsavelAceitaTarefas',
    });
  }

  const repo = resolveRepository<TarefaRepository>(ctx, 'TarefaRepository');
  let tarefa = await findTarefaOptional(repo, recordId);
  if (!tarefa) {
    const created = await createTarefa(
      {
        titulo: input.titulo,
        prioridade: input.prioridade,
        listaId: input.listaId,
        responsavelId: input.responsavelId,
        ...(input.prazo !== undefined ? { prazo: input.prazo } : {}),
        ...(input.tarefaPaiId !== undefined ? { tarefaPaiId: input.tarefaPaiId } : {}),
        ...(input.details !== undefined ? { details: input.details } : {}),
      },
      createOccurrenceContext(ctx, recordId),
    );
    if (created.id !== recordId) {
      throw new AppError(
        'WORKFLOW_RECORD_ID_MISMATCH',
        'The task was not written with the occurrence record id.',
        500,
      );
    }
    tarefa = await readTarefa(repo, recordId);
  }

  const quem = quemAge(tarefa.status, tarefa.responsavelId, tarefa.criadorId);
  const result = await workflowEngine.open(ctx, {
    key,
    plan: workflowPlans.processoTarefa,
    title: tarefa.titulo,
    firstStep: 'executar',
    actorNow: quem,
    owner: person.mdmId,
    origin: { kind: 'screen', by: person.mdmId },
    executor: executorOf(person),
    room: { mode: 'exclusive' },
    message: { content: `Você recebeu a tarefa "${tarefa.titulo}".` },
  });

  return {
    tarefaId: recordId,
    step: result.occurrence.step,
    quemAgeAgora: result.occurrence.actorNow,
    outcome: result.outcome,
    aviso: result.outcome === 'created' ? noticeState(result.moduleMessage) : null,
  };
}

// ---------------------------------------------------------------------------
// avancarEtapaTarefa
// ---------------------------------------------------------------------------

export interface AvancarEtapaTarefaInput {
  tarefaId: string;
  transicao: TransicaoTarefa;
  motivoDevolucao?: string;
}

export interface AvancarEtapaTarefaOutput {
  tarefaId: string;
  status: string;
  step: string;
  done: boolean;
  quemAgeAgora: string | null;
  outcome: 'applied' | 'unchanged' | 'conflict';
  aviso: AvisoEstado;
}

function stateOf(
  tarefaId: string,
  status: string,
  snapshot: TaskOccurrenceSnapshot,
  outcome: 'applied' | 'unchanged' | 'conflict',
  aviso: AvisoEstado,
): AvancarEtapaTarefaOutput {
  return {
    tarefaId,
    status,
    step: snapshot.step,
    done: snapshot.done,
    quemAgeAgora: snapshot.actorNow,
    outcome,
    aviso,
  };
}

export async function avancarEtapaTarefa(
  input: AvancarEtapaTarefaInput,
  ctx: RequestContext,
): Promise<AvancarEtapaTarefaOutput> {
  if (!TRANSICOES.includes(input.transicao)) {
    throw new AppError('WORKFLOW_TRANSITION_INVALID', 'The transition is not valid.', 400);
  }
  const person = requirePerson(ctx);
  const commandId = requireRequestId(ctx);
  const executor = executorOf(person);
  const key = keyOf(input.tarefaId);
  const repo = resolveRepository<TarefaRepository>(ctx, 'TarefaRepository');

  const snapshot = await readOccurrence(ctx, key);
  const tarefa = await readTarefa(repo, input.tarefaId);

  if (snapshot.history.some((entry) => entry.commandId === commandId)) {
    return stateOf(tarefa.id, tarefa.status, snapshot, 'unchanged', null);
  }

  switch (input.transicao) {
    case 'iniciar': {
      assertStep(snapshot, ['executar'], 'iniciar');
      if (tarefa.status === destino('iniciar')) {
        return stateOf(tarefa.id, tarefa.status, snapshot, 'unchanged', null);
      }
      assertActsNow(snapshot, person, 'apenasResponsavelExecuta');
      const out = await iniciar({ id: tarefa.id, version: tarefa.version }, ctx);
      return stateOf(tarefa.id, out.status, snapshot, 'applied', null);
    }
    case 'retomar': {
      assertStep(snapshot, ['retomar'], 'retomar');
      if (tarefa.details.devolvidaPendente === false) {
        return stateOf(tarefa.id, tarefa.status, snapshot, 'unchanged', null);
      }
      assertActsNow(snapshot, person, 'apenasResponsavelExecuta');
      const out = await retomar({ id: tarefa.id, version: tarefa.version }, ctx);
      return stateOf(tarefa.id, out.status, snapshot, 'applied', null);
    }
    case 'enviarParaRevisao': {
      assertStep(snapshot, ['executar', 'retomar', 'aguardarRevisao'], 'enviarParaRevisao');
      let status: string = tarefa.status;
      let criadorId = tarefa.criadorId;
      if (tarefa.status !== destino('enviarParaRevisao')) {
        assertActsNow(snapshot, person, 'apenasResponsavelExecuta');
        const out = await enviarParaRevisao({ id: tarefa.id, version: tarefa.version }, ctx);
        status = out.status;
        criadorId = out.criadorId;
      }

      let step = snapshot.step;
      let revision = snapshot.revision;
      if (step !== 'aguardarRevisao') {
        const first = await workflowEngine.advance(ctx, key, {
          commandId: `${commandId}:aguardarRevisao`,
          expectedRevision: revision,
          from: step,
          to: 'aguardarRevisao',
          actorNow: criadorId,
          executor,
        });
        if (first.outcome === 'conflict') {
          return stateOf(tarefa.id, status, first.occurrence, 'conflict', null);
        }
        step = first.occurrence.step;
        revision = first.occurrence.revision;
      }

      const second = await workflowEngine.advance(ctx, key, {
        commandId,
        expectedRevision: revision,
        from: step,
        to: 'revisar',
        actorNow: criadorId,
        executor,
        message: { content: `A tarefa "${tarefa.titulo}" foi enviada para a sua revisão.` },
      });
      if (second.outcome === 'conflict') {
        return stateOf(tarefa.id, status, second.occurrence, 'conflict', null);
      }
      return stateOf(
        tarefa.id,
        status,
        second.occurrence,
        second.outcome === 'unchanged' ? 'unchanged' : 'applied',
        avisoOf(second),
      );
    }
    case 'aceitar': {
      assertStep(snapshot, ['revisar'], 'aceitar');
      let status: string = tarefa.status;
      if (tarefa.status !== destino('aceitar')) {
        assertActsNow(snapshot, person, 'apenasCriadorRevisa');
        const out = await aceitar({ id: tarefa.id, version: tarefa.version }, ctx);
        status = out.status;
      }
      const result = await workflowEngine.advance(ctx, key, {
        commandId,
        expectedRevision: snapshot.revision,
        from: 'revisar',
        to: 'end',
        actorNow: null,
        executor,
      });
      return stateOf(
        tarefa.id,
        status,
        result.occurrence,
        result.outcome === 'conflict' ? 'conflict' : result.outcome === 'unchanged' ? 'unchanged' : 'applied',
        null,
      );
    }
    case 'devolver': {
      assertStep(snapshot, ['revisar'], 'devolver');
      let status: string = tarefa.status;
      let responsavelId = tarefa.responsavelId;
      let motivo = tarefa.details.motivoDevolucao;
      if (tarefa.status !== destino('devolver')) {
        const motivoInformado = input.motivoDevolucao;
        if (!motivoInformado || motivoInformado.trim() === '') {
          throw new AppError('DEVOLUCAO_EXIGE_MOTIVO', 'Returning a task requires a reason.', 400, {
            ruleId: 'devolucaoExigeMotivo',
          });
        }
        assertActsNow(snapshot, person, 'apenasCriadorRevisa');
        const out = await devolver(
          { id: tarefa.id, version: tarefa.version, details: { motivoDevolucao: motivoInformado } },
          ctx,
        );
        status = out.status;
        responsavelId = out.responsavelId;
        motivo = out.details.motivoDevolucao;
      }
      const result = await workflowEngine.advance(ctx, key, {
        commandId,
        expectedRevision: snapshot.revision,
        from: 'revisar',
        to: 'retomar',
        actorNow: responsavelId,
        executor,
        message: {
          content: motivo
            ? `A tarefa "${tarefa.titulo}" foi devolvida. Motivo: ${motivo}`
            : `A tarefa "${tarefa.titulo}" foi devolvida.`,
        },
      });
      if (result.outcome === 'conflict') {
        return stateOf(tarefa.id, status, result.occurrence, 'conflict', null);
      }
      return stateOf(
        tarefa.id,
        status,
        result.occurrence,
        result.outcome === 'unchanged' ? 'unchanged' : 'applied',
        avisoOf(result),
      );
    }
  }
}

// ---------------------------------------------------------------------------
// trocarResponsavelOcorrencia
// ---------------------------------------------------------------------------

export interface TrocarResponsavelOcorrenciaInput {
  tarefaId: string;
  novoResponsavelId: string;
}

export interface TrocarResponsavelOcorrenciaOutput {
  tarefaId: string;
  status: string;
  responsavelId: string;
  step: string;
  quemAgeAgora: string | null;
  outcome: 'applied' | 'unchanged' | 'conflict';
  aviso: AvisoEstado;
}

export async function trocarResponsavelOcorrencia(
  input: TrocarResponsavelOcorrenciaInput,
  ctx: RequestContext,
): Promise<TrocarResponsavelOcorrenciaOutput> {
  const person = requirePerson(ctx);
  const commandId = requireRequestId(ctx);
  if (!input.novoResponsavelId) {
    throw new AppError('TAREFA_RESPONSAVEL_REQUIRED', 'The new assignee is required.', 400, {
      ruleId: 'responsavelAceitaTarefas',
    });
  }
  const key = keyOf(input.tarefaId);
  const repo = resolveRepository<TarefaRepository>(ctx, 'TarefaRepository');

  const snapshot = await readOccurrence(ctx, key);
  const tarefa = await readTarefa(repo, input.tarefaId);

  assertCriadorOuGestor(ctx, person, tarefa, 'reatribuirApenasCriadorOuGestor');

  if (snapshot.history.some((entry) => entry.commandId === commandId)) {
    return {
      tarefaId: tarefa.id,
      status: tarefa.status,
      responsavelId: tarefa.responsavelId,
      step: snapshot.step,
      quemAgeAgora: snapshot.actorNow,
      outcome: 'unchanged',
      aviso: null,
    };
  }

  if (tarefa.status === 'concluida' || tarefa.status === 'cancelada') {
    throw new AppError('TAREFA_ENCERRADA', 'A closed task cannot be reassigned.', 409, {
      ruleId: 'reatribuirApenasCriadorOuGestor',
    });
  }

  let current: Tarefa = tarefa;
  let wrote = false;
  if (tarefa.responsavelId !== input.novoResponsavelId) {
    current = await repo.update({
      ...tarefa,
      responsavelId: input.novoResponsavelId,
      details: {
        ...tarefa.details,
        quemAgeAgora: quemAge(tarefa.status, input.novoResponsavelId, tarefa.criadorId) ?? undefined,
      },
    });
    wrote = true;
  }

  const quem = quemAge(current.status, current.responsavelId, current.criadorId);
  if (quem === null || snapshot.actorNow === quem) {
    return {
      tarefaId: current.id,
      status: current.status,
      responsavelId: current.responsavelId,
      step: snapshot.step,
      quemAgeAgora: snapshot.actorNow,
      outcome: wrote ? 'applied' : 'unchanged',
      aviso: null,
    };
  }

  const result = await workflowEngine.advance(ctx, key, {
    commandId,
    expectedRevision: snapshot.revision,
    from: snapshot.step,
    to: snapshot.step,
    actorNow: quem,
    executor: executorOf(person),
    message: { content: `A tarefa "${current.titulo}" foi atribuída a você.` },
  });

  if (result.outcome === 'conflict') {
    return {
      tarefaId: current.id,
      status: current.status,
      responsavelId: current.responsavelId,
      step: result.occurrence.step,
      quemAgeAgora: result.occurrence.actorNow,
      outcome: 'conflict',
      aviso: null,
    };
  }
  return {
    tarefaId: current.id,
    status: current.status,
    responsavelId: current.responsavelId,
    step: result.occurrence.step,
    quemAgeAgora: result.occurrence.actorNow,
    outcome: 'applied',
    aviso: avisoOf(result),
  };
}

// ---------------------------------------------------------------------------
// cancelarOcorrenciaTarefa
// ---------------------------------------------------------------------------

export interface CancelarOcorrenciaTarefaInput {
  tarefaId: string;
}

export interface CancelarOcorrenciaTarefaOutput {
  tarefaId: string;
  status: string;
  step: string;
  done: boolean;
  outcome: 'applied' | 'unchanged' | 'conflict';
  aviso: AvisoEstado;
}

export async function cancelarOcorrenciaTarefa(
  input: CancelarOcorrenciaTarefaInput,
  ctx: RequestContext,
): Promise<CancelarOcorrenciaTarefaOutput> {
  const person = requirePerson(ctx);
  const commandId = requireRequestId(ctx);
  const key = keyOf(input.tarefaId);
  const repo = resolveRepository<TarefaRepository>(ctx, 'TarefaRepository');

  const snapshot = await readOccurrence(ctx, key);
  const tarefa = await readTarefa(repo, input.tarefaId);

  assertCriadorOuGestor(ctx, person, tarefa, 'cancelarApenasCriadorOuGestor');

  if (tarefa.status === 'cancelada' && snapshot.done) {
    return {
      tarefaId: tarefa.id,
      status: tarefa.status,
      step: snapshot.step,
      done: snapshot.done,
      outcome: 'unchanged',
      aviso: null,
    };
  }
  if (tarefa.status === 'concluida') {
    throw new AppError('TAREFA_ENCERRADA', 'A completed task cannot be cancelled.', 409, {
      ruleId: 'cancelarApenasCriadorOuGestor',
    });
  }

  let status: string = tarefa.status;
  if (tarefa.status !== 'cancelada') {
    if (tarefa.status !== 'aFazer' && tarefa.status !== 'emAndamento' && tarefa.status !== 'emRevisao') {
      throw new AppError('TAREFA_CANCEL_NOT_ALLOWED', 'The task cannot be cancelled from its status.', 409, {
        ruleId: 'cancelarApenasCriadorOuGestor',
      });
    }
    const { quemAgeAgora: _quemAntes, ...detalhesSemQuemAge } = tarefa.details;
    const registro: Tarefa = {
      ...tarefa,
      status: 'cancelada',
      details: {
        ...detalhesSemQuemAge,
        canceladaEm: ctx.clock.nowIso(),
        aberta: false,
      },
    };
    const cancelada = await repo.transition(registro, 'cancelar');
    status = cancelada.status;
  }

  const result = await workflowEngine.advance(ctx, key, {
    commandId,
    expectedRevision: snapshot.revision,
    from: snapshot.step,
    to: 'end',
    actorNow: null,
    executor: executorOf(person),
    message: { content: `A tarefa "${tarefa.titulo}" foi cancelada.` },
  });

  return {
    tarefaId: tarefa.id,
    status,
    step: result.occurrence.step,
    done: result.occurrence.done,
    outcome: result.outcome === 'conflict' ? 'conflict' : result.outcome === 'unchanged' ? 'unchanged' : 'applied',
    aviso: result.outcome === 'conflict' ? null : avisoOf(result),
  };
}
