/// <mls fileReference="_102035_/l2/locadora/web/shared/clientesLista.ts" enhancement="_102027_/l2/enhancementLit.ts" />

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
import type { LocadoraClienteResponse } from '/_102035_/l2/locadora/web/contracts/clientesLista.js';

/// **collab_i18n_start**
const message_pt = {
brand: 'Locadora',
pageTitle: 'Clientes - Lista',
pageSubtitle: 'Consultar clientes cadastrados.',
loadingListarClientes: 'Carregando clientes...',
itemsAvailable: 'itens disponiveis',
couldNotLoad: 'Nao foi possivel carregar os dados.',
reload: 'Recarregar',
filterNome: 'Nome',
filterCpf: 'CPF',
filterCnh: 'CNH',
filterTelefone: 'Telefone',
filterEmail: 'E-mail',
filterStatusValidacao: 'Status de validacao',
};
const message_en = {
brand: 'Rental',
pageTitle: 'Customers - List',
pageSubtitle: 'Review registered customers.',
loadingListarClientes: 'Loading customers...',
itemsAvailable: 'items available',
couldNotLoad: 'Could not load data.',
reload: 'Reload',
filterNome: 'Name',
filterCpf: 'CPF',
filterCnh: 'CNH',
filterTelefone: 'Phone',
filterEmail: 'Email',
filterStatusValidacao: 'Validation status',
};
type MessageType = typeof message_en;
const messages: { [key: string]: MessageType } = { en: message_en, pt: message_pt };
/// **collab_i18n_end**

export class LocadoraClientesListaBase extends CollabLitElement {
@property() cliente: LocadoraClienteResponse[] = [];
@property() status: string = '';
protected msg: MessageType = messages['en'];

createRenderRoot() { return this; }

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

protected async loadInitialData(_params?: undefined, options?: BffClientOptions): Promise<void> {
await this.loadListarClientes(undefined, options);
}

// ── load methods (one per read routine) ──
async loadListarClientes(
params?: {
nome?: string;
cpf?: string;
cnh?: string;
telefone?: string;
email?: string;
statusValidacao?: string;
page?: number;
pageSize?: number;
sortBy?: string;
sortDir?: string;
},
options?: BffClientOptions,
): Promise<void> {
this.status = this.msg.loadingListarClientes;

if ((window as any).mls) {
this.cliente = [
{
nome: 'Joao Silva',
cpf: '123.456.789-09',
cnh: '12345678900',
telefone: '(11) 98888-7777',
email: 'joao.silva@exemplo.com',
},
{
nome: 'Maria Oliveira',
cpf: '987.654.321-00',
cnh: '00987654321',
telefone: '(21) 97777-6666',
email: 'maria.oliveira@exemplo.com',
},
{
nome: 'Carlos Pereira',
cpf: '111.222.333-44',
cnh: '11223344556',
telefone: '(31) 96666-5555',
email: 'carlos.pereira@exemplo.com',
},
];
this.status = `${this.cliente.length} ${this.msg.itemsAvailable}`;
return;
} else {
const response = await execBff<LocadoraClienteResponse[]>(
'locadora.clientesLista.listarClientes',
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
this.cliente = [];
return;
}
this.cliente = response.data ?? [];
this.status = `${this.cliente.length} ${this.msg.itemsAvailable}`;
}
}

// ── action methods (one per write routine) ──
// (no write routines defined for this page)

// ── form submit handlers (one per write routine that originates from a form) ──
}
