/// <mls fileReference="_102035_/l2/locadora/web/desktop/page11/veiculosCadastro.ts" enhancement="_102027_/l2/enhancementLit.ts" />

import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { LocadoraVeiculosCadastroBase } from '/_102035_/l2/locadora/web/shared/veiculosCadastro.js';

@customElement('locadora--web--desktop--page11--veiculos-cadastro-102035')
export class LocadoraWebDesktopVeiculosCadastroPage extends LocadoraVeiculosCadastroBase {
  render() {
    const statusValues = this.statusVeiculoOptions?.values ?? this.statusOptions ?? [];

    return html`
      <div class="min-h-screen bg-slate-50 text-slate-900">
        <header class="border-b border-slate-200 bg-white">
          <div class="mx-auto flex w-full max-w-5xl items-start justify-between gap-6 px-6 py-6">
            <div class="min-w-0">
              <div class="text-sm font-semibold tracking-wide text-slate-500">${this.msg.brand}</div>
              <h1 class="mt-1 text-2xl font-semibold text-slate-900">${this.msg.pageTitle}</h1>
              <p class="mt-1 text-sm text-slate-600">${this.msg.pageSubtitle}</p>
            </div>

            <div class="flex shrink-0 flex-col items-end gap-2">
              <div class="text-sm text-slate-600">
                <span class="font-medium text-slate-700">${this.msg.status}:</span>
                <span class="ml-2">${this.status ?? ''}</span>
              </div>
            </div>
          </div>
        </header>

        <main class="mx-auto w-full max-w-5xl px-6 py-8">
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section class="lg:col-span-8">
              <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div class="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
                  <div>
                    <h2 class="text-base font-semibold text-slate-900">${this.msg.pageTitle}</h2>
                    <p class="mt-1 text-sm text-slate-600">${this.msg.pageSubtitle}</p>
                  </div>

                  <div class="flex items-center gap-3">
                    <div class="text-xs font-medium">
                      <span
                        class=${
                          'inline-flex items-center rounded-full px-2.5 py-1 ' +
                          (this.formDirty
                            ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                            : 'bg-slate-50 text-slate-700 ring-1 ring-slate-200')
                        }
                      >
                        ${this.formDirty ? this.msg.status : this.msg.status}
                      </span>
                    </div>
                  </div>
                </div>

                <form class="px-6 py-6" @submit=${this.handleSaveVeiculoSubmit}>
                  <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div class="sm:col-span-1">
                      <label class="text-sm font-medium text-slate-700" for="placa">${this.msg.placa}</label>
                      <input
                        id="placa"
                        class=${
                          'mt-2 block w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 ' +
                          (this.formErrors?.placa
                            ? 'border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100'
                            : 'border-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100')
                        }
                        .value=${this.placa ?? ''}
                        @input=${(e: Event) => {
                          const v = (e.target as HTMLInputElement).value;
                          (this as any).placa = v;
                          (this as any).formDirty = true;
                        }}
                        autocomplete="off"
                      />
                      ${this.formErrors?.placa
                        ? html`<p class="mt-2 text-sm text-rose-700">${this.formErrors.placa}</p>`
                        : html``}
                    </div>

                    <div class="sm:col-span-1">
                      <label class="text-sm font-medium text-slate-700" for="modelo">${this.msg.modelo}</label>
                      <input
                        id="modelo"
                        class=${
                          'mt-2 block w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 ' +
                          (this.formErrors?.modelo
                            ? 'border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100'
                            : 'border-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100')
                        }
                        .value=${this.modelo ?? ''}
                        @input=${(e: Event) => {
                          const v = (e.target as HTMLInputElement).value;
                          (this as any).modelo = v;
                          (this as any).formDirty = true;
                        }}
                        autocomplete="off"
                      />
                      ${this.formErrors?.modelo
                        ? html`<p class="mt-2 text-sm text-rose-700">${this.formErrors.modelo}</p>`
                        : html``}
                    </div>

                    <div class="sm:col-span-1">
                      <label class="text-sm font-medium text-slate-700" for="ano">${this.msg.ano}</label>
                      <input
                        id="ano"
                        type="number"
                        class=${
                          'mt-2 block w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 ' +
                          (this.formErrors?.ano
                            ? 'border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100'
                            : 'border-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100')
                        }
                        .value=${String(this.ano ?? 0)}
                        @input=${(e: Event) => {
                          const v = Number((e.target as HTMLInputElement).value);
                          (this as any).ano = Number.isFinite(v) ? v : 0;
                          (this as any).formDirty = true;
                        }}
                      />
                      ${this.formErrors?.ano
                        ? html`<p class="mt-2 text-sm text-rose-700">${this.formErrors.ano}</p>`
                        : html``}
                    </div>

                    <div class="sm:col-span-1">
                      <label class="text-sm font-medium text-slate-700" for="categoria">${this.msg.categoria}</label>
                      <input
                        id="categoria"
                        class=${
                          'mt-2 block w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 ' +
                          (this.formErrors?.categoria
                            ? 'border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100'
                            : 'border-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100')
                        }
                        .value=${this.categoria ?? ''}
                        @input=${(e: Event) => {
                          const v = (e.target as HTMLInputElement).value;
                          (this as any).categoria = v;
                          (this as any).formDirty = true;
                        }}
                        autocomplete="off"
                      />
                      ${this.formErrors?.categoria
                        ? html`<p class="mt-2 text-sm text-rose-700">${this.formErrors.categoria}</p>`
                        : html``}
                    </div>

                    <div class="sm:col-span-1">
                      <label class="text-sm font-medium text-slate-700" for="status">${this.msg.status}</label>
                      <select
                        id="status"
                        class=${
                          'mt-2 block w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 ' +
                          (this.formErrors?.status
                            ? 'border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100'
                            : 'border-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100')
                        }
                        .value=${this.statusVeiculo ?? ''}
                        @change=${(e: Event) => {
                          const v = (e.target as HTMLSelectElement).value;
                          (this as any).statusVeiculo = v;
                          (this as any).formDirty = true;
                        }}
                      >
                        <option value=""></option>
                        ${(statusValues ?? []).map(
                          (s) => html`<option value=${String(s)} ?selected=${String(s) === String(this.statusVeiculo ?? '')}
                              >${String(s)}</option
                            >`,
                        )}
                      </select>
                      ${this.formErrors?.status
                        ? html`<p class="mt-2 text-sm text-rose-700">${this.formErrors.status}</p>`
                        : html``}
                    </div>

                    <div class="sm:col-span-1">
                      <label class="text-sm font-medium text-slate-700" for="quilometragem">${this.msg.quilometragem}</label>
                      <input
                        id="quilometragem"
                        type="number"
                        class=${
                          'mt-2 block w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 ' +
                          (this.formErrors?.quilometragem
                            ? 'border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100'
                            : 'border-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100')
                        }
                        .value=${String(this.quilometragem ?? 0)}
                        @input=${(e: Event) => {
                          const v = Number((e.target as HTMLInputElement).value);
                          (this as any).quilometragem = Number.isFinite(v) ? v : 0;
                          (this as any).formDirty = true;
                        }}
                      />
                      ${this.formErrors?.quilometragem
                        ? html`<p class="mt-2 text-sm text-rose-700">${this.formErrors.quilometragem}</p>`
                        : html``}
                    </div>
                  </div>

                  <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      class="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                      @click=${() => this.loadGetStatusVeiculoOptions(undefined, { mode: 'blocking' })}
                    >
                      ${this.msg.reload}
                    </button>

                    <button
                      type="submit"
                      class=${
                        'inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition ' +
                        (this.saveVeiculo === 'loading'
                          ? 'cursor-not-allowed bg-indigo-300'
                          : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200')
                      }
                      ?disabled=${this.saveVeiculo === 'loading'}
                    >
                      ${this.saveVeiculo === 'loading' ? this.msg.saving : this.msg.save}
                    </button>
                  </div>

                  ${this.saveVeiculo === 'error'
                    ? html`<div class="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                        ${this.msg.couldNotSave}
                      </div>`
                    : html``}

                  ${this.saveVeiculo === 'success'
                    ? html`<div class="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        ${this.msg.savedSuccessfully}
                      </div>`
                    : html``}
                </form>
              </div>
            </section>

            <aside class="lg:col-span-4">
              <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div class="border-b border-slate-200 px-6 py-5">
                  <h3 class="text-base font-semibold text-slate-900">${this.msg.status}</h3>
                  <p class="mt-1 text-sm text-slate-600">${this.msg.loadingStatusOptions}</p>
                </div>

                <div class="px-6 py-6">
                  ${this.loadStatusOptions === 'error'
                    ? html`
                        <div class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                          ${this.msg.couldNotLoad}
                        </div>
                        <div class="mt-4">
                          <button
                            type="button"
                            class="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                            @click=${() => this.loadGetStatusVeiculoOptions(undefined, { mode: 'blocking' })}
                          >
                            ${this.msg.reload}
                          </button>
                        </div>
                      `
                    : html``}

                  <div class="space-y-3">
                    <div class="text-sm font-medium text-slate-700">${this.msg.status}</div>
                    <div class="flex flex-wrap gap-2">
                      ${(statusValues ?? []).map(
                        (s) => html`
                          <button
                            type="button"
                            class=${
                              'inline-flex items-center rounded-full px-3 py-1.5 text-sm ring-1 transition ' +
                              (String(this.statusVeiculo ?? '') === String(s)
                                ? 'bg-indigo-600 text-white ring-indigo-600'
                                : 'bg-slate-50 text-slate-700 ring-slate-200 hover:bg-slate-100')
                            }
                            @click=${() => {
                              (this as any).statusVeiculo = String(s);
                              (this as any).formDirty = true;
                            }}
                          >
                            ${String(s)}
                          </button>
                        `,
                      )}
                    </div>

                    <div class="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                      <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">${this.msg.status}</div>
                      <div class="mt-1 text-sm text-slate-700">${this.status ?? ''}</div>
                    </div>
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
