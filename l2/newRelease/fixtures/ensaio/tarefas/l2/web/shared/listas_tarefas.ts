/// <mls fileReference="_102047_/l2/tarefas/web/shared/listas_tarefas.ts" enhancement="_102020_/l2/enhancementAura"/>
import { property } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { execBff } from '/_102029_/l2/bffClient.js';
import { getState, setState, subscribe, unsubscribe } from '/_102029_/l2/collabState.js';
import { runBlockingUiAction } from '/_102029_/l2/interactionRuntime.js';
import type { Listas_tarefasContracts, ListaTarefas } from '/_102047_/l2/tarefas/web/contracts/listas_tarefas.defs.js';

export type { Listas_tarefasContracts, ListaTarefas, ListaTarefasDetails } from '/_102047_/l2/tarefas/web/contracts/listas_tarefas.defs.js';

type Input<R extends keyof Listas_tarefasContracts> = Listas_tarefasContracts[R]['input'];
type Output<R extends keyof Listas_tarefasContracts> = Listas_tarefasContracts[R]['output'];

export type ErrorState = { code: string; message: string; details?: unknown } | null;

type ListasPage = Output<'tarefas.listas_tarefas.qryListasTarefas'>['listas'];

/** Draft of the new list form (cmdCriarLista input); every leaf may be null while empty. */
export type CmdCriarListaDraft = {
  nome: string | null;
  details: { descricao: string | null };
};

/** Draft of the edit list form (cmdSalvarLista input); filled from the selected list. */
export type CmdSalvarListaDraft = {
  id: string | null;
  version: number | null;
  nome: string | null;
  details: { descricao: string | null };
};

function emptyCriarDraft(): CmdCriarListaDraft {
  return { nome: null, details: { descricao: null } };
}

function emptySalvarDraft(): CmdSalvarListaDraft {
  return { id: null, version: null, nome: null, details: { descricao: null } };
}

function draftFromLista(lista: ListaTarefas): CmdSalvarListaDraft {
  return {
    id: lista.id,
    version: lista.version,
    nome: lista.nome,
    details: { descricao: lista.details.descricao ?? null },
  };
}

type StateMember =
  | 'listas'
  | 'texto'
  | 'selectedListaTarefas'
  | 'cmdCriarListaDraft'
  | 'cmdSalvarListaDraft'
  | 'pageStatus'
  | 'qryListasTarefasStatus'
  | 'qryListasTarefasError'
  | 'cmdCriarListaStatus'
  | 'cmdCriarListaError'
  | 'cmdSalvarListaStatus'
  | 'cmdSalvarListaError'
  | 'scenary';

const STATE_MEMBER_BY_KEY: Record<string, StateMember> = {
  'ui.tarefas.listas_tarefas.listas': 'listas',
  'ui.tarefas.listas_tarefas.texto': 'texto',
  'ui.tarefas.listas_tarefas.selectedListaTarefas': 'selectedListaTarefas',
  'ui.tarefas.listas_tarefas.cmdCriarListaDraft': 'cmdCriarListaDraft',
  'ui.tarefas.listas_tarefas.cmdSalvarListaDraft': 'cmdSalvarListaDraft',
  'ui.tarefas.listas_tarefas.pageStatus': 'pageStatus',
  'ui.tarefas.listas_tarefas.qryListasTarefasStatus': 'qryListasTarefasStatus',
  'ui.tarefas.listas_tarefas.qryListasTarefasError': 'qryListasTarefasError',
  'ui.tarefas.listas_tarefas.cmdCriarListaStatus': 'cmdCriarListaStatus',
  'ui.tarefas.listas_tarefas.cmdCriarListaError': 'cmdCriarListaError',
  'ui.tarefas.listas_tarefas.cmdSalvarListaStatus': 'cmdSalvarListaStatus',
  'ui.tarefas.listas_tarefas.cmdSalvarListaError': 'cmdSalvarListaError',
  'ui.tarefas.listas_tarefas.scenary': 'scenary',
};
const STATE_KEYS = Object.keys(STATE_MEMBER_BY_KEY);

const PAGE_PATH = '/tarefas/listas_tarefas';
const PAGE_SIZE = 50;

export class TarefasListas_tarefasShared extends StateLitElement {
  /** state listas — the lists of tasks (name, description and open task count), one page { items, page, pageSize, hasMore }; source qryListasTarefas.listas; organisms formularioLista, listasCadastradas */
  @property({ attribute: false }) listas: ListasPage | null = null;

  /** state texto — the name search text that filters the lists (null when no search); source entry.params.texto; organism listasCadastradas; persisted */
  @property({ attribute: false }) texto: string | null = null;

  /** state selectedListaTarefas — the id of the ListaTarefas selected in listasCadastradas (null when none); read the record through the getter formularioLista; source entry.params.listaTarefasId; organisms formularioLista, listasCadastradas */
  @property({ attribute: false }) selectedListaTarefas: string | null = null;

  /** state cmdCriarListaDraft — draft of the form that creates a list (nome, details.descricao); source cmdCriarLista.input; organism formularioLista */
  @property({ attribute: false }) cmdCriarListaDraft: CmdCriarListaDraft = emptyCriarDraft();

  /** state cmdSalvarListaDraft — draft of the form that edits the selected list (id, version, nome, details.descricao), filled from the selected list; source cmdSalvarLista.input; organism formularioLista */
  @property({ attribute: false }) cmdSalvarListaDraft: CmdSalvarListaDraft = emptySalvarDraft();

  /** state pageStatus — overall status of the page load: idle, loading, empty (no list), success or error; source page */
  @property({ attribute: false }) pageStatus: 'idle' | 'loading' | 'empty' | 'success' | 'error' = 'idle';

  /** state qryListasTarefasStatus — status of the lists query; source qryListasTarefas */
  @property({ attribute: false }) qryListasTarefasStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';

  /** state qryListasTarefasError — error of the lists query (also client.selectionInvalid), null when none; source qryListasTarefas */
  @property({ attribute: false }) qryListasTarefasError: ErrorState = null;

  /** state cmdCriarListaStatus — status of the create list command; source cmdCriarLista */
  @property({ attribute: false }) cmdCriarListaStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';

  /** state cmdCriarListaError — error of the create list command, null when none; source cmdCriarLista */
  @property({ attribute: false }) cmdCriarListaError: ErrorState = null;

  /** state cmdSalvarListaStatus — status of the save list command; source cmdSalvarLista */
  @property({ attribute: false }) cmdSalvarListaStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';

  /** state cmdSalvarListaError — error of the save list command, null when none; source cmdSalvarLista */
  @property({ attribute: false }) cmdSalvarListaError: ErrorState = null;

  /** state scenary — the visible scene of the page; '' until the page shows its first scene */
  @property({ attribute: false }) scenary = '';

  private selectionPending = false;

  private readonly onPopState = (): void => {
    if (!window.location.pathname.endsWith(PAGE_PATH)) return;
    this.resetVisit();
    this.applyEntryParams();
    void this.qryListasTarefas();
  };

  private publish<M extends StateMember>(member: M, value: this[M]): void {
    (this as unknown as Record<string, unknown>)[member] = value;
    setState(`ui.tarefas.listas_tarefas.${member}`, value);
    if (member === 'texto') {
      try {
        if (value === null || value === '') {
          localStorage.removeItem('tarefas.listas_tarefas.texto');
        } else {
          localStorage.setItem('tarefas.listas_tarefas.texto', String(value));
        }
      } catch {
        // storage unavailable: the value stays in memory only
      }
    }
    if (member === 'selectedListaTarefas') {
      try {
        const url = new URL(window.location.href);
        if (value === null) {
          url.searchParams.delete('listaTarefasId');
        } else {
          url.searchParams.set('listaTarefasId', String(value));
        }
        window.history.replaceState(window.history.state, '', url.toString());
      } catch {
        // URL not writable: the value stays in memory only
      }
    }
  }

  private assignState(key: string, value: unknown): void {
    const member = STATE_MEMBER_BY_KEY[key];
    if (member) (this as unknown as Record<string, unknown>)[member] = value;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    const stored = getState('ui.tarefas.listas_tarefas.listas');
    if (stored !== undefined) this.assignState('ui.tarefas.listas_tarefas.listas', stored);
    this.resetVisit();
    subscribe([...STATE_KEYS], this);
    window.addEventListener('popstate', this.onPopState);
    this.applyEntryParams();
    void this.qryListasTarefas();
  }

  public disconnectedCallback(): void {
    window.removeEventListener('popstate', this.onPopState);
    unsubscribe([...STATE_KEYS], this);
    super.disconnectedCallback();
  }

  public handleIcaStateChange(key: string, value: any): void {
    if (!STATE_KEYS.includes(key)) {
      super.handleIcaStateChange(key, value);
      return;
    }
    if (value === undefined) return;
    this.assignState(key, value);
    this.requestUpdate();
  }

  private resetVisit(): void {
    this.selectionPending = false;
    this.publish('pageStatus', 'idle');
    this.publish('qryListasTarefasStatus', 'idle');
    this.publish('qryListasTarefasError', null);
    this.publish('cmdCriarListaStatus', 'idle');
    this.publish('cmdCriarListaError', null);
    this.publish('cmdSalvarListaStatus', 'idle');
    this.publish('cmdSalvarListaError', null);
    this.publish('scenary', '');
    this.publish('cmdCriarListaDraft', emptyCriarDraft());
    this.publish('cmdSalvarListaDraft', emptySalvarDraft());
  }

  private resetCommandResults(): void {
    this.publish('cmdCriarListaStatus', 'idle');
    this.publish('cmdCriarListaError', null);
    this.publish('cmdSalvarListaStatus', 'idle');
    this.publish('cmdSalvarListaError', null);
  }

  private readParam(name: string, useStorage: boolean): string | null {
    const raw = new URLSearchParams(window.location.search).get(name);
    if (raw !== null && raw !== '') return raw;
    if (useStorage) {
      try {
        const stored = localStorage.getItem(`tarefas.listas_tarefas.${name}`);
        if (stored !== null && stored !== '') return stored;
      } catch {
        // storage unavailable
      }
    }
    return null;
  }

  private applyEntryParams(): void {
    this.publish('texto', this.readParam('texto', true));
    const id = this.readParam('listaTarefasId', false);
    this.publish('selectedListaTarefas', id);
    this.selectionPending = id !== null;
  }

  private findLista(id: string): ListaTarefas | null {
    const page = this.listas;
    if (!page) return null;
    const row = page.items.find(item => item.id === id);
    return row ?? null;
  }

  private unexpectedError(error: unknown): ErrorState {
    const name = error instanceof Error ? error.name : 'unknown';
    return { code: 'client.unexpected', message: '', details: { name } };
  }

  private upsertLista(lista: ListaTarefas): void {
    const page = this.listas;
    if (!page) {
      this.publish('listas', { items: [lista], page: 1, pageSize: PAGE_SIZE, hasMore: false });
      return;
    }
    const exists = page.items.some(item => item.id === lista.id);
    const items = exists
      ? page.items.map(item => (item.id === lista.id ? lista : item))
      : [...page.items, lista];
    this.publish('listas', { ...page, items });
  }

  private resolveSelection(): void {
    this.selectionPending = false;
    const id = this.selectedListaTarefas;
    if (id === null) return;
    const row = this.findLista(id);
    if (!row) {
      this.publish('selectedListaTarefas', null);
      this.publish('qryListasTarefasError', { code: 'client.selectionInvalid', message: '', details: { id } });
      return;
    }
    this.publish('cmdSalvarListaDraft', draftFromLista(row));
  }

  /** The selected ListaTarefas record (the row of the loaded lists whose id is selectedListaTarefas), or null; feeds formularioLista */
  public get formularioLista(): ListaTarefas | null {
    const id = this.selectedListaTarefas;
    if (id === null) return null;
    return this.findLista(id);
  }

  /** scene — publishes the visible scene of the page (scenary); clears old command results */
  public setScenario(value: string): void {
    this.resetCommandResults();
    this.publish('scenary', value);
  }

  /** draft — replaces the draft of the create list form (cmdCriarListaDraft); clears old command results */
  public setCmdCriarListaDraft(value: CmdCriarListaDraft): void {
    this.resetCommandResults();
    this.publish('cmdCriarListaDraft', value);
  }

  /** draft — replaces the draft of the edit list form (cmdSalvarListaDraft); clears old command results */
  public setCmdSalvarListaDraft(value: CmdSalvarListaDraft): void {
    this.resetCommandResults();
    this.publish('cmdSalvarListaDraft', value);
  }

  /** select — selects the list with this id (or null to clear) in listasCadastradas; the record is read through the getter formularioLista and the edit draft is filled from it; an id that is not in the loaded lists publishes client.selectionInvalid in qryListasTarefasError. Argument: id of the list, or null */
  public selectListaTarefas(id: string | null): void {
    this.resetCommandResults();
    if (id === null) {
      this.publish('selectedListaTarefas', null);
      this.publish('cmdSalvarListaDraft', emptySalvarDraft());
      return;
    }
    const row = this.findLista(id);
    if (!row) {
      this.publish('qryListasTarefasError', { code: 'client.selectionInvalid', message: '', details: { id } });
      return;
    }
    this.publish('selectedListaTarefas', id);
    this.publish('cmdSalvarListaDraft', draftFromLista(row));
  }

  /** request qryListasTarefas — loads the lists of tasks ordered by name, searched by name, with the open task count of each; redraws listas (replace, or append the next page when append is true), texto when given; arguments: texto = new search text (omit to keep the current one; a new text loads from the first page; null or '' clears the search), page = page to load (default 1), append = true adds the page to the current items (load more) and does nothing when there is no more */
  public async qryListasTarefas(texto?: string | null, page = 1, append = false): Promise<void> {
    if (this.qryListasTarefasStatus === 'loading') return;
    let pageToLoad = page;
    let appendPage = append;
    if (texto !== undefined) {
      this.publish('texto', texto === null || texto === '' ? null : texto);
      pageToLoad = 1;
      appendPage = false;
    }
    const current = this.listas;
    if (appendPage && (!current || !current.hasMore)) return;
    this.publish('qryListasTarefasStatus', 'loading');
    this.publish('qryListasTarefasError', null);
    if (!appendPage) this.publish('pageStatus', 'loading');
    const currentTexto = this.texto;
    const input: Input<'tarefas.listas_tarefas.qryListasTarefas'> = {
      ...(currentTexto !== null && currentTexto !== '' ? { texto: currentTexto } : {}),
      page: pageToLoad,
      pageSize: PAGE_SIZE,
    };
    try {
      const response = await execBff<Output<'tarefas.listas_tarefas.qryListasTarefas'>>(
        'tarefas.listas_tarefas.qryListasTarefas',
        input,
        { mode: 'silent' },
      );
      if (!response.ok || !response.data) {
        this.publish('qryListasTarefasError', response.error ?? this.unexpectedError(null));
        this.publish('qryListasTarefasStatus', 'error');
        if (!appendPage) this.publish('pageStatus', 'error');
        return;
      }
      const incoming = response.data.listas;
      const base = this.listas;
      const next: ListasPage = appendPage && base
        ? { ...incoming, items: [...base.items, ...incoming.items] }
        : incoming;
      this.publish('listas', next);
      this.publish('qryListasTarefasStatus', 'success');
      this.publish('pageStatus', next.items.length === 0 ? 'empty' : 'success');
      if (this.selectionPending) this.resolveSelection();
    } catch (error) {
      this.publish('qryListasTarefasError', this.unexpectedError(error));
      this.publish('qryListasTarefasStatus', 'error');
      this.publish('pageStatus', 'error');
    }
  }

  /** request cmdCriarLista — creates a list of tasks from cmdCriarListaDraft (nome required, details.descricao optional); redraws listas (upsert of the returned list by id, appended when new) and clears cmdCriarListaDraft; no arguments; a missing nome publishes client.requiredMissing in cmdCriarListaError */
  public async cmdCriarLista(): Promise<void> {
    if (this.cmdCriarListaStatus === 'loading') return;
    const draft = this.cmdCriarListaDraft;
    const nome = draft.nome === null ? '' : draft.nome.trim();
    if (nome === '') {
      this.publish('cmdCriarListaError', { code: 'client.requiredMissing', message: '', details: { stateKeys: ['cmdCriarListaDraft.nome'] } });
      this.publish('cmdCriarListaStatus', 'error');
      return;
    }
    const descricao = draft.details.descricao;
    const input: Input<'tarefas.listas_tarefas.cmdCriarLista'> = {
      nome,
      details: { ...(descricao !== null && descricao !== '' ? { descricao } : {}) },
    };
    this.publish('cmdCriarListaStatus', 'loading');
    this.publish('cmdCriarListaError', null);
    try {
      const response = await runBlockingUiAction(signal =>
        execBff<Output<'tarefas.listas_tarefas.cmdCriarLista'>>(
          'tarefas.listas_tarefas.cmdCriarLista',
          input,
          { mode: 'blocking', signal },
        ),
      );
      if (response === undefined) {
        this.publish('cmdCriarListaError', { code: 'client.unexpected', message: '', details: { name: 'aborted' } });
        this.publish('cmdCriarListaStatus', 'error');
        return;
      }
      if (!response.ok || !response.data) {
        this.publish('cmdCriarListaError', response.error ?? this.unexpectedError(null));
        this.publish('cmdCriarListaStatus', 'error');
        return;
      }
      this.upsertLista(response.data.lista);
      this.publish('cmdCriarListaDraft', emptyCriarDraft());
      this.publish('cmdCriarListaStatus', 'success');
    } catch (error) {
      this.publish('cmdCriarListaError', this.unexpectedError(error));
      this.publish('cmdCriarListaStatus', 'error');
    }
  }

  /** request cmdSalvarLista — saves the name and description of the selected list from cmdSalvarListaDraft (id, version, nome required); redraws listas (upsert of the returned list by id, so formularioLista follows) and refills cmdSalvarListaDraft from the returned list with the new version; no arguments; missing id, version or nome publishes client.requiredMissing in cmdSalvarListaError */
  public async cmdSalvarLista(): Promise<void> {
    if (this.cmdSalvarListaStatus === 'loading') return;
    const draft = this.cmdSalvarListaDraft;
    const nome = draft.nome === null ? '' : draft.nome.trim();
    const missing: string[] = [];
    if (draft.id === null) missing.push('cmdSalvarListaDraft.id');
    if (draft.version === null) missing.push('cmdSalvarListaDraft.version');
    if (nome === '') missing.push('cmdSalvarListaDraft.nome');
    if (missing.length > 0 || draft.id === null || draft.version === null) {
      this.publish('cmdSalvarListaError', { code: 'client.requiredMissing', message: '', details: { stateKeys: missing } });
      this.publish('cmdSalvarListaStatus', 'error');
      return;
    }
    const descricao = draft.details.descricao;
    const input: Input<'tarefas.listas_tarefas.cmdSalvarLista'> = {
      id: draft.id,
      version: draft.version,
      nome,
      details: { ...(descricao !== null && descricao !== '' ? { descricao } : {}) },
    };
    this.publish('cmdSalvarListaStatus', 'loading');
    this.publish('cmdSalvarListaError', null);
    try {
      const response = await runBlockingUiAction(signal =>
        execBff<Output<'tarefas.listas_tarefas.cmdSalvarLista'>>(
          'tarefas.listas_tarefas.cmdSalvarLista',
          input,
          { mode: 'blocking', signal },
        ),
      );
      if (response === undefined) {
        this.publish('cmdSalvarListaError', { code: 'client.unexpected', message: '', details: { name: 'aborted' } });
        this.publish('cmdSalvarListaStatus', 'error');
        return;
      }
      if (!response.ok || !response.data) {
        this.publish('cmdSalvarListaError', response.error ?? this.unexpectedError(null));
        this.publish('cmdSalvarListaStatus', 'error');
        return;
      }
      const lista = response.data.lista;
      this.upsertLista(lista);
      this.publish('cmdSalvarListaDraft', draftFromLista(lista));
      this.publish('cmdSalvarListaStatus', 'success');
    } catch (error) {
      this.publish('cmdSalvarListaError', this.unexpectedError(error));
      this.publish('cmdSalvarListaStatus', 'error');
    }
  }
}
