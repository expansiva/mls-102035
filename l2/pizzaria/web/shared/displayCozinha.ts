/// <mls fileReference="_102035_/l2/pizzaria/web/shared/displayCozinha.ts" enhancement="_blank" />

import { CollabLitElement } from '/_102029_/l2/collabLitElement.js';
import type { AuraNormalizedError } from '/_102029_/l2/contracts/bootstrap.js';
import type { BffClientOptions } from '/_102029_/l2/bffClient.js';
import { execBff } from '/_102029_/l2/bffClient.js';
import {
    bindExpectedNavigationLoad,
    consumeExpectedNavigationLoad,
    runBlockingUiAction,
} from '/_102029_/l2/interactionRuntime.js';
import type {
    PizzariaItemPedido,
    PizzariaPedido,
    PizzariaProducao,
    PizzariaUpdateProducaoParams,
} from '/_102035_/l1/pizzaria/module.js';

/// **collab_i18n_start**
const message_pt = {
    brand: 'Pizzaria',
    pageTitle: 'Display Cozinha',
    pageSubtitle: 'Exibir pedidos em producao no display da cozinha com atualizacao rapida e destaque de prioridades.',
    loadingGetResumoProducaoCozinha: 'Carregando resumo da cozinha...',
    loadingListarPedidosCozinha: 'Carregando pedidos da cozinha...',
    loadingGetPedidoCozinhaDetalhe: 'Carregando detalhes do pedido...',
    couldNotLoad: 'Nao foi possivel carregar os dados.',
    loadingUpdateStatus: 'Atualizando status de producao...',
    couldNotUpdateStatus: 'Nao foi possivel atualizar o status.',
    updatedStatusSuccessfully: 'Status atualizado com sucesso.',
    loadingAssignCook: 'Designando cozinheiro...',
    couldNotAssignCook: 'Nao foi possivel designar o cozinheiro.',
    assignedCookSuccessfully: 'Cozinheiro designado com sucesso.',
    itemsAvailable: 'itens disponiveis',
    reload: 'Recarregar',
    save: 'Salvar',
    saving: 'Salvando...',
    confirm: 'Confirmar',
    confirming: 'Confirmando...',
    fieldStatus: 'Status',
    fieldStatusProducao: 'Status de producao',
    fieldCriadoEm: 'Criado em',
    fieldAtualizadoEm: 'Atualizado em',
    fieldObservacoes: 'Observacoes',
    fieldObservacaoCritica: 'Observacao critica',
    fieldResponsavelAtendimento: 'Responsavel do atendimento',
    fieldInicioEm: 'Inicio em',
    fieldFimEm: 'Fim em',
    fieldCozinheiroResponsavelId: 'Cozinheiro responsavel',
    fieldItens: 'Itens',
    fieldItemNome: 'Item',
    fieldItemQuantidade: 'Quantidade',
    fieldItemObservacoes: 'Observacoes do item',
};
const message_en = {
    brand: 'Pizzeria',
    pageTitle: 'Kitchen Display',
    pageSubtitle: 'Show orders in production on the kitchen display with fast updates and priority highlights.',
    loadingGetResumoProducaoCozinha: 'Loading kitchen summary...',
    loadingListarPedidosCozinha: 'Loading kitchen orders...',
    loadingGetPedidoCozinhaDetalhe: 'Loading order details...',
    couldNotLoad: 'Could not load data.',
    loadingUpdateStatus: 'Updating production status...',
    couldNotUpdateStatus: 'Could not update status.',
    updatedStatusSuccessfully: 'Status updated successfully.',
    loadingAssignCook: 'Assigning cook...',
    couldNotAssignCook: 'Could not assign cook.',
    assignedCookSuccessfully: 'Cook assigned successfully.',
    itemsAvailable: 'items available',
    reload: 'Reload',
    save: 'Save',
    saving: 'Saving...',
    confirm: 'Confirm',
    confirming: 'Confirming...',
    fieldStatus: 'Status',
    fieldStatusProducao: 'Production status',
    fieldCriadoEm: 'Created at',
    fieldAtualizadoEm: 'Updated at',
    fieldObservacoes: 'Notes',
    fieldObservacaoCritica: 'Critical note',
    fieldResponsavelAtendimento: 'Service attendant',
    fieldInicioEm: 'Started at',
    fieldFimEm: 'Finished at',
    fieldCozinheiroResponsavelId: 'Responsible cook',
    fieldItens: 'Items',
    fieldItemNome: 'Item',
    fieldItemQuantidade: 'Quantity',
    fieldItemObservacoes: 'Item notes',
};
type MessageType = typeof message_en;
const messages: { [key: string]: MessageType } = { en: message_en, pt: message_pt };
/// **collab_i18n_end**

type DisplayCozinhaResumo = {
    status: PizzariaPedido['status'];
    criadoEm?: any;
    statusProducao: PizzariaProducao['statusProducao'];
};

type PedidoCozinhaItem = Pick<PizzariaItemPedido, 'nome' | 'quantidade' | 'observacoes'>;

type PedidoCozinhaListItem = Pick<
    PizzariaPedido,
    | 'id'
    | 'status'
    | 'criadoEm'
    | 'atualizadoEm'
    | 'observacoes'
    | 'observacaoCritica'
    | 'responsavelAtendimento'
> &
    Pick<
        PizzariaProducao,
        'statusProducao' | 'inicioEm' | 'fimEm' | 'cozinheiroResponsavelId'
    > & {
        // nested collection
        itens?: PedidoCozinhaItem[];
    };

type PedidoCozinhaDetalhe = Pick<
    PizzariaPedido,
    'id' | 'status' | 'criadoEm' | 'observacoes' | 'observacaoCritica'
> &
    Pick<
        PizzariaProducao,
        'statusProducao' | 'inicioEm' | 'fimEm' | 'cozinheiroResponsavelId'
    > & {
        // nested collection
        itens?: PedidoCozinhaItem[];
    };

export class PizzariaDisplayCozinhaBase extends CollabLitElement {
    static properties = {
        resumo: { state: true },
        cozinha: { state: true },
        pedidoDetalhe: { state: true },
        status: { state: true },
    };

    declare resumo: DisplayCozinhaResumo | undefined;
    declare cozinha: PedidoCozinhaListItem[];
    declare pedidoDetalhe: PedidoCozinhaDetalhe | undefined;
    declare status: string;

    protected msg: MessageType = messages['en'];

    createRenderRoot() {
        return this;
    }

    constructor() {
        super();
        this.resumo = undefined;
        this.cozinha = [];
        this.pedidoDetalhe = undefined;
        this.status = '';
    }

    connectedCallback() {
        super.connectedCallback();
        const pendingLoad = consumeExpectedNavigationLoad();
        const task = this.loadInitialData(undefined, {
            mode: pendingLoad ? 'blocking' : 'silent',
            signal: pendingLoad?.signal,
        });
        bindExpectedNavigationLoad(pendingLoad, task);
        void task.catch(() => undefined);
        const lang: string = this.getMessageKey(messages);
        this.msg = messages[lang] || messages['en'];
    }

    protected async loadInitialData(
        _params?: undefined,
        options?: BffClientOptions,
    ): Promise<void> {
        // First load method called from connectedCallback
        await this.loadGetResumoProducaoCozinha(undefined, options);
        await this.loadListarPedidosCozinha(undefined, options);
    }

    // ── load methods (one per read routine) ──

    async loadGetResumoProducaoCozinha(
        params?: { cozinhaId: string },
        options?: BffClientOptions,
    ): Promise<void> {
        this.status = this.msg.loadingGetResumoProducaoCozinha;

        if ((window as any).mls) {
            this.resumo = {
                status: 'em preparo',
                criadoEm: new Date().toISOString(),
                statusProducao: 'em preparo',
            };
            this.status = `1 ${this.msg.itemsAvailable}`;
            return;
        }

        const response = await execBff<DisplayCozinhaResumo>(
            'pizzaria.getResumoProducaoCozinha',
            params,
            options,
        );
        if (!response.ok || !response.data) {
            if (options?.mode === 'blocking') {
                throw (
                    (response.error ?? {
                        code: 'UNEXPECTED_ERROR',
                        message: this.msg.couldNotLoad,
                    }) satisfies AuraNormalizedError
                );
            }
            this.status = this.msg.couldNotLoad;
            this.resumo = undefined;
            return;
        }
        this.resumo = response.data;
        this.status = `1 ${this.msg.itemsAvailable}`;
    }

    async loadListarPedidosCozinha(
        params?: { status: string[]; prioridade: string; cozinhaId: string },
        options?: BffClientOptions,
    ): Promise<void> {
        this.status = this.msg.loadingListarPedidosCozinha;

        if ((window as any).mls) {
            this.cozinha = [
                {
                    id: 'PED-1001',
                    status: 'em preparo',
                    criadoEm: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
                    atualizadoEm: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
                    observacoes: 'Sem cebola. Massa fina.',
                    observacaoCritica: 'Alergia a lactose',
                    responsavelAtendimento: 'Joao Silva',
                    statusProducao: 'em preparo',
                    inicioEm: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
                    cozinheiroResponsavelId: 'COZ-01',
                    itens: [
                        { nome: 'Pizza Margherita', quantidade: 1, observacoes: 'Sem queijo' },
                        { nome: 'Refrigerante Cola 350ml', quantidade: 2 },
                    ],
                },
                {
                    id: 'PED-1002',
                    status: 'em preparo',
                    criadoEm: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
                    atualizadoEm: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
                    observacoes: 'Borda recheada.',
                    responsavelAtendimento: 'Maria Souza',
                    statusProducao: 'em preparo',
                    inicioEm: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
                    cozinheiroResponsavelId: 'COZ-02',
                    itens: [
                        { nome: 'Pizza Calabresa', quantidade: 1 },
                        { nome: 'Suco de Laranja 300ml', quantidade: 1 },
                    ],
                },
                {
                    id: 'PED-1003',
                    status: 'pronto',
                    criadoEm: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
                    atualizadoEm: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
                    observacoes: 'Entregar junto com guardanapos.',
                    responsavelAtendimento: 'Carlos Lima',
                    statusProducao: 'pronto',
                    inicioEm: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
                    fimEm: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
                    cozinheiroResponsavelId: 'COZ-01',
                    itens: [
                        { nome: 'Pizza Portuguesa', quantidade: 1, observacoes: 'Sem azeitona' },
                    ],
                },
            ];
            this.status = `${this.cozinha.length} ${this.msg.itemsAvailable}`;
            return;
        }

        const response = await execBff<PedidoCozinhaListItem[]>(
            'pizzaria.listarPedidosCozinha',
            params,
            options,
        );
        if (!response.ok || !response.data) {
            if (options?.mode === 'blocking') {
                throw (
                    (response.error ?? {
                        code: 'UNEXPECTED_ERROR',
                        message: this.msg.couldNotLoad,
                    }) satisfies AuraNormalizedError
                );
            }
            this.status = this.msg.couldNotLoad;
            this.cozinha = [];
            return;
        }
        this.cozinha = response.data ?? [];
        this.status = `${this.cozinha.length} ${this.msg.itemsAvailable}`;
    }

    async loadGetPedidoCozinhaDetalhe(
        params?: { pedidoId: string },
        options?: BffClientOptions,
    ): Promise<void> {
        this.status = this.msg.loadingGetPedidoCozinhaDetalhe;

        if ((window as any).mls) {
            this.pedidoDetalhe = {
                id: params?.pedidoId ?? 'PED-1001',
                status: 'em preparo',
                criadoEm: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
                observacoes: 'Sem cebola. Massa fina.',
                observacaoCritica: 'Alergia a lactose',
                statusProducao: 'em preparo',
                inicioEm: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
                cozinheiroResponsavelId: 'COZ-01',
                itens: [
                    { nome: 'Pizza Margherita', quantidade: 1, observacoes: 'Sem queijo' },
                    { nome: 'Refrigerante Cola 350ml', quantidade: 2 },
                ],
            };
            this.status = `1 ${this.msg.itemsAvailable}`;
            return;
        }

        const response = await execBff<PedidoCozinhaDetalhe>(
            'pizzaria.getPedidoCozinhaDetalhe',
            params,
            options,
        );
        if (!response.ok || !response.data) {
            if (options?.mode === 'blocking') {
                throw (
                    (response.error ?? {
                        code: 'UNEXPECTED_ERROR',
                        message: this.msg.couldNotLoad,
                    }) satisfies AuraNormalizedError
                );
            }
            this.status = this.msg.couldNotLoad;
            this.pedidoDetalhe = undefined;
            return;
        }
        this.pedidoDetalhe = response.data;
        this.status = `1 ${this.msg.itemsAvailable}`;
    }

    // ── action methods (one per write routine) ──

    async updateStatus(
        params: PizzariaUpdateProducaoParams,
        signal?: AbortSignal,
    ): Promise<void> {
        const options: BffClientOptions | undefined = signal ? { signal, mode: 'blocking' } : undefined;

        if ((window as any).mls) {
            console.log('[mls mock] pizzaria.updateStatus', params);
            this.status = this.msg.updatedStatusSuccessfully;
            // refresh
            await this.loadListarPedidosCozinha(undefined, { mode: 'silent' });
            if (this.pedidoDetalhe?.id) {
                await this.loadGetPedidoCozinhaDetalhe(
                    { pedidoId: this.pedidoDetalhe.id },
                    { mode: 'silent' },
                );
            }
            return;
        }

        const response = await execBff<unknown>('pizzaria.updateStatus', params, options);
        if (!response.ok) {
            throw (
                (response.error ?? {
                    code: 'UNEXPECTED_ERROR',
                    message: this.msg.couldNotUpdateStatus,
                }) satisfies AuraNormalizedError
            );
        }

        this.status = this.msg.updatedStatusSuccessfully;
        await this.loadListarPedidosCozinha(undefined, { mode: 'silent' });
        if (this.pedidoDetalhe?.id) {
            await this.loadGetPedidoCozinhaDetalhe(
                { pedidoId: this.pedidoDetalhe.id },
                { mode: 'silent' },
            );
        }
    }

    async assignCook(
        params: PizzariaUpdateProducaoParams,
        signal?: AbortSignal,
    ): Promise<void> {
        const options: BffClientOptions | undefined = signal ? { signal, mode: 'blocking' } : undefined;

        if ((window as any).mls) {
            console.log('[mls mock] pizzaria.assignCook', params);
            this.status = this.msg.assignedCookSuccessfully;
            // refresh
            await this.loadListarPedidosCozinha(undefined, { mode: 'silent' });
            if (this.pedidoDetalhe?.id) {
                await this.loadGetPedidoCozinhaDetalhe(
                    { pedidoId: this.pedidoDetalhe.id },
                    { mode: 'silent' },
                );
            }
            return;
        }

        const response = await execBff<unknown>('pizzaria.assignCook', params, options);
        if (!response.ok) {
            throw (
                (response.error ?? {
                    code: 'UNEXPECTED_ERROR',
                    message: this.msg.couldNotAssignCook,
                }) satisfies AuraNormalizedError
            );
        }

        this.status = this.msg.assignedCookSuccessfully;
        await this.loadListarPedidosCozinha(undefined, { mode: 'silent' });
        if (this.pedidoDetalhe?.id) {
            await this.loadGetPedidoCozinhaDetalhe(
                { pedidoId: this.pedidoDetalhe.id },
                { mode: 'silent' },
            );
        }
    }

    // ── form submit handlers (one per write routine that originates from a form) ──

    handleUpdateStatusClick(params: PizzariaUpdateProducaoParams): void {
        void runBlockingUiAction(
            async (signal: AbortSignal) => {
                this.status = this.msg.loadingUpdateStatus;
                await this.updateStatus(params, signal);
            },
            {
                busyLabel: this.msg.loadingUpdateStatus,
                errorTitle: this.msg.couldNotUpdateStatus,
                retry: () => this.updateStatus(params),
            },
        );
    }

    handleAssignCookClick(params: PizzariaUpdateProducaoParams): void {
        void runBlockingUiAction(
            async (signal: AbortSignal) => {
                this.status = this.msg.loadingAssignCook;
                await this.assignCook(params, signal);
            },
            {
                busyLabel: this.msg.loadingAssignCook,
                errorTitle: this.msg.couldNotAssignCook,
                retry: () => this.assignCook(params),
            },
        );
    }
}
