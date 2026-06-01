/// <mls fileReference="_102035_/l2/locadora/web/desktop/page11/locacoesLista.ts" enhancement="_102027_/l2/enhancementLit.ts" />

import { html } from 'lit';
import { LocadoraLocacoesListaBase } from '/_102035_/l2/locadora/web/shared/locacoesLista.js';
import { customElement } from 'lit/decorators.js';

@customElement('locadora--web--desktop--page11--locacoes-lista-102035')
export class LocadoraWebDesktopLocacoesListaPage extends LocadoraLocacoesListaBase {
  render() {
    const items = this.locacao ?? [];
    const isBusy = this.loadState === 'loading' || this.filteringState === 'loading';

    return html`
      <div class="min-h-screen bg-slate-50 text-slate-900">
        <header class="border-b border-slate-200 bg-white">
          <div class="mx-auto w-full max-w-7xl px-6 py-5">
            <div class="flex items-start justify-between gap-6">
              <div class="min-w-0">
                <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">${this.msg.brand}</div>
                <h1 class="mt-1 truncate text-2xl font-semibold text-slate-900">${this.msg.pageTitle}</h1>
                <p class="mt-1 text-sm text-slate-600">${this.msg.pageSubtitle}</p>
              </div>

              <div class="flex items-center gap-3">
                <button
                  class="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  ?disabled=${isBusy}
                  @click=${() => this.loadListLocacoes()}
                  type="button"
                >
                  ${this.msg.reload}
                </button>
              </div>
            </div>

            <div class="mt-4 flex flex-wrap items-center gap-3">
              <div
                class="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700"
                aria-live="polite"
              >
                <span
                  class=${
                    "h-2 w-2 rounded-full " +
                    (this.loadState === 'loading' || this.filteringState === 'loading'
                      ? 'bg-amber-500'
                      : this.loadState === 'error' || this.filteringState === 'error'
                        ? 'bg-rose-600'
                        : 'bg-emerald-600')
                  }
                ></span>
                <span class="min-w-0 truncate">${this.status}</span>
              </div>

              ${isBusy
                ? html`
                    <div class="text-sm text-slate-500">${this.filteringState === 'loading' ? this.msg.filtering : this.msg.loadingLocacoes}</div>
                  `
                : html``}
            </div>
          </div>
        </header>

        <main class="mx-auto w-full max-w-7xl px-6 py-6">
          <div class="grid grid-cols-12 gap-6">
            <aside class="col-span-12 lg:col-span-4">
              <section class="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div class="border-b border-slate-200 px-5 py-4">
                  <div class="text-sm font-semibold text-slate-900">${this.msg.filtering}</div>
                  <div class="mt-1 text-xs text-slate-500">${this.msg.pageSubtitle}</div>
                </div>

                <form class="px-5 py-5" @submit=${this.handleFilteringSubmit}>
                  <div class="grid grid-cols-1 gap-4">
                    <label class="block">
                      <div class="text-xs font-medium text-slate-700">${this.msg.placaVeiculo}</div>
                      <input
                        class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        name="placaVeiculo"
                        .value=${this.placaVeiculo ?? ''}
                        ?disabled=${isBusy}
                      />
                    </label>

                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label class="block">
                        <div class="text-xs font-medium text-slate-700">${this.msg.dataRetiradaInicio}</div>
                        <input
                          class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                          name="dataRetiradaInicio"
                          .value=${this.dataRetiradaInicio ?? ''}
                          ?disabled=${isBusy}
                        />
                      </label>

                      <label class="block">
                        <div class="text-xs font-medium text-slate-700">${this.msg.dataRetiradaFim}</div>
                        <input
                          class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                          name="dataRetiradaFim"
                          .value=${this.dataRetiradaFim ?? ''}
                          ?disabled=${isBusy}
                        />
                      </label>
                    </div>

                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label class="block">
                        <div class="text-xs font-medium text-slate-700">${this.msg.devolucaoPrevistaInicio}</div>
                        <input
                          class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                          name="devolucaoPrevistaInicio"
                          .value=${this.devolucaoPrevistaInicio ?? ''}
                          ?disabled=${isBusy}
                        />
                      </label>

                      <label class="block">
                        <div class="text-xs font-medium text-slate-700">${this.msg.devolucaoPrevistaFim}</div>
                        <input
                          class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                          name="devolucaoPrevistaFim"
                          .value=${this.devolucaoPrevistaFim ?? ''}
                          ?disabled=${isBusy}
                        />
                      </label>
                    </div>

                    <label class="block">
                      <div class="text-xs font-medium text-slate-700">${this.msg.formaPagamento}</div>
                      <input
                        class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        name="formaPagamento"
                        .value=${this.formaPagamento ?? ''}
                        ?disabled=${isBusy}
                      />
                    </label>

                    <div class="pt-2">
                      <button
                        class="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        type="submit"
                        ?disabled=${isBusy}
                      >
                        ${this.msg.filtering}
                      </button>
                    </div>
                  </div>
                </form>
              </section>
            </aside>

            <section class="col-span-12 lg:col-span-8">
              <div class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div class="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
                  <div class="min-w-0">
                    <div class="text-sm font-semibold text-slate-900">${this.msg.pageTitle}</div>
                    <div class="mt-1 text-xs text-slate-500">${items.length} ${this.msg.itemsAvailable}</div>
                  </div>
                </div>

                <div class="overflow-x-auto">
                  <table class="w-full border-collapse">
                    <thead class="bg-slate-50">
                      <tr class="text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        <th class="whitespace-nowrap px-5 py-3">${this.msg.dataRetirada}</th>
                        <th class="whitespace-nowrap px-5 py-3">${this.msg.dataDevolucao}</th>
                        <th class="whitespace-nowrap px-5 py-3">${this.msg.devolucaoPrevista}</th>
                        <th class="whitespace-nowrap px-5 py-3">${this.msg.valorDiario}</th>
                        <th class="whitespace-nowrap px-5 py-3">${this.msg.seguroOpcional}</th>
                        <th class="whitespace-nowrap px-5 py-3">${this.msg.formaPagamento}</th>
                        <th class="whitespace-nowrap px-5 py-3">${this.msg.placa}</th>
                        <th class="whitespace-nowrap px-5 py-3">${this.msg.cpf}</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200">
                      ${(items ?? []).map((l) => {
                        const isSelected = (this.selectedLocacaoId ?? '') === ((l as any).id ?? '');
                        return html`
                          <tr
                            class=${
                              "cursor-pointer transition-colors " +
                              (isSelected ? 'bg-slate-100' : 'bg-white hover:bg-slate-50')
                            }
                            @click=${() => (this.selectedLocacaoId = ((l as any).id ?? '') as any)}
                          >
                            <td class="whitespace-nowrap px-5 py-3 text-sm text-slate-900">${l.dataRetirada ?? ''}</td>
                            <td class="whitespace-nowrap px-5 py-3 text-sm text-slate-900">${l.dataDevolucao ?? ''}</td>
                            <td class="whitespace-nowrap px-5 py-3 text-sm text-slate-900">${l.devolucaoPrevista ?? ''}</td>
                            <td class="whitespace-nowrap px-5 py-3 text-sm text-slate-900">${l.valorDiario ?? ''}</td>
                            <td class="whitespace-nowrap px-5 py-3 text-sm text-slate-900">${l.seguroOpcional ?? ''}</td>
                            <td class="whitespace-nowrap px-5 py-3 text-sm text-slate-900">${l.formaPagamento ?? ''}</td>
                            <td class="whitespace-nowrap px-5 py-3 text-sm font-medium text-slate-900">${l.placaVeiculo ?? ''}</td>
                            <td class="whitespace-nowrap px-5 py-3 text-sm text-slate-900">${l.cpf ?? ''}</td>
                          </tr>
                        `;
                      })}
                    </tbody>
                  </table>
                </div>

                ${items.length === 0
                  ? html`
                      <div class="px-5 py-10 text-center text-sm text-slate-600">${this.status}</div>
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
