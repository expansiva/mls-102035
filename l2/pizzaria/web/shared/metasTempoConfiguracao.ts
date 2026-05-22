/// <mls fileReference="_102035_/l2/pizzaria/web/shared/metasTempoConfiguracao.ts" enhancement="_blank" />

import { CollabLitElement } from '/_102029_/l2/collabLitElement.js';
import type { AuraNormalizedError } from '/_102029_/l2/contracts/bootstrap.js';
import type { BffClientOptions } from '/_102029_/l2/bffClient.js';
import { execBff } from '/_102029_/l2/bffClient.js';
import {
    bindExpectedNavigationLoad,
    consumeExpectedNavigationLoad,
    runBlockingUiAction,
} from '/_102029_/l2/interactionRuntime.js'; 
import type { PizzariaUpdatePedidoParams } from '/_102035_/l1/pizzaria/module.js';

/// **collab_i18n_start**
const message_pt = {
    brand: 'Pizzaria',
    pageTitle: 'Metas de tempo - configuracao',
    pageSubtitle: 'Configurar metas de tempo por etapa e visualizar desvios para controle operacional interno.',
    loadingMetasTempoEtapas: 'Carregando metas de tempo...',
    loadingDesviosTempo: 'Carregando desvios de tempo...',
    couldNotLoad: 'Nao foi possivel carregar os dados.',
    couldNotSave: 'Nao foi possivel salvar as metas.',
    savedSuccessfully: 'Metas salvas com sucesso.',
    reload: 'Recarregar',
    save: 'Salvar',
    saving: 'Salvando...',
    metaRecebidoMin: 'Meta (recebido) - minutos',
    metaProntoMin: 'Meta (pronto) - minutos',
    metaEntregueMin: 'Meta (entregue) - minutos',
    observacao: 'Observacao',
    atualizadoEm: 'Atualizado em',
    atualizadoPor: 'Atualizado por',
    periodoDias: 'Periodo (dias)',
    etapa: 'Etapa',
};

const message_en = {
    brand: 'Pizzaria',
    pageTitle: 'Time targets - configuration',
    pageSubtitle: 'Configure time targets by stage and review deviations for internal operational control.',
    loadingMetasTempoEtapas: 'Loading time targets...',
    loadingDesviosTempo: 'Loading time deviations...',
    couldNotLoad: 'Could not load data.',
    couldNotSave: 'Could not save targets.',
    savedSuccessfully: 'Targets saved successfully.',
    reload: 'Reload',
    save: 'Save',
    saving: 'Saving...',
    metaRecebidoMin: 'Target (received) - minutes',
    metaProntoMin: 'Target (ready) - minutes',
    metaEntregueMin: 'Target (delivered) - minutes',
    observacao: 'Notes',
    atualizadoEm: 'Updated at',
    atualizadoPor: 'Updated by',
    periodoDias: 'Period (days)',
    etapa: 'Stage',
};

type MessageType = typeof message_en;
const messages: { [key: string]: MessageType } = { en: message_en, pt: message_pt };
/// **collab_i18n_end**

type MetasTempo = {
    metaRecebidoMin: number;
    metaProntoMin: number;
    metaEntregueMin: number;
    atualizadoEm?: any;
    atualizadoPor?: string;
    observacao?: string;
};

type DesvioTempo = {
    pedidoId: string;
    etapa: string;
    tempoDecorridoMin: number;
    metaMin: number;
    criadoEm?: any;
    statusPedido?: string;
};

export class PizzariaMetasTempoConfiguracaoBase extends CollabLitElement {
    static properties = {
        metasTempoResumo: { state: true },
        metasTempo: { state: true },
        desviosTempo: { state: true },
        status: { state: true },
    };

    declare metasTempoResumo: MetasTempo | undefined;
    declare metasTempo: MetasTempo | undefined;
    declare desviosTempo: DesvioTempo[];
    declare status: string;

    protected msg: MessageType = messages['en'];

    constructor() {
        super();
        this.metasTempoResumo = undefined;
        this.metasTempo = undefined;
        this.desviosTempo = [];
        this.status = '';
    }

    createRenderRoot() { return this; }

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

    async loadInitialData(_params?: undefined, options?: BffClientOptions): Promise<void> {
        await this.loadGetMetasTempoEtapas(undefined, options);
        await this.loadListDesviosTempo(
            { periodoDias: 7 },
            { ...options, mode: options?.mode === 'blocking' ? 'blocking' : 'silent' },
        );
    }

    // ── load methods (one per read routine) ──
    async loadGetMetasTempoEtapas(_params?: undefined, options?: BffClientOptions): Promise<void> {
        this.status = this.msg.loadingMetasTempoEtapas;

        if ((window as any).mls) {
            const mock: MetasTempo = {
                metaRecebidoMin: 5,
                metaProntoMin: 18,
                metaEntregueMin: 35,
                atualizadoEm: '2026-05-20T10:15:00Z',
                atualizadoPor: 'Joao Silva',
                observacao: 'Metas ajustadas para horario de pico',
            };
            this.metasTempoResumo = {
                metaRecebidoMin: mock.metaRecebidoMin,
                metaProntoMin: mock.metaProntoMin,
                metaEntregueMin: mock.metaEntregueMin,
                atualizadoEm: mock.atualizadoEm,
            };
            this.metasTempo = mock;
            this.status = '';
            return;
        }

        const response = await execBff<MetasTempo>('pizzaria.getMetasTempoEtapas', undefined, options);
        if (!response.ok || !response.data) {
            if (options?.mode === 'blocking') {
                throw (response.error ?? {
                    code: 'UNEXPECTED_ERROR',
                    message: this.msg.couldNotLoad,
                }) satisfies AuraNormalizedError;
            }
            this.status = this.msg.couldNotLoad;
            this.metasTempoResumo = undefined;
            this.metasTempo = undefined;
            return;
        }

        const data = response.data;
        this.metasTempoResumo = {
            metaRecebidoMin: data.metaRecebidoMin,
            metaProntoMin: data.metaProntoMin,
            metaEntregueMin: data.metaEntregueMin,
            atualizadoEm: data.atualizadoEm,
        };
        this.metasTempo = data;
        this.status = '';
    }

    async loadListDesviosTempo(
        params?: { periodoDias?: number; etapa?: string },
        options?: BffClientOptions,
    ): Promise<void> {
        this.status = this.msg.loadingDesviosTempo;

        if ((window as any).mls) {
            this.desviosTempo = [
                {
                    pedidoId: 'PED-1021',
                    etapa: 'preparo',
                    tempoDecorridoMin: 32,
                    metaMin: 18,
                    criadoEm: '2026-05-22T12:03:00Z',
                    statusPedido: 'em preparo',
                },
                {
                    pedidoId: 'PED-1017',
                    etapa: 'entrega',
                    tempoDecorridoMin: 48,
                    metaMin: 35,
                    criadoEm: '2026-05-22T11:10:00Z',
                    statusPedido: 'saiu para entrega',
                },
                {
                    pedidoId: 'PED-1012',
                    etapa: 'recebido',
                    tempoDecorridoMin: 9,
                    metaMin: 5,
                    criadoEm: '2026-05-21T20:40:00Z',
                    statusPedido: 'recebido',
                },
            ];
            this.status = '';
            return;
        }

        const response = await execBff<DesvioTempo[]>('pizzaria.listDesviosTempo', params, options);
        if (!response.ok || !response.data) {
            if (options?.mode === 'blocking') {
                throw (response.error ?? {
                    code: 'UNEXPECTED_ERROR',
                    message: this.msg.couldNotLoad,
                }) satisfies AuraNormalizedError;
            }
            this.status = this.msg.couldNotLoad;
            this.desviosTempo = [];
            return;
        }

        this.desviosTempo = response.data ?? [];
        this.status = '';
    }

    // ── action methods (one per write routine) ──
    async save(params: PizzariaUpdatePedidoParams, signal?: AbortSignal): Promise<void> {
        const options: BffClientOptions = { mode: 'blocking', signal };

        if ((window as any).mls) {
            console.log('[mls mock] pizzaria.save', params);
            this.status = this.msg.savedSuccessfully;
            await this.loadGetMetasTempoEtapas(undefined, { mode: 'silent' });
            await this.loadListDesviosTempo({ periodoDias: 7 }, { mode: 'silent' });
            return;
        }

        const response = await execBff<unknown>('pizzaria.save', params, options);
        if (!response.ok) {
            throw (response.error ?? {
                code: 'UNEXPECTED_ERROR',
                message: this.msg.couldNotSave,
            }) satisfies AuraNormalizedError;
        }

        this.status = this.msg.savedSuccessfully;
        await this.loadGetMetasTempoEtapas(undefined, { mode: 'silent' });
        await this.loadListDesviosTempo({ periodoDias: 7 }, { mode: 'silent' });
    }

    // ── form submit handlers (one per write routine that originates from a form) ──
    handleSaveSubmit(event: SubmitEvent): void {
        event.preventDefault();

        const form = event.currentTarget as HTMLFormElement | null;
        if (!form) return;

        const fd = new FormData(form);

        const metaRecebidoMin = Number(fd.get('metaRecebidoMin') ?? '0');
        const metaProntoMin = Number(fd.get('metaProntoMin') ?? '0');
        const metaEntregueMin = Number(fd.get('metaEntregueMin') ?? '0');
        const observacao = String(fd.get('observacao') ?? '');

        // Page primary entity params are not available in ontology for MetasTempo, so we map into the nearest known update params.
        const params: PizzariaUpdatePedidoParams = {
            id: 'metas-tempo',
            observacoes: `metaRecebidoMin=${metaRecebidoMin}; metaProntoMin=${metaProntoMin}; metaEntregueMin=${metaEntregueMin}; observacao=${observacao}`,
        };

        void runBlockingUiAction(
            async (signal: AbortSignal) => {
                await this.save(params, signal);
            },
            {
                busyLabel: this.msg.saving,
                errorTitle: this.msg.couldNotSave,
                retry: () => this.save(params),
            },
        );
    }
}
