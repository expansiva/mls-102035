/// <mls fileReference="_102047_/l2/tarefas/web/shared/participantes.ts" enhancement="_102020_/l2/enhancementAura"/>
import { property } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { execBff } from '/_102029_/l2/bffClient.js';
import { getState, setState, subscribe, unsubscribe } from '/_102029_/l2/collabState.js';
import { runBlockingUiAction } from '/_102029_/l2/interactionRuntime.js';
import type { ParticipantesContracts, ParticipanteModulo, UsuarioOrganizacao } from '/_102047_/l2/tarefas/web/contracts/participantes.defs.js';

export type { ParticipantesContracts, ParticipanteModulo, UsuarioOrganizacao } from '/_102047_/l2/tarefas/web/contracts/participantes.defs.js';

type Input<R extends keyof ParticipantesContracts> = ParticipantesContracts[R]['input'];
type Output<R extends keyof ParticipantesContracts> = ParticipantesContracts[R]['output'];

export type ErrorState = { code: string; message: string; details?: unknown } | null;

type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

type ParticipantesPage = Output<'tarefas.participantes.listarParticipantes'>['participantes'];

/** Draft of the command incluirParticipante: the user chosen in the search and the optional manager flags (null = not informed). */
export type IncluirParticipanteDraft = {
  id: string | null;
  details: {
    tarefas: {
      aceitaTarefas: boolean | null;
      podeCriarTarefas: boolean | null;
    };
  };
};

/** Draft of the command salvarMarcas: the participant being edited, its read version and the two flags. */
export type SalvarMarcasDraft = {
  id: string | null;
  version: number | null;
  details: {
    tarefas: {
      aceitaTarefas: boolean | null;
      podeCriarTarefas: boolean | null;
    };
  };
};

function emptyIncluirParticipanteDraft(): IncluirParticipanteDraft {
  return { id: null, details: { tarefas: { aceitaTarefas: null, podeCriarTarefas: null } } };
}

function emptySalvarMarcasDraft(): SalvarMarcasDraft {
  return { id: null, version: null, details: { tarefas: { aceitaTarefas: null, podeCriarTarefas: null } } };
}

function draftFromParticipante(participante: ParticipanteModulo): SalvarMarcasDraft {
  const tarefas = participante.details.tarefas;
  return {
    id: participante.id,
    version: participante.version,
    details: {
      tarefas: {
        aceitaTarefas: tarefas.aceitaTarefas ?? tarefas.aceitaTarefasEfetivo,
        podeCriarTarefas: tarefas.podeCriarTarefas ?? tarefas.podeCriarTarefasEfetivo,
      },
    },
  };
}

type StateMember =
  | 'participantes'
  | 'usuarios'
  | 'selectedParticipante'
  | 'busca'
  | 'incluirParticipanteDraft'
  | 'salvarMarcasDraft'
  | 'pageStatus'
  | 'listarParticipantesStatus'
  | 'listarParticipantesError'
  | 'buscarUsuariosStatus'
  | 'buscarUsuariosError'
  | 'incluirParticipanteStatus'
  | 'incluirParticipanteError'
  | 'salvarMarcasStatus'
  | 'salvarMarcasError'
  | 'scenary';

const STATE_MEMBER_BY_KEY: Record<string, StateMember> = {
  'ui.tarefas.participantes.participantes': 'participantes',
  'ui.tarefas.participantes.usuarios': 'usuarios',
  'ui.tarefas.participantes.selectedParticipante': 'selectedParticipante',
  'ui.tarefas.participantes.busca': 'busca',
  'ui.tarefas.participantes.incluirParticipanteDraft': 'incluirParticipanteDraft',
  'ui.tarefas.participantes.salvarMarcasDraft': 'salvarMarcasDraft',
  'ui.tarefas.participantes.pageStatus': 'pageStatus',
  'ui.tarefas.participantes.listarParticipantesStatus': 'listarParticipantesStatus',
  'ui.tarefas.participantes.listarParticipantesError': 'listarParticipantesError',
  'ui.tarefas.participantes.buscarUsuariosStatus': 'buscarUsuariosStatus',
  'ui.tarefas.participantes.buscarUsuariosError': 'buscarUsuariosError',
  'ui.tarefas.participantes.incluirParticipanteStatus': 'incluirParticipanteStatus',
  'ui.tarefas.participantes.incluirParticipanteError': 'incluirParticipanteError',
  'ui.tarefas.participantes.salvarMarcasStatus': 'salvarMarcasStatus',
  'ui.tarefas.participantes.salvarMarcasError': 'salvarMarcasError',
  'ui.tarefas.participantes.scenary': 'scenary',
};

const STATE_KEYS = Object.keys(STATE_MEMBER_BY_KEY);

const PAGE_SIZE = 50;
const BUSCA_STORAGE_KEY = 'tarefas.participantes.busca';
const PAGE_PATH = '/tarefas/participantes';

function unexpectedError(error: unknown): ErrorState {
  const name = error instanceof Error ? error.name : 'unknown';
  return { code: 'client.unexpected', message: '', details: { name } };
}

export class TarefasParticipantesShared extends StateLitElement {
  /** state participantes — the page of participants of the tarefas module (name, status, roles, manager flags and effective flags); source listarParticipantes.participantes; organism listaParticipantes */
  @property({ attribute: false }) participantes: ParticipantesPage | null = null;

  /** state usuarios — short list of active organization users that do not participate yet, found by name; source buscarUsuarios.usuarios; organism formParticipante */
  @property({ attribute: false }) usuarios: UsuarioOrganizacao[] = [];

  /** state selectedParticipante — the id of the Participante selected in listaParticipantes (the record is the getter formParticipante); source entry.params.participanteId; organism formParticipante, listaParticipantes */
  @property({ attribute: false }) selectedParticipante: string | null = null;

  /** state busca — the name filter of the participants list (null = no filter); source entry.params.busca; organism listaParticipantes; persisted */
  @property({ attribute: false }) busca: string | null = null;

  /** state incluirParticipanteDraft — form draft of the command incluirParticipante: the chosen user id and the optional manager flags; source incluirParticipante.input; organism formParticipante */
  @property({ attribute: false }) incluirParticipanteDraft: IncluirParticipanteDraft = emptyIncluirParticipanteDraft();

  /** state salvarMarcasDraft — form draft of the command salvarMarcas: the selected participant, its version and the two flags; source salvarMarcas.input; organism formParticipante */
  @property({ attribute: false }) salvarMarcasDraft: SalvarMarcasDraft = emptySalvarMarcasDraft();

  /** state pageStatus — overall state of the page: idle, loading, empty (no participant), success or error */
  @property({ attribute: false }) pageStatus: 'idle' | 'loading' | 'empty' | 'success' | 'error' = 'idle';

  /** state listarParticipantesStatus — status of the request listarParticipantes */
  @property({ attribute: false }) listarParticipantesStatus: RequestStatus = 'idle';

  /** state listarParticipantesError — error of the request listarParticipantes (also client.selectionInvalid when the selected id is not in the list) */
  @property({ attribute: false }) listarParticipantesError: ErrorState = null;

  /** state buscarUsuariosStatus — status of the request buscarUsuarios */
  @property({ attribute: false }) buscarUsuariosStatus: RequestStatus = 'idle';

  /** state buscarUsuariosError — error of the request buscarUsuarios */
  @property({ attribute: false }) buscarUsuariosError: ErrorState = null;

  /** state incluirParticipanteStatus — status of the command incluirParticipante */
  @property({ attribute: false }) incluirParticipanteStatus: RequestStatus = 'idle';

  /** state incluirParticipanteError — error of the command incluirParticipante */
  @property({ attribute: false }) incluirParticipanteError: ErrorState = null;

  /** state salvarMarcasStatus — status of the command salvarMarcas */
  @property({ attribute: false }) salvarMarcasStatus: RequestStatus = 'idle';

  /** state salvarMarcasError — error of the command salvarMarcas */
  @property({ attribute: false }) salvarMarcasError: ErrorState = null;

  /** state scenary — the visible scene of the page; '' until the page shows its first scene */
  @property({ attribute: false }) scenary = '';

  private selectionPending = false;

  private readonly onPopState = (): void => {
    if (!window.location.pathname.endsWith(PAGE_PATH)) return;
    this.resetVisit();
    this.beginVisit();
  };

  private publish<M extends StateMember>(member: M, value: this[M]): void {
    (this as unknown as Record<string, unknown>)[member] = value;
    setState(`ui.tarefas.participantes.${member}`, value);
    if (member === 'busca') {
      try {
        if (this.busca === null) {
          localStorage.removeItem(BUSCA_STORAGE_KEY);
        } else {
          localStorage.setItem(BUSCA_STORAGE_KEY, this.busca);
        }
      } catch {
        // storage unavailable: the value stays in memory only
      }
    }
    if (member === 'selectedParticipante') {
      try {
        const url = new URL(window.location.href);
        if (this.selectedParticipante === null) {
          url.searchParams.delete('participanteId');
        } else {
          url.searchParams.set('participanteId', this.selectedParticipante);
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
    this.hydrateData();
    this.resetVisit();
    subscribe([...STATE_KEYS], this);
    window.addEventListener('popstate', this.onPopState);
    this.beginVisit();
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
    const keys = ['ui.tarefas.participantes.participantes', 'ui.tarefas.participantes.usuarios'];
    for (const key of keys) {
      const stored = getState(key);
      if (stored !== undefined) this.assignState(key, stored);
    }
  }

  private resetVisit(): void {
    this.selectionPending = false;
    this.publish('pageStatus', 'idle');
    this.publish('listarParticipantesStatus', 'idle');
    this.publish('listarParticipantesError', null);
    this.publish('buscarUsuariosStatus', 'idle');
    this.publish('buscarUsuariosError', null);
    this.publish('incluirParticipanteStatus', 'idle');
    this.publish('incluirParticipanteError', null);
    this.publish('salvarMarcasStatus', 'idle');
    this.publish('salvarMarcasError', null);
    this.publish('incluirParticipanteDraft', emptyIncluirParticipanteDraft());
    this.publish('salvarMarcasDraft', emptySalvarMarcasDraft());
    this.publish('scenary', '');
  }

  private beginVisit(): void {
    this.applyEntryParams();
    void this.listarParticipantes();
  }

  private applyEntryParams(): void {
    const search = new URLSearchParams(window.location.search);
    let busca = search.get('busca');
    if (busca === null) {
      try {
        busca = localStorage.getItem(BUSCA_STORAGE_KEY);
      } catch {
        busca = null;
      }
    }
    const participanteId = search.get('participanteId');
    this.publish('busca', busca !== null && busca !== '' ? busca : null);
    this.publish('selectedParticipante', participanteId !== null && participanteId !== '' ? participanteId : null);
    this.selectionPending = participanteId !== null && participanteId !== '';
  }

  private resetCommandResults(): void {
    this.publish('incluirParticipanteStatus', 'idle');
    this.publish('incluirParticipanteError', null);
    this.publish('salvarMarcasStatus', 'idle');
    this.publish('salvarMarcasError', null);
  }

  /** Resolves the selected id into a row of the loaded list and fills the marks draft from it; an id no row resolves publishes client.selectionInvalid. */
  private resolveSelection(id: string | null): void {
    if (id === null) {
      this.publish('selectedParticipante', null);
      this.publish('salvarMarcasDraft', emptySalvarMarcasDraft());
      return;
    }
    const rows = this.participantes ? this.participantes.items : [];
    const row = rows.find((item) => item.id === id) ?? null;
    if (!row) {
      this.publish('selectedParticipante', null);
      this.publish('salvarMarcasDraft', emptySalvarMarcasDraft());
      this.publish('listarParticipantesError', { code: 'client.selectionInvalid', message: '', details: { id } });
      return;
    }
    this.publish('selectedParticipante', id);
    this.publish('salvarMarcasDraft', draftFromParticipante(row));
  }

  /** The Participante record selected in listaParticipantes: the row of the loaded list whose id is selectedParticipante, or null. */
  public get formParticipante(): ParticipanteModulo | null {
    const id = this.selectedParticipante;
    if (id === null || !this.participantes) return null;
    return this.participantes.items.find((item) => item.id === id) ?? null;
  }

  /** select — chooses the participant whose marks are edited in formParticipante (null clears the selection); fills salvarMarcasDraft from that row; an id that is not in the loaded list publishes client.selectionInvalid in listarParticipantesError. id: participant id or null. */
  public selectParticipante(id: string | null): void {
    this.resetCommandResults();
    this.resolveSelection(id);
  }

  /** draft — replaces the draft of the command incluirParticipante (chosen user id and optional flags); used by formParticipante when a user is picked or a flag is toggled. */
  public setIncluirParticipanteDraft(value: IncluirParticipanteDraft): void {
    this.resetCommandResults();
    this.publish('incluirParticipanteDraft', value);
  }

  /** draft — replaces the draft of the command salvarMarcas (participant id, version and the two flags); used by formParticipante when a flag is toggled. */
  public setSalvarMarcasDraft(value: SalvarMarcasDraft): void {
    this.resetCommandResults();
    this.publish('salvarMarcasDraft', value);
  }

  /** Publishes the visible scene of the page. value: scene id. */
  public setScenario(value: string): void {
    this.resetCommandResults();
    this.publish('scenary', value);
  }

  /** request listarParticipantes — lists the participants of the tarefas module, filtered by name and ordered by the backend; redraws participantes (replace; with append=true the next page is added to items and page/hasMore follow the answer), busca (when given) and pageStatus; also the method to reload, filter and page the list. busca: new name filter (omit to keep the current one, '' or null clears it); page: page to load, 1 by default; append: true for a "load more" (does nothing unless the loaded list has more). */
  public async listarParticipantes(busca?: string | null, page = 1, append = false): Promise<void> {
    if (this.listarParticipantesStatus === 'loading') return;
    if (append && !(this.participantes && this.participantes.hasMore)) return;
    if (busca !== undefined) {
      this.publish('busca', busca !== null && busca !== '' ? busca : null);
    }
    this.publish('listarParticipantesStatus', 'loading');
    this.publish('listarParticipantesError', null);
    if (!append) this.publish('pageStatus', 'loading');
    const currentBusca = this.busca;
    const input: Input<'tarefas.participantes.listarParticipantes'> = {
      ...(currentBusca !== null && currentBusca !== '' ? { busca: currentBusca } : {}),
      page,
      pageSize: PAGE_SIZE,
    };
    try {
      const response = await execBff<Output<'tarefas.participantes.listarParticipantes'>>('tarefas.participantes.listarParticipantes', input, { mode: 'silent' });
      if (!response.ok || !response.data) {
        this.publish('listarParticipantesError', response.error ?? unexpectedError(null));
        this.publish('listarParticipantesStatus', 'error');
        this.publish('pageStatus', 'error');
        return;
      }
      const loaded = response.data.participantes;
      const current = this.participantes;
      if (append && current) {
        this.publish('participantes', {
          items: [...current.items, ...loaded.items],
          page: loaded.page,
          pageSize: loaded.pageSize,
          hasMore: loaded.hasMore,
        });
      } else {
        this.publish('participantes', loaded);
      }
      this.publish('listarParticipantesStatus', 'success');
      if (this.selectionPending) {
        this.selectionPending = false;
        this.resolveSelection(this.selectedParticipante);
      }
      const total = this.participantes ? this.participantes.items.length : 0;
      this.publish('pageStatus', total === 0 ? 'empty' : 'success');
    } catch (error) {
      this.publish('listarParticipantesError', unexpectedError(error));
      this.publish('listarParticipantesStatus', 'error');
      this.publish('pageStatus', 'error');
    }
  }

  /** request buscarUsuarios — searches by name the active organization users that do not participate yet; redraws usuarios (replace). busca: part of the user name typed by the manager (required; empty publishes client.requiredMissing and does not call). */
  public async buscarUsuarios(busca: string): Promise<void> {
    if (this.buscarUsuariosStatus === 'loading') return;
    const text = busca.trim();
    if (text === '') {
      this.publish('buscarUsuariosError', { code: 'client.requiredMissing', message: '', details: { params: ['busca'] } });
      this.publish('buscarUsuariosStatus', 'error');
      return;
    }
    this.publish('buscarUsuariosStatus', 'loading');
    this.publish('buscarUsuariosError', null);
    const input: Input<'tarefas.participantes.buscarUsuarios'> = { busca: text };
    try {
      const response = await execBff<Output<'tarefas.participantes.buscarUsuarios'>>('tarefas.participantes.buscarUsuarios', input, { mode: 'silent' });
      if (!response.ok || !response.data) {
        this.publish('buscarUsuariosError', response.error ?? unexpectedError(null));
        this.publish('buscarUsuariosStatus', 'error');
        return;
      }
      this.publish('usuarios', response.data.usuarios);
      this.publish('buscarUsuariosStatus', 'success');
    } catch (error) {
      this.publish('buscarUsuariosError', unexpectedError(error));
      this.publish('buscarUsuariosStatus', 'error');
    }
  }

  /** Inserts or updates a participant row by id in the loaded list (new rows go first). */
  private upsertParticipante(participante: ParticipanteModulo): void {
    const current = this.participantes;
    if (!current) {
      this.publish('participantes', { items: [participante], page: 1, pageSize: PAGE_SIZE, hasMore: false });
      return;
    }
    const exists = current.items.some((item) => item.id === participante.id);
    const items = exists
      ? current.items.map((item) => (item.id === participante.id ? participante : item))
      : [participante, ...current.items];
    this.publish('participantes', { ...current, items });
  }

  /** request incluirParticipante — includes the user chosen in the search (incluirParticipanteDraft.id) as participant, with the optional manager flags of the draft; redraws participantes (upsert of the returned participant by id) and usuarios (remove the included user), then clears incluirParticipanteDraft. Takes no arguments: fill the draft first with setIncluirParticipanteDraft; an empty id publishes client.requiredMissing. */
  public async incluirParticipante(): Promise<void> {
    if (this.incluirParticipanteStatus === 'loading') return;
    const draft = this.incluirParticipanteDraft;
    const id = draft.id;
    if (id === null || id === '') {
      this.publish('incluirParticipanteError', { code: 'client.requiredMissing', message: '', details: { stateKeys: ['incluirParticipanteDraft.id'] } });
      this.publish('incluirParticipanteStatus', 'error');
      return;
    }
    const aceita = draft.details.tarefas.aceitaTarefas;
    const pode = draft.details.tarefas.podeCriarTarefas;
    const input: Input<'tarefas.participantes.incluirParticipante'> = {
      id,
      details: {
        tarefas: {
          ...(aceita !== null ? { aceitaTarefas: aceita } : {}),
          ...(pode !== null ? { podeCriarTarefas: pode } : {}),
        },
      },
    };
    this.publish('incluirParticipanteStatus', 'loading');
    this.publish('incluirParticipanteError', null);
    try {
      const response = await runBlockingUiAction((signal) =>
        execBff<Output<'tarefas.participantes.incluirParticipante'>>('tarefas.participantes.incluirParticipante', input, { mode: 'blocking', signal }),
      );
      if (!response) {
        this.publish('incluirParticipanteError', { code: 'client.unexpected', message: '', details: { name: 'aborted' } });
        this.publish('incluirParticipanteStatus', 'error');
        return;
      }
      if (!response.ok || !response.data) {
        this.publish('incluirParticipanteError', response.error ?? unexpectedError(null));
        this.publish('incluirParticipanteStatus', 'error');
        return;
      }
      const participante = response.data.participante;
      this.upsertParticipante(participante);
      this.publish('usuarios', this.usuarios.filter((usuario) => usuario.id !== participante.id));
      this.publish('incluirParticipanteDraft', emptyIncluirParticipanteDraft());
      this.publish('incluirParticipanteStatus', 'success');
    } catch (error) {
      this.publish('incluirParticipanteError', unexpectedError(error));
      this.publish('incluirParticipanteStatus', 'error');
    }
  }

  /** request salvarMarcas — saves the two marks (accepts tasks, can create tasks) of the selected participant using salvarMarcasDraft (id, version, flags); redraws participantes (upsert of the returned participant by id, so the selected record follows) and refills salvarMarcasDraft from the returned record. Takes no arguments: select a participant (selectParticipante) and edit the draft first; a missing leaf publishes client.requiredMissing. */
  public async salvarMarcas(): Promise<void> {
    if (this.salvarMarcasStatus === 'loading') return;
    const draft = this.salvarMarcasDraft;
    const id = draft.id;
    const version = draft.version;
    const aceita = draft.details.tarefas.aceitaTarefas;
    const pode = draft.details.tarefas.podeCriarTarefas;
    if (id === null || id === '' || version === null || aceita === null || pode === null) {
      const stateKeys: string[] = [];
      if (id === null || id === '') stateKeys.push('salvarMarcasDraft.id');
      if (version === null) stateKeys.push('salvarMarcasDraft.version');
      if (aceita === null) stateKeys.push('salvarMarcasDraft.details.tarefas.aceitaTarefas');
      if (pode === null) stateKeys.push('salvarMarcasDraft.details.tarefas.podeCriarTarefas');
      this.publish('salvarMarcasError', { code: 'client.requiredMissing', message: '', details: { stateKeys } });
      this.publish('salvarMarcasStatus', 'error');
      return;
    }
    const input: Input<'tarefas.participantes.salvarMarcas'> = {
      id,
      version,
      details: { tarefas: { aceitaTarefas: aceita, podeCriarTarefas: pode } },
    };
    this.publish('salvarMarcasStatus', 'loading');
    this.publish('salvarMarcasError', null);
    try {
      const response = await runBlockingUiAction((signal) =>
        execBff<Output<'tarefas.participantes.salvarMarcas'>>('tarefas.participantes.salvarMarcas', input, { mode: 'blocking', signal }),
      );
      if (!response) {
        this.publish('salvarMarcasError', { code: 'client.unexpected', message: '', details: { name: 'aborted' } });
        this.publish('salvarMarcasStatus', 'error');
        return;
      }
      if (!response.ok || !response.data) {
        this.publish('salvarMarcasError', response.error ?? unexpectedError(null));
        this.publish('salvarMarcasStatus', 'error');
        return;
      }
      const participante = response.data.participante;
      this.upsertParticipante(participante);
      this.publish('salvarMarcasDraft', draftFromParticipante(participante));
      this.publish('salvarMarcasStatus', 'success');
    } catch (error) {
      this.publish('salvarMarcasError', unexpectedError(error));
      this.publish('salvarMarcasStatus', 'error');
    }
  }
}
