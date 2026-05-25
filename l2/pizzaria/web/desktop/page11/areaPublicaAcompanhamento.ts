/// <mls fileReference="_102035_/l2/pizzaria/web/desktop/page11/areaPublicaAcompanhamento.ts" enhancement="_102027_/l2/enhancementLit.ts" />

import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { PizzariaAreaPublicaAcompanhamentoBase } from '/_102035_/l2/pizzaria/web/shared/areaPublicaAcompanhamento.js';

@customElement('pizzaria--web--desktop--page11--area-publica-acompanhamento-102035')
export class PizzariaWebDesktopAreaPublicaAcompanhamentoPage extends PizzariaAreaPublicaAcompanhamentoBase {
  render() {
    const pedidoId = this.pedidoResumo?.id;
    const whatsAppLink = this.whatsapp?.numeroTelefone
      ? `whatsapp://send?phone=${encodeURIComponent(this.whatsapp.numeroTelefone)}${pedidoId ? `&text=${encodeURIComponent(`${this.msg.labelPedidoId} ${pedidoId}`)}` : ''}`
      : '';

    return html`
      <div class="min-h-dvh bg-slate-50 text-slate-900">
        <div class="mx-auto w-full max-w-6xl px-4 py-6">
          <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div class="flex flex-col gap-1">
              <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">${this.msg.brand}</div>
              <h1 class="text-2xl font-semibold leading-tight text-slate-900">${this.msg.pageTitle}</h1>
              <p class="text-sm text-slate-600">${this.msg.pageSubtitle}</p>
            </div>

            <div class="flex flex-col items-stretch gap-2 sm:items-end">
              <div class="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <div class="flex items-center justify-between gap-4">
                  <div class="text-xs font-medium text-slate-500">${this.msg.labelStatus}</div>
                  <div class="text-xs text-slate-600">${this.status ?? ''}</div>
                </div>
              </div>
              <button
                class="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 active:bg-slate-950"
                @click=${() => this.handleReloadClick(pedidoId ? { pedidoId } : undefined)}
                type="button"
              >
                ${this.msg.reload}
              </button>
            </div>
          </header>

          <main class="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <section class="lg:col-span-8 flex flex-col gap-4">
              <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div class="min-w-0">
                    <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">${this.msg.labelPedidoId}</div>
                    <div class="mt-1 text-xl font-semibold text-slate-900">
                      ${this.pedidoResumo?.id ?? ''}
                    </div>
                    <div class="mt-2 flex flex-wrap items-center gap-2">
                      <span class="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-800">
                        ${this.msg.labelStatus}: ${this.pedidoResumo?.status ?? ''}
                      </span>
                      <span class="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                        ${this.msg.labelTipo}: ${this.pedidoResumo?.tipo ?? ''}
                      </span>
                      <span class="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                        ${this.msg.labelTotal}: ${this.pedidoResumo?.total ?? ''}
                      </span>
                      <span class="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                        ${this.msg.labelOrigem}: ${this.pedidoResumo?.origem ?? ''}
                      </span>
                    </div>
                  </div>

                  <div class="w-full sm:w-auto">
                    <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                      <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">${this.msg.labelStatus}</div>
                      <div class="mt-1 text-base font-semibold text-slate-900">${this.pedidoResumo?.status ?? ''}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div class="flex items-baseline justify-between gap-3">
                  <h2 class="text-lg font-semibold text-slate-900">${this.msg.loadingEtapas}</h2>
                  <div class="text-xs text-slate-500">${(this.etapas ?? []).length} ${this.msg.itemsAvailable}</div>
                </div>

                <div class="mt-4">
                  <ol class="relative border-s border-slate-200 ps-5">
                    ${(this.etapas ?? []).map((e) => html`
                      <li class="mb-6 last:mb-0">
                        <span class="absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full bg-slate-900"></span>
                        <div class="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4">
                          <div class="flex flex-wrap items-center justify-between gap-2">
                            <div class="min-w-0">
                              <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">${this.msg.labelEtapa}</div>
                              <div class="mt-1 text-base font-semibold text-slate-900">${(e as any)?.etapa ?? ''}</div>
                            </div>
                            <div class="flex flex-wrap items-center gap-2">
                              <span class="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                ${this.msg.labelTempoAlvoMin}: ${(e as any)?.tempoAlvoMin ?? ''}
                              </span>
                              <span class="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                ${this.msg.labelAtivo}: ${(e as any)?.ativo ?? ''}
                              </span>
                              <span class="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800">
                                ${this.msg.labelStatus}: ${(e as any)?.status ?? ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      </li>
                    `)}
                  </ol>
                </div>
              </div>

              <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div class="flex items-baseline justify-between gap-3">
                  <h2 class="text-lg font-semibold text-slate-900">${this.msg.loadingItens}</h2>
                  <div class="text-xs text-slate-500">${(this.itens ?? []).length} ${this.msg.itemsAvailable}</div>
                </div>

                <div class="mt-4 overflow-hidden rounded-lg border border-slate-200">
                  <div class="grid grid-cols-12 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <div class="col-span-5">${this.msg.labelProdutoId}</div>
                    <div class="col-span-2 text-right">${this.msg.labelQuantidade}</div>
                    <div class="col-span-3 text-right">${this.msg.labelPrecoUnitario}</div>
                    <div class="col-span-2 text-right">${this.msg.labelStatus}</div>
                  </div>
                  <div class="divide-y divide-slate-200 bg-white">
                    ${(this.itens ?? []).map((it) => html`
                      <div class="grid grid-cols-12 gap-2 px-4 py-3">
                        <div class="col-span-12 sm:col-span-5">
                          <div class="text-sm font-semibold text-slate-900">${(it as any)?.produtoId ?? ''}</div>
                          ${((it as any)?.observacoes ?? '')
                            ? html`<div class="mt-1 text-xs text-slate-600">${this.msg.labelObservacoes}: ${(it as any)?.observacoes ?? ''}</div>`
                            : html``}
                        </div>
                        <div class="col-span-4 sm:col-span-2 text-right text-sm text-slate-800">${(it as any)?.quantidade ?? ''}</div>
                        <div class="col-span-4 sm:col-span-3 text-right text-sm text-slate-800">${(it as any)?.precoUnitario ?? ''}</div>
                        <div class="col-span-4 sm:col-span-2 text-right text-sm text-slate-700">${this.pedidoResumo?.status ?? ''}</div>
                      </div>
                    `)}
                  </div>
                </div>
              </div>
            </section>

            <aside class="lg:col-span-4 flex flex-col gap-4">
              <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 class="text-lg font-semibold text-slate-900">${this.msg.loadingEntrega}</h2>
                <dl class="mt-4 grid grid-cols-1 gap-3">
                  <div class="rounded-lg bg-slate-50 p-4">
                    <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">${this.msg.labelEnderecoEntrega}</dt>
                    <dd class="mt-1 text-sm text-slate-900">${this.entrega?.endereco ?? (this.pedidoResumo as any)?.enderecoEntrega ?? ''}</dd>
                  </div>
                  <div class="rounded-lg bg-slate-50 p-4">
                    <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">${this.msg.labelZonaEntregaId}</dt>
                    <dd class="mt-1 text-sm text-slate-900">${(this.pedidoResumo as any)?.zonaEntregaId ?? ''}</dd>
                  </div>
                  <div class="rounded-lg bg-slate-50 p-4">
                    <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">${this.msg.labelTaxaEntrega}</dt>
                    <dd class="mt-1 text-sm text-slate-900">${(this.pedidoResumo as any)?.taxaEntrega ?? ''}</dd>
                  </div>
                  <div class="rounded-lg bg-slate-50 p-4">
                    <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">${this.msg.labelEntregaStatus}</dt>
                    <dd class="mt-1 text-sm font-semibold text-slate-900">${this.entrega?.status ?? ''}</dd>
                  </div>
                </dl>
              </div>

              <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 class="text-lg font-semibold text-slate-900">${this.msg.loadingWhatsapp}</h2>

                <div class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">${this.msg.labelNumeroTelefone}</div>
                  <div class="mt-1 text-sm font-semibold text-slate-900">${this.whatsapp?.numeroTelefone ?? ''}</div>
                </div>

                <div class="mt-4 flex flex-col gap-2">
                  <a
                    class="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800"
                    href=${whatsAppLink}
                    @click=${() => undefined}
                  >
                    ${this.msg.confirm}
                  </a>
                  <div class="text-xs text-slate-500">${this.status ?? ''}</div>
                </div>
              </div>
            </aside>
          </main>
        </div>
      </div>
    `;
  }
}
