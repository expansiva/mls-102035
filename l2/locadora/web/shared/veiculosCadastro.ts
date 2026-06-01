/// <mls fileReference="_102035_/l2/locadora/web/shared/veiculosCadastro.ts" enhancement="_102027_/l2/enhancementLit.ts" />

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
import type { LocadoraVeiculoResponse } from '/_102035_/l2/locadora/web/contracts/veiculosCadastro.js';

/// **collab_i18n_start**
const message_pt = {
    brand: 'Locadora',
    pageTitle: 'Cadastro de veiculos',
    pageSubtitle: 'Cadastrar veiculo da frota com dados obrigatorios.',
    loadingStatusOptions: 'Carregando opcoes de status...',
    couldNotLoad: 'Nao foi possivel carregar os dados.',
    couldNotSave: 'Nao foi possivel salvar.',
    savedSuccessfully: 'Salvo com sucesso.',
    reload: 'Recarregar',
    save: 'Salvar',
    saving: 'Salvando...',
    placa: 'Placa',
    modelo: 'Modelo',
    ano: 'Ano',
    categoria: 'Categoria',
    status: 'Status',
    quilometragem: 'Quilometragem',
};
const message_en = {
    brand: 'Car rental',
    pageTitle: 'Vehicle registration',
    pageSubtitle: 'Register a fleet vehicle with required data.',
    loadingStatusOptions: 'Loading status options...',
    couldNotLoad: 'Could not load data.',
    couldNotSave: 'Could not save.',
    savedSuccessfully: 'Saved successfully.',
    reload: 'Reload',
    save: 'Save',
    saving: 'Saving...',
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

export class LocadoraVeiculosCadastroBase extends CollabLitElement {
    private readonly _stateKeys = [
        'db.veiculo.placa',
        'db.veiculo.modelo',
        'db.veiculo.ano',
        'db.veiculo.categoria',
        'db.veiculo.status',
        'db.veiculo.quilometragem',
        'config.locadora.statusVeiculoOptions',
        'ui.veiculosCadastro.form.errors',
        'ui.veiculosCadastro.form.dirty',
        'ui.veiculosCadastro.statusOptions',
        '*ui.veiculosCadastro.saveVeiculo',
        '*ui.veiculosCadastro.loadStatusOptions',
    ] as const;

    @property() placa: string = '';
    @property() modelo: string = '';
    @property() ano: number = 0;
    @property() categoria: string = '';
    @property() statusVeiculo: string = '';
    @property() quilometragem: number = 0;

    @property() statusVeiculoOptions: { values: LocadoraVeiculoResponse['status'][] } | undefined = undefined;

    @property() formErrors: Record<string, string> = {};
    @property() formDirty: boolean = false;
    @property() statusOptions: string[] = [];

    @property() saveVeiculo: 'idle' | 'loading' | 'success' | 'error' = 'idle';
    @property() loadStatusOptions: 'idle' | 'loading' | 'success' | 'error' = 'idle';

    @property() status: string = '';

    protected msg: MessageType = messages['en'];

    createRenderRoot() {
        return this;
    }

    connectedCallback() {
        super.connectedCallback();

        const pendingLoad = consumeExpectedNavigationLoad();
        const task = this.loadInitialData(undefined, {
            mode: 'silent',
            signal: pendingLoad?.signal,
        });
        bindExpectedNavigationLoad(pendingLoad, task);
        void task.catch(() => undefined);

        const lang: string = this.getMessageKey(messages);
        this.msg = messages[lang] || messages['en'];

        initState('ui.veiculosCadastro.form.dirty', false);
        initState('ui.veiculosCadastro.statusOptions', ['disponível', 'locado', 'manutenção']);

        subscribe(this._stateKeys as unknown as string[], this);

        (this._stateKeys as unknown as string[]).forEach((key) => {
            const k = key.startsWith('*') ? key.slice(1) : key;
            const v = getState(k);
            if (v !== undefined) this.handleIcaStateChange(k, v);
        });
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        unsubscribe(this._stateKeys as unknown as string[], this);
    }

    handleIcaStateChange(key: string, value: any): void {
        switch (key) {
            case 'db.veiculo.placa':
                this.placa = value ?? '';
                break;
            case 'db.veiculo.modelo':
                this.modelo = value ?? '';
                break;
            case 'db.veiculo.ano':
                this.ano = value ?? 0;
                break;
            case 'db.veiculo.categoria':
                this.categoria = value ?? '';
                break;
            case 'db.veiculo.status':
                this.statusVeiculo = value ?? '';
                break;
            case 'db.veiculo.quilometragem':
                this.quilometragem = value ?? 0;
                break;
            case 'config.locadora.statusVeiculoOptions':
                this.statusVeiculoOptions = value ?? undefined;
                break;
            case 'ui.veiculosCadastro.form.errors':
                this.formErrors = value ?? {};
                break;
            case 'ui.veiculosCadastro.form.dirty':
                this.formDirty = value ?? false;
                break;
            case 'ui.veiculosCadastro.statusOptions':
                this.statusOptions = value ?? [];
                break;
            case 'ui.veiculosCadastro.saveVeiculo':
                this.saveVeiculo = value ?? 'idle';
                break;
            case 'ui.veiculosCadastro.loadStatusOptions':
                this.loadStatusOptions = value ?? 'idle';
                break;
            default:
                break;
        }
    }

    async loadInitialData(_params?: unknown, options?: BffClientOptions): Promise<void> {
        await this.loadGetStatusVeiculoOptions(undefined, options);
    }

    async loadGetStatusVeiculoOptions(
        _params?: {},
        options?: BffClientOptions,
    ): Promise<void> {
        setState('ui.veiculosCadastro.loadStatusOptions', 'loading');
        try {
            if ((window as any).mls) {
                const mockValues: LocadoraVeiculoResponse['status'][] = ['disponível', 'locado', 'manutenção'];
                this.statusVeiculoOptions = { values: mockValues };
                this.statusOptions = [...mockValues];
                setState('config.locadora.statusVeiculoOptions', this.statusVeiculoOptions);
                setState('ui.veiculosCadastro.statusOptions', this.statusOptions);
                this.status = `${this.statusOptions.length} ${this.msg.status}`;
                setState('ui.veiculosCadastro.loadStatusOptions', 'success');
                return;
            }

            const response = await execBff<{ values: LocadoraVeiculoResponse['status'][] }>(
                'locadora.veiculosCadastro.getStatusVeiculoOptions',
                _params,
                options,
            );

            if (!response.ok || !response.data) {
                setState('ui.veiculosCadastro.loadStatusOptions', 'error');
                if (options?.mode === 'blocking') {
                    throw (response.error ?? {
                        code: 'UNEXPECTED_ERROR',
                        message: this.msg.couldNotLoad,
                    }) satisfies AuraNormalizedError;
                }
                this.status = this.msg.couldNotLoad;
                this.statusVeiculoOptions = undefined;
                this.statusOptions = [];
                setState('config.locadora.statusVeiculoOptions', this.statusVeiculoOptions);
                setState('ui.veiculosCadastro.statusOptions', this.statusOptions);
                return;
            }

            this.statusVeiculoOptions = response.data;
            this.statusOptions = [...(response.data.values ?? [])];
            setState('config.locadora.statusVeiculoOptions', this.statusVeiculoOptions);
            setState('ui.veiculosCadastro.statusOptions', this.statusOptions);
            this.status = `${this.statusOptions.length} ${this.msg.status}`;
            setState('ui.veiculosCadastro.loadStatusOptions', 'success');
        } catch (e) {
            setState('ui.veiculosCadastro.loadStatusOptions', 'error');
            throw e;
        }
    }

    async saveVeiculoAction(params: LocadoraUpdateVeiculoRequest, signal?: AbortSignal): Promise<void> {
        setState('ui.veiculosCadastro.saveVeiculo', 'loading');
        try {
            if ((window as any).mls) {
                console.log('[mls mock] locadora.veiculosCadastro.saveVeiculo', params);
                this.status = this.msg.savedSuccessfully;
                setState('ui.veiculosCadastro.saveVeiculo', 'success');
                return;
            }

            const response = await execBff<LocadoraVeiculoResponse>(
                'locadora.veiculosCadastro.saveVeiculo',
                params,
                { mode: 'blocking', signal },
            );

            if (!response.ok || !response.data) {
                setState('ui.veiculosCadastro.saveVeiculo', 'error');
                throw (response.error ?? {
                    code: 'UNEXPECTED_ERROR',
                    message: this.msg.couldNotSave,
                }) satisfies AuraNormalizedError;
            }

            this.status = this.msg.savedSuccessfully;
            setState('ui.veiculosCadastro.saveVeiculo', 'success');

            // Refresh dependent data if needed
            await this.loadGetStatusVeiculoOptions(undefined, { mode: 'silent', signal });
        } catch (e) {
            setState('ui.veiculosCadastro.saveVeiculo', 'error');
            throw e;
        }
    }

    handleSaveVeiculoSubmit(event: SubmitEvent): void {
        event.preventDefault();

        const params: LocadoraUpdateVeiculoRequest = {
            placa: this.placa,
            modelo: this.modelo,
            ano: this.ano,
            categoria: this.categoria,
            status: (this.statusVeiculo as LocadoraVeiculoResponse['status']) || undefined,
            quilometragem: this.quilometragem,
            author: 'admin',
        };

        void runBlockingUiAction(
            async (signal: AbortSignal) => {
                await this.saveVeiculoAction(params, signal);
            },
            {
                busyLabel: this.msg.saving,
                errorTitle: this.msg.couldNotSave,
                retry: () => this.saveVeiculoAction(params),
            },
        );
    }
}

type LocadoraUpdateVeiculoRequest = {
    placa: string;
    modelo?: string;
    ano?: number;
    categoria?: string;
    status?: LocadoraVeiculoResponse['status'];
    quilometragem?: number;
    author?: string;
};
