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
import type {
LocadoraClienteResponse,
LocadoraLocacaoResponse,
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
couldNotSave: 'Nao foi possivel salvar.',
savedSuccessfully: 'Salvo com sucesso.',
reload: 'Recarregar',
save: 'Salvar',
saving: 'Salvando...',
confirm: 'Confirmar',
confirming: 'Confirmando...',
fieldDataRetirada: 'Data de retirada',
fieldDataDevolucao: 'Data de devolucao',
fieldValorDiario: 'Valor diario',
fieldSeguroOpcional: 'Seguro opcional',
fieldFormaPagamento: 'Forma de pagamento',
fieldDevolucaoPrevista: 'Devolucao prevista',
fieldPlacaVeiculo: 'Placa do veiculo',
fieldClienteId: 'Cliente',
};

const message_en = {
brand: 'Car Rental',
pageTitle: 'Rentals registration',
pageSubtitle: 'Register a new rental with customer validation and vehicle availability checks.',
loadingCreateLocacao: 'Loading new rental data...',
loadingValidateCliente: 'Validating customer...',
loadingCheckVeiculoAvailability: 'Checking vehicle availability...',
couldNotLoad: 'Could not load data.',
couldNotSave: 'Could not save.',
savedSuccessfully: 'Saved successfully.',
reload: 'Reload',
save: 'Save',
saving: 'Saving...',
confirm: 'Confirm',
confirming: 'Confirming...',
fieldDataRetirada: 'Pickup date',
fieldDataDevolucao: 'Return date',
fieldValorDiario: 'Daily rate',
fieldSeguroOpcional: 'Optional insurance',
fieldFormaPagamento: 'Payment method',
fieldDevolucaoPrevista: 'Expected return',
fieldPlacaVeiculo: 'Vehicle plate',
fieldClienteId: 'Customer',
};

type MessageType = typeof message_en;
const messages: { [key: string]: MessageType } = { en: message_en, pt: message_pt };
/// **collab_i18n_end**

export class LocadoraLocacoesCadastroBase extends CollabLitElement {
@property() novaLocacao: LocadoraLocacaoResponse | undefined = undefined;
@property() clienteValidacao: LocadoraClienteResponse | undefined = undefined;
@property() veiculoDisponibilidade: LocadoraVeiculoResponse | undefined = undefined;
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

async loadInitialData(_params?: {}, options?: BffClientOptions): Promise<void> {
await this.loadCreateLocacao(undefined, options);
}

// ── load methods (one per read routine) ──
async loadCreateLocacao(params?: {}, options?: BffClientOptions): Promise<void> {
this.status = this.msg.loadingCreateLocacao;

if ((window as any).mls) {
this.novaLocacao = {
dataRetirada: '2026-06-01',
dataDevolucao: '2026-06-05',
valorDiario: 149.9,
seguroOpcional: true,
formaPagamento: 'cartao_credito',
devolucaoPrevista: '2026-06-05T18:00:00',
placaVeiculo: 'ABC1D23',
};
this.status = '';
return;
} else {
const response = await execBff<LocadoraLocacaoResponse>(
'locadora.locacoesCadastro.createLocacao',
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
this.novaLocacao = undefined;
return;
}
this.novaLocacao = response.data;
this.status = '';
}
}

async loadValidateCliente(
params?: { clienteId: string },
options?: BffClientOptions,
): Promise<void> {
this.status = this.msg.loadingValidateCliente;

if ((window as any).mls) {
this.clienteValidacao = {
nome: 'Joao Silva',
cpf: '123.456.789-09',
cnh: '12345678900',
telefone: '(11) 98888-7777',
email: 'joao.silva@exemplo.com',
};
this.status = '';
return;
} else {
const response = await execBff<LocadoraClienteResponse>(
'locadora.locacoesCadastro.validateCliente',
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
this.clienteValidacao = undefined;
return;
}
this.clienteValidacao = response.data;
this.status = '';
}
}

async loadCheckVeiculoAvailability(
params?: { placa: string },
options?: BffClientOptions,
): Promise<void> {
this.status = this.msg.loadingCheckVeiculoAvailability;

if ((window as any).mls) {
this.veiculoDisponibilidade = {
placa: params?.placa || 'DEF4G56',
modelo: 'Fiat Argo',
ano: 2023,
categoria: 'hatch',
status: 'disponível',
quilometragem: 28540,
};
this.status = '';
return;
} else {
const response = await execBff<LocadoraVeiculoResponse>(
'locadora.locacoesCadastro.checkVeiculoAvailability',
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
this.veiculoDisponibilidade = undefined;
return;
}
this.veiculoDisponibilidade = response.data;
this.status = '';
}
}

// ── action methods (one per write routine) ──
async cancel(params?: { reason?: string }, signal?: AbortSignal): Promise<void> {
if ((window as any).mls) {
console.log('[mls mock] ui.locacoesCadastro.cancel', params);
this.status = this.msg.savedSuccessfully;
return;
}
// No backend routine specified for cancel in the page spec.
// Keep as a no-op action with local status.
if (signal?.aborted) return;
this.status = '';
}

async handleCancelClick(): Promise<void> {
const params: { reason?: string } = {};
void runBlockingUiAction(
async (signal: AbortSignal) => {
await this.cancel(params, signal);
},
{
busyLabel: this.msg.confirming,
errorTitle: this.msg.couldNotSave,
retry: () => this.cancel(params),
},
);
}

async save(params: LocadoraUpdateLocacaoRequest, options?: BffClientOptions): Promise<void> {
if ((window as any).mls) {
console.log('[mls mock] locadora.locacoesCadastro.save', params);
this.status = this.msg.savedSuccessfully;
await this.loadCreateLocacao(undefined, { mode: 'silent' });
return;
}

const response = await execBff<unknown>('locadora.locacoesCadastro.save', params, options);
if (!response.ok) {
if (options?.mode === 'blocking') {
throw (
response.error ??
({
code: 'UNEXPECTED_ERROR',
message: this.msg.couldNotSave,
} satisfies AuraNormalizedError)
);
}
this.status = this.msg.couldNotSave;
return;
}

this.status = this.msg.savedSuccessfully;
await this.loadCreateLocacao(undefined, { mode: 'silent', signal: options?.signal });
}

async handleSaveSubmit(event: SubmitEvent): Promise<void> {
event.preventDefault();

// Expect form controls to be named following the field ids; adjust in the view layer as needed.
const form = event.currentTarget as HTMLFormElement;
const fd = new FormData(form);

const params: LocadoraUpdateLocacaoRequest = {
dataRetirada: String(fd.get('dataRetirada') ?? ''),
dataDevolucao: String(fd.get('dataDevolucao') ?? ''),
valorDiario: Number(fd.get('valorDiario') ?? 0),
seguroOpcional: String(fd.get('seguroOpcional') ?? '') === 'true' || fd.get('seguroOpcional') === 'on',
formaPagamento: String(fd.get('formaPagamento') ?? ''),
devolucaoPrevista: String(fd.get('devolucaoPrevista') ?? ''),
placaVeiculo: String(fd.get('placaVeiculo') ?? ''),
};

void runBlockingUiAction(
async (signal: AbortSignal) => {
await this.save(params, { mode: 'blocking', signal });
},
{
busyLabel: this.msg.saving,
errorTitle: this.msg.couldNotSave,
retry: () => this.save(params, { mode: 'blocking' }),
},
);
}

async validateCliente(params: { clienteId: string }, signal?: AbortSignal): Promise<void> {
await this.loadValidateCliente(params, { mode: 'blocking', signal });
}

async handleValidateClienteClick(clienteId: string): Promise<void> {
const params = { clienteId };
void runBlockingUiAction(
async (signal: AbortSignal) => {
await this.validateCliente(params, signal);
},
{
busyLabel: this.msg.loadingValidateCliente,
errorTitle: this.msg.couldNotLoad,
retry: () => this.validateCliente(params),
},
);
}

async checkVeiculo(params: { placa: string }, signal?: AbortSignal): Promise<void> {
await this.loadCheckVeiculoAvailability(params, { mode: 'blocking', signal });
}

async handleCheckVeiculoClick(placa: string): Promise<void> {
const params = { placa };
void runBlockingUiAction(
async (signal: AbortSignal) => {
await this.checkVeiculo(params, signal);
},
{
busyLabel: this.msg.loadingCheckVeiculoAvailability,
errorTitle: this.msg.couldNotLoad,
retry: () => this.checkVeiculo(params),
},
);
}

// ── form submit handlers (one per write routine that originates from a form) ──
}
