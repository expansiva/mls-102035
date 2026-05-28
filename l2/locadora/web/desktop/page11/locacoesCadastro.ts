/// <mls fileReference="_102035_/l2/locadora/web/desktop/page11/locacoesCadastro.ts" enhancement="_102027_/l2/enhancementLit.ts" />

import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { LocadoraLocacoesCadastroBase } from '/_102035_/l2/locadora/web/shared/locacoesCadastro.js';

@customElement('locadora--web--desktop--page11--locacoes-cadastro-102035')
export class LocadoraWebDesktopLocacoesCadastroPage extends LocadoraLocacoesCadastroBase {
  render() {
    return html`
      <div class="min-h-screen bg-slate-50 text-slate-900">
        <div class="mx-auto max-w-6xl px-6 py-8">
          <header class="mb-6">
            <div class="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div class="text-sm font-semibold tracking-wide text-slate-500">
                  ${this.msg.brand}
                </div>
                <h1 class="mt-1 text-2xl font-semibold text-slate-900">${this.msg.pageTitle}</h1>
                <p class="mt-1 text-sm text-slate-600">${this.msg.pageSubtitle}</p>
              </div>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                  @click=${() => this.loadCreateLocacao(undefined, { mode: 'blocking' })}
                >
                  ${this.msg.reload}
                </button>
                <button
                  type="button"
                  class="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 shadow-sm hover:bg-amber-100"
                  @click=${this.handleCancelClick}
                >
                  ${this.msg.confirm}
                </button>
              </div>
            </div>

            ${this.status
              ? html`
                  <div class="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                    ${this.status}
                  </div>
                `
              : html``}
          </header>

          <main class="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section class="lg:col-span-7">
              <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div class="border-b border-slate-200 px-5 py-4">
                  <div class="text-sm font-semibold text-slate-900">${this.msg.pageTitle}</div>
                  <div class="mt-1 text-xs text-slate-500">${this.msg.pageSubtitle}</div>
                </div>

                <form class="px-5 py-5" @submit=${this.handleSaveSubmit}>
                  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label class="block">
                      <div class="text-xs font-semibold text-slate-700">${this.msg.fieldDataRetirada}</div>
                      <input
                        name="dataRetirada"
                        type="date"
                        class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 focus:ring"
                        .value=${this.novaLocacao?.dataRetirada ?? ''}
                        required
                      />
                    </label>

                    <label class="block">
                      <div class="text-xs font-semibold text-slate-700">${this.msg.fieldDataDevolucao}</div>
                      <input
                        name="dataDevolucao"
                        type="date"
                        class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 focus:ring"
                        .value=${this.novaLocacao?.dataDevolucao ?? ''}
                        required
                      />
                    </label>

                    <label class="block">
                      <div class="text-xs font-semibold text-slate-700">${this.msg.fieldValorDiario}</div>
                      <input
                        name="valorDiario"
                        type="number"
                        step="0.01"
                        min="0"
                        class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 focus:ring"
                        .value=${String(this.novaLocacao?.valorDiario ?? 0)}
                        required
                      />
                    </label>

                    <label class="block">
                      <div class="text-xs font-semibold text-slate-700">${this.msg.fieldFormaPagamento}</div>
                      <input
                        name="formaPagamento"
                        type="text"
                        class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 focus:ring"
                        .value=${this.novaLocacao?.formaPagamento ?? ''}
                        required
                      />
                    </label>

                    <label class="block sm:col-span-2">
                      <div class="text-xs font-semibold text-slate-700">${this.msg.fieldDevolucaoPrevista}</div>
                      <input
                        name="devolucaoPrevista"
                        type="datetime-local"
                        class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 focus:ring"
                        .value=${(this.novaLocacao?.devolucaoPrevista ?? '').replace('Z', '')}
                        required
                      />
                    </label>

                    <label class="flex items-center gap-3 sm:col-span-2">
                      <input
                        name="seguroOpcional"
                        type="checkbox"
                        class="h-4 w-4 rounded border-slate-300 text-slate-900"
                        ?checked=${this.novaLocacao?.seguroOpcional ?? false}
                      />
                      <div class="text-sm text-slate-800">${this.msg.fieldSeguroOpcional}</div>
                    </label>

                    <label class="block">
                      <div class="text-xs font-semibold text-slate-700">${this.msg.fieldPlacaVeiculo}</div>
                      <input
                        name="placaVeiculo"
                        type="text"
                        class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 focus:ring"
                        .value=${this.novaLocacao?.placaVeiculo ?? ''}
                        required
                      />
                    </label>

                    <label class="block">
                      <div class="text-xs font-semibold text-slate-700">${this.msg.fieldClienteId}</div>
                      <input
                        name="clienteId"
                        type="text"
                        class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 focus:ring"
                        value=""
                      />
                    </label>
                  </div>

                  <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <div class="text-xs text-slate-500">
                      ${this.status}
                    </div>
                    <button
                      type="submit"
                      class="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                    >
                      ${this.msg.save}
                    </button>
                  </div>
                </form>
              </div>
            </section>

            <aside class="lg:col-span-5">
              <div class="space-y-6">
                <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div class="border-b border-slate-200 px-5 py-4">
                    <div class="text-sm font-semibold text-slate-900">${this.msg.loadingValidateCliente}</div>
                  </div>
                  <div class="px-5 py-5">
                    <div class="flex items-center gap-2">
                      <input
                        type="text"
                        class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 focus:ring"
                        placeholder=""
                        @keydown=${(e: KeyboardEvent) => {
                          if (e.key !== 'Enter') return;
                          e.preventDefault();
                          const input = e.currentTarget as HTMLInputElement;
                          void this.handleValidateClienteClick(input.value);
                        }}
                      />
                      <button
                        type="button"
                        class="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                        @click=${(e: Event) => {
                          const root = (e.currentTarget as HTMLElement).parentElement;
                          const input = root?.querySelector('input') as HTMLInputElement | null;
                          void this.handleValidateClienteClick(input?.value ?? '');
                        }}
                      >
                        ${this.msg.confirm}
                      </button>
                    </div>

                    <div class="mt-4 grid grid-cols-1 gap-3">
                      <div class="rounded-lg bg-slate-50 px-4 py-3">
                        <div class="text-[11px] font-semibold text-slate-600">${this.msg.fieldClienteId}</div>
                        <div class="mt-1 text-sm font-medium text-slate-900">${this.clienteValidacao?.nome ?? ''}</div>
                      </div>

                      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div class="rounded-lg bg-slate-50 px-4 py-3">
                          <div class="text-[11px] font-semibold text-slate-600">CPF</div>
                          <div class="mt-1 text-sm text-slate-900">${this.clienteValidacao?.cpf ?? ''}</div>
                        </div>
                        <div class="rounded-lg bg-slate-50 px-4 py-3">
                          <div class="text-[11px] font-semibold text-slate-600">CNH</div>
                          <div class="mt-1 text-sm text-slate-900">${this.clienteValidacao?.cnh ?? ''}</div>
                        </div>
                      </div>

                      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div class="rounded-lg bg-slate-50 px-4 py-3">
                          <div class="text-[11px] font-semibold text-slate-600">Telefone</div>
                          <div class="mt-1 text-sm text-slate-900">${this.clienteValidacao?.telefone ?? ''}</div>
                        </div>
                        <div class="rounded-lg bg-slate-50 px-4 py-3">
                          <div class="text-[11px] font-semibold text-slate-600">Email</div>
                          <div class="mt-1 text-sm text-slate-900">${this.clienteValidacao?.email ?? ''}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div class="border-b border-slate-200 px-5 py-4">
                    <div class="text-sm font-semibold text-slate-900">${this.msg.loadingCheckVeiculoAvailability}</div>
                  </div>
                  <div class="px-5 py-5">
                    <div class="flex items-center gap-2">
                      <input
                        type="text"
                        class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 focus:ring"
                        placeholder=""
                        @keydown=${(e: KeyboardEvent) => {
                          if (e.key !== 'Enter') return;
                          e.preventDefault();
                          const input = e.currentTarget as HTMLInputElement;
                          void this.handleCheckVeiculoClick(input.value);
                        }}
                      />
                      <button
                        type="button"
                        class="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                        @click=${(e: Event) => {
                          const root = (e.currentTarget as HTMLElement).parentElement;
                          const input = root?.querySelector('input') as HTMLInputElement | null;
                          void this.handleCheckVeiculoClick(input?.value ?? '');
                        }}
                      >
                        ${this.msg.confirm}
                      </button>
                    </div>

                    <div class="mt-4 grid grid-cols-1 gap-3">
                      <div class="rounded-lg bg-slate-50 px-4 py-3">
                        <div class="text-[11px] font-semibold text-slate-600">${this.msg.fieldPlacaVeiculo}</div>
                        <div class="mt-1 text-sm font-medium text-slate-900">${this.veiculoDisponibilidade?.placa ?? ''}</div>
                      </div>

                      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div class="rounded-lg bg-slate-50 px-4 py-3">
                          <div class="text-[11px] font-semibold text-slate-600">Modelo</div>
                          <div class="mt-1 text-sm text-slate-900">${this.veiculoDisponibilidade?.modelo ?? ''}</div>
                        </div>
                        <div class="rounded-lg bg-slate-50 px-4 py-3">
                          <div class="text-[11px] font-semibold text-slate-600">Status</div>
                          <div class="mt-1 text-sm text-slate-900">${this.veiculoDisponibilidade?.status ?? ''}</div>
                        </div>
                      </div>

                      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div class="rounded-lg bg-slate-50 px-4 py-3">
                          <div class="text-[11px] font-semibold text-slate-600">Ano</div>
                          <div class="mt-1 text-sm text-slate-900">${this.veiculoDisponibilidade?.ano ?? ''}</div>
                        </div>
                        <div class="rounded-lg bg-slate-50 px-4 py-3">
                          <div class="text-[11px] font-semibold text-slate-600">Categoria</div>
                          <div class="mt-1 text-sm text-slate-900">${this.veiculoDisponibilidade?.categoria ?? ''}</div>
                        </div>
                        <div class="rounded-lg bg-slate-50 px-4 py-3">
                          <div class="text-[11px] font-semibold text-slate-600">Quilometragem</div>
                          <div class="mt-1 text-sm text-slate-900">${this.veiculoDisponibilidade?.quilometragem ?? ''}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </main>
        </div>
      </div>
    `;
  }
}
