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
import {
  subscribe,
  unsubscribe,
  getState,
  setState,
  initState,
} from '/_102029_/l2/collabState.js';
import type {
  LocadoraClienteResponse,
  LocadoraUpdateClienteRequest,
} from '/_102035_/l2/locadora/web/contracts/clientesCadastro.js';

/// **collab_i18n_start**
const message_pt = {
  brand: 'Locadora',
  pageTitle: 'clientesCadastro',
  pageSubtitle: 'Cadastrar cliente com validacao de CPF e CNH.',

  loadingCliente: 'Carregando dados do cliente...',
  couldNotLoad: 'Nao foi possivel carregar os dados.',

  reload: 'Recarregar',
  save: 'Salvar',
  saving: 'Salvando...',
  confirm: 'Confirmar',
  confirming: 'Confirmando...',

  couldNotSave: 'Nao foi possivel salvar.',
  savedSuccessfully: 'Salvo com sucesso.',

  couldNotCancel: 'Nao foi possivel cancelar.',
  cancelledSuccessfully: 'Cancelado com sucesso.',

  couldNotValidate: 'Nao foi possivel validar CPF/CNH.',
  validatedSuccessfully: 'Validado com sucesso.',

  labelNome: 'Nome',
  labelCpf: 'CPF',
  labelCnh: 'CNH',
  labelTelefone: 'Telefone',
  labelEmail: 'E-mail',

  statusReady: 'Pronto.',
};

const message_en = {
  brand: 'Rental',
  pageTitle: 'clientesCadastro',
  pageSubtitle: 'Register customer with CPF and CNH validation.',

  loadingCliente: 'Loading customer data...',
  couldNotLoad: 'Could not load data.',

  reload: 'Reload',
  save: 'Save',
  saving: 'Saving...',
  confirm: 'Confirm',
  confirming: 'Confirming...',

  couldNotSave: 'Could not save.',
  savedSuccessfully: 'Saved successfully.',

  couldNotCancel: 'Could not cancel.',
  cancelledSuccessfully: 'Cancelled successfully.',

  couldNotValidate: 'Could not validate CPF/CNH.',
  validatedSuccessfully: 'Validated successfully.',

  labelNome: 'Name',
  labelCpf: 'CPF',
  labelCnh: 'CNH',
  labelTelefone: 'Phone',
  labelEmail: 'Email',

  statusReady: 'Ready.',
};

type MessageType = typeof message_en;
const messages: { [key: string]: MessageType } = { en: message_en, pt: message_pt };
/// **collab_i18n_end**

export class LocadoraClientesCadastroBase extends CollabLitElement {
  private readonly _stateKeys = [
    'db.cliente.nome',
    'db.cliente.cpf',
    'db.cliente.cnh',
    'db.cliente.telefone',
    'db.cliente.email',

    'ui.clientesCadastro.cpfMask',
    'ui.clientesCadastro.cnhMask',
    'ui.clientesCadastro.formDirty',
    'ui.clientesCadastro.showValidationHint',
    'ui.clientesCadastro.activeTab',

    '*ui.clientesCadastro.save',
    '*ui.clientesCadastro.cancel',
    '*ui.clientesCadastro.validate',
  ] as const;

  @property() nome: string = '';
  @property() cpf: string = '';
  @property() cnh: string = '';
  @property() telefone: string = '';
  @property() email: string = '';

  @property() cpfMask: string = '000.000.000-00';
  @property() cnhMask: string = '00000000000';
  @property() formDirty: boolean = false;
  @property() showValidationHint: boolean = true;
  @property() activeTab: string = 'dados';

  @property() save: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  @property() cancel: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  @property() validate: 'idle' | 'loading' | 'success' | 'error' = 'idle';

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

    initState('ui.clientesCadastro.cpfMask', '000.000.000-00');
    initState('ui.clientesCadastro.cnhMask', '00000000000');
    initState('ui.clientesCadastro.formDirty', false);
    initState('ui.clientesCadastro.showValidationHint', true);
    initState('ui.clientesCadastro.activeTab', 'dados');

    subscribe(this._stateKeys as unknown as string[], this);

    (this._stateKeys as unknown as string[]).forEach((key) => {
      const k = key.startsWith('*') ? key.slice(1) : key;
      const v = getState(k);
      if (v !== undefined) this.handleIcaStateChange(k, v);
    });

    if (!this.status) this.status = this.msg.statusReady;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    unsubscribe(this._stateKeys as unknown as string[], this);
  }

  handleIcaStateChange(key: string, value: any): void {
    switch (key) {
      case 'db.cliente.nome':
        this.nome = value ?? '';
        break;
      case 'db.cliente.cpf':
        this.cpf = value ?? '';
        break;
      case 'db.cliente.cnh':
        this.cnh = value ?? '';
        break;
      case 'db.cliente.telefone':
        this.telefone = value ?? '';
        break;
      case 'db.cliente.email':
        this.email = value ?? '';
        break;

      case 'ui.clientesCadastro.cpfMask':
        this.cpfMask = value ?? '000.000.000-00';
        break;
      case 'ui.clientesCadastro.cnhMask':
        this.cnhMask = value ?? '00000000000';
        break;
      case 'ui.clientesCadastro.formDirty':
        this.formDirty = value ?? false;
        break;
      case 'ui.clientesCadastro.showValidationHint':
        this.showValidationHint = value ?? true;
        break;
      case 'ui.clientesCadastro.activeTab':
        this.activeTab = value ?? 'dados';
        break;

      case 'ui.clientesCadastro.save':
        this.save = value ?? 'idle';
        break;
      case 'ui.clientesCadastro.cancel':
        this.cancel = value ?? 'idle';
        break;
      case 'ui.clientesCadastro.validate':
        this.validate = value ?? 'idle';
        break;
    }
  }

  async loadInitialData(_params?: undefined, options?: BffClientOptions): Promise<void> {
    // Page has no read routines; keep as a no-op for consistency
    this.status = this.msg.statusReady;
    void options;
  }

  async saveCliente(params: LocadoraUpdateClienteRequest, signal?: AbortSignal): Promise<void> {
    setState('ui.clientesCadastro.save', 'loading');
    try {
      const options: BffClientOptions | undefined = signal ? { mode: 'blocking', signal } : { mode: 'blocking' };

      if ((window as any).mls) {
        console.log('[mls mock] locadora.clientesCadastro.save', params);
        this.status = this.msg.savedSuccessfully;
        setState('ui.clientesCadastro.save', 'success');
        return;
      }

      const response = await execBff<LocadoraClienteResponse>('locadora.clientesCadastro.save', params, options);
      if (!response.ok || !response.data) {
        const err =
          (response.error ?? {
            code: 'UNEXPECTED_ERROR',
            message: this.msg.couldNotSave,
          }) satisfies AuraNormalizedError;
        setState('ui.clientesCadastro.save', 'error');
        throw err;
      }

      const saved = response.data;
      this.nome = saved.nome ?? '';
      this.cpf = saved.cpf ?? '';
      this.cnh = saved.cnh ?? '';
      this.telefone = saved.telefone ?? '';
      this.email = saved.email ?? '';

      setState('db.cliente.nome', this.nome);
      setState('db.cliente.cpf', this.cpf);
      setState('db.cliente.cnh', this.cnh);
      setState('db.cliente.telefone', this.telefone);
      setState('db.cliente.email', this.email);

      this.formDirty = false;
      setState('ui.clientesCadastro.formDirty', false);

      this.status = this.msg.savedSuccessfully;
      setState('ui.clientesCadastro.save', 'success');
    } catch (e) {
      setState('ui.clientesCadastro.save', 'error');
      throw e;
    }
  }

  handleSaveClienteSubmit(event: SubmitEvent) {
    event.preventDefault();

    const params: LocadoraUpdateClienteRequest = {
      nome: this.nome,
      cpf: this.cpf,
      cnh: this.cnh,
      telefone: this.telefone,
      email: this.email,
    };

    void runBlockingUiAction(
      async (signal: AbortSignal) => {
        await this.saveCliente(params, signal);
      },
      {
        busyLabel: this.msg.saving,
        errorTitle: this.msg.couldNotSave,
        retry: () => this.saveCliente(params),
      },
    );
  }

  async cancelCadastro(params: Record<string, never> = {}, signal?: AbortSignal): Promise<void> {
    setState('ui.clientesCadastro.cancel', 'loading');
    try {
      const options: BffClientOptions | undefined = signal ? { mode: 'blocking', signal } : { mode: 'blocking' };

      if ((window as any).mls) {
        console.log('[mls mock] locadora.clientesCadastro.cancel', params);
        this.status = this.msg.cancelledSuccessfully;
        setState('ui.clientesCadastro.cancel', 'success');
        return;
      }

      const response = await execBff<{ ok: boolean }>('locadora.clientesCadastro.cancel', params, options);
      if (!response.ok) {
        const err =
          (response.error ?? {
            code: 'UNEXPECTED_ERROR',
            message: this.msg.couldNotCancel,
          }) satisfies AuraNormalizedError;
        setState('ui.clientesCadastro.cancel', 'error');
        throw err;
      }

      this.status = this.msg.cancelledSuccessfully;
      setState('ui.clientesCadastro.cancel', 'success');
    } catch (e) {
      setState('ui.clientesCadastro.cancel', 'error');
      throw e;
    }
  }

  handleCancelCadastroClick() {
    const params: Record<string, never> = {};

    void runBlockingUiAction(
      async (signal: AbortSignal) => {
        await this.cancelCadastro(params, signal);
      },
      {
        busyLabel: this.msg.confirming,
        errorTitle: this.msg.couldNotCancel,
        retry: () => this.cancelCadastro(params),
      },
    );
  }

  async validateCpfCnh(params: { cpf: string; cnh: string }, signal?: AbortSignal): Promise<void> {
    setState('ui.clientesCadastro.validate', 'loading');
    try {
      const options: BffClientOptions | undefined = signal ? { mode: 'blocking', signal } : { mode: 'blocking' };

      if ((window as any).mls) {
        console.log('[mls mock] locadora.clientesCadastro.validate', params);
        this.status = this.msg.validatedSuccessfully;
        setState('ui.clientesCadastro.validate', 'success');
        return;
      }

      const response = await execBff<{ ok: boolean }>('locadora.clientesCadastro.validate', params, options);
      if (!response.ok) {
        const err =
          (response.error ?? {
            code: 'UNEXPECTED_ERROR',
            message: this.msg.couldNotValidate,
          }) satisfies AuraNormalizedError;
        setState('ui.clientesCadastro.validate', 'error');
        throw err;
      }

      this.status = this.msg.validatedSuccessfully;
      setState('ui.clientesCadastro.validate', 'success');
    } catch (e) {
      setState('ui.clientesCadastro.validate', 'error');
      throw e;
    }
  }

  handleValidateCpfCnhClick() {
    const params = { cpf: this.cpf, cnh: this.cnh };

    void runBlockingUiAction(
      async (signal: AbortSignal) => {
        await this.validateCpfCnh(params, signal);
      },
      {
        busyLabel: this.msg.confirming,
        errorTitle: this.msg.couldNotValidate,
        retry: () => this.validateCpfCnh(params),
      },
    );
  }
}
