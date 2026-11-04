/// <mls fileReference="_102047_/l1/tarefas/layer_1_external/adapters/http/controllers/minhas_tarefas.ts" enhancement="_blank"/>
import { AppError, type BffRequest, type BffResponse, type ControllerRoute, type IRequestEnvelope } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { resolveGrant } from '/_102047_/l1/tarefas/layer_2_application/scope/accessScope.js';
import { actorRefFor } from '/_102047_/l1/tarefas/layer_1_external/auth/authorityMap.js';
import { requests } from '/_102047_/l1/tarefas/layer_2_application/requests/minhas_tarefas.js';
import type { Minhas_tarefasContracts } from '/_102047_/l2/tarefas/web/contracts/minhas_tarefas.defs.js';

export const routes: ControllerRoute[] = [
  { key: 'tarefas.minhas_tarefas.cmdAceitar', handler: handleCmdAceitar },
  { key: 'tarefas.minhas_tarefas.cmdAdicionarItensChecklist', handler: handleCmdAdicionarItensChecklist },
  { key: 'tarefas.minhas_tarefas.cmdAjustarChecklist', handler: handleCmdAjustarChecklist },
  { key: 'tarefas.minhas_tarefas.cmdCancelar', handler: handleCmdCancelar },
  { key: 'tarefas.minhas_tarefas.cmdCriarTarefa', handler: handleCmdCriarTarefa },
  { key: 'tarefas.minhas_tarefas.cmdDevolver', handler: handleCmdDevolver },
  { key: 'tarefas.minhas_tarefas.cmdEnviarParaRevisao', handler: handleCmdEnviarParaRevisao },
  { key: 'tarefas.minhas_tarefas.cmdIniciar', handler: handleCmdIniciar },
  { key: 'tarefas.minhas_tarefas.cmdRetomar', handler: handleCmdRetomar },
  { key: 'tarefas.minhas_tarefas.cmdSalvarAlteracoes', handler: handleCmdSalvarAlteracoes },
  { key: 'tarefas.minhas_tarefas.qryListas', handler: handleQryListas },
  { key: 'tarefas.minhas_tarefas.qryMinhasTarefas', handler: handleQryMinhasTarefas },
  { key: 'tarefas.minhas_tarefas.qryResponsaveis', handler: handleQryResponsaveis },
  { key: 'tarefas.minhas_tarefas.qryTarefa', handler: handleQryTarefa },
  { key: 'tarefas.minhas_tarefas.qryTarefasDoGrupo', handler: handleQryTarefasDoGrupo },
];

async function handleCmdAceitar(input: IRequestEnvelope): Promise<BffResponse<Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdAceitar']['output']>> {
  const held = authorize(input.request, ['membroTarefasProprias', 'membroConsultarListas', 'membroEscolherResponsavel', 'membroChecklistPropria']);
  if (held instanceof AppError) throw held;
  const scoped = scopeParams(input.request.params, input.ctx, held, ['id', 'version']);
  const invalid = validateInput(scoped, ['id', 'version'], ['id', 'version'], [], {  });
  if (invalid) throw invalid;
  const params = scoped as Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdAceitar']['input'];
  const data = await requests["tarefas.minhas_tarefas.cmdAceitar"](params, input.ctx);
  return { ok: true, data: data as Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdAceitar']['output'], error: null };
}

async function handleCmdAdicionarItensChecklist(input: IRequestEnvelope): Promise<BffResponse<Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdAdicionarItensChecklist']['output']>> {
  const held = authorize(input.request, ['membroChecklistPropria', 'membroTarefasProprias', 'membroConsultarListas', 'membroEscolherResponsavel']);
  if (held instanceof AppError) throw held;
  const scoped = scopeParams(input.request.params, input.ctx, held, ['tarefaId', 'itens', 'itens.ordem', 'itens.details', 'itens.details.descricao', 'itens.details.concluido']);
  const invalid = validateInput(scoped, ['tarefaId', 'itens', 'itens.ordem', 'itens.details', 'itens.details.descricao', 'itens.details.concluido'], ['tarefaId', 'itens', 'itens.ordem', 'itens.details', 'itens.details.descricao', 'itens.details.concluido'], [], {  });
  if (invalid) throw invalid;
  const params = scoped as Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdAdicionarItensChecklist']['input'];
  const data = await requests["tarefas.minhas_tarefas.cmdAdicionarItensChecklist"](params, input.ctx);
  return { ok: true, data: data as Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdAdicionarItensChecklist']['output'], error: null };
}

async function handleCmdAjustarChecklist(input: IRequestEnvelope): Promise<BffResponse<Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdAjustarChecklist']['output']>> {
  const held = authorize(input.request, ['membroChecklistPropria', 'membroTarefasProprias', 'membroConsultarListas', 'membroEscolherResponsavel']);
  if (held instanceof AppError) throw held;
  const scoped = scopeParams(input.request.params, input.ctx, held, ['tarefaId', 'itens', 'itens.id', 'itens.version', 'itens.ordem', 'itens.details', 'itens.details.descricao', 'itens.details.concluido']);
  const invalid = validateInput(scoped, ['tarefaId', 'itens', 'itens.id', 'itens.version', 'itens.details'], ['tarefaId', 'itens', 'itens.id', 'itens.version', 'itens.ordem', 'itens.details', 'itens.details.descricao', 'itens.details.concluido'], [], {  });
  if (invalid) throw invalid;
  const params = scoped as Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdAjustarChecklist']['input'];
  const data = await requests["tarefas.minhas_tarefas.cmdAjustarChecklist"](params, input.ctx);
  return { ok: true, data: data as Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdAjustarChecklist']['output'], error: null };
}

async function handleCmdCancelar(input: IRequestEnvelope): Promise<BffResponse<Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdCancelar']['output']>> {
  const held = authorize(input.request, ['membroTarefasProprias', 'membroConsultarListas', 'membroEscolherResponsavel', 'membroChecklistPropria']);
  if (held instanceof AppError) throw held;
  const scoped = scopeParams(input.request.params, input.ctx, held, ['id', 'version']);
  const invalid = validateInput(scoped, ['id', 'version'], ['id', 'version'], [], {  });
  if (invalid) throw invalid;
  const params = scoped as Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdCancelar']['input'];
  const data = await requests["tarefas.minhas_tarefas.cmdCancelar"](params, input.ctx);
  return { ok: true, data: data as Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdCancelar']['output'], error: null };
}

async function handleCmdCriarTarefa(input: IRequestEnvelope): Promise<BffResponse<Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdCriarTarefa']['output']>> {
  const held = authorize(input.request, ['membroTarefasProprias', 'membroConsultarListas', 'membroEscolherResponsavel', 'membroChecklistPropria']);
  if (held instanceof AppError) throw held;
  const scoped = scopeParams(input.request.params, input.ctx, held, ['titulo', 'details', 'details.descricao', 'details.etiquetas', 'prioridade', 'prazo', 'listaId', 'responsavelId', 'criadorId', 'tarefaPaiId']);
  const invalid = validateInput(scoped, ['titulo', 'details', 'prioridade', 'listaId', 'responsavelId', 'criadorId'], ['titulo', 'details', 'details.descricao', 'details.etiquetas', 'prioridade', 'prazo', 'listaId', 'responsavelId', 'criadorId', 'tarefaPaiId'], [], { 'prioridade': ['baixa', 'media', 'alta'] });
  if (invalid) throw invalid;
  const params = scoped as Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdCriarTarefa']['input'];
  const data = await requests["tarefas.minhas_tarefas.cmdCriarTarefa"](params, input.ctx);
  return { ok: true, data: data as Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdCriarTarefa']['output'], error: null };
}

async function handleCmdDevolver(input: IRequestEnvelope): Promise<BffResponse<Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdDevolver']['output']>> {
  const held = authorize(input.request, ['membroTarefasProprias', 'membroConsultarListas', 'membroEscolherResponsavel', 'membroChecklistPropria']);
  if (held instanceof AppError) throw held;
  const scoped = scopeParams(input.request.params, input.ctx, held, ['id', 'version', 'details', 'details.motivoDevolucao']);
  const invalid = validateInput(scoped, ['id', 'version', 'details', 'details.motivoDevolucao'], ['id', 'version', 'details', 'details.motivoDevolucao'], [], {  });
  if (invalid) throw invalid;
  const params = scoped as Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdDevolver']['input'];
  const data = await requests["tarefas.minhas_tarefas.cmdDevolver"](params, input.ctx);
  return { ok: true, data: data as Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdDevolver']['output'], error: null };
}

async function handleCmdEnviarParaRevisao(input: IRequestEnvelope): Promise<BffResponse<Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdEnviarParaRevisao']['output']>> {
  const held = authorize(input.request, ['membroTarefasProprias', 'membroConsultarListas', 'membroEscolherResponsavel', 'membroChecklistPropria']);
  if (held instanceof AppError) throw held;
  const scoped = scopeParams(input.request.params, input.ctx, held, ['id', 'version']);
  const invalid = validateInput(scoped, ['id', 'version'], ['id', 'version'], [], {  });
  if (invalid) throw invalid;
  const params = scoped as Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdEnviarParaRevisao']['input'];
  const data = await requests["tarefas.minhas_tarefas.cmdEnviarParaRevisao"](params, input.ctx);
  return { ok: true, data: data as Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdEnviarParaRevisao']['output'], error: null };
}

async function handleCmdIniciar(input: IRequestEnvelope): Promise<BffResponse<Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdIniciar']['output']>> {
  const held = authorize(input.request, ['membroTarefasProprias', 'membroConsultarListas', 'membroEscolherResponsavel', 'membroChecklistPropria']);
  if (held instanceof AppError) throw held;
  const scoped = scopeParams(input.request.params, input.ctx, held, ['id', 'version']);
  const invalid = validateInput(scoped, ['id', 'version'], ['id', 'version'], [], {  });
  if (invalid) throw invalid;
  const params = scoped as Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdIniciar']['input'];
  const data = await requests["tarefas.minhas_tarefas.cmdIniciar"](params, input.ctx);
  return { ok: true, data: data as Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdIniciar']['output'], error: null };
}

async function handleCmdRetomar(input: IRequestEnvelope): Promise<BffResponse<Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdRetomar']['output']>> {
  const held = authorize(input.request, ['membroTarefasProprias', 'membroConsultarListas', 'membroEscolherResponsavel', 'membroChecklistPropria']);
  if (held instanceof AppError) throw held;
  const scoped = scopeParams(input.request.params, input.ctx, held, ['id', 'version']);
  const invalid = validateInput(scoped, ['id', 'version'], ['id', 'version'], [], {  });
  if (invalid) throw invalid;
  const params = scoped as Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdRetomar']['input'];
  const data = await requests["tarefas.minhas_tarefas.cmdRetomar"](params, input.ctx);
  return { ok: true, data: data as Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdRetomar']['output'], error: null };
}

async function handleCmdSalvarAlteracoes(input: IRequestEnvelope): Promise<BffResponse<Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdSalvarAlteracoes']['output']>> {
  const held = authorize(input.request, ['membroTarefasProprias', 'membroConsultarListas', 'membroEscolherResponsavel', 'membroChecklistPropria']);
  if (held instanceof AppError) throw held;
  const scoped = scopeParams(input.request.params, input.ctx, held, ['id', 'version', 'titulo', 'details', 'details.descricao', 'details.etiquetas', 'prioridade', 'prazo', 'listaId', 'responsavelId', 'tarefaPaiId']);
  const invalid = validateInput(scoped, ['id', 'version', 'titulo', 'details', 'prioridade', 'listaId', 'responsavelId'], ['id', 'version', 'titulo', 'details', 'details.descricao', 'details.etiquetas', 'prioridade', 'prazo', 'listaId', 'responsavelId', 'tarefaPaiId'], [], { 'prioridade': ['baixa', 'media', 'alta'] });
  if (invalid) throw invalid;
  const params = scoped as Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdSalvarAlteracoes']['input'];
  const data = await requests["tarefas.minhas_tarefas.cmdSalvarAlteracoes"](params, input.ctx);
  return { ok: true, data: data as Minhas_tarefasContracts['tarefas.minhas_tarefas.cmdSalvarAlteracoes']['output'], error: null };
}

async function handleQryListas(input: IRequestEnvelope): Promise<BffResponse<Minhas_tarefasContracts['tarefas.minhas_tarefas.qryListas']['output']>> {
  const held = authorize(input.request, ['membroConsultarListas']);
  if (held instanceof AppError) throw held;
  const scoped = scopeParams(input.request.params, input.ctx, held, ['busca']);
  const invalid = validateInput(scoped, [], ['busca'], [], {  });
  if (invalid) throw invalid;
  const params = scoped as Minhas_tarefasContracts['tarefas.minhas_tarefas.qryListas']['input'];
  const data = await requests["tarefas.minhas_tarefas.qryListas"](params, input.ctx);
  return { ok: true, data: data as Minhas_tarefasContracts['tarefas.minhas_tarefas.qryListas']['output'], error: null };
}

async function handleQryMinhasTarefas(input: IRequestEnvelope): Promise<BffResponse<Minhas_tarefasContracts['tarefas.minhas_tarefas.qryMinhasTarefas']['output']>> {
  const held = authorize(input.request, ['membroTarefasProprias', 'membroConsultarListas', 'membroEscolherResponsavel']);
  if (held instanceof AppError) throw held;
  const scoped = scopeParams(input.request.params, input.ctx, held, ['page', 'pageSize']);
  const invalid = validateInput(scoped, ['page', 'pageSize'], ['page', 'pageSize'], [], {  });
  if (invalid) throw invalid;
  const params = scoped as Minhas_tarefasContracts['tarefas.minhas_tarefas.qryMinhasTarefas']['input'];
  const data = await requests["tarefas.minhas_tarefas.qryMinhasTarefas"](params, input.ctx);
  return { ok: true, data: data as Minhas_tarefasContracts['tarefas.minhas_tarefas.qryMinhasTarefas']['output'], error: null };
}

async function handleQryResponsaveis(input: IRequestEnvelope): Promise<BffResponse<Minhas_tarefasContracts['tarefas.minhas_tarefas.qryResponsaveis']['output']>> {
  const held = authorize(input.request, ['membroEscolherResponsavel']);
  if (held instanceof AppError) throw held;
  const scoped = scopeParams(input.request.params, input.ctx, held, ['busca']);
  const invalid = validateInput(scoped, [], ['busca'], [], {  });
  if (invalid) throw invalid;
  const params = scoped as Minhas_tarefasContracts['tarefas.minhas_tarefas.qryResponsaveis']['input'];
  const data = await requests["tarefas.minhas_tarefas.qryResponsaveis"](params, input.ctx);
  return { ok: true, data: data as Minhas_tarefasContracts['tarefas.minhas_tarefas.qryResponsaveis']['output'], error: null };
}

async function handleQryTarefa(input: IRequestEnvelope): Promise<BffResponse<Minhas_tarefasContracts['tarefas.minhas_tarefas.qryTarefa']['output']>> {
  const held = authorize(input.request, ['membroTarefasProprias', 'membroConsultarListas', 'membroEscolherResponsavel', 'membroChecklistPropria']);
  if (held instanceof AppError) throw held;
  const scoped = scopeParams(input.request.params, input.ctx, held, ['tarefaId']);
  const invalid = validateInput(scoped, ['tarefaId'], ['tarefaId'], [], {  });
  if (invalid) throw invalid;
  const params = scoped as Minhas_tarefasContracts['tarefas.minhas_tarefas.qryTarefa']['input'];
  const data = await requests["tarefas.minhas_tarefas.qryTarefa"](params, input.ctx);
  return { ok: true, data: data as Minhas_tarefasContracts['tarefas.minhas_tarefas.qryTarefa']['output'], error: null };
}

async function handleQryTarefasDoGrupo(input: IRequestEnvelope): Promise<BffResponse<Minhas_tarefasContracts['tarefas.minhas_tarefas.qryTarefasDoGrupo']['output']>> {
  const held = authorize(input.request, ['membroTarefasProprias', 'membroConsultarListas', 'membroEscolherResponsavel']);
  if (held instanceof AppError) throw held;
  const scoped = scopeParams(input.request.params, input.ctx, held, ['grupo', 'page', 'pageSize']);
  const invalid = validateInput(scoped, ['grupo', 'page', 'pageSize'], ['grupo', 'page', 'pageSize'], [], {  });
  if (invalid) throw invalid;
  const params = scoped as Minhas_tarefasContracts['tarefas.minhas_tarefas.qryTarefasDoGrupo']['input'];
  const data = await requests["tarefas.minhas_tarefas.qryTarefasDoGrupo"](params, input.ctx);
  return { ok: true, data: data as Minhas_tarefasContracts['tarefas.minhas_tarefas.qryTarefasDoGrupo']['output'], error: null };
}

function scopeParams(params: unknown, ctx: { sessionContext?: { actorId?: string } }, held: readonly string[], allowed: readonly string[]): Record<string, unknown> {
  const body = params && typeof params === 'object' && !Array.isArray(params) ? { ...(params as Record<string, unknown>) } : {};
  const grants = held.map(grantId => resolveGrant(grantId)).filter((grant): grant is Exclude<ReturnType<typeof resolveGrant>, { code: string }> => 'grantId' in grant);
  const broader = new Set(grants.filter(grant => grant.scopeMode !== 'own').flatMap(grant => grant.entityRefs));
  const fields = new Set(grants.filter(grant => grant.scopeMode === 'own')
    .flatMap(grant => Object.entries(grant.recordFields).filter(([entityId]) => !broader.has(entityId)).map(([, field]) => field)));
  if (fields.size === 0) return body;
  const actorId = ctx.sessionContext?.actorId ?? '';
  if (!actorId) throw new AppError('FORBIDDEN_ACTOR', 'You have no identity for this scope.', 403);
  for (const field of fields) {
    if (!allowed.includes(field)) continue;
    // enforce:scope
    body[field] = actorId;
  }
  return body;
}

function authorize(request: BffRequest, grantIds: readonly string[]): AppError | string[] {
  const source = request.meta?.source ?? 'http';
  const authorities = request.meta?.verifiedAuthorities ?? [];
  if (source === 'http' && authorities.length === 0) {
    return new AppError('FORBIDDEN_ACTOR', 'You have no authority to call this routine.', 403);
  }
  if (grantIds.length === 0) return [];
  const held: string[] = [];
  let refused: AppError | null = null;
  for (const grantId of grantIds) {
    const actorRef = actorRefFor(grantId);
    if (!actorRef) { refused = new AppError('AUTHORITY_UNMAPPED', `Grant ${grantId} has no actor in the authority map.`, 403); continue; }
    if (authorities.length > 0 && !authorities.some(item => item === actorRef || item.endsWith(':' + actorRef))) continue;
    const resolved = resolveGrant(grantId);
    if (!('grantId' in resolved)) { refused = new AppError(resolved.code, resolved.detail, 403); continue; }
    held.push(grantId);
  }
  if (held.length > 0) return held;
  return refused ?? new AppError('FORBIDDEN_ACTOR', 'You have no authority to call this routine.', 403);
}

// `null` is accepted only where the contract type declares it; elsewhere it is refused, never read as absent.
// A required member is a present key. `''` is a string, refused only when a closed union omits it.
function validateInput(params: unknown, fields: readonly string[], allowed: readonly string[], nullable: readonly string[] = [], unions: Readonly<Record<string, readonly string[]>> = {}): AppError | null {
  const body = params && typeof params === 'object' && !Array.isArray(params) ? params as Record<string, unknown> : null;
  if (!body) return new AppError('VALIDATION_ERROR', 'Request body must be an object.', 400);
  const invalidPath = (value: unknown, prefix: string): string => {
    if (Array.isArray(value)) { for (const item of value) { const invalid = invalidPath(item, prefix); if (invalid) return invalid; } return ''; }
    if (!value || typeof value !== 'object') return '';
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const path = prefix ? prefix + '.' + key : key;
      if (!allowed.includes(path)) return path + ' is not permitted.';
      if (child === null && !nullable.includes(path)) return path + ' must not be null.';
      const permitted = unions[path];
      if (permitted && child !== null && (typeof child !== 'string' || !permitted.includes(child))) return path + ' is not a permitted value.';
      const invalid = invalidPath(child, path); if (invalid) return invalid;
    }
    return '';
  };
  const invalid = invalidPath(body, ''); if (invalid) return new AppError('VALIDATION_ERROR', invalid, 400);
  for (const field of fields) {
    // A required member of an absent optional parent is not required; a required parent has its own entry.
    // A list on the way applies the rest of the path to each of its items: an empty list requires nothing.
    const missing = (value: unknown, parts: readonly string[], path: string, top: boolean): string => {
      if (parts.length === 0) return value === undefined || (value === null && !nullable.includes(field)) ? path : '';
      if (!top && (value === undefined || value === null)) return '';
      if (Array.isArray(value)) {
        for (const [index, item] of value.entries()) { const found = missing(item, parts, `${path}[${index}]`, false); if (found) return found; }
        return '';
      }
      const next = value && typeof value === 'object' ? (value as Record<string, unknown>)[parts[0]] : undefined;
      return missing(next, parts.slice(1), path ? `${path}.${parts[0]}` : parts[0], false);
    };
    const found = missing(body, field.split('.'), '', true);
    if (found) return new AppError('VALIDATION_ERROR', `${found} is required.`, 400);
  }
  return null;
}

