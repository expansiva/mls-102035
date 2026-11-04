/// <mls fileReference="_102047_/l2/tarefas/web/shared/painel_tarefas.ts" enhancement="_102020_/l2/enhancementAura"/>
import { property } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { execBff } from '/_102029_/l2/bffClient.js';
import { getState, setState, subscribe, unsubscribe } from '/_102029_/l2/collabState.js';
import { auraNavigate } from '/_102033_/l2/shared/layout/auraNavigate.js';
import type { Painel_tarefasContracts, IndicadoresTarefas, ResumoLista, ResumoTarefaLista } from '/_102047_/l2/tarefas/web/contracts/painel_tarefas.defs.js';

export type { Painel_tarefasContracts, IndicadoresTarefas, ResumoLista, ResumoTarefaLista } from '/_102047_/l2/tarefas/web/contracts/painel_tarefas.defs.js';

export type ErrorState = { code: string; message: string; details?: unknown } | null;

type Input<R extends keyof Painel_tarefasContracts> = Painel_tarefasContracts[R]['input'];
type Output<R extends keyof Painel_tarefasContracts> = Painel_tarefasContracts[R]['output'];

type CarregarRoute = 'tarefas.painel_tarefas.carregarPainelTarefas';

// every state and status member, and nothing else
type StateMember = 'indicadores' | 'listas' | 'pageStatus' | 'carregarPainelTarefasStatus' | 'carregarPainelTarefasError' | 'scenary';

const STATE_MEMBER_BY_KEY: Record<string, StateMember> = {
  'ui.tarefas.painel_tarefas.indicadores': 'indicadores',
  'ui.tarefas.painel_tarefas.listas': 'listas',
  'ui.tarefas.painel_tarefas.pageStatus': 'pageStatus',
  'ui.tarefas.painel_tarefas.carregarPainelTarefasStatus': 'carregarPainelTarefasStatus',
  'ui.tarefas.painel_tarefas.carregarPainelTarefasError': 'carregarPainelTarefasError',
  'ui.tarefas.painel_tarefas.scenary': 'scenary',
};
const STATE_KEYS = Object.keys(STATE_MEMBER_BY_KEY);

export class TarefasPainel_tarefasShared extends StateLitElement {
  /** state indicadores — the four general counts of the organization's tasks (open, due today, overdue, returned awaiting resume); source carregarPainelTarefas.indicadores; organism indicadoresTarefas */
  @property({ attribute: false }) indicadores: IndicadoresTarefas | null = null;

  /** state listas — the task lists (project or area) with open task count, checklist items done and total, and the open tasks that have a checklist; source carregarPainelTarefas.listas; organism tarefasPorLista */
  @property({ attribute: false }) listas: ResumoLista[] = [];

  /** state pageStatus — overall status of the page: idle, loading, empty (no list loaded), success or error */
  @property({ attribute: false }) pageStatus: 'idle' | 'loading' | 'empty' | 'success' | 'error' = 'idle';

  /** state carregarPainelTarefasStatus — status of the request carregarPainelTarefas */
  @property({ attribute: false }) carregarPainelTarefasStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';

  /** state carregarPainelTarefasError — error of the request carregarPainelTarefas, null when none */
  @property({ attribute: false }) carregarPainelTarefasError: ErrorState = null;

  /** state scenary — the visible scene of the page; '' until the page shows its first scene */
  @property({ attribute: false }) scenary = '';

  private popstateHandler = (): void => {
    const path = window.location.pathname;
    if (path.endsWith('/tarefas/painel_tarefas')) {
      this.resetVisit();
      this.applyEntryParams();
      void this.carregarPainelTarefas();
    }
  };

  private publish<M extends StateMember>(member: M, value: this[M]): void {
    (this as unknown as Record<string, unknown>)[member] = value;
    setState(`ui.tarefas.painel_tarefas.${member}`, value);
  }

  private assignState(key: string, value: unknown): void {
    const member = STATE_MEMBER_BY_KEY[key];
    if (member) (this as unknown as Record<string, unknown>)[member] = value;
  }

  private hydrateData(): void {
    const indicadores = getState('ui.tarefas.painel_tarefas.indicadores');
    if (indicadores !== undefined) this.assignState('ui.tarefas.painel_tarefas.indicadores', indicadores);
    const listas = getState('ui.tarefas.painel_tarefas.listas');
    if (listas !== undefined) this.assignState('ui.tarefas.painel_tarefas.listas', listas);
  }

  private resetVisit(): void {
    this.publish('pageStatus', 'idle');
    this.publish('carregarPainelTarefasStatus', 'idle');
    this.publish('carregarPainelTarefasError', null);
    this.publish('scenary', '');
  }

  /** The page has no entry params; kept so every visit follows the same sequence. */
  private applyEntryParams(): void {
    return;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this.hydrateData();
    this.resetVisit();
    subscribe([...STATE_KEYS], this);
    window.addEventListener('popstate', this.popstateHandler);
    this.applyEntryParams();
    void this.carregarPainelTarefas();
  }

  public disconnectedCallback(): void {
    window.removeEventListener('popstate', this.popstateHandler);
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

  /** setScenario — publishes the visible scene of the page; argument value is the scene id ('' clears it) */
  public setScenario(value: string): void {
    this.publish('scenary', value);
  }

  /** request carregarPainelTarefas — loads the manager panel in one call (general indicators and open tasks per list with checklist progress); redraws indicadores and listas (replace) and pageStatus; no arguments, also used to reload the panel */
  public async carregarPainelTarefas(): Promise<void> {
    if (this.carregarPainelTarefasStatus === 'loading') return;
    this.publish('carregarPainelTarefasStatus', 'loading');
    this.publish('carregarPainelTarefasError', null);
    this.publish('pageStatus', 'loading');
    try {
      const input: Input<CarregarRoute> = {};
      const response = await execBff<Output<CarregarRoute>>('tarefas.painel_tarefas.carregarPainelTarefas', input, { mode: 'silent' });
      if (!response.ok || !response.data) {
        const error: ErrorState = response.error ?? { code: 'client.unexpected', message: '', details: { name: 'emptyResponse' } };
        this.publish('carregarPainelTarefasError', error);
        this.publish('carregarPainelTarefasStatus', 'error');
        this.publish('pageStatus', 'error');
        return;
      }
      const listas = [...response.data.listas];
      this.publish('indicadores', response.data.indicadores);
      this.publish('listas', listas);
      this.publish('carregarPainelTarefasStatus', 'success');
      this.publish('pageStatus', listas.length === 0 ? 'empty' : 'success');
    } catch (err) {
      const name = err instanceof Error ? err.name : 'unknown';
      this.publish('carregarPainelTarefasError', { code: 'client.unexpected', message: '', details: { name } });
      this.publish('carregarPainelTarefasStatus', 'error');
      this.publish('pageStatus', 'error');
    }
  }

  /** navigate — opens the team tasks page (tarefas_equipe) showing all tasks; carries nothing */
  public verTodasTarefas(): void {
    auraNavigate('/tarefas/tarefas_equipe', { basePath: '/tarefas' });
  }

  /** navigate — opens the task lists page (listas_tarefas); optional listaId is the list to highlight there (listaTarefasId), omitted when null */
  public abrirListas(listaId: string | null = null): void {
    if (listaId !== null && listaId !== '') {
      auraNavigate(`/tarefas/listas_tarefas?listaTarefasId=${encodeURIComponent(listaId)}`, { basePath: '/tarefas' });
      return;
    }
    auraNavigate('/tarefas/listas_tarefas', { basePath: '/tarefas' });
  }

  /** navigate — opens the team tasks page (tarefas_equipe) filtered by one list; listaId is the id of the list row the person picked (carried as listaTarefasId); null is refused with client.preconditionMissing */
  public verTarefasDaLista(listaId: string | null): void {
    if (listaId === null || listaId === '') {
      this.publish('carregarPainelTarefasError', { code: 'client.preconditionMissing', message: '', details: { params: ['listaTarefasId'] } });
      return;
    }
    auraNavigate(`/tarefas/tarefas_equipe?listaTarefasId=${encodeURIComponent(listaId)}`, { basePath: '/tarefas' });
  }
}
