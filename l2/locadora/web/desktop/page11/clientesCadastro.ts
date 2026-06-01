/// <mls fileReference="_102035_/l2/locadora/web/desktop/page11/clientesCadastro.ts" enhancement="_102027_/l2/enhancementLit.ts" />

import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { LocadoraClientesCadastroBase } from '/_102035_/l2/locadora/web/shared/clientesCadastro.js';

@customElement('locadora--web--desktop--page11--clientes-cadastro-102035')
export class LocadoraWebDesktopClientesCadastroPage extends LocadoraClientesCadastroBase {
  render() {
    const saveBusy = this.save === 'loading';
    const cancelBusy = this.cancel === 'loading';
    const validateBusy = this.validate === 'loading';

    return html`
      <div class="min-h-screen bg-slate-50 text-slate-900">
        <div class="mx-auto max-w-6xl px-6 py-8">
          <header class="flex flex-col gap-4 border-b border-slate-200 pb-6">
            <div class="flex items-start justify-between gap-6">
              <div class="min-w-0">
                <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">${this.msg.brand}</div>
                <h1 class="mt-1 truncate text-2xl font-semibold text-slate-900">${this.msg.pageTitle}</h1>
                <p class="mt-1 text-sm text-slate-600">${this.msg.pageSubtitle}</p>
              </div>

              <div class="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  class="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  ?disabled=${cancelBusy || saveBusy || validateBusy}
                  @click=${this.handleCancelCadastroClick}
                >
                  ${cancelBusy ? this.msg.confirming : this.msg.confirm}
                </button>

                <button
                  type="button"
                  class="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  ?disabled=${validateBusy || saveBusy || cancelBusy}
                  @click=${this.handleValidateCpfCnhClick}
                >
                  ${validateBusy ? this.msg.confirming : this.msg.confirm}
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-2">
                <div class="h-2.5 w-2.5 rounded-full ${this.status ? 'bg-emerald-500' : 'bg-slate-300'}"></div>
                <div class="text-sm text-slate-700">${this.status}</div>
              </div>

              <div class="flex items-center gap-2">
                <div
                  class="rounded-full border px-3 py-1 text-xs font-medium ${
                    this.formDirty
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : 'border-slate-200 bg-white text-slate-600'
                  }"
                >
                  ${this.formDirty ? this.msg.confirming : this.msg.statusReady}
                </div>
              </div>
            </div>
          </header>

          <main class="mt-8 grid grid-cols-12 gap-6">
            <section class="col-span-8">
              <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div class="border-b border-slate-200 px-6 py-4">
                  <div class="flex items-center justify-between gap-4">
                    <h2 class="text-base font-semibold text-slate-900">${this.msg.pageTitle}</h2>
                    <div class="text-xs text-slate-500">${this.msg.pageSubtitle}</div>
                  </div>
                </div>

                <form class="px-6 py-6" @submit=${this.handleSaveClienteSubmit}>
                  <div class="grid grid-cols-2 gap-5">
                    <label class="col-span-2 block">
                      <div class="text-sm font-medium text-slate-700">${this.msg.labelNome}</div>
                      <input
                        class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        .value=${this.nome ?? ''}
                        @input=${(e: Event) => {
                          const v = (e.target as HTMLInputElement).value;
                          this.nome = v;
                          this.formDirty = true;
                        }}
                        autocomplete="name"
                      />
                    </label>

                    <label class="block">
                      <div class="flex items-center justify-between gap-3">
                        <div class="text-sm font-medium text-slate-700">${this.msg.labelCpf}</div>
                        <div class="text-xs text-slate-500">${this.cpfMask}</div>
                      </div>
                      <input
                        class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        .value=${this.cpf ?? ''}
                        @input=${(e: Event) => {
                          const v = (e.target as HTMLInputElement).value;
                          this.cpf = v;
                          this.formDirty = true;
                        }}
                        inputmode="numeric"
                        autocomplete="off"
                      />
                    </label>

                    <label class="block">
                      <div class="flex items-center justify-between gap-3">
                        <div class="text-sm font-medium text-slate-700">${this.msg.labelCnh}</div>
                        <div class="text-xs text-slate-500">${this.cnhMask}</div>
                      </div>
                      <input
                        class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        .value=${this.cnh ?? ''}
                        @input=${(e: Event) => {
                          const v = (e.target as HTMLInputElement).value;
                          this.cnh = v;
                          this.formDirty = true;
                        }}
                        inputmode="numeric"
                        autocomplete="off"
                      />
                    </label>

                    <label class="block">
                      <div class="text-sm font-medium text-slate-700">${this.msg.labelTelefone}</div>
                      <input
                        class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        .value=${this.telefone ?? ''}
                        @input=${(e: Event) => {
                          const v = (e.target as HTMLInputElement).value;
                          this.telefone = v;
                          this.formDirty = true;
                        }}
                        inputmode="tel"
                        autocomplete="tel"
                      />
                    </label>

                    <label class="block">
                      <div class="text-sm font-medium text-slate-700">${this.msg.labelEmail}</div>
                      <input
                        class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        .value=${this.email ?? ''}
                        @input=${(e: Event) => {
                          const v = (e.target as HTMLInputElement).value;
                          this.email = v;
                          this.formDirty = true;
                        }}
                        inputmode="email"
                        autocomplete="email"
                      />
                    </label>
                  </div>

                  <div class="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
                    <button
                      type="button"
                      class="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      ?disabled=${cancelBusy || saveBusy || validateBusy}
                      @click=${this.handleCancelCadastroClick}
                    >
                      ${cancelBusy ? this.msg.confirming : this.msg.confirm}
                    </button>

                    <button
                      type="submit"
                      class="inline-flex items-center justify-center rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                      ?disabled=${saveBusy || cancelBusy || validateBusy}
                    >
                      ${saveBusy ? this.msg.saving : this.msg.save}
                    </button>
                  </div>
                </form>
              </div>
            </section>

            <aside class="col-span-4">
              <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div class="flex items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
                  <h3 class="text-sm font-semibold text-slate-900">${this.msg.confirm}</h3>
                  <button
                    type="button"
                    class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    @click=${() => {
                      this.showValidationHint = !this.showValidationHint;
                    }}
                  >
                    ${this.msg.confirm}
                  </button>
                </div>

                ${this.showValidationHint
                  ? html`
                        <div class="px-6 py-5">
                          <div class="space-y-4">
                            <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                              <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">${this.msg.labelCpf}</div>
                              <div class="mt-1 break-words text-sm text-slate-900">${this.cpf ?? ''}</div>
                            </div>

                            <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                              <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">${this.msg.labelCnh}</div>
                              <div class="mt-1 break-words text-sm text-slate-900">${this.cnh ?? ''}</div>
                            </div>

                            <div class="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
                              <div class="text-sm font-semibold text-indigo-900">${this.msg.confirm}</div>
                              <div class="mt-1 text-xs text-indigo-800">${this.msg.validatedSuccessfully}</div>
                              <button
                                type="button"
                                class="mt-3 inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                                ?disabled=${validateBusy || saveBusy || cancelBusy}
                                @click=${this.handleValidateCpfCnhClick}
                              >
                                ${validateBusy ? this.msg.confirming : this.msg.confirm}
                              </button>
                            </div>
                          </div>
                        </div>
                      `
                  : html`
                        <div class="px-6 py-6 text-sm text-slate-600">${this.msg.statusReady}</div>
                      `}
              </div>
            </aside>
          </main>
        </div>
      </div>
    `;
  }
}
