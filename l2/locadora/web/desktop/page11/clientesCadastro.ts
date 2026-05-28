/// <mls fileReference="_102035_/l2/locadora/web/desktop/page11/clientesCadastro.ts" enhancement="_102027_/l2/enhancementLit.ts" />

import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { LocadoraClientesCadastroBase } from '/_102035_/l2/locadora/web/shared/clientesCadastro.js';

@customElement('locadora--web--desktop--page11--clientes-cadastro-102035')
export class LocadoraWebDesktopClientesCadastroPage extends LocadoraClientesCadastroBase {
  render() {
    return html`
      <div class="min-h-screen bg-slate-50 text-slate-900">
        <div class="mx-auto max-w-6xl px-6 py-8">
          <header class="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="flex items-start justify-between gap-6">
              <div class="min-w-0">
                <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">${this.msg.brand}</div>
                <h1 class="mt-1 text-2xl font-semibold leading-tight text-slate-900">${this.msg.pageTitle}</h1>
                <p class="mt-1 text-sm text-slate-600">${this.msg.pageSubtitle}</p>
              </div>

              <div class="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  class="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  @click=${() => this.loadCliente()}
                >
                  ${this.msg.reload}
                </button>
              </div>
            </div>

            ${this.status
              ? html`
                  <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    ${this.status}
                  </div>
                `
              : html``}
          </header>

          <main class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section class="lg:col-span-8">
              <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <h2 class="text-base font-semibold text-slate-900">${this.msg.pageTitle}</h2>
                    <p class="mt-1 text-sm text-slate-600">${this.msg.pageSubtitle}</p>
                  </div>
                </div>

                <form class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2" @submit=${this.handleSaveSubmit}>
                  <label class="block">
                    <span class="text-sm font-medium text-slate-700">${this.msg.nome}</span>
                    <input
                      name="nome"
                      class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      .value=${this.cliente?.nome ?? ''}
                      autocomplete="name"
                    />
                  </label>

                  <label class="block">
                    <span class="text-sm font-medium text-slate-700">${this.msg.cpf}</span>
                    <input
                      name="cpf"
                      class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      .value=${this.cliente?.cpf ?? ''}
                      inputmode="numeric"
                      autocomplete="off"
                    />
                  </label>

                  <label class="block">
                    <span class="text-sm font-medium text-slate-700">${this.msg.cnh}</span>
                    <input
                      name="cnh"
                      class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      .value=${this.cliente?.cnh ?? ''}
                      inputmode="numeric"
                      autocomplete="off"
                    />
                  </label>

                  <label class="block">
                    <span class="text-sm font-medium text-slate-700">${this.msg.telefone}</span>
                    <input
                      name="telefone"
                      class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      .value=${this.cliente?.telefone ?? ''}
                      inputmode="tel"
                      autocomplete="tel"
                    />
                  </label>

                  <label class="block sm:col-span-2">
                    <span class="text-sm font-medium text-slate-700">${this.msg.email}</span>
                    <input
                      name="email"
                      class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      .value=${this.cliente?.email ?? ''}
                      inputmode="email"
                      autocomplete="email"
                    />
                  </label>

                  <div class="mt-2 flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex flex-wrap items-center gap-2">
                      <button
                        type="submit"
                        class="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                      >
                        ${this.msg.save}
                      </button>

                      <button
                        type="button"
                        class="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                        @click=${this.handleCancelClick}
                      >
                        ${this.msg.confirm}
                      </button>
                    </div>

                    <div class="text-xs text-slate-500">
                      ${this.msg.cpfInvalido}
                      <span class="mx-2 text-slate-300">|</span>
                      ${this.msg.cnhInvalida}
                    </div>
                  </div>
                </form>
              </div>
            </section>

            <aside class="lg:col-span-4">
              <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 class="text-sm font-semibold text-slate-900">${this.msg.confirm}</h3>
                <p class="mt-1 text-sm text-slate-600">${this.msg.pageSubtitle}</p>

                <div class="mt-4 grid grid-cols-1 gap-3">
                  <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">${this.msg.cpf}</div>
                    <div class="mt-1 text-sm font-medium text-slate-900">${this.cliente?.cpf ?? ''}</div>
                    <div class="mt-2 text-xs text-slate-600">${this.msg.cpfInvalido}</div>
                  </div>

                  <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">${this.msg.cnh}</div>
                    <div class="mt-1 text-sm font-medium text-slate-900">${this.cliente?.cnh ?? ''}</div>
                    <div class="mt-2 text-xs text-slate-600">${this.msg.cnhInvalida}</div>
                  </div>

                  <button
                    type="button"
                    class="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    @click=${() => this.validate({ cpf: this.cliente?.cpf ?? '', cnh: this.cliente?.cnh ?? '' })}
                  >
                    ${this.msg.confirm}
                  </button>
                </div>
              </div>
            </aside>
          </main>
        </div>
      </div>
    `;
  }
}
