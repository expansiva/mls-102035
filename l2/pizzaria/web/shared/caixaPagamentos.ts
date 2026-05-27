/// <mls fileReference="_102035_/l2/pizzaria/web/shared/caixaPagamentos.ts" enhancement="_blank" />

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
    PizzariaPagamento,
    PizzariaPoliticaCancelamentoReembolso,
    PizzariaUpdatePagamentoParams,
} from '/_102035_/l1/pizzaria/module.js';

/// **collab_i18n_start**
const message_pt = {
    brand: 'Pizzaria',
    pageTitle: 'Caixa pagamentos',
    pageSubtitle: 'Registrar e conferir pagamentos online e reembolsos.',
    loadingPagamentos: 'Carregando pagamentos...',
    loadingPoliticaCancelamentoReembolso: 'Carregando politica de reembolso...',
    couldNotLoad: 'Nao foi possivel carregar os dados.',
    couldNotProcessarReembolso: 'Nao foi possivel processar o reembolso.',
    processedSuccessfully: 'Reembolso processado com sucesso.',
    reload: 'Recarregar',
    confirm: 'Confirmar',
    confirming: 'Confirmando...',
    filterStatus: 'Status',
    filterPedidoId: 'Pedido',
    pagamentoId: 'Pagamento',
    motivo: 'Motivo',
    itemsAvailable: 'itens disponiveis',
} ;

const message_en = {
    brand: 'Pizzaria',
    pageTitle: 'Cashier payments',
    pageSubtitle: 'Register and review online payments and refunds.',
    loadingPagamentos: 'Loading payments...',
    loadingPoliticaCancelamentoReembolso: 'Loading refund policy...',
    couldNotLoad: 'Could not load data.',
    couldNotProcessarReembolso: 'Could not process the refund.',
    processedSuccessfully: 'Refund processed successfully.',
    reload: 'Reload',
    confirm: 'Confirm',
    confirming: 'Confirming...',
    filterStatus: 'Status',
    filterPedidoId: 'Order',
    pagamentoId: 'Payment',
    motivo: 'Reason',
    itemsAvailable: 'items available',
} ;

type MessageType = typeof message_en;
const messages: { [key: string]: MessageType } = { en: message_en, pt: message_pt };
/// **collab_i18n_end**

export class PizzariaCaixaPagamentosBase extends CollabLitElement {
    static properties = {
        Pagamento: { state: true },
        reembolso: { state: true },
        status: { state: true },
    };

    declare Pagamento: PizzariaPagamento[];
    declare reembolso: PizzariaPoliticaCancelamentoReembolso | undefined;
    declare status: string;

    protected msg: MessageType = messages['en'];

    constructor() {
        super();
        this.Pagamento = [];
        this.reembolso = undefined;
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
        _params?: undefined,
        options?: BffClientOptions,
    ): Promise<void> {
        await this.loadListPagamentos(undefined, options);
        await this.loadGetPoliticaCancelamentoReembolso(undefined, options);
    }

    // ── load methods (one per read routine) ──
    async loadListPagamentos(
        params?: { status?: string; pedidoId?: string },
        options?: BffClientOptions,
    ): Promise<void> {
        this.status = this.msg.loadingPagamentos;

        if ((window as any).mls) {
            this.Pagamento = [
                { id: 'pg_1001', pedidoId: 'ped_9001', metodo: 'online', status: 'pendente', valor: 89.9 },
                { id: 'pg_1002', pedidoId: 'ped_9002', metodo: 'online', status: 'confirmado', valor: 59.0 },
                { id: 'pg_1003', pedidoId: 'ped_9003', metodo: 'online', status: 'estornado', valor: 39.9 },
            ];
            this.status = `${this.Pagamento.length} ${this.msg.itemsAvailable}`;
            return;
        }

        const response = await execBff<PizzariaPagamento[]>(
            'pizzaria.listPagamentos',
            params,
            options,
        );

        if (!response.ok || !response.data) {
            if (options?.mode === 'blocking') {
                throw (
                    response.error ??
                    ({
                        code: 'UNEXPECTED_ERROR',
                        message: this.msg.couldNotLoad,
                    } satisfies AuraNormalizedError)
                );
            }
            this.status = this.msg.couldNotLoad;
            this.Pagamento = [];
            return;
        }

        this.Pagamento = response.data ?? [];
        this.status = `${this.Pagamento.length} ${this.msg.itemsAvailable}`;
    }

    async loadGetPoliticaCancelamentoReembolso(
        params?: { ativo: boolean },
        options?: BffClientOptions,
    ): Promise<void> {
        this.status = this.msg.loadingPoliticaCancelamentoReembolso;

        if ((window as any).mls) {
            this.reembolso = {
                id: 'pol_1',
                condicoes: 'Reembolso permitido ate 30 min apos o pagamento, com comprovante.',
                prazoMaximoMin: 30,
                permiteReembolso: true,
                ativo: true,
            };
            this.status = `1 ${this.msg.itemsAvailable}`;
            return;
        }

        const response = await execBff<PizzariaPoliticaCancelamentoReembolso>(
            'pizzaria.getPoliticaCancelamentoReembolso',
            params ?? { ativo: true },
            options,
        );

        if (!response.ok || !response.data) {
            if (options?.mode === 'blocking') {
                throw (
                    response.error ??
                    ({
                        code: 'UNEXPECTED_ERROR',
                        message: this.msg.couldNotLoad,
                    } satisfies AuraNormalizedError)
                );
            }
            this.status = this.msg.couldNotLoad;
            this.reembolso = undefined;
            return;
        }

        this.reembolso = response.data;
        this.status = `1 ${this.msg.itemsAvailable}`;
    }

    // ── action methods (one per write routine) ──
    async processarReembolso(
        params: PizzariaUpdatePagamentoParams,
        signal?: AbortSignal,
    ): Promise<void> {
        if ((window as any).mls) {
            console.log('[mls mock] pizzaria.processarReembolso', params);
            this.status = this.msg.processedSuccessfully;
            await this.loadListPagamentos(undefined, { mode: 'silent', signal });
            return;
        }

        const response = await execBff<unknown>(
            'pizzaria.processarReembolso',
            params,
            { mode: 'blocking', signal },
        );

        if (!response.ok) {
            throw (
                response.error ??
                ({
                    code: 'UNEXPECTED_ERROR',
                    message: this.msg.couldNotProcessarReembolso,
                } satisfies AuraNormalizedError)
            );
        }

        this.status = this.msg.processedSuccessfully;
        await this.loadListPagamentos(undefined, { mode: 'silent', signal });
    }

    handleProcessarReembolsoSubmit(event: SubmitEvent) {
        event.preventDefault();

        const form = event.currentTarget as HTMLFormElement;
        const fd = new FormData(form);

        const pagamentoId = String(fd.get('pagamentoId') ?? '').trim();
        const motivo = String(fd.get('motivo') ?? '').trim();

        const params: PizzariaUpdatePagamentoParams = {
            id: pagamentoId,
            status: 'reembolso_solicitado',
            author: motivo || undefined,
        };

        void runBlockingUiAction(
            async (signal: AbortSignal) => {
                await this.processarReembolso(params, signal);
            },
            {
                busyLabel: this.msg.confirming,
                errorTitle: this.msg.couldNotProcessarReembolso,
                retry: () => this.processarReembolso(params),
            },
        );
    }
}