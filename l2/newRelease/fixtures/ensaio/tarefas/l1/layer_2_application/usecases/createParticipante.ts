/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/usecases/createParticipante.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
export interface CreateParticipanteInput extends Record<string, unknown> {
id?: string;
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
}
export interface CreateParticipanteOutput extends Record<string, unknown> {
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
const hasKeys = (value: unknown): boolean =>
value != null && typeof value === 'object' && Object.keys(value as Record<string, unknown>).length > 0;
const asRecord = (value: unknown): Record<string, unknown> =>
value != null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

export async function createParticipante(input: CreateParticipanteInput, ctx: RequestContext): Promise<CreateParticipanteOutput> {
const id = input.id == null ? '' : String(input.id).trim();
if (id === '') {
throw new AppError('VALIDATION_ERROR', 'The id of the organization user chosen as participant is required.', 400, { ruleId: 'participanteSemCadastroPessoal' });
}
const given = input.details;
// participanteSemCadastroPessoal: the module never registers a person nor takes personal data.
if (hasKeys(given?.person) || hasKeys(given?.base)) {
throw new AppError('VALIDATION_ERROR', 'The module does not register people nor accept personal data; only the manager marks are stored.', 400, { ruleId: 'participanteSemCadastroPessoal' });
}
// The marks the manager chose (absent = not configured, which counts as yes).
const givenMarks = asRecord(given?.tarefas);
// participanteNaoConfiguradoAceitaECria: the effective values are derived (unconfigured = yes), never written.
if (givenMarks.aceitaTarefasEfetivo !== undefined || givenMarks.podeCriarTarefasEfetivo !== undefined) {
throw new AppError('VALIDATION_ERROR', 'The effective marks are derived from the manager choice (unconfigured counts as yes) and cannot be written.', 400, { ruleId: 'participanteNaoConfiguradoAceitaECria' });
}
const chosen: Record<string, boolean> = {};
for (const key of MARK_KEYS) {
const value = givenMarks[key];
if (value == null) continue;
if (typeof value !== 'boolean') {
throw new AppError('VALIDATION_ERROR', `The mark ${key} must be true or false.`, 400);
}
chosen[key] = value;
}
// The participant is an existing organization user, chosen by id; it is never created here.
const existing = await ctx.mdm.entity.get({ mdmId: id });
if (existing == null) {
throw new AppError('NOT_FOUND', 'The organization user was not found.', 404);
}
const existingDetails = asRecord(existing.details);
const existingStatus = existingDetails.status;
if (existingStatus != null && existingStatus !== 'Active') {
throw new AppError('CONFLICT', 'Only active organization users can participate in the module.', 409);
}
// escolhaGestorNuncaSobrescrita: a mark already made by the manager is never overwritten here.
const alreadyStored = asRecord(existingDetails.tarefas);
for (const key of Object.keys(chosen)) {
const stored = alreadyStored[key];
if (typeof stored === 'boolean' && stored !== chosen[key]) {
throw new AppError('CONFLICT', `The mark ${key} was already chosen by the manager and is not overwritten automatically.`, 409, { ruleId: 'escolhaGestorNuncaSobrescrita' });
}
}
const attached = await ctx.mdm.entity.attachRole(id, ROLE_TAG);
let current = attached;
if (Object.keys(chosen).length > 0) {
// Only the marks the manager sent are written; marks already stored and not sent stay as they are.
const stored = asRecord(asRecord(attached.details).tarefas);
const branch: Record<string, unknown> = {};
for (const key of MARK_KEYS) {
if (typeof stored[key] === 'boolean') branch[key] = stored[key];
}
for (const key of Object.keys(chosen)) branch[key] = chosen[key];
current = await ctx.mdm.entity.update({
mdmId: attached.mdmId,
expectedVersion: attached.version,
patch: { tarefas: branch } as never,
});
}
const details = asRecord(current.details);
const marks = asRecord(details.tarefas);
const aceita = typeof marks.aceitaTarefas === 'boolean' ? marks.aceitaTarefas : undefined;
const podeCriar = typeof marks.podeCriarTarefas === 'boolean' ? marks.podeCriarTarefas : undefined;
// Derived values, computed each time, never stored: unconfigured counts as yes.
const tarefas: NonNullable<CreateParticipanteOutput['details']['tarefas']> = {
aceitaTarefasEfetivo: aceita ?? true,
podeCriarTarefasEfetivo: podeCriar ?? true,
};
if (aceita !== undefined) tarefas.aceitaTarefas = aceita;
if (podeCriar !== undefined) tarefas.podeCriarTarefas = podeCriar;
const tags = Array.isArray(details.tags) ? details.tags.map((tag) => String(tag)) : [];
const output: CreateParticipanteOutput = {
id: String(current.mdmId),
version: Number(current.version),
details: {
identification: {
subtype: details.subtype == null ? 'Person' : String(details.subtype),
name: details.name == null ? '' : String(details.name),
status: details.status == null ? 'Active' : String(details.status),
tags,
},
tarefas,
},
};
return output;
}
