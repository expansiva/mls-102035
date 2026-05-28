/// <mls fileReference="_102035_/l2/locadora/web/shared/locacoesLista.ts" enhancement="_102027_/l2/enhancementLit.ts" />

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
import type { LocadoraLocacaoResponse } from '/_102035_/l2/locadora/web/contracts/locacoesLista.js';

/// **collab_i18n_start**
const message_pt = {
brand: 'Locadora',
pageTitle: 'Locacoes - lista',
pageSubtitle: 'Consultar locacoes registradas.',
loadingLocacoes: 'Carregando locacoes...',
couldNotLoad: 'Nao foi possivel carregar os dados.',
itemsAvailable: 'itens disponiveis',
reload: 'Recarregar',
// filtros / campos
placaVeiculo: 'Placa do veiculo',
dataRetiradaInicio: 'Data de retirada (inicio)',
dataRetiradaFim: 'Data de retirada (fim)',
devolucaoPrevistaInicio: 'Devolucao prevista (inicio)',
devolucaoPrevistaFim: 'Devolucao prevista (fim)',
formaPagamento: 'Forma de pagamento',
// colunas
colDataRetirada: 'Data retirada',
colDataDevolucao: 'Data devolucao',
colDevolucaoPrevista: 'Devolucao prevista',
colValorDiario: 'Valor diario',
colSeguroOpcional: 'Seguro opcional',
colFormaPagamento: 'Forma pagamento',
colPlacaVeiculo: 'Placa',
alertVeiculoIndisponivel: 'Atencao: veiculo pode estar indisponivel no periodo selecionado.',
};

const message_en = {
brand: 'Car rental',
pageTitle: 'Rentals - list',
pageSubtitle: 'Review registered rentals.',
loadingLocacoes: 'Loading rentals...',
couldNotLoad: 'Could not load data.',
itemsAvailable: 'items available',
reload: 'Reload',
// filters / fields
placaVeiculo: 'Vehicle plate',
dataRetiradaInicio: 'Pickup date (from)',
dataRetiradaFim: 'Pickup date (to)',
devolucaoPrevistaInicio: 'Expected return (from)',
devolucaoPrevistaFim: 'Expected return (to)',
formaPagamento: 'Payment method',
// columns
colDataRetirada: 'Pickup date',
colDataDevolucao: 'Return date',
colDevolucaoPrevista: 'Expected return',
colValorDiario: 'Daily rate',
colSeguroOpcional: 'Optional insurance',
colFormaPagamento: 'Payment method',
colPlacaVeiculo: 'Plate',
alertVeiculoIndisponivel: 'Warning: vehicle may be unavailable for the selected period.',
};

type MessageType = typeof message_en;
const messages: { [key: string]: MessageType } = { en: message_en, pt: message_pt };
/// **collab_i18n_end**

export class LocadoraLocacoesListaBase extends CollabLitElement {
@property() locacao: LocadoraLocacaoResponse[] = [];
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

protected async loadInitialData(_params?: undefined, options?: BffClientOptions): Promise<void> {
await this.loadListLocacoes(undefined, options);
}

// ── load methods (one per read routine) ──
async loadListLocacoes(
params?: {
placaVeiculo?: string;
dataRetiradaInicio?: string;
dataRetiradaFim?: string;
devolucaoPrevistaInicio?: string;
devolucaoPrevistaFim?: string;
formaPagamento?: string;
},
options?: BffClientOptions,
): Promise<void> {
this.status = this.msg.loadingLocacoes;

if ((window as any).mls) {
this.locacao = [
{
dataRetirada: '2026-05-10',
dataDevolucao: '2026-05-13',
valorDiario: 169.9,
seguroOpcional: true,
formaPagamento: 'Cartao de credito',
devolucaoPrevista: '2026-05-14',
placaVeiculo: 'ABC1D23',
},
{
dataRetirada: '2026-05-18',
dataDevolucao: '2026-05-19',
valorDiario: 129.0,
seguroOpcional: false,
formaPagamento: 'Pix',
devolucaoPrevista: '2026-05-20',
placaVeiculo: 'DEF4G56',
},
{
dataRetirada: '2026-05-22',
dataDevolucao: '2026-05-26',
valorDiario: 210.5,
seguroOpcional: true,
formaPagamento: 'Boleto',
devolucaoPrevista: '2026-05-25',
placaVeiculo: 'GHI7J89',
},
];
this.status = `${this.locacao.length} ${this.msg.itemsAvailable}`;
return;
}

const response = await execBff<LocadoraLocacaoResponse[]>(
'locadora.locacoesLista.listLocacoes',
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
this.locacao = [];
return;
}
this.locacao = response.data ?? [];
this.status = `${this.locacao.length} ${this.msg.itemsAvailable}`;
}

// ── action methods (one per write routine) ──
// (no write routines in this page)

// ── form submit handlers (one per write routine that originates from a form) ──
// (no write routines in this page)
}
