/// <mls fileReference="_102047_/l2/tarefas/web/shared/minhas_tarefas.ts" enhancement="_102020_/l2/enhancementAura"/>
import { property } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { execBff } from '/_102029_/l2/bffClient.js';
import { getState, setState, subscribe, unsubscribe } from '/_102029_/l2/collabState.js';
import { runBlockingUiAction } from '/_102029_/l2/interactionRuntime.js';
import type {
Minhas_tarefasContracts,
ListaTarefasNome,
ParticipanteOpcao,
EventoHistorico,
TarefaCompleta,
ItemChecklistNovo,
ItemChecklistAjuste,
} from '/_102047_/l2/tarefas/web/contracts/minhas_tarefas.defs.js';
export type {
Minhas_tarefasContracts,
ListaTarefasNome,
ParticipanteNome,
ParticipanteOpcao,
TarefaResumo,
ItemChecklistLinha,
TarefaPaiRef,
TarefaCompleta,
EventoHistorico,
ItemChecklistNovo,
ItemChecklistAjuste,
} from '/_102047_/l2/tarefas/web/contracts/minhas_tarefas.defs.js';

type Input<R extends keyof Minhas_tarefasContracts> = Minhas_tarefasContracts[R]['input'];
type Output<R extends keyof Minhas_tarefasContracts> = Minhas_tarefasContracts[R]['output'];

export type ErrorState = { code: string; message: string; details?: unknown } | null;
type BffResult<T> = { ok: boolean; data: T | null; error: ErrorState };

/** A page of resumed tarefas: { items, page, pageSize, hasMore }. */
export type TarefasPagina = Output<'tarefas.minhas_tarefas.qryMinhasTarefas'>['tarefas'];

/** The three groups of the list: tarefas I am responsible for, tarefas I created, tarefas that depend on me now. */
export type GrupoTarefas = 'responsavel' | 'criadas' | 'dependeDeMim';

export type Prioridade = TarefaCompleta['prioridade'];

/** Form draft of cmdCriarTarefa; every leaf is null until typed. The creator comes from the session. */
export type CriarTarefaDraft = {
titulo: string | null;
details: { descricao: string | null; etiquetas: string | null };
prioridade: Prioridade | null;
prazo: string | null;
listaId: string | null;
responsavelId: string | null;
tarefaPaiId: string | null;
};

/** One new checklist item being typed. */
export type ItemChecklistNovoDraft = {
ordem: number | null;
details: { descricao: string | null; concluido: boolean | null };
};

/** Form draft of cmdAdicionarItensChecklist: the new items; the tarefa is the loaded one. */
export type AdicionarItensChecklistDraft = {
itens: ItemChecklistNovoDraft[];
};

/** Form draft of cmdSalvarAlteracoes: the editable fields of the loaded tarefa (id and version come from it). */
export type SalvarAlteracoesDraft = {
titulo: string | null;
details: { descricao: string | null; etiquetas: string | null };
prioridade: Prioridade | null;
prazo: string | null;
listaId: string | null;
responsavelId: string | null;
tarefaPaiId: string | null;
};

/** One change of an existing checklist item; only the leaves that change are filled. */
export type ItemChecklistAjusteDraft = {
id: string | null;
version: number | null;
ordem: number | null;
details: { descricao: string | null; concluido: boolean | null };
};

/** Form draft of cmdAjustarChecklist: the changed items; the tarefa is the loaded one. */
export type AjustarChecklistDraft = {
itens: ItemChecklistAjusteDraft[];
};

/** Form draft of cmdDevolver: the reason for sending the tarefa back. */
export type DevolverDraft = {
details: { motivoDevolucao: string | null };
};

type TarefaOutput = { tarefa: TarefaCompleta; historico: EventoHistorico[] };

function emptyCriarTarefaDraft(): CriarTarefaDraft {
return {
titulo: null,
details: { descricao: null, etiquetas: null },
prioridade: null,
prazo: null,
listaId: null,
responsavelId: null,
tarefaPaiId: null,
};
}

function emptyAdicionarItensChecklistDraft(): AdicionarItensChecklistDraft {
return { itens: [] };
}

function emptySalvarAlteracoesDraft(): SalvarAlteracoesDraft {
return {
titulo: null,
details: { descricao: null, etiquetas: null },
prioridade: null,
prazo: null,
listaId: null,
responsavelId: null,
tarefaPaiId: null,
};
}

function emptyAjustarChecklistDraft(): AjustarChecklistDraft {
return { itens: [] };
}

function emptyDevolverDraft(): DevolverDraft {
return { details: { motivoDevolucao: null } };
}

function draftFromTarefa(tarefa: TarefaCompleta): SalvarAlteracoesDraft {
return {
titulo: tarefa.titulo,
details: {
descricao: tarefa.details.descricao ?? null,
etiquetas: tarefa.details.etiquetas ?? null,
},
prioridade: tarefa.prioridade,
prazo: tarefa.prazo ?? null,
listaId: tarefa.listaId,
responsavelId: tarefa.responsavelId,
tarefaPaiId: tarefa.tarefaPaiId ?? null,
};
}

function filled(value: string | null): value is string {
return value !== null && value.trim() !== '';
}

function unexpectedError(error: unknown): ErrorState {
return { code: 'client.unexpected', message: '', details: { name: error instanceof Error ? error.name : 'unknown' } };
}

const PAGE_SIZE = 20;

const COMMAND_IDS = [
'cmdCriarTarefa',
'cmdAdicionarItensChecklist',
'cmdSalvarAlteracoes',
'cmdAjustarChecklist',
'cmdIniciar',
'cmdEnviarParaRevisao',
'cmdAceitar',
'cmdDevolver',
'cmdRetomar',
'cmdCancelar',
] as const;
type CommandId = typeof COMMAND_IDS[number];
type QueryId = 'qryMinhasTarefas' | 'qryTarefasDoGrupo' | 'qryTarefa' | 'qryResponsaveis' | 'qryListas';

const COMMAND_STATUS_MEMBER = {
cmdCriarTarefa: 'cmdCriarTarefaStatus',
cmdAdicionarItensChecklist: 'cmdAdicionarItensChecklistStatus',
cmdSalvarAlteracoes: 'cmdSalvarAlteracoesStatus',
cmdAjustarChecklist: 'cmdAjustarChecklistStatus',
cmdIniciar: 'cmdIniciarStatus',
cmdEnviarParaRevisao: 'cmdEnviarParaRevisaoStatus',
cmdAceitar: 'cmdAceitarStatus',
cmdDevolver: 'cmdDevolverStatus',
cmdRetomar: 'cmdRetomarStatus',
cmdCancelar: 'cmdCancelarStatus',
} as const;

const COMMAND_ERROR_MEMBER = {
cmdCriarTarefa: 'cmdCriarTarefaError',
cmdAdicionarItensChecklist: 'cmdAdicionarItensChecklistError',
cmdSalvarAlteracoes: 'cmdSalvarAlteracoesError',
cmdAjustarChecklist: 'cmdAjustarChecklistError',
cmdIniciar: 'cmdIniciarError',
cmdEnviarParaRevisao: 'cmdEnviarParaRevisaoError',
cmdAceitar: 'cmdAceitarError',
cmdDevolver: 'cmdDevolverError',
cmdRetomar: 'cmdRetomarError',
cmdCancelar: 'cmdCancelarError',
} as const;

const QUERY_STATUS_MEMBER = {
qryMinhasTarefas: 'qryMinhasTarefasStatus',
qryTarefasDoGrupo: 'qryTarefasDoGrupoStatus',
qryTarefa: 'qryTarefaStatus',
qryResponsaveis: 'qryResponsaveisStatus',
qryListas: 'qryListasStatus',
} as const;

const QUERY_ERROR_MEMBER = {
qryMinhasTarefas: 'qryMinhasTarefasError',
qryTarefasDoGrupo: 'qryTarefasDoGrupoError',
qryTarefa: 'qryTarefaError',
qryResponsaveis: 'qryResponsaveisError',
qryListas: 'qryListasError',
} as const;

// every state and status member, and nothing else
type StateMember =
| 'tarefas'
| 'quantidadeDependeDeMim'
| 'quantidadeResponsavel'
| 'quantidadeCriadas'
| 'quantidadeVenceHoje'
| 'quantidadeAtrasadas'
| 'tarefa'
| 'historico'
| 'podeCriarTarefasEfetivo'
| 'participantes'
| 'listas'
| 'selectedTarefa'
| 'grupoTarefas'
| 'cmdCriarTarefaDraft'
| 'cmdAdicionarItensChecklistDraft'
| 'cmdSalvarAlteracoesDraft'
| 'cmdAjustarChecklistDraft'
| 'cmdDevolverDraft'
| 'pageStatus'
| 'scenary'
| 'qryMinhasTarefasStatus'
| 'qryMinhasTarefasError'
| 'qryTarefasDoGrupoStatus'
| 'qryTarefasDoGrupoError'
| 'qryTarefaStatus'
| 'qryTarefaError'
| 'qryResponsaveisStatus'
| 'qryResponsaveisError'
| 'qryListasStatus'
| 'qryListasError'
| 'cmdCriarTarefaStatus'
| 'cmdCriarTarefaError'
| 'cmdAdicionarItensChecklistStatus'
| 'cmdAdicionarItensChecklistError'
| 'cmdSalvarAlteracoesStatus'
| 'cmdSalvarAlteracoesError'
| 'cmdAjustarChecklistStatus'
| 'cmdAjustarChecklistError'
| 'cmdIniciarStatus'
| 'cmdIniciarError'
| 'cmdEnviarParaRevisaoStatus'
| 'cmdEnviarParaRevisaoError'
| 'cmdAceitarStatus'
| 'cmdAceitarError'
| 'cmdDevolverStatus'
| 'cmdDevolverError'
| 'cmdRetomarStatus'
| 'cmdRetomarError'
| 'cmdCancelarStatus'
| 'cmdCancelarError';

const STATE_MEMBER_BY_KEY: Record<string, StateMember> = {
'ui.tarefas.minhas_tarefas.tarefas': 'tarefas',
'ui.tarefas.minhas_tarefas.quantidadeDependeDeMim': 'quantidadeDependeDeMim',
'ui.tarefas.minhas_tarefas.quantidadeResponsavel': 'quantidadeResponsavel',
'ui.tarefas.minhas_tarefas.quantidadeCriadas': 'quantidadeCriadas',
'ui.tarefas.minhas_tarefas.quantidadeVenceHoje': 'quantidadeVenceHoje',
'ui.tarefas.minhas_tarefas.quantidadeAtrasadas': 'quantidadeAtrasadas',
'ui.tarefas.minhas_tarefas.tarefa': 'tarefa',
'ui.tarefas.minhas_tarefas.historico': 'historico',
'ui.tarefas.minhas_tarefas.podeCriarTarefasEfetivo': 'podeCriarTarefasEfetivo',
'ui.tarefas.minhas_tarefas.participantes': 'participantes',
'ui.tarefas.minhas_tarefas.listas': 'listas',
'ui.tarefas.minhas_tarefas.selectedTarefa': 'selectedTarefa',
'ui.tarefas.minhas_tarefas.grupoTarefas': 'grupoTarefas',
'ui.tarefas.minhas_tarefas.cmdCriarTarefaDraft': 'cmdCriarTarefaDraft',
'ui.tarefas.minhas_tarefas.cmdAdicionarItensChecklistDraft': 'cmdAdicionarItensChecklistDraft',
'ui.tarefas.minhas_tarefas.cmdSalvarAlteracoesDraft': 'cmdSalvarAlteracoesDraft',
'ui.tarefas.minhas_tarefas.cmdAjustarChecklistDraft': 'cmdAjustarChecklistDraft',
'ui.tarefas.minhas_tarefas.cmdDevolverDraft': 'cmdDevolverDraft',
'ui.tarefas.minhas_tarefas.pageStatus': 'pageStatus',
'ui.tarefas.minhas_tarefas.scenary': 'scenary',
'ui.tarefas.minhas_tarefas.qryMinhasTarefasStatus': 'qryMinhasTarefasStatus',
'ui.tarefas.minhas_tarefas.qryMinhasTarefasError': 'qryMinhasTarefasError',
'ui.tarefas.minhas_tarefas.qryTarefasDoGrupoStatus': 'qryTarefasDoGrupoStatus',
'ui.tarefas.minhas_tarefas.qryTarefasDoGrupoError': 'qryTarefasDoGrupoError',
'ui.tarefas.minhas_tarefas.qryTarefaStatus': 'qryTarefaStatus',
'ui.tarefas.minhas_tarefas.qryTarefaError': 'qryTarefaError',
'ui.tarefas.minhas_tarefas.qryResponsaveisStatus': 'qryResponsaveisStatus',
'ui.tarefas.minhas_tarefas.qryResponsaveisError': 'qryResponsaveisError',
'ui.tarefas.minhas_tarefas.qryListasStatus': 'qryListasStatus',
'ui.tarefas.minhas_tarefas.qryListasError': 'qryListasError',
'ui.tarefas.minhas_tarefas.cmdCriarTarefaStatus': 'cmdCriarTarefaStatus',
'ui.tarefas.minhas_tarefas.cmdCriarTarefaError': 'cmdCriarTarefaError',
'ui.tarefas.minhas_tarefas.cmdAdicionarItensChecklistStatus': 'cmdAdicionarItensChecklistStatus',
'ui.tarefas.minhas_tarefas.cmdAdicionarItensChecklistError': 'cmdAdicionarItensChecklistError',
'ui.tarefas.minhas_tarefas.cmdSalvarAlteracoesStatus': 'cmdSalvarAlteracoesStatus',
'ui.tarefas.minhas_tarefas.cmdSalvarAlteracoesError': 'cmdSalvarAlteracoesError',
'ui.tarefas.minhas_tarefas.cmdAjustarChecklistStatus': 'cmdAjustarChecklistStatus',
'ui.tarefas.minhas_tarefas.cmdAjustarChecklistError': 'cmdAjustarChecklistError',
'ui.tarefas.minhas_tarefas.cmdIniciarStatus': 'cmdIniciarStatus',
'ui.tarefas.minhas_tarefas.cmdIniciarError': 'cmdIniciarError',
'ui.tarefas.minhas_tarefas.cmdEnviarParaRevisaoStatus': 'cmdEnviarParaRevisaoStatus',
'ui.tarefas.minhas_tarefas.cmdEnviarParaRevisaoError': 'cmdEnviarParaRevisaoError',
'ui.tarefas.minhas_tarefas.cmdAceitarStatus': 'cmdAceitarStatus',
'ui.tarefas.minhas_tarefas.cmdAceitarError': 'cmdAceitarError',
'ui.tarefas.minhas_tarefas.cmdDevolverStatus': 'cmdDevolverStatus',
'ui.tarefas.minhas_tarefas.cmdDevolverError': 'cmdDevolverError',
'ui.tarefas.minhas_tarefas.cmdRetomarStatus': 'cmdRetomarStatus',
'ui.tarefas.minhas_tarefas.cmdRetomarError': 'cmdRetomarError',
'ui.tarefas.minhas_tarefas.cmdCancelarStatus': 'cmdCancelarStatus',
'ui.tarefas.minhas_tarefas.cmdCancelarError': 'cmdCancelarError',
};

const STATE_KEYS = Object.keys(STATE_MEMBER_BY_KEY);

/** States whose source is a request output: hydrated from the shared state when a visit starts. */
const DATA_KEYS = [
'ui.tarefas.minhas_tarefas.tarefas',
'ui.tarefas.minhas_tarefas.quantidadeDependeDeMim',
'ui.tarefas.minhas_tarefas.quantidadeResponsavel',
'ui.tarefas.minhas_tarefas.quantidadeCriadas',
'ui.tarefas.minhas_tarefas.quantidadeVenceHoje',
'ui.tarefas.minhas_tarefas.quantidadeAtrasadas',
'ui.tarefas.minhas_tarefas.tarefa',
'ui.tarefas.minhas_tarefas.historico',
'ui.tarefas.minhas_tarefas.podeCriarTarefasEfetivo',
'ui.tarefas.minhas_tarefas.participantes',
'ui.tarefas.minhas_tarefas.listas',
];

export class TarefasMinhas_tarefasShared extends StateLitElement {
/** state tarefas — the page of resumed tarefas shown in the list (the group named by grupoTarefas), with lista, responsavel, creator, who acts now, checklist progress and due/returned marks; source qryMinhasTarefas.tarefas; organism tarefasLista */
@property({ attribute: false }) tarefas: TarefasPagina | null = null;
/** state quantidadeDependeDeMim — total of open tarefas that depend on the session person now; source qryMinhasTarefas.quantidadeDependeDeMim; organism tarefasLista */
@property({ attribute: false }) quantidadeDependeDeMim: number = 0;
/** state quantidadeResponsavel — total of open tarefas the session person is responsible for; source qryMinhasTarefas.quantidadeResponsavel; organism tarefasLista */
@property({ attribute: false }) quantidadeResponsavel: number = 0;
/** state quantidadeCriadas — total of open tarefas the session person created; source qryMinhasTarefas.quantidadeCriadas; organism tarefasLista */
@property({ attribute: false }) quantidadeCriadas: number = 0;
/** state quantidadeVenceHoje — total of tarefas that are due today; source qryMinhasTarefas.quantidadeVenceHoje; organism tarefasLista */
@property({ attribute: false }) quantidadeVenceHoje: number = 0;
/** state quantidadeAtrasadas — total of late tarefas; source qryMinhasTarefas.quantidadeAtrasadas; organism tarefasLista */
@property({ attribute: false }) quantidadeAtrasadas: number = 0;
/** state tarefa — the opened tarefa with all its fields, names, parent, return/resume/conclusion/cancel marks, the session person's role (souResponsavel, souCriador) and the ordered checklist; this is the selected record; source qryTarefa.tarefa; organisms tarefaAcoes, tarefaDetalhe, tarefaForm */
@property({ attribute: false }) tarefa: TarefaCompleta | null = null;
/** state historico — the lifecycle events of the opened tarefa in chronological order; source qryTarefa.historico; organism tarefaHistorico */
@property({ attribute: false }) historico: EventoHistorico[] = [];
/** state podeCriarTarefasEfetivo — whether the session person can create tarefas (true when not configured); source qryMinhasTarefas.podeCriarTarefasEfetivo; organism tarefaForm */
@property({ attribute: false }) podeCriarTarefasEfetivo: boolean = false;
/** state participantes — active participants that can be chosen as responsavel, with status and whether they accept tarefas; source qryResponsaveis.participantes; organism tarefaForm */
@property({ attribute: false }) participantes: ParticipanteOpcao[] = [];
/** state listas — the lists of tarefas (id and name) to choose the lista of a tarefa; source qryListas.listas; organism tarefaForm */
@property({ attribute: false }) listas: ListaTarefasNome[] = [];
/** state selectedTarefa — the id of the tarefa selected in tarefasLista; the record itself is in `tarefa`; source entry.params.tarefaId; organisms tarefaDetalhe, tarefasLista; lives in the URL */
@property({ attribute: false }) selectedTarefa: string | null = null;
/** state grupoTarefas — the group of the list currently loaded in `tarefas` ('dependeDeMim' on open); source qryTarefasDoGrupo input (completed by the shared) */
@property({ attribute: false }) grupoTarefas: GrupoTarefas = 'dependeDeMim';
/** state cmdCriarTarefaDraft — form draft of the new tarefa (titulo, descricao, prioridade, prazo, lista, responsavel, tarefa pai, etiquetas), prefilled by the entry params listaId, responsavelId and tarefaPaiId; source cmdCriarTarefa.input; organism tarefaForm */
@property({ attribute: false }) cmdCriarTarefaDraft: CriarTarefaDraft = emptyCriarTarefaDraft();
/** state cmdAdicionarItensChecklistDraft — form draft of the new checklist items to add to the opened tarefa; source cmdAdicionarItensChecklist.input; organism tarefaForm */
@property({ attribute: false }) cmdAdicionarItensChecklistDraft: AdicionarItensChecklistDraft = emptyAdicionarItensChecklistDraft();
/** state cmdSalvarAlteracoesDraft — form draft editing the opened tarefa, filled from `tarefa` when it loads or is saved; source cmdSalvarAlteracoes.input; organism tarefaForm */
@property({ attribute: false }) cmdSalvarAlteracoesDraft: SalvarAlteracoesDraft = emptySalvarAlteracoesDraft();
/** state cmdAjustarChecklistDraft — form draft of the changes to existing checklist items of the opened tarefa (only changed leaves filled); source cmdAjustarChecklist.input; organism tarefaForm */
@property({ attribute: false }) cmdAjustarChecklistDraft: AjustarChecklistDraft = emptyAjustarChecklistDraft();
/** state cmdDevolverDraft — draft with the reason typed to send the opened tarefa back to the responsavel; source cmdDevolver.input; organism tarefaAcoes */
@property({ attribute: false }) cmdDevolverDraft: DevolverDraft = emptyDevolverDraft();
/** state pageStatus — overall state of the page: idle, loading while the opening load runs, empty when the loaded list is empty, success, or error */
@property({ attribute: false }) pageStatus: 'idle' | 'loading' | 'empty' | 'success' | 'error' = 'idle';
/** state scenary — the visible scene of the page; '' until the page shows its first scene */
@property({ attribute: false }) scenary = '';
/** state qryMinhasTarefasStatus — status of the request qryMinhasTarefas */
@property({ attribute: false }) qryMinhasTarefasStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
/** state qryMinhasTarefasError — error of the request qryMinhasTarefas, null when none */
@property({ attribute: false }) qryMinhasTarefasError: ErrorState = null;
/** state qryTarefasDoGrupoStatus — status of the request qryTarefasDoGrupo */
@property({ attribute: false }) qryTarefasDoGrupoStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
/** state qryTarefasDoGrupoError — error of the request qryTarefasDoGrupo, null when none */
@property({ attribute: false }) qryTarefasDoGrupoError: ErrorState = null;
/** state qryTarefaStatus — status of the request qryTarefa */
@property({ attribute: false }) qryTarefaStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
/** state qryTarefaError — error of the request qryTarefa, null when none */
@property({ attribute: false }) qryTarefaError: ErrorState = null;
/** state qryResponsaveisStatus — status of the request qryResponsaveis */
@property({ attribute: false }) qryResponsaveisStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
/** state qryResponsaveisError — error of the request qryResponsaveis, null when none */
@property({ attribute: false }) qryResponsaveisError: ErrorState = null;
/** state qryListasStatus — status of the request qryListas */
@property({ attribute: false }) qryListasStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
/** state qryListasError — error of the request qryListas, null when none */
@property({ attribute: false }) qryListasError: ErrorState = null;
/** state cmdCriarTarefaStatus — status of the command cmdCriarTarefa */
@property({ attribute: false }) cmdCriarTarefaStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
/** state cmdCriarTarefaError — error of the command cmdCriarTarefa, null when none */
@property({ attribute: false }) cmdCriarTarefaError: ErrorState = null;
/** state cmdAdicionarItensChecklistStatus — status of the command cmdAdicionarItensChecklist */
@property({ attribute: false }) cmdAdicionarItensChecklistStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
/** state cmdAdicionarItensChecklistError — error of the command cmdAdicionarItensChecklist, null when none */
@property({ attribute: false }) cmdAdicionarItensChecklistError: ErrorState = null;
/** state cmdSalvarAlteracoesStatus — status of the command cmdSalvarAlteracoes */
@property({ attribute: false }) cmdSalvarAlteracoesStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
/** state cmdSalvarAlteracoesError — error of the command cmdSalvarAlteracoes, null when none */
@property({ attribute: false }) cmdSalvarAlteracoesError: ErrorState = null;
/** state cmdAjustarChecklistStatus — status of the command cmdAjustarChecklist */
@property({ attribute: false }) cmdAjustarChecklistStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
/** state cmdAjustarChecklistError — error of the command cmdAjustarChecklist, null when none */
@property({ attribute: false }) cmdAjustarChecklistError: ErrorState = null;
/** state cmdIniciarStatus — status of the command cmdIniciar */
@property({ attribute: false }) cmdIniciarStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
/** state cmdIniciarError — error of the command cmdIniciar, null when none */
@property({ attribute: false }) cmdIniciarError: ErrorState = null;
/** state cmdEnviarParaRevisaoStatus — status of the command cmdEnviarParaRevisao */
@property({ attribute: false }) cmdEnviarParaRevisaoStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
/** state cmdEnviarParaRevisaoError — error of the command cmdEnviarParaRevisao, null when none */
@property({ attribute: false }) cmdEnviarParaRevisaoError: ErrorState = null;
/** state cmdAceitarStatus — status of the command cmdAceitar */
@property({ attribute: false }) cmdAceitarStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
/** state cmdAceitarError — error of the command cmdAceitar, null when none */
@property({ attribute: false }) cmdAceitarError: ErrorState = null;
/** state cmdDevolverStatus — status of the command cmdDevolver */
@property({ attribute: false }) cmdDevolverStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
/** state cmdDevolverError — error of the command cmdDevolver, null when none */
@property({ attribute: false }) cmdDevolverError: ErrorState = null;
/** state cmdRetomarStatus — status of the command cmdRetomar */
@property({ attribute: false }) cmdRetomarStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
/** state cmdRetomarError — error of the command cmdRetomar, null when none */
@property({ attribute: false }) cmdRetomarError: ErrorState = null;
/** state cmdCancelarStatus — status of the command cmdCancelar */
@property({ attribute: false }) cmdCancelarStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
/** state cmdCancelarError — error of the command cmdCancelar, null when none */
@property({ attribute: false }) cmdCancelarError: ErrorState = null;

// ---------------------------------------------------------------- plumbing

private publish<M extends StateMember>(member: M, value: this[M]): void {
(this as unknown as Record<string, unknown>)[member] = value;
setState(`ui.tarefas.minhas_tarefas.${member}`, value);
if (member === 'selectedTarefa') {
this.syncTarefaIdToUrl(this.selectedTarefa);
}
}

private assignState(key: string, value: unknown): void {
const member = STATE_MEMBER_BY_KEY[key];
if (member) (this as unknown as Record<string, unknown>)[member] = value;
}

private syncTarefaIdToUrl(id: string | null): void {
try {
const url = new URL(window.location.href);
if (id === null) {
url.searchParams.delete('tarefaId');
} else {
url.searchParams.set('tarefaId', id);
}
window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
} catch {
// the URL is only a mirror of the selection
}
}

private stateKey(member: string): string {
return `ui.tarefas.minhas_tarefas.${member}`;
}

private readParam(name: string, useStorage: boolean): string | null {
const raw = new URLSearchParams(window.location.search).get(name);
if (raw !== null && raw !== '') return raw;
if (useStorage) {
try {
const stored = localStorage.getItem(`tarefas.minhas_tarefas.${name}`);
if (stored !== null && stored !== '') return stored;
} catch {
// storage unavailable
}
}
return null;
}

private hydrateData(): void {
for (const key of DATA_KEYS) {
const value = getState(key);
if (value !== undefined) this.assignState(key, value);
}
}

/** Publishes the initial value of every transient member: a new visit never sees an old error, scene or draft. */
private resetVisit(): void {
this.publish('pageStatus', 'idle');
this.publish('scenary', '');
this.publish('grupoTarefas', 'dependeDeMim');
this.publish('qryMinhasTarefasStatus', 'idle');
this.publish('qryMinhasTarefasError', null);
this.publish('qryTarefasDoGrupoStatus', 'idle');
this.publish('qryTarefasDoGrupoError', null);
this.publish('qryTarefaStatus', 'idle');
this.publish('qryTarefaError', null);
this.publish('qryResponsaveisStatus', 'idle');
this.publish('qryResponsaveisError', null);
this.publish('qryListasStatus', 'idle');
this.publish('qryListasError', null);
this.publish('cmdCriarTarefaStatus', 'idle');
this.publish('cmdCriarTarefaError', null);
this.publish('cmdAdicionarItensChecklistStatus', 'idle');
this.publish('cmdAdicionarItensChecklistError', null);
this.publish('cmdSalvarAlteracoesStatus', 'idle');
this.publish('cmdSalvarAlteracoesError', null);
this.publish('cmdAjustarChecklistStatus', 'idle');
this.publish('cmdAjustarChecklistError', null);
this.publish('cmdIniciarStatus', 'idle');
this.publish('cmdIniciarError', null);
this.publish('cmdEnviarParaRevisaoStatus', 'idle');
this.publish('cmdEnviarParaRevisaoError', null);
this.publish('cmdAceitarStatus', 'idle');
this.publish('cmdAceitarError', null);
this.publish('cmdDevolverStatus', 'idle');
this.publish('cmdDevolverError', null);
this.publish('cmdRetomarStatus', 'idle');
this.publish('cmdRetomarError', null);
this.publish('cmdCancelarStatus', 'idle');
this.publish('cmdCancelarError', null);
this.publish('cmdCriarTarefaDraft', emptyCriarTarefaDraft());
this.publish('cmdAdicionarItensChecklistDraft', emptyAdicionarItensChecklistDraft());
this.publish('cmdSalvarAlteracoesDraft', emptySalvarAlteracoesDraft());
this.publish('cmdAjustarChecklistDraft', emptyAjustarChecklistDraft());
this.publish('cmdDevolverDraft', emptyDevolverDraft());
}

/** A command result lives until the person changes what it acted on. */
private resetCommandResults(): void {
if (this.cmdCriarTarefaStatus !== 'idle') this.publish('cmdCriarTarefaStatus', 'idle');
if (this.cmdCriarTarefaError !== null) this.publish('cmdCriarTarefaError', null);
if (this.cmdAdicionarItensChecklistStatus !== 'idle') this.publish('cmdAdicionarItensChecklistStatus', 'idle');
if (this.cmdAdicionarItensChecklistError !== null) this.publish('cmdAdicionarItensChecklistError', null);
if (this.cmdSalvarAlteracoesStatus !== 'idle') this.publish('cmdSalvarAlteracoesStatus', 'idle');
if (this.cmdSalvarAlteracoesError !== null) this.publish('cmdSalvarAlteracoesError', null);
if (this.cmdAjustarChecklistStatus !== 'idle') this.publish('cmdAjustarChecklistStatus', 'idle');
if (this.cmdAjustarChecklistError !== null) this.publish('cmdAjustarChecklistError', null);
if (this.cmdIniciarStatus !== 'idle') this.publish('cmdIniciarStatus', 'idle');
if (this.cmdIniciarError !== null) this.publish('cmdIniciarError', null);
if (this.cmdEnviarParaRevisaoStatus !== 'idle') this.publish('cmdEnviarParaRevisaoStatus', 'idle');
if (this.cmdEnviarParaRevisaoError !== null) this.publish('cmdEnviarParaRevisaoError', null);
if (this.cmdAceitarStatus !== 'idle') this.publish('cmdAceitarStatus', 'idle');
if (this.cmdAceitarError !== null) this.publish('cmdAceitarError', null);
if (this.cmdDevolverStatus !== 'idle') this.publish('cmdDevolverStatus', 'idle');
if (this.cmdDevolverError !== null) this.publish('cmdDevolverError', null);
if (this.cmdRetomarStatus !== 'idle') this.publish('cmdRetomarStatus', 'idle');
if (this.cmdRetomarError !== null) this.publish('cmdRetomarError', null);
if (this.cmdCancelarStatus !== 'idle') this.publish('cmdCancelarStatus', 'idle');
if (this.cmdCancelarError !== null) this.publish('cmdCancelarError', null);
}

private applyEntryParams(): void {
const listaId = this.readParam('listaId', true);
const responsavelId = this.readParam('responsavelId', true);
const tarefaPaiId = this.readParam('tarefaPaiId', true);
this.publish('cmdCriarTarefaDraft', { ...emptyCriarTarefaDraft(), listaId, responsavelId, tarefaPaiId });
const tarefaId = this.readParam('tarefaId', false);
void this.qryTarefa(tarefaId);
}

private onPopState = (): void => {
if (!window.location.pathname.endsWith('/tarefas/minhas_tarefas')) return;
this.resetVisit();
this.applyEntryParams();
void this.qryMinhasTarefas();
};

public connectedCallback(): void {
super.connectedCallback();
this.hydrateData();
this.resetVisit();
subscribe([...STATE_KEYS], this);
window.addEventListener('popstate', this.onPopState);
this.applyEntryParams();
void this.qryMinhasTarefas();
}

public disconnectedCallback(): void {
window.removeEventListener('popstate', this.onPopState);
unsubscribe([...STATE_KEYS], this);
super.disconnectedCallback();
}

public handleIcaStateChange(key: string, value: any): void {
if (!(key in STATE_MEMBER_BY_KEY)) {
super.handleIcaStateChange(key, value);
return;
}
if (value === undefined) return;
this.assignState(key, value);
this.requestUpdate();
}

// ------------------------------------------------------------- run helpers

private async runQuery<T>(
id: QueryId,
call: () => Promise<BffResult<T>>,
onSuccess: (output: T) => void,
): Promise<boolean> {
const statusMember = QUERY_STATUS_MEMBER[id];
const errorMember = QUERY_ERROR_MEMBER[id];
if (this[statusMember] === 'loading') return false;
this.publish(statusMember, 'loading');
this.publish(errorMember, null);
try {
const response = await call();
if (!response.ok || !response.data) {
this.publish(errorMember, response.error ?? unexpectedError(null));
this.publish(statusMember, 'error');
return false;
}
onSuccess(response.data);
this.publish(statusMember, 'success');
return true;
} catch (error) {
this.publish(errorMember, unexpectedError(error));
this.publish(statusMember, 'error');
return false;
}
}

private async runCommand<T>(
id: CommandId,
call: (signal: AbortSignal) => Promise<BffResult<T>>,
onSuccess: (output: T) => void,
): Promise<void> {
const statusMember = COMMAND_STATUS_MEMBER[id];
const errorMember = COMMAND_ERROR_MEMBER[id];
if (this[statusMember] === 'loading') return;
this.publish(statusMember, 'loading');
this.publish(errorMember, null);
try {
const response = await runBlockingUiAction((signal: AbortSignal) => call(signal));
if (response === undefined) {
this.publish(errorMember, { code: 'client.unexpected', message: '', details: { name: 'aborted' } });
this.publish(statusMember, 'error');
return;
}
if (!response.ok || !response.data) {
this.publish(errorMember, response.error ?? unexpectedError(null));
this.publish(statusMember, 'error');
return;
}
onSuccess(response.data);
this.publish(statusMember, 'success');
} catch (error) {
this.publish(errorMember, unexpectedError(error));
this.publish(statusMember, 'error');
}
}

private requiredMissing(id: CommandId, stateKeys: string[]): void {
this.publish(COMMAND_ERROR_MEMBER[id], { code: 'client.requiredMissing', message: '', details: { stateKeys } });
this.publish(COMMAND_STATUS_MEMBER[id], 'error');
}

/** Applies the output shared by every tarefa command: redraws the opened record, its history and the selection, and refills the edit draft from the saved record. */
private applyTarefaOutput(output: TarefaOutput): void {
this.publish('tarefa', output.tarefa);
this.publish('historico', output.historico);
this.publish('selectedTarefa', output.tarefa.id);
this.publish('cmdSalvarAlteracoesDraft', draftFromTarefa(output.tarefa));
}

// ------------------------------------------------------------------ scene

/** scene — publishes the visible scene of the page; also clears the result of every command */
public setScenario(value: string): void {
this.resetCommandResults();
this.publish('scenary', value);
}

// ---------------------------------------------------------------- drafts

/** draft — replaces the draft of the new tarefa (every leaf null until typed) */
public setCmdCriarTarefaDraft(value: CriarTarefaDraft): void {
this.resetCommandResults();
this.publish('cmdCriarTarefaDraft', value);
}

/** draft — replaces the draft of the new checklist items to add to the opened tarefa */
public setCmdAdicionarItensChecklistDraft(value: AdicionarItensChecklistDraft): void {
this.resetCommandResults();
this.publish('cmdAdicionarItensChecklistDraft', value);
}

/** draft — replaces the draft that edits the opened tarefa (title, description, priority, due date, lista, responsavel, parent, labels) */
public setCmdSalvarAlteracoesDraft(value: SalvarAlteracoesDraft): void {
this.resetCommandResults();
this.publish('cmdSalvarAlteracoesDraft', value);
}

/** draft — replaces the draft of the changes to existing checklist items (fill id, version and only the leaves that change) */
public setCmdAjustarChecklistDraft(value: AjustarChecklistDraft): void {
this.resetCommandResults();
this.publish('cmdAjustarChecklistDraft', value);
}

/** draft — replaces the draft with the reason to send the opened tarefa back */
public setCmdDevolverDraft(value: DevolverDraft): void {
this.resetCommandResults();
this.publish('cmdDevolverDraft', value);
}

// --------------------------------------------------------------- queries

/** request qryMinhasTarefas — opening load: the first page of the tarefas that depend on the session person now, the totals per group and due date, and whether the person can create tarefas; redraws tarefas (replace, or append more items when append is true), the five totals and podeCriarTarefasEfetivo (replace), grupoTarefas = 'dependeDeMim', and pageStatus; page: page to load (default 1), append: true adds the page to the loaded items (only when hasMore) */
public async qryMinhasTarefas(page: number = 1, append: boolean = false): Promise<void> {
if (this.qryMinhasTarefasStatus === 'loading') return;
if (append && (!this.tarefas || !this.tarefas.hasMore || this.grupoTarefas !== 'dependeDeMim')) return;
if (!append) this.publish('pageStatus', 'loading');
const input: Input<'tarefas.minhas_tarefas.qryMinhasTarefas'> = { page, pageSize: PAGE_SIZE };
const ok = await this.runQuery(
'qryMinhasTarefas',
() => execBff<Output<'tarefas.minhas_tarefas.qryMinhasTarefas'>>('tarefas.minhas_tarefas.qryMinhasTarefas', input, { mode: 'silent' }),
(output) => {
const current = this.tarefas;
const next: TarefasPagina = append && current
? { ...output.tarefas, items: [...current.items, ...output.tarefas.items] }
: output.tarefas;
this.publish('tarefas', next);
this.publish('grupoTarefas', 'dependeDeMim');
this.publish('quantidadeDependeDeMim', output.quantidadeDependeDeMim);
this.publish('quantidadeResponsavel', output.quantidadeResponsavel);
this.publish('quantidadeCriadas', output.quantidadeCriadas);
this.publish('quantidadeVenceHoje', output.quantidadeVenceHoje);
this.publish('quantidadeAtrasadas', output.quantidadeAtrasadas);
this.publish('podeCriarTarefasEfetivo', output.podeCriarTarefasEfetivo);
},
);
if (ok) {
const loaded = this.tarefas;
this.publish('pageStatus', !loaded || loaded.items.length === 0 ? 'empty' : 'success');
} else if (!append) {
this.publish('pageStatus', 'error');
}
}

/** request qryTarefasDoGrupo — loads a page of the session person's tarefas in one group (responsavel, criadas or dependeDeMim); redraws tarefas (replace, or append when append is true and the loaded group has more) and grupoTarefas; grupo: the group to show, page: page to load (default 1), append: true adds the page to the loaded items */
public async qryTarefasDoGrupo(grupo: GrupoTarefas, page: number = 1, append: boolean = false): Promise<void> {
if (this.qryTarefasDoGrupoStatus === 'loading') return;
if (append && (!this.tarefas || !this.tarefas.hasMore || this.grupoTarefas !== grupo)) return;
const input: Input<'tarefas.minhas_tarefas.qryTarefasDoGrupo'> = { grupo, page, pageSize: PAGE_SIZE };
await this.runQuery(
'qryTarefasDoGrupo',
() => execBff<Output<'tarefas.minhas_tarefas.qryTarefasDoGrupo'>>('tarefas.minhas_tarefas.qryTarefasDoGrupo', input, { mode: 'silent' }),
(output) => {
const current = this.tarefas;
const next: TarefasPagina = append && current
? { ...output.tarefas, items: [...current.items, ...output.tarefas.items] }
: output.tarefas;
this.publish('tarefas', next);
this.publish('grupoTarefas', grupo);
},
);
}

/** request qryTarefa — selects and opens a tarefa with its checklist, the person's role and its history; redraws selectedTarefa, tarefa and historico (replace) and refills cmdSalvarAlteracoesDraft from the record; tarefaId: id of the chosen tarefa, or null to clear the selection */
public async qryTarefa(tarefaId: string | null): Promise<void> {
this.resetCommandResults();
if (tarefaId === null || tarefaId === '') {
this.publish('selectedTarefa', null);
this.publish('tarefa', null);
this.publish('historico', []);
this.publish('cmdSalvarAlteracoesDraft', emptySalvarAlteracoesDraft());
this.publish('cmdAdicionarItensChecklistDraft', emptyAdicionarItensChecklistDraft());
this.publish('cmdAjustarChecklistDraft', emptyAjustarChecklistDraft());
this.publish('cmdDevolverDraft', emptyDevolverDraft());
this.publish('qryTarefaStatus', 'idle');
this.publish('qryTarefaError', null);
return;
}
if (this.qryTarefaStatus === 'loading') return;
this.publish('selectedTarefa', tarefaId);
const input: Input<'tarefas.minhas_tarefas.qryTarefa'> = { tarefaId };
const ok = await this.runQuery(
'qryTarefa',
() => execBff<Output<'tarefas.minhas_tarefas.qryTarefa'>>('tarefas.minhas_tarefas.qryTarefa', input, { mode: 'silent' }),
(output) => {
this.publish('tarefa', output.tarefa);
this.publish('historico', output.historico);
this.publish('cmdSalvarAlteracoesDraft', draftFromTarefa(output.tarefa));
this.publish('cmdAdicionarItensChecklistDraft', emptyAdicionarItensChecklistDraft());
this.publish('cmdAjustarChecklistDraft', emptyAjustarChecklistDraft());
this.publish('cmdDevolverDraft', emptyDevolverDraft());
},
);
if (!ok) {
this.publish('tarefa', null);
this.publish('historico', []);
}
}

/** request qryResponsaveis — searches by name the active participants that can be chosen as responsavel; redraws participantes (replace); busca: part of the name typed, empty brings the first by name */
public async qryResponsaveis(busca: string = ''): Promise<void> {
const input: Input<'tarefas.minhas_tarefas.qryResponsaveis'> = {
...(busca !== '' ? { busca } : {}),
};
await this.runQuery(
'qryResponsaveis',
() => execBff<Output<'tarefas.minhas_tarefas.qryResponsaveis'>>('tarefas.minhas_tarefas.qryResponsaveis', input, { mode: 'silent' }),
(output) => {
this.publish('participantes', output.participantes);
},
);
}

/** request qryListas — searches the lists of tarefas by name to choose the lista of a tarefa; redraws listas (replace); busca: part of the list name, empty brings the first by name */
public async qryListas(busca: string = ''): Promise<void> {
const input: Input<'tarefas.minhas_tarefas.qryListas'> = {
...(busca !== '' ? { busca } : {}),
};
await this.runQuery(
'qryListas',
() => execBff<Output<'tarefas.minhas_tarefas.qryListas'>>('tarefas.minhas_tarefas.qryListas', input, { mode: 'silent' }),
(output) => {
this.publish('listas', output.listas);
},
);
}

// -------------------------------------------------------------- commands

/** request cmdCriarTarefa — creates a new tarefa in aFazer with the chosen responsavel from cmdCriarTarefaDraft (the creator is filled from the session); redraws tarefa, historico and selectedTarefa with the created record, refills cmdSalvarAlteracoesDraft and empties cmdCriarTarefaDraft; the lists and totals are not changed, reload with qryMinhasTarefas; no arguments */
public async cmdCriarTarefa(): Promise<void> {
const draft = this.cmdCriarTarefaDraft;
const titulo = draft.titulo;
const prioridade = draft.prioridade;
const listaId = draft.listaId;
const responsavelId = draft.responsavelId;
const missing: string[] = [];
if (!filled(titulo)) missing.push(this.stateKey('cmdCriarTarefaDraft.titulo'));
if (prioridade === null) missing.push(this.stateKey('cmdCriarTarefaDraft.prioridade'));
if (!filled(listaId)) missing.push(this.stateKey('cmdCriarTarefaDraft.listaId'));
if (!filled(responsavelId)) missing.push(this.stateKey('cmdCriarTarefaDraft.responsavelId'));
if (missing.length > 0 || !filled(titulo) || prioridade === null || !filled(listaId) || !filled(responsavelId)) {
this.requiredMissing('cmdCriarTarefa', missing);
return;
}
const descricao = draft.details.descricao;
const etiquetas = draft.details.etiquetas;
const prazo = draft.prazo;
const tarefaPaiId = draft.tarefaPaiId;
const input: Input<'tarefas.minhas_tarefas.cmdCriarTarefa'> = {
titulo,
details: {
...(filled(descricao) ? { descricao } : {}),
...(filled(etiquetas) ? { etiquetas } : {}),
},
prioridade,
...(filled(prazo) ? { prazo } : {}),
listaId,
responsavelId,
criadorId: '',
...(filled(tarefaPaiId) ? { tarefaPaiId } : {}),
};
await this.runCommand(
'cmdCriarTarefa',
(signal) => execBff<Output<'tarefas.minhas_tarefas.cmdCriarTarefa'>>('tarefas.minhas_tarefas.cmdCriarTarefa', input, { mode: 'blocking', signal }),
(output) => {
this.applyTarefaOutput(output);
this.publish('cmdCriarTarefaDraft', emptyCriarTarefaDraft());
},
);
}

/** request cmdAdicionarItensChecklist — adds the items of cmdAdicionarItensChecklistDraft to the checklist of the opened tarefa; does nothing when the draft has no items; redraws tarefa (with the updated checklist and progress), historico and selectedTarefa, then empties the draft; no arguments */
public async cmdAdicionarItensChecklist(): Promise<void> {
const tarefa = this.tarefa;
const itens = this.cmdAdicionarItensChecklistDraft.itens;
const missing: string[] = [];
if (!tarefa) missing.push(this.stateKey('tarefa'));
const payload: ItemChecklistNovo[] = [];
itens.forEach((item, index) => {
const descricao = item.details.descricao;
if (item.ordem === null) missing.push(this.stateKey(`cmdAdicionarItensChecklistDraft.itens.${index}.ordem`));
if (!filled(descricao)) missing.push(this.stateKey(`cmdAdicionarItensChecklistDraft.itens.${index}.details.descricao`));
if (item.ordem !== null && filled(descricao)) {
payload.push({ ordem: item.ordem, details: { descricao, concluido: item.details.concluido === true } });
}
});
if (missing.length > 0 || !tarefa) {
this.requiredMissing('cmdAdicionarItensChecklist', missing);
return;
}
if (payload.length === 0) return;
const input: Input<'tarefas.minhas_tarefas.cmdAdicionarItensChecklist'> = { tarefaId: tarefa.id, itens: payload };
await this.runCommand(
'cmdAdicionarItensChecklist',
(signal) => execBff<Output<'tarefas.minhas_tarefas.cmdAdicionarItensChecklist'>>('tarefas.minhas_tarefas.cmdAdicionarItensChecklist', input, { mode: 'blocking', signal }),
(output) => {
this.applyTarefaOutput(output);
this.publish('cmdAdicionarItensChecklistDraft', emptyAdicionarItensChecklistDraft());
},
);
}

/** request cmdSalvarAlteracoes — saves the fields of cmdSalvarAlteracoesDraft on the opened tarefa and swaps the responsavel when it changed, without changing the status; redraws tarefa, historico and selectedTarefa and refills cmdSalvarAlteracoesDraft from the saved record; no arguments */
public async cmdSalvarAlteracoes(): Promise<void> {
const tarefa = this.tarefa;
const draft = this.cmdSalvarAlteracoesDraft;
const titulo = draft.titulo;
const prioridade = draft.prioridade;
const listaId = draft.listaId;
const responsavelId = draft.responsavelId;
const missing: string[] = [];
if (!tarefa) missing.push(this.stateKey('tarefa'));
if (!filled(titulo)) missing.push(this.stateKey('cmdSalvarAlteracoesDraft.titulo'));
if (prioridade === null) missing.push(this.stateKey('cmdSalvarAlteracoesDraft.prioridade'));
if (!filled(listaId)) missing.push(this.stateKey('cmdSalvarAlteracoesDraft.listaId'));
if (!filled(responsavelId)) missing.push(this.stateKey('cmdSalvarAlteracoesDraft.responsavelId'));
if (missing.length > 0 || !tarefa || !filled(titulo) || prioridade === null || !filled(listaId) || !filled(responsavelId)) {
this.requiredMissing('cmdSalvarAlteracoes', missing);
return;
}
const descricao = draft.details.descricao;
const etiquetas = draft.details.etiquetas;
const prazo = draft.prazo;
const tarefaPaiId = draft.tarefaPaiId;
const input: Input<'tarefas.minhas_tarefas.cmdSalvarAlteracoes'> = {
id: tarefa.id,
version: tarefa.version,
titulo,
details: {
...(filled(descricao) ? { descricao } : {}),
...(filled(etiquetas) ? { etiquetas } : {}),
},
prioridade,
...(filled(prazo) ? { prazo } : {}),
listaId,
responsavelId,
...(filled(tarefaPaiId) ? { tarefaPaiId } : {}),
};
await this.runCommand(
'cmdSalvarAlteracoes',
(signal) => execBff<Output<'tarefas.minhas_tarefas.cmdSalvarAlteracoes'>>('tarefas.minhas_tarefas.cmdSalvarAlteracoes', input, { mode: 'blocking', signal }),
(output) => {
this.applyTarefaOutput(output);
},
);
}

/** request cmdAjustarChecklist — edits, reorders, checks or unchecks the checklist items listed in cmdAjustarChecklistDraft of the opened tarefa; items with nothing to change are skipped and nothing is sent when none is left; redraws tarefa (updated checklist and progress), historico and selectedTarefa, then empties the draft; no arguments */
public async cmdAjustarChecklist(): Promise<void> {
const tarefa = this.tarefa;
const itens = this.cmdAjustarChecklistDraft.itens;
const missing: string[] = [];
if (!tarefa) missing.push(this.stateKey('tarefa'));
const payload: ItemChecklistAjuste[] = [];
itens.forEach((item, index) => {
const descricao = item.details.descricao;
const concluido = item.details.concluido;
const hasChange = item.ordem !== null || filled(descricao) || concluido !== null;
if (!hasChange) return;
if (!filled(item.id)) missing.push(this.stateKey(`cmdAjustarChecklistDraft.itens.${index}.id`));
if (item.version === null) missing.push(this.stateKey(`cmdAjustarChecklistDraft.itens.${index}.version`));
if (filled(item.id) && item.version !== null) {
payload.push({
id: item.id,
version: item.version,
...(item.ordem !== null ? { ordem: item.ordem } : {}),
details: {
...(filled(descricao) ? { descricao } : {}),
...(concluido !== null ? { concluido } : {}),
},
});
}
});
if (missing.length > 0 || !tarefa) {
this.requiredMissing('cmdAjustarChecklist', missing);
return;
}
if (payload.length === 0) return;
const input: Input<'tarefas.minhas_tarefas.cmdAjustarChecklist'> = { tarefaId: tarefa.id, itens: payload };
await this.runCommand(
'cmdAjustarChecklist',
(signal) => execBff<Output<'tarefas.minhas_tarefas.cmdAjustarChecklist'>>('tarefas.minhas_tarefas.cmdAjustarChecklist', input, { mode: 'blocking', signal }),
(output) => {
this.applyTarefaOutput(output);
this.publish('cmdAjustarChecklistDraft', emptyAjustarChecklistDraft());
},
);
}

/** request cmdIniciar — the responsavel starts the opened tarefa (aFazer to emAndamento); redraws tarefa, historico and selectedTarefa with the returned record; no arguments, id and version come from the opened tarefa */
public async cmdIniciar(): Promise<void> {
const tarefa = this.tarefa;
if (!tarefa) {
this.requiredMissing('cmdIniciar', [this.stateKey('tarefa')]);
return;
}
const input: Input<'tarefas.minhas_tarefas.cmdIniciar'> = { id: tarefa.id, version: tarefa.version };
await this.runCommand(
'cmdIniciar',
(signal) => execBff<Output<'tarefas.minhas_tarefas.cmdIniciar'>>('tarefas.minhas_tarefas.cmdIniciar', input, { mode: 'blocking', signal }),
(output) => {
this.applyTarefaOutput(output);
},
);
}

/** request cmdEnviarParaRevisao — the responsavel sends the opened tarefa to review by its creator (emAndamento to emRevisao); redraws tarefa, historico and selectedTarefa with the returned record; no arguments, id and version come from the opened tarefa */
public async cmdEnviarParaRevisao(): Promise<void> {
const tarefa = this.tarefa;
if (!tarefa) {
this.requiredMissing('cmdEnviarParaRevisao', [this.stateKey('tarefa')]);
return;
}
const input: Input<'tarefas.minhas_tarefas.cmdEnviarParaRevisao'> = { id: tarefa.id, version: tarefa.version };
await this.runCommand(
'cmdEnviarParaRevisao',
(signal) => execBff<Output<'tarefas.minhas_tarefas.cmdEnviarParaRevisao'>>('tarefas.minhas_tarefas.cmdEnviarParaRevisao', input, { mode: 'blocking', signal }),
(output) => {
this.applyTarefaOutput(output);
},
);
}

/** request cmdAceitar — the creator accepts the delivery of the opened tarefa in review (it becomes concluida); redraws tarefa, historico and selectedTarefa with the returned record; no arguments, id and version come from the opened tarefa */
public async cmdAceitar(): Promise<void> {
const tarefa = this.tarefa;
if (!tarefa) {
this.requiredMissing('cmdAceitar', [this.stateKey('tarefa')]);
return;
}
const input: Input<'tarefas.minhas_tarefas.cmdAceitar'> = { id: tarefa.id, version: tarefa.version };
await this.runCommand(
'cmdAceitar',
(signal) => execBff<Output<'tarefas.minhas_tarefas.cmdAceitar'>>('tarefas.minhas_tarefas.cmdAceitar', input, { mode: 'blocking', signal }),
(output) => {
this.applyTarefaOutput(output);
},
);
}

/** request cmdDevolver — the creator sends the opened tarefa in review back to the responsavel with the reason typed in cmdDevolverDraft (it returns to emAndamento); redraws tarefa, historico and selectedTarefa with the returned record and empties cmdDevolverDraft; no arguments */
public async cmdDevolver(): Promise<void> {
const tarefa = this.tarefa;
const motivo = this.cmdDevolverDraft.details.motivoDevolucao;
const missing: string[] = [];
if (!tarefa) missing.push(this.stateKey('tarefa'));
if (!filled(motivo)) missing.push(this.stateKey('cmdDevolverDraft.details.motivoDevolucao'));
if (missing.length > 0 || !tarefa || !filled(motivo)) {
this.requiredMissing('cmdDevolver', missing);
return;
}
const input: Input<'tarefas.minhas_tarefas.cmdDevolver'> = {
id: tarefa.id,
version: tarefa.version,
details: { motivoDevolucao: motivo },
};
await this.runCommand(
'cmdDevolver',
(signal) => execBff<Output<'tarefas.minhas_tarefas.cmdDevolver'>>('tarefas.minhas_tarefas.cmdDevolver', input, { mode: 'blocking', signal }),
(output) => {
this.applyTarefaOutput(output);
this.publish('cmdDevolverDraft', emptyDevolverDraft());
},
);
}

/** request cmdRetomar — the responsavel resumes the opened tarefa that was returned, to continue the work; redraws tarefa, historico and selectedTarefa with the returned record; no arguments, id and version come from the opened tarefa */
public async cmdRetomar(): Promise<void> {
const tarefa = this.tarefa;
if (!tarefa) {
this.requiredMissing('cmdRetomar', [this.stateKey('tarefa')]);
return;
}
const input: Input<'tarefas.minhas_tarefas.cmdRetomar'> = { id: tarefa.id, version: tarefa.version };
await this.runCommand(
'cmdRetomar',
(signal) => execBff<Output<'tarefas.minhas_tarefas.cmdRetomar'>>('tarefas.minhas_tarefas.cmdRetomar', input, { mode: 'blocking', signal }),
(output) => {
this.applyTarefaOutput(output);
},
);
}

/** request cmdCancelar — the creator cancels the opened tarefa; redraws tarefa, historico and selectedTarefa with the returned record; no arguments, id and version come from the opened tarefa */
public async cmdCancelar(): Promise<void> {
const tarefa = this.tarefa;
if (!tarefa) {
this.requiredMissing('cmdCancelar', [this.stateKey('tarefa')]);
return;
}
const input: Input<'tarefas.minhas_tarefas.cmdCancelar'> = { id: tarefa.id, version: tarefa.version };
await this.runCommand(
'cmdCancelar',
(signal) => execBff<Output<'tarefas.minhas_tarefas.cmdCancelar'>>('tarefas.minhas_tarefas.cmdCancelar', input, { mode: 'blocking', signal }),
(output) => {
this.applyTarefaOutput(output);
},
);
}
}
