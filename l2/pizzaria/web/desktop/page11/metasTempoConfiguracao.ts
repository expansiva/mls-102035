/// <mls fileReference="_102035_/l2/pizzaria/web/desktop/page11/metasTempoConfiguracao.ts" enhancement="_102027_/l2/enhancementLit.ts" />

import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { PizzariaMetasTempoConfiguracaoBase } from '/_102035_/l2/pizzaria/web/shared/metasTempoConfiguracao.js';

@customElement('pizzaria--web--desktop--page11--metas-tempo-configuracao-102035')
export class PizzariaWebDesktopMetasTempoConfiguracaoPage extends PizzariaMetasTempoConfiguracaoBase {
  render() {
    const metasResumo = this.metasTempoResumo;
    const metas = this.metasTempo;
    const desvios = this.desviosTempo ?? [];

    const totalMin =
      (metasResumo?.metaRecebidoMin ?? 0) + (metasResumo?.metaProntoMin ?? 0) + (metasResumo?.metaEntregueMin ?? 0);

    return html`
      <div class="min-h-screen bg-slate-50 text-slate-900">
        <div class="mx-auto max-w-6xl px-6 py-6">
          <header class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div class="min-w-0">
                <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">${this.msg.brand}</div>
                <h1 class="mt-1 text-2xl font-semibold leading-tight text-slate-900">${this.msg.pageTitle}</h1>
                <p class="mt-2 text-sm text-slate-600">${this.msg.pageSubtitle}</p>
              </div>

              <div class="flex flex-col items-stretch gap-2 md:items-end">
                ${this.status
                  ? html`<div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">${this.status}</div>`
                  : html``}
                <button
                  class="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                  @click=${() => this.loadInitialData(undefined, { mode: 'blocking' })}
                  type="button"
                >
                  ${this.msg.reload}
                </button>
              </div>
            </div>

            <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div class="rounded-xl border border-slate-200 bg-white p-4">
                <div class="text-xs font-medium text-slate-500">${this.msg.metaRecebidoMin}</div>
                <div class="mt-1 text-2xl font-semibold">${metasResumo?.metaRecebidoMin ?? ''}</div>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white p-4">
                <div class="text-xs font-medium text-slate-500">${this.msg.metaProntoMin}</div>
                <div class="mt-1 text-2xl font-semibold">${metasResumo?.metaProntoMin ?? ''}</div>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white p-4">
                <div class="text-xs font-medium text-slate-500">${this.msg.metaEntregueMin}</div>
                <div class="mt-1 text-2xl font-semibold">${metasResumo?.metaEntregueMin ?? ''}</div>
              </div>
              <div class="rounded-xl border border-slate-200 bg-slate-900 p-4 text-white">
                <div class="text-xs font-medium text-slate-200">${this.msg.etapa}</div>
                <div class="mt-1 text-2xl font-semibold">${totalMin}</div>
              </div>
            </div>

            <div class="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <div class="flex items-center gap-2">
                <span class="font-medium text-slate-700">${this.msg.atualizadoEm}</span>
                <span class="rounded-md bg-slate-100 px-2 py-1">${metasResumo?.atualizadoEm ?? ''}</span>
              </div>
            </div>
          </header>

          <main class="mt-6 grid gap-6 lg:grid-cols-5">
            <section class="lg:col-span-2">
              <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <h2 class="text-lg font-semibold text-slate-900">${this.msg.save}</h2>
                    <p class="mt-1 text-sm text-slate-600">${this.msg.pageSubtitle}</p>
                  </div>
                </div>

                <form class="mt-5 space-y-4" @submit=${this.handleSaveSubmit}>
                  <div>
                    <label class="block text-sm font-medium text-slate-700" for="metaRecebidoMin">${this.msg.metaRecebidoMin}</label>
                    <input
                      id="metaRecebidoMin"
                      name="metaRecebidoMin"
                      type="number"
                      inputmode="numeric"
                      class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      .value=${String(metas?.metaRecebidoMin ?? '')}
                      required
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-slate-700" for="metaProntoMin">${this.msg.metaProntoMin}</label>
                    <input
                      id="metaProntoMin"
                      name="metaProntoMin"
                      type="number"
                      inputmode="numeric"
                      class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      .value=${String(metas?.metaProntoMin ?? '')}
                      required
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-slate-700" for="metaEntregueMin">${this.msg.metaEntregueMin}</label>
                    <input
                      id="metaEntregueMin"
                      name="metaEntregueMin"
                      type="number"
                      inputmode="numeric"
                      class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      .value=${String(metas?.metaEntregueMin ?? '')}
                      required
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-slate-700" for="observacao">${this.msg.observacao}</label>
                    <textarea
                      id="observacao"
                      name="observacao"
                      rows="3"
                      class="mt-1 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    >${metas?.observacao ?? ''}</textarea>
                  </div>

                  <div class="grid gap-3 sm:grid-cols-2">
                    <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <div class="text-xs font-medium text-slate-500">${this.msg.atualizadoEm}</div>
                      <div class="mt-1 text-sm text-slate-800">${metas?.atualizadoEm ?? ''}</div>
                    </div>
                    <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <div class="text-xs font-medium text-slate-500">${this.msg.atualizadoPor}</div>
                      <div class="mt-1 text-sm text-slate-800">${metas?.atualizadoPor ?? ''}</div>
                    </div>
                  </div>

                  <div class="pt-2">
                    <button
                      class="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                      type="submit"
                    >
                      ${this.msg.save}
                    </button>
                  </div>
                </form>
              </div>
            </section>

            <section class="lg:col-span-3">
              <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div class="border-b border-slate-200 p-6">
                  <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 class="text-lg font-semibold text-slate-900">${this.msg.loadingDesviosTempo}</h2>
                      <p class="mt-1 text-sm text-slate-600">${this.msg.periodoDias}</p>
                    </div>

                    <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
                      <div class="w-full sm:w-44">
                        <label class="block text-xs font-medium text-slate-600" for="periodoDias">${this.msg.periodoDias}</label>
                        <input
                          id="periodoDias"
                          type="number"
                          inputmode="numeric"
                          class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                          value="7"
                          @change=${(e: Event) => {
                            const v = Number((e.currentTarget as HTMLInputElement | null)?.value ?? '7');
                            void this.loadListDesviosTempo({ periodoDias: v }, { mode: 'blocking' });
                          }}
                        />
                      </div>

                      <div class="pt-5 sm:pt-0">
                        <button
                          class="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 sm:w-auto"
                          @click=${() => this.loadListDesviosTempo({ periodoDias: 7 }, { mode: 'blocking' })}
                          type="button"
                        >
                          ${this.msg.reload}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-slate-200">
                    <thead class="bg-slate-50">
                      <tr>
                        <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">${this.msg.etapa}</th>
                        <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">${this.msg.metaProntoMin}</th>
                        <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">${this.msg.metaEntregueMin}</th>
                        <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">${this.msg.metaRecebidoMin}</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200 bg-white">
                      ${desvios.map((d) => {
                        const percent = d.metaMin ? Math.round(((d.tempoDecorridoMin - d.metaMin) / d.metaMin) * 100) : 0;
                        const badgeClass = percent >= 50 ? 'bg-rose-50 text-rose-700 border-rose-200' : percent >= 20 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-700 border-slate-200';

                        return html`
                          <tr class="hover:bg-slate-50">
                            <td class="whitespace-nowrap px-6 py-4">
                              <div class="flex items-center gap-3">
                                <div class="min-w-0">
                                  <div class="text-sm font-semibold text-slate-900">${d.pedidoId}</div>
                                  <div class="mt-0.5 text-xs text-slate-600">${d.etapa}</div>
                                  <div class="mt-1 flex flex-wrap items-center gap-2">
                                    <span class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClass}">
                                      ${percent}%
                                    </span>
                                    <span class="text-xs text-slate-500">${d.statusPedido ?? ''}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td class="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                              <div class="font-medium">${d.tempoDecorridoMin}</div>
                              <div class="text-xs text-slate-500">${d.metaMin}</div>
                            </td>

                            <td class="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                              <div class="text-xs text-slate-500">${d.criadoEm ?? ''}</div>
                            </td>

                            <td class="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                              <span class="text-xs text-slate-500">${''}</span>
                            </td>
                          </tr>
                        `;
                      })}
                    </tbody>
                  </table>
                </div>

                ${desvios.length === 0
                  ? html`
                      <div class="border-t border-slate-200 p-6 text-sm text-slate-600">${this.msg.couldNotLoad}</div>
                    `
                  : html``}
              </div>
            </section>
          </main>
        </div>
      </div>
    `;
  }
}
