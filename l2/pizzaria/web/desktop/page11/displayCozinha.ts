/// <mls fileReference="_102035_/l2/pizzaria/web/desktop/page11/displayCozinha.ts" enhancement="_102027_/l2/enhancementLit.ts" />

import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { PizzariaDisplayCozinhaBase } from '/_102035_/l2/pizzaria/web/shared/displayCozinha.js';

@customElement('pizzaria--web--desktop--page11--display-cozinha-102035')
export class PizzariaWebDesktopDisplayCozinhaPage extends PizzariaDisplayCozinhaBase {
  render() {
    const resumo = this.resumo;
    const pedidos = this.cozinha ?? [];
    const detalhe = this.pedidoDetalhe;

    return html`
      <div class="min-h-screen bg-slate-950 text-slate-100">
        <header class="border-b border-slate-800/70 bg-slate-950/60 backdrop-blur">
          <div class="mx-auto max-w-7xl px-6 py-5">
            <div class="flex flex-col gap-4">
              <div class="flex items-start justify-between gap-6">
                <div class="min-w-0">
                  <div class="text-xs font-semibold tracking-widest text-slate-400">
                    ${this.msg.brand}
                  </div>
                  <div class="mt-1 text-2xl font-semibold leading-tight text-slate-50">
                    ${this.msg.pageTitle}
                  </div>
                  <div class="mt-1 text-sm text-slate-300">
                    ${this.msg.pageSubtitle}
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <div class="hidden sm:block rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs text-slate-300">
                    ${this.status}
                  </div>
                  <button
                    class="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-slate-900"
                    @click=${() => this.loadInitialData(undefined, { mode: 'blocking' })}
                  >
                    ${this.msg.reload}
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div class="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
                  <div class="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    ${this.msg.fieldStatus}
                  </div>
                  <div class="mt-2 flex flex-wrap gap-2">
                    ${(Array.from(new Set(pedidos.map((p) => p.status).filter(Boolean))) as string[]).map(
                      (st) => html`
                        <button
                          class="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-100 hover:border-slate-500"
                          @click=${() => this.loadListarPedidosCozinha({ status: [st], prioridade: 'critico', cozinhaId: '' } as any, { mode: 'silent' })}
                        >
                          ${st}
                        </button>
                      `,
                    )}
                  </div>
                </div>

                <div class="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
                  <div class="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    ${this.msg.fieldStatusProducao}
                  </div>
                  <div class="mt-2 grid grid-cols-2 gap-2">
                    <div class="rounded-md border border-slate-800 bg-slate-950/30 p-3">
                      <div class="text-xs text-slate-400">${this.msg.fieldStatus}</div>
                      <div class="mt-1 text-sm font-semibold text-slate-100">
                        ${resumo?.status ?? ''}
                      </div>
                    </div>
                    <div class="rounded-md border border-slate-800 bg-slate-950/30 p-3">
                      <div class="text-xs text-slate-400">${this.msg.fieldStatusProducao}</div>
                      <div class="mt-1 text-sm font-semibold text-slate-100">
                        ${resumo?.statusProducao ?? ''}
                      </div>
                    </div>
                  </div>
                </div>

                <div class="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
                  <div class="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    ${this.msg.fieldCriadoEm}
                  </div>
                  <div class="mt-2 rounded-md border border-slate-800 bg-slate-950/30 p-3">
                    <div class="text-sm font-semibold text-slate-100">
                      ${resumo?.criadoEm ?? ''}
                    </div>
                  </div>
                </div>
              </div>

              <div class="sm:hidden rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs text-slate-300">
                ${this.status}
              </div>
            </div>
          </div>
        </header>

        <main class="mx-auto max-w-7xl px-6 py-6">
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section class="lg:col-span-8">
              <div class="rounded-xl border border-slate-800 bg-slate-900/20">
                <div class="flex items-center justify-between gap-4 border-b border-slate-800 px-5 py-4">
                  <div class="min-w-0">
                    <div class="text-sm font-semibold text-slate-50">${this.msg.pageTitle}</div>
                    <div class="text-xs text-slate-400">${this.status}</div>
                  </div>
                  <div class="text-xs text-slate-400">${pedidos.length} ${this.msg.itemsAvailable}</div>
                </div>

                <div class="divide-y divide-slate-800">
                  ${pedidos.map(
                    (p) => html`
                      <button
                        class="w-full text-left px-5 py-4 hover:bg-slate-900/40 focus:outline-none"
                        @click=${() => this.loadGetPedidoCozinhaDetalhe({ pedidoId: p.id }, { mode: 'blocking' })}
                      >
                        <div class="flex flex-col gap-3">
                          <div class="flex items-start justify-between gap-4">
                            <div class="min-w-0">
                              <div class="flex flex-wrap items-center gap-2">
                                <div class="text-base font-semibold text-slate-50">${p.id}</div>
                                <div class="rounded-full border border-slate-700 bg-slate-950/40 px-2.5 py-0.5 text-xs text-slate-200">
                                  ${this.msg.fieldStatus}: ${p.status}
                                </div>
                                <div class="rounded-full border border-slate-700 bg-slate-950/40 px-2.5 py-0.5 text-xs text-slate-200">
                                  ${this.msg.fieldStatusProducao}: ${p.statusProducao}
                                </div>
                              </div>
                              <div class="mt-1 grid grid-cols-1 gap-1 text-xs text-slate-400 sm:grid-cols-3">
                                <div class="truncate">${this.msg.fieldCriadoEm}: ${p.criadoEm ?? ''}</div>
                                <div class="truncate">${this.msg.fieldAtualizadoEm}: ${p.atualizadoEm ?? ''}</div>
                                <div class="truncate">${this.msg.fieldInicioEm}: ${p.inicioEm ?? ''}</div>
                              </div>
                            </div>

                            <div class="flex shrink-0 flex-col items-end gap-2">
                              ${p.observacaoCritica
                                ? html`
                                    <div class="rounded-md border border-red-500/40 bg-red-950/40 px-2.5 py-1 text-xs font-semibold text-red-200">
                                      ${this.msg.fieldObservacaoCritica}
                                    </div>
                                  `
                                : html``}
                              ${p.cozinheiroResponsavelId
                                ? html`
                                    <div class="rounded-md border border-slate-700 bg-slate-950/40 px-2.5 py-1 text-xs text-slate-200">
                                      ${this.msg.fieldCozinheiroResponsavelId}: ${p.cozinheiroResponsavelId}
                                    </div>
                                  `
                                : html``}
                            </div>
                          </div>

                          ${(p.observacaoCritica ?? p.observacoes)
                            ? html`
                                <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  ${p.observacaoCritica
                                    ? html`
                                        <div class="rounded-lg border border-red-500/30 bg-red-950/30 p-3">
                                          <div class="text-xs font-semibold text-red-200">${this.msg.fieldObservacaoCritica}</div>
                                          <div class="mt-1 text-sm text-red-50">${p.observacaoCritica}</div>
                                        </div>
                                      `
                                    : html``}
                                  ${p.observacoes
                                    ? html`
                                        <div class="rounded-lg border border-slate-800 bg-slate-950/20 p-3">
                                          <div class="text-xs font-semibold text-slate-300">${this.msg.fieldObservacoes}</div>
                                          <div class="mt-1 text-sm text-slate-100">${p.observacoes}</div>
                                        </div>
                                      `
                                    : html``}
                                </div>
                              `
                            : html``}

                          <div class="rounded-lg border border-slate-800 bg-slate-950/20 p-3">
                            <div class="flex items-center justify-between gap-4">
                              <div class="text-xs font-semibold text-slate-300">${this.msg.fieldItens}</div>
                              ${p.responsavelAtendimento
                                ? html`
                                    <div class="text-xs text-slate-400">
                                      ${this.msg.fieldResponsavelAtendimento}: ${p.responsavelAtendimento}
                                    </div>
                                  `
                                : html``}
                            </div>
                            <div class="mt-2 grid grid-cols-1 gap-2">
                              ${(p.itens ?? []).map(
                                (it) => html`
                                  <div class="flex items-start justify-between gap-3 rounded-md border border-slate-800/80 bg-slate-950/30 px-3 py-2">
                                    <div class="min-w-0">
                                      <div class="text-sm font-medium text-slate-100">
                                        ${it.nome}
                                      </div>
                                      ${it.observacoes
                                        ? html`
                                            <div class="mt-0.5 text-xs text-slate-400">
                                              ${this.msg.fieldItemObservacoes}: ${it.observacoes}
                                            </div>
                                          `
                                        : html``}
                                    </div>
                                    <div class="shrink-0 rounded-md border border-slate-700 bg-slate-950/40 px-2 py-1 text-xs font-semibold text-slate-200">
                                      ${this.msg.fieldItemQuantidade}: ${it.quantidade}
                                    </div>
                                  </div>
                                `,
                              )}
                            </div>
                          </div>

                          <div class="flex flex-wrap gap-2">
                            <button
                              class="rounded-md border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900"
                              @click=${(e: Event) => {
                                e.stopPropagation();
                                this.handleUpdateStatusClick({
                                  pedidoId: p.id,
                                  statusProducao: 'em preparo',
                                  cozinheiroResponsavelId: p.cozinheiroResponsavelId,
                                } as any);
                              }}
                            >
                              ${this.msg.confirm}
                            </button>
                            <button
                              class="rounded-md border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-950/40"
                              @click=${(e: Event) => {
                                e.stopPropagation();
                                this.handleUpdateStatusClick({
                                  pedidoId: p.id,
                                  statusProducao: 'pronto',
                                  cozinheiroResponsavelId: p.cozinheiroResponsavelId,
                                } as any);
                              }}
                            >
                              ${this.msg.confirm}
                            </button>
                          </div>
                        </div>
                      </button>
                    `,
                  )}
                </div>
              </div>
            </section>

            <aside class="lg:col-span-4">
              <div class="sticky top-6">
                <div class="rounded-xl border border-slate-800 bg-slate-900/20">
                  <div class="border-b border-slate-800 px-5 py-4">
                    <div class="text-sm font-semibold text-slate-50">${this.msg.fieldItens}</div>
                    <div class="mt-1 text-xs text-slate-400">${this.msg.loadingGetPedidoCozinhaDetalhe}</div>
                  </div>

                  <div class="p-5">
                    ${detalhe
                      ? html`
                          <div class="flex flex-col gap-4">
                            <div class="rounded-lg border border-slate-800 bg-slate-950/25 p-4">
                              <div class="flex items-start justify-between gap-4">
                                <div>
                                  <div class="text-lg font-semibold text-slate-50">${detalhe.id}</div>
                                  <div class="mt-1 text-xs text-slate-400">
                                    ${this.msg.fieldCriadoEm}: ${detalhe.criadoEm ?? ''}
                                  </div>
                                </div>
                                <div class="flex flex-col items-end gap-2">
                                  <div class="rounded-full border border-slate-700 bg-slate-950/40 px-2.5 py-0.5 text-xs text-slate-200">
                                    ${this.msg.fieldStatus}: ${detalhe.status}
                                  </div>
                                  <div class="rounded-full border border-slate-700 bg-slate-950/40 px-2.5 py-0.5 text-xs text-slate-200">
                                    ${this.msg.fieldStatusProducao}: ${detalhe.statusProducao}
                                  </div>
                                </div>
                              </div>

                              ${detalhe.observacaoCritica
                                ? html`
                                    <div class="mt-3 rounded-lg border border-red-500/30 bg-red-950/30 p-3">
                                      <div class="text-xs font-semibold text-red-200">${this.msg.fieldObservacaoCritica}</div>
                                      <div class="mt-1 text-sm text-red-50">${detalhe.observacaoCritica}</div>
                                    </div>
                                  `
                                : html``}

                              ${detalhe.observacoes
                                ? html`
                                    <div class="mt-3 rounded-lg border border-slate-800 bg-slate-950/20 p-3">
                                      <div class="text-xs font-semibold text-slate-300">${this.msg.fieldObservacoes}</div>
                                      <div class="mt-1 text-sm text-slate-100">${detalhe.observacoes}</div>
                                    </div>
                                  `
                                : html``}

                              <div class="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-400">
                                <div>${this.msg.fieldInicioEm}: ${detalhe.inicioEm ?? ''}</div>
                                <div>${this.msg.fieldFimEm}: ${detalhe.fimEm ?? ''}</div>
                                <div>${this.msg.fieldCozinheiroResponsavelId}: ${detalhe.cozinheiroResponsavelId ?? ''}</div>
                              </div>
                            </div>

                            <div class="rounded-lg border border-slate-800 bg-slate-950/20 p-4">
                              <div class="text-xs font-semibold text-slate-300">${this.msg.fieldItens}</div>
                              <div class="mt-2 grid grid-cols-1 gap-2">
                                ${(detalhe.itens ?? []).map(
                                  (it) => html`
                                    <div class="rounded-md border border-slate-800/80 bg-slate-950/30 p-3">
                                      <div class="flex items-start justify-between gap-3">
                                        <div class="min-w-0">
                                          <div class="text-sm font-medium text-slate-100">${it.nome}</div>
                                          ${it.observacoes
                                            ? html`
                                                <div class="mt-0.5 text-xs text-slate-400">
                                                  ${this.msg.fieldItemObservacoes}: ${it.observacoes}
                                                </div>
                                              `
                                            : html``}
                                        </div>
                                        <div class="shrink-0 rounded-md border border-slate-700 bg-slate-950/40 px-2 py-1 text-xs font-semibold text-slate-200">
                                          ${this.msg.fieldItemQuantidade}: ${it.quantidade}
                                        </div>
                                      </div>
                                    </div>
                                  `,
                                )}
                              </div>
                            </div>

                            <div class="rounded-lg border border-slate-800 bg-slate-950/20 p-4">
                              <div class="text-xs font-semibold text-slate-300">${this.msg.fieldCozinheiroResponsavelId}</div>
                              <div class="mt-2 flex items-center gap-2">
                                <input
                                  class="w-full rounded-md border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                                  .value=${detalhe.cozinheiroResponsavelId ?? ''}
                                  @input=${(e: Event) => {
                                    const value = (e.target as HTMLInputElement).value;
                                    this.pedidoDetalhe = { ...(this.pedidoDetalhe as any), cozinheiroResponsavelId: value };
                                  }}
                                />
                                <button
                                  class="shrink-0 rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900"
                                  @click=${() =>
                                    this.handleAssignCookClick({
                                      pedidoId: detalhe.id,
                                      statusProducao: detalhe.statusProducao,
                                      cozinheiroResponsavelId: this.pedidoDetalhe?.cozinheiroResponsavelId,
                                    } as any)}
                                >
                                  ${this.msg.save}
                                </button>
                              </div>
                            </div>

                            <div class="grid grid-cols-1 gap-2">
                              <button
                                class="w-full rounded-md border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-900"
                                @click=${() =>
                                  this.handleUpdateStatusClick({
                                    pedidoId: detalhe.id,
                                    statusProducao: 'em preparo',
                                    cozinheiroResponsavelId: detalhe.cozinheiroResponsavelId,
                                  } as any)}
                              >
                                ${this.msg.confirm}
                              </button>
                              <button
                                class="w-full rounded-md border border-emerald-500/40 bg-emerald-950/30 px-4 py-3 text-sm font-semibold text-emerald-100 hover:bg-emerald-950/40"
                                @click=${() =>
                                  this.handleUpdateStatusClick({
                                    pedidoId: detalhe.id,
                                    statusProducao: 'pronto',
                                    cozinheiroResponsavelId: detalhe.cozinheiroResponsavelId,
                                  } as any)}
                              >
                                ${this.msg.confirm}
                              </button>
                            </div>
                          </div>
                        `
                      : html`
                          <div class="rounded-lg border border-slate-800 bg-slate-950/25 p-4 text-sm text-slate-300">
                            ${this.msg.couldNotLoad}
                          </div>
                        `}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    `;
  }
}

customElements.define('pizzaria--web--desktop--page11--display-cozinha-102035', PizzariaWebDesktopDisplayCozinhaPage);
