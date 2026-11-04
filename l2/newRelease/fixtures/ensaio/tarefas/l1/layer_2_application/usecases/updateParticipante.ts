/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/usecases/updateParticipante.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';

export interface UpdateParticipanteInput extends Record<string, unknown> {
  details: {
    identification: {
      name: string;
    };
    base?: Record<string, unknown>;
    person?: Record<string, unknown>;
    general?: Record<string, unknown>;
    tarefas?: {
      aceitaTarefas?: boolean;
      podeCriarTarefas?: boolean;
    };
  };
  id: string;
  version: number;
}

export interface UpdateParticipanteOutput extends Record<string, unknown> {
  id: string;
  version: number;
  details: {
    identification: {
      subtype: string;
      name: string;
      status: string;
      tags: string[];
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
}

const ROLE_TAG = 'tarefas.Participante';
const MARK_KEYS = ['aceitaTarefas', 'podeCriarTarefas'] as const;

function asRecord(value: unknown): Record<string, unknown> {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

// Being a manager comes from the platform access (actor of the session), never from the marks of a participant.
function isGestor(ctx: RequestContext): boolean {
  const session = ctx.sessionContext;
  const actorId = session.actorId ?? session.actorSession.actorId;
  if (actorId === 'gestor' || actorId === 'tarefas:gestor') return true;
  const scope = [...(session.actorScope ?? []), ...(session.actorSession.scope ?? [])];
  return scope.some((s) => s === 'gestor' || s === 'tarefas:gestor');
}

function readMark(value: unknown, name: string): boolean | undefined {
  if (value == null) return undefined;
  if (typeof value !== 'boolean') {
    throw new AppError('INVALID_VALUE', name + ' must be true or false.', 400);
  }
  return value;
}

export async function updateParticipante(input: UpdateParticipanteInput, ctx: RequestContext): Promise<UpdateParticipanteOutput> {
  if (!isGestor(ctx)) {
    throw new AppError('FORBIDDEN', 'Only the manager, by platform access, can configure the participants of the module.', 403, { ruleId: 'gestorPorAcessoPlataforma' });
  }
  const id = String(input.id ?? '');
  if (id === '') {
    throw new AppError('INVALID_VALUE', 'The participant id is required.', 400);
  }
  const version = Number(input.version);
  if (!Number.isInteger(version)) {
    throw new AppError('INVALID_VALUE', 'The participant version is required.', 400);
  }
  const inputDetails = asRecord(input.details);
  if (Object.keys(asRecord(inputDetails.person)).length > 0 || Object.keys(asRecord(inputDetails.base)).length > 0) {
    throw new AppError('INVALID_VALUE', 'The module does not register people nor store personal data.', 400, { ruleId: 'participanteSemCadastroPessoal' });
  }
  const given = asRecord(inputDetails.tarefas);
  if (given.aceitaTarefasEfetivo != null || given.podeCriarTarefasEfetivo != null) {
    throw new AppError('INVALID_VALUE', 'The effective marks are calculated (a participant not yet configured accepts and can create tasks) and cannot be written.', 400, { ruleId: 'participanteNaoConfiguradoAceitaECria' });
  }
  const sent: { aceitaTarefas?: boolean; podeCriarTarefas?: boolean } = {};
  const aceitaTarefas = readMark(given.aceitaTarefas, 'aceitaTarefas');
  const podeCriarTarefas = readMark(given.podeCriarTarefas, 'podeCriarTarefas');
  if (aceitaTarefas !== undefined) sent.aceitaTarefas = aceitaTarefas;
  if (podeCriarTarefas !== undefined) sent.podeCriarTarefas = podeCriarTarefas;
  if (aceitaTarefas === undefined && podeCriarTarefas === undefined) {
    throw new AppError('INVALID_VALUE', 'Inform aceitaTarefas or podeCriarTarefas.', 400);
  }

  const current = await ctx.mdm.entity.get({ mdmId: id });
  if (current == null) {
    throw new AppError('NOT_FOUND', 'Participante not found.', 404);
  }
  const currentDetails = asRecord(current.details);
  const currentTags = Array.isArray(currentDetails.tags) ? currentDetails.tags.map((t) => String(t)) : [];
  if (!currentTags.includes(ROLE_TAG)) {
    throw new AppError('NOT_FOUND', 'Participante not found.', 404);
  }
  if (Number(current.version) !== version) {
    throw new AppError('CONCURRENCY_CONFLICT', 'Version does not match the stored row.', 409);
  }

  // Only the module branch is written: marks already made stay unless the manager sends a new value;
  // a mark never made stays absent (not configured), it is not written as false.
  const existing = asRecord(currentDetails.tarefas);
  const branch: { aceitaTarefas?: boolean; podeCriarTarefas?: boolean } = {};
  if (typeof existing.aceitaTarefas === 'boolean') branch.aceitaTarefas = existing.aceitaTarefas;
  if (typeof existing.podeCriarTarefas === 'boolean') branch.podeCriarTarefas = existing.podeCriarTarefas;
  if (sent.aceitaTarefas !== undefined) branch.aceitaTarefas = sent.aceitaTarefas;
  if (sent.podeCriarTarefas !== undefined) branch.podeCriarTarefas = sent.podeCriarTarefas;

  // escolhaGestorNuncaSobrescrita: a mark already made and not sent by the manager must go out unchanged.
  for (const key of MARK_KEYS) {
    const stored = existing[key];
    if (typeof stored === 'boolean' && sent[key] === undefined && branch[key] !== stored) {
      throw new AppError('CONFLICT', 'The mark ' + key + ' was already chosen by the manager and is not overwritten automatically.', 409, { ruleId: 'escolhaGestorNuncaSobrescrita' });
    }
  }

  const updated = await ctx.mdm.entity.update({
    mdmId: id,
    expectedVersion: version,
    patch: { tarefas: branch },
  });

  const d = asRecord(updated.details);
  const savedBranch = asRecord(d.tarefas);

  // escolhaGestorNuncaSobrescrita: verify that the marks not sent by the manager survived the write.
  for (const key of MARK_KEYS) {
    const stored = existing[key];
    if (typeof stored === 'boolean' && sent[key] === undefined && savedBranch[key] !== stored) {
      throw new AppError('CONFLICT', 'The mark ' + key + ' was already chosen by the manager and was changed automatically; only the manager changes it.', 409, { ruleId: 'escolhaGestorNuncaSobrescrita' });
    }
  }

  const savedAceita = typeof savedBranch.aceitaTarefas === 'boolean' ? savedBranch.aceitaTarefas : undefined;
  const savedPode = typeof savedBranch.podeCriarTarefas === 'boolean' ? savedBranch.podeCriarTarefas : undefined;
  const tarefas: {
    aceitaTarefas?: boolean;
    podeCriarTarefas?: boolean;
    aceitaTarefasEfetivo?: boolean;
    podeCriarTarefasEfetivo?: boolean;
  } = {
    // A participant not yet configured accepts and can create tasks.
    aceitaTarefasEfetivo: savedAceita ?? true,
    podeCriarTarefasEfetivo: savedPode ?? true,
  };
  if (savedAceita !== undefined) tarefas.aceitaTarefas = savedAceita;
  if (savedPode !== undefined) tarefas.podeCriarTarefas = savedPode;

  const tags = Array.isArray(d.tags) ? d.tags.map((t) => String(t)) : [];
  return {
    id: String(updated.mdmId),
    version: Number(updated.version),
    details: {
      identification: {
        subtype: d.subtype == null ? 'Person' : String(d.subtype),
        name: d.name == null ? '' : String(d.name),
        status: d.status == null ? '' : String(d.status),
        tags,
      },
      tarefas,
    },
  };
}
