/// <mls fileReference="_102035_/l2/pizzaria/web/desktop/page11/areaPublicaCheckout.ts" enhancement="_102027_/l2/enhancementLit.ts" />

import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { PizzariaAreaPublicaCheckoutBase } from '/_102035_/l2/pizzaria/web/shared/areaPublicaCheckout.js';  

@customElement('pizzaria--web--desktop--page11--area-publica-checkout-102035')
export class PizzariaWebDesktopAreaPublicaCheckoutPage extends PizzariaAreaPublicaCheckoutBase {
  render() {
    const resumo = this.resumoPedido;
    const itens = this.itensPedido ?? [];
    const combos = this.combosSugestoes ?? [];
    const politicas = this.politicaCancelamento ?? [];

    const total = resumo?.total ?? 0;
    const taxaEntrega = resumo?.taxaEntrega ?? 0;
    const valorFinal = Number(total) + Number(taxaEntrega);

    return html`
      <div class="min-h-screen bg-slate-50 text-slate-900">
        <div class="mx-auto max-w-6xl px-6 py-6">
          <header class="mb-6">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="text-xs font-semibold tracking-wide text-slate-500">${this.msg.brand}</div>
                <h1 class="mt-1 text-2xl font-semibold leading-tight text-slate-900">${this.msg.pageTitle}</h1>
                <p class="mt-1 text-sm text-slate-600">${this.msg.pageSubtitle}</p>
              </div>
              <div class="min-w-[16rem] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div class="text-xs font-medium text-slate-500">${this.msg.statusPedido}</div>
                <div class="mt-1 text-sm font-semibold text-slate-800">${this.status ?? ''}</div>
              </div>
            </div>
          </header>

          <div class="grid grid-cols-12 gap-6">
            <section class="col-span-12 lg:col-span-4">
              <div class="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div class="border-b border-slate-100 px-5 py-4">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <div class="text-sm font-semibold text-slate-900">${this.msg.pageTitle}</div>
                      <div class="mt-1 text-xs text-slate-500">${this.msg.pedidoId}: ${resumo?.id ?? ''}</div>
                    </div>
                    <a
                      class="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      href="/publico/cardapio"
                    >
                      ${this.msg.reload}
                    </a>
                  </div>
                </div>

                <div class="px-5 py-4">
                  <dl class="grid grid-cols-1 gap-3">
                    <div class="flex items-center justify-between">
                      <dt class="text-xs font-medium text-slate-500">${this.msg.pedidoId}</dt>
                      <dd class="text-sm font-semibold text-slate-900">${resumo?.id ?? ''}</dd>
                    </div>
                    <div class="flex items-center justify-between">
                      <dt class="text-xs font-medium text-slate-500">${this.msg.tipoPedido}</dt>
                      <dd class="text-sm text-slate-800">${resumo?.tipo ?? ''}</dd>
                    </div>
                    <div class="flex items-center justify-between">
                      <dt class="text-xs font-medium text-slate-500">${this.msg.statusPedido}</dt>
                      <dd class="text-sm text-slate-800">${resumo?.status ?? ''}</dd>
                    </div>
                    <div class="flex items-center justify-between">
                      <dt class="text-xs font-medium text-slate-500">${this.msg.totalPedido}</dt>
                      <dd class="text-sm font-semibold text-slate-900">${(resumo?.total ?? 0).toFixed(2)}</dd>
                    </div>
                  </dl>

                  <div class="mt-4 rounded-xl bg-slate-50 p-4">
                    <div class="flex items-center justify-between">
                      <div class="text-xs font-medium text-slate-600">${this.msg.taxaEntrega}</div>
                      <div class="text-sm font-semibold text-slate-900">${(resumo?.taxaEntrega ?? 0).toFixed(2)}</div>
                    </div>
                    <div class="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                      <div class="text-xs font-semibold text-slate-700">${this.msg.valorPagamento}</div>
                      <div class="text-base font-semibold text-slate-900">${valorFinal.toFixed(2)}</div>
                    </div>
                  </div>

                  <div class="mt-4 flex gap-2">
                    <button
                      class="inline-flex flex-1 items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                      @click=${() => this.loadInitialData({ pedidoId: resumo?.id ?? '' }, { mode: 'silent' })}
                      ?disabled=${!resumo?.id}
                    >
                      ${this.msg.reload}
                    </button>
                  </div>
                </div>
              </div>

              <div class="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div class="text-sm font-semibold text-slate-900">${this.msg.politicaAceite}</div>
                <div class="mt-3 space-y-3">
                  ${(politicas ?? []).map(
                    (p) => html`
                      <div class="rounded-xl border border-slate-200 bg-white p-4">
                        <div class="flex items-start justify-between gap-3">
                          <div class="min-w-0">
                            <div class="text-xs font-medium text-slate-500">${p.id}</div>
                            <div class="mt-1 text-sm text-slate-800">${p.condicoes}</div>
                            <div class="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                              <span class="rounded-lg bg-slate-50 px-2 py-1">${String(p.prazoMaximoMin ?? '')}</span>
                              <span class="rounded-lg bg-slate-50 px-2 py-1">${String(p.permiteReembolso ?? '')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    `,
                  )}

                  <label class="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <input class="mt-1 h-4 w-4 rounded border-slate-300" type="checkbox" />
                    <span class="text-sm text-slate-800">${this.msg.politicaAceite}</span>
                  </label>
                </div>
              </div>
            </section>

            <main class="col-span-12 lg:col-span-8 space-y-6">
              <section class="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div class="border-b border-slate-100 px-5 py-4">
                  <div class="text-sm font-semibold text-slate-900">${this.msg.loadingItensPedido}</div>
                  <div class="mt-1 text-xs text-slate-500">${this.status ?? ''}</div>
                </div>

                <div class="px-2 py-2">
                  <div class="divide-y divide-slate-100">
                    ${(itens ?? []).map((it) => {
                      const subtotal = Number(it.quantidade ?? 0) * Number(it.precoUnitario ?? 0);
                      return html`
                        <div class="grid grid-cols-12 gap-3 px-3 py-4 hover:bg-slate-50">
                          <div class="col-span-12 sm:col-span-6">
                            <div class="text-xs font-medium text-slate-500">${this.msg.pedidoId}</div>
                            <div class="mt-0.5 text-sm font-semibold text-slate-900">${it.produtoId}</div>
                            <div class="mt-1 text-xs text-slate-600">${it.id}</div>
                            ${it.observacoes
                              ? html`<div class="mt-2 text-xs text-slate-700">${it.observacoes}</div>`
                              : html``}
                          </div>
                          <div class="col-span-6 sm:col-span-2">
                            <div class="text-xs font-medium text-slate-500">${this.msg.itemsAvailable}</div>
                            <div class="mt-0.5 text-sm text-slate-900">${String(it.quantidade ?? '')}</div>
                          </div>
                          <div class="col-span-6 sm:col-span-2">
                            <div class="text-xs font-medium text-slate-500">${this.msg.totalPedido}</div>
                            <div class="mt-0.5 text-sm text-slate-900">${Number(it.precoUnitario ?? 0).toFixed(2)}</div>
                          </div>
                          <div class="col-span-12 sm:col-span-2">
                            <div class="text-xs font-medium text-slate-500">${this.msg.valorPagamento}</div>
                            <div class="mt-0.5 text-sm font-semibold text-slate-900">${subtotal.toFixed(2)}</div>
                          </div>
                        </div>
                      `;
                    })}
                  </div>
                </div>
              </section>

              <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <div class="text-sm font-semibold text-slate-900">${this.msg.enderecoEntrega}</div>
                    <div class="mt-1 text-xs text-slate-500">${this.msg.cliente}</div>
                  </div>
                </div>

                <div class="mt-4 grid grid-cols-12 gap-4">
                  <div class="col-span-12 md:col-span-6">
                    <label class="block text-xs font-medium text-slate-600">${this.msg.cliente}</label>
                    <input
                      class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
                      .value=${resumo?.cliente ?? ''}
                    />
                  </div>
                  <div class="col-span-12 md:col-span-6">
                    <label class="block text-xs font-medium text-slate-600">${this.msg.zonaEntregaId}</label>
                    <input
                      class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
                      .value=${resumo?.zonaEntregaId ?? ''}
                    />
                  </div>
                  <div class="col-span-12">
                    <label class="block text-xs font-medium text-slate-600">${this.msg.enderecoEntrega}</label>
                    <input
                      class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
                      .value=${resumo?.enderecoEntrega ?? ''}
                    />
                  </div>

                  <div class="col-span-12 md:col-span-4">
                    <div class="rounded-xl bg-slate-50 p-4">
                      <div class="text-xs font-medium text-slate-600">${this.msg.taxaEntrega}</div>
                      <div class="mt-1 text-sm font-semibold text-slate-900">${(resumo?.taxaEntrega ?? 0).toFixed(2)}</div>
                    </div>
                  </div>
                  <div class="col-span-12 md:col-span-4">
                    <div class="rounded-xl bg-slate-50 p-4">
                      <div class="text-xs font-medium text-slate-600">${this.msg.tipoPedido}</div>
                      <div class="mt-1 text-sm font-semibold text-slate-900">${resumo?.tipo ?? ''}</div>
                    </div>
                  </div>
                  <div class="col-span-12 md:col-span-4">
                    <div class="rounded-xl bg-slate-50 p-4">
                      <div class="text-xs font-medium text-slate-600">${this.msg.valorPagamento}</div>
                      <div class="mt-1 text-sm font-semibold text-slate-900">${valorFinal.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </section>

              <section class="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div class="border-b border-slate-100 px-5 py-4">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <div class="text-sm font-semibold text-slate-900">${this.msg.loadingCombosAtivos}</div>
                      <div class="mt-1 text-xs text-slate-500">${this.status ?? ''}</div>
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                  ${(combos ?? []).map(
                    (c) => html`
                      <div class="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300">
                        <div class="flex items-start justify-between gap-3">
                          <div class="min-w-0">
                            <div class="text-sm font-semibold text-slate-900">${c.nome}</div>
                            ${c.descricao ? html`<div class="mt-1 text-xs text-slate-600">${c.descricao}</div>` : html``}
                          </div>
                          <div class="shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
                            ${Number(c.preco ?? 0).toFixed(2)}
                          </div>
                        </div>

                        <div class="mt-3 text-xs text-slate-600">${String(c.id)}</div>
                        <div class="mt-3 flex flex-wrap gap-2">
                          ${(c.itens ?? []).map(
                            (it:any) => html`<span class="rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-700">${it.produtoId}</span>`,
                          )}
                        </div>

                        <div class="mt-4">
                          <button
                            class="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                            type="button"
                          >
                            ${this.msg.save}
                          </button>
                        </div>
                      </div>
                    `,
                  )}
                </div>
              </section>

              <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <div class="text-sm font-semibold text-slate-900">${this.msg.metodoPagamento}</div>
                    <div class="mt-1 text-xs text-slate-500">${this.msg.statusPagamento}: ${''}</div>
                  </div>
                </div>

                <form class="mt-4" @submit=${this.handleSalvarPagamentoSubmit}>
                  <input name="id" type="hidden" value=${resumo?.id ?? ''} />
                  <input name="pedidoId" type="hidden" value=${resumo?.id ?? ''} />
                  <input name="valor" type="hidden" value=${String(valorFinal)} />
                  <input name="status" type="hidden" value="processando" />

                  <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12 md:col-span-6">
                      <label class="block text-xs font-medium text-slate-600">${this.msg.metodoPagamento}</label>
                      <input
                        class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                        .value=${'online'}
                        disabled
                      />
                    </div>
                    <div class="col-span-12 md:col-span-6">
                      <label class="block text-xs font-medium text-slate-600">${this.msg.valorPagamento}</label>
                      <input
                        class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                        .value=${valorFinal.toFixed(2)}
                        disabled
                      />
                    </div>
                  </div>

                  <div class="mt-4">
                    <button
                      class="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      type="submit"
                      ?disabled=${!resumo?.id}
                    >
                      ${this.msg.save}
                    </button>
                  </div>
                </form>
              </section>

              <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <div class="text-sm font-semibold text-slate-900">${this.msg.confirm}</div>
                    <div class="mt-1 text-xs text-slate-500">${this.msg.pedidoId}: ${resumo?.id ?? ''}</div>
                  </div>
                </div>

                <div class="mt-4 grid grid-cols-12 gap-4">
                  <div class="col-span-12 md:col-span-6">
                    <div class="rounded-xl bg-slate-50 p-4">
                      <div class="text-xs font-medium text-slate-600">${this.msg.statusPedido}</div>
                      <div class="mt-1 text-sm font-semibold text-slate-900">${resumo?.status ?? ''}</div>
                    </div>
                  </div>
                  <div class="col-span-12 md:col-span-6">
                    <label class="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                      <input class="mt-1 h-4 w-4 rounded border-slate-300" type="checkbox" checked />
                      <span class="text-sm text-slate-800">${this.msg.whatsappOptIn}</span>
                    </label>
                  </div>
                </div>

                <div class="mt-4 grid grid-cols-12 gap-3">
                  <div class="col-span-12 md:col-span-7">
                    <button
                      class="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      type="button"
                      ?disabled=${!resumo?.id}
                      @click=${() => this.handleConfirmarPedidoClick({ id: resumo?.id ?? '', status: resumo?.status ?? '', origem: resumo?.origem ?? 'publico' } as any)}
                    >
                      ${this.msg.confirm}
                    </button>
                  </div>
                  <div class="col-span-12 md:col-span-5">
                    <a
                      class="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                      href=${`/publico/pedido/${encodeURIComponent(resumo?.id ?? '')}`}
                    >
                      ${this.msg.confirmedSuccessfully}
                    </a>
                  </div>
                </div>
              </section>
            </main>
          </div>
        </div>
      </div>
    `;
  }
}
