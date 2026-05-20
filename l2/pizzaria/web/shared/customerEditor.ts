/// <mls fileReference="_102035_/l2/pizzaria/web/shared/customerEditor.ts" enhancement="_blank" />

import { CollabLitElement } from '/_102029_/l2/collabLitElement.js';
import type { AuraNormalizedError } from '/_102029_/l2/contracts/bootstrap.js';
import type { BffClientOptions } from '/_102029_/l2/bffClient.js';
import { execBff } from '/_102029_/l2/bffClient.js';
import {
bindExpectedNavigationLoad,
consumeExpectedNavigationLoad,
runBlockingUiAction,
} from '/_102029_/l2/interactionRuntime.js';
import type { PizzariaUpdateCustomerParams } from '_102035_/l1/pizzaria/module.js';

/// **collab_i18n_start**
const message_pt = {
brand: 'Pizzaria',
pageTitle: 'customerEditor',
pageSubtitle: 'Criar ou editar perfil do cliente para pedidos da pizzaria, incluindo contato e preferencias de entrega.',
loadingGetCustomer: 'Carregando cliente...',
loadingListAddresses: 'Carregando enderecos...',
couldNotLoad: 'Nao foi possivel carregar os dados.',
couldNotSave: 'Nao foi possivel salvar.',
savedSuccessfully: 'Salvo com sucesso.',
reload: 'Recarregar',
save: 'Salvar',
saving: 'Salvando...',
fieldId: 'ID',
fieldFullName: 'Nome completo',
fieldPhone: 'Telefone',
fieldEmail: 'E-mail',
fieldDocumentId: 'Documento',
fieldBirthDate: 'Data de nascimento',
fieldNotes: 'Observacoes',
fieldStatus: 'Status',
fieldPreferredPaymentMethod: 'Forma de pagamento preferida',
fieldMarketingOptIn: 'Aceita marketing',
fieldDeliveryInstructions: 'Instrucoes de entrega',
fieldUpdatedAt: 'Atualizado em',
fieldUpdatedBy: 'Atualizado por',
fieldCreatedAt: 'Criado em',
addressLabel: 'Rotulo',
addressStreet: 'Rua',
addressNumber: 'Numero',
addressComplement: 'Complemento',
addressDistrict: 'Bairro',
addressCity: 'Cidade',
addressState: 'Estado',
addressPostalCode: 'CEP',
addressIsDefault: 'Endereco padrao',
};
const message_en = {
brand: 'Pizzaria',
pageTitle: 'customerEditor',
pageSubtitle: 'Create or edit customer profile for pizzaria ordering, including contact and delivery preferences.',
loadingGetCustomer: 'Loading customer...',
loadingListAddresses: 'Loading addresses...',
couldNotLoad: 'Could not load data.',
couldNotSave: 'Could not save.',
savedSuccessfully: 'Saved successfully.',
reload: 'Reload',
save: 'Save',
saving: 'Saving...',
fieldId: 'ID',
fieldFullName: 'Full name',
fieldPhone: 'Phone',
fieldEmail: 'Email',
fieldDocumentId: 'Document',
fieldBirthDate: 'Birth date',
fieldNotes: 'Notes',
fieldStatus: 'Status',
fieldPreferredPaymentMethod: 'Preferred payment method',
fieldMarketingOptIn: 'Marketing opt-in',
fieldDeliveryInstructions: 'Delivery instructions',
fieldUpdatedAt: 'Updated at',
fieldUpdatedBy: 'Updated by',
fieldCreatedAt: 'Created at',
addressLabel: 'Label',
addressStreet: 'Street',
addressNumber: 'Number',
addressComplement: 'Complement',
addressDistrict: 'District',
addressCity: 'City',
addressState: 'State',
addressPostalCode: 'Postal code',
addressIsDefault: 'Default address',
};
type MessageType = typeof message_en;
const messages: { [key: string]: MessageType } = { en: message_en, pt: message_pt };
/// **collab_i18n_end**

type CustomerDetailShape = {
id: string;
fullName: string;
status?: string;
updatedAt?: string;
updatedBy?: string;
phone: string;
email?: string;
documentId?: string;
birthDate?: string;
notes?: string;
preferredPaymentMethod?: string;
marketingOptIn?: boolean;
deliveryInstructions?: string;
createdAt?: string;
addresses?: unknown;
};

type AddressItemShape = {
id: string;
label?: string;
street: string;
number: string;
complement?: string;
district: string;
city: string;
state: string;
postalCode: string;
isDefault?: boolean;
};

export class PizzariaCustomerEditorBase extends CollabLitElement {
static properties = {
customerDetail: { state: true },
addresses: { state: true },
status: { state: true },
};

declare customerDetail: CustomerDetailShape | undefined;
declare addresses: AddressItemShape[];
declare status: string;

protected msg: MessageType = messages['en'];

createRenderRoot() { return this; }

constructor() {
super();
this.customerDetail = undefined;
this.addresses = [];
this.status = '';
}

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

protected async loadInitialData(
params?: { customerId?: string },
options?: BffClientOptions,
): Promise<void> {
await this.loadGetCustomer(params, options);
await this.loadListAddresses(params, options);
}

// ── load methods (one per read routine) ──
async loadGetCustomer(
params?: { customerId?: string },
options?: BffClientOptions,
): Promise<void> {
this.status = this.msg.loadingGetCustomer;

if ((window as any).mls) {
this.customerDetail = {
id: params?.customerId ?? 'C-1001',
fullName: 'Joao Silva',
phone: '+55 11 98888-7777',
email: 'joao.silva@email.com',
documentId: '123.456.789-00',
birthDate: '1990-05-12',
notes: 'Cliente prefere massa fina.',
status: 'ativo',
preferredPaymentMethod: 'cartao',
marketingOptIn: true,
deliveryInstructions: 'Tocar a campainha e deixar na portaria.',
createdAt: '2026-04-10T14:22:00Z',
updatedAt: '2026-05-18T19:05:00Z',
updatedBy: 'Maria',
};
this.status = '';
return;
}

const response = await execBff<CustomerDetailShape>(
'pizzariaCustomers.getCustomer',
params,
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
this.customerDetail = undefined;
return;
}
this.customerDetail = response.data ?? undefined;
this.status = '';
}

async loadListAddresses(
params?: { customerId?: string },
options?: BffClientOptions,
): Promise<void> {
this.status = this.msg.loadingListAddresses;

if ((window as any).mls) {
this.addresses = [
{
id: 'A-1',
label: 'Casa',
street: 'Rua das Flores',
number: '123',
complement: 'Apto 12',
district: 'Centro',
city: 'Sao Paulo',
state: 'SP',
postalCode: '01001-000',
isDefault: true,
},
{
id: 'A-2',
label: 'Trabalho',
street: 'Avenida Paulista',
number: '1500',
district: 'Bela Vista',
city: 'Sao Paulo',
state: 'SP',
postalCode: '01310-200',
isDefault: false,
},
];
this.status = '';
return;
}

const response = await execBff<AddressItemShape[]>(
'pizzariaCustomers.listAddresses',
params,
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
this.addresses = [];
return;
}
this.addresses = response.data ?? [];
this.status = '';
}

// ── action methods (one per write routine) ──
async save(params: PizzariaUpdateCustomerParams, signal?: AbortSignal): Promise<void> {
if ((window as any).mls) {
console.log('[mls mock] ui.customerEditor.save', params);
this.status = this.msg.savedSuccessfully;
await this.loadInitialData({ customerId: params.customerId }, { mode: 'silent', signal });
return;
}

const response = await execBff<unknown>(
'ui.customerEditor.save',
params,
{ mode: 'blocking', signal },
);

if (!response.ok) {
throw (response.error ?? {
code: 'UNEXPECTED_ERROR',
message: this.msg.couldNotSave,
}) satisfies AuraNormalizedError;
}

this.status = this.msg.savedSuccessfully;
await this.loadInitialData({ customerId: params.customerId }, { mode: 'silent', signal });
}

async delete(params: { customerId: string }, signal?: AbortSignal): Promise<void> {
if ((window as any).mls) {
console.log('[mls mock] ui.customerEditor.delete', params);
this.status = this.msg.savedSuccessfully;
this.customerDetail = undefined;
this.addresses = [];
return;
}

const response = await execBff<unknown>(
'ui.customerEditor.delete',
params,
{ mode: 'blocking', signal },
);

if (!response.ok) {
throw (response.error ?? {
code: 'UNEXPECTED_ERROR',
message: this.msg.couldNotSave,
}) satisfies AuraNormalizedError;
}

this.status = this.msg.savedSuccessfully;
this.customerDetail = undefined;
this.addresses = [];
}

// ── form submit handlers (one per write routine that originates from a form) ──
handleSaveSubmit(event: SubmitEvent) {
event.preventDefault();
const form = event.currentTarget as HTMLFormElement | null;
const fd = new FormData(form ?? undefined);
const customerId = String(fd.get('customerId') ?? this.customerDetail?.id ?? '');

const params: PizzariaUpdateCustomerParams = {
customerId,
name: fd.get('name') != null ? String(fd.get('name')) : undefined,
phone: fd.get('phone') != null ? String(fd.get('phone')) : undefined,
notes: fd.get('notes') != null ? String(fd.get('notes')) : undefined,
};

void runBlockingUiAction(
async (signal: AbortSignal) => { await this.save(params, signal); },
{
busyLabel: this.msg.saving,
errorTitle: this.msg.couldNotSave,
retry: () => this.save(params),
},
);
}

handleDeleteClick(customerId: string) {
const params = { customerId };
void runBlockingUiAction(
async (signal: AbortSignal) => { await this.delete(params, signal); },
{
busyLabel: this.msg.saving,
errorTitle: this.msg.couldNotSave,
retry: () => this.delete(params),
},
);
}
}
