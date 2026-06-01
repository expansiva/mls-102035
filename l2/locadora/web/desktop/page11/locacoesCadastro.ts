/// <mls fileReference="_102035_/l2/locadora/web/desktop/page11/locacoesCadastro.ts" enhancement="_102027_/l2/enhancementLit.ts" />

import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { LocadoraLocacoesCadastroBase } from '/_102035_/l2/locadora/web/shared/locacoesCadastro.js';

@customElement('locadora--web--desktop--page11--locacoes-cadastro-102035')
export class LocadoraWebDesktopLocacoesCadastroPage extends LocadoraLocacoesCadastroBase {
  render() {
    const cliente = this.clienteValidacao;
    const veiculo = this.veiculoDisponibilidade;

    const saveBusy = this.save === 'loading';
    const validateBusy = this.validateCliente === 'loading';
    const checkBusy = this.checkVeiculo === 'loading';

    return html`
      <div class="min-h-screen bg-slate-50 text-slate-900">
        <div class="mx-auto max-w-7xl px-6 py-6">
          <header class="mb-6 flex items-start justify-between gap-6">
            <div class="min-w-0">
              <div class="text-sm font-semibold tracking-wide text-slate-500">${this.msg.brand}</div>
              <h1 class="mt-1 text-2xl font-semibold text-slate-900">${this.msg.pageTitle}</h1>
              <p class="mt-1 max-w-3xl text-sm text-slate-600">${this.msg.pageSubtitle}</p>
            </div>

            <div class="flex shrink-0 items-center gap-2">
              <button
                class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                @click=${() => this.loadInitialData(undefined, { mode: 'silent' })}
              >
                ${this.msg.reload}
              </button>
            </div>
          </header>

          ${(this.erroGeral || this.erroValidacao || this.mensagemErro || this.mensagemAlerta || this.status)
            ? html`
                <section class="mb-6 grid gap-3">
                  ${this.erroGeral
                    ? html`
                        <div class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                          ${this.erroGeral}
                        </div>
                      `
                    : html``}
                  ${this.erroValidacao
                    ? html`
                        <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                          ${this.erroValidacao}
                        </div>
                      `
                    : html``}
                  ${this.mensagemErro
                    ? html`
                        <div class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                          ${this.mensagemErro}
                        </div>
                      `
                    : html``}
                  ${this.mensagemAlerta
                    ? html`
                        <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                          ${this.mensagemAlerta}
                        </div>
                      `
                    : html``}
                  ${this.status
                    ? html`
                        <div class="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                          ${this.status}
                        </div>
                      `
                    : html``}
                </section>
              `
            : html``}

          <div class="grid grid-cols-12 gap-6">
            <section class="col-span-7">
              <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div class="border-b border-slate-200 px-6 py-4">
                  <div class="flex items-center justify-between gap-4">
                    <div>
                      <h2 class="text-base font-semibold text-slate-900">${this.msg.pageTitle}</h2>
                      <p class="mt-1 text-sm text-slate-600">${this.msg.pageSubtitle}</p>
                    </div>
                    <div class="text-xs text-slate-500">
                      ${this.formDirty ? this.msg.confirming : ''}
                    </div>
                  </div>
                </div>

                <form class="px-6 py-6" @submit=${this.handleSaveLocacaoSubmit}>
                  <div class="grid grid-cols-2 gap-4">
                    <label class="block">
                      <div class="text-sm font-medium text-slate-700">${this.msg.labelCpf}</div>
                      <div class="mt-1 flex gap-2">
                        <input
                          class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                          .value=${this.clienteSelecionado || this.novaLocacao?.cpf || ''}
                          @input=${(e: Event) => {
                            const v = (e.target as HTMLInputElement).value;
                            this.clienteSelecionado = v;
                          }}
                        />
                        <button
                          class="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                          type="button"
                          ?disabled=${validateBusy}
                          @click=${() => this.loadValidateCliente({ clienteId: this.clienteSelecionado }, { mode: 'silent' })}
                        >
                          ${validateBusy ? this.msg.loadingValidateCliente : this.msg.confirm}
                        </button>
                      </div>
                    </label>

                    <label class="block">
                      <div class="text-sm font-medium text-slate-700">${this.msg.labelPlacaVeiculo}</div>
                      <div class="mt-1 flex gap-2">
                        <input
                          class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                          .value=${this.veiculoSelecionado || this.novaLocacao?.placaVeiculo || ''}
                          @input=${(e: Event) => {
                            const v = (e.target as HTMLInputElement).value;
                            this.veiculoSelecionado = v;
                          }}
                        />
                        <button
                          class="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                          type="button"
                          ?disabled=${checkBusy}
                          @click=${() =>
                            this.loadCheckVeiculoAvailability({ placa: this.veiculoSelecionado }, { mode: 'silent' })}
                        >
                          ${checkBusy ? this.msg.loadingCheckVeiculoAvailability : this.msg.confirm}
                        </button>
                      </div>
                    </label>

                    <label class="block">
                      <div class="text-sm font-medium text-slate-700">${this.msg.labelDataRetirada}</div>
                      <input
                        type="date"
                        class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        .value=${this.dataRetirada || this.novaLocacao?.dataRetirada || ''}
                        @input=${(e: Event) => {
                          const v = (e.target as HTMLInputElement).value;
                          this.dataRetirada = v;
                        }}
                      />
                    </label>

                    <label class="block">
                      <div class="text-sm font-medium text-slate-700">${this.msg.labelDataDevolucao}</div>
                      <input
                        type="date"
                        class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        .value=${this.dataDevolucao || this.novaLocacao?.dataDevolucao || ''}
                        @input=${(e: Event) => {
                          const v = (e.target as HTMLInputElement).value;
                          this.dataDevolucao = v;
                        }}
                      />
                    </label>

                    <label class="block">
                      <div class="text-sm font-medium text-slate-700">${this.msg.labelDevolucaoPrevista}</div>
                      <input
                        type="datetime-local"
                        class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        .value=${this.devolucaoPrevista || this.novaLocacao?.devolucaoPrevista || ''}
                        @input=${(e: Event) => {
                          const v = (e.target as HTMLInputElement).value;
                          this.devolucaoPrevista = v;
                        }}
                      />
                    </label>

                    <label class="block">
                      <div class="text-sm font-medium text-slate-700">${this.msg.labelValorDiario}</div>
                      <input
                        type="number"
                        step="0.01"
                        class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        .value=${String(this.valorDiario ?? this.novaLocacao?.valorDiario ?? 0)}
                        @input=${(e: Event) => {
                          const v = Number((e.target as HTMLInputElement).value);
                          this.valorDiario = Number.isFinite(v) ? v : 0;
                        }}
                      />
                    </label>

                    <label class="col-span-2 flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                      <div>
                        <div class="text-sm font-medium text-slate-800">${this.msg.labelSeguroOpcional}</div>
                        <div class="text-xs text-slate-600">${this.msg.pageSubtitle}</div>
                      </div>
                      <input
                        type="checkbox"
                        class="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-200"
                        .checked=${this.seguroOpcional ?? this.novaLocacao?.seguroOpcional ?? false}
                        @change=${(e: Event) => {
                          this.seguroOpcional = (e.target as HTMLInputElement).checked;
                        }}
                      />
                    </label>

                    <label class="col-span-2 block">
                      <div class="text-sm font-medium text-slate-700">${this.msg.labelFormaPagamento}</div>
                      <input
                        class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        .value=${this.formaPagamento || this.novaLocacao?.formaPagamento || ''}
                        @input=${(e: Event) => {
                          const v = (e.target as HTMLInputElement).value;
                          this.formaPagamento = v;
                        }}
                      />
                    </label>
                  </div>

                  <div class="mt-6 flex items-center justify-between gap-4">
                    <div class="text-xs text-slate-500">
                      ${saveBusy ? this.msg.saving : ''}
                    </div>
                    <button
                      class="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
                      type="submit"
                      ?disabled=${saveBusy}
                    >
                      ${saveBusy ? this.msg.saving : this.msg.save}
                    </button>
                  </div>
                </form>
              </div>
            </section>

            <aside class="col-span-5 grid gap-6">
              <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div class="border-b border-slate-200 px-6 py-4">
                  <h3 class="text-sm font-semibold text-slate-900">${this.msg.loadingValidateCliente}</h3>
                </div>
                <div class="px-6 py-5">
                  <div class="grid gap-3">
                    <div class="grid grid-cols-3 gap-3">
                      <div class="col-span-1 text-xs font-medium text-slate-500">${this.msg.labelClienteNome}</div>
                      <div class="col-span-2 text-sm text-slate-900">${cliente?.nome ?? ''}</div>
                    </div>
                    <div class="grid grid-cols-3 gap-3">
                      <div class="col-span-1 text-xs font-medium text-slate-500">${this.msg.labelClienteCpf}</div>
                      <div class="col-span-2 text-sm text-slate-900">${cliente?.cpf ?? ''}</div>
                    </div>
                    <div class="grid grid-cols-3 gap-3">
                      <div class="col-span-1 text-xs font-medium text-slate-500">${this.msg.labelClienteCnh}</div>
                      <div class="col-span-2 text-sm text-slate-900">${cliente?.cnh ?? ''}</div>
                    </div>
                    <div class="grid grid-cols-3 gap-3">
                      <div class="col-span-1 text-xs font-medium text-slate-500">${this.msg.labelClienteTelefone}</div>
                      <div class="col-span-2 text-sm text-slate-900">${cliente?.telefone ?? ''}</div>
                    </div>
                    <div class="grid grid-cols-3 gap-3">
                      <div class="col-span-1 text-xs font-medium text-slate-500">${this.msg.labelClienteEmail}</div>
                      <div class="col-span-2 text-sm text-slate-900">${cliente?.email ?? ''}</div>
                    </div>
                  </div>

                  <div class="mt-5 flex flex-wrap items-center gap-2">
                    <span
                      class=${`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        this.cpfValido ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                      }`}
                    >
                      ${this.msg.labelClienteCpf}
                    </span>
                    <span
                      class=${`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        this.cnhValida ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                      }`}
                    >
                      ${this.msg.labelClienteCnh}
                    </span>
                  </div>
                </div>
              </div>

              <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div class="border-b border-slate-200 px-6 py-4">
                  <h3 class="text-sm font-semibold text-slate-900">${this.msg.loadingCheckVeiculoAvailability}</h3>
                </div>
                <div class="px-6 py-5">
                  <div class="grid gap-3">
                    <div class="grid grid-cols-3 gap-3">
                      <div class="col-span-1 text-xs font-medium text-slate-500">${this.msg.labelVeiculoPlaca}</div>
                      <div class="col-span-2 text-sm text-slate-900">${veiculo?.placa ?? ''}</div>
                    </div>
                    <div class="grid grid-cols-3 gap-3">
                      <div class="col-span-1 text-xs font-medium text-slate-500">${this.msg.labelVeiculoModelo}</div>
                      <div class="col-span-2 text-sm text-slate-900">${veiculo?.modelo ?? ''}</div>
                    </div>
                    <div class="grid grid-cols-3 gap-3">
                      <div class="col-span-1 text-xs font-medium text-slate-500">${this.msg.labelVeiculoAno}</div>
                      <div class="col-span-2 text-sm text-slate-900">${veiculo?.ano ?? ''}</div>
                    </div>
                    <div class="grid grid-cols-3 gap-3">
                      <div class="col-span-1 text-xs font-medium text-slate-500">${this.msg.labelVeiculoCategoria}</div>
                      <div class="col-span-2 text-sm text-slate-900">${veiculo?.categoria ?? ''}</div>
                    </div>
                    <div class="grid grid-cols-3 gap-3">
                      <div class="col-span-1 text-xs font-medium text-slate-500">${this.msg.labelVeiculoStatus}</div>
                      <div class="col-span-2 text-sm text-slate-900">${veiculo?.status ?? ''}</div>
                    </div>
                    <div class="grid grid-cols-3 gap-3">
                      <div class="col-span-1 text-xs font-medium text-slate-500">${this.msg.labelVeiculoQuilometragem}</div>
                      <div class="col-span-2 text-sm text-slate-900">${veiculo?.quilometragem ?? ''}</div>
                    </div>
                  </div>

                  <div class="mt-5">
                    <div
                      class=${`rounded-lg px-4 py-3 text-sm ring-1 ${
                        this.disponivel
                          ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                          : 'bg-amber-50 text-amber-900 ring-amber-200'
                      }`}
                    >
                      ${this.msg.labelVeiculoStatus}
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <footer class="mt-10 border-t border-slate-200 pt-6 text-xs text-slate-500">
            ${this.msg.brand}
          </footer>
        </div>
      </div>
    `;
  }
}
