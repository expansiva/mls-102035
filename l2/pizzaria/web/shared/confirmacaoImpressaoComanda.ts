/// <mls fileReference="_102035_/l2/pizzaria/web/shared/confirmacaoImpressaoComanda.ts" enhancement="_blank" />

import { CollabLitElement } from '/_102029_/l2/collabLitElement.js';
import type { AuraNormalizedError } from '/_102029_/l2/contracts/bootstrap.js';
import type { BffClientOptions } from '/_102029_/l2/bffClient.js';
import { execBff } from '/_102029_/l2/bffClient.js';
import {
bindExpectedNavigationLoad,
consumeExpectedNavigationLoad,
runBlockingUiAction,
} from '/_102029_/l2/interactionRuntime.js';
import type { PizzariaItemPedido, PizzariaPedido, PizzariaUpdatePedidoParams } from '/_102035_/l1/pizzaria/module.js';

/// **collab_i18n_start**
const message_pt = {
brand: 'Pizzaria',
pageTitle: 'Confirmacao impressao comanda',
pageSubtitle: 'Confirmar impressao de comanda do pedido e garantir revisao rapida antes de enviar para a impressora.',
loadingPedidoResumoImpressao: 'Carregando resumo do pedido...',
couldNotLoad: 'Nao foi possivel carregar os dados.',
itemsAvailable: 'itens disponiveis',
couldNotPrint: 'Nao foi possivel imprimir a comanda.',
printedSuccessfully: 'Comanda enviada para impressao com sucesso.',
confirm: 'Confirmar',
confirming: 'Confirmando...',
reload: 'Recarregar',
labelPedidoId: 'Pedido',
labelStatus: 'Status',
labelCriadoEm: 'Criado em',
labelObservacoes: 'Observacoes',
labelObservacaoCritica: 'Observacao critica',
labelFormaPagamento: 'Forma de pagamento',
labelStatusPagamento: 'Status do pagamento',
labelItens: 'Itens',
labelItemNome: 'Item',
labelItemQuantidade: 'Quantidade',
labelItemObservacoes: 'Observacoes do item',
labelAckObservacaoCritica: 'Confirmo ciencia da observacao critica',
labelConfirmacaoDigitada: 'Confirmacao digitada',
};
const message_en = {
brand: 'Pizzaria',
pageTitle: 'Kitchen ticket print confirmation',
pageSubtitle: 'Confirm the order ticket printing and ensure a quick review before sending it to the printer.',
loadingPedidoResumoImpressao: 'Loading order summary...',
couldNotLoad: 'Could not load data.',
itemsAvailable: 'items available',
couldNotPrint: 'Could not print the ticket.',
printedSuccessfully: 'Ticket sent to printer successfully.',
confirm: 'Confirm',
confirming: 'Confirming...',
reload: 'Reload',
labelPedidoId: 'Order',
labelStatus: 'Status',
labelCriadoEm: 'Created at',
labelObservacoes: 'Notes',
labelObservacaoCritica: 'Critical note',
labelFormaPagamento: 'Payment method',
labelStatusPagamento: 'Payment status',
labelItens: 'Items',
labelItemNome: 'Item',
labelItemQuantidade: 'Quantity',
labelItemObservacoes: 'Item notes',
labelAckObservacaoCritica: 'I acknowledge the critical note',
labelConfirmacaoDigitada: 'Typed confirmation',
};
type MessageType = typeof message_en;
const messages: { [key: string]: MessageType } = { en: message_en, pt: message_pt };
/// **collab_i18n_end**

type PedidoResumoImpressao = Pick<
PizzariaPedido,
| 'id'
| 'status'
| 'criadoEm'
| 'observacoes'
| 'observacaoCritica'
| 'formaPagamento'
| 'statusPagamento'
| 'itens'
> & {
itens: Array<Pick<PizzariaItemPedido, 'nome' | 'quantidade' | 'observacoes'>>;
};

export class PizzariaConfirmacaoImpressaoComandaBase extends CollabLitElement {
static properties = {
pedidoResumo: { state: true },
status: { state: true },
};

declare pedidoResumo: PedidoResumoImpressao | undefined;
declare status: string;
protected msg: MessageType = messages['en'];

createRenderRoot() {
return this;
}

constructor() {
super();
this.pedidoResumo = undefined;
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
params?: { pedidoId?: string },
options?: BffClientOptions,
): Promise<void> {
await this.loadGetPedidoResumoImpressao(params, options);
}

// ── load methods (one per read routine) ──
async loadGetPedidoResumoImpressao(
params?: { pedidoId?: string },
options?: BffClientOptions,
): Promise<void> {
this.status = this.msg.loadingPedidoResumoImpressao;

if ((window as any).mls) {
this.pedidoResumo = {
id: params?.pedidoId ?? 'PED-1024',
status: 'pronto',
criadoEm: '2026-05-22T17:15:00Z',
observacoes: 'Sem cebola. Cortar em 8 fatias.',
observacaoCritica: 'ALERGIA: sem lactose. Usar queijo sem lactose.',
formaPagamento: 'cartao',
statusPagamento: 'pago',
itens: [
{ nome: 'Pizza Margherita', quantidade: 1, observacoes: 'Massa fina' },
{ nome: 'Refrigerante Guarana', quantidade: 2, observacoes: 'Bem gelado' },
{ nome: 'Pizza Calabresa', quantidade: 1, observacoes: 'Sem pimenta' },
],
};
this.status = `${this.pedidoResumo.itens.length} ${this.msg.itemsAvailable}`;
return;
}

const response = await execBff<PedidoResumoImpressao>(
'pizzaria.getPedidoResumoImpressao',
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
this.pedidoResumo = undefined;
return;
}
this.pedidoResumo = response.data;
this.status = `${(this.pedidoResumo?.itens?.length ?? 0)} ${this.msg.itemsAvailable}`;
}

// ── action methods (one per write routine) ──
async imprimirComanda(
params: PizzariaUpdatePedidoParams,
signal?: AbortSignal,
): Promise<void> {
const options: BffClientOptions | undefined = signal ? { signal, mode: 'blocking' } : undefined;

if ((window as any).mls) {
console.log('[mls mock] pizzaria.imprimirComanda', params);
this.status = this.msg.printedSuccessfully;
await this.loadGetPedidoResumoImpressao({ pedidoId: params.id }, { mode: 'silent' });
return;
}

const response = await execBff<unknown>('pizzaria.imprimirComanda', params, options);
if (!response.ok) {
if (options?.mode === 'blocking') {
throw (
response.error ??
({
code: 'UNEXPECTED_ERROR',
message: this.msg.couldNotPrint,
} satisfies AuraNormalizedError)
);
}
this.status = this.msg.couldNotPrint;
return;
}

this.status = this.msg.printedSuccessfully;
await this.loadGetPedidoResumoImpressao({ pedidoId: params.id }, { mode: 'silent' });
}

handleImprimirComandaClick(params: PizzariaUpdatePedidoParams) {
void runBlockingUiAction(
async (signal: AbortSignal) => {
await this.imprimirComanda(params, signal);
},
{
busyLabel: this.msg.confirming,
errorTitle: this.msg.couldNotPrint,
retry: () => this.imprimirComanda(params),
},
);
}
}