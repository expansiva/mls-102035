/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/usecases/getParticipante.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';

export interface GetParticipanteInput extends Record<string, unknown> {
id: string;
}

export interface GetParticipanteOutput extends Record<string, unknown> {
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

export async function getParticipante(input: GetParticipanteInput, ctx: RequestContext): Promise<GetParticipanteOutput> {
const id = input.id == null ? '' : String(input.id);
if (id === '') {
throw new AppError('INVALID_INPUT', 'id is required.', 400);
}

const found = await ctx.mdm.entity.get({ mdmId: id });
if (!found || found.mdmId == null || found.mdmId === '') {
throw new AppError('NOT_FOUND', 'Participante was not found.', 404);
}

const flat: Record<string, unknown> = { ...found.details };

const tags: string[] = Array.isArray(flat.tags) ? flat.tags.map((tag) => String(tag)) : [];

const identification = {
subtype: flat.subtype == null ? 'Person' : String(flat.subtype),
name: flat.name == null ? '' : String(flat.name),
status: flat.status == null ? '' : String(flat.status),
tags,
};

const branch: Record<string, unknown> =
flat.tarefas != null && typeof flat.tarefas === 'object' && !Array.isArray(flat.tarefas)
? (flat.tarefas as Record<string, unknown>)
: {};

const aceitaTarefas = typeof branch.aceitaTarefas === 'boolean' ? branch.aceitaTarefas : undefined;
const podeCriarTarefas = typeof branch.podeCriarTarefas === 'boolean' ? branch.podeCriarTarefas : undefined;

// Derived: an unconfigured participant accepts and can create tasks.
const tarefas: NonNullable<GetParticipanteOutput['details']['tarefas']> = {
aceitaTarefasEfetivo: aceitaTarefas ?? true,
podeCriarTarefasEfetivo: podeCriarTarefas ?? true,
};
if (aceitaTarefas !== undefined) tarefas.aceitaTarefas = aceitaTarefas;
if (podeCriarTarefas !== undefined) tarefas.podeCriarTarefas = podeCriarTarefas;

const details: GetParticipanteOutput['details'] = { identification, tarefas };
if (flat.general != null && typeof flat.general === 'object' && !Array.isArray(flat.general)) {
details.general = flat.general as Record<string, unknown>;
}

return {
id: String(found.mdmId),
version: Number(found.version),
details,
};
}
