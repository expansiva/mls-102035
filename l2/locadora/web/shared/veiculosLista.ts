/// <mls fileReference="_102035_/l2/locadora/web/shared/veiculosLista.ts" enhancement="_102027_/l2/enhancementLit.ts" />

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
import type { LocadoraVeiculoResponse } from '/_102035_/l2/locadora/web/contracts/veiculosLista.js';

/// **collab_i18n_start**
const message_pt = {
    brand: 'Locadora',
    pageTitle: 'Lista de veiculos',
    pageSubtitle: 'Consultar e filtrar veiculos cadastrados.',
    loadingVeiculos: 'Carregando veiculos...',
    couldNotLoad: 'Nao foi possivel carregar os dados.',
    itemsAvailable: 'itens disponiveis',
    reload: 'Recarregar',
    filterStatus: 'Status',
    placa: 'Placa',
    modelo: 'Modelo',
    ano: 'Ano',
    categoria: 'Categoria',
    status: 'Status',
    quilometragem: 'Quilometragem',
};
const message_en = {
    brand: 'Car Rental',
    pageTitle: 'Vehicles list',
    pageSubtitle: 'Browse and filter registered vehicles.',
    loadingVeiculos: 'Loading vehicles...',
    couldNotLoad: 'Could not load data.',
    itemsAvailable: 'items available',
    reload: 'Reload',
    filterStatus: 'Status',
    placa: 'Plate',
    modelo: 'Model',
    ano: 'Year',
    categoria: 'Category',
    status: 'Status',
    quilometragem: 'Mileage',
};
type MessageType = typeof message_en;
const messages: { [key: string]: MessageType } = { en: message_en, pt: message_pt };
/// **collab_i18n_end**

export class LocadoraVeiculosListaBase extends CollabLitElement {
    private readonly _stateKeys = [
        'db.veiculo.status',
        'db.veiculo[]',
        'ui.veiculosLista.filter.status',
        'ui.veiculosLista.sort.by',
        '*ui.veiculosLista.loading',
        '*ui.veiculosLista.error',
    ] as const;

    @property() veiculo: LocadoraVeiculoResponse[] = [];
    @property() status: string = '';

    // shape 'fields'
    @property() veiculoStatus: string = '';

    // tempStates
    @property() filterStatus: string = 'todos';
    @property() sortBy: string = 'placa';

    // actionStates
    @property() loading: 'idle' | 'loading' | 'success' | 'error' = 'idle';
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

        initState('ui.veiculosLista.filter.status', 'todos');
        initState('ui.veiculosLista.sort.by', 'placa');

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
            case 'db.veiculo.status':
                this.veiculoStatus = value ?? '';
                break;
            case 'db.veiculo[]':
                this.veiculo = value ?? [];
                break;
            case 'ui.veiculosLista.filter.status':
                this.filterStatus = value ?? 'todos';
                break;
            case 'ui.veiculosLista.sort.by':
                this.sortBy = value ?? 'placa';
                break;
            case '*ui.veiculosLista.loading':
                // some runtimes may emit exclusive keys; normalize
                this.loading = value ?? 'idle';
                break;
            case 'ui.veiculosLista.loading':
                this.loading = value ?? 'idle';
                break;
            case '*ui.veiculosLista.error':
                this.error = value ?? 'idle';
                break;
            case 'ui.veiculosLista.error':
                this.error = value ?? 'idle';
                break;
            default:
                break;
        }
    }

    async loadInitialData(params?: { status?: string }, options?: BffClientOptions): Promise<void> {
        await this.loadListVeiculos(params, options);
    }

    // ── load methods ──
    async loadListVeiculos(params?: { status?: string }, options?: BffClientOptions): Promise<void> {
        const statusParam = params?.status ?? (getState('ui.veiculosLista.filter.status') as string | undefined) ?? this.filterStatus;
        setState('ui.veiculosLista.loading', 'loading');
        setState('ui.veiculosLista.error', 'idle');
        this.status = this.msg.loadingVeiculos;

        try {
            if ((window as any).mls) {
                const mocked: LocadoraVeiculoResponse[] = [
                    {
                        placa: 'ABC1D23',
                        modelo: 'Fiat Argo',
                        ano: 2022,
                        categoria: 'Hatch',
                        status: 'disponível',
                        quilometragem: 35210,
                    },
                    {
                        placa: 'DEF4G56',
                        modelo: 'Chevrolet Onix',
                        ano: 2021,
                        categoria: 'Hatch',
                        status: 'locado',
                        quilometragem: 48700,
                    },
                    {
                        placa: 'HIJ7K89',
                        modelo: 'Volkswagen T-Cross',
                        ano: 2023,
                        categoria: 'SUV',
                        status: 'manutenção',
                        quilometragem: 12990,
                    },
                ];
                const filtered = statusParam && statusParam !== 'todos' ? mocked.filter((v) => v.status === statusParam) : mocked;
                this.veiculo = filtered;
                setState('db.veiculo[]', filtered);
                this.status = `${this.veiculo.length} ${this.msg.itemsAvailable}`;
                setState('ui.veiculosLista.loading', 'success');
                return;
            }

            const response = await execBff<LocadoraVeiculoResponse[]>(
                'locadora.veiculosLista.listVeiculos',
                { status: statusParam },
                options,
            );

            if (!response.ok || !response.data) {
                setState('ui.veiculosLista.error', 'error');
                setState('ui.veiculosLista.loading', 'error');
                if (options?.mode === 'blocking') {
                    throw (
                        (response.error ?? {
                            code: 'UNEXPECTED_ERROR',
                            message: this.msg.couldNotLoad,
                        }) satisfies AuraNormalizedError
                    );
                }
                this.status = this.msg.couldNotLoad;
                this.veiculo = [];
                setState('db.veiculo[]', []);
                return;
            }

            this.veiculo = response.data ?? [];
            setState('db.veiculo[]', this.veiculo);
            this.status = `${this.veiculo.length} ${this.msg.itemsAvailable}`;
            setState('ui.veiculosLista.loading', 'success');
        } catch (e) {
            setState('ui.veiculosLista.error', 'error');
            setState('ui.veiculosLista.loading', 'error');
            throw e;
        }
    }

    // ── helpers ──
    handleReloadClick(): void {
        void runBlockingUiAction(
            async (signal: AbortSignal) => {
                await this.loadListVeiculos(undefined, { mode: 'blocking', signal });
            },
            {
                busyLabel: this.msg.loadingVeiculos,
                errorTitle: this.msg.couldNotLoad,
                retry: () => this.loadListVeiculos(),
            },
        );
    }
}
