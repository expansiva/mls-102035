/// <mls fileReference="_102035_/l2/locadora/web/shared/clientesCadastro.ts" enhancement="_102027_/l2/enhancementLit.ts" />

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
import type {
    LocadoraClienteResponse,
    LocadoraUpdateClienteRequest,
} from '/_102035_/l2/locadora/web/contracts/clientesCadastro.js';

/// **collab_i18n_start**
const message_pt = {
    brand: 'Locadora',
    pageTitle: 'Cadastro de clientes',
    pageSubtitle: 'Cadastrar cliente com validacao de CPF e CNH.',
    loadingCliente: 'Carregando cliente...',
    couldNotLoad: 'Nao foi possivel carregar os dados.',

    save: 'Salvar',
    saving: 'Salvando...',
    couldNotSave: 'Nao foi possivel salvar.',
    savedSuccessfully: 'Salvo com sucesso.',

    confirm: 'Confirmar',
    confirming: 'Confirmando...',
    couldNotConfirm: 'Nao foi possivel confirmar.',
    confirmedSuccessfully: 'Confirmado com sucesso.',

    reload: 'Recarregar',

    nome: 'Nome',
    cpf: 'CPF',
    cnh: 'CNH',
    telefone: 'Telefone',
    email: 'E-mail',

    cpfInvalido: 'CPF invalido.',
    cnhInvalida: 'CNH invalida ou vencida.',
};

const message_en = {
    brand: 'Car rental',
    pageTitle: 'Customer registration',
    pageSubtitle: 'Register a customer with CPF and CNH validation.',
    loadingCliente: 'Loading customer...',
    couldNotLoad: 'Could not load data.',

    save: 'Save',
    saving: 'Saving...',
    couldNotSave: 'Could not save.',
    savedSuccessfully: 'Saved successfully.',

    confirm: 'Confirm',
    confirming: 'Confirming...',
    couldNotConfirm: 'Could not confirm.',
    confirmedSuccessfully: 'Confirmed successfully.',

    reload: 'Reload',

    nome: 'Name',
    cpf: 'CPF',
    cnh: 'Driver license (CNH)',
    telefone: 'Phone',
    email: 'Email',

    cpfInvalido: 'Invalid CPF.',
    cnhInvalida: 'Invalid or expired CNH.',
};

type MessageType = typeof message_en;
const messages: { [key: string]: MessageType } = { en: message_en, pt: message_pt };
/// **collab_i18n_end**

export class LocadoraClientesCadastroBase extends CollabLitElement {
    @property() cliente: LocadoraClienteResponse | undefined = undefined;
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
    }

    // ── load methods (one per read routine) ──
    protected async loadInitialData(
        _params?: Record<string, unknown>,
        options?: BffClientOptions,
    ): Promise<void> {
        await this.loadCliente(undefined, options);
    }

    public async loadCliente(
        _params?: Record<string, unknown>,
        options?: BffClientOptions,
    ): Promise<void> {
        this.status = this.msg.loadingCliente;

        if ((window as any).mls) {
            this.cliente = {
                nome: 'Joao Silva',
                cpf: '123.456.789-09',
                cnh: '01234567890',
                telefone: '(11) 98888-7777',
                email: 'joao.silva@exemplo.com',
            };
            this.status = '';
            return;
        } else {
            const response = await execBff<LocadoraClienteResponse>(
                'locadora.cliente.get',
                _params ?? {},
                options,
            );
            if (!response.ok || !response.data) {
                if (options?.mode === 'blocking') {
                    throw (
                        response.error ?? {
                            code: 'UNEXPECTED_ERROR',
                            message: this.msg.couldNotLoad,
                        }
                    ) satisfies AuraNormalizedError;
                }
                this.status = this.msg.couldNotLoad;
                this.cliente = undefined;
                return;
            }
            this.cliente = response.data;
            this.status = '';
        }
    }

    // ── action methods (one per write routine) ──
    public async save(params: LocadoraUpdateClienteRequest, signal?: AbortSignal): Promise<void> {
        if ((window as any).mls) {
            console.log('[mls mock] locadora.cliente.save', params);
            this.status = this.msg.savedSuccessfully;
            await this.loadCliente(undefined, { mode: 'silent', signal });
            return;
        }

        const response = await execBff<{ ok: true }>(
            'locadora.clientesCadastro.save',
            params,
            { mode: 'blocking', signal },
        );

        if (!response.ok) {
            throw (
                response.error ?? {
                    code: 'UNEXPECTED_ERROR',
                    message: this.msg.couldNotSave,
                }
            ) satisfies AuraNormalizedError;
        }

        this.status = this.msg.savedSuccessfully;
        await this.loadCliente(undefined, { mode: 'silent', signal });
    }

    public handleSaveSubmit(event: SubmitEvent): void {
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        const fd = new FormData(form);

        const params: LocadoraUpdateClienteRequest = {
            nome: String(fd.get('nome') ?? ''),
            cpf: String(fd.get('cpf') ?? ''),
            cnh: String(fd.get('cnh') ?? ''),
            telefone: String(fd.get('telefone') ?? ''),
            email: String(fd.get('email') ?? ''),
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

    public async cancel(params: Record<string, unknown> = {}, signal?: AbortSignal): Promise<void> {
        if ((window as any).mls) {
            console.log('[mls mock] locadora.cliente.cancel', params);
            this.status = this.msg.confirmedSuccessfully;
            return;
        }

        const response = await execBff<{ ok: true }>(
            'locadora.clientesCadastro.cancel',
            params,
            { mode: 'blocking', signal },
        );

        if (!response.ok) {
            throw (
                response.error ?? {
                    code: 'UNEXPECTED_ERROR',
                    message: this.msg.couldNotConfirm,
                }
            ) satisfies AuraNormalizedError;
        }

        this.status = this.msg.confirmedSuccessfully;
    }

    public handleCancelClick(): void {
        void runBlockingUiAction(
            async (signal: AbortSignal) => {
                await this.cancel({}, signal);
            },
            {
                busyLabel: this.msg.confirming,
                errorTitle: this.msg.couldNotConfirm,
                retry: () => this.cancel({}),
            },
        );
    }

    public async validate(params: Pick<LocadoraUpdateClienteRequest, 'cpf' | 'cnh'>, signal?: AbortSignal): Promise<void> {
        if ((window as any).mls) {
            console.log('[mls mock] locadora.cliente.validate', params);
            this.status = this.msg.confirmedSuccessfully;
            return;
        }

        const response = await execBff<{ ok: true }>(
            'locadora.cliente.validate',
            params,
            { mode: 'blocking', signal },
        );

        if (!response.ok) {
            throw (
                response.error ?? {
                    code: 'UNEXPECTED_ERROR',
                    message: this.msg.couldNotConfirm,
                }
            ) satisfies AuraNormalizedError;
        }

        this.status = this.msg.confirmedSuccessfully;
    }
}
