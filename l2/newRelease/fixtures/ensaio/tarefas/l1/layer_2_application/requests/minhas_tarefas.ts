/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/requests/minhas_tarefas.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type {
Minhas_tarefasContracts,
TarefaResumo,
TarefaCompleta,
EventoHistorico,
ItemChecklistLinha,
ListaTarefasNome,
ParticipanteOpcao,
} from '/_102047_/l2/tarefas/web/contracts/minhas_tarefas.defs.js';
import { listTarefa } from '/_102047_/l1/tarefas/layer_2_application/usecases/listTarefa.js';
import type { ListTarefaInput, ListTarefaOutput } from '/_102047_/l1/tarefas/layer_2_application/usecases/listTarefa.js';
import { listListaTarefas } from '/_102047_/l1/tarefas/layer_2_application/usecases/listListaTarefas.js';
import { getParticipante } from '/_102047_/l1/tarefas/layer_2_application/usecases/getParticipante.js';
import type { GetParticipanteOutput } from '/_102047_/l1/tarefas/layer_2_application/usecases/getParticipante.js';
import { listParticipante } from '/_102047_/l1/tarefas/layer_2_application/usecases/listParticipante.js';
import { listItemChecklist } from '/_102047_/l1/tarefas/layer_2_application/usecases/listItemChecklist.js';
import type { ListItemChecklistOutput } from '/_102047_/l1/tarefas/layer_2_application/usecases/listItemChecklist.js';
import { createItemChecklist } from '/_102047_/l1/tarefas/layer_2_application/usecases/createItemChecklist.js';
import { updateItemChecklist } from '/_102047_/l1/tarefas/layer_2_application/usecases/updateItemChecklist.js';
import { updateTarefa } from '/_102047_/l1/tarefas/layer_2_application/usecases/updateTarefa.js';
import type { UpdateTarefaInput } from '/_102047_/l1/tarefas/layer_2_application/usecases/updateTarefa.js';
import {
abrirOcorrenciaTarefa,
avancarEtapaTarefa,
cancelarOcorrenciaTarefa,
trocarResponsavelOcorrencia,
} from '/_102047_/l1/tarefas/layer_2_application/workflows/processoTarefa.js';
import type { TransicaoTarefa } from '/_102047_/l1/tarefas/layer_2_application/workflows/processoTarefa.js';

type TarefaRow = ListTarefaOutput['items'][number];
type ItemRow = ListItemChecklistOutput['items'][number];
type Status = TarefaResumo['status'];
type Prioridade = TarefaResumo['prioridade'];
type ParticipanteStatus = ParticipanteOpcao['details']['identification']['status'];
type Grupo = 'responsavel' | 'criadas' | 'dependeDeMim';
type Saida = { tarefa: TarefaCompleta; historico: EventoHistorico[] };

const STATUS_LIST: Status[] = ['aFazer', 'emAndamento', 'emRevisao', 'concluida', 'cancelada'];
const PRIORIDADES: Prioridade[] = ['baixa', 'media', 'alta'];
const PARTICIPANTE_STATUS: ParticipanteStatus[] = ['Active', 'Inactive', 'Merged', 'Blocked'];
const GRUPOS: Grupo[] = ['responsavel', 'criadas', 'dependeDeMim'];
const PAGE_LIMIT = 200;
const LISTA_CURTA = 10;

function toStatus(value: string): Status {
const found = STATUS_LIST.find((s) => s === value);
if (found === undefined) {
throw new AppError('INVALID_DATA', 'Unknown task status: ' + value, 500, { value });
}
return found;
}

function toPrioridade(value: string): Prioridade {
const found = PRIORIDADES.find((p) => p === value);
if (found === undefined) {
throw new AppError('INVALID_DATA', 'Unknown task priority: ' + value, 500, { value });
}
return found;
}

function toParticipanteStatus(value: string): ParticipanteStatus {
const found = PARTICIPANTE_STATUS.find((s) => s === value);
if (found === undefined) {
throw new AppError('INVALID_DATA', 'Unknown participant status: ' + value, 500, { value });
}
return found;
}

function toGrupo(value: string): Grupo {
const found = GRUPOS.find((g) => g === value);
if (found === undefined) {
throw new AppError('INVALID_INPUT', 'grupo must be responsavel, criadas or dependeDeMim.', 400, { grupo: value });
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

function bindTx(ctx: RequestContext, tx: RequestContext['data']['moduleData']): RequestContext {
return { ...ctx, data: { ...ctx.data, moduleData: tx } };
}

function pessoaDaSessao(ctx: RequestContext): string {
const id = ctx.sessionContext.person?.mdmId;
if (id == null || id === '') {
throw new AppError('UNAUTHENTICATED', 'The person of the session was not identified.', 401);
}
return id;
}

function isGestor(ctx: RequestContext): boolean {
const scope = ctx.sessionContext.actorScope ?? [];
return scope.some((s) => s === 'gestor' || s.endsWith(':gestor'));
}

function hoje(ctx: RequestContext): string {
const tz = ctx.organization.timezone;
const now = ctx.clock.nowIso();
if (tz) {
return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
}
return now.slice(0, 10);
}

function normalizar(text: string): string {
return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function porNome(a: string, b: string): number {
return a.localeCompare(b, 'pt', { sensitivity: 'base' });
}

function paginaDe(input: { page?: number; pageSize?: number }): { page: number; pageSize: number } {
const page = input.page != null && input.page >= 1 ? Math.floor(input.page) : 1;
const rawSize = input.pageSize != null && input.pageSize >= 1 ? Math.floor(input.pageSize) : 20;
return { page, pageSize: Math.min(rawSize, PAGE_LIMIT) };
}

/** quemAgeAgoraPorSituacao */
function quemAgeAgoraDe(t: TarefaRow): string | undefined {
if (t.status === 'aFazer' || t.status === 'emAndamento') return t.responsavelId;
if (t.status === 'emRevisao') return t.criadorId;
return undefined;
}

/** tarefaAbertaVencimento */
function aberta(t: TarefaRow): boolean {
return t.status !== 'concluida' && t.status !== 'cancelada';
}

function venceHoje(t: TarefaRow, today: string): boolean {
return aberta(t) && t.prazo != null && t.prazo.slice(0, 10) === today;
}

function atrasada(t: TarefaRow, today: string): boolean {
return aberta(t) && t.prazo != null && t.prazo.slice(0, 10) < today;
}

/** retomarSoAposDevolucao: devolvida e ainda não retomada */
function devolvidaPendente(t: TarefaRow): boolean {
const devolvidaEm = t.details.devolvidaEm;
const retomadaEm = t.details.retomadaEm;
return t.status === 'emAndamento' && devolvidaEm != null && devolvidaEm !== '' && (retomadaEm == null || retomadaEm === '' || retomadaEm < devolvidaEm);
}

/** participanteNaoConfiguradoAceitaECria: sem configuração vale sim */
function marcaEfetiva(value: boolean | null | undefined): boolean {
return value == null ? true : value;
}

function etiquetasTexto(etiquetas: string[] | undefined): string | undefined {
return etiquetas !== undefined && etiquetas.length > 0 ? etiquetas.join(', ') : undefined;
}

function etiquetasLista(texto: string | undefined): string[] | undefined {
if (texto === undefined) return undefined;
return texto.split(',').map((e) => e.trim()).filter((e) => e !== '');
}

async function lerTarefa(id: string, ctx: RequestContext): Promise<TarefaRow> {
const result = await listTarefa({ id, page: 1, pageSize: 1 }, ctx);
const t = result.items[0];
if (t === undefined) {
throw new AppError('NOT_FOUND', 'Task not found.', 404, { id });
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

async function nomesParticipantes(ids: string[], ctx: RequestContext): Promise<Map<string, string>> {
const distinct = Array.from(new Set(ids));
const found = await Promise.all(distinct.map((id) => getParticipante({ id }, ctx)));
const result = new Map<string, string>();
for (const p of found) result.set(p.id, p.details.identification.name);
return result;
}

function nomeDe(map: Map<string, string>, id: string): string {
const nome = map.get(id);
if (nome === undefined) {
throw new AppError('NOT_FOUND', 'Participant not found.', 404, { id });
}
return nome;
}

async function nomesListas(ctx: RequestContext): Promise<Map<string, string>> {
const listas = await listAll((page, pageSize) => listListaTarefas({ page, pageSize }, ctx));
const map = new Map<string, string>();
for (const l of listas) map.set(l.id, l.nome);
return map;
}

function listaDe(map: Map<string, string>, id: string): ListaTarefasNome {
const nome = map.get(id);
if (nome === undefined) {
throw new AppError('NOT_FOUND', 'Task list not found.', 404, { id });
}
return { id, nome };
}

/** membroVeResponsavelOuCriador / itemChecklistSoQuemVeTarefa */
function exigirQueVe(t: TarefaRow, pessoaId: string): void {
if (t.responsavelId !== pessoaId && t.criadorId !== pessoaId && quemAgeAgoraDe(t) !== pessoaId) {
throw new AppError('FORBIDDEN', 'Only the assignee or the creator of the task can see it.', 403, { ruleId: 'membroVeResponsavelOuCriador', id: t.id });
}
}

function exigirVersao(t: TarefaRow, version: number): void {
if (t.version !== Number(version)) {
throw new AppError('VERSION_CONFLICT', 'The task was changed by someone else; reload and try again.', 409, { id: t.id, versaoLida: version, versaoAtual: t.version });
}
}

/** responsavelAceitaTarefas / escolhaResponsavelPeloNome: o id veio da busca pelo nome */
async function exigirResponsavelValido(responsavelId: string, ctx: RequestContext): Promise<void> {
const p = await getParticipante({ id: responsavelId }, ctx);
if (toParticipanteStatus(p.details.identification.status) !== 'Active' || !marcaEfetiva(p.details.tarefas?.aceitaTarefas)) {
throw new AppError('RESPONSAVEL_INVALIDO', 'The assignee must be an active participant who accepts tasks.', 422, { ruleId: 'responsavelAceitaTarefas', responsavelId });
}
}

/** tarefaPaiDiferenteDaPropria: nem a própria, nem uma descendente */
async function exigirTarefaPaiValida(tarefaPaiId: string, propriaId: string | undefined, ctx: RequestContext): Promise<void> {
const visitados = new Set<string>();
let atualId: string | undefined = tarefaPaiId;
while (atualId !== undefined) {
if (atualId === propriaId) {
throw new AppError('INVALID_PARENT', 'The parent task cannot be the task itself or one of its subtasks.', 422, { ruleId: 'tarefaPaiDiferenteDaPropria', tarefaPaiId });
}
if (visitados.has(atualId)) break;
visitados.add(atualId);
const pai = await lerTarefa(atualId, ctx);
atualId = pai.tarefaPaiId;
}
}

function evento(tipo: string, momento: string, status?: Status, responsavelNome?: string, motivo?: string): EventoHistorico {
return {
tipo,
momento,
...(status !== undefined ? { status } : {}),
...(responsavelNome !== undefined ? { responsavelNome } : {}),
details: motivo != null ? { motivoDevolucao: motivo } : {},
};
}

/** Histórico pelos marcos da tarefa; comentários e anexos ficam na conversa da plataforma (moduloNaoGuardaComentarios). */
function montarHistorico(t: TarefaRow, nomes: Map<string, string>, extras: EventoHistorico[]): EventoHistorico[] {
const responsavel = nomeDe(nomes, t.responsavelId);
const eventos: EventoHistorico[] = [evento('criada', t.criadaEm, 'aFazer', responsavel)];
if (t.details.devolvidaEm != null) eventos.push(evento('devolvida', t.details.devolvidaEm, 'emAndamento', responsavel, t.details.motivoDevolucao));
if (t.details.retomadaEm != null) eventos.push(evento('retomada', t.details.retomadaEm, 'emAndamento', responsavel));
if (t.details.concluidaEm != null) eventos.push(evento('concluida', t.details.concluidaEm, 'concluida', responsavel));
if (t.details.canceladaEm != null) eventos.push(evento('cancelada', t.details.canceladaEm, 'cancelada', responsavel));
for (const e of extras) eventos.push(e);
return eventos.sort((a, b) => a.momento.localeCompare(b.momento));
}

async function montarCompleta(t: TarefaRow, ctx: RequestContext, extras: EventoHistorico[]): Promise<Saida> {
const pessoaId = pessoaDaSessao(ctx);
const agora = quemAgeAgoraDe(t);
const ids = [t.responsavelId, t.criadorId];
if (agora !== undefined) ids.push(agora);
const [nomes, listas, checklist, subtarefas, pai] = await Promise.all([
nomesParticipantes(ids, ctx),
nomesListas(ctx),
itensChecklist(t.id, ctx),
listAll((page, pageSize) => listTarefa({ tarefaPaiId: t.id, page, pageSize }, ctx)),
t.tarefaPaiId != null ? lerTarefa(t.tarefaPaiId, ctx) : Promise.resolve(undefined),
]);
const itens: ItemChecklistLinha[] = checklist.map((i) => ({
id: i.id,
version: i.version,
ordem: i.ordem,
details: {
descricao: i.details.descricao,
concluido: i.details.concluido,
...(i.details.concluidoEm != null ? { concluidoEm: i.details.concluidoEm } : {}),
},
}));
const etiquetas = etiquetasTexto(t.details.etiquetas);
const details: TarefaCompleta['details'] = {
quantidadeSubtarefas: subtarefas.length,
progressoChecklist: progresso(checklist),
devolvidaPendente: devolvidaPendente(t),
aberta: aberta(t),
...(t.details.descricao != null ? { descricao: t.details.descricao } : {}),
...(etiquetas !== undefined ? { etiquetas } : {}),
...(t.details.motivoDevolucao != null ? { motivoDevolucao: t.details.motivoDevolucao } : {}),
...(t.details.devolvidaEm != null ? { devolvidaEm: t.details.devolvidaEm } : {}),
...(t.details.retomadaEm != null ? { retomadaEm: t.details.retomadaEm } : {}),
...(t.details.concluidaEm != null ? { concluidaEm: t.details.concluidaEm } : {}),
...(t.details.canceladaEm != null ? { canceladaEm: t.details.canceladaEm } : {}),
...(agora !== undefined ? { quemAgeAgora: agora } : {}),
};
const tarefa: TarefaCompleta = {
id: t.id,
version: t.version,
titulo: t.titulo,
status: toStatus(t.status),
details,
...(t.prazo != null ? { prazo: t.prazo } : {}),
prioridade: toPrioridade(t.prioridade),
listaId: t.listaId,
listaTarefas: listaDe(listas, t.listaId),
responsavelId: t.responsavelId,
responsavel: { id: t.responsavelId, details: { identification: { name: nomeDe(nomes, t.responsavelId) } } },
criadorId: t.criadorId,
criador: { id: t.criadorId, details: { identification: { name: nomeDe(nomes, t.criadorId) } } },
criadaEm: t.criadaEm,
...(t.tarefaPaiId != null ? { tarefaPaiId: t.tarefaPaiId } : {}),
...(pai !== undefined ? { tarefaPai: { id: pai.id, titulo: pai.titulo } } : {}),
...(agora !== undefined ? { quemAgeAgoraNome: nomeDe(nomes, agora) } : {}),
souResponsavel: t.responsavelId === pessoaId,
souCriador: t.criadorId === pessoaId,
itens,
};
return { tarefa, historico: montarHistorico(t, nomes, extras) };
}

async function montarResumos(tarefas: TarefaRow[], ctx: RequestContext): Promise<TarefaResumo[]> {
const today = hoje(ctx);
const ids: string[] = [];
for (const t of tarefas) {
ids.push(t.responsavelId, t.criadorId);
const agora = quemAgeAgoraDe(t);
if (agora !== undefined) ids.push(agora);
}
const [nomes, listas, checklists] = await Promise.all([
nomesParticipantes(ids, ctx),
nomesListas(ctx),
Promise.all(tarefas.map((t) => itensChecklist(t.id, ctx))),
]);
return tarefas.map((t, idx) => {
const agora = quemAgeAgoraDe(t);
const details: TarefaResumo['details'] = {
progressoChecklist: progresso(checklists[idx] ?? []),
venceHoje: venceHoje(t, today),
atrasada: atrasada(t, today),
devolvidaPendente: devolvidaPendente(t),
aberta: aberta(t),
...(agora !== undefined ? { quemAgeAgora: agora } : {}),
};
return {
id: t.id,
version: t.version,
titulo: t.titulo,
status: toStatus(t.status),
...(t.prazo != null ? { prazo: t.prazo } : {}),
prioridade: toPrioridade(t.prioridade),
listaId: t.listaId,
listaTarefas: listaDe(listas, t.listaId),
responsavelId: t.responsavelId,
responsavel: { id: t.responsavelId, details: { identification: { name: nomeDe(nomes, t.responsavelId) } } },
criadorId: t.criadorId,
criador: { id: t.criadorId, details: { identification: { name: nomeDe(nomes, t.criadorId) } } },
details,
...(agora !== undefined ? { quemAgeAgoraNome: nomeDe(nomes, agora) } : {}),
criadaEm: t.criadaEm,
};
});
}

/** membroVeResponsavelOuCriador: só as tarefas de que a pessoa é responsável ou que criou */
async function tarefasDaPessoa(pessoaId: string, ctx: RequestContext): Promise<TarefaRow[]> {
const [comoResponsavel, comoCriador] = await Promise.all([
listAll((page, pageSize) => listTarefa({ responsavelId: pessoaId, page, pageSize }, ctx)),
listAll((page, pageSize) => listTarefa({ criadorId: pessoaId, page, pageSize }, ctx)),
]);
const porId = new Map<string, TarefaRow>();
for (const t of comoResponsavel) porId.set(t.id, t);
for (const t of comoCriador) porId.set(t.id, t);
return Array.from(porId.values());
}

/** abertas primeiro, atrasadas e que vencem hoje antes, depois criadaEm (mais recentes primeiro) */
function ordenar(tarefas: TarefaRow[], today: string): TarefaRow[] {
const peso = (t: TarefaRow): number => (aberta(t) ? 0 : 4) + (atrasada(t, today) ? 0 : venceHoje(t, today) ? 1 : 2);
return tarefas.slice().sort((a, b) => peso(a) - peso(b) || b.criadaEm.localeCompare(a.criadaEm));
}

function paginar<T>(items: T[], page: number, pageSize: number): { items: T[]; page: number; pageSize: number; hasMore: boolean } {
const inicio = (page - 1) * pageSize;
return { items: items.slice(inicio, inicio + pageSize), page, pageSize, hasMore: inicio + pageSize < items.length };
}

/** Transições do processo da tarefa: o processo da plataforma grava a situação e avisa quem age agora (avisarQuemAgeAgora). */
async function transicionar(
input: { id: string; version: number },
ctx: RequestContext,
cfg: { transicao: TransicaoTarefa; quem: 'responsavel' | 'criador'; statusExigido: Status; tipoEvento: string; motivoDevolucao?: string },
): Promise<Saida> {
return ctx.data.moduleData.runInTransaction(async (tx) => {
const bound = bindTx(ctx, tx);
const pessoaId = pessoaDaSessao(bound);
const atual = await lerTarefa(input.id, bound);
// apenasResponsavelExecuta / apenasCriadorRevisa
if (cfg.quem === 'responsavel' && atual.responsavelId !== pessoaId) {
throw new AppError('FORBIDDEN', 'Only the assignee can do this on the task.', 403, { ruleId: 'apenasResponsavelExecuta', id: atual.id });
}
if (cfg.quem === 'criador' && atual.criadorId !== pessoaId) {
throw new AppError('FORBIDDEN', 'Only the creator of the task can review it.', 403, { ruleId: 'apenasCriadorRevisa', id: atual.id });
}
if (atual.status !== cfg.statusExigido) {
throw new AppError('INVALID_STATE', 'The task is not in the status this action requires.', 409, { id: atual.id, status: atual.status, statusExigido: cfg.statusExigido });
}
exigirVersao(atual, input.version);
if (cfg.transicao === 'retomar' && !devolvidaPendente(atual)) {
throw new AppError('INVALID_STATE', 'The task was not returned or was already resumed.', 409, { ruleId: 'retomarSoAposDevolucao', id: atual.id });
}
const resultado = cfg.motivoDevolucao !== undefined
? await avancarEtapaTarefa({ tarefaId: atual.id, transicao: cfg.transicao, motivoDevolucao: cfg.motivoDevolucao }, bound)
: await avancarEtapaTarefa({ tarefaId: atual.id, transicao: cfg.transicao }, bound);
if (resultado.outcome === 'conflict') {
throw new AppError('CONFLICT', 'The action could not be applied to the task; reload and try again.', 409, { id: atual.id, transicao: cfg.transicao });
}
const nova = await lerTarefa(atual.id, bound);
// iniciar e enviarParaRevisao não têm marco gravado na tarefa: o evento entra na resposta desta ação
const extras = cfg.tipoEvento === 'iniciada' || cfg.tipoEvento === 'enviadaParaRevisao'
? [evento(cfg.tipoEvento, bound.clock.nowIso(), toStatus(nova.status))]
: [];
return montarCompleta(nova, bound, extras);
});
}

async function salvarItens(
tarefaId: string,
ctx: RequestContext,
gravar: (bound: RequestContext, atual: TarefaRow) => Promise<void>,
): Promise<Saida> {
return ctx.data.moduleData.runInTransaction(async (tx) => {
const bound = bindTx(ctx, tx);
const pessoaId = pessoaDaSessao(bound);
const atual = await lerTarefa(tarefaId, bound);
exigirQueVe(atual, pessoaId); // itemChecklistSoQuemVeTarefa
if (!aberta(atual)) {
throw new AppError('CONFLICT', 'Checklist items cannot be changed on a completed or cancelled task.', 409, { ruleId: 'itemChecklistTarefaNaoEncerrada', id: atual.id });
}
await gravar(bound, atual);
// marcarItemNaoMudaSituacao: a tarefa é relida, a situação não muda
const nova = await lerTarefa(tarefaId, bound);
return montarCompleta(nova, bound, []);
});
}

function participanteOpcao(p: GetParticipanteOutput): ParticipanteOpcao {
return {
id: p.id,
details: {
identification: {
name: p.details.identification.name,
status: toParticipanteStatus(p.details.identification.status),
},
tarefas: { aceitaTarefasEfetivo: marcaEfetiva(p.details.tarefas?.aceitaTarefas) },
},
};
}

export const requests: { [K in keyof Minhas_tarefasContracts]: (input: Minhas_tarefasContracts[K]['input'], ctx: RequestContext) => Promise<Minhas_tarefasContracts[K]['output']> } = {
'tarefas.minhas_tarefas.qryMinhasTarefas': async function (input, ctx) {
const { page, pageSize } = paginaDe(input);
const pessoaId = pessoaDaSessao(ctx);
const today = hoje(ctx);
const todas = await tarefasDaPessoa(pessoaId, ctx);
const abertas = todas.filter((t) => aberta(t));
// depende de mim agora: quemAgeAgora calculado pela situação (quemAgeAgoraPorSituacao)
const dependeDeMim = ordenar(abertas.filter((t) => quemAgeAgoraDe(t) === pessoaId), today);
const pagina = paginar(dependeDeMim, page, pageSize);
const [items, eu] = await Promise.all([montarResumos(pagina.items, ctx), getParticipante({ id: pessoaId }, ctx)]);
return {
tarefas: { ...pagina, items },
quantidadeDependeDeMim: dependeDeMim.length,
quantidadeResponsavel: abertas.filter((t) => t.responsavelId === pessoaId).length,
quantidadeCriadas: abertas.filter((t) => t.criadorId === pessoaId).length,
quantidadeVenceHoje: abertas.filter((t) => venceHoje(t, today)).length,
quantidadeAtrasadas: abertas.filter((t) => atrasada(t, today)).length,
// criarTarefaExigePodeCriar, participanteNaoConfiguradoAceitaECria: calculado, nunca gravado
podeCriarTarefasEfetivo: marcaEfetiva(eu.details.tarefas?.podeCriarTarefas),
};
},

'tarefas.minhas_tarefas.qryTarefasDoGrupo': async function (input, ctx) {
const grupo = toGrupo(input.grupo);
const { page, pageSize } = paginaDe(input);
const pessoaId = pessoaDaSessao(ctx);
const todas = await tarefasDaPessoa(pessoaId, ctx);
const doGrupo = todas.filter((t) => {
if (grupo === 'responsavel') return t.responsavelId === pessoaId;
if (grupo === 'criadas') return t.criadorId === pessoaId;
return quemAgeAgoraDe(t) === pessoaId;
});
const pagina = paginar(ordenar(doGrupo, hoje(ctx)), page, pageSize);
const items = await montarResumos(pagina.items, ctx);
return { tarefas: { ...pagina, items } };
},

'tarefas.minhas_tarefas.qryTarefa': async function (input, ctx) {
const t = await lerTarefa(input.tarefaId, ctx);
exigirQueVe(t, pessoaDaSessao(ctx));
return montarCompleta(t, ctx, []);
},

'tarefas.minhas_tarefas.qryResponsaveis': async function (input, ctx) {
const termo = input.busca != null ? normalizar(input.busca.trim()) : '';
const todos = await listAll((page, pageSize) => listParticipante({ page, pageSize }, ctx));
// escolhaResponsavelPeloNome: só pelo nome; participanteSemCadastroPessoal: só id, nome, situação e a marca efetiva
const participantes = todos
.map((p) => participanteOpcao(p))
.filter((p) => p.details.identification.status === 'Active' && p.details.tarefas.aceitaTarefasEfetivo) // responsavelAceitaTarefas
.filter((p) => termo === '' || normalizar(p.details.identification.name).includes(termo))
.sort((a, b) => porNome(a.details.identification.name, b.details.identification.name))
.slice(0, LISTA_CURTA);
return { participantes };
},

'tarefas.minhas_tarefas.qryListas': async function (input, ctx) {
const termo = input.busca != null ? normalizar(input.busca.trim()) : '';
const todas = await listAll((page, pageSize) => listListaTarefas({ page, pageSize }, ctx));
const listas: ListaTarefasNome[] = todas
.filter((l) => termo === '' || normalizar(l.nome).includes(termo))
.map((l) => ({ id: l.id, nome: l.nome }))
.sort((a, b) => porNome(a.nome, b.nome))
.slice(0, LISTA_CURTA);
return { listas };
},

'tarefas.minhas_tarefas.cmdCriarTarefa': async function (input, ctx) {
return ctx.data.moduleData.runInTransaction(async (tx) => {
const bound = bindTx(ctx, tx);
const pessoaId = pessoaDaSessao(bound);
// criarTarefaExigePodeCriar: quem criou é sempre a pessoa da sessão
if (input.criadorId !== pessoaId) {
throw new AppError('FORBIDDEN', 'The creator of the task must be the person of the session.', 403, { ruleId: 'criarTarefaExigePodeCriar' });
}
// podeCriarTarefasExigido, participanteNaoConfiguradoAceitaECria
const eu = await getParticipante({ id: pessoaId }, bound);
if (!marcaEfetiva(eu.details.tarefas?.podeCriarTarefas)) {
throw new AppError('FORBIDDEN', 'The person of the session cannot create tasks.', 403, { ruleId: 'podeCriarTarefasExigido' });
}
await exigirResponsavelValido(input.responsavelId, bound);
if (input.tarefaPaiId != null && input.tarefaPaiId !== '') {
await exigirTarefaPaiValida(input.tarefaPaiId, undefined, bound);
}
const etiquetas = etiquetasLista(input.details.etiquetas);
// O processo da tarefa grava a tarefa em aFazer e avisa o responsável (avisarQuemAgeAgora).
const aberto = await abrirOcorrenciaTarefa({
titulo: input.titulo,
prioridade: input.prioridade,
listaId: input.listaId,
responsavelId: input.responsavelId,
...(input.prazo != null && input.prazo !== '' ? { prazo: input.prazo } : {}),
...(input.tarefaPaiId != null && input.tarefaPaiId !== '' ? { tarefaPaiId: input.tarefaPaiId } : {}),
details: {
...(input.details.descricao !== undefined ? { descricao: input.details.descricao } : {}),
...(etiquetas !== undefined ? { etiquetas } : {}),
},
}, bound);
const criada = await lerTarefa(aberto.tarefaId, bound);
return montarCompleta(criada, bound, []);
});
},

'tarefas.minhas_tarefas.cmdAdicionarItensChecklist': async function (input, ctx) {
return salvarItens(input.tarefaId, ctx, async (bound) => {
for (const item of input.itens) {
await createItemChecklist({
tarefaId: input.tarefaId,
ordem: item.ordem,
details: { descricao: item.details.descricao, concluido: item.details.concluido },
}, bound);
}
});
},

'tarefas.minhas_tarefas.cmdSalvarAlteracoes': async function (input, ctx) {
return ctx.data.moduleData.runInTransaction(async (tx) => {
const bound = bindTx(ctx, tx);
const pessoaId = pessoaDaSessao(bound);
const atual = await lerTarefa(input.id, bound);
exigirQueVe(atual, pessoaId); // membroVeResponsavelOuCriador
exigirVersao(atual, input.version);
const trocaResponsavel = input.responsavelId !== atual.responsavelId;
if (trocaResponsavel) {
// reatribuirApenasCriadorOuGestor
if (!isGestor(bound) && atual.criadorId !== pessoaId) {
throw new AppError('FORBIDDEN', 'Only the creator of the task or the manager can change the assignee.', 403, { ruleId: 'reatribuirApenasCriadorOuGestor' });
}
await exigirResponsavelValido(input.responsavelId, bound);
}
if (input.tarefaPaiId != null && input.tarefaPaiId !== '') {
await exigirTarefaPaiValida(input.tarefaPaiId, atual.id, bound);
}
// edicaoNaoMudaSituacao: grava só os campos, nunca a situação
const etiquetas = etiquetasLista(input.details.etiquetas);
const campos: UpdateTarefaInput = {
id: atual.id,
version: Number(input.version),
titulo: input.titulo,
prioridade: input.prioridade,
listaId: input.listaId,
...(input.prazo != null && input.prazo !== '' ? { prazo: input.prazo } : {}),
...(input.tarefaPaiId != null && input.tarefaPaiId !== '' ? { tarefaPaiId: input.tarefaPaiId } : {}),
details: {
...(input.details.descricao !== undefined ? { descricao: input.details.descricao } : {}),
...(etiquetas !== undefined ? { etiquetas } : {}),
},
};
await updateTarefa(campos, bound);
const extras: EventoHistorico[] = [];
if (trocaResponsavel) {
// avisarQuemAgeAgora: o processo troca o responsável e avisa quem passa a agir agora
const troca = await trocarResponsavelOcorrencia({ tarefaId: atual.id, novoResponsavelId: input.responsavelId }, bound);
if (troca.outcome === 'conflict') {
throw new AppError('CONFLICT', 'The assignee could not be changed; reload and try again.', 409, { id: atual.id });
}
const novo = await getParticipante({ id: input.responsavelId }, bound);
extras.push(evento('responsavelTrocado', bound.clock.nowIso(), toStatus(atual.status), novo.details.identification.name));
}
const nova = await lerTarefa(atual.id, bound);
return montarCompleta(nova, bound, extras);
});
},

'tarefas.minhas_tarefas.cmdAjustarChecklist': async function (input, ctx) {
return salvarItens(input.tarefaId, ctx, async (bound) => {
const atuais = await itensChecklist(input.tarefaId, bound);
for (const ajuste of input.itens) {
const item = atuais.find((i) => i.id === ajuste.id);
if (item === undefined) {
throw new AppError('INVALID_INPUT', 'The checklist item does not belong to the task.', 422, { tarefaId: input.tarefaId, itemId: ajuste.id });
}
await updateItemChecklist({
id: item.id,
version: Number(ajuste.version),
tarefaId: input.tarefaId,
ordem: ajuste.ordem ?? item.ordem,
details: {
descricao: ajuste.details.descricao ?? item.details.descricao,
concluido: ajuste.details.concluido ?? item.details.concluido,
},
}, bound);
}
});
},

'tarefas.minhas_tarefas.cmdIniciar': async function (input, ctx) {
return transicionar(input, ctx, { transicao: 'iniciar', quem: 'responsavel', statusExigido: 'aFazer', tipoEvento: 'iniciada' });
},

'tarefas.minhas_tarefas.cmdEnviarParaRevisao': async function (input, ctx) {
return transicionar(input, ctx, { transicao: 'enviarParaRevisao', quem: 'responsavel', statusExigido: 'emAndamento', tipoEvento: 'enviadaParaRevisao' });
},

'tarefas.minhas_tarefas.cmdAceitar': async function (input, ctx) {
return transicionar(input, ctx, { transicao: 'aceitar', quem: 'criador', statusExigido: 'emRevisao', tipoEvento: 'concluida' });
},

'tarefas.minhas_tarefas.cmdDevolver': async function (input, ctx) {
const motivo = input.details.motivoDevolucao.trim();
if (motivo === '') {
throw new AppError('DEVOLUCAO_EXIGE_MOTIVO', 'Returning a task requires a reason.', 400, { ruleId: 'devolucaoExigeMotivo' });
}
return transicionar(input, ctx, { transicao: 'devolver', quem: 'criador', statusExigido: 'emRevisao', tipoEvento: 'devolvida', motivoDevolucao: motivo });
},

'tarefas.minhas_tarefas.cmdRetomar': async function (input, ctx) {
return transicionar(input, ctx, { transicao: 'retomar', quem: 'responsavel', statusExigido: 'emAndamento', tipoEvento: 'retomada' });
},

'tarefas.minhas_tarefas.cmdCancelar': async function (input, ctx) {
return ctx.data.moduleData.runInTransaction(async (tx) => {
const bound = bindTx(ctx, tx);
const pessoaId = pessoaDaSessao(bound);
const atual = await lerTarefa(input.id, bound);
// cancelarApenasCriadorOuGestor
if (!isGestor(bound) && atual.criadorId !== pessoaId) {
throw new AppError('FORBIDDEN', 'Only the creator of the task or the manager can cancel it.', 403, { ruleId: 'cancelarApenasCriadorOuGestor' });
}
if (atual.status !== 'aFazer' && atual.status !== 'emAndamento' && atual.status !== 'emRevisao') {
throw new AppError('TAREFA_NAO_CANCELAVEL', 'A task can only be cancelled while to do, in progress or in review.', 409, { ruleId: 'cancelarApenasCriadorOuGestor', id: atual.id, status: atual.status });
}
exigirVersao(atual, input.version);
// avisarQuemAgeAgora: o processo cancela e avisa quem estava agindo; depois ninguém age agora (quemAgeAgoraPorSituacao)
const resultado = await cancelarOcorrenciaTarefa({ tarefaId: atual.id }, bound);
if (resultado.outcome === 'conflict') {
throw new AppError('CONFLICT', 'The task could not be cancelled; reload and try again.', 409, { id: atual.id });
}
const cancelada = await lerTarefa(atual.id, bound);
return montarCompleta(cancelada, bound, []);
});
},
};
