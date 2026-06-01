/// <mls fileReference="_102035_/l2/locadora/web/desktop/page11/veiculosLista.ts" enhancement="_102027_/l2/enhancementLit.ts" />

import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { LocadoraVeiculosListaBase } from '/_102035_/l2/locadora/web/shared/veiculosLista.js';

@customElement('locadora--web--desktop--page11--veiculos-lista-102035')
export class LocadoraWebDesktopVeiculosListaPage extends LocadoraVeiculosListaBase {
  render() {
    const statusOptions = ['todos', 'disponível', 'locado', 'manutenção'];

    return html`
      <main class="min-h-screen bg-slate-50 text-slate-900">
        <header class="border-b border-slate-200 bg-white">
          <div class="mx-auto max-w-6xl px-6 py-5">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div class="text-xs font-semibold tracking-wide text-slate-500">${this.msg.brand}</div>
                <h1 class="mt-1 text-2xl font-semibold leading-tight text-slate-900">${this.msg.pageTitle}</h1>
                <p class="mt-1 text-sm text-slate-600">${this.msg.pageSubtitle}</p>
              </div>

              <div class="flex items-center gap-3">
                <div class="text-sm text-slate-600">${this.status}</div>
                <button
                  type="button"
                  class="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  @click=${this.handleReloadClick}
                >
                  ${this.msg.reload}
                </button>
              </div>
            </div>
          </div>
        </header>

        <section class="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-12">
          <aside class="lg:col-span-4">
            <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h2 class="text-sm font-semibold text-slate-900">${this.msg.filterStatus}</h2>
                  <div class="mt-1 text-xs text-slate-500">
                    ${this.status}
                  </div>
                </div>
                <div class="shrink-0">
                  ${this.loading === 'loading'
                    ? html`<div class="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">${this.msg.loadingVeiculos}</div>`
                    : this.error === 'error'
                      ? html`<div class="rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">${this.msg.couldNotLoad}</div>`
                      : html``}
                </div>
              </div>

              <div class="mt-4">
                <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                  ${statusOptions.map(
                    (opt) => html`
                      <button
                        type="button"
                        class=${[
                          'rounded-md border px-3 py-2 text-left text-sm font-medium transition',
                          this.filterStatus === opt
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                        ].join(' ')}
                        @click=${() => {
                          this.filterStatus = opt;
                          void this.loadListVeiculos({ status: opt });
                        }}
                      >
                        ${opt === 'todos' ? this.msg.filterStatus : this.msg.status}
                        <div class="mt-0.5 text-xs opacity-80">${opt}</div>
                      </button>
                    `,
                  )}
                </div>
              </div>
            </div>
          </aside>

          <div class="lg:col-span-8">
            <div class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div class="border-b border-slate-200 px-4 py-3">
                <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h2 class="text-sm font-semibold text-slate-900">${this.msg.pageTitle}</h2>
                  <div class="text-xs text-slate-500">
                    ${(this.veiculo ?? []).length} ${this.msg.itemsAvailable}
                  </div>
                </div>
              </div>

              <div class="overflow-x-auto">
                <table class="min-w-full border-separate border-spacing-0">
                  <thead class="bg-slate-50">
                    <tr>
                      <th class="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">${this.msg.placa}</th>
                      <th class="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">${this.msg.modelo}</th>
                      <th class="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">${this.msg.ano}</th>
                      <th class="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">${this.msg.categoria}</th>
                      <th class="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">${this.msg.status}</th>
                      <th class="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">${this.msg.quilometragem}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-200">
                    ${(this.veiculo ?? []).map(
                      (item) => html`
                        <tr class="hover:bg-slate-50">
                          <td class="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">${item.placa ?? ''}</td>
                          <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-700">${item.modelo ?? ''}</td>
                          <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-700">${item.ano ?? ''}</td>
                          <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-700">${item.categoria ?? ''}</td>
                          <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-700">${item.status ?? ''}</td>
                          <td class="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">${item.quilometragem ?? ''}</td>
                        </tr>
                      `,
                    )}
                  </tbody>
                </table>
              </div>

              ${(this.veiculo ?? []).length === 0
                ? html`
                    <div class="px-4 py-6 text-sm text-slate-600">
                      ${this.status || this.msg.couldNotLoad}
                    </div>
                  `
                : html``}
            </div>
          </div>
        </section>
      </main>
    `;
  }
}
