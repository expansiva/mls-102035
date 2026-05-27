/// <mls fileReference="_102035_/l2/pizzaria/web/desktop/page11/caixaPagamentos.ts" enhancement="_102027_/l2/enhancementLit.ts" />

import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { PizzariaCaixaPagamentosBase } from '/_102035_/l2/pizzaria/web/shared/caixaPagamentos.js';

@customElement('pizzaria--web--desktop--page11--caixa-pagamentos-102035')
export class PizzariaWebDesktopCaixaPagamentosPage extends PizzariaCaixaPagamentosBase {
  render() {
    const pagamentos = this.Pagamento ?? [];

    return html`
      <div class="min-h-screen bg-slate-50 text-slate-900">
        <header class="border-b border-slate-200 bg-white">
          <div class="mx-auto max-w-6xl px-6 py-5">
            <div class="flex items-start justify-between gap-6">
              <div>
                <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">${this.msg.brand}</div>
                <h1 class="mt-1 text-2xl font-semibold leading-tight text-slate-900">${this.msg.pageTitle}</h1>
                <p class="mt-1 text-sm text-slate-600">${this.msg.pageSubtitle}</p>
              </div>

              <div class="flex items-center gap-3">
                <div class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">${this.status}</div>
                <button
                  class="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                  @click=${() => this.loadInitialData(undefined, { mode: 'silent' })}
                  type="button"
                >
                  ${this.msg.reload}
                </button>
              </div>
            </div>
          </div>
        </header>

        <main class="mx-auto max-w-6xl px-6 py-6">
          <div class="grid grid-cols-12 gap-6">
            <section class="col-span-8">
              <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div class="border-b border-slate-200 px-5 py-4">
                  <div class="flex flex-col gap-3">
                    <div class="grid grid-cols-12 gap-3">
                      <div class="col-span-4">
                        <label class="block text-xs font-semibold text-slate-600">${this.msg.filterStatus}</label>
                        <select
                          class="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                          @change=${(e: Event) => {
                            const status = (e.currentTarget as HTMLSelectElement).value;
                            void this.loadListPagamentos({ status });
                          }}
                        >
                          <option value="">${this.msg.filterStatus}</option>
                          <option value="pendente">pendente</option>
                          <option value="confirmado">confirmado</option>
                          <option value="estornado">estornado</option>
                          <option value="reembolso_solicitado">reembolso_solicitado</option>
                        </select>
                      </div>

                      <div class="col-span-8">
                        <label class="block text-xs font-semibold text-slate-600">${this.msg.filterPedidoId}</label>
                        <div class="mt-1 flex gap-2">
                          <input
                            class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                            @keydown=${(e: KeyboardEvent) => {
                              if (e.key !== 'Enter') return;
                              const pedidoId = (e.currentTarget as HTMLInputElement).value;
                              void this.loadListPagamentos({ pedidoId });
                            }}
                            placeholder=${this.msg.filterPedidoId}
                            type="text"
                          />
                          <button
                            class="inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                            @click=${(e: Event) => {
                              const root = (e.currentTarget as HTMLElement).closest('div') as HTMLElement | null;
                              const input = root?.querySelector('input') as HTMLInputElement | null;
                              const pedidoId = input?.value ?? '';
                              void this.loadListPagamentos({ pedidoId });
                            }}
                            type="button"
                          >
                            ${this.msg.confirm}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center justify-between">
                      <div class="text-xs text-slate-500">${this.status}</div>
                    </div>
                  </div>
                </div>

                <div class="overflow-hidden">
                  <div class="grid grid-cols-12 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-600">
                    <div class="col-span-3">${this.msg.pagamentoId}</div>
                    <div class="col-span-3">${this.msg.filterPedidoId}</div>
                    <div class="col-span-2">metodo</div>
                    <div class="col-span-2">status</div>
                    <div class="col-span-2 text-right">valor</div>
                  </div>

                  <div class="divide-y divide-slate-100">
                    ${(pagamentos.length ? pagamentos : []).map(
                      (p) => html`
                        <div class="grid grid-cols-12 items-center px-5 py-3 text-sm hover:bg-slate-50">
                          <div class="col-span-3 font-medium text-slate-900">${p.id}</div>
                          <div class="col-span-3 text-slate-700">${p.pedidoId}</div>
                          <div class="col-span-2 text-slate-700">${p.metodo}</div>
                          <div class="col-span-2">
                            <span class="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">${p.status}</span>
                          </div>
                          <div class="col-span-2 text-right tabular-nums text-slate-900">${p.valor}</div>

                          <div class="col-span-12 mt-2 flex flex-wrap items-center justify-end gap-2">
                            <a
                              class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              href=${`/pedidos/${encodeURIComponent(p.pedidoId ?? '')}`}
                            >
                              ${this.msg.filterPedidoId}
                            </a>
                            <a
                              class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              href=${`/pagamentos/${encodeURIComponent(p.id ?? '')}/comprovante`}
                            >
                              ${this.msg.pagamentoId}
                            </a>
                          </div>
                        </div>
                      `,
                    )}
                  </div>
                </div>
              </div>
            </section>

            <aside class="col-span-4">
              <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <h2 class="text-base font-semibold text-slate-900">${this.msg.confirm}</h2>
                    <p class="mt-1 text-sm text-slate-600">${this.msg.motivo}</p>
                  </div>
                </div>

                <div class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div class="grid grid-cols-1 gap-2 text-sm">
                    <div class="flex items-center justify-between gap-3">
                      <div class="text-xs font-semibold text-slate-600">id</div>
                      <div class="text-slate-900">${this.reembolso?.id ?? ''}</div>
                    </div>
                    <div class="flex items-start justify-between gap-3">
                      <div class="text-xs font-semibold text-slate-600">condicoes</div>
                      <div class="max-w-[14rem] text-right text-slate-800">${this.reembolso?.condicoes ?? ''}</div>
                    </div>
                    <div class="flex items-center justify-between gap-3">
                      <div class="text-xs font-semibold text-slate-600">prazoMaximoMin</div>
                      <div class="text-slate-900">${this.reembolso?.prazoMaximoMin ?? ''}</div>
                    </div>
                    <div class="flex items-center justify-between gap-3">
                      <div class="text-xs font-semibold text-slate-600">permiteReembolso</div>
                      <div class="text-slate-900">${String(this.reembolso?.permiteReembolso ?? '')}</div>
                    </div>
                    <div class="flex items-center justify-between gap-3">
                      <div class="text-xs font-semibold text-slate-600">ativo</div>
                      <div class="text-slate-900">${String(this.reembolso?.ativo ?? '')}</div>
                    </div>
                  </div>
                </div>

                <form class="mt-4 space-y-3" @submit=${this.handleProcessarReembolsoSubmit}>
                  <div>
                    <label class="block text-xs font-semibold text-slate-600">${this.msg.pagamentoId}</label>
                    <input
                      class="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                      name="pagamentoId"
                      type="text"
                    />
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-slate-600">${this.msg.motivo}</label>
                    <textarea
                      class="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                      name="motivo"
                      rows="3"
                    ></textarea>
                  </div>

                  <button
                    class="inline-flex w-full items-center justify-center rounded-md bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                    ?disabled=${!(this.reembolso?.permiteReembolso ?? false)}
                    type="submit"
                  >
                    ${this.msg.confirm}
                  </button>
                </form>

                <div class="mt-4 text-xs text-slate-500">${this.status}</div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    `;
  }
}
