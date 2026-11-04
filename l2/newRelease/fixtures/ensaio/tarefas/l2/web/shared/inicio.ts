/// <mls fileReference="_102047_/l2/tarefas/web/shared/inicio.ts" enhancement="_102020_/l2/enhancementAura"/>
import { property } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { execBff } from '/_102029_/l2/bffClient.js';
import { getState, setState, subscribe, unsubscribe } from '/_102029_/l2/collabState.js';
import { runBlockingUiAction } from '/_102029_/l2/interactionRuntime.js';
import { auraNavigate } from '/_102033_/l2/shared/layout/auraNavigate.js';
import type {
  InicioContracts,
  ParticipanteIdentificacaoResumo,
  ParticipanteNomeDetalhes,
  ParticipanteNome,
  ListaTarefasNome,
  PendenciaTarefaDetalhes,
  PendenciaTarefa,
  AlertaPrazoDetalhes,
  AlertaPrazo,
  IndicadoresTarefas,
  PermissoesTarefas,
  PermissoesParticipanteDetalhes,
  PermissoesParticipante,
} from '/_102047_/l2/tarefas/web/contracts/inicio.defs.js';

export type {
  InicioContracts,
  ParticipanteIdentificacaoResumo,
  ParticipanteNomeDetalhes,
  ParticipanteNome,
  ListaTarefasNome,
  PendenciaTarefaDetalhes,
  PendenciaTarefa,
  AlertaPrazoDetalhes,
  AlertaPrazo,
  IndicadoresTarefas,
  PermissoesTarefas,
  PermissoesParticipanteDetalhes,
  PermissoesParticipante,
} from '/_102047_/l2/tarefas/web/contracts/inicio.defs.js';

type Input<R extends keyof InicioContracts> = InicioContracts[R]['input'];
type Output<R extends keyof InicioContracts> = InicioContracts[R]['output'];

export type ErrorState = { code: string; message: string; details?: unknown } | null;

type PageStatus = 'idle' | 'loading' | 'empty' | 'success' | 'error';
type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

/** Draft of the devolverTarefa command input; every leaf is null until typed. */
export type DevolverTarefaDraft = {
  id: string | null;
  version: number | null;
  details: { motivoDevolucao: string | null };
};

function emptyDevolverTarefaDraft(): DevolverTarefaDraft {
  return { id: null, version: null, details: { motivoDevolucao: null } };
}

type CommandRequest = 'iniciarTarefa' | 'enviarRevisao' | 'aceitarTarefa' | 'devolverTarefa' | 'retomarTarefa';
type CommandOutput = Output<'tarefas.inicio.iniciarTarefa'>;
type CommandResponse = { ok: boolean; data: CommandOutput | null; error: ErrorState };

type StateMember =
  | 'pendencias'
  | 'alertas'
  | 'indicadores'
  | 'permissoes'
  | 'devolverTarefaDraft'
  | 'pageStatus'
  | 'carregarInicioStatus'
  | 'carregarInicioError'
  | 'iniciarTarefaStatus'
  | 'iniciarTarefaError'
  | 'enviarRevisaoStatus'
  | 'enviarRevisaoError'
  | 'aceitarTarefaStatus'
  | 'aceitarTarefaError'
  | 'devolverTarefaStatus'
  | 'devolverTarefaError'
  | 'retomarTarefaStatus'
  | 'retomarTarefaError'
  | 'scenary';

const STATE_MEMBER_BY_KEY: Record<string, StateMember> = {
  'ui.tarefas.inicio.pendencias': 'pendencias',
  'ui.tarefas.inicio.alertas': 'alertas',
  'ui.tarefas.inicio.indicadores': 'indicadores',
  'ui.tarefas.inicio.permissoes': 'permissoes',
  'ui.tarefas.inicio.devolverTarefaDraft': 'devolverTarefaDraft',
  'ui.tarefas.inicio.pageStatus': 'pageStatus',
  'ui.tarefas.inicio.carregarInicioStatus': 'carregarInicioStatus',
  'ui.tarefas.inicio.carregarInicioError': 'carregarInicioError',
  'ui.tarefas.inicio.iniciarTarefaStatus': 'iniciarTarefaStatus',
  'ui.tarefas.inicio.iniciarTarefaError': 'iniciarTarefaError',
  'ui.tarefas.inicio.enviarRevisaoStatus': 'enviarRevisaoStatus',
  'ui.tarefas.inicio.enviarRevisaoError': 'enviarRevisaoError',
  'ui.tarefas.inicio.aceitarTarefaStatus': 'aceitarTarefaStatus',
  'ui.tarefas.inicio.aceitarTarefaError': 'aceitarTarefaError',
  'ui.tarefas.inicio.devolverTarefaStatus': 'devolverTarefaStatus',
  'ui.tarefas.inicio.devolverTarefaError': 'devolverTarefaError',
  'ui.tarefas.inicio.retomarTarefaStatus': 'retomarTarefaStatus',
  'ui.tarefas.inicio.retomarTarefaError': 'retomarTarefaError',
  'ui.tarefas.inicio.scenary': 'scenary',
};
const STATE_KEYS = Object.keys(STATE_MEMBER_BY_KEY);

export class TarefasInicioShared extends StateLitElement {
  /** state pendencias — the list of tasks that depend on the person now, with status, due date, priority, list, assignee, creator, checklist progress and return reason; source carregarInicio.pendencias; organism pendenciasAgora */
  @property({ attribute: false }) pendencias: PendenciaTarefa[] = [];

  /** state alertas — the list of open tasks that are due today or late, with title, due date and status; source carregarInicio.alertas; organism alertasPrazo */
  @property({ attribute: false }) alertas: AlertaPrazo[] = [];

  /** state indicadores — counters of the person's tasks: open, due today, late and returned awaiting resumption; source carregarInicio.indicadores; organism indicadoresTarefas */
  @property({ attribute: false }) indicadores: IndicadoresTarefas | null = null;

  /** state permissoes — the session participant with name and effective flags for accepting and creating tasks; source carregarInicio.permissoes; organism minhasPermissoes */
  @property({ attribute: false }) permissoes: PermissoesParticipante | null = null;

  /** state devolverTarefaDraft — draft of the return command: the reason (details.motivoDevolucao) the creator types before returning a task in review; source devolverTarefa.input; organism pendenciasAgora */
  @property({ attribute: false }) devolverTarefaDraft: DevolverTarefaDraft = emptyDevolverTarefaDraft();

  /** state pageStatus — overall status of the page: idle, loading, empty (nothing pending and no alert), success or error */
  @property({ attribute: false }) pageStatus: PageStatus = 'idle';

  /** state carregarInicioStatus — status of the initial load request */
  @property({ attribute: false }) carregarInicioStatus: RequestStatus = 'idle';

  /** state carregarInicioError — error of the initial load request (also used by navigation refusals), null when none */
  @property({ attribute: false }) carregarInicioError: ErrorState = null;

  /** state iniciarTarefaStatus — status of the start-task command */
  @property({ attribute: false }) iniciarTarefaStatus: RequestStatus = 'idle';

  /** state iniciarTarefaError — error of the start-task command, null when none */
  @property({ attribute: false }) iniciarTarefaError: ErrorState = null;

  /** state enviarRevisaoStatus — status of the send-to-review command */
  @property({ attribute: false }) enviarRevisaoStatus: RequestStatus = 'idle';

  /** state enviarRevisaoError — error of the send-to-review command, null when none */
  @property({ attribute: false }) enviarRevisaoError: ErrorState = null;

  /** state aceitarTarefaStatus — status of the accept-task command */
  @property({ attribute: false }) aceitarTarefaStatus: RequestStatus = 'idle';

  /** state aceitarTarefaError — error of the accept-task command, null when none */
  @property({ attribute: false }) aceitarTarefaError: ErrorState = null;

  /** state devolverTarefaStatus — status of the return-task command */
  @property({ attribute: false }) devolverTarefaStatus: RequestStatus = 'idle';

  /** state devolverTarefaError — error of the return-task command, null when none */
  @property({ attribute: false }) devolverTarefaError: ErrorState = null;

  /** state retomarTarefaStatus — status of the resume-task command */
  @property({ attribute: false }) retomarTarefaStatus: RequestStatus = 'idle';

  /** state retomarTarefaError — error of the resume-task command, null when none */
  @property({ attribute: false }) retomarTarefaError: ErrorState = null;

  /** state scenary — the visible scene of the page; '' until the page shows its first scene */
  @property({ attribute: false }) scenary = '';

  private publish<M extends StateMember>(member: M, value: this[M]): void {
    (this as unknown as Record<string, unknown>)[member] = value;
    setState(`ui.tarefas.inicio.${member}`, value);
  }

  private assignState(key: string, value: unknown): void {
    const member = STATE_MEMBER_BY_KEY[key];
    if (member) (this as unknown as Record<string, unknown>)[member] = value;
  }

  private onPopState = (): void => {
    if (window.location.pathname.endsWith('/tarefas/inicio')) {
      this.resetVisit();
      void this.carregarInicio();
    }
  };

  public connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('popstate', this.onPopState);
    this.hydrateData();
    this.resetVisit();
    subscribe([...STATE_KEYS], this);
    void this.carregarInicio();
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

  private hydrateData(): void {
    const dataKeys = [
      'ui.tarefas.inicio.pendencias',
      'ui.tarefas.inicio.alertas',
      'ui.tarefas.inicio.indicadores',
      'ui.tarefas.inicio.permissoes',
    ];
    for (const key of dataKeys) {
      const stored = getState(key);
      if (stored !== undefined) this.assignState(key, stored);
    }
  }

  private resetVisit(): void {
    this.publish('pageStatus', 'idle');
    this.publish('carregarInicioStatus', 'idle');
    this.publish('carregarInicioError', null);
    this.publish('iniciarTarefaStatus', 'idle');
    this.publish('iniciarTarefaError', null);
    this.publish('enviarRevisaoStatus', 'idle');
    this.publish('enviarRevisaoError', null);
    this.publish('aceitarTarefaStatus', 'idle');
    this.publish('aceitarTarefaError', null);
    this.publish('devolverTarefaStatus', 'idle');
    this.publish('devolverTarefaError', null);
    this.publish('retomarTarefaStatus', 'idle');
    this.publish('retomarTarefaError', null);
    this.publish('devolverTarefaDraft', emptyDevolverTarefaDraft());
    this.publish('scenary', '');
  }

  private resetCommandResults(): void {
    this.publish('iniciarTarefaStatus', 'idle');
    this.publish('iniciarTarefaError', null);
    this.publish('enviarRevisaoStatus', 'idle');
    this.publish('enviarRevisaoError', null);
    this.publish('aceitarTarefaStatus', 'idle');
    this.publish('aceitarTarefaError', null);
    this.publish('devolverTarefaStatus', 'idle');
    this.publish('devolverTarefaError', null);
    this.publish('retomarTarefaStatus', 'idle');
    this.publish('retomarTarefaError', null);
  }

  /** scene — publishes the visible scene of the page (state scenary); clears the results of past commands */
  public setScenario(value: string): void {
    this.resetCommandResults();
    this.publish('scenary', value);
  }

  /** draft — replaces the draft of the return command (state devolverTarefaDraft); the page types details.motivoDevolucao here before calling devolverTarefa */
  public setDevolverTarefaDraft(value: DevolverTarefaDraft): void {
    this.resetCommandResults();
    this.publish('devolverTarefaDraft', value);
  }

  /** request carregarInicio — loads the member's home in one call: pending tasks, due-date alerts, counters and effective permissions; redraws pendencias, alertas, indicadores and permissoes (replace) and sets pageStatus; no arguments, the session person is identified by the server; call it again to reload */
  public async carregarInicio(): Promise<void> {
    if (this.carregarInicioStatus === 'loading') return;
    this.publish('pageStatus', 'loading');
    this.publish('carregarInicioStatus', 'loading');
    this.publish('carregarInicioError', null);
    try {
      const input: Input<'tarefas.inicio.carregarInicio'> = {};
      const response = await execBff<Output<'tarefas.inicio.carregarInicio'>>('tarefas.inicio.carregarInicio', input, { mode: 'silent' });
      if (!response.ok || !response.data) {
        this.publish('carregarInicioError', response.error ?? { code: 'client.unexpected', message: '', details: { name: 'unknown' } });
        this.publish('carregarInicioStatus', 'error');
        this.publish('pageStatus', 'error');
        return;
      }
      const data = response.data;
      this.publish('pendencias', [...data.pendencias]);
      this.publish('alertas', [...data.alertas]);
      this.publish('indicadores', data.indicadores);
      this.publish('permissoes', data.permissoes);
      this.publish('carregarInicioStatus', 'success');
      this.publish('pageStatus', data.pendencias.length === 0 && data.alertas.length === 0 ? 'empty' : 'success');
    } catch (error) {
      const name = error instanceof Error ? error.name : 'unknown';
      this.publish('carregarInicioError', { code: 'client.unexpected', message: '', details: { name } });
      this.publish('carregarInicioStatus', 'error');
      this.publish('pageStatus', 'error');
    }
  }

  private publishCommandStatus(request: CommandRequest, status: RequestStatus): void {
    switch (request) {
      case 'iniciarTarefa':
        this.publish('iniciarTarefaStatus', status);
        break;
      case 'enviarRevisao':
        this.publish('enviarRevisaoStatus', status);
        break;
      case 'aceitarTarefa':
        this.publish('aceitarTarefaStatus', status);
        break;
      case 'devolverTarefa':
        this.publish('devolverTarefaStatus', status);
        break;
      case 'retomarTarefa':
        this.publish('retomarTarefaStatus', status);
        break;
    }
  }

  private publishCommandError(request: CommandRequest, error: ErrorState): void {
    switch (request) {
      case 'iniciarTarefa':
        this.publish('iniciarTarefaError', error);
        break;
      case 'enviarRevisao':
        this.publish('enviarRevisaoError', error);
        break;
      case 'aceitarTarefa':
        this.publish('aceitarTarefaError', error);
        break;
      case 'devolverTarefa':
        this.publish('devolverTarefaError', error);
        break;
      case 'retomarTarefa':
        this.publish('retomarTarefaError', error);
        break;
    }
  }

  private commandStatus(request: CommandRequest): RequestStatus {
    switch (request) {
      case 'iniciarTarefa':
        return this.iniciarTarefaStatus;
      case 'enviarRevisao':
        return this.enviarRevisaoStatus;
      case 'aceitarTarefa':
        return this.aceitarTarefaStatus;
      case 'devolverTarefa':
        return this.devolverTarefaStatus;
      case 'retomarTarefa':
        return this.retomarTarefaStatus;
    }
  }

  /**
   * Runs one command on a row of pendencias. The version comes from the loaded row.
   * The returned task is upserted by id in pendencias, or removed when it no longer
   * depends on the same person; indicadores is replaced by the returned counters.
   */
  private async runCommand(
    request: CommandRequest,
    id: string,
    send: (version: number, signal: AbortSignal) => Promise<CommandResponse>,
  ): Promise<void> {
    if (this.commandStatus(request) === 'loading') return;
    const row = this.pendencias.find((item) => item.id === id);
    if (!row) {
      this.publishCommandError(request, { code: 'client.requiredMissing', message: '', details: { stateKeys: ['pendencias'] } });
      this.publishCommandStatus(request, 'error');
      return;
    }
    this.publishCommandStatus(request, 'loading');
    this.publishCommandError(request, null);
    try {
      const response = await runBlockingUiAction((signal) => send(row.version, signal));
      if (response === undefined) {
        this.publishCommandError(request, { code: 'client.unexpected', message: '', details: { name: 'aborted' } });
        this.publishCommandStatus(request, 'error');
        return;
      }
      if (!response.ok || !response.data) {
        this.publishCommandError(request, response.error ?? { code: 'client.unexpected', message: '', details: { name: 'unknown' } });
        this.publishCommandStatus(request, 'error');
        return;
      }
      const updated = response.data.tarefa;
      const previousActor = row.details.quemAgeAgora;
      const nextActor = updated.details.quemAgeAgora;
      const stays = nextActor !== undefined && (previousActor === undefined || nextActor === previousActor);
      let rows: PendenciaTarefa[];
      if (!stays) {
        rows = this.pendencias.filter((item) => item.id !== updated.id);
      } else if (this.pendencias.some((item) => item.id === updated.id)) {
        rows = this.pendencias.map((item) => (item.id === updated.id ? updated : item));
      } else {
        rows = [...this.pendencias, updated];
      }
      this.publish('pendencias', rows);
      this.publish('indicadores', response.data.indicadores);
      if (request === 'devolverTarefa') this.publish('devolverTarefaDraft', emptyDevolverTarefaDraft());
      this.publishCommandStatus(request, 'success');
    } catch (error) {
      const name = error instanceof Error ? error.name : 'unknown';
      this.publishCommandError(request, { code: 'client.unexpected', message: '', details: { name } });
      this.publishCommandStatus(request, 'error');
    }
  }

  /** request iniciarTarefa — starts a to-do task the session person is assignee of (aFazer to emAndamento); redraws pendencias (upsert the returned task by id) and indicadores (replace); argument id: the task row to start, its version is read from the loaded row */
  public async iniciarTarefa(id: string): Promise<void> {
    await this.runCommand('iniciarTarefa', id, (version, signal) => {
      const input: Input<'tarefas.inicio.iniciarTarefa'> = { id, version };
      return execBff<Output<'tarefas.inicio.iniciarTarefa'>>('tarefas.inicio.iniciarTarefa', input, { mode: 'blocking', signal });
    });
  }

  /** request enviarRevisao — sends an in-progress task (or resends a returned one) to review; redraws pendencias (upsert by id, or remove when the creator becomes the one who acts) and indicadores (replace); argument id: the task row to send, its version is read from the loaded row */
  public async enviarRevisao(id: string): Promise<void> {
    await this.runCommand('enviarRevisao', id, (version, signal) => {
      const input: Input<'tarefas.inicio.enviarRevisao'> = { id, version };
      return execBff<Output<'tarefas.inicio.enviarRevisao'>>('tarefas.inicio.enviarRevisao', input, { mode: 'blocking', signal });
    });
  }

  /** request aceitarTarefa — accepts the delivery of a task in review created by the session person, concluding it; redraws pendencias (the task leaves the list) and indicadores (replace); argument id: the task row to accept, its version is read from the loaded row */
  public async aceitarTarefa(id: string): Promise<void> {
    await this.runCommand('aceitarTarefa', id, (version, signal) => {
      const input: Input<'tarefas.inicio.aceitarTarefa'> = { id, version };
      return execBff<Output<'tarefas.inicio.aceitarTarefa'>>('tarefas.inicio.aceitarTarefa', input, { mode: 'blocking', signal });
    });
  }

  /** request devolverTarefa — returns a task in review to its assignee with a reason; the reason is read from devolverTarefaDraft.details.motivoDevolucao (required, otherwise client.requiredMissing and no call); redraws pendencias (upsert by id, or remove when the assignee becomes the one who acts), indicadores (replace) and clears the draft; argument id: the task row to return, its version is read from the loaded row */
  public async devolverTarefa(id: string): Promise<void> {
    if (this.devolverTarefaStatus === 'loading') return;
    const rawReason = this.devolverTarefaDraft.details.motivoDevolucao;
    const motivoDevolucao = rawReason === null ? '' : rawReason.trim();
    if (motivoDevolucao === '') {
      this.publish('devolverTarefaError', { code: 'client.requiredMissing', message: '', details: { stateKeys: ['devolverTarefaDraft.details.motivoDevolucao'] } });
      this.publish('devolverTarefaStatus', 'error');
      return;
    }
    await this.runCommand('devolverTarefa', id, (version, signal) => {
      const input: Input<'tarefas.inicio.devolverTarefa'> = { id, version, details: { motivoDevolucao } };
      return execBff<Output<'tarefas.inicio.devolverTarefa'>>('tarefas.inicio.devolverTarefa', input, { mode: 'blocking', signal });
    });
  }

  /** request retomarTarefa — resumes a returned task the session person is assignee of, to continue the work; redraws pendencias (upsert the returned task by id) and indicadores (replace); argument id: the task row to resume, its version is read from the loaded row */
  public async retomarTarefa(id: string): Promise<void> {
    await this.runCommand('retomarTarefa', id, (version, signal) => {
      const input: Input<'tarefas.inicio.retomarTarefa'> = { id, version };
      return execBff<Output<'tarefas.inicio.retomarTarefa'>>('tarefas.inicio.retomarTarefa', input, { mode: 'blocking', signal });
    });
  }

  /** navigate — opens a pending task in Minhas tarefas (minhas_tarefas); argument tarefaId: id of the picked task, carried into the tarefaId param; null is refused with client.preconditionMissing */
  public abrirTarefa(tarefaId: string | null): void {
    if (tarefaId === null || tarefaId === '') {
      this.publish('carregarInicioError', { code: 'client.preconditionMissing', message: '', details: { params: ['tarefaId'] } });
      return;
    }
    auraNavigate(`/tarefas/minhas_tarefas?tarefaId=${encodeURIComponent(tarefaId)}`, { basePath: '/tarefas' });
  }

  /** navigate — opens a task due today or late, from the alerts, in Minhas tarefas (minhas_tarefas); argument tarefaId: id of the picked alert task, carried into the tarefaId param; null is refused with client.preconditionMissing */
  public abrirTarefaVencendo(tarefaId: string | null): void {
    if (tarefaId === null || tarefaId === '') {
      this.publish('carregarInicioError', { code: 'client.preconditionMissing', message: '', details: { params: ['tarefaId'] } });
      return;
    }
    auraNavigate(`/tarefas/minhas_tarefas?tarefaId=${encodeURIComponent(tarefaId)}`, { basePath: '/tarefas' });
  }

  /** navigate — opens Minhas tarefas (minhas_tarefas) from the counters; carries nothing */
  public verMinhasTarefas(): void {
    auraNavigate('/tarefas/minhas_tarefas', { basePath: '/tarefas' });
  }
}
