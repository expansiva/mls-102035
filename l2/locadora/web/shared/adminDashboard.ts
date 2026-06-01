/// <mls fileReference="_102035_/l2/locadora/web/shared/adminDashboard.ts" enhancement="_102027_/l2/enhancementLit.ts" />

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
import type { LocadoraVeiculoResponse, LocadoraClienteResponse, LocadoraLocacaoResponse } from '/_102035_/l2/locadora/web/contracts/adminDashboard.js';

/// **collab_i18n_start**
const message_pt = {
    brand: 'Locadora',
    pageTitle: 'adminDashboard',
    pageSubtitle: 'Acesso as areas de frota, clientes e locacoes para cadastro e consulta.',
    loadingQuickAccess: 'Carregando atalhos...',
    loadingSummary: 'Carregando resumo...',
    couldNotLoad: 'Nao foi possivel carregar os dados.',
    reload: 'Recarregar',
    save: 'Salvar',
    saving: 'Salvando...',
    confirm: 'Confirmar',
    confirming: 'Confirmando...',
    itemsAvailable: 'itens disponiveis',
    fieldHoveredCard: 'Cartao em foco',
    fieldFilterStatus: 'Status do veiculo',
};
const message_en = {
    brand: 'Car Rental',
    pageTitle: 'adminDashboard',
    pageSubtitle: 'Access to fleet, customers and rentals areas for registration and lookup.',
    loadingQuickAccess: 'Loading shortcuts...',
    loadingSummary: 'Loading summary...',
    couldNotLoad: 'Could not load data.',
    reload: 'Reload',
    save: 'Save',
    saving: 'Saving...',
    confirm: 'Confirm',
    confirming: 'Confirming...',
    itemsAvailable: 'items available',
    fieldHoveredCard: 'Focused card',
    fieldFilterStatus: 'Vehicle status',
};
type MessageType = typeof message_en;
const messages: { [key: string]: MessageType } = { en: message_en, pt: message_pt };
/// **collab_i18n_end**

export class LocadoraAdminDashboardBase extends CollabLitElement {
    private readonly _stateKeys = [
        'db.adminDashboard.quickAccess',
        'db.adminDashboard.summary',
        'ui.adminDashboard.quickAccess.hoveredCard',
        'ui.adminDashboard.summary.filterStatus',
        'ui.adminDashboard.activeSection',
        '*ui.adminDashboard.load',
    ] as const;

    @property() quickAccess: any | undefined = undefined;
    @property() summary: any | undefined = undefined;

    @property() hoveredCard: string = '';
    @property() filterStatus: string = 'disponível';
    @property() activeSection: string = 'main';

    @property() load: 'idle' | 'loading' | 'success' | 'error' = 'idle';

    @property() status: string = '';

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

        initState('ui.adminDashboard.quickAccess.hoveredCard', '');
        initState('ui.adminDashboard.summary.filterStatus', 'disponível');
        initState('ui.adminDashboard.activeSection', 'main');

        subscribe(this._stateKeys as unknown as string[], this);
        (this._stateKeys as unknown as string[]).forEach((key) => {
            const v = getState(key);
            if (v !== undefined) this.handleIcaStateChange(key, v);
        });
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        unsubscribe(this._stateKeys as unknown as string[], this);
    }

    handleIcaStateChange(key: string, value: any): void {
        switch (key) {
            case 'db.adminDashboard.quickAccess':
                this.quickAccess = value ?? undefined;
                break;
            case 'db.adminDashboard.summary':
                this.summary = value ?? undefined;
                break;
            case 'ui.adminDashboard.quickAccess.hoveredCard':
                this.hoveredCard = value ?? '';
                break;
            case 'ui.adminDashboard.summary.filterStatus':
                this.filterStatus = value ?? 'disponível';
                break;
            case 'ui.adminDashboard.activeSection':
                this.activeSection = value ?? 'main';
                break;
            case '*ui.adminDashboard.load':
            case 'ui.adminDashboard.load':
                this.load = value ?? 'idle';
                break;
            default:
                break;
        }
    }

    async loadInitialData(_params?: undefined, options?: BffClientOptions): Promise<void> {
        setState('ui.adminDashboard.load', 'loading');
        try {
            await this.loadGetQuickAccess(undefined, options);
            await this.loadGetSummary(undefined, options);
            this.status = '';
            setState('ui.adminDashboard.load', 'success');
        } catch (e) {
            this.status = this.msg.couldNotLoad;
            setState('ui.adminDashboard.load', 'error');
            throw e;
        }
    }

    // ── load methods ──
    async loadGetQuickAccess(
        _params?: Record<string, never>,
        options?: BffClientOptions,
    ): Promise<void> {
        this.status = this.msg.loadingQuickAccess;

        if ((window as any).mls) {
            const data = {
                cards: [
                    { id: 'frota', label: 'Gestao de Frota', target: 'gestaoFrotaList' },
                    { id: 'clientes', label: 'Gestao de Clientes', target: 'gestaoClientesList' },
                    { id: 'locacoes', label: 'Gestao de Locacoes', target: 'gestaoLocacoesList' },
                ],
                updatedAt: new Date().toISOString(),
            };
            this.quickAccess = data;
            setState('db.adminDashboard.quickAccess', data);
            this.status = `${data.cards?.length ?? 0} ${this.msg.itemsAvailable}`;
            return;
        }

        const response = await execBff<any>('locadora.adminDashboard.getQuickAccess', _params ?? ({} as any), options);
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
            this.quickAccess = undefined;
            return;
        }

        this.quickAccess = response.data ?? undefined;
        setState('db.adminDashboard.quickAccess', this.quickAccess);
        const len = (this.quickAccess as any)?.cards?.length ?? 0;
        this.status = `${len} ${this.msg.itemsAvailable}`;
    }

    async loadGetSummary(
        _params?: Record<string, never>,
        options?: BffClientOptions,
    ): Promise<void> {
        this.status = this.msg.loadingSummary;

        if ((window as any).mls) {
            const veiculos: LocadoraVeiculoResponse[] = [
                {
                    placa: 'ABC-1D23',
                    modelo: 'Fiat Argo',
                    ano: 2022,
                    categoria: 'Hatch',
                    status: 'disponível',
                    quilometragem: 32500,
                },
                {
                    placa: 'DEF-4G56',
                    modelo: 'Volkswagen T-Cross',
                    ano: 2021,
                    categoria: 'SUV',
                    status: 'locado',
                    quilometragem: 48700,
                },
                {
                    placa: 'GHI-7J89',
                    modelo: 'Chevrolet Onix',
                    ano: 2020,
                    categoria: 'Sedan',
                    status: 'manutenção',
                    quilometragem: 61200,
                },
            ];
            const clientes: LocadoraClienteResponse[] = [
                {
                    nome: 'Joao Silva',
                    cpf: '123.456.789-10',
                    cnh: '12345678900',
                    telefone: '(11) 98888-1111',
                    email: 'joao.silva@exemplo.com',
                },
                {
                    nome: 'Maria Oliveira',
                    cpf: '987.654.321-00',
                    cnh: '00987654321',
                    telefone: '(21) 97777-2222',
                    email: 'maria.oliveira@exemplo.com',
                },
            ];
            const locacoes: LocadoraLocacaoResponse[] = [
                {
                    dataRetirada: '2026-05-20',
                    dataDevolucao: '2026-05-25',
                    valorDiario: 149.9,
                    seguroOpcional: true,
                    formaPagamento: 'cartao',
                    devolucaoPrevista: '2026-05-25',
                    placaVeiculo: 'DEF-4G56',
                    cpf: '123.456.789-10',
                },
                {
                    dataRetirada: '2026-05-28',
                    dataDevolucao: '2026-06-02',
                    valorDiario: 189.9,
                    seguroOpcional: false,
                    formaPagamento: 'pix',
                    devolucaoPrevista: '2026-06-02',
                    placaVeiculo: 'ABC-1D23',
                    cpf: '987.654.321-00',
                },
            ];
            const data = {
                veiculos,
                clientes,
                locacoes,
            };
            this.summary = data;
            setState('db.adminDashboard.summary', data);
            this.status = `${(veiculos?.length ?? 0) + (clientes?.length ?? 0) + (locacoes?.length ?? 0)} ${this.msg.itemsAvailable}`;
            return;
        }

        const response = await execBff<any>('locadora.adminDashboard.getSummary', _params ?? ({} as any), options);
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
            this.summary = undefined;
            return;
        }

        this.summary = response.data ?? undefined;
        setState('db.adminDashboard.summary', this.summary);
        const veiculosLen = (this.summary as any)?.veiculos?.length ?? 0;
        const clientesLen = (this.summary as any)?.clientes?.length ?? 0;
        const locacoesLen = (this.summary as any)?.locacoes?.length ?? 0;
        this.status = `${veiculosLen + clientesLen + locacoesLen} ${this.msg.itemsAvailable}`;
    }

    // No write routines were defined for this page.

    async handleReloadClick(): Promise<void> {
        void runBlockingUiAction(
            async (signal: AbortSignal) => {
                await this.loadInitialData(undefined, { mode: 'blocking', signal });
            },
            {
                busyLabel: this.msg.loadingSummary,
                errorTitle: this.msg.couldNotLoad,
                retry: () => this.loadInitialData(undefined, { mode: 'blocking' }),
            },
        );
    }
}
