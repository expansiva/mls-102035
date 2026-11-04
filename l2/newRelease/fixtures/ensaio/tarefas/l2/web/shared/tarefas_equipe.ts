/// <mls fileReference="_102047_/l2/tarefas/web/shared/tarefas_equipe.ts" enhancement="_102020_/l2/enhancementAura"/>
import { property } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { execBff } from '/_102029_/l2/bffClient.js';
import { getState, setState, subscribe, unsubscribe } from '/_102029_/l2/collabState.js';
import { runBlockingUiAction } from '/_102029_/l2/interactionRuntime.js';
import type { Tarefas_equipeContracts, TarefaResumo, ContagemSituacao, ListaOpcao, ParticipanteOpcao, ItemChecklistLinha, EventoTarefa, TarefaDetalhe } from '/_102047_/l2/tarefas/web/contracts/tarefas_equipe.defs.js';

export type { Tarefas_equipeContracts, TarefaResumo, ContagemSituacao, ListaOpcao, ParticipanteOpcao, ItemChecklistLinha, EventoTarefa, TarefaDetalhe } from '/_102047_/l2/tarefas/web/contracts/tarefas_equipe.defs.js';

type Input<R extends keyof Tarefas_equipeContracts> = Tarefas_equipeContracts[R]['input'];
type Output<R extends keyof Tarefas_equipeContracts> = Tarefas_equipeContracts[R]['output'];

export type ErrorState = { code: string; message: string; details?: unknown } | null;
export type RequestStatus = 'idle' | 'loading' | 'success' | 'error';
export type PageStatus = 'idle' | 'loading' | 'empty' | 'success' | 'error';
export type Prioridade = NonNullable<Input<'tarefas.tarefas_equipe.listarTarefasEquipe'>['prioridade']>;
export type Situacao = NonNullable<Input<'tarefas.tarefas_equipe.listarTarefasEquipe'>['status']>;
export type TarefasPage = Output<'tarefas.tarefas_equipe.listarTarefasEquipe'>['tarefas'];

/** Draft of the command trocarResponsavelTarefa: only what the person picks (id and version come from the open tarefa). */
export type TrocarResponsavelTarefaDraft = {
  responsavelId: string | null;
};

function emptyTrocarResponsavelTarefaDraft(): TrocarResponsavelTarefaDraft {
  return { responsavelId: null };
}

type StateMember =
  | 'tarefas'
  | 'contagemPorSituacao'
  | 'listas'
  | 'carregarFiltrosEquipeParticipantes'
  | 'tarefa'
  | 'buscarResponsaveisDisponiveisParticipantes'
  | 'selectedTarefa'
  | 'listaTarefasId'
  | 'filtroResponsavelId'
  | 'filtroPrioridade'
  | 'filtroStatus'
  | 'filtroPrazoDe'
  | 'filtroPrazoAte'
  | 'trocarResponsavelTarefaDraft'
  | 'pageStatus'
  | 'scenary'
  | 'carregarFiltrosEquipeStatus'
  | 'carregarFiltrosEquipeError'
  | 'listarTarefasEquipeStatus'
  | 'listarTarefasEquipeError'
  | 'obterTarefaEquipeStatus'
  | 'obterTarefaEquipeError'
  | 'buscarResponsaveisDisponiveisStatus'
  | 'buscarResponsaveisDisponiveisError'
  | 'trocarResponsavelTarefaStatus'
  | 'trocarResponsavelTarefaError'
  | 'cancelarTarefaEquipeStatus'
  | 'cancelarTarefaEquipeError';

const STATE_MEMBER_BY_KEY: Record<string, StateMember> = {
  'ui.tarefas.tarefas_equipe.tarefas': 'tarefas',
  'ui.tarefas.tarefas_equipe.contagemPorSituacao': 'contagemPorSituacao',
  'ui.tarefas.tarefas_equipe.listas': 'listas',
  'ui.tarefas.tarefas_equipe.carregarFiltrosEquipeParticipantes': 'carregarFiltrosEquipeParticipantes',
  'ui.tarefas.tarefas_equipe.tarefa': 'tarefa',
  'ui.tarefas.tarefas_equipe.buscarResponsaveisDisponiveisParticipantes': 'buscarResponsaveisDisponiveisParticipantes',
  'ui.tarefas.tarefas_equipe.selectedTarefa': 'selectedTarefa',
  'ui.tarefas.tarefas_equipe.listaTarefasId': 'listaTarefasId',
  'ui.tarefas.tarefas_equipe.filtroResponsavelId': 'filtroResponsavelId',
  'ui.tarefas.tarefas_equipe.filtroPrioridade': 'filtroPrioridade',
  'ui.tarefas.tarefas_equipe.filtroStatus': 'filtroStatus',
  'ui.tarefas.tarefas_equipe.filtroPrazoDe': 'filtroPrazoDe',
  'ui.tarefas.tarefas_equipe.filtroPrazoAte': 'filtroPrazoAte',
  'ui.tarefas.tarefas_equipe.trocarResponsavelTarefaDraft': 'trocarResponsavelTarefaDraft',
  'ui.tarefas.tarefas_equipe.pageStatus': 'pageStatus',
  'ui.tarefas.tarefas_equipe.scenary': 'scenary',
  'ui.tarefas.tarefas_equipe.carregarFiltrosEquipeStatus': 'carregarFiltrosEquipeStatus',
  'ui.tarefas.tarefas_equipe.carregarFiltrosEquipeError': 'carregarFiltrosEquipeError',
  'ui.tarefas.tarefas_equipe.listarTarefasEquipeStatus': 'listarTarefasEquipeStatus',
  'ui.tarefas.tarefas_equipe.listarTarefasEquipeError': 'listarTarefasEquipeError',
  'ui.tarefas.tarefas_equipe.obterTarefaEquipeStatus': 'obterTarefaEquipeStatus',
  'ui.tarefas.tarefas_equipe.obterTarefaEquipeError': 'obterTarefaEquipeError',
  'ui.tarefas.tarefas_equipe.buscarResponsaveisDisponiveisStatus': 'buscarResponsaveisDisponiveisStatus',
  'ui.tarefas.tarefas_equipe.buscarResponsaveisDisponiveisError': 'buscarResponsaveisDisponiveisError',
  'ui.tarefas.tarefas_equipe.trocarResponsavelTarefaStatus': 'trocarResponsavelTarefaStatus',
  'ui.tarefas.tarefas_equipe.trocarResponsavelTarefaError': 'trocarResponsavelTarefaError',
  'ui.tarefas.tarefas_equipe.cancelarTarefaEquipeStatus': 'cancelarTarefaEquipeStatus',
  'ui.tarefas.tarefas_equipe.cancelarTarefaEquipeError': 'cancelarTarefaEquipeError',
};
const STATE_KEYS = Object.keys(STATE_MEMBER_BY_KEY);

const PAGE_SIZE = 50;
const STORAGE_PREFIX = 'tarefas.tarefas_equipe.';
const PAGE_PATH_SUFFIX = '/tarefas/tarefas_equipe';

export class TarefasTarefas_equipeShared extends StateLitElement {
  /** state tarefas — the page of Tarefa da organização in summary form (list, responsible, who acts now, due marks already computed), for the list view and the board; source listarTarefasEquipe.tarefas; organism tarefasEquipe */
  @property({ attribute: false }) tarefas: TarefasPage | null = null;

  /** state contagemPorSituacao — quantity of tarefas in each situation within the applied filters (board column totals); source listarTarefasEquipe.contagemPorSituacao; organism tarefasEquipe */
  @property({ attribute: false }) contagemPorSituacao: ContagemSituacao[] = [];

  /** state listas — the lists of tarefas identified by name, options of the list filter; source carregarFiltrosEquipe.listas; organism tarefasEquipe */
  @property({ attribute: false }) listas: ListaOpcao[] = [];

  /** state carregarFiltrosEquipeParticipantes — participants of the module with name, platform status and whether they accept tarefas, options of the responsible filter; source carregarFiltrosEquipe.participantes; organism tarefasEquipe */
  @property({ attribute: false }) carregarFiltrosEquipeParticipantes: ParticipanteOpcao[] = [];

  /** state tarefa — the open Tarefa in full (list, responsible, creator, who acts now, subtasks, ordered checklist, event history); it is the selected record; source obterTarefaEquipe.tarefa; organisms tarefaAcoes, tarefaDetalhe, tarefaHistorico */
  @property({ attribute: false }) tarefa: TarefaDetalhe | null = null;

  /** state buscarResponsaveisDisponiveisParticipantes — eligible participants found by name to become the new responsible; source buscarResponsaveisDisponiveis.participantes; organism tarefaAcoes */
  @property({ attribute: false }) buscarResponsaveisDisponiveisParticipantes: ParticipanteOpcao[] = [];

  /** state selectedTarefa — the id of the Tarefa selected in tarefasEquipe; source entry.params.tarefaId; organisms tarefaDetalhe, tarefasEquipe; lives in the URL */
  @property({ attribute: false }) selectedTarefa: string | null = null;

  /** state listaTarefasId — filter by list of tarefas (id) applied to the list and the board, null for all lists; source entry.params.listaTarefasId; organism tarefasEquipe; lives in the URL */
  @property({ attribute: false }) listaTarefasId: string | null = null;

  /** state filtroResponsavelId — filter by responsible participant (id), null for everyone; source filter draft of listarTarefasEquipe; organism tarefasEquipe */
  @property({ attribute: false }) filtroResponsavelId: string | null = null;

  /** state filtroPrioridade — filter by priority, null for any; source filter draft of listarTarefasEquipe; organism tarefasEquipe */
  @property({ attribute: false }) filtroPrioridade: Prioridade | null = null;

  /** state filtroStatus — filter by situation, null for any; source filter draft of listarTarefasEquipe; organism tarefasEquipe */
  @property({ attribute: false }) filtroStatus: Situacao | null = null;

  /** state filtroPrazoDe — start of the due-date interval filter (date), null for open; source filter draft of listarTarefasEquipe; organism tarefasEquipe */
  @property({ attribute: false }) filtroPrazoDe: string | null = null;

  /** state filtroPrazoAte — end of the due-date interval filter (date), null for open; source filter draft of listarTarefasEquipe; organism tarefasEquipe */
  @property({ attribute: false }) filtroPrazoAte: string | null = null;

  /** state trocarResponsavelTarefaDraft — the new responsible the manager picks by name for the reassignment form (prefilled from the entry param responsavelId); source trocarResponsavelTarefa.input; organism tarefaAcoes */
  @property({ attribute: false }) trocarResponsavelTarefaDraft: TrocarResponsavelTarefaDraft = emptyTrocarResponsavelTarefaDraft();

  /** state pageStatus — overall status of the initial load of the page: idle, loading, empty, success or error; source initial load */
  @property({ attribute: false }) pageStatus: PageStatus = 'idle';

  /** state scenary — the visible scene of the page; '' until the page shows its first scene */
  @property({ attribute: false }) scenary = '';

  /** state carregarFiltrosEquipeStatus — status of the request carregarFiltrosEquipe: idle, loading, success or error */
  @property({ attribute: false }) carregarFiltrosEquipeStatus: RequestStatus = 'idle';

  /** state carregarFiltrosEquipeError — error of the request carregarFiltrosEquipe, null when none */
  @property({ attribute: false }) carregarFiltrosEquipeError: ErrorState = null;

  /** state listarTarefasEquipeStatus — status of the request listarTarefasEquipe: idle, loading, success or error */
  @property({ attribute: false }) listarTarefasEquipeStatus: RequestStatus = 'idle';

  /** state listarTarefasEquipeError — error of the request listarTarefasEquipe, null when none */
  @property({ attribute: false }) listarTarefasEquipeError: ErrorState = null;

  /** state obterTarefaEquipeStatus — status of the request obterTarefaEquipe: idle, loading, success or error */
  @property({ attribute: false }) obterTarefaEquipeStatus: RequestStatus = 'idle';

  /** state obterTarefaEquipeError — error of the request obterTarefaEquipe, null when none */
  @property({ attribute: false }) obterTarefaEquipeError: ErrorState = null;

  /** state buscarResponsaveisDisponiveisStatus — status of the request buscarResponsaveisDisponiveis: idle, loading, success or error */
  @property({ attribute: false }) buscarResponsaveisDisponiveisStatus: RequestStatus = 'idle';

  /** state buscarResponsaveisDisponiveisError — error of the request buscarResponsaveisDisponiveis, null when none */
  @property({ attribute: false }) buscarResponsaveisDisponiveisError: ErrorState = null;

  /** state trocarResponsavelTarefaStatus — status of the command trocarResponsavelTarefa: idle, loading, success or error */
  @property({ attribute: false }) trocarResponsavelTarefaStatus: RequestStatus = 'idle';

  /** state trocarResponsavelTarefaError — error of the command trocarResponsavelTarefa, null when none */
  @property({ attribute: false }) trocarResponsavelTarefaError: ErrorState = null;

  /** state cancelarTarefaEquipeStatus — status of the command cancelarTarefaEquipe: idle, loading, success or error */
  @property({ attribute: false }) cancelarTarefaEquipeStatus: RequestStatus = 'idle';

  /** state cancelarTarefaEquipeError — error of the command cancelarTarefaEquipe, null when none */
  @property({ attribute: false }) cancelarTarefaEquipeError: ErrorState = null;

  private publish<M extends StateMember>(member: M, value: this[M]): void {
    (this as unknown as Record<string, unknown>)[member] = value;
    setState(`ui.tarefas.tarefas_equipe.${member}`, value);
    if (member === 'listaTarefasId') {
      this.syncUrlParam('listaTarefasId', this.listaTarefasId);
    }
    if (member === 'selectedTarefa') {
      this.syncUrlParam('tarefaId', this.selectedTarefa);
    }
  }

  private assignState(key: string, value: unknown): void {
    const member = STATE_MEMBER_BY_KEY[key];
    if (member) (this as unknown as Record<string, unknown>)[member] = value;
  }

  private syncUrlParam(name: string, value: string | null): void {
    try {
      const url = new URL(window.location.href);
      if (value === null || value === '') {
        url.searchParams.delete(name);
      } else {
        url.searchParams.set(name, value);
      }
      history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
    } catch {
      // the URL is only a mirror of the state
    }
  }

  private readParam(name: string, useStorage: boolean): string | null {
    const fromUrl = new URLSearchParams(window.location.search).get(name);
    if (fromUrl !== null && fromUrl !== '') return fromUrl;
    if (!useStorage) return null;
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${name}`);
      if (stored !== null && stored !== '') return stored;
    } catch {
      // storage unavailable
    }
    return null;
  }

  private unexpected(error: unknown): ErrorState {
    const name = error instanceof Error ? error.name : 'unknown';
    return { code: 'client.unexpected', message: '', details: { name } };
  }

  private hydrateData(): void {
    const tarefas = getState('ui.tarefas.tarefas_equipe.tarefas');
    if (tarefas !== undefined) this.assignState('ui.tarefas.tarefas_equipe.tarefas', tarefas);
    const contagem = getState('ui.tarefas.tarefas_equipe.contagemPorSituacao');
    if (contagem !== undefined) this.assignState('ui.tarefas.tarefas_equipe.contagemPorSituacao', contagem);
    const listas = getState('ui.tarefas.tarefas_equipe.listas');
    if (listas !== undefined) this.assignState('ui.tarefas.tarefas_equipe.listas', listas);
    const participantes = getState('ui.tarefas.tarefas_equipe.carregarFiltrosEquipeParticipantes');
    if (participantes !== undefined) this.assignState('ui.tarefas.tarefas_equipe.carregarFiltrosEquipeParticipantes', participantes);
    const tarefa = getState('ui.tarefas.tarefas_equipe.tarefa');
    if (tarefa !== undefined) this.assignState('ui.tarefas.tarefas_equipe.tarefa', tarefa);
    const responsaveis = getState('ui.tarefas.tarefas_equipe.buscarResponsaveisDisponiveisParticipantes');
    if (responsaveis !== undefined) this.assignState('ui.tarefas.tarefas_equipe.buscarResponsaveisDisponiveisParticipantes', responsaveis);
  }

  private resetVisit(): void {
    this.publish('pageStatus', 'idle');
    this.publish('scenary', '');
    this.publish('carregarFiltrosEquipeStatus', 'idle');
    this.publish('carregarFiltrosEquipeError', null);
    this.publish('listarTarefasEquipeStatus', 'idle');
    this.publish('listarTarefasEquipeError', null);
    this.publish('obterTarefaEquipeStatus', 'idle');
    this.publish('obterTarefaEquipeError', null);
    this.publish('buscarResponsaveisDisponiveisStatus', 'idle');
    this.publish('buscarResponsaveisDisponiveisError', null);
    this.publish('trocarResponsavelTarefaStatus', 'idle');
    this.publish('trocarResponsavelTarefaError', null);
    this.publish('cancelarTarefaEquipeStatus', 'idle');
    this.publish('cancelarTarefaEquipeError', null);
    this.publish('trocarResponsavelTarefaDraft', emptyTrocarResponsavelTarefaDraft());
    this.publish('filtroResponsavelId', null);
    this.publish('filtroPrioridade', null);
    this.publish('filtroStatus', null);
    this.publish('filtroPrazoDe', null);
    this.publish('filtroPrazoAte', null);
  }

  private resetCommandResults(): void {
    this.publish('trocarResponsavelTarefaStatus', 'idle');
    this.publish('trocarResponsavelTarefaError', null);
    this.publish('cancelarTarefaEquipeStatus', 'idle');
    this.publish('cancelarTarefaEquipeError', null);
  }

  private applyEntryParams(): void {
    const tarefaId = this.readParam('tarefaId', false);
    const listaTarefasId = this.readParam('listaTarefasId', false);
    const responsavelId = this.readParam('responsavelId', true);
    this.publish('listaTarefasId', listaTarefasId);
    this.publish('selectedTarefa', tarefaId);
    if (tarefaId === null) {
      this.publish('tarefa', null);
    }
    if (responsavelId !== null) {
      this.publish('trocarResponsavelTarefaDraft', { responsavelId });
    }
  }

  private async loadPage(): Promise<void> {
    this.publish('pageStatus', 'loading');
    const calls: Promise<void>[] = [this.carregarFiltrosEquipe(), this.listarTarefasEquipe(1, false)];
    const selected = this.selectedTarefa;
    if (selected !== null) {
      calls.push(this.obterTarefaEquipe(selected));
    }
    await Promise.all(calls);
    if (this.carregarFiltrosEquipeStatus === 'error' || this.listarTarefasEquipeStatus === 'error') {
      this.publish('pageStatus', 'error');
      return;
    }
    const tarefasVazias = this.tarefas === null || this.tarefas.items.length === 0;
    if (tarefasVazias && this.listas.length === 0 && this.carregarFiltrosEquipeParticipantes.length === 0) {
      this.publish('pageStatus', 'empty');
      return;
    }
    this.publish('pageStatus', 'success');
  }

  private readonly onPopState = (): void => {
    if (!window.location.pathname.endsWith(PAGE_PATH_SUFFIX)) return;
    this.resetVisit();
    this.applyEntryParams();
    void this.loadPage();
  };

  public connectedCallback(): void {
    super.connectedCallback();
    this.hydrateData();
    this.resetVisit();
    subscribe([...STATE_KEYS], this);
    window.addEventListener('popstate', this.onPopState);
    this.applyEntryParams();
    void this.loadPage();
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

  /** scene — publishes the visible scene of the page (for example list or board view); clears the result of the commands */
  public setScenario(value: string): void {
    this.resetCommandResults();
    this.publish('scenary', value);
  }

  /** draft — sets the draft of the reassignment form (the participant picked by name as new responsible); clears the result of the commands */
  public setTrocarResponsavelTarefaDraft(value: TrocarResponsavelTarefaDraft): void {
    this.resetCommandResults();
    this.publish('trocarResponsavelTarefaDraft', value);
  }

  /** filter — sets the list filter (id of a lista de tarefas, null or '' for all) and reloads the list and board from the first page */
  public setListaTarefasId(value: string | null): void {
    this.resetCommandResults();
    this.publish('listaTarefasId', value === '' ? null : value);
    void this.listarTarefasEquipe(1, false);
  }

  /** filter — sets the responsible filter (participant id, null or '' for everyone) and reloads the list and board from the first page */
  public setFiltroResponsavelId(value: string | null): void {
    this.resetCommandResults();
    this.publish('filtroResponsavelId', value === '' ? null : value);
    void this.listarTarefasEquipe(1, false);
  }

  /** filter — sets the priority filter (null for any) and reloads the list and board from the first page */
  public setFiltroPrioridade(value: Prioridade | null): void {
    this.resetCommandResults();
    this.publish('filtroPrioridade', value);
    void this.listarTarefasEquipe(1, false);
  }

  /** filter — sets the situation filter (null for any) and reloads the list and board from the first page */
  public setFiltroStatus(value: Situacao | null): void {
    this.resetCommandResults();
    this.publish('filtroStatus', value);
    void this.listarTarefasEquipe(1, false);
  }

  /** filter — sets the start of the due-date interval (date, null or '' for open) and reloads the list and board from the first page */
  public setFiltroPrazoDe(value: string | null): void {
    this.resetCommandResults();
    this.publish('filtroPrazoDe', value === '' ? null : value);
    void this.listarTarefasEquipe(1, false);
  }

  /** filter — sets the end of the due-date interval (date, null or '' for open) and reloads the list and board from the first page */
  public setFiltroPrazoAte(value: string | null): void {
    this.resetCommandResults();
    this.publish('filtroPrazoAte', value === '' ? null : value);
    void this.listarTarefasEquipe(1, false);
  }

  /** select — selects the tarefa to open by id (null clears the selection): publishes selectedTarefa, empties the reassignment draft and loads the record into tarefa through obterTarefaEquipe */
  public async selectTarefa(id: string | null): Promise<void> {
    this.resetCommandResults();
    this.publish('selectedTarefa', id);
    this.publish('trocarResponsavelTarefaDraft', emptyTrocarResponsavelTarefaDraft());
    if (id === null || id === '') {
      this.publish('selectedTarefa', null);
      this.publish('tarefa', null);
      return;
    }
    await this.obterTarefaEquipe(id);
  }

  /** request carregarFiltrosEquipe — loads the options of the list and responsible filters (no input; the manager comes from the session); redraws listas and carregarFiltrosEquipeParticipantes by replace; no arguments */
  public async carregarFiltrosEquipe(): Promise<void> {
    if (this.carregarFiltrosEquipeStatus === 'loading') return;
    this.publish('carregarFiltrosEquipeStatus', 'loading');
    this.publish('carregarFiltrosEquipeError', null);
    try {
      const response = await execBff<Output<'tarefas.tarefas_equipe.carregarFiltrosEquipe'>>('tarefas.tarefas_equipe.carregarFiltrosEquipe', {}, { mode: 'silent' });
      if (!response.ok || !response.data) {
        this.publish('carregarFiltrosEquipeError', response.error ?? this.unexpected(null));
        this.publish('carregarFiltrosEquipeStatus', 'error');
        return;
      }
      this.publish('listas', response.data.listas);
      this.publish('carregarFiltrosEquipeParticipantes', response.data.participantes);
      this.publish('carregarFiltrosEquipeStatus', 'success');
    } catch (error) {
      this.publish('carregarFiltrosEquipeError', this.unexpected(error));
      this.publish('carregarFiltrosEquipeStatus', 'error');
    }
  }

  /** request listarTarefasEquipe — lists all tarefas of the organization with the current filters (listaTarefasId, filtroResponsavelId, filtroPrioridade, filtroStatus, filtroPrazoDe, filtroPrazoAte), serving the list view and the board; redraws tarefas (replace, or append when append is true) and contagemPorSituacao (replace); page: page to load, default 1; append: true adds the next page to the items ("load more"), does nothing when tarefas.hasMore is false */
  public async listarTarefasEquipe(page = 1, append = false): Promise<void> {
    if (this.listarTarefasEquipeStatus === 'loading') return;
    const current = this.tarefas;
    if (append && (current === null || !current.hasMore)) return;
    this.publish('listarTarefasEquipeStatus', 'loading');
    this.publish('listarTarefasEquipeError', null);
    const input: Input<'tarefas.tarefas_equipe.listarTarefasEquipe'> = {
      ...(this.listaTarefasId !== null && this.listaTarefasId !== '' ? { listaId: this.listaTarefasId } : {}),
      ...(this.filtroResponsavelId !== null && this.filtroResponsavelId !== '' ? { responsavelId: this.filtroResponsavelId } : {}),
      ...(this.filtroPrioridade !== null ? { prioridade: this.filtroPrioridade } : {}),
      ...(this.filtroStatus !== null ? { status: this.filtroStatus } : {}),
      ...(this.filtroPrazoDe !== null && this.filtroPrazoDe !== '' ? { prazoDe: this.filtroPrazoDe } : {}),
      ...(this.filtroPrazoAte !== null && this.filtroPrazoAte !== '' ? { prazoAte: this.filtroPrazoAte } : {}),
      page,
      pageSize: PAGE_SIZE,
    };
    try {
      const response = await execBff<Output<'tarefas.tarefas_equipe.listarTarefasEquipe'>>('tarefas.tarefas_equipe.listarTarefasEquipe', input, { mode: 'silent' });
      if (!response.ok || !response.data) {
        this.publish('listarTarefasEquipeError', response.error ?? this.unexpected(null));
        this.publish('listarTarefasEquipeStatus', 'error');
        return;
      }
      const output = response.data;
      const merged: TarefasPage = append && current !== null
        ? { ...output.tarefas, items: [...current.items, ...output.tarefas.items] }
        : output.tarefas;
      this.publish('tarefas', merged);
      this.publish('contagemPorSituacao', output.contagemPorSituacao);
      this.publish('listarTarefasEquipeStatus', 'success');
    } catch (error) {
      this.publish('listarTarefasEquipeError', this.unexpected(error));
      this.publish('listarTarefasEquipeStatus', 'error');
    }
  }

  /** request obterTarefaEquipe — opens one tarefa in full (responsible, due date, checklist, subtasks, history); redraws tarefa by replace; tarefaId: id of the tarefa chosen in the list or board (prefer selectTarefa, which also publishes the selection) */
  public async obterTarefaEquipe(tarefaId: string): Promise<void> {
    if (this.obterTarefaEquipeStatus === 'loading') return;
    if (tarefaId === '') {
      this.publish('obterTarefaEquipeError', { code: 'client.requiredMissing', message: '', details: { stateKeys: ['selectedTarefa'] } });
      this.publish('obterTarefaEquipeStatus', 'error');
      return;
    }
    this.publish('obterTarefaEquipeStatus', 'loading');
    this.publish('obterTarefaEquipeError', null);
    try {
      const response = await execBff<Output<'tarefas.tarefas_equipe.obterTarefaEquipe'>>('tarefas.tarefas_equipe.obterTarefaEquipe', { tarefaId }, { mode: 'silent' });
      if (!response.ok || !response.data) {
        this.publish('obterTarefaEquipeError', response.error ?? this.unexpected(null));
        this.publish('obterTarefaEquipeStatus', 'error');
        return;
      }
      this.publish('tarefa', response.data.tarefa);
      this.publish('obterTarefaEquipeStatus', 'success');
    } catch (error) {
      this.publish('obterTarefaEquipeError', this.unexpected(error));
      this.publish('obterTarefaEquipeStatus', 'error');
    }
  }

  /** request buscarResponsaveisDisponiveis — searches by name the active participants who accept tarefas and can become the new responsible (never by e-mail); redraws buscarResponsaveisDisponiveisParticipantes by replace; nome: typed part of the name, omit or empty to get the first ones alphabetically */
  public async buscarResponsaveisDisponiveis(nome?: string): Promise<void> {
    if (this.buscarResponsaveisDisponiveisStatus === 'loading') return;
    this.publish('buscarResponsaveisDisponiveisStatus', 'loading');
    this.publish('buscarResponsaveisDisponiveisError', null);
    const input: Input<'tarefas.tarefas_equipe.buscarResponsaveisDisponiveis'> = {
      ...(nome !== undefined && nome !== '' ? { nome } : {}),
    };
    try {
      const response = await execBff<Output<'tarefas.tarefas_equipe.buscarResponsaveisDisponiveis'>>('tarefas.tarefas_equipe.buscarResponsaveisDisponiveis', input, { mode: 'silent' });
      if (!response.ok || !response.data) {
        this.publish('buscarResponsaveisDisponiveisError', response.error ?? this.unexpected(null));
        this.publish('buscarResponsaveisDisponiveisStatus', 'error');
        return;
      }
      this.publish('buscarResponsaveisDisponiveisParticipantes', response.data.participantes);
      this.publish('buscarResponsaveisDisponiveisStatus', 'success');
    } catch (error) {
      this.publish('buscarResponsaveisDisponiveisError', this.unexpected(error));
      this.publish('buscarResponsaveisDisponiveisStatus', 'error');
    }
  }

  /** request trocarResponsavelTarefa — changes the responsible of the open tarefa to the participant in trocarResponsavelTarefaDraft.responsavelId (the situation does not change; the new responsible is warned when the tarefa is to do or in progress); redraws tarefa by replace and upserts its row in tarefas (removed when it no longer matches the active responsible or situation filter), then empties the draft; no arguments (id and version come from the open tarefa) */
  public async trocarResponsavelTarefa(): Promise<void> {
    if (this.trocarResponsavelTarefaStatus === 'loading') return;
    const tarefa = this.tarefa;
    const responsavelId = this.trocarResponsavelTarefaDraft.responsavelId;
    const stateKeys: string[] = [];
    if (tarefa === null) stateKeys.push('tarefa');
    if (responsavelId === null || responsavelId === '') stateKeys.push('trocarResponsavelTarefaDraft');
    if (stateKeys.length > 0 || tarefa === null || responsavelId === null) {
      this.publish('trocarResponsavelTarefaError', { code: 'client.requiredMissing', message: '', details: { stateKeys } });
      this.publish('trocarResponsavelTarefaStatus', 'error');
      return;
    }
    this.publish('trocarResponsavelTarefaError', null);
    this.publish('trocarResponsavelTarefaStatus', 'loading');
    const input: Input<'tarefas.tarefas_equipe.trocarResponsavelTarefa'> = {
      id: tarefa.id,
      version: tarefa.version,
      responsavelId,
    };
    try {
      const response = await runBlockingUiAction(signal => execBff<Output<'tarefas.tarefas_equipe.trocarResponsavelTarefa'>>('tarefas.tarefas_equipe.trocarResponsavelTarefa', input, { mode: 'blocking', signal }));
      if (response === undefined) {
        this.publish('trocarResponsavelTarefaError', { code: 'client.unexpected', message: '', details: { name: 'aborted' } });
        this.publish('trocarResponsavelTarefaStatus', 'error');
        return;
      }
      if (!response.ok || !response.data) {
        this.publish('trocarResponsavelTarefaError', response.error ?? this.unexpected(null));
        this.publish('trocarResponsavelTarefaStatus', 'error');
        return;
      }
      this.applyTarefaResult(response.data.tarefa);
      this.publish('trocarResponsavelTarefaDraft', emptyTrocarResponsavelTarefaDraft());
      this.publish('trocarResponsavelTarefaStatus', 'success');
    } catch (error) {
      this.publish('trocarResponsavelTarefaError', this.unexpected(error));
      this.publish('trocarResponsavelTarefaStatus', 'error');
    }
  }

  /** request cancelarTarefaEquipe — cancels the open tarefa while it is still open (the one who was acting is warned); redraws tarefa by replace and upserts its row in tarefas (removed when the situation filter no longer matches); no arguments (id and version come from the open tarefa) */
  public async cancelarTarefaEquipe(): Promise<void> {
    if (this.cancelarTarefaEquipeStatus === 'loading') return;
    const tarefa = this.tarefa;
    if (tarefa === null) {
      this.publish('cancelarTarefaEquipeError', { code: 'client.requiredMissing', message: '', details: { stateKeys: ['tarefa'] } });
      this.publish('cancelarTarefaEquipeStatus', 'error');
      return;
    }
    this.publish('cancelarTarefaEquipeError', null);
    this.publish('cancelarTarefaEquipeStatus', 'loading');
    const input: Input<'tarefas.tarefas_equipe.cancelarTarefaEquipe'> = {
      id: tarefa.id,
      version: tarefa.version,
    };
    try {
      const response = await runBlockingUiAction(signal => execBff<Output<'tarefas.tarefas_equipe.cancelarTarefaEquipe'>>('tarefas.tarefas_equipe.cancelarTarefaEquipe', input, { mode: 'blocking', signal }));
      if (response === undefined) {
        this.publish('cancelarTarefaEquipeError', { code: 'client.unexpected', message: '', details: { name: 'aborted' } });
        this.publish('cancelarTarefaEquipeStatus', 'error');
        return;
      }
      if (!response.ok || !response.data) {
        this.publish('cancelarTarefaEquipeError', response.error ?? this.unexpected(null));
        this.publish('cancelarTarefaEquipeStatus', 'error');
        return;
      }
      this.applyTarefaResult(response.data.tarefa);
      this.publish('cancelarTarefaEquipeStatus', 'success');
    } catch (error) {
      this.publish('cancelarTarefaEquipeError', this.unexpected(error));
      this.publish('cancelarTarefaEquipeStatus', 'error');
    }
  }

  /** Applies the tarefa returned by a command: redraws the open record and upserts (or removes) its row in the loaded list. */
  private applyTarefaResult(tarefa: TarefaDetalhe): void {
    this.publish('tarefa', tarefa);
    const current = this.tarefas;
    if (current === null) return;
    const existing = current.items.find(row => row.id === tarefa.id);
    if (!existing) return;
    const matchesStatus = this.filtroStatus === null || this.filtroStatus === tarefa.status;
    const matchesResponsavel = this.filtroResponsavelId === null || this.filtroResponsavelId === '' || this.filtroResponsavelId === tarefa.responsavelId;
    if (!matchesStatus || !matchesResponsavel) {
      this.publish('tarefas', { ...current, items: current.items.filter(row => row.id !== tarefa.id) });
      return;
    }
    const items = current.items.map(row => (row.id === tarefa.id ? this.mergeResumo(row, tarefa) : row));
    this.publish('tarefas', { ...current, items });
  }

  private mergeResumo(row: TarefaResumo, tarefa: TarefaDetalhe): TarefaResumo {
    return {
      id: tarefa.id,
      version: tarefa.version,
      titulo: tarefa.titulo,
      status: tarefa.status,
      prioridade: tarefa.prioridade,
      prazo: tarefa.prazo,
      listaId: tarefa.listaId,
      listaTarefas: tarefa.listaTarefas,
      responsavelId: tarefa.responsavelId,
      participante: tarefa.participante,
      criadaEm: tarefa.criadaEm,
      details: {
        quemAgeAgora: tarefa.details.quemAgeAgora,
        venceHoje: tarefa.details.aberta ? row.details.venceHoje : false,
        atrasada: tarefa.details.aberta ? row.details.atrasada : false,
        progressoChecklist: tarefa.details.progressoChecklist,
      },
      quemAgeAgoraNome: tarefa.quemAgeAgoraNome,
    };
  }
}
