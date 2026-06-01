/// <mls fileReference="_102035_/l2/locadora/web/shared/locacoesCadastro.ts" enhancement="_102027_/l2/enhancementLit.ts" />

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
import type {
    LocadoraLocacaoResponse,
    LocadoraClienteResponse,
    LocadoraVeiculoResponse,
    LocadoraUpdateLocacaoRequest,
} from '/_102035_/l2/locadora/web/contracts/locacoesCadastro.js';

/// **collab_i18n_start**
const message_pt = {
    brand: 'Locadora',
    pageTitle: 'Cadastro de locacoes',
    pageSubtitle: 'Registrar nova locacao com validacoes de cliente e disponibilidade do veiculo.',
    loadingCreateLocacao: 'Carregando dados da nova locacao...',
    loadingValidateCliente: 'Validando cliente...',
    loadingCheckVeiculoAvailability: 'Verificando disponibilidade do veiculo...',
    couldNotLoad: 'Nao foi possivel carregar os dados.',
    couldNotSave: 'Nao foi possivel salvar a locacao.',
    savedSuccessfully: 'Locacao salva com sucesso.',
    reload: 'Recarregar',
    save: 'Salvar',
    saving: 'Salvando...',
    confirm: 'Confirmar',
    confirming: 'Confirmando...',

    // Form labels
    labelDataRetirada: 'Data de retirada',
    labelDataDevolucao: 'Data de devolucao',
    labelValorDiario: 'Valor diario',
    labelSeguroOpcional: 'Seguro opcional',
    labelFormaPagamento: 'Forma de pagamento',
    labelDevolucaoPrevista: 'Devolucao prevista',
    labelPlacaVeiculo: 'Placa do veiculo',
    labelCpf: 'CPF',

    // Validation / availability labels
    labelClienteNome: 'Nome do cliente',
    labelClienteCpf: 'CPF',
    labelClienteCnh: 'CNH',
    labelClienteTelefone: 'Telefone',
    labelClienteEmail: 'E-mail',

    labelVeiculoPlaca: 'Placa',
    labelVeiculoModelo: 'Modelo',
    labelVeiculoAno: 'Ano',
    labelVeiculoCategoria: 'Categoria',
    labelVeiculoStatus: 'Status',
    labelVeiculoQuilometragem: 'Quilometragem',
};
const message_en = {
    brand: 'Car Rental',
    pageTitle: 'Rental registration',
    pageSubtitle: 'Register a new rental with customer validation and vehicle availability checks.',
    loadingCreateLocacao: 'Loading new rental data...',
    loadingValidateCliente: 'Validating customer...',
    loadingCheckVeiculoAvailability: 'Checking vehicle availability...',
    couldNotLoad: 'Could not load data.',
    couldNotSave: 'Could not save the rental.',
    savedSuccessfully: 'Rental saved successfully.',
    reload: 'Reload',
    save: 'Save',
    saving: 'Saving...',
    confirm: 'Confirm',
    confirming: 'Confirming...',

    // Form labels
    labelDataRetirada: 'Pickup date',
    labelDataDevolucao: 'Return date',
    labelValorDiario: 'Daily rate',
    labelSeguroOpcional: 'Optional insurance',
    labelFormaPagamento: 'Payment method',
    labelDevolucaoPrevista: 'Expected return',
    labelPlacaVeiculo: 'Vehicle plate',
    labelCpf: 'CPF',

    // Validation / availability labels
    labelClienteNome: 'Customer name',
    labelClienteCpf: 'CPF',
    labelClienteCnh: 'Driver license',
    labelClienteTelefone: 'Phone',
    labelClienteEmail: 'Email',

    labelVeiculoPlaca: 'Plate',
    labelVeiculoModelo: 'Model',
    labelVeiculoAno: 'Year',
    labelVeiculoCategoria: 'Category',
    labelVeiculoStatus: 'Status',
    labelVeiculoQuilometragem: 'Mileage',
};
type MessageType = typeof message_en;
const messages: { [key: string]: MessageType } = { en: message_en, pt: message_pt };
/// **collab_i18n_end**

export class LocadoraLocacoesCadastroBase extends CollabLitElement {
    private readonly _stateKeys = [
        'db.locacoesCadastro.novaLocacao',
        'db.locacoesCadastro.clienteValidacao',
        'db.locacoesCadastro.veiculoDisponibilidade',
        'ui.locacoesCadastro.form.dataRetirada',
        'ui.locacoesCadastro.form.dataDevolucao',
        'ui.locacoesCadastro.form.valorDiario',
        'ui.locacoesCadastro.form.seguroOpcional',
        'ui.locacoesCadastro.form.formaPagamento',
        'ui.locacoesCadastro.form.devolucaoPrevista',
        'ui.locacoesCadastro.form.clienteSelecionado',
        'ui.locacoesCadastro.form.veiculoSelecionado',
        'ui.locacoesCadastro.form.erroValidacao',
        'ui.locacoesCadastro.clienteValidation.cpfValido',
        'ui.locacoesCadastro.clienteValidation.cnhValida',
        'ui.locacoesCadastro.clienteValidation.mensagemErro',
        'ui.locacoesCadastro.veiculoAvailability.disponivel',
        'ui.locacoesCadastro.veiculoAvailability.alertaExibido',
        'ui.locacoesCadastro.veiculoAvailability.mensagemAlerta',
        'ui.locacoesCadastro.formDirty',
        'ui.locacoesCadastro.confirmacaoAberta',
        'ui.locacoesCadastro.erroGeral',
        '*ui.locacoesCadastro.save',
        '*ui.locacoesCadastro.validateCliente',
        '*ui.locacoesCadastro.checkVeiculo',
        '*ui.locacoesCadastro.cancel',
    ] as const;

    @property() novaLocacao: LocadoraLocacaoResponse | undefined = undefined;
    @property() clienteValidacao: LocadoraClienteResponse | undefined = undefined;
    @property() veiculoDisponibilidade: LocadoraVeiculoResponse | undefined = undefined;

    @property() status: string = '';

    // tempStates (form)
    @property() dataRetirada: string = '';
    @property() dataDevolucao: string = '';
    @property() valorDiario: number = 0;
    @property() seguroOpcional: boolean = false;
    @property() formaPagamento: string = '';
    @property() devolucaoPrevista: string = '';
    @property() clienteSelecionado: string = '';
    @property() veiculoSelecionado: string = '';
    @property() erroValidacao: string = '';

    // tempStates (validations)
    @property() cpfValido: boolean = false;
    @property() cnhValida: boolean = false;
    @property() mensagemErro: string = '';

    // tempStates (availability)
    @property() disponivel: boolean = false;
    @property() alertaExibido: boolean = false;
    @property() mensagemAlerta: string = '';

    // page tempStates
    @property() formDirty: boolean = false;
    @property() confirmacaoAberta: boolean = false;
    @property() erroGeral: string = '';

    // actionStates
    @property() save: 'idle' | 'loading' | 'success' | 'error' = 'idle';
    @property() validateCliente: 'idle' | 'loading' | 'success' | 'error' = 'idle';
    @property() checkVeiculo: 'idle' | 'loading' | 'success' | 'error' = 'idle';
    @property() cancel: 'idle' | 'confirming' | 'cancelled' = 'idle';

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
        initState('ui.locacoesCadastro.form.dataRetirada', '');
        initState('ui.locacoesCadastro.form.dataDevolucao', '');
        initState('ui.locacoesCadastro.form.valorDiario', 0);
        initState('ui.locacoesCadastro.form.seguroOpcional', false);
        initState('ui.locacoesCadastro.form.formaPagamento', '');
        initState('ui.locacoesCadastro.form.devolucaoPrevista', '');
        initState('ui.locacoesCadastro.form.clienteSelecionado', '');
        initState('ui.locacoesCadastro.form.veiculoSelecionado', '');
        initState('ui.locacoesCadastro.form.erroValidacao', '');

        initState('ui.locacoesCadastro.clienteValidation.cpfValido', false);
        initState('ui.locacoesCadastro.clienteValidation.cnhValida', false);
        initState('ui.locacoesCadastro.clienteValidation.mensagemErro', '');

        initState('ui.locacoesCadastro.veiculoAvailability.disponivel', false);
        initState('ui.locacoesCadastro.veiculoAvailability.alertaExibido', false);
        initState('ui.locacoesCadastro.veiculoAvailability.mensagemAlerta', '');

        initState('ui.locacoesCadastro.formDirty', false);
        initState('ui.locacoesCadastro.confirmacaoAberta', false);
        initState('ui.locacoesCadastro.erroGeral', '');

        subscribe(this._stateKeys as unknown as string[], this);

        (this._stateKeys as unknown as string[]).forEach(key => {
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
            case 'db.locacoesCadastro.novaLocacao':
                this.novaLocacao = value ?? undefined;
                break;
            case 'db.locacoesCadastro.clienteValidacao':
                this.clienteValidacao = value ?? undefined;
                break;
            case 'db.locacoesCadastro.veiculoDisponibilidade':
                this.veiculoDisponibilidade = value ?? undefined;
                break;

            case 'ui.locacoesCadastro.form.dataRetirada':
                this.dataRetirada = value ?? '';
                break;
            case 'ui.locacoesCadastro.form.dataDevolucao':
                this.dataDevolucao = value ?? '';
                break;
            case 'ui.locacoesCadastro.form.valorDiario':
                this.valorDiario = value ?? 0;
                break;
            case 'ui.locacoesCadastro.form.seguroOpcional':
                this.seguroOpcional = value ?? false;
                break;
            case 'ui.locacoesCadastro.form.formaPagamento':
                this.formaPagamento = value ?? '';
                break;
            case 'ui.locacoesCadastro.form.devolucaoPrevista':
                this.devolucaoPrevista = value ?? '';
                break;
            case 'ui.locacoesCadastro.form.clienteSelecionado':
                this.clienteSelecionado = value ?? '';
                break;
            case 'ui.locacoesCadastro.form.veiculoSelecionado':
                this.veiculoSelecionado = value ?? '';
                break;
            case 'ui.locacoesCadastro.form.erroValidacao':
                this.erroValidacao = value ?? '';
                break;

            case 'ui.locacoesCadastro.clienteValidation.cpfValido':
                this.cpfValido = value ?? false;
                break;
            case 'ui.locacoesCadastro.clienteValidation.cnhValida':
                this.cnhValida = value ?? false;
                break;
            case 'ui.locacoesCadastro.clienteValidation.mensagemErro':
                this.mensagemErro = value ?? '';
                break;

            case 'ui.locacoesCadastro.veiculoAvailability.disponivel':
                this.disponivel = value ?? false;
                break;
            case 'ui.locacoesCadastro.veiculoAvailability.alertaExibido':
                this.alertaExibido = value ?? false;
                break;
            case 'ui.locacoesCadastro.veiculoAvailability.mensagemAlerta':
                this.mensagemAlerta = value ?? '';
                break;

            case 'ui.locacoesCadastro.formDirty':
                this.formDirty = value ?? false;
                break;
            case 'ui.locacoesCadastro.confirmacaoAberta':
                this.confirmacaoAberta = value ?? false;
                break;
            case 'ui.locacoesCadastro.erroGeral':
                this.erroGeral = value ?? '';
                break;

            case '*ui.locacoesCadastro.save':
                this.save = value ?? 'idle';
                break;
            case '*ui.locacoesCadastro.validateCliente':
                this.validateCliente = value ?? 'idle';
                break;
            case '*ui.locacoesCadastro.checkVeiculo':
                this.checkVeiculo = value ?? 'idle';
                break;
            case '*ui.locacoesCadastro.cancel':
                this.cancel = value ?? 'idle';
                break;
        }
    }

    async loadInitialData(params?: {}, options?: BffClientOptions): Promise<void> {
        await this.loadCreateLocacao(params, options);
        if (this.clienteSelecionado) {
            await this.loadValidateCliente({ clienteId: this.clienteSelecionado }, options);
        }
        if (this.veiculoSelecionado) {
            await this.loadCheckVeiculoAvailability({ placa: this.veiculoSelecionado }, options);
        }
    }

    // ── load methods (one per read routine) ──
    async loadCreateLocacao(params?: {}, options?: BffClientOptions): Promise<void> {
        this.status = this.msg.loadingCreateLocacao;

        if ((window as any).mls) {
            const mock: LocadoraLocacaoResponse = {
                dataRetirada: '2026-06-10',
                dataDevolucao: '2026-06-15',
                valorDiario: 189.9,
                seguroOpcional: true,
                formaPagamento: 'cartao_credito',
                devolucaoPrevista: '2026-06-15T10:00:00',
                placaVeiculo: 'ABC1D23',
                cpf: '123.456.789-09',
            };
            this.novaLocacao = mock;
            setState('db.locacoesCadastro.novaLocacao', mock);
            this.status = '';
            return;
        }

        const response = await execBff<LocadoraLocacaoResponse>(
            'locadora.locacoesCadastro.createLocacao',
            (params ?? {}) as any,
            options,
        );

        if (!response.ok || !response.data) {
            if (options?.mode === 'blocking') {
                throw (
                    (response.error ?? {
                        code: 'UNEXPECTED_ERROR',
                        message: this.msg.couldNotLoad,
                    }) satisfies AuraNormalizedError)
                ;
            }
            this.status = this.msg.couldNotLoad;
            this.novaLocacao = undefined;
            setState('db.locacoesCadastro.novaLocacao', undefined);
            return;
        }

        this.novaLocacao = response.data ?? undefined;
        setState('db.locacoesCadastro.novaLocacao', this.novaLocacao);
        this.status = '';
    }

    async loadValidateCliente(
        params?: { clienteId?: string },
        options?: BffClientOptions,
    ): Promise<void> {
        this.status = this.msg.loadingValidateCliente;

        const effectiveParams = {
            clienteId: params?.clienteId ?? this.clienteSelecionado,
        };

        if ((window as any).mls) {
            const mock: LocadoraClienteResponse = {
                nome: 'Joao Silva',
                cpf: '123.456.789-09',
                cnh: '12345678900',
                telefone: '(11) 98888-7777',
                email: 'joao.silva@email.com',
            };
            this.clienteValidacao = mock;
            setState('db.locacoesCadastro.clienteValidacao', mock);
            this.status = '';
            return;
        }

        const response = await execBff<LocadoraClienteResponse>(
            'locadora.locacoesCadastro.validateCliente',
            effectiveParams as any,
            options,
        );

        if (!response.ok || !response.data) {
            if (options?.mode === 'blocking') {
                throw (
                    (response.error ?? {
                        code: 'UNEXPECTED_ERROR',
                        message: this.msg.couldNotLoad,
                    }) satisfies AuraNormalizedError)
                ;
            }
            this.status = this.msg.couldNotLoad;
            this.clienteValidacao = undefined;
            setState('db.locacoesCadastro.clienteValidacao', undefined);
            return;
        }

        this.clienteValidacao = response.data ?? undefined;
        setState('db.locacoesCadastro.clienteValidacao', this.clienteValidacao);
        this.status = '';
    }

    async loadCheckVeiculoAvailability(
        params?: { placa?: string },
        options?: BffClientOptions,
    ): Promise<void> {
        this.status = this.msg.loadingCheckVeiculoAvailability;

        const effectiveParams = {
            placa: params?.placa ?? this.veiculoSelecionado,
        };

        if ((window as any).mls) {
            const mock: LocadoraVeiculoResponse = {
                placa: effectiveParams.placa || 'DEF4G56',
                modelo: 'Fiat Argo',
                ano: 2023,
                categoria: 'hatch',
                status: 'disponível',
                quilometragem: 35210,
            };
            this.veiculoDisponibilidade = mock;
            setState('db.locacoesCadastro.veiculoDisponibilidade', mock);
            this.status = '';
            return;
        }

        const response = await execBff<LocadoraVeiculoResponse>(
            'locadora.locacoesCadastro.checkVeiculoAvailability',
            effectiveParams as any,
            options,
        );

        if (!response.ok || !response.data) {
            if (options?.mode === 'blocking') {
                throw (
                    (response.error ?? {
                        code: 'UNEXPECTED_ERROR',
                        message: this.msg.couldNotLoad,
                    }) satisfies AuraNormalizedError)
                ;
            }
            this.status = this.msg.couldNotLoad;
            this.veiculoDisponibilidade = undefined;
            setState('db.locacoesCadastro.veiculoDisponibilidade', undefined);
            return;
        }

        this.veiculoDisponibilidade = response.data ?? undefined;
        setState('db.locacoesCadastro.veiculoDisponibilidade', this.veiculoDisponibilidade);
        this.status = '';
    }

    // ── action methods (one per write routine) ──
    async saveLocacao(params: LocadoraUpdateLocacaoRequest, signal?: AbortSignal): Promise<void> {
        setState('ui.locacoesCadastro.save', 'loading');
        this.status = this.msg.saving;

        try {
            if ((window as any).mls) {
                console.log('[mls mock] locadora.locacoesCadastro.save', params);
                this.status = this.msg.savedSuccessfully;
                setState('ui.locacoesCadastro.save', 'success');
                // refresh reads
                await this.loadCreateLocacao(undefined, { mode: 'silent', signal });
                return;
            }

            const response = await execBff<{ ok: true }>(
                'locadora.locacoesCadastro.save',
                params as any,
                { mode: 'blocking', signal },
            );

            if (!response.ok) {
                throw (
                    (response.error ?? {
                        code: 'UNEXPECTED_ERROR',
                        message: this.msg.couldNotSave,
                    }) satisfies AuraNormalizedError)
                ;
            }

            this.status = this.msg.savedSuccessfully;
            setState('ui.locacoesCadastro.save', 'success');

            await this.loadCreateLocacao(undefined, { mode: 'silent', signal });
            await this.loadValidateCliente({ clienteId: this.clienteSelecionado }, { mode: 'silent', signal });
            await this.loadCheckVeiculoAvailability({ placa: this.veiculoSelecionado }, { mode: 'silent', signal });
        } catch (e) {
            setState('ui.locacoesCadastro.save', 'error');
            this.status = this.msg.couldNotSave;
            throw e;
        }
    }

    handleSaveLocacaoSubmit(event: SubmitEvent) {
        event.preventDefault();

        const params: LocadoraUpdateLocacaoRequest = {
            dataRetirada: this.dataRetirada,
            dataDevolucao: this.dataDevolucao,
            valorDiario: this.valorDiario,
            seguroOpcional: this.seguroOpcional,
            formaPagamento: this.formaPagamento,
            devolucaoPrevista: this.devolucaoPrevista,
            placaVeiculo: this.veiculoSelecionado || (this.novaLocacao?.placaVeiculo ?? ''),
            cpf: this.clienteSelecionado || (this.novaLocacao?.cpf ?? ''),
        };

        void runBlockingUiAction(
            async (signal: AbortSignal) => {
                await this.saveLocacao(params, signal);
            },
            {
                busyLabel: this.msg.saving,
                errorTitle: this.msg.couldNotSave,
                retry: () => this.saveLocacao(params),
            },
        );
    }
}
