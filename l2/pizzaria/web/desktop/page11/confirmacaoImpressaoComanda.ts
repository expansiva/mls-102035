/// <mls fileReference="_102035_/l2/pizzaria/web/desktop/page11/confirmacaoImpressaoComanda.ts" enhancement="_102027_/l2/enhancementLit.ts" />

import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { PizzariaConfirmacaoImpressaoComandaBase } from '/_102035_/l2/pizzaria/web/shared/confirmacaoImpressaoComanda.js';

@customElement('pizzaria--web--desktop--page11--confirmacao-impressao-comanda-102035')
export class PizzariaWebDesktopConfirmacaoImpressaoComandaPage extends PizzariaConfirmacaoImpressaoComandaBase {
  render() {
    const pedido = this.pedidoResumo;
    const itens = pedido?.itens ?? [];
    const hasObservacaoCritica = Boolean(pedido?.observacaoCritica);

    return html`
      <div class="min-h-screen bg-slate-50 text-slate-900">
        <header class="border-b border-slate-200 bg-white">
          <div class="mx-auto max-w-6xl px-6 py-5">
            <div class="flex flex-wrap items-end justify-between gap-4">
              <div class="min-w-[18rem]">
                <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">${this.msg.brand}</div>
                <h1 class="mt-1 text-2xl font-semibold leading-tight text-slate-900">${this.msg.pageTitle}</h1>
                <p class="mt-1 text-sm text-slate-600">${this.msg.pageSubtitle}</p>
              </div>

              <div class="flex items-center gap-2">
                <button
                  class="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                  @click=${() => this.loadGetPedidoResumoImpressao({ pedidoId: pedido?.id })}
                >
                  ${this.msg.reload}
                </button>

                <button
                  class="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  ?disabled=${!pedido}
                  @click=${() => this.handleImprimirComandaClick({ id: pedido?.id ?? '' })}
                >
                  ${this.msg.confirm}
                </button>
              </div>
            </div>

            <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                <span class="h-2 w-2 rounded-full bg-slate-400"></span>
                <span>${this.status}</span>
              </div>

              <div class="text-xs text-slate-500">
                <span class="font-semibold text-slate-600">${this.msg.labelPedidoId}:</span>
                <span class="ml-1">${pedido?.id ?? ''}</span>
              </div>
            </div>
          </div>
        </header>

        <main class="mx-auto max-w-6xl px-6 py-6">
          <div class="grid grid-cols-12 gap-6">
            <section class="col-span-12 lg:col-span-7">
              <div class="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div class="border-b border-slate-200 px-5 py-4">
                  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div class="rounded-md bg-slate-50 px-4 py-3">
                      <div class="text-xs font-medium text-slate-500">${this.msg.labelStatus}</div>
                      <div class="mt-1 text-sm font-semibold text-slate-900">${pedido?.status ?? ''}</div>
                    </div>
                    <div class="rounded-md bg-slate-50 px-4 py-3">
                      <div class="text-xs font-medium text-slate-500">${this.msg.labelCriadoEm}</div>
                      <div class="mt-1 text-sm font-semibold text-slate-900">${pedido?.criadoEm ?? ''}</div>
                    </div>
                  </div>

                  <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div class="rounded-md bg-slate-50 px-4 py-3">
                      <div class="text-xs font-medium text-slate-500">${this.msg.labelFormaPagamento}</div>
                      <div class="mt-1 text-sm font-semibold text-slate-900">${pedido?.formaPagamento ?? ''}</div>
                    </div>
                    <div class="rounded-md bg-slate-50 px-4 py-3">
                      <div class="text-xs font-medium text-slate-500">${this.msg.labelStatusPagamento}</div>
                      <div class="mt-1 text-sm font-semibold text-slate-900">${pedido?.statusPagamento ?? ''}</div>
                    </div>
                  </div>
                </div>

                <div class="px-5 py-5">
                  <div class="grid grid-cols-1 gap-4">
                    <div>
                      <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">${this.msg.labelObservacoes}</div>
                      <div class="mt-1 whitespace-pre-wrap rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800">
                        ${pedido?.observacoes ?? ''}
                      </div>
                    </div>

                    ${hasObservacaoCritica
                      ? html`
                          <div class="rounded-md border border-amber-200 bg-amber-50 p-4">
                            <div class="flex items-start justify-between gap-4">
                              <div class="min-w-0">
                                <div class="text-xs font-semibold uppercase tracking-wide text-amber-900">${this.msg.labelObservacaoCritica}</div>
                                <div class="mt-1 whitespace-pre-wrap text-sm font-semibold text-amber-950">${pedido?.observacaoCritica ?? ''}</div>
                              </div>
                              <div class="flex shrink-0 items-start gap-2">
                                <input
                                  id="ackObsCritica"
                                  type="checkbox"
                                  class="mt-1 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                                />
                                <label for="ackObsCritica" class="text-sm font-medium text-amber-900">${this.msg.labelAckObservacaoCritica}</label>
                              </div>
                            </div>
                          </div>
                        `
                      : html``}

                    <div>
                      <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">${this.msg.labelConfirmacaoDigitada}</div>
                      <input
                        class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        type="text"
                        .value=${''}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section class="col-span-12 lg:col-span-5">
              <div class="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <div>
                    <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">${this.msg.labelItens}</div>
                    <div class="mt-1 text-sm text-slate-700">${itens.length} ${this.msg.itemsAvailable}</div>
                  </div>
                </div>

                <div class="divide-y divide-slate-200">
                  ${(itens ?? []).map(
                    (item:any) => html`
                      <div class="px-5 py-4">
                        <div class="flex items-start justify-between gap-3">
                          <div class="min-w-0">
                            <div class="text-xs font-medium text-slate-500">${this.msg.labelItemNome}</div>
                            <div class="truncate text-sm font-semibold text-slate-900">${item.nome}</div>
                          </div>
                          <div class="shrink-0 text-right">
                            <div class="text-xs font-medium text-slate-500">${this.msg.labelItemQuantidade}</div>
                            <div class="text-sm font-semibold text-slate-900">${item.quantidade}</div>
                          </div>
                        </div>
                        ${(item.observacoes ?? '')
                          ? html`
                              <div class="mt-3 rounded-md bg-slate-50 px-4 py-3">
                                <div class="text-xs font-medium text-slate-500">${this.msg.labelItemObservacoes}</div>
                                <div class="mt-1 whitespace-pre-wrap text-sm text-slate-800">${item.observacoes ?? ''}</div>
                              </div>
                            `
                          : html``}
                      </div>
                    `,
                  )}
                </div>

                ${!pedido
                  ? html`
                      <div class="px-5 py-5">
                        <div class="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                          ${this.msg.couldNotLoad}
                        </div>
                      </div>
                    `
                  : html``}
              </div>
            </section>
          </div>
        </main>
      </div>
    `;
  }
}

customElements.define('pizzaria--web--desktop--page11--confirmacao-impressao-comanda-102035', PizzariaWebDesktopConfirmacaoImpressaoComandaPage);
