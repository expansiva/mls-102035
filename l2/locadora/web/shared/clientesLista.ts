/// <mls fileReference="_102035_/l2/locadora/web/shared/clientesLista.ts" enhancement="_102027_/l2/enhancementLit.ts" />

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
import { subscribe, unsubscribe, getState, setState, initState } from '/_102029_/l2/collabState.js';
import type { LocadoraClienteResponse } from '/_102035_/l2/locadora/web/contracts/clientesLista.js';

/// **collab_i18n_start**
const message_pt = {
    brand: 'Locadora',
    pageTitle: 'Clientes - Lista',
    pageSubtitle: 'Consultar clientes cadastrados.',
    loadingListarClientes: 'Carregando clientes...',
    couldNotLoad: 'Nao foi possivel carregar os dados.',
    itemsAvailable: 'itens disponiveis',

    // common actions
    reload: 'Recarregar',
    save: 'Salvar',
    saving: 'Salvando...',
    confirm: 'Confirmar',
    confirming: 'Confirmando...',

    // field labels (filters / list)
    nome: 'Nome',
    cpf: 'CPF',
    cnh: 'CNH',
    telefone: 'Telefone',
    email: 'E-mail',
    statusValidacao: 'Status de validacao',
    page: 'Pagina',
    pageSize: 'Itens por pagina',
    sortBy: 'Ordenar por',
    sortDir: 'Direcao',
};
const message_en = {
    brand: 'Car rental',
    pageTitle: 'Clients - List',
    pageSubtitle: 'Consult registered clients.',
    loadingListarClientes: 'Loading clients...',
    couldNotLoad: 'Could not load data.',
    itemsAvailable: 'items available',

    // common actions
    reload: 'Reload',
    save: 'Save',
    saving: 'Saving...',
    confirm: 'Confirm',
    confirming: 'Confirming...',

    // field labels (filters / list)
    nome: 'Name',
    cpf: 'CPF',
    cnh: 'CNH',
    telefone: 'Phone',
    email: 'Email',
    statusValidacao: 'Validation status',
    page: 'Page',
    pageSize: 'Items per page',
    sortBy: 'Sort by',
    sortDir: 'Direction',
};
type MessageType = typeof message_en;
const messages: { [key: string]: MessageType } = { en: message_en, pt: message_pt };
/// **collab_i18n_end**

export class LocadoraClientesListaBase extends CollabLitElement {
    private readonly _stateKeys = [
        // dataShape fields
        'db.cliente.nome',
        'db.cliente.cpf',
        'db.cliente.cnh',
        'db.cliente.telefone',
        'db.cliente.email',

        // dataShape collection
        'db.cliente[]',

        // organism tempStates
        'ui.clientesLista.selection.clienteId',
        'ui.clientesLista.view.compact',
        'ui.clientesLista.filter.nome',
        'ui.clientesLista.filter.cpf',
        'ui.clientesLista.filter.cnh',
        'ui.clientesLista.filter.telefone',
        'ui.clientesLista.filter.email',
        'ui.clientesLista.filter.statusValidacao',

        // page tempStates
        'ui.clientesLista.pagination.page',
        'ui.clientesLista.pagination.pageSize',
        'ui.clientesLista.sort.by',
        'ui.clientesLista.sort.dir',
        'ui.clientesLista.search.lastPayload',

        // actionStates (prefer exclusive subscription)
        '*ui.clientesLista.loadingList',
        '*ui.clientesLista.loadingSearch',
        '*ui.clientesLista.error',
    ] as const;

    @property() cliente: LocadoraClienteResponse[] = [];
    @property() status: string = '';

    // fields (shape: fields)
    @property() nome: string = '';
    @property() cpf: string = '';
    @property() cnh: string = '';
    @property() telefone: string = '';
    @property() email: string = '';

    // tempStates
    @property() clienteId: string = '';
    @property() compact: boolean = false;

    @property() filterNome: string = '';
    @property() filterCpf: string = '';
    @property() filterCnh: string = '';
    @property() filterTelefone: string = '';
    @property() filterEmail: string = '';
    @property() statusValidacao: string = 'todos';

    @property() page: number = 1;
    @property() pageSize: number = 20;
    @property() by: string = 'nome';
    @property() dir: string = 'asc';
    @property() lastPayload: any = undefined;

    // actionStates
    @property() loadingList: 'idle' | 'loading' | 'success' | 'error' = 'idle';
    @property() loadingSearch: 'idle' | 'loading' | 'success' | 'error' = 'idle';
    @property() error: 'idle' | 'error' = 'idle';

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

        // initState for tempStates with initialValue
        initState('ui.clientesLista.view.compact', false);
        initState('ui.clientesLista.filter.statusValidacao', 'todos');
        initState('ui.clientesLista.pagination.page', 1);
        initState('ui.clientesLista.pagination.pageSize', 20);
        initState('ui.clientesLista.sort.by', 'nome');
        initState('ui.clientesLista.sort.dir', 'asc');

        // subscribe to all observed state keys
        subscribe(this._stateKeys as unknown as string[], this);

        // read current values from global state
        (this._stateKeys as unknown as string[]).forEach((key) => {
            const normalizedKey = key.startsWith('*') ? key.slice(1) : key;
            const v = getState(normalizedKey);
            if (v !== undefined) this.handleIcaStateChange(normalizedKey, v);
        });
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        unsubscribe(this._stateKeys as unknown as string[], this);
    }

    handleIcaStateChange(key: string, value: any): void {
        switch (key) {
            case 'db.cliente.nome':
                this.nome = value ?? '';
                break;
            case 'db.cliente.cpf':
                this.cpf = value ?? '';
                break;
            case 'db.cliente.cnh':
                this.cnh = value ?? '';
                break;
            case 'db.cliente.telefone':
                this.telefone = value ?? '';
                break;
            case 'db.cliente.email':
                this.email = value ?? '';
                break;
            case 'db.cliente[]':
                this.cliente = value ?? [];
                break;
            case 'ui.clientesLista.selection.clienteId':
                this.clienteId = value ?? '';
                break;
            case 'ui.clientesLista.view.compact':
                this.compact = value ?? false;
                break;
            case 'ui.clientesLista.filter.nome':
                this.filterNome = value ?? '';
                break;
            case 'ui.clientesLista.filter.cpf':
                this.filterCpf = value ?? '';
                break;
            case 'ui.clientesLista.filter.cnh':
                this.filterCnh = value ?? '';
                break;
            case 'ui.clientesLista.filter.telefone':
                this.filterTelefone = value ?? '';
                break;
            case 'ui.clientesLista.filter.email':
                this.filterEmail = value ?? '';
                break;
            case 'ui.clientesLista.filter.statusValidacao':
                this.statusValidacao = value ?? 'todos';
                break;
            case 'ui.clientesLista.pagination.page':
                this.page = value ?? 1;
                break;
            case 'ui.clientesLista.pagination.pageSize':
                this.pageSize = value ?? 20;
                break;
            case 'ui.clientesLista.sort.by':
                this.by = value ?? 'nome';
                break;
            case 'ui.clientesLista.sort.dir':
                this.dir = value ?? 'asc';
                break;
            case 'ui.clientesLista.search.lastPayload':
                this.lastPayload = value ?? undefined;
                break;
            case 'ui.clientesLista.loadingList':
                this.loadingList = value ?? 'idle';
                break;
            case 'ui.clientesLista.loadingSearch':
                this.loadingSearch = value ?? 'idle';
                break;
            case 'ui.clientesLista.error':
                this.error = value ?? 'idle';
                break;
            default:
                break;
        }
    }

    // ── initial load ──
    async loadInitialData(
        _params?: undefined,
        options?: BffClientOptions,
    ): Promise<void> {
        await this.loadListarClientes(undefined, options);
    }

    // ── load methods ──
    async loadListarClientes(
        params?: {
            nome?: string;
            cpf?: string;
            cnh?: string;
            telefone?: string;
            email?: string;
            statusValidacao?: string;
            page?: number;
            pageSize?: number;
            sortBy?: string;
            sortDir?: string;
        },
        options?: BffClientOptions,
    ): Promise<void> {
        setState('ui.clientesLista.loadingList', 'loading');
        try {
            const effectiveParams = {
                nome: params?.nome ?? (getState('ui.clientesLista.filter.nome') as string | undefined),
                cpf: params?.cpf ?? (getState('ui.clientesLista.filter.cpf') as string | undefined),
                cnh: params?.cnh ?? (getState('ui.clientesLista.filter.cnh') as string | undefined),
                telefone: params?.telefone ?? (getState('ui.clientesLista.filter.telefone') as string | undefined),
                email: params?.email ?? (getState('ui.clientesLista.filter.email') as string | undefined),
                statusValidacao:
                    params?.statusValidacao ?? (getState('ui.clientesLista.filter.statusValidacao') as string | undefined),
                page: params?.page ?? (getState('ui.clientesLista.pagination.page') as number | undefined),
                pageSize: params?.pageSize ?? (getState('ui.clientesLista.pagination.pageSize') as number | undefined),
                sortBy: params?.sortBy ?? (getState('ui.clientesLista.sort.by') as string | undefined),
                sortDir: params?.sortDir ?? (getState('ui.clientesLista.sort.dir') as string | undefined),
            };

            this.status = this.msg.loadingListarClientes;

            if ((window as any).mls) {
                this.cliente = [
                    {
                        nome: 'Joao Silva',
                        cpf: '123.456.789-09',
                        cnh: '12345678900',
                        telefone: '(11) 91234-5678',
                        email: 'joao.silva@exemplo.com',
                    },
                    {
                        nome: 'Maria Oliveira',
                        cpf: '987.654.321-00',
                        cnh: '00987654321',
                        telefone: '(21) 99876-5432',
                        email: 'maria.oliveira@exemplo.com',
                    },
                    {
                        nome: 'Carlos Souza',
                        cpf: '321.654.987-10',
                        cnh: '11223344556',
                        telefone: '(31) 93456-7890',
                        email: 'carlos.souza@exemplo.com',
                    },
                ];
                setState('db.cliente[]', this.cliente);
                this.status = `${this.cliente.length} ${this.msg.itemsAvailable}`;
                setState('ui.clientesLista.loadingList', 'success');
                return;
            }

            const response = await execBff<LocadoraClienteResponse[]>(
                'locadora.clientesLista.listarClientes',
                effectiveParams,
                options,
            );
            if (!response.ok || !response.data) {
                if (options?.mode === 'blocking') {
                    setState('ui.clientesLista.loadingList', 'error');
                    throw (
                        response.error ??
                        ({
                            code: 'UNEXPECTED_ERROR',
                            message: this.msg.couldNotLoad,
                        } satisfies AuraNormalizedError)
                    );
                }
                this.status = this.msg.couldNotLoad;
                this.cliente = [];
                setState('db.cliente[]', this.cliente);
                setState('ui.clientesLista.loadingList', 'error');
                return;
            }

            this.cliente = response.data ?? [];
            setState('db.cliente[]', this.cliente);
            this.status = `${this.cliente.length} ${this.msg.itemsAvailable}`;
            setState('ui.clientesLista.loadingList', 'success');
        } catch (e) {
            setState('ui.clientesLista.loadingList', 'error');
            throw e;
        }
    }

    // ── helpers ──
    handleBuscarClick(): void {
        setState('ui.clientesLista.loadingSearch', 'loading');
        try {
            const payload = {
                nome: this.filterNome,
                cpf: this.filterCpf,
                cnh: this.filterCnh,
                telefone: this.filterTelefone,
                email: this.filterEmail,
                statusValidacao: this.statusValidacao,
            };
            setState('ui.clientesLista.search.lastPayload', payload);

            // reset to first page on new search
            this.page = 1;
            setState('ui.clientesLista.pagination.page', 1);

            void runBlockingUiAction(
                async (signal: AbortSignal) => {
                    await this.loadListarClientes(
                        {
                            ...payload,
                            page: 1,
                            pageSize: this.pageSize,
                            sortBy: this.by,
                            sortDir: this.dir,
                        },
                        { mode: 'blocking', signal },
                    );
                },
                {
                    busyLabel: this.msg.loadingListarClientes,
                    errorTitle: this.msg.couldNotLoad,
                    retry: () =>
                        this.loadListarClientes({
                            ...payload,
                            page: 1,
                            pageSize: this.pageSize,
                            sortBy: this.by,
                            sortDir: this.dir,
                        }),
                },
            );

            setState('ui.clientesLista.loadingSearch', 'success');
        } catch (e) {
            setState('ui.clientesLista.loadingSearch', 'error');
            throw e;
        }
    }

    handleLimparFiltrosClick(): void {
        // clear filter states
        this.filterNome = '';
        this.filterCpf = '';
        this.filterCnh = '';
        this.filterTelefone = '';
        this.filterEmail = '';
        this.statusValidacao = 'todos';

        setState('ui.clientesLista.filter.nome', this.filterNome);
        setState('ui.clientesLista.filter.cpf', this.filterCpf);
        setState('ui.clientesLista.filter.cnh', this.filterCnh);
        setState('ui.clientesLista.filter.telefone', this.filterTelefone);
        setState('ui.clientesLista.filter.email', this.filterEmail);
        setState('ui.clientesLista.filter.statusValidacao', this.statusValidacao);

        // reset paging
        this.page = 1;
        setState('ui.clientesLista.pagination.page', 1);

        this.lastPayload = undefined;
        setState('ui.clientesLista.search.lastPayload', this.lastPayload);
    }
}
