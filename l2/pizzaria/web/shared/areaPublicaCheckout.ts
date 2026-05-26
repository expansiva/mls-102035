/// <mls fileReference="_102035_/l2/pizzaria/web/shared/areaPublicaCheckout.ts" enhancement="_blank" />

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
    PizzariaCombo,
    PizzariaItemPedido,
    PizzariaPagamento,
    PizzariaPedido,
    PizzariaPoliticaCancelamentoReembolso,
    PizzariaUpdatePagamentoParams,
    PizzariaUpdatePedidoParams,
} from '/_102035_/l1/pizzaria/module.js';

/// **collab_i18n_start**
const message_pt = {
    brand: 'Pizzaria',
    pageTitle: 'areaPublicaCheckout',
    pageSubtitle: 'Finalizar pedido publico online com dados do cliente, entrega, pagamento e confirmacao.',
    loadingResumoCheckout: 'Carregando resumo do pedido...',
    loadingItensPedido: 'Carregando itens do pedido...',
    loadingCombosAtivos: 'Carregando sugestoes de combos...',
    loadingPoliticasCancelamento: 'Carregando politica de cancelamento...',
    couldNotLoad: 'Nao foi possivel carregar os dados.',
    reload: 'Recarregar',
    // form/field labels
    pedidoId: 'Pedido',
    tipoPedido: 'Tipo',
    statusPedido: 'Status',
    totalPedido: 'Total',
    cliente: 'Cliente',
    enderecoEntrega: 'Endereco de entrega',
    zonaEntregaId: 'Zona de entrega',
    taxaEntrega: 'Taxa de entrega',
    metodoPagamento: 'Metodo de pagamento',
    valorPagamento: 'Valor',
    statusPagamento: 'Status do pagamento',
    politicaAceite: 'Li e aceito a politica',
    whatsappOptIn: 'Receber atualizacoes por WhatsApp',
    // actions
    save: 'Salvar',
    saving: 'Salvando...',
    confirm: 'Confirmar',
    confirming: 'Confirmando...',
    couldNotSave: 'Nao foi possivel salvar.',
    savedSuccessfully: 'Salvo com sucesso.',
    couldNotConfirm: 'Nao foi possivel confirmar o pedido.',
    confirmedSuccessfully: 'Pedido confirmado com sucesso.',
    // misc
    itemsAvailable: 'itens disponiveis',
};
const message_en = {
    brand: 'Pizzaria',
    pageTitle: 'areaPublicaCheckout',
    pageSubtitle: 'Finalize public online order with customer details, delivery, payment and confirmation.',
    loadingResumoCheckout: 'Loading order summary...',
    loadingItensPedido: 'Loading order items...',
    loadingCombosAtivos: 'Loading combo suggestions...',
    loadingPoliticasCancelamento: 'Loading cancellation policy...',
    couldNotLoad: 'Could not load data.',
    reload: 'Reload',
    // form/field labels
    pedidoId: 'Order',
    tipoPedido: 'Type',
    statusPedido: 'Status',
    totalPedido: 'Total',
    cliente: 'Customer',
    enderecoEntrega: 'Delivery address',
    zonaEntregaId: 'Delivery zone',
    taxaEntrega: 'Delivery fee',
    metodoPagamento: 'Payment method',
    valorPagamento: 'Amount',
    statusPagamento: 'Payment status',
    politicaAceite: 'I have read and accept the policy',
    whatsappOptIn: 'Receive WhatsApp updates',
    // actions
    save: 'Save',
    saving: 'Saving...',
    confirm: 'Confirm',
    confirming: 'Confirming...',
    couldNotSave: 'Could not save.',
    savedSuccessfully: 'Saved successfully.',
    couldNotConfirm: 'Could not confirm the order.',
    confirmedSuccessfully: 'Order confirmed successfully.',
    // misc
    itemsAvailable: 'items available',
};
type MessageType = typeof message_en;
const messages: { [key: string]: MessageType } = { en: message_en, pt: message_pt };
/// **collab_i18n_end**

export class PizzariaAreaPublicaCheckoutBase extends CollabLitElement {
    static properties = {
        resumoPedido: { state: true },
        itensPedido: { state: true },
        combosSugestoes: { state: true },
        politicaCancelamento: { state: true },
        status: { state: true },
    };

    declare resumoPedido: PizzariaPedido | undefined;
    declare itensPedido: PizzariaItemPedido[];
    declare combosSugestoes: PizzariaCombo[];
    declare politicaCancelamento: PizzariaPoliticaCancelamentoReembolso[];
    declare status: string;

    protected msg: MessageType = messages['en'];

    constructor() {
        super();
        this.resumoPedido = undefined;
        this.itensPedido = [];
        this.combosSugestoes = [];
        this.politicaCancelamento = [];
        this.status = '';
    }

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
    }

    async loadInitialData(
        params?: { pedidoId?: string },
        options?: BffClientOptions,
    ): Promise<void> {
        await this.loadGetResumoCheckoutPublico(params, options);
        await Promise.all([
            this.loadListarItensPedido(params, options),
            this.loadListarCombosAtivos(undefined, options),
            this.loadListarPoliticasCancelamentoAtivas(undefined, options),
        ]);
    }

    // ── load methods (one per read routine) ──
    async loadGetResumoCheckoutPublico(
        params?: { pedidoId?: string },
        options?: BffClientOptions,
    ): Promise<void> {
        this.status = this.msg.loadingResumoCheckout;

        if ((window as any).mls) {
            this.resumoPedido = {
                id: params?.pedidoId ?? 'PED-1001',
                tipo: 'delivery',
                status: 'recebido',
                itens: [],
                total: 89.9,
                origem: 'publico',
                cliente: 'Joao Silva',
                enderecoEntrega: 'Rua das Flores, 123 - Centro',
                zonaEntregaId: 'ZONA-1',
                taxaEntrega: 8.0,
            } satisfies PizzariaPedido;
            this.status = `1 ${this.msg.itemsAvailable}`;
            return;
        }

        const response = await execBff<PizzariaPedido>(
            'pizzaria.getResumoCheckoutPublico',
            params,
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
            this.resumoPedido = undefined;
            return;
        }
        this.resumoPedido = response.data ?? undefined;
        this.status = `1 ${this.msg.itemsAvailable}`;
    }

    async loadListarItensPedido(
        params?: { pedidoId?: string },
        options?: BffClientOptions,
    ): Promise<void> {
        this.status = this.msg.loadingItensPedido;

        if ((window as any).mls) {
            this.itensPedido = [
                {
                    id: 'IT-1',
                    pedidoId: params?.pedidoId ?? 'PED-1001',
                    produtoId: 'PROD-1',
                    quantidade: 1,
                    precoUnitario: 49.9,
                    observacoes: 'Sem cebola',
                },
                {
                    id: 'IT-2',
                    pedidoId: params?.pedidoId ?? 'PED-1001',
                    produtoId: 'PROD-2',
                    quantidade: 1,
                    precoUnitario: 32.0,
                    observacoes: 'Borda recheada',
                },
                {
                    id: 'IT-3',
                    pedidoId: params?.pedidoId ?? 'PED-1001',
                    produtoId: 'PROD-3',
                    quantidade: 1,
                    precoUnitario: 7.9,
                },
            ] satisfies PizzariaItemPedido[];
            this.status = `${this.itensPedido.length} ${this.msg.itemsAvailable}`;
            return;
        }

        const response = await execBff<PizzariaItemPedido[]>(
            'pizzaria.listarItensPedido',
            params,
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
            this.itensPedido = [];
            return;
        }
        this.itensPedido = response.data ?? [];
        this.status = `${this.itensPedido.length} ${this.msg.itemsAvailable}`;
    }

    async loadListarCombosAtivos(
        params?: Record<string, never>,
        options?: BffClientOptions,
    ): Promise<void> {
        this.status = this.msg.loadingCombosAtivos;

        if ((window as any).mls) {
            this.combosSugestoes = [
                {
                    id: 'CB-10',
                    nome: 'Combo Familia',
                    descricao: '2 pizzas grandes + refri 2L',
                    itens: [{ produtoId: 'PROD-1' }, { produtoId: 'PROD-2' }, { produtoId: 'PROD-REFRI' }],
                    preco: 129.9,
                    ativo: true,
                },
                {
                    id: 'CB-11',
                    nome: 'Combo Casal',
                    descricao: '1 pizza media + 2 bebidas',
                    itens: [{ produtoId: 'PROD-4' }, { produtoId: 'PROD-AGUA' }, { produtoId: 'PROD-SUCO' }],
                    preco: 79.9,
                    ativo: true,
                },
                {
                    id: 'CB-12',
                    nome: 'Combo Almoco',
                    descricao: 'Pizza brotinho + refrigerante lata',
                    itens: [{ produtoId: 'PROD-5' }, { produtoId: 'PROD-LATA' }],
                    preco: 39.9,
                    ativo: true,
                },
            ] satisfies PizzariaCombo[];
            this.status = `${this.combosSugestoes.length} ${this.msg.itemsAvailable}`;
            return;
        }

        const response = await execBff<PizzariaCombo[]>(
            'pizzaria.listarCombosAtivos',
            params,
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
            this.combosSugestoes = [];
            return;
        }
        this.combosSugestoes = response.data ?? [];
        this.status = `${this.combosSugestoes.length} ${this.msg.itemsAvailable}`;
    }

    async loadListarPoliticasCancelamentoAtivas(
        params?: Record<string, never>,
        options?: BffClientOptions,
    ): Promise<void> {
        this.status = this.msg.loadingPoliticasCancelamento;

        if ((window as any).mls) {
            this.politicaCancelamento = [
                {
                    id: 'POL-1',
                    condicoes: 'Cancelamento ate 5 min apos a confirmacao.',
                    prazoMaximoMin: 5,
                    permiteReembolso: true,
                    ativo: true,
                },
                {
                    id: 'POL-2',
                    condicoes: 'Apos inicio do preparo, reembolso nao aplicavel.',
                    permiteReembolso: false,
                    ativo: true,
                },
            ] satisfies PizzariaPoliticaCancelamentoReembolso[];
            this.status = `${this.politicaCancelamento.length} ${this.msg.itemsAvailable}`;
            return;
        }

        const response = await execBff<PizzariaPoliticaCancelamentoReembolso[]>(
            'pizzaria.listarPoliticasCancelamentoAtivas',
            params,
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
            this.politicaCancelamento = [];
            return;
        }
        this.politicaCancelamento = response.data ?? [];
        this.status = `${this.politicaCancelamento.length} ${this.msg.itemsAvailable}`;
    }

    // ── action methods (one per write routine) ──
    async salvarPagamento(
        params: PizzariaUpdatePagamentoParams,
        signal?: AbortSignal,
    ): Promise<void> {
        if ((window as any).mls) {
            console.log('[mls mock] ui.areaPublicaCheckout.salvarPagamento', params);
            this.status = this.msg.savedSuccessfully;
            // refresh summary after payment
            await this.loadGetResumoCheckoutPublico(
                { pedidoId: params.pedidoId },
                { mode: 'silent', signal },
            );
            return;
        }

        const response = await execBff<PizzariaPagamento>(
            'ui.areaPublicaCheckout.salvarPagamento',
            params,
            { mode: 'blocking', signal },
        );
        if (!response.ok || !response.data) {
            throw (response.error ?? {
                code: 'UNEXPECTED_ERROR',
                message: this.msg.couldNotSave,
            }) satisfies AuraNormalizedError;
        }
        this.status = this.msg.savedSuccessfully;
        await this.loadGetResumoCheckoutPublico(
            { pedidoId: params.pedidoId },
            { mode: 'silent', signal },
        );
    }

    async confirmarPedido(
        params: PizzariaUpdatePedidoParams,
        signal?: AbortSignal,
    ): Promise<void> {
        if ((window as any).mls) {
            console.log('[mls mock] ui.areaPublicaCheckout.confirmarPedido', params);
            this.status = this.msg.confirmedSuccessfully;
            await this.loadGetResumoCheckoutPublico(
                { pedidoId: params.id },
                { mode: 'silent', signal },
            );
            return;
        }

        const response = await execBff<PizzariaPedido>(
            'ui.areaPublicaCheckout.confirmarPedido',
            params,
            { mode: 'blocking', signal },
        );
        if (!response.ok || !response.data) {
            throw (response.error ?? {
                code: 'UNEXPECTED_ERROR',
                message: this.msg.couldNotConfirm,
            }) satisfies AuraNormalizedError;
        }
        this.status = this.msg.confirmedSuccessfully;
        await this.loadGetResumoCheckoutPublico(
            { pedidoId: params.id },
            { mode: 'silent', signal },
        );
    }

    // ── form submit handlers (one per write routine that originates from a form) ──
    handleSalvarPagamentoSubmit(event: SubmitEvent) {
        event.preventDefault();
        const form = event.currentTarget as HTMLFormElement | null;
        const data = new FormData(form ?? undefined);

        const params: PizzariaUpdatePagamentoParams = {
            id: String(data.get('id') ?? ''),
            pedidoId: String(data.get('pedidoId') ?? ''),
            metodo: 'online',
            status: String(data.get('status') ?? 'processando'),
            valor: Number(data.get('valor') ?? 0),
        };

        void runBlockingUiAction(
            async (signal: AbortSignal) => {
                await this.salvarPagamento(params, signal);
            },
            {
                busyLabel: this.msg.saving,
                errorTitle: this.msg.couldNotSave,
                retry: () => this.salvarPagamento(params),
            },
        );
    }

    handleConfirmarPedidoClick(params: PizzariaUpdatePedidoParams) {
        void runBlockingUiAction(
            async (signal: AbortSignal) => {
                await this.confirmarPedido(params, signal);
            },
            {
                busyLabel: this.msg.confirming,
                errorTitle: this.msg.couldNotConfirm,
                retry: () => this.confirmarPedido(params),
            },
        );
    }
}
