/// <mls fileReference="_102035_/l2/locadora/web/shared/locacoesLista.ts" enhancement="_102027_/l2/enhancementLit.ts" />

import { CollabLitElement } from '/_102029_/l2/collabLitElement.js';
import { property } from 'lit/decorators.js';
import type { AuraNormalizedError } from '/_102029_/l2/contracts/bootstrap.js';
import type { BffClientOptions } from '/_102029_/l2/bffClient.js';
import { execBff } from '/_102029_/l2/bffClient.js';
import {
  bindExpectedNavigationLoad,
  consumeExpectedNavigationLoad,
  runBlockingUiAction,
} from '/_102029_/l2/interactionRuntime.js';
import {
  subscribe,
  unsubscribe,
  getState,
  setState,
  initState,
} from '/_102029_/l2/collabState.js';
import type { LocadoraLocacaoResponse } from '/_102035_/l2/locadora/web/contracts/locacoesLista.js';

/// **collab_i18n_start**
const message_pt = {
  brand: 'Locadora',
  pageTitle: 'Locacoes - lista',
  pageSubtitle: 'Consultar locacoes registradas.',

  loadingLocacoes: 'Carregando locacoes...',
  couldNotLoad: 'Nao foi possivel carregar os dados.',

  reload: 'Recarregar',

  filtering: 'Filtrando...',
  couldNotFilter: 'Nao foi possivel aplicar os filtros.',

  itemsAvailable: 'itens disponiveis',

  // filtros
  placaVeiculo: 'Placa do veiculo',
  dataRetiradaInicio: 'Data de retirada (inicio)',
  dataRetiradaFim: 'Data de retirada (fim)',
  devolucaoPrevistaInicio: 'Devolucao prevista (inicio)',
  devolucaoPrevistaFim: 'Devolucao prevista (fim)',
  formaPagamento: 'Forma de pagamento',

  // colunas
  dataRetirada: 'Data de retirada',
  dataDevolucao: 'Data de devolucao',
  devolucaoPrevista: 'Devolucao prevista',
  valorDiario: 'Valor diario',
  seguroOpcional: 'Seguro opcional',
  placa: 'Placa',
  cpf: 'CPF',
};

const message_en = {
  brand: 'Car Rental',
  pageTitle: 'Rentals - list',
  pageSubtitle: 'Review registered rentals.',

  loadingLocacoes: 'Loading rentals...',
  couldNotLoad: 'Could not load data.',

  reload: 'Reload',

  filtering: 'Filtering...',
  couldNotFilter: 'Could not apply filters.',

  itemsAvailable: 'items available',

  // filters
  placaVeiculo: 'Vehicle plate',
  dataRetiradaInicio: 'Pickup date (start)',
  dataRetiradaFim: 'Pickup date (end)',
  devolucaoPrevistaInicio: 'Expected return (start)',
  devolucaoPrevistaFim: 'Expected return (end)',
  formaPagamento: 'Payment method',

  // columns
  dataRetirada: 'Pickup date',
  dataDevolucao: 'Return date',
  devolucaoPrevista: 'Expected return',
  valorDiario: 'Daily rate',
  seguroOpcional: 'Optional insurance',
  placa: 'Plate',
  cpf: 'CPF',
};

type MessageType = typeof message_en;
const messages: { [key: string]: MessageType } = { en: message_en, pt: message_pt };
/// **collab_i18n_end**

export class LocadoraLocacoesListaBase extends CollabLitElement {
  private readonly _stateKeys = [
    // fields
    'ui.locacoesLista.filter.placaVeiculo',
    'ui.locacoesLista.filter.dataRetiradaInicio',
    'ui.locacoesLista.filter.dataRetiradaFim',
    'ui.locacoesLista.filter.devolucaoPrevistaInicio',
    'ui.locacoesLista.filter.devolucaoPrevistaFim',
    'ui.locacoesLista.filter.formaPagamento',

    // collection
    'db.locacao[]',

    // tempStates (organisms + page)
    'ui.locacoesLista.selectedLocacaoId',
    'ui.locacoesLista.sortBy',
    'ui.locacoesLista.pagination.page',
    'ui.locacoesLista.pagination.pageSize',

    // actionStates (prefer exclusive)
    '*ui.locacoesLista.load',
    '*ui.locacoesLista.filtering',
  ] as const;

  @property({ type: Array }) locacao: LocadoraLocacaoResponse[] = [];
  @property({ type: String }) status: string = '';

  // fields (filters)
  @property({ type: String }) placaVeiculo: string = '';
  @property({ type: String }) dataRetiradaInicio: string = '';
  @property({ type: String }) dataRetiradaFim: string = '';
  @property({ type: String }) devolucaoPrevistaInicio: string = '';
  @property({ type: String }) devolucaoPrevistaFim: string = '';
  @property({ type: String }) formaPagamento: string = '';

  // tempStates
  @property({ type: String }) selectedLocacaoId: string = '';
  @property({ type: String }) sortBy: string = 'dataRetirada';
  @property({ type: Number }) page: number = 1;
  @property({ type: Number }) pageSize: number = 20;

  // actionStates
  @property({ type: String }) loadState: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  @property({ type: String }) filteringState: 'idle' | 'loading' | 'success' | 'error' = 'idle';

  protected msg: MessageType = messages['en'];

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();

    const pendingLoad = consumeExpectedNavigationLoad();
    const task = this.loadInitialData(undefined, {
      // mode: pendingLoad ? 'blocking' : 'silent',
      mode: 'silent',
      signal: pendingLoad?.signal,
    });
    bindExpectedNavigationLoad(pendingLoad, task);
    void task.catch(() => undefined);

    const lang: string = this.getMessageKey(messages);
    this.msg = messages[lang] || messages['en'];

    // initState for tempStates that have initialValue
    initState('ui.locacoesLista.sortBy', 'dataRetirada');
    initState('ui.locacoesLista.pagination.page', 1);
    initState('ui.locacoesLista.pagination.pageSize', 20);

    // subscribe to all observed state keys
    subscribe(this._stateKeys as unknown as string[], this);

    // read current values from global state
    (this._stateKeys as unknown as string[]).forEach((key) => {
      const rawKey = key.startsWith('*') ? key.slice(1) : key;
      const v = getState(rawKey);
      if (v !== undefined) this.handleIcaStateChange(rawKey, v);
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    unsubscribe(this._stateKeys as unknown as string[], this);
  }

  handleIcaStateChange(key: string, value: any): void {
    switch (key) {
      // filter fields
      case 'ui.locacoesLista.filter.placaVeiculo':
        this.placaVeiculo = value ?? '';
        break;
      case 'ui.locacoesLista.filter.dataRetiradaInicio':
        this.dataRetiradaInicio = value ?? '';
        break;
      case 'ui.locacoesLista.filter.dataRetiradaFim':
        this.dataRetiradaFim = value ?? '';
        break;
      case 'ui.locacoesLista.filter.devolucaoPrevistaInicio':
        this.devolucaoPrevistaInicio = value ?? '';
        break;
      case 'ui.locacoesLista.filter.devolucaoPrevistaFim':
        this.devolucaoPrevistaFim = value ?? '';
        break;
      case 'ui.locacoesLista.filter.formaPagamento':
        this.formaPagamento = value ?? '';
        break;

      // collection
      case 'db.locacao[]':
        this.locacao = value ?? [];
        break;

      // tempStates
      case 'ui.locacoesLista.selectedLocacaoId':
        this.selectedLocacaoId = value ?? '';
        break;
      case 'ui.locacoesLista.sortBy':
        this.sortBy = value ?? 'dataRetirada';
        break;
      case 'ui.locacoesLista.pagination.page':
        this.page = value ?? 1;
        break;
      case 'ui.locacoesLista.pagination.pageSize':
        this.pageSize = value ?? 20;
        break;

      // actionStates
      case 'ui.locacoesLista.load':
        this.loadState = value ?? 'idle';
        break;
      case 'ui.locacoesLista.filtering':
        this.filteringState = value ?? 'idle';
        break;

      default:
        break;
    }
  }

  async loadInitialData(_params?: undefined, options?: BffClientOptions): Promise<void> {
    await this.loadListLocacoes(undefined, options);
  }

  // ── load methods ──
  async loadListLocacoes(
    params?: {
      placaVeiculo?: string;
      dataRetiradaInicio?: string;
      dataRetiradaFim?: string;
      devolucaoPrevistaInicio?: string;
      devolucaoPrevistaFim?: string;
      formaPagamento?: string;
    },
    options?: BffClientOptions,
  ): Promise<void> {
    const effectiveParams = {
      placaVeiculo: params?.placaVeiculo ?? (getState('ui.locacoesLista.filter.placaVeiculo') as string | undefined),
      dataRetiradaInicio:
        params?.dataRetiradaInicio ?? (getState('ui.locacoesLista.filter.dataRetiradaInicio') as string | undefined),
      dataRetiradaFim: params?.dataRetiradaFim ?? (getState('ui.locacoesLista.filter.dataRetiradaFim') as string | undefined),
      devolucaoPrevistaInicio:
        params?.devolucaoPrevistaInicio ??
        (getState('ui.locacoesLista.filter.devolucaoPrevistaInicio') as string | undefined),
      devolucaoPrevistaFim:
        params?.devolucaoPrevistaFim ?? (getState('ui.locacoesLista.filter.devolucaoPrevistaFim') as string | undefined),
      formaPagamento: params?.formaPagamento ?? (getState('ui.locacoesLista.filter.formaPagamento') as string | undefined),
    };

    setState('ui.locacoesLista.load', 'loading');
    this.status = this.msg.loadingLocacoes;

    try {
      if ((window as any).mls) {
        // Provide stub/mock data directly — no network call
        this.locacao = [
          {
            dataRetirada: '2026-05-20',
            dataDevolucao: '2026-05-24',
            devolucaoPrevista: '2026-05-24',
            valorDiario: 129.9,
            seguroOpcional: true,
            formaPagamento: 'cartao_credito',
            placaVeiculo: 'ABC1D23',
            cpf: '123.456.789-09',
          },
          {
            dataRetirada: '2026-05-22',
            dataDevolucao: '2026-05-23',
            devolucaoPrevista: '2026-05-23',
            valorDiario: 99.9,
            formaPagamento: 'pix',
            placaVeiculo: 'GHI2J45',
            cpf: '987.654.321-00',
          },
          {
            dataRetirada: '2026-05-10',
            dataDevolucao: '2026-05-12',
            devolucaoPrevista: '2026-05-12',
            valorDiario: 149.5,
            seguroOpcional: false,
            formaPagamento: 'dinheiro',
            placaVeiculo: 'KLM3N67',
            cpf: '111.222.333-44',
          },
        ];
        setState('db.locacao[]', this.locacao);
        this.status = `${this.locacao.length} ${this.msg.itemsAvailable}`;
        setState('ui.locacoesLista.load', 'success');
        return;
      }

      const response = await execBff<LocadoraLocacaoResponse[]>(
        'locadora.locacoesLista.listLocacoes',
        effectiveParams,
        options,
      );

      if (!response.ok || !response.data) {
        if (options?.mode === 'blocking') {
          throw (response.error ?? {
            code: 'UNEXPECTED_ERROR',
            message: this.msg.couldNotLoad,
          }) satisfies AuraNormalizedError;
        }
        this.status = this.msg.couldNotLoad;
        this.locacao = [];
        setState('db.locacao[]', this.locacao);
        setState('ui.locacoesLista.load', 'error');
        return;
      }

      this.locacao = response.data ?? [];
      setState('db.locacao[]', this.locacao);
      this.status = `${this.locacao.length} ${this.msg.itemsAvailable}`;
      setState('ui.locacoesLista.load', 'success');
    } catch (e) {
      setState('ui.locacoesLista.load', 'error');
      throw e;
    }
  }

  // ── action methods (derived from actionStates) ──
  async filtering(
    params: {
      placaVeiculo?: string;
      dataRetiradaInicio?: string;
      dataRetiradaFim?: string;
      devolucaoPrevistaInicio?: string;
      devolucaoPrevistaFim?: string;
      formaPagamento?: string;
    },
    signal?: AbortSignal,
  ): Promise<void> {
    setState('ui.locacoesLista.filtering', 'loading');
    try {
      // keep tempState/global filter fields in sync
      if (params.placaVeiculo !== undefined) setState('ui.locacoesLista.filter.placaVeiculo', params.placaVeiculo);
      if (params.dataRetiradaInicio !== undefined)
        setState('ui.locacoesLista.filter.dataRetiradaInicio', params.dataRetiradaInicio);
      if (params.dataRetiradaFim !== undefined) setState('ui.locacoesLista.filter.dataRetiradaFim', params.dataRetiradaFim);
      if (params.devolucaoPrevistaInicio !== undefined)
        setState('ui.locacoesLista.filter.devolucaoPrevistaInicio', params.devolucaoPrevistaInicio);
      if (params.devolucaoPrevistaFim !== undefined)
        setState('ui.locacoesLista.filter.devolucaoPrevistaFim', params.devolucaoPrevistaFim);
      if (params.formaPagamento !== undefined) setState('ui.locacoesLista.filter.formaPagamento', params.formaPagamento);

      // refresh list based on filters
      await this.loadListLocacoes(params, { mode: 'silent', signal });
      setState('ui.locacoesLista.filtering', 'success');
    } catch (e) {
      setState('ui.locacoesLista.filtering', 'error');
      throw e;
    }
  }

  // ── handlers ──
  handleFilteringSubmit(event: SubmitEvent): void {
    event.preventDefault();

    const form = event.currentTarget as HTMLFormElement | null;
    const fd = form ? new FormData(form) : new FormData();

    const params = {
      placaVeiculo: (fd.get('placaVeiculo') as string | null) ?? this.placaVeiculo,
      dataRetiradaInicio: (fd.get('dataRetiradaInicio') as string | null) ?? this.dataRetiradaInicio,
      dataRetiradaFim: (fd.get('dataRetiradaFim') as string | null) ?? this.dataRetiradaFim,
      devolucaoPrevistaInicio: (fd.get('devolucaoPrevistaInicio') as string | null) ?? this.devolucaoPrevistaInicio,
      devolucaoPrevistaFim: (fd.get('devolucaoPrevistaFim') as string | null) ?? this.devolucaoPrevistaFim,
      formaPagamento: (fd.get('formaPagamento') as string | null) ?? this.formaPagamento,
    };

    void runBlockingUiAction(
      async (signal: AbortSignal) => {
        await this.filtering(params, signal);
      },
      {
        busyLabel: this.msg.filtering,
        errorTitle: this.msg.couldNotFilter,
        retry: () => this.filtering(params),
      },
    );
  }
}
