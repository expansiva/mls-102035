/// <mls fileReference="_102035_/l2/pizzaria/web/shared/areaPublicaAcompanhamento.ts" enhancement="_blank" />

import { CollabLitElement } from '/_102029_/l2/collabLitElement.js';
import type { AuraNormalizedError } from '/_102029_/l2/contracts/bootstrap.js';
import type { BffClientOptions } from '/_102029_/l2/bffClient.js';
import { execBff } from '/_102029_/l2/bffClient.js';
import {
bindExpectedNavigationLoad,
consumeExpectedNavigationLoad,
runBlockingUiAction,
} from '/_102029_/l2/interactionRuntime.js';
import type {
PizzariaConfiguracaoWhatsApp,
PizzariaEntrega,
PizzariaItemPedido,
PizzariaPedido,
PizzariaTempoAlvoEtapa,
} from '/_102035_/l1/pizzaria/module.js';

/// **collab_i18n_start**
const message_pt = {
brand: 'Pizzaria',
pageTitle: 'areaPublicaAcompanhamento',
pageSubtitle: 'Acompanhar pedido online em tempo real com status, detalhes e contato.',
loadingPedidoResumo: 'Carregando resumo do pedido...',
loadingEtapas: 'Carregando etapas do pedido...',
loadingItens: 'Carregando itens do pedido...',
loadingEntrega: 'Carregando dados de entrega...',
loadingWhatsapp: 'Carregando contato do WhatsApp...',
couldNotLoad: 'Nao foi possivel carregar os dados.',
reload: 'Recarregar',
confirm: 'Confirmar',
confirming: 'Confirmando...',
save: 'Salvar',
saving: 'Salvando...',
itemsAvailable: 'itens disponiveis',
labelPedidoId: 'Pedido',
labelStatus: 'Status',
labelTipo: 'Tipo',
labelTotal: 'Total',
labelOrigem: 'Origem',
labelEnderecoEntrega: 'Endereco de entrega',
labelZonaEntregaId: 'Zona de entrega',
labelTaxaEntrega: 'Taxa de entrega',
labelEntregaStatus: 'Status da entrega',
labelEtapa: 'Etapa',
labelTempoAlvoMin: 'Tempo alvo (min)',
labelAtivo: 'Ativo',
labelProdutoId: 'Produto',
labelQuantidade: 'Quantidade',
labelPrecoUnitario: 'Preco unitario',
labelObservacoes: 'Observacoes',
labelNumeroTelefone: 'Numero do WhatsApp',
};
const message_en = {
brand: 'Pizzeria',
pageTitle: 'areaPublicaAcompanhamento',
pageSubtitle: 'Track an order online in real time with status, details, and contact.',
loadingPedidoResumo: 'Loading order summary...',
loadingEtapas: 'Loading order stages...',
loadingItens: 'Loading order items...',
loadingEntrega: 'Loading delivery details...',
loadingWhatsapp: 'Loading WhatsApp contact...',
couldNotLoad: 'Could not load data.',
reload: 'Reload',
confirm: 'Confirm',
confirming: 'Confirming...',
save: 'Save',
saving: 'Saving...',
itemsAvailable: 'items available',
labelPedidoId: 'Order',
labelStatus: 'Status',
labelTipo: 'Type',
labelTotal: 'Total',
labelOrigem: 'Origin',
labelEnderecoEntrega: 'Delivery address',
labelZonaEntregaId: 'Delivery zone',
labelTaxaEntrega: 'Delivery fee',
labelEntregaStatus: 'Delivery status',
labelEtapa: 'Stage',
labelTempoAlvoMin: 'Target time (min)',
labelAtivo: 'Active',
labelProdutoId: 'Product',
labelQuantidade: 'Quantity',
labelPrecoUnitario: 'Unit price',
labelObservacoes: 'Notes',
labelNumeroTelefone: 'WhatsApp number',
};
type MessageType = typeof message_en;
const messages: { [key: string]: MessageType } = { en: message_en, pt: message_pt };
/// **collab_i18n_end**

export class PizzariaAreaPublicaAcompanhamentoBase extends CollabLitElement {
static properties = {
pedidoResumo: { state: true },
etapas: { state: true },
itens: { state: true },
entrega: { state: true },
whatsapp: { state: true },
status: { state: true },
};

declare pedidoResumo: PizzariaPedido | undefined;
declare etapas: PizzariaTempoAlvoEtapa[];
declare itens: PizzariaItemPedido[];
declare entrega: PizzariaEntrega | undefined;
declare whatsapp: PizzariaConfiguracaoWhatsApp | undefined;
declare status: string;

protected msg: MessageType = messages['en'];

constructor() {
super();
this.pedidoResumo = undefined;
this.etapas = [];
this.itens = [];
this.entrega = undefined;
this.whatsapp = undefined;
this.status = '';
}

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

protected async loadInitialData(
params?: { pedidoId?: string },
options?: BffClientOptions,
): Promise<void> {
await this.loadGetPedidoResumoPublico(params, options);
await this.loadListPedidoEtapasPublico(params, options);
await this.loadListItensPedidoPublico(params, options);
await this.loadGetEntregaPublica(params, options);
await this.loadGetConfiguracaoWhatsAppPublica(undefined, options);
}

// ── load methods (one per read routine) ──

async loadGetPedidoResumoPublico(
params?: { pedidoId?: string },
options?: BffClientOptions,
): Promise<void> {
this.status = this.msg.loadingPedidoResumo;
if ((window as any).mls) {
this.pedidoResumo = {
id: params?.pedidoId ?? 'PED-10235',
status: 'em preparo',
tipo: 'delivery',
itens: [],
total: 89.9,
origem: 'publico',
cliente: 'Joao Silva',
enderecoEntrega: 'Rua das Flores, 123 - Centro',
zonaEntregaId: 'ZONA-01',
taxaEntrega: 8,
};
this.status = '';
return;
}
const response = await execBff<PizzariaPedido>(
'pizzaria.getPedidoResumoPublico',
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
this.pedidoResumo = undefined;
return;
}
this.pedidoResumo = response.data ?? undefined;
this.status = '';
}

async loadListPedidoEtapasPublico(
params?: { pedidoId?: string },
options?: BffClientOptions,
): Promise<void> {
this.status = this.msg.loadingEtapas;
if ((window as any).mls) {
this.etapas = [
{ id: 'ETA-1', etapa: 'recebido', tempoAlvoMin: 2, ativo: true },
{ id: 'ETA-2', etapa: 'em preparo', tempoAlvoMin: 20, ativo: true },
{ id: 'ETA-3', etapa: 'pronto', tempoAlvoMin: 5, ativo: true },
];
this.status = `${this.etapas.length} ${this.msg.itemsAvailable}`;
return;
}
const response = await execBff<PizzariaTempoAlvoEtapa[]>(
'pizzaria.listPedidoEtapasPublico',
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
this.etapas = [];
return;
}
this.etapas = response.data ?? [];
this.status = `${this.etapas.length} ${this.msg.itemsAvailable}`;
}

async loadListItensPedidoPublico(
params?: { pedidoId?: string },
options?: BffClientOptions,
): Promise<void> {
this.status = this.msg.loadingItens;
if ((window as any).mls) {
this.itens = [
{
id: 'IT-1',
pedidoId: params?.pedidoId ?? 'PED-10235',
produtoId: 'PIZ-01',
quantidade: 1,
precoUnitario: 49.9,
observacoes: 'Sem cebola',
},
{
id: 'IT-2',
pedidoId: params?.pedidoId ?? 'PED-10235',
produtoId: 'BEB-02',
quantidade: 2,
precoUnitario: 10,
},
{
id: 'IT-3',
pedidoId: params?.pedidoId ?? 'PED-10235',
produtoId: 'SOB-01',
quantidade: 1,
precoUnitario: 20,
observacoes: 'Caprichar no chocolate',
},
];
this.status = `${this.itens.length} ${this.msg.itemsAvailable}`;
return;
}
const response = await execBff<PizzariaItemPedido[]>(
'pizzaria.listItensPedidoPublico',
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
this.itens = [];
return;
}
this.itens = response.data ?? [];
this.status = `${this.itens.length} ${this.msg.itemsAvailable}`;
}

async loadGetEntregaPublica(
params?: { pedidoId?: string },
options?: BffClientOptions,
): Promise<void> {
this.status = this.msg.loadingEntrega;
if ((window as any).mls) {
this.entrega = {
id: 'ENT-1',
pedidoId: params?.pedidoId ?? 'PED-10235',
entregadorId: 'ENTREG-7',
status: 'saiu para entrega',
endereco: 'Rua das Flores, 123 - Centro',
};
this.status = '';
return;
}
const response = await execBff<PizzariaEntrega>(
'pizzaria.getEntregaPublica',
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
this.entrega = undefined;
return;
}
this.entrega = response.data ?? undefined;
this.status = '';
}

async loadGetConfiguracaoWhatsAppPublica(
params?: Record<string, never>,
options?: BffClientOptions,
): Promise<void> {
this.status = this.msg.loadingWhatsapp;
if ((window as any).mls) {
this.whatsapp = {
id: 'WPP-1',
numeroTelefone: '5511999998888',
ativo: true,
};
this.status = '';
return;
}
const response = await execBff<PizzariaConfiguracaoWhatsApp>(
'pizzaria.getConfiguracaoWhatsAppPublica',
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
this.whatsapp = undefined;
return;
}
this.whatsapp = response.data ?? undefined;
this.status = '';
}

// ── action methods (none for this page) ──
// ── form submit handlers (none for this page) ──

handleReloadClick(params?: { pedidoId?: string }): void {
void runBlockingUiAction(
async (signal: AbortSignal) => {
await this.loadInitialData(params, { mode: 'blocking', signal });
},
{
busyLabel: this.msg.loadingPedidoResumo,
errorTitle: this.msg.couldNotLoad,
retry: () => this.loadInitialData(params, { mode: 'blocking' }),
},
);
}
}
