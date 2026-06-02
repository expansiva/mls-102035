/// <mls fileReference="_102035_/l2/locadora/web/desktop/page11/veiculosCadastro.ts" enhancement="_102027_/l2/enhancementLit.ts" />

import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { LocadoraVeiculosCadastroBase } from '/_102035_/l2/locadora/web/shared/veiculosCadastro.js';

@customElement('locadora--web--desktop--page11--veiculos-cadastro-102035')
export class LocadoraWebDesktopVeiculosCadastroPage extends LocadoraVeiculosCadastroBase {
  render() {
    
    const statusOptions = this.statusVeiculoOptions?.values ?? this.statusOptions ?? [];


    const loadStateBadge = (() => {
      switch (this.loadStatusOptions) {
        case 'loading':
          return html`<span class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">${this.msg.loadingStatusOptions}</span>`;
        case 'error':
          return html`<span class="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">${this.msg.couldNotLoad}</span>`;
        case 'success':
          return html`<span class="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">${this.status || `${statusOptions.length} ${this.msg.status}`}</span>`;
        default:
          return this.status
            ? html`<span class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">${this.status}</span>`
            : html``;
      }
    })();

    const saveStateBadge = (() => {
      switch (this.saveVeiculo) {
        case 'loading':
          return html`<span class="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">${this.msg.saving}</span>`;
        case 'error':
          return html`<span class="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">${this.msg.couldNotSave}</span>`;
        case 'success':
          return html`<span class="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">${this.msg.savedSuccessfully}</span>`;
        default:
          return html``;
      }
    })();

    return html`
      <div class="min-h-screen bg-slate-50">
        <div class="mx-auto max-w-5xl px-6 py-8">
          <header class="mb-6">
            <div class="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div class="text-sm font-semibold tracking-wide text-slate-600">${this.msg.brand}</div>
                <h1 class="mt-1 text-2xl font-semibold text-slate-900">${this.msg.pageTitle}</h1>
                <p class="mt-1 text-sm text-slate-600">${this.msg.pageSubtitle}</p>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                ${loadStateBadge}
                ${saveStateBadge}
              </div>
            </div>
          </header>

          <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section class="lg:col-span-8">
              <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div class="border-b border-slate-200 px-6 py-4">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <h2 class="text-base font-semibold text-slate-900">${this.msg.pageTitle}</h2>
                      <p class="mt-1 text-sm text-slate-600">${this.msg.pageSubtitle}</p>
                    </div>

                    <button
                      type="button"
                      class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
                      @click=${() => this.loadGetStatusVeiculoOptions(undefined, { mode: 'blocking' })}
                    >
                      ${this.msg.reload}
                    </button>
                  </div>
                </div>

                <form class="px-6 py-5" @submit=${this.handleSaveVeiculoSubmit}>
                  <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label class="block text-sm font-medium text-slate-800" for="placa">${this.msg.placa}</label>
                      <input
                        id="placa"
                        class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-indigo-500 focus:ring-2"
                        .value=${this.placa ?? ''}
                        @input=${(e: Event) => {
                          const v = (e.target as HTMLInputElement).value;
                          this.placa = v;
                        }}
                      />
                      ${this.formErrors?.['placa']
                        ? html`<div class="mt-1 text-xs font-medium text-red-700">${this.formErrors['placa']}</div>`
                        : html``}
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-slate-800" for="modelo">${this.msg.modelo}</label>
                      <input
                        id="modelo"
                        class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-indigo-500 focus:ring-2"
                        .value=${this.modelo ?? ''}
                        @input=${(e: Event) => {
                          const v = (e.target as HTMLInputElement).value;
                          this.modelo = v;
                        }}
                      />
                      ${this.formErrors?.['modelo']
                        ? html`<div class="mt-1 text-xs font-medium text-red-700">${this.formErrors['modelo']}</div>`
                        : html``}
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-slate-800" for="ano">${this.msg.ano}</label>
                      <input
                        id="ano"
                        type="number"
                        class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-indigo-500 focus:ring-2"
                        .value=${String(this.ano ?? 0)}
                        @input=${(e: Event) => {
                          const raw = (e.target as HTMLInputElement).value;
                          this.ano = Number(raw);
                        }}
                      />
                      ${this.formErrors?.['ano']
                        ? html`<div class="mt-1 text-xs font-medium text-red-700">${this.formErrors['ano']}</div>`
                        : html``}
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-slate-800" for="categoria">${this.msg.categoria}</label>
                      <input
                        id="categoria"
                        class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-indigo-500 focus:ring-2"
                        .value=${this.categoria ?? ''}
                        @input=${(e: Event) => {
                          const v = (e.target as HTMLInputElement).value;
                          this.categoria = v;
                        }}
                      />
                      ${this.formErrors?.['categoria']
                        ? html`<div class="mt-1 text-xs font-medium text-red-700">${this.formErrors['categoria']}</div>`
                        : html``}
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-slate-800" for="status">${this.msg.status}</label>
                      <select
                        id="status"
                        class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-indigo-500 focus:ring-2"
                        .value=${this.statusVeiculo ?? ''}
                        @change=${(e: Event) => {
                          const v = (e.target as HTMLSelectElement).value;
                          this.statusVeiculo = v;
                        }}
                      >
                        <option value=""></option>
                        ${(statusOptions || []).map(
                          (opt) => html`<option value=${String(opt)}>${String(opt)}</option>`,
                        )}
                      </select>
                      ${this.formErrors?.['status']
                        ? html`<div class="mt-1 text-xs font-medium text-red-700">${this.formErrors['status']}</div>`
                        : html``}
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-slate-800" for="quilometragem">${this.msg.quilometragem}</label>
                      <input
                        id="quilometragem"
                        type="number"
                        class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-indigo-500 focus:ring-2"
                        .value=${String(this.quilometragem ?? 0)}
                        @input=${(e: Event) => {
                          const raw = (e.target as HTMLInputElement).value;
                          this.quilometragem = Number(raw);
                        }}
                      />
                      ${this.formErrors?.['quilometragem']
                        ? html`<div class="mt-1 text-xs font-medium text-red-700">${this.formErrors['quilometragem']}</div>`
                        : html``}
                    </div>
                  </div>

                  <div class="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <div class="flex items-center gap-2">
                      ${this.formDirty
                        ? html`<span class="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">${this.status || this.msg.status}</span>`
                        : html``}
                    </div>

                    <button
                      type="submit"
                      class="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                      ?disabled=${this.saveVeiculo === 'loading'}
                    >
                      ${this.saveVeiculo === 'loading' ? this.msg.saving : this.msg.save}
                    </button>
                  </div>
                </form>
              </div>
            </section>

            <aside class="lg:col-span-4">
              <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div class="border-b border-slate-200 px-6 py-4">
                  <h2 class="text-base font-semibold text-slate-900">${this.msg.status}</h2>
                  <p class="mt-1 text-sm text-slate-600">${this.msg.loadingStatusOptions}</p>
                </div>

                <div class="px-6 py-5">
                  <div class="flex flex-wrap gap-2">
                    ${(statusOptions ?? []).map(
                      (opt) => html`
                        <button
                          type="button"
                          class=${[
                            'rounded-full border px-3 py-1 text-sm font-medium transition',
                            String(opt) === String(this.statusVeiculo)
                              ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
                              : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
                          ].join(' ')}
                          @click=${() => {
                            this.statusVeiculo = String(opt);
                          }}
                        >
                          ${String(opt)}
                        </button>
                      `,
                    )}
                  </div>

                  <div class="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    ${this.status || `${statusOptions.length} ${this.msg.status}`}
                  </div>

                  ${this.loadStatusOptions === 'error'
                    ? html`
                        <div class="mt-3 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                          <div class="text-sm font-medium text-red-800">${this.msg.couldNotLoad}</div>
                          <button
                            type="button"
                            class="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-red-800 shadow-sm ring-1 ring-inset ring-red-200 hover:bg-red-100"
                            @click=${() => this.loadGetStatusVeiculoOptions(undefined, { mode: 'blocking' })}
                          >
                            ${this.msg.reload}
                          </button>
                        </div>
                      `
                    : html``}
                </div>
              </div>
            </aside>
          </div>

          <footer class="mt-6 text-sm text-slate-600">
            ${this.status}
          </footer>
        </div>
      </div>
    `;
  }
}
