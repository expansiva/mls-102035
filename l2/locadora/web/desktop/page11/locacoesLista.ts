/// <mls fileReference="_102035_/l2/locadora/web/desktop/page11/locacoesLista.ts" enhancement="_102027_/l2/enhancementLit.ts" />

import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { LocadoraLocacoesListaBase } from '/_102035_/l2/locadora/web/shared/locacoesLista.js';

@customElement('locadora--web--desktop--page11--locacoes-lista-102035')
export class LocadoraWebDesktopLocacoesListaPage extends LocadoraLocacoesListaBase {
  render() {
    return html`
      <div class="min-h-screen bg-slate-50 text-slate-900">
        <header class="border-b bg-white">
          <div class="mx-auto w-full max-w-7xl px-6 py-5">
            <div class="flex items-start justify-between gap-6">
              <div class="min-w-0">
                <div class="text-xs font-semibold tracking-wide text-slate-500">${this.msg.brand}</div>
                <h1 class="mt-1 truncate text-2xl font-semibold text-slate-900">${this.msg.pageTitle}</h1>
                <p class="mt-1 text-sm text-slate-600">${this.msg.pageSubtitle}</p>
              </div>
              <div class="flex shrink-0 items-center gap-3">
                <div class="hidden text-sm text-slate-600 sm:block">${this.status}</div>
                <button
                  type="button"
                  class="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 active:bg-slate-100"
                  @click=${() => this.loadListLocacoes(undefined)}
                >
                  ${this.msg.reload}
                </button>
              </div>
            </div>
            <div class="mt-3 text-sm text-slate-600 sm:hidden">${this.status}</div>
          </div>
        </header>

        <main class="mx-auto w-full max-w-7xl px-6 py-6">
          <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex flex-col gap-4">
              <div class="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div class="md:col-span-4">
                  <label class="block text-xs font-semibold uppercase tracking-wide text-slate-600">${this.msg.placaVeiculo}</label>
                  <input
                    class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    .value=${(this as any).ui?.locacoesLista?.filter?.placaVeiculo ?? ''}
                    @input=${(e: Event) =>
                      this.loadListLocacoes({
                        placaVeiculo: (e.target as HTMLInputElement).value,
                        dataRetiradaInicio: (this as any).ui?.locacoesLista?.filter?.dataRetiradaInicio,
                        dataRetiradaFim: (this as any).ui?.locacoesLista?.filter?.dataRetiradaFim,
                        devolucaoPrevistaInicio: (this as any).ui?.locacoesLista?.filter?.devolucaoPrevistaInicio,
                        devolucaoPrevistaFim: (this as any).ui?.locacoesLista?.filter?.devolucaoPrevistaFim,
                        formaPagamento: (this as any).ui?.locacoesLista?.filter?.formaPagamento,
                      })}
                  />
                </div>

                <div class="md:col-span-4">
                  <label class="block text-xs font-semibold uppercase tracking-wide text-slate-600">${this.msg.formaPagamento}</label>
                  <input
                    class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    .value=${(this as any).ui?.locacoesLista?.filter?.formaPagamento ?? ''}
                    @input=${(e: Event) =>
                      this.loadListLocacoes({
                        placaVeiculo: (this as any).ui?.locacoesLista?.filter?.placaVeiculo,
                        dataRetiradaInicio: (this as any).ui?.locacoesLista?.filter?.dataRetiradaInicio,
                        dataRetiradaFim: (this as any).ui?.locacoesLista?.filter?.dataRetiradaFim,
                        devolucaoPrevistaInicio: (this as any).ui?.locacoesLista?.filter?.devolucaoPrevistaInicio,
                        devolucaoPrevistaFim: (this as any).ui?.locacoesLista?.filter?.devolucaoPrevistaFim,
                        formaPagamento: (e.target as HTMLInputElement).value,
                      })}
                  />
                </div>

                <div class="md:col-span-4">
                  <div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    ${this.msg.alertVeiculoIndisponivel}
                  </div>
                </div>

                <div class="md:col-span-3">
                  <label class="block text-xs font-semibold uppercase tracking-wide text-slate-600">${this.msg.dataRetiradaInicio}</label>
                  <input
                    type="date"
                    class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    .value=${(this as any).ui?.locacoesLista?.filter?.dataRetiradaInicio ?? ''}
                    @change=${(e: Event) =>
                      this.loadListLocacoes({
                        placaVeiculo: (this as any).ui?.locacoesLista?.filter?.placaVeiculo,
                        dataRetiradaInicio: (e.target as HTMLInputElement).value,
                        dataRetiradaFim: (this as any).ui?.locacoesLista?.filter?.dataRetiradaFim,
                        devolucaoPrevistaInicio: (this as any).ui?.locacoesLista?.filter?.devolucaoPrevistaInicio,
                        devolucaoPrevistaFim: (this as any).ui?.locacoesLista?.filter?.devolucaoPrevistaFim,
                        formaPagamento: (this as any).ui?.locacoesLista?.filter?.formaPagamento,
                      })}
                  />
                </div>

                <div class="md:col-span-3">
                  <label class="block text-xs font-semibold uppercase tracking-wide text-slate-600">${this.msg.dataRetiradaFim}</label>
                  <input
                    type="date"
                    class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    .value=${(this as any).ui?.locacoesLista?.filter?.dataRetiradaFim ?? ''}
                    @change=${(e: Event) =>
                      this.loadListLocacoes({
                        placaVeiculo: (this as any).ui?.locacoesLista?.filter?.placaVeiculo,
                        dataRetiradaInicio: (this as any).ui?.locacoesLista?.filter?.dataRetiradaInicio,
                        dataRetiradaFim: (e.target as HTMLInputElement).value,
                        devolucaoPrevistaInicio: (this as any).ui?.locacoesLista?.filter?.devolucaoPrevistaInicio,
                        devolucaoPrevistaFim: (this as any).ui?.locacoesLista?.filter?.devolucaoPrevistaFim,
                        formaPagamento: (this as any).ui?.locacoesLista?.filter?.formaPagamento,
                      })}
                  />
                </div>

                <div class="md:col-span-3">
                  <label class="block text-xs font-semibold uppercase tracking-wide text-slate-600">${this.msg.devolucaoPrevistaInicio}</label>
                  <input
                    type="date"
                    class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    .value=${(this as any).ui?.locacoesLista?.filter?.devolucaoPrevistaInicio ?? ''}
                    @change=${(e: Event) =>
                      this.loadListLocacoes({
                        placaVeiculo: (this as any).ui?.locacoesLista?.filter?.placaVeiculo,
                        dataRetiradaInicio: (this as any).ui?.locacoesLista?.filter?.dataRetiradaInicio,
                        dataRetiradaFim: (this as any).ui?.locacoesLista?.filter?.dataRetiradaFim,
                        devolucaoPrevistaInicio: (e.target as HTMLInputElement).value,
                        devolucaoPrevistaFim: (this as any).ui?.locacoesLista?.filter?.devolucaoPrevistaFim,
                        formaPagamento: (this as any).ui?.locacoesLista?.filter?.formaPagamento,
                      })}
                  />
                </div>

                <div class="md:col-span-3">
                  <label class="block text-xs font-semibold uppercase tracking-wide text-slate-600">${this.msg.devolucaoPrevistaFim}</label>
                  <input
                    type="date"
                    class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    .value=${(this as any).ui?.locacoesLista?.filter?.devolucaoPrevistaFim ?? ''}
                    @change=${(e: Event) =>
                      this.loadListLocacoes({
                        placaVeiculo: (this as any).ui?.locacoesLista?.filter?.placaVeiculo,
                        dataRetiradaInicio: (this as any).ui?.locacoesLista?.filter?.dataRetiradaInicio,
                        dataRetiradaFim: (this as any).ui?.locacoesLista?.filter?.dataRetiradaFim,
                        devolucaoPrevistaInicio: (this as any).ui?.locacoesLista?.filter?.devolucaoPrevistaInicio,
                        devolucaoPrevistaFim: (e.target as HTMLInputElement).value,
                        formaPagamento: (this as any).ui?.locacoesLista?.filter?.formaPagamento,
                      })}
                  />
                </div>
              </div>
            </div>
          </section>

          <section class="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div class="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div class="min-w-0">
                <div class="text-sm font-semibold text-slate-900">${this.status}</div>
              </div>
            </div>

            <div class="overflow-auto">
              <table class="min-w-full border-separate border-spacing-0">
                <thead class="sticky top-0 bg-slate-50">
                  <tr>
                    <th class="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">${this.msg.colPlacaVeiculo}</th>
                    <th class="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">${this.msg.colDataRetirada}</th>
                    <th class="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">${this.msg.colDevolucaoPrevista}</th>
                    <th class="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">${this.msg.colDataDevolucao}</th>
                    <th class="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">${this.msg.colValorDiario}</th>
                    <th class="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">${this.msg.colSeguroOpcional}</th>
                    <th class="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">${this.msg.colFormaPagamento}</th>
                  </tr>
                </thead>
                <tbody class="bg-white">
                  ${(this.locacao ?? []).map((l) => {
                    const selected = ((this as any).ui?.locacoesLista?.selectedLocacaoId ?? '') === (l as any).locacaoId;
                    return html`
                      <tr
                        class=${selected
                          ? 'bg-slate-100'
                          : 'bg-white hover:bg-slate-50'}
                      >
                        <td class="border-b border-slate-100 px-4 py-3 align-top">
                          <button
                            type="button"
                            class="w-full text-left text-sm font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500"
                            @click=${() => {
                              (this as any).ui = (this as any).ui ?? {};
                              (this as any).ui.locacoesLista = (this as any).ui.locacoesLista ?? {};
                              (this as any).ui.locacoesLista.selectedLocacaoId = (l as any).locacaoId;
                            }}
                          >
                            ${l.placaVeiculo}
                          </button>
                        </td>
                        <td class="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-sm text-slate-700">${l.dataRetirada}</td>
                        <td class="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-sm text-slate-700">${l.devolucaoPrevista}</td>
                        <td class="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-sm text-slate-700">${l.dataDevolucao}</td>
                        <td class="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-sm text-slate-700">${l.valorDiario}</td>
                        <td class="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-sm text-slate-700">${l.seguroOpcional ?? ''}</td>
                        <td class="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">${l.formaPagamento}</td>
                      </tr>
                    `;
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    `;
  }
}
