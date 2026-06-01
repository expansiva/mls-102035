/// <mls fileReference="_102035_/l2/locadora/web/desktop/page11/clientesCadastro.ts" enhancement="_102027_/l2/enhancementLit.ts" />

import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { LocadoraClientesCadastroBase } from '/_102035_/l2/locadora/web/shared/clientesCadastro.js';

@customElement('locadora--web--desktop--page11--clientes-cadastro-102035')
export class LocadoraWebDesktopClientesCadastroPage extends LocadoraClientesCadastroBase {
  render() {
    const cliente = this.cliente;
    const status = this.status;

    const cpf = cliente?.cpf ?? '';
    const cnh = cliente?.cnh ?? '';

    const cpfOk = cpf.length > 0 && !cpf.includes('_') && cpf.length >= 11;
    const cnhOk = cnh.length > 0 && !cnh.includes('_') && cnh.length >= 11;

    return html`
      <div class="min-h-screen bg-slate-50 text-slate-900">
        <div class="mx-auto max-w-5xl px-6 py-8">
          <header class="flex items-start justify-between gap-6">
            <div class="min-w-0">
              <div class="text-sm font-semibold tracking-wide text-slate-600">${this.msg.brand}</div>
              <h1 class="mt-1 text-2xl font-semibold text-slate-900">${this.msg.pageTitle}</h1>
              <p class="mt-1 text-sm text-slate-600">${this.msg.pageSubtitle}</p>
            </div>

            <div class="flex shrink-0 items-center gap-2">
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                @click=${() => this.loadCliente()}
              >
                ${this.msg.reload}
              </button>

              <button
                type="button"
                class="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                @click=${this.handleCancelClick}
              >
                ${this.msg.confirm}
              </button>
            </div>
          </header>

          <div class="mt-4">
            ${status
              ? html`
                  <div class="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                    ${status}
                  </div>
                `
              : html``}
          </div>

          <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section class="lg:col-span-8">
              <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div class="border-b border-slate-200 px-5 py-4">
                  <h2 class="text-base font-semibold text-slate-900">${this.msg.pageTitle}</h2>
                  <p class="mt-1 text-sm text-slate-600">${this.msg.pageSubtitle}</p>
                </div>

                <form class="px-5 py-5" @submit=${this.handleSaveSubmit}>
                  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label class="block sm:col-span-2">
                      <div class="text-sm font-medium text-slate-700">${this.msg.nome}</div>
                      <input
                        name="nome"
                        class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 focus:border-slate-400"
                        .value=${cliente?.nome ?? ''}
                        autocomplete="name"
                      />
                    </label>

                    <label class="block">
                      <div class="text-sm font-medium text-slate-700">${this.msg.cpf}</div>
                      <input
                        name="cpf"
                        class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 focus:border-slate-400"
                        .value=${cpf}
                        inputmode="numeric"
                        autocomplete="off"
                      />
                    </label>

                    <label class="block">
                      <div class="text-sm font-medium text-slate-700">${this.msg.cnh}</div>
                      <input
                        name="cnh"
                        class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 focus:border-slate-400"
                        .value=${cnh}
                        inputmode="numeric"
                        autocomplete="off"
                      />
                    </label>

                    <label class="block">
                      <div class="text-sm font-medium text-slate-700">${this.msg.telefone}</div>
                      <input
                        name="telefone"
                        class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 focus:border-slate-400"
                        .value=${cliente?.telefone ?? ''}
                        inputmode="tel"
                        autocomplete="tel"
                      />
                    </label>

                    <label class="block">
                      <div class="text-sm font-medium text-slate-700">${this.msg.email}</div>
                      <input
                        name="email"
                        type="email"
                        class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 focus:border-slate-400"
                        .value=${cliente?.email ?? ''}
                        autocomplete="email"
                      />
                    </label>
                  </div>

                  <div class="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                    <button
                      type="button"
                      class="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                      @click=${this.handleCancelClick}
                    >
                      ${this.msg.confirm}
                    </button>

                    <button
                      type="submit"
                      class="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                    >
                      ${this.msg.save}
                    </button>
                  </div>
                </form>
              </div>
            </section>

            <aside class="lg:col-span-4">
              <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div class="flex items-start justify-between gap-3">
                  <h3 class="text-sm font-semibold text-slate-900">${this.msg.confirm}</h3>
                  <button
                    type="button"
                    class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    @click=${() => this.validate({ cpf, cnh })}
                  >
                    ${this.msg.confirm}
                  </button>
                </div>

                <div class="mt-4 space-y-3">
                  <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                    <div class="flex items-center justify-between gap-3">
                      <div class="text-sm font-medium text-slate-800">${this.msg.cpf}</div>
                      <div class=${cpfOk ? 'text-xs font-semibold text-emerald-700' : 'text-xs font-semibold text-rose-700'}>
                        ${cpfOk ? this.msg.confirmedSuccessfully : this.msg.cpfInvalido}
                      </div>
                    </div>
                    <div class="mt-1 text-xs text-slate-600">${cpf || '—'}</div>
                  </div>

                  <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                    <div class="flex items-center justify-between gap-3">
                      <div class="text-sm font-medium text-slate-800">${this.msg.cnh}</div>
                      <div class=${cnhOk ? 'text-xs font-semibold text-emerald-700' : 'text-xs font-semibold text-rose-700'}>
                        ${cnhOk ? this.msg.confirmedSuccessfully : this.msg.cnhInvalida}
                      </div>
                    </div>
                    <div class="mt-1 text-xs text-slate-600">${cnh || '—'}</div>
                  </div>
                </div>

                <div class="mt-5 rounded-lg border border-slate-200 bg-white px-3 py-3">
                  <div class="text-xs font-semibold text-slate-700">${this.msg.pageTitle}</div>
                  <div class="mt-1 text-xs text-slate-600">${this.msg.pageSubtitle}</div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    `;
  }
}
