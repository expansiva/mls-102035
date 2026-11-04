/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/usecases/listParticipante.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { Participante } from '/_102047_/l1/tarefas/layer_3_domain/entities/participante.js';

export interface ListParticipanteInput extends Record<string, unknown> {
  id?: string;
  details?: {
    identification?: {
      subtype?: string;
      name?: string;
      status?: string;
      tags?: string[];
    };
    base?: Record<string, unknown>;
    person?: Record<string, unknown>;
    general?: Record<string, unknown>;
    tarefas?: {
      aceitaTarefas?: boolean;
      podeCriarTarefas?: boolean;
      aceitaTarefasEfetivo?: boolean;
      podeCriarTarefasEfetivo?: boolean;
    };
  };
  page: number;
  pageSize: number;
}

export interface ListParticipanteOutput extends Record<string, unknown> {
  items: Participante[];
  hasMore: boolean;
}

type ParticipanteStatus = Participante['details']['identification']['status'];

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

function optionalObject(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  return undefined;
}

function pack(mdmId: unknown, version: unknown, rawDetails: unknown): Participante {
  const flat = asRecord(rawDetails);
  const tags = Array.isArray(flat.tags) ? flat.tags.map((tag) => String(tag)) : [];
  const branch = asRecord(flat.tarefas);
  const aceitaTarefas = branch.aceitaTarefas == null ? undefined : Boolean(branch.aceitaTarefas);
  const podeCriarTarefas = branch.podeCriarTarefas == null ? undefined : Boolean(branch.podeCriarTarefas);
  const details: Participante['details'] = {
    identification: {
      subtype: 'Person',
      name: String(flat.name ?? ''),
      status: String(flat.status ?? '') as ParticipanteStatus,
      tags,
    },
    // derived: an unconfigured participant accepts and can create (participanteNaoConfiguradoAceitaECria)
    tarefas: {
      aceitaTarefasEfetivo: aceitaTarefas == null ? true : aceitaTarefas,
      podeCriarTarefasEfetivo: podeCriarTarefas == null ? true : podeCriarTarefas,
    },
  };
  if (aceitaTarefas !== undefined && details.tarefas) details.tarefas.aceitaTarefas = aceitaTarefas;
  if (podeCriarTarefas !== undefined && details.tarefas) details.tarefas.podeCriarTarefas = podeCriarTarefas;
  const base = optionalObject(flat.base);
  const person = optionalObject(flat.person);
  const general = optionalObject(flat.general);
  if (base) details.base = base;
  if (person) details.person = person;
  if (general) details.general = general;
  return { id: String(mdmId ?? ''), version: Number(version ?? 0), details };
}

export async function listParticipante(input: ListParticipanteInput, ctx: RequestContext): Promise<ListParticipanteOutput> {
  const idValue = input.id;
  if (idValue !== undefined && idValue !== null && String(idValue) !== '') {
    const found = await ctx.mdm.entity.get({ mdmId: String(idValue) });
    if (!found) {
      throw new AppError('NOT_FOUND', 'Participante not found.', 404);
    }
    return { items: [pack(found.mdmId, found.version, found.details)], hasMore: false };
  }

  const rawPage = Number(input.page);
  const rawPageSize = Number(input.pageSize);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const pageSize = Number.isFinite(rawPageSize) && rawPageSize >= 1 ? Math.min(Math.floor(rawPageSize), 200) : 20;

  const nameValue = input.details?.identification?.name;
  const name = nameValue === undefined || nameValue === null ? '' : String(nameValue).trim();

  const result = name !== ''
    ? await ctx.mdm.collection.listByType({ type: 'tarefas.Participante', name, page, pageSize })
    : await ctx.mdm.collection.listByType({ type: 'tarefas.Participante', page, pageSize });

  const items: Participante[] = [];
  for (const item of result.items) {
    const row = asRecord(item);
    if (typeof row.version === 'number') {
      items.push(pack(row.mdmId, row.version, row.details));
    } else {
      const full = await ctx.mdm.entity.get({ mdmId: String(row.mdmId) });
      items.push(pack(full.mdmId, full.version, full.details));
    }
  }

  return { items, hasMore: result.page * result.pageSize < result.total };
}
