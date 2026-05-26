/// <mls fileReference="_102035_/l2/pizzaria/web/shared/areaPublicaCardapio.ts" enhancement="_blank" />

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
    PizzariaConfiguracaoWhatsApp,
    PizzariaPoliticaCancelamentoReembolso,
    PizzariaProduto,
    PizzariaUpdatePedidoParams,
} from '/_102035_/l1/pizzaria/module.js';

/// **collab_i18n_start**
const message_pt = {
    brand: 'Pizzaria',
    pageTitle: 'Area publica - Cardapio',
    pageSubtitle:
        'Exibir cardapio publico com produtos disponiveis, permitir montagem do carrinho e preparar o pedido online.',

    // loading/status
    loadingProdutosPublicos: 'Carregando cardapio...',
    loadingCombosAtivos: 'Carregando combos...',
    loadingPoliticaCancelamento: 'Carregando politica de cancelamento...',
    loadingConfiguracaoWhatsApp: 'Carregando WhatsApp...',

    itemsAvailable: 'itens disponiveis',
    couldNotLoad: 'Nao foi possivel carregar os dados.',

    // actions
    couldNotCreateOrder: 'Nao foi possivel criar o pedido.',
    createdSuccessfully: 'Pedido criado com sucesso.',

    // buttons/labels
    reload: 'Recarregar',
    confirm: 'Confirmar',
    confirming: 'Confirmando...',
    save: 'Salvar',
    saving: 'Salvando...',

    // filters/form labels
    busca: 'Busca',
    categoria: 'Categoria',
    ordenacao: 'Ordenacao',

    // cart/order labels
    orderType: 'Tipo de pedido',
    itensCarrinho: 'Itens do carrinho',
    subtotal: 'Subtotal',
    total: 'Total',

    // entities/fields used
    produto: 'Produto',
    nome: 'Nome',
    descricao: 'Descricao',
    preco: 'Preco',
    disponivel: 'Disponivel',
    politicaCancelamento: 'Politica de cancelamento',
    condicoes: 'Condicoes',
    whatsApp: 'WhatsApp',
    numeroTelefone: 'Numero de telefone',
};

const message_en = {
    brand: 'Pizzaria',
    pageTitle: 'Public area - Menu',
    pageSubtitle:
        'Show the public menu with available products, allow cart building and prepare the online order.',

    // loading/status
    loadingProdutosPublicos: 'Loading menu...',
    loadingCombosAtivos: 'Loading combos...',
    loadingPoliticaCancelamento: 'Loading cancellation policy...',
    loadingConfiguracaoWhatsApp: 'Loading WhatsApp...',

    itemsAvailable: 'items available',
    couldNotLoad: 'Could not load data.',

    // actions
    couldNotCreateOrder: 'Could not create order.',
    createdSuccessfully: 'Order created successfully.',

    // buttons/labels
    reload: 'Reload',
    confirm: 'Confirm',
    confirming: 'Confirming...',
    save: 'Save',
    saving: 'Saving...',

    // filters/form labels
    busca: 'Search',
    categoria: 'Category',
    ordenacao: 'Sorting',

    // cart/order labels
    orderType: 'Order type',
    itensCarrinho: 'Cart items',
    subtotal: 'Subtotal',
    total: 'Total',

    // entities/fields used
    produto: 'Product',
    nome: 'Name',
    descricao: 'Description',
    preco: 'Price',
    disponivel: 'Available',
    politicaCancelamento: 'Cancellation policy',
    condicoes: 'Conditions',
    whatsApp: 'WhatsApp',
    numeroTelefone: 'Phone number',
};

type MessageType = typeof message_en;
const messages: { [key: string]: MessageType } = { en: message_en, pt: message_pt };
/// **collab_i18n_end**

export class PizzariaAreaPublicaCardapioBase extends CollabLitElement {
    static properties = {
        // db-backed reactive state
        produto: { state: true },
        combo: { state: true },
        politicaCancelamento: { state: true },
        configuracaoWhatsApp: { state: true },

        // ui reactive state (temp states)
        filterBusca: { state: true },
        filterCategoria: { state: true },
        filterSort: { state: true },
        cartItens: { state: true },
        orderType: { state: true },

        // common
        status: { state: true },
    };

    declare produto: PizzariaProduto[];
    declare combo: PizzariaCombo[];
    declare politicaCancelamento: PizzariaPoliticaCancelamentoReembolso | undefined;
    declare configuracaoWhatsApp: PizzariaConfiguracaoWhatsApp | undefined;

    declare filterBusca: string;
    declare filterCategoria: string;
    declare filterSort: string;
    declare cartItens: any[];
    declare orderType: string;

    declare status: string;

    protected msg: MessageType = messages['en'];

    constructor() {
        super();
        this.produto = [];
        this.combo = [];
        this.politicaCancelamento = undefined;
        this.configuracaoWhatsApp = undefined;

        this.filterBusca = '';
        this.filterCategoria = '';
        this.filterSort = 'relevancia';
        this.cartItens = [];
        this.orderType = 'delivery';

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

    // ── load methods (one per read routine) ──
    async loadInitialData(_params?: undefined, options?: BffClientOptions): Promise<void> {
        await Promise.all([
            this.loadListProdutosPublicos(undefined, options),
            this.loadListCombosAtivos(undefined, options),
            this.loadGetPoliticaCancelamentoAtiva(undefined, options),
            this.loadGetConfiguracaoWhatsAppAtiva(undefined, options),
        ]);
    }

    async loadListProdutosPublicos(
        params?: { termo?: string; categoria?: string; somenteDisponiveis?: boolean },
        options?: BffClientOptions,
    ): Promise<void> {
        this.status = this.msg.loadingProdutosPublicos;

        const effectiveParams = {
            termo: params?.termo ?? this.filterBusca,
            categoria: params?.categoria ?? this.filterCategoria,
            somenteDisponiveis: params?.somenteDisponiveis ?? true,
        };

        if ((window as any).mls) {
            this.produto = [
                {
                    id: 'prod_1',
                    nome: 'Pizza Margherita',
                    descricao: 'Molho de tomate, mussarela e manjericao',
                    preco: 49.9,
                    categoria: 'Pizzas',
                    ativo: true,
                    disponivel: true,
                },
                {
                    id: 'prod_2',
                    nome: 'Pizza Calabresa',
                    descricao: 'Calabresa fatiada, cebola e azeitonas',
                    preco: 54.9,
                    categoria: 'Pizzas',
                    ativo: true,
                    disponivel: true,
                },
                {
                    id: 'prod_3',
                    nome: 'Refrigerante Lata',
                    descricao: '350ml - gelado',
                    preco: 7.5,
                    categoria: 'Bebidas',
                    ativo: true,
                    disponivel: true,
                },
            ];
            this.status = `${this.produto.length} ${this.msg.itemsAvailable}`;
            return;
        } else {
            const response = await execBff<PizzariaProduto[]>(
                'pizzaria.listProdutosPublicos',
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
                this.produto = [];
                return;
            }
            this.produto = response.data ?? [];
            this.status = `${this.produto.length} ${this.msg.itemsAvailable}`;
        }
    }

    async loadListCombosAtivos(
        params?: { ativo?: boolean },
        options?: BffClientOptions,
    ): Promise<void> {
        this.status = this.msg.loadingCombosAtivos;

        const effectiveParams = {
            ativo: params?.ativo ?? true,
        };

        if ((window as any).mls) {
            this.combo = [
                {
                    id: 'combo_1',
                    nome: 'Combo Familia',
                    descricao: '1 pizza grande + 1 refrigerante 2L',
                    itens: [{ tipo: 'pizza', tamanho: 'grande', qtd: 1 }, { tipo: 'bebida', qtd: 1 }],
                    preco: 79.9,
                    ativo: true,
                },
                {
                    id: 'combo_2',
                    nome: 'Combo Duplo',
                    descricao: '2 pizzas medias com desconto',
                    itens: [{ tipo: 'pizza', tamanho: 'media', qtd: 2 }],
                    preco: 89.9,
                    ativo: true,
                },
            ];
            this.status = `${this.combo.length} ${this.msg.itemsAvailable}`;
            return;
        } else {
            const response = await execBff<PizzariaCombo[]>('pizzaria.listCombosAtivos', effectiveParams, options);
            if (!response.ok || !response.data) {
                if (options?.mode === 'blocking') {
                    throw (response.error ?? {
                        code: 'UNEXPECTED_ERROR',
                        message: this.msg.couldNotLoad,
                    }) satisfies AuraNormalizedError;
                }
                this.status = this.msg.couldNotLoad;
                this.combo = [];
                return;
            }
            this.combo = response.data ?? [];
            this.status = `${this.combo.length} ${this.msg.itemsAvailable}`;
        }
    }

    async loadGetPoliticaCancelamentoAtiva(
        params?: { ativo?: boolean },
        options?: BffClientOptions,
    ): Promise<void> {
        this.status = this.msg.loadingPoliticaCancelamento;

        const effectiveParams = {
            ativo: params?.ativo ?? true,
        };

        if ((window as any).mls) {
            this.politicaCancelamento = {
                id: 'pol_1',
                condicoes: 'Cancelamento ate 10 minutos apos confirmacao. Reembolso conforme forma de pagamento.',
                prazoMaximoMin: 10,
                permiteReembolso: true,
                ativo: true,
            };
            this.status = 'OK';
            return;
        } else {
            const response = await execBff<PizzariaPoliticaCancelamentoReembolso>(
                'pizzaria.getPoliticaCancelamentoAtiva',
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
                this.politicaCancelamento = undefined;
                return;
            }
            this.politicaCancelamento = response.data ?? undefined;
            this.status = 'OK';
        }
    }

    async loadGetConfiguracaoWhatsAppAtiva(
        params?: { ativo?: boolean },
        options?: BffClientOptions,
    ): Promise<void> {
        this.status = this.msg.loadingConfiguracaoWhatsApp;

        const effectiveParams = {
            ativo: params?.ativo ?? true,
        };

        if ((window as any).mls) {
            this.configuracaoWhatsApp = {
                id: 'wa_1',
                numeroTelefone: '5511999998888',
                ativo: true,
            };
            this.status = 'OK';
            return;
        } else {
            const response = await execBff<PizzariaConfiguracaoWhatsApp>(
                'pizzaria.getConfiguracaoWhatsAppAtiva',
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
                this.configuracaoWhatsApp = undefined;
                return;
            }
            this.configuracaoWhatsApp = response.data ?? undefined;
            this.status = 'OK';
        }
    }

    // ── action methods (one per write routine) ──
    // Page actionStates include createOrder; routine key is inferred as pizzaria.createPedidoPublico
    async createOrder(params: PizzariaUpdatePedidoParams, options?: BffClientOptions): Promise<void> {
        if ((window as any).mls) {
            console.log('[mls mock] pizzaria.createPedidoPublico', params);
            this.status = this.msg.createdSuccessfully;
            await this.loadListProdutosPublicos(undefined, { mode: 'silent' });
            await this.loadListCombosAtivos(undefined, { mode: 'silent' });
            return;
        }

        const response = await execBff<{ id: string }>('pizzaria.createPedidoPublico', params, options);
        if (!response.ok || !response.data) {
            if (options?.mode === 'blocking') {
                throw (response.error ?? {
                    code: 'UNEXPECTED_ERROR',
                    message: this.msg.couldNotCreateOrder,
                }) satisfies AuraNormalizedError;
            }
            this.status = this.msg.couldNotCreateOrder;
            return;
        }

        this.status = this.msg.createdSuccessfully;
        await this.loadListProdutosPublicos(undefined, { mode: 'silent' });
        await this.loadListCombosAtivos(undefined, { mode: 'silent' });
    }

    // ── form submit handlers (one per write routine that originates from a form) ──
    handleCreateOrderSubmit(event: SubmitEvent) {
        event.preventDefault();

        const params: PizzariaUpdatePedidoParams = {
            id: 'new',
            tipo: (this.orderType as any) ?? 'delivery',
            origem: 'publico',
            itens: this.cartItens,
            total: undefined,
        };

        void runBlockingUiAction(
            async (signal: AbortSignal) => {
                await this.createOrder(params, { mode: 'blocking', signal });
            },
            {
                busyLabel: this.msg.confirming,
                errorTitle: this.msg.couldNotCreateOrder,
                retry: () => this.createOrder(params),
            },
        );
    }
}
