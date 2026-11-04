/// <mls fileReference="_102047_/l1/tarefas/layer_1_external/adapters/http/controllers/listas_tarefas.ts" enhancement="_blank"/>
import { AppError, type BffRequest, type BffResponse, type ControllerRoute, type IRequestEnvelope } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { resolveGrant } from '/_102047_/l1/tarefas/layer_2_application/scope/accessScope.js';
import { actorRefFor } from '/_102047_/l1/tarefas/layer_1_external/auth/authorityMap.js';
import { requests } from '/_102047_/l1/tarefas/layer_2_application/requests/listas_tarefas.js';
import type { Listas_tarefasContracts } from '/_102047_/l2/tarefas/web/contracts/listas_tarefas.defs.js';

export const routes: ControllerRoute[] = [
  { key: 'tarefas.listas_tarefas.cmdCriarLista', handler: handleCmdCriarLista },
  { key: 'tarefas.listas_tarefas.cmdSalvarLista', handler: handleCmdSalvarLista },
  { key: 'tarefas.listas_tarefas.qryListasTarefas', handler: handleQryListasTarefas },
];

async function handleCmdCriarLista(input: IRequestEnvelope): Promise<BffResponse<Listas_tarefasContracts['tarefas.listas_tarefas.cmdCriarLista']['output']>> {
  const held = authorize(input.request, ['gestorListas']);
  if (held instanceof AppError) throw held;
  const scoped = scopeParams(input.request.params, input.ctx, held, ['nome', 'details', 'details.descricao']);
  const invalid = validateInput(scoped, ['nome', 'details'], ['nome', 'details', 'details.descricao'], [], {  });
  if (invalid) throw invalid;
  const params = scoped as Listas_tarefasContracts['tarefas.listas_tarefas.cmdCriarLista']['input'];
  const data = await requests["tarefas.listas_tarefas.cmdCriarLista"](params, input.ctx);
  return { ok: true, data: data as Listas_tarefasContracts['tarefas.listas_tarefas.cmdCriarLista']['output'], error: null };
}

async function handleCmdSalvarLista(input: IRequestEnvelope): Promise<BffResponse<Listas_tarefasContracts['tarefas.listas_tarefas.cmdSalvarLista']['output']>> {
  const held = authorize(input.request, ['gestorListas']);
  if (held instanceof AppError) throw held;
  const scoped = scopeParams(input.request.params, input.ctx, held, ['id', 'version', 'nome', 'details', 'details.descricao']);
  const invalid = validateInput(scoped, ['id', 'version', 'nome', 'details'], ['id', 'version', 'nome', 'details', 'details.descricao'], [], {  });
  if (invalid) throw invalid;
  const params = scoped as Listas_tarefasContracts['tarefas.listas_tarefas.cmdSalvarLista']['input'];
  const data = await requests["tarefas.listas_tarefas.cmdSalvarLista"](params, input.ctx);
  return { ok: true, data: data as Listas_tarefasContracts['tarefas.listas_tarefas.cmdSalvarLista']['output'], error: null };
}

async function handleQryListasTarefas(input: IRequestEnvelope): Promise<BffResponse<Listas_tarefasContracts['tarefas.listas_tarefas.qryListasTarefas']['output']>> {
  const held = authorize(input.request, ['gestorListas']);
  if (held instanceof AppError) throw held;
  const scoped = scopeParams(input.request.params, input.ctx, held, ['texto', 'page', 'pageSize']);
  const invalid = validateInput(scoped, ['page', 'pageSize'], ['texto', 'page', 'pageSize'], [], {  });
  if (invalid) throw invalid;
  const params = scoped as Listas_tarefasContracts['tarefas.listas_tarefas.qryListasTarefas']['input'];
  const data = await requests["tarefas.listas_tarefas.qryListasTarefas"](params, input.ctx);
  return { ok: true, data: data as Listas_tarefasContracts['tarefas.listas_tarefas.qryListasTarefas']['output'], error: null };
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

