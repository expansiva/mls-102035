/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/requests/tarefas_equipe.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type {
Tarefas_equipeContracts,
TarefaResumo,
TarefaDetalhe,
ContagemSituacao,
ListaOpcao,
ParticipanteOpcao,
ItemChecklistLinha,
EventoTarefa,
} from '/_102047_/l2/tarefas/web/contracts/tarefas_equipe.defs.js';
import { listTarefa } from '/_102047_/l1/tarefas/layer_2_application/usecases/listTarefa.js';
import type { ListTarefaOutput } from '/_102047_/l1/tarefas/layer_2_application/usecases/listTarefa.js';
import { listItemChecklist } from '/_102047_/l1/tarefas/layer_2_application/usecases/listItemChecklist.js';
import type { ListItemChecklistOutput } from '/_102047_/l1/tarefas/layer_2_application/usecases/listItemChecklist.js';
import { listListaTarefas } from '/_102047_/l1/tarefas/layer_2_application/usecases/listListaTarefas.js';
import { listParticipante } from '/_102047_/l1/tarefas/layer_2_application/usecases/listParticipante.js';
import { getParticipante } from '/_102047_/l1/tarefas/layer_2_application/usecases/getParticipante.js';
import { updateTarefa } from '/_102047_/l1/tarefas/layer_2_application/usecases/updateTarefa.js';
import { cancelar } from '/_102047_/l1/tarefas/layer_2_application/usecases/cancelar.js';
import type { ListTarefaInput } from '/_102047_/l1/tarefas/layer_2_application/usecases/listTarefa.js';

type Status = TarefaResumo['status'];
type Prioridade = TarefaResumo['prioridade'];
type ParticipanteStatus = ParticipanteOpcao['details']['identification']['status'];
type TarefaRow = ListTarefaOutput['items'][number];
type ItemRow = ListItemChecklistOutput['items'][number];

interface TarefaBase {
id: string;
version: number;
titulo: string;
status: string;
prioridade: string;
prazo?: string;
listaId: string;
responsavelId: string;
criadorId: string;
criadaEm: string;
details: {
descricao?: string;
motivoDevolucao?: string;
devolvidaEm?: string;
retomadaEm?: string;
concluidaEm?: string;
canceladaEm?: string;
};
}

const STATUS_LIST: Status[] = ['aFazer', 'emAndamento', 'emRevisao', 'concluida', 'cancelada'];
const PRIORIDADES: Prioridade[] = ['baixa', 'media', 'alta'];
const PARTICIPANTE_STATUS: ParticipanteStatus[] = ['Active', 'Inactive', 'Merged', 'Blocked'];
const PAGE_LIMIT = 200;
const RESPONSAVEIS_LIMITE = 10;

function toStatus(value: string): Status {
const found = STATUS_LIST.find((s) => s === value);
if (found === undefined) {
throw new AppError('INVALID_DATA', 'Situação de tarefa desconhecida: ' + value, 500, { value });
}
return found;
}

function toPrioridade(value: string): Prioridade {
const found = PRIORIDADES.find((p) => p === value);
if (found === undefined) {
throw new AppError('INVALID_DATA', 'Prioridade de tarefa desconhecida: ' + value, 500, { value });
}
return found;
}

function toParticipanteStatus(value: string): ParticipanteStatus {
const found = PARTICIPANTE_STATUS.find((s) => s === value);
if (found === undefined) {
throw new AppError('INVALID_DATA', 'Situação de participante desconhecida: ' + value, 500, { value });
}
return found;
}

async function listAll<T>(fetchPage: (page: number, pageSize: number) => Promise<{ items: T[]; hasMore: boolean }>): Promise<T[]> {
const all: T[] = [];
let page = 1;
for (;;) {
const result = await fetchPage(page, PAGE_LIMIT);
for (const item of result.items) all.push(item);
if (!result.hasMore || result.items.length === 0) break;
page += 1;
}
return all;
}

function normalizar(text: string): string {
return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function hoje(ctx: RequestContext): string {
const tz = ctx.organization.timezone;
const now = ctx.clock.nowIso();
if (tz) {
return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
}
return now.slice(0, 10);
}

function isGestor(ctx: RequestContext): boolean {
const scope = ctx.sessionContext.actorScope ?? [];
return scope.some((s) => s === 'gestor' || s.endsWith(':gestor'));
}

/** quemAgeAgoraPorSituacao */
function quemAgeAgoraDe(t: TarefaBase): string | undefined {
if (t.status === 'aFazer' || t.status === 'emAndamento') return t.responsavelId;
if (t.status === 'emRevisao') return t.criadorId;
return undefined;
}

/** tarefaAbertaVencimento */
function aberta(t: TarefaBase): boolean {
return t.status !== 'concluida' && t.status !== 'cancelada';
}

function venceHoje(t: TarefaBase, today: string): boolean {
return aberta(t) && t.prazo != null && t.prazo.slice(0, 10) === today;
}

function atrasada(t: TarefaBase, today: string): boolean {
return aberta(t) && t.prazo != null && t.prazo.slice(0, 10) < today;
}

function aceitaTarefasEfetivo(aceitaTarefas: boolean | null | undefined): boolean {
// participanteNaoConfiguradoAceitaECria: sem configuração vale sim
return aceitaTarefas == null ? true : aceitaTarefas;
}

async function nomesParticipantes(ids: string[], ctx: RequestContext): Promise<Map<string, string>> {
const distinct = Array.from(new Set(ids));
const result = new Map<string, string>();
const found = await Promise.all(distinct.map((id) => getParticipante({ id }, ctx)));
for (const p of found) result.set(p.id, p.details.identification.name);
return result;
}

function nomeDe(map: Map<string, string>, id: string): string {
const nome = map.get(id);
if (nome === undefined) {
throw new AppError('NOT_FOUND', 'Participante não encontrado', 404, { id });
}
return nome;
}

async function nomesListas(ctx: RequestContext): Promise<Map<string, string>> {
const listas = await listAll((page, pageSize) => listListaTarefas({ page, pageSize }, ctx));
const map = new Map<string, string>();
for (const l of listas) map.set(l.id, l.nome);
return map;
}

function nomeLista(map: Map<string, string>, id: string): string {
const nome = map.get(id);
if (nome === undefined) {
throw new AppError('NOT_FOUND', 'Lista de tarefas não encontrada', 404, { id });
}
return nome;
}

async function lerTarefa(id: string, ctx: RequestContext): Promise<TarefaRow> {
const result = await listTarefa({ id, page: 1, pageSize: 1 }, ctx);
const t = result.items[0];
if (t === undefined) {
throw new AppError('NOT_FOUND', 'Tarefa não encontrada', 404, { id });
}
return t;
}

async function itensChecklist(tarefaId: string, ctx: RequestContext): Promise<ItemRow[]> {
const items = await listAll((page, pageSize) => listItemChecklist({ tarefaId, page, pageSize }, ctx));
return items.slice().sort((a, b) => a.ordem - b.ordem);
}

function progresso(items: ItemRow[]): string {
const marcados = items.filter((i) => i.details.concluido).length;
return String(marcados) + ' de ' + String(items.length);
}

function evento(tipo: string, momento: string, responsavelNome?: string, motivo?: string): EventoTarefa {
const details: EventoTarefa['details'] = motivo != null ? { motivoDevolucao: motivo } : {};
return {
tipo,
momento,
details,
...(responsavelNome !== undefined ? { responsavelNome } : {}),
};
}

function montarHistorico(t: TarefaBase, nomes: Map<string, string>, extras: EventoTarefa[]): EventoTarefa[] {
const responsavel = nomeDe(nomes, t.responsavelId);
const criador = nomeDe(nomes, t.criadorId);
const eventos: EventoTarefa[] = [evento('criada', t.criadaEm, responsavel)];
if (t.details.devolvidaEm != null) eventos.push(evento('devolvida', t.details.devolvidaEm, responsavel, t.details.motivoDevolucao));
if (t.details.retomadaEm != null) eventos.push(evento('retomada', t.details.retomadaEm, responsavel));
if (t.details.concluidaEm != null) eventos.push(evento('concluida', t.details.concluidaEm, criador));
if (t.details.canceladaEm != null) eventos.push(evento('cancelada', t.details.canceladaEm));
for (const e of extras) eventos.push(e);
return eventos.sort((a, b) => a.momento.localeCompare(b.momento));
}

async function montarDetalhe(t: TarefaBase, ctx: RequestContext, extras: EventoTarefa[]): Promise<TarefaDetalhe> {
const agora = quemAgeAgoraDe(t);
const ids = [t.responsavelId, t.criadorId];
if (agora !== undefined) ids.push(agora);
const [nomes, listas, checklist, subtarefas] = await Promise.all([
nomesParticipantes(ids, ctx),
nomesListas(ctx),
itensChecklist(t.id, ctx),
listAll((page, pageSize) => listTarefa({ tarefaPaiId: t.id, page, pageSize }, ctx)),
]);
const linhas: ItemChecklistLinha[] = checklist.map((i) => {
const details: ItemChecklistLinha['details'] = {
descricao: i.details.descricao,
concluido: i.details.concluido,
...(i.details.concluidoEm != null ? { concluidoEm: i.details.concluidoEm } : {}),
};
return { id: i.id, ordem: i.ordem, details };
});
const details: TarefaDetalhe['details'] = {
aberta: aberta(t), // tarefaAbertaVencimento
quantidadeSubtarefas: subtarefas.length,
progressoChecklist: progresso(checklist),
// quemAgeAgoraPorSituacao
...(agora !== undefined ? { quemAgeAgora: agora } : {}),
...(t.details.descricao != null ? { descricao: t.details.descricao } : {}),
};
const detalhe: TarefaDetalhe = {
id: t.id,
version: t.version,
titulo: t.titulo,
status: toStatus(t.status),
prioridade: toPrioridade(t.prioridade),
...(t.prazo != null ? { prazo: t.prazo } : {}),
listaId: t.listaId,
listaTarefas: { nome: nomeLista(listas, t.listaId) },
responsavelId: t.responsavelId,
participante: { details: { identification: { name: nomeDe(nomes, t.responsavelId) } } },
criadorId: t.criadorId,
criadorNome: nomeDe(nomes, t.criadorId),
details,
...(agora !== undefined ? { quemAgeAgoraNome: nomeDe(nomes, agora) } : {}),
criadaEm: t.criadaEm,
checklist: linhas,
historico: montarHistorico(t, nomes, extras),
};
return detalhe;
}

function paginaDe(input: { page?: number; pageSize?: number }): { page: number; pageSize: number } {
const page = input.page != null && input.page >= 1 ? Math.floor(input.page) : 1;
const rawSize = input.pageSize != null && input.pageSize >= 1 ? Math.floor(input.pageSize) : 20;
return { page, pageSize: Math.min(rawSize, PAGE_LIMIT) };
}

function porNome(a: string, b: string): number {
return a.localeCompare(b, 'pt', { sensitivity: 'base' });
}

async function participantesOpcoes(ctx: RequestContext): Promise<ParticipanteOpcao[]> {
const todos = await listAll((page, pageSize) => listParticipante({ page, pageSize }, ctx));
return todos
.map((p): ParticipanteOpcao => ({
id: p.id,
details: {
identification: {
name: p.details.identification.name,
status: toParticipanteStatus(p.details.identification.status),
},
// participanteNaoConfiguradoAceitaECria: calculated, never stored
tarefas: { aceitaTarefasEfetivo: aceitaTarefasEfetivo(p.details.tarefas?.aceitaTarefas) },
},
}))
.sort((a, b) => porNome(a.details.identification.name, b.details.identification.name));
}

export const requests: { [K in keyof Tarefas_equipeContracts]: (input: Tarefas_equipeContracts[K]['input'], ctx: RequestContext) => Promise<Tarefas_equipeContracts[K]['output']> } = {
'tarefas.tarefas_equipe.carregarFiltrosEquipe': async function (input, ctx) {
void input;
const listasRaw = await listAll((page, pageSize) => listListaTarefas({ page, pageSize }, ctx));
const listas: ListaOpcao[] = listasRaw
.map((l) => ({ id: l.id, nome: l.nome }))
.sort((a, b) => porNome(a.nome, b.nome));
const participantes = await participantesOpcoes(ctx);
return { listas, participantes };
},

'tarefas.tarefas_equipe.listarTarefasEquipe': async function (input, ctx) {
const { page, pageSize } = paginaDe(input);
// membroVeResponsavelOuCriador / gestorPorAcessoPlataforma: o gestor vê todas as tarefas, sem filtro de dono
const filtro: ListTarefaInput = { page: 1, pageSize: PAGE_LIMIT };
if (input.listaId != null) filtro.listaId = input.listaId;
if (input.responsavelId != null) filtro.responsavelId = input.responsavelId;
if (input.prioridade != null) filtro.prioridade = input.prioridade;
if (input.status != null) filtro.status = input.status;
const base = await listAll((p, size) => listTarefa({ ...filtro, page: p, pageSize: size }, ctx));
const de = input.prazoDe != null && input.prazoDe !== '' ? input.prazoDe.slice(0, 10) : undefined;
const ate = input.prazoAte != null && input.prazoAte !== '' ? input.prazoAte.slice(0, 10) : undefined;
const filtradas = base
.filter((t) => {
if (de === undefined && ate === undefined) return true;
if (t.prazo == null) return false;
const dia = t.prazo.slice(0, 10);
if (de !== undefined && dia < de) return false;
if (ate !== undefined && dia > ate) return false;
return true;
})
.sort((a, b) => b.criadaEm.localeCompare(a.criadaEm));
const contagemPorSituacao: ContagemSituacao[] = STATUS_LIST.map((status) => ({
status,
quantidade: filtradas.filter((t) => t.status === status).length,
}));
const inicio = (page - 1) * pageSize;
const pagina = filtradas.slice(inicio, inicio + pageSize);
const hasMore = inicio + pageSize < filtradas.length;
const today = hoje(ctx);
const ids: string[] = [];
for (const t of pagina) {
ids.push(t.responsavelId);
const agora = quemAgeAgoraDe(t);
if (agora !== undefined) ids.push(agora);
}
const [nomes, listas, checklists] = await Promise.all([
nomesParticipantes(ids, ctx),
nomesListas(ctx),
Promise.all(pagina.map((t) => itensChecklist(t.id, ctx))),
]);
const items: TarefaResumo[] = pagina.map((t, idx) => {
const agora = quemAgeAgoraDe(t); // quemAgeAgoraPorSituacao
const itens = checklists[idx] ?? [];
const details: TarefaResumo['details'] = {
venceHoje: venceHoje(t, today), // tarefaAbertaVencimento
atrasada: atrasada(t, today),
progressoChecklist: progresso(itens),
...(agora !== undefined ? { quemAgeAgora: agora } : {}),
};
const resumo: TarefaResumo = {
id: t.id,
version: t.version,
titulo: t.titulo,
status: toStatus(t.status),
prioridade: toPrioridade(t.prioridade),
...(t.prazo != null ? { prazo: t.prazo } : {}),
listaId: t.listaId,
listaTarefas: { nome: nomeLista(listas, t.listaId) },
responsavelId: t.responsavelId,
participante: { details: { identification: { name: nomeDe(nomes, t.responsavelId) } } },
criadaEm: t.criadaEm,
details,
...(agora !== undefined ? { quemAgeAgoraNome: nomeDe(nomes, agora) } : {}),
};
return resumo;
});
return { tarefas: { items, page, pageSize, hasMore }, contagemPorSituacao };
},

'tarefas.tarefas_equipe.obterTarefaEquipe': async function (input, ctx) {
const t = await lerTarefa(input.tarefaId, ctx);
// moduloNaoGuardaComentarios: comentários e anexos não são devolvidos por aqui
const tarefa = await montarDetalhe(t, ctx, []);
return { tarefa };
},

'tarefas.tarefas_equipe.buscarResponsaveisDisponiveis': async function (input, ctx) {
const todos = await participantesOpcoes(ctx);
const termo = input.nome != null ? normalizar(input.nome.trim()) : '';
const participantes = todos
.filter((p) => p.details.identification.status === 'Active' && p.details.tarefas.aceitaTarefasEfetivo) // responsavelAceitaTarefas
.filter((p) => termo === '' || normalizar(p.details.identification.name).includes(termo)) // escolhaResponsavelPeloNome: só pelo nome
.slice(0, RESPONSAVEIS_LIMITE);
return { participantes };
},

'tarefas.tarefas_equipe.trocarResponsavelTarefa': async function (input, ctx) {
return ctx.data.moduleData.runInTransaction(async (tx) => {
const bound: RequestContext = { ...ctx, data: { ...ctx.data, moduleData: tx } };
const atual = await lerTarefa(input.id, bound);
// reatribuirApenasCriadorOuGestor, gestorPorAcessoPlataforma
if (!isGestor(bound) && atual.criadorId !== bound.sessionContext.actorId) {
throw new AppError('FORBIDDEN', 'Somente quem criou a tarefa ou o gestor pode trocar o responsável', 403, { ruleId: 'reatribuirApenasCriadorOuGestor' });
}
const novo = await getParticipante({ id: input.responsavelId }, bound);
const nomeNovo = novo.details.identification.name;
// responsavelAceitaTarefas
if (toParticipanteStatus(novo.details.identification.status) !== 'Active' || !aceitaTarefasEfetivo(novo.details.tarefas?.aceitaTarefas)) {
throw new AppError('RESPONSAVEL_INVALIDO', 'O participante ' + nomeNovo + ' não pode ser responsável: precisa estar ativo e aceitar tarefas', 422, { ruleId: 'responsavelAceitaTarefas', responsavelId: input.responsavelId });
}
if (atual.version !== Number(input.version)) {
throw new AppError('VERSION_CONFLICT', 'A tarefa ' + atual.titulo + ' foi alterada por outra pessoa; recarregue e tente de novo', 409, { id: input.id, versaoLida: input.version, versaoAtual: atual.version });
}
// edicaoNaoMudaSituacao: grava só o responsável, sem enviar a situação
const atualizada = await updateTarefa({
id: input.id,
version: Number(input.version),
responsavelId: input.responsavelId,
}, bound);
// avisarQuemAgeAgora: a pessoa que passa a agir agora (calculada pela situação) é a avisada pela ocorrência do processo
const avisado = quemAgeAgoraDe(atualizada);
if (avisado !== undefined) {
bound.log.info('avisarQuemAgeAgora: reatribuição', { tarefaId: atualizada.id, avisado });
}
const troca = evento('responsavelTrocado', bound.clock.nowIso(), nomeNovo);
const tarefa = await montarDetalhe(atualizada, bound, [troca]);
return { tarefa };
});
},

'tarefas.tarefas_equipe.cancelarTarefaEquipe': async function (input, ctx) {
return ctx.data.moduleData.runInTransaction(async (tx) => {
const bound: RequestContext = { ...ctx, data: { ...ctx.data, moduleData: tx } };
const atual = await lerTarefa(input.id, bound);
// cancelarApenasCriadorOuGestor, gestorPorAcessoPlataforma
if (!isGestor(bound) && atual.criadorId !== bound.sessionContext.actorId) {
throw new AppError('FORBIDDEN', 'Somente quem criou a tarefa ou o gestor pode cancelá-la', 403, { ruleId: 'cancelarApenasCriadorOuGestor' });
}
if (atual.status !== 'aFazer' && atual.status !== 'emAndamento' && atual.status !== 'emRevisao') {
throw new AppError('TAREFA_NAO_CANCELAVEL', 'A tarefa ' + atual.titulo + ' só pode ser cancelada a fazer, em andamento ou em revisão', 409, { ruleId: 'cancelarApenasCriadorOuGestor', id: input.id, status: atual.status });
}
if (atual.version !== Number(input.version)) {
throw new AppError('VERSION_CONFLICT', 'A tarefa ' + atual.titulo + ' foi alterada por outra pessoa; recarregue e tente de novo', 409, { id: input.id, versaoLida: input.version, versaoAtual: atual.version });
}
// avisarQuemAgeAgora: antes de trocar a situação, identifica quem estava agindo; essa pessoa é a avisada no cancelamento
const estavaAgindo = quemAgeAgoraDe(atual);
if (estavaAgindo !== undefined) {
bound.log.info('avisarQuemAgeAgora: cancelamento', { tarefaId: atual.id, avisado: estavaAgindo });
}
const cancelada = await cancelar({ id: input.id, version: Number(input.version) }, bound);
// quemAgeAgoraPorSituacao: depois do cancelamento ninguém age agora (calculado pela situação)
const tarefa = await montarDetalhe(cancelada, bound, []);
return { tarefa };
});
},
};
