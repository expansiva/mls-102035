/// <mls fileReference="_102035_/l2/locadora/web/desktop/page11/adminDashboard.ts" enhancement="_102027_/l2/enhancementLit.ts" />

import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { LocadoraAdminDashboardBase } from '/_102035_/l2/locadora/web/shared/adminDashboard.js';

@customElement('locadora--web--desktop--page11--admin-dashboard-102035')
export class LocadoraWebDesktopAdminDashboardPage extends LocadoraAdminDashboardBase {
  render() {
    const cards = (this.quickAccess as any)?.cards ?? [];
    const veiculos = (this.summary as any)?.veiculos ?? [];
    const clientes = (this.summary as any)?.clientes ?? [];
    const locacoes = (this.summary as any)?.locacoes ?? [];

    const filteredVeiculos = this.filterStatus
      ? veiculos.filter((v: any) => (v?.status ?? '') === this.filterStatus)
      : veiculos;

    const statusOptions = Array.from(
      new Set((veiculos ?? []).map((v: any) => (v?.status ?? '')).filter((s: any) => !!s)),
    );

    return html`
      <div class="min-h-screen bg-slate-50 text-slate-900">
        <header class="border-b border-slate-200 bg-white">
          <div class="mx-auto max-w-6xl px-6 py-5">
            <div class="flex items-start justify-between gap-6">
              <div class="min-w-0">
                <div class="text-sm font-semibold tracking-wide text-slate-600">${this.msg.brand}</div>
                <h1 class="mt-1 truncate text-2xl font-semibold text-slate-900">${this.msg.pageTitle}</h1>
                <p class="mt-1 text-sm text-slate-600">${this.msg.pageSubtitle}</p>
              </div>

              <div class="flex shrink-0 items-center gap-3">
                <div class="hidden rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 md:block">
                  ${this.status}
                </div>
                <button
                  class="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  @click=${this.handleReloadClick}
                >
                  ${this.msg.reload}
                </button>
              </div>
            </div>

            <div class="mt-4 flex flex-wrap items-center gap-2">
              <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                ${this.load}
              </span>
              ${this.status
                ? html`
                    <span class="text-xs text-slate-600">${this.status}</span>
                  `
                : html``}
            </div>
          </div>
        </header>

        <main class="mx-auto max-w-6xl px-6 py-6">
          <div class="grid grid-cols-12 gap-6">
            <section class="col-span-12 lg:col-span-5">
              <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div class="flex items-center justify-between gap-4">
                  <h2 class="text-sm font-semibold text-slate-900">${this.msg.loadingQuickAccess}</h2>
                  ${this.hoveredCard
                    ? html`
                        <div class="text-xs text-slate-600">
                          <span class="font-medium text-slate-700">${this.msg.fieldHoveredCard}:</span>
                          <span class="ml-1">${this.hoveredCard}</span>
                        </div>
                      `
                    : html``}
                </div>

                <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  ${(cards ?? []).map((c: any) => {
                    const isFocused = (c?.id ?? '') === this.hoveredCard;
                    return html`
                      <button
                        class=${[
                          'group rounded-lg border p-4 text-left transition',
                          isFocused ? 'border-slate-400 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                        ].join(' ')}
                        @mouseenter=${() => (this.hoveredCard = c?.id ?? '')}
                        @mouseleave=${() => (this.hoveredCard = '')}
                        @click=${() => this.dispatchEvent(new CustomEvent('locadora.adminDashboard.navigate', { detail: { target: c?.target }, bubbles: true, composed: true }))}
                      >
                        <div class="text-sm font-semibold text-slate-900">${c?.label ?? ''}</div>
                        <div class="mt-1 text-xs text-slate-600">${this.msg.confirm}</div>
                        <div class="mt-3 h-1 w-full overflow-hidden rounded bg-slate-100">
                          <div class=${['h-full rounded bg-slate-800 transition-all', isFocused ? 'w-2/3' : 'w-1/3 group-hover:w-1/2'].join(' ')}></div>
                        </div>
                      </button>
                    `;
                  })}
                </div>

                <div class="mt-4 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  ${this.status}
                </div>
              </div>
            </section>

            <section class="col-span-12 lg:col-span-7">
              <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div class="flex flex-wrap items-center justify-between gap-4">
                  <h2 class="text-sm font-semibold text-slate-900">${this.msg.loadingSummary}</h2>

                  <div class="flex flex-wrap items-center gap-2">
                    <div class="text-xs font-medium text-slate-700">${this.msg.fieldFilterStatus}</div>
                    <div class="flex flex-wrap gap-2">
                      ${(statusOptions ?? []).map(
                        (s: any) => html`
                          <button
                            class=${[
                              'rounded-full border px-3 py-1 text-xs font-medium transition',
                              this.filterStatus === s
                                ? 'border-slate-800 bg-slate-800 text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                            ].join(' ')}
                            @click=${() => (this.filterStatus = s)}
                          >
                            ${s}
                          </button>
                        `,
                      )}
                      <button
                        class="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        @click=${() => (this.filterStatus = '')}
                      >
                        ${this.msg.reload}
                      </button>
                    </div>
                  </div>
                </div>

                <div class="mt-5 grid grid-cols-1 gap-4">
                  <div class="rounded-md border border-slate-200 bg-slate-50 p-4">
                    <div class="flex items-center justify-between gap-4">
                      <div class="text-xs font-semibold text-slate-700">${this.msg.pageTitle}</div>
                      <div class="text-xs text-slate-600">${this.status}</div>
                    </div>

                    <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div class="rounded-md bg-white p-3 ring-1 ring-slate-200">
                        <div class="text-[11px] font-medium text-slate-500">${this.msg.itemsAvailable}</div>
                        <div class="mt-1 text-lg font-semibold text-slate-900">${(veiculos ?? []).length}</div>
                      </div>
                      <div class="rounded-md bg-white p-3 ring-1 ring-slate-200">
                        <div class="text-[11px] font-medium text-slate-500">${this.msg.itemsAvailable}</div>
                        <div class="mt-1 text-lg font-semibold text-slate-900">${(clientes ?? []).length}</div>
                      </div>
                      <div class="rounded-md bg-white p-3 ring-1 ring-slate-200">
                        <div class="text-[11px] font-medium text-slate-500">${this.msg.itemsAvailable}</div>
                        <div class="mt-1 text-lg font-semibold text-slate-900">${(locacoes ?? []).length}</div>
                      </div>
                      <div class="rounded-md bg-white p-3 ring-1 ring-slate-200">
                        <div class="text-[11px] font-medium text-slate-500">${this.msg.fieldFilterStatus}</div>
                        <div class="mt-1 text-lg font-semibold text-slate-900">${this.filterStatus || '-'}</div>
                      </div>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
                    <div class="rounded-lg border border-slate-200 bg-white">
                      <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                        <div class="text-sm font-semibold text-slate-900">${this.msg.pageSubtitle}</div>
                        <button
                          class="text-xs font-medium text-slate-700 hover:text-slate-900"
                          @click=${() => this.dispatchEvent(new CustomEvent('locadora.adminDashboard.navigate', { detail: { target: 'gestaoFrotaList' }, bubbles: true, composed: true }))}
                        >
                          ${this.msg.confirm}
                        </button>
                      </div>
                      <div class="max-h-72 overflow-auto">
                        <div class="divide-y divide-slate-100">
                          ${(filteredVeiculos ?? []).map(
                            (v: any) => html`
                              <div class="px-4 py-3 hover:bg-slate-50">
                                <div class="flex items-center justify-between gap-3">
                                  <div class="min-w-0">
                                    <div class="truncate text-sm font-semibold text-slate-900">${v?.placa ?? ''}</div>
                                    <div class="truncate text-xs text-slate-600">${v?.modelo ?? ''}</div>
                                  </div>
                                  <div class="shrink-0 text-right">
                                    <div class="text-xs font-medium text-slate-700">${v?.status ?? ''}</div>
                                    <div class="text-[11px] text-slate-500">${v?.categoria ?? ''}</div>
                                  </div>
                                </div>
                                ${v?.quilometragem !== undefined && v?.quilometragem !== null
                                  ? html`
                                      <div class="mt-2 text-[11px] text-slate-500">${v?.quilometragem}</div>
                                    `
                                  : html``}
                              </div>
                            `,
                          )}
                        </div>
                      </div>
                    </div>

                    <div class="rounded-lg border border-slate-200 bg-white">
                      <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                        <div class="text-sm font-semibold text-slate-900">${this.msg.pageTitle}</div>
                        <button
                          class="text-xs font-medium text-slate-700 hover:text-slate-900"
                          @click=${() => this.dispatchEvent(new CustomEvent('locadora.adminDashboard.navigate', { detail: { target: 'gestaoClientesList' }, bubbles: true, composed: true }))}
                        >
                          ${this.msg.confirm}
                        </button>
                      </div>
                      <div class="max-h-72 overflow-auto">
                        <div class="divide-y divide-slate-100">
                          ${(clientes ?? []).map(
                            (c: any) => html`
                              <div class="px-4 py-3 hover:bg-slate-50">
                                <div class="flex items-center justify-between gap-3">
                                  <div class="min-w-0">
                                    <div class="truncate text-sm font-semibold text-slate-900">${c?.nome ?? ''}</div>
                                    <div class="truncate text-xs text-slate-600">${c?.cpf ?? ''}</div>
                                  </div>
                                  <div class="shrink-0 text-right">
                                    ${c?.telefone
                                      ? html`<div class="text-[11px] text-slate-600">${c?.telefone ?? ''}</div>`
                                      : html``}
                                    ${c?.email
                                      ? html`<div class="text-[11px] text-slate-500">${c?.email ?? ''}</div>`
                                      : html``}
                                  </div>
                                </div>
                              </div>
                            `,
                          )}
                        </div>
                      </div>
                    </div>

                    <div class="rounded-lg border border-slate-200 bg-white">
                      <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                        <div class="text-sm font-semibold text-slate-900">${this.msg.pageSubtitle}</div>
                        <button
                          class="text-xs font-medium text-slate-700 hover:text-slate-900"
                          @click=${() => this.dispatchEvent(new CustomEvent('locadora.adminDashboard.navigate', { detail: { target: 'gestaoLocacoesList' }, bubbles: true, composed: true }))}
                        >
                          ${this.msg.confirm}
                        </button>
                      </div>
                      <div class="max-h-72 overflow-auto">
                        <div class="divide-y divide-slate-100">
                          ${(locacoes ?? []).map(
                            (l: any) => html`
                              <div class="px-4 py-3 hover:bg-slate-50">
                                <div class="flex items-center justify-between gap-3">
                                  <div class="min-w-0">
                                    <div class="truncate text-sm font-semibold text-slate-900">${l?.placaVeiculo ?? ''}</div>
                                    <div class="truncate text-xs text-slate-600">${l?.cpf ?? ''}</div>
                                  </div>
                                  <div class="shrink-0 text-right">
                                    <div class="text-[11px] font-medium text-slate-700">${l?.dataRetirada ?? ''}</div>
                                    <div class="text-[11px] text-slate-500">${l?.devolucaoPrevista ?? ''}</div>
                                  </div>
                                </div>
                                ${l?.valorDiario !== undefined && l?.valorDiario !== null
                                  ? html`
                                      <div class="mt-2 text-[11px] text-slate-500">${l?.valorDiario}</div>
                                    `
                                  : html``}
                              </div>
                            `,
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                ${this.load === 'error'
                  ? html`
                      <div class="mt-5 rounded-md border border-rose-200 bg-rose-50 p-4">
                        <div class="text-sm font-semibold text-rose-900">${this.msg.couldNotLoad}</div>
                        <div class="mt-3">
                          <button
                            class="rounded-md bg-rose-700 px-3 py-2 text-sm font-medium text-white hover:bg-rose-800"
                            @click=${this.handleReloadClick}
                          >
                            ${this.msg.reload}
                          </button>
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
