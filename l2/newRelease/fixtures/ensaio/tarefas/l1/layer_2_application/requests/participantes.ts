/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/requests/participantes.ts" enhancement="_blank"/>
import type { ParticipantesContracts, ParticipanteModulo, UsuarioOrganizacao } from '/_102047_/l2/tarefas/web/contracts/participantes.defs.js';
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { listParticipante } from '/_102047_/l1/tarefas/layer_2_application/usecases/listParticipante.js';
import { getParticipante } from '/_102047_/l1/tarefas/layer_2_application/usecases/getParticipante.js';
import { createParticipante } from '/_102047_/l1/tarefas/layer_2_application/usecases/createParticipante.js';
import { updateParticipante } from '/_102047_/l1/tarefas/layer_2_application/usecases/updateParticipante.js';

const ROLE_TAG = 'tarefas.Participante';
const MAX_USUARIOS = 10;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 200;

interface ParticipanteFonte {
  id: string;
  version: number;
  details: {
    identification: {
      name: string;
      status: string;
      tags: string[];
    };
    tarefas?: {
      aceitaTarefas?: boolean;
      podeCriarTarefas?: boolean;
    };
  };
}

type Status = ParticipanteModulo['details']['identification']['status'];

function toStatus(value: string, name: string): Status {
  if (value === 'Active' || value === 'Inactive' || value === 'Merged' || value === 'Blocked') return value;
  throw new AppError('INVALID_STATUS', 'Situação desconhecida para o participante ' + name + ': ' + value, 500, { status: value });
}

function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function toParticipante(src: ParticipanteFonte): ParticipanteModulo {
  const aceita = src.details.tarefas?.aceitaTarefas;
  const podeCriar = src.details.tarefas?.podeCriarTarefas;
  // participanteNaoConfiguradoAceitaECria: marca vazia vale sim; os efetivos são calculados, nunca gravados.
  const aceitaEfetivo: boolean = aceita == null ? true : aceita;
  const podeCriarEfetivo: boolean = podeCriar == null ? true : podeCriar;
  const tarefas: ParticipanteModulo['details']['tarefas'] = {
    ...(aceita != null ? { aceitaTarefas: aceita } : {}),
    ...(podeCriar != null ? { podeCriarTarefas: podeCriar } : {}),
    aceitaTarefasEfetivo: aceitaEfetivo,
    podeCriarTarefasEfetivo: podeCriarEfetivo,
  };
  const name = src.details.identification.name;
  return {
    id: src.id,
    version: src.version,
    details: {
      identification: {
        name,
        status: toStatus(src.details.identification.status, name),
        tags: src.details.identification.tags.join(', '),
      },
      tarefas,
    },
  };
}

function assertGestor(ctx: RequestContext): void {
  const scope = ctx.sessionContext.actorScope ?? [];
  const isGestor = scope.some((item) => item === 'gestor' || item.endsWith(':gestor'));
  if (!isGestor) {
    throw new AppError('FORBIDDEN', 'Apenas o gestor pode alterar os participantes do módulo.', 403, { ruleId: 'gestorPorAcessoPlataforma' });
  }
}

function hasRole(tags: string[]): boolean {
  return tags.includes(ROLE_TAG);
}

async function loadAllParticipantes(ctx: RequestContext): Promise<ParticipanteFonte[]> {
  const all: ParticipanteFonte[] = [];
  let page = 1;
  for (;;) {
    const result = await listParticipante({ page, pageSize: MAX_PAGE_SIZE }, ctx);
    for (const item of result.items) all.push(item);
    if (!result.hasMore) break;
    page += 1;
  }
  return all.filter((item) => hasRole(item.details.identification.tags));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value as Record<string, unknown>;
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function extractUserList(result: unknown): unknown[] {
  if (Array.isArray(result)) return result;
  const rec = asRecord(result);
  if (rec) {
    for (const key of ['users', 'items']) {
      const candidate = rec[key];
      if (Array.isArray(candidate)) return candidate;
    }
  }
  throw new AppError('PLATFORM_USERS_UNREADABLE', 'A lista de usuários da plataforma veio em formato inesperado.', 502);
}

function userHasRole(tags: unknown): boolean {
  if (Array.isArray(tags)) return tags.some((t) => t === ROLE_TAG);
  if (typeof tags === 'string') return tags.split(',').map((t) => t.trim()).includes(ROLE_TAG);
  return false;
}

export const requests: { [K in keyof ParticipantesContracts]: (input: ParticipantesContracts[K]['input'], ctx: RequestContext) => Promise<ParticipantesContracts[K]['output']> } = {
  'tarefas.participantes.listarParticipantes': async function (input, ctx) {
    const page = input.page >= 1 ? Math.floor(input.page) : 1;
    const pageSize = input.pageSize >= 1 ? Math.min(Math.floor(input.pageSize), MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
    const term = input.busca != null ? normalizeText(input.busca.trim()) : '';
    const all = await loadAllParticipantes(ctx);
    const kept = all
      .filter((item) => term === '' || normalizeText(item.details.identification.name).includes(term))
      .sort((a, b) => a.details.identification.name.localeCompare(b.details.identification.name));
    const start = (page - 1) * pageSize;
    const slice = kept.slice(start, start + pageSize);
    return {
      participantes: {
        items: slice.map(toParticipante),
        page,
        pageSize,
        hasMore: start + pageSize < kept.length,
      },
    };
  },

  'tarefas.participantes.buscarUsuarios': async function (input, ctx) {
    const term = normalizeText(input.busca.trim());
    const participantes = await loadAllParticipantes(ctx);
    const participantIds = new Set(participantes.map((p) => p.id));
    // participanteSemCadastroPessoal: only the name is read from the platform users, no personal data.
    const listed = await ctx.mdm.identity.listUsers();
    const entries = extractUserList(listed);
    const usuarios: UsuarioOrganizacao[] = [];
    for (const entry of entries) {
      const rec = asRecord(entry);
      if (!rec) continue;
      const id = asString(rec['mdmId']) ?? asString(rec['id']);
      const name = asString(rec['name']) ?? asString(rec['title']);
      if (id == null || name == null) continue;
      const rawStatus = asString(rec['status']);
      if (rawStatus != null && rawStatus !== 'Active') continue;
      if (participantIds.has(id) || userHasRole(rec['tags'])) continue;
      if (term !== '' && !normalizeText(name).includes(term)) continue;
      usuarios.push({
        id,
        details: { identification: { name, status: 'Active' } },
      });
    }
    usuarios.sort((a, b) => a.details.identification.name.localeCompare(b.details.identification.name));
    return { usuarios: usuarios.slice(0, MAX_USUARIOS) };
  },

  'tarefas.participantes.incluirParticipante': async function (input, ctx) {
    return ctx.data.moduleData.runInTransaction(async (tx) => {
      const bound: RequestContext = { ...ctx, data: { ...ctx.data, moduleData: tx } };
      assertGestor(bound); // gestorPorAcessoPlataforma
      const existing = await getParticipante({ id: String(input.id) }, bound);
      const name = existing.details.identification.name;
      const current = existing.details.tarefas;
      // escolhaGestorNuncaSobrescrita: a mark the gestor already made is kept.
      // participanteNaoConfiguradoAceitaECria: marks not informed stay empty.
      const tarefas: { aceitaTarefas?: boolean; podeCriarTarefas?: boolean } = {};
      if (current?.aceitaTarefas != null) tarefas.aceitaTarefas = current.aceitaTarefas;
      else if (input.details.tarefas.aceitaTarefas != null) tarefas.aceitaTarefas = input.details.tarefas.aceitaTarefas;
      if (current?.podeCriarTarefas != null) tarefas.podeCriarTarefas = current.podeCriarTarefas;
      else if (input.details.tarefas.podeCriarTarefas != null) tarefas.podeCriarTarefas = input.details.tarefas.podeCriarTarefas;
      // participanteSemCadastroPessoal: only attaches the role to the existing user, with the module namespace.
      const created = await createParticipante(
        { id: String(input.id), details: { identification: { name }, tarefas } },
        bound,
      );
      return { participante: toParticipante(created) };
    });
  },

  'tarefas.participantes.salvarMarcas': async function (input, ctx) {
    return ctx.data.moduleData.runInTransaction(async (tx) => {
      const bound: RequestContext = { ...ctx, data: { ...ctx.data, moduleData: tx } };
      assertGestor(bound); // gestorPorAcessoPlataforma
      const existing = await getParticipante({ id: String(input.id) }, bound);
      const name = existing.details.identification.name;
      // escolhaGestorNuncaSobrescrita: only the gestor writes these marks, here.
      const updated = await updateParticipante(
        {
          id: String(input.id),
          version: Number(input.version),
          details: {
            identification: { name },
            tarefas: {
              aceitaTarefas: input.details.tarefas.aceitaTarefas,
              podeCriarTarefas: input.details.tarefas.podeCriarTarefas,
            },
          },
        },
        bound,
      );
      return { participante: toParticipante(updated) };
    });
  },
};
