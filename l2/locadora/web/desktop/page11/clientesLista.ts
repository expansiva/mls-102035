/// <mls fileReference="_102035_/l2/locadora/web/desktop/page11/clientesLista.ts" enhancement="_102027_/l2/enhancementLit.ts" />

import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { LocadoraClientesListaBase } from '/_102035_/l2/locadora/web/shared/clientesLista.js';

@customElement('locadora--web--desktop--page11--clientes-lista-102035')
export class LocadoraWebDesktopClientesListaPage extends LocadoraClientesListaBase {
  render() {
    return html`
      <div class="min-h-screen bg-slate-50">
        <header class="border-b border-slate-200 bg-white">
          <div class="mx-auto max-w-7xl px-6 py-5">
            <div class="flex items-start justify-between gap-6">
              <div class="min-w-0">
                <div class="text-xs font-semibold uppercase tracking-wider text-slate-500">${this.msg.brand}</div>
                <h1 class="mt-1 truncate text-2xl font-semibold text-slate-900">${this.msg.pageTitle}</h1>
                <p class="mt-1 text-sm text-slate-600">${this.msg.pageSubtitle}</p>
              </div>

              <div class="flex items-center gap-3">
                <button
                  class="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                  @click=${() => this.loadListarClientes(undefined)}
                  type="button"
                >
                  ${this.msg.reload}
                </button>
              </div>
            </div>

            <div class="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              ${this.status}
            </div>
          </div>
        </header>

        <main class="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-6 py-6">
          <section class="col-span-12 lg:col-span-4">
            <div class="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div class="border-b border-slate-200 px-5 py-4">
                <div class="text-sm font-semibold text-slate-900">${this.msg.filterNome}</div>
                <div class="mt-1 text-xs text-slate-500">${this.msg.filterStatusValidacao}</div>
              </div>

              <div class="px-5 py-4">
                <div class="space-y-3">
                  <label class="block">
                    <div class="text-xs font-medium text-slate-600">${this.msg.filterNome}</div>
                    <input
                      class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 focus:border-slate-400"
                      @input=${(e: Event) => this.loadListarClientes({ nome: (e.target as HTMLInputElement).value })}
                    />
                  </label>

                  <label class="block">
                    <div class="text-xs font-medium text-slate-600">${this.msg.filterCpf}</div>
                    <input
                      class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 focus:border-slate-400"
                      @input=${(e: Event) => this.loadListarClientes({ cpf: (e.target as HTMLInputElement).value })}
                    />
                  </label>

                  <label class="block">
                    <div class="text-xs font-medium text-slate-600">${this.msg.filterCnh}</div>
                    <input
                      class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 focus:border-slate-400"
                      @input=${(e: Event) => this.loadListarClientes({ cnh: (e.target as HTMLInputElement).value })}
                    />
                  </label>

                  <label class="block">
                    <div class="text-xs font-medium text-slate-600">${this.msg.filterTelefone}</div>
                    <input
                      class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 focus:border-slate-400"
                      @input=${(e: Event) => this.loadListarClientes({ telefone: (e.target as HTMLInputElement).value })}
                    />
                  </label>

                  <label class="block">
                    <div class="text-xs font-medium text-slate-600">${this.msg.filterEmail}</div>
                    <input
                      class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 focus:border-slate-400"
                      @input=${(e: Event) => this.loadListarClientes({ email: (e.target as HTMLInputElement).value })}
                    />
                  </label>

                  <label class="block">
                    <div class="text-xs font-medium text-slate-600">${this.msg.filterStatusValidacao}</div>
                    <input
                      class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 focus:border-slate-400"
                      @input=${(e: Event) => this.loadListarClientes({ statusValidacao: (e.target as HTMLInputElement).value })}
                    />
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section class="col-span-12 lg:col-span-8">
            <div class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div class="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
                <div class="min-w-0">
                  <div class="text-sm font-semibold text-slate-900">${this.msg.pageTitle}</div>
                  <div class="mt-1 text-xs text-slate-500">${this.status}</div>
                </div>
              </div>

              <div class="overflow-x-auto">
                <table class="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr class="bg-slate-50">
                      <th class="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        ${this.msg.filterNome}
                      </th>
                      <th class="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        ${this.msg.filterCpf}
                      </th>
                      <th class="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        ${this.msg.filterCnh}
                      </th>
                      <th class="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        ${this.msg.filterTelefone}
                      </th>
                      <th class="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        ${this.msg.filterEmail}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    ${(this.cliente ?? []).map((c) => html`
                      <tr class="border-b border-slate-100 hover:bg-slate-50">
                        <td class="px-4 py-3 text-sm font-medium text-slate-900">${c.nome ?? ''}</td>
                        <td class="px-4 py-3 text-sm text-slate-700">${c.cpf ?? ''}</td>
                        <td class="px-4 py-3 text-sm text-slate-700">${c.cnh ?? ''}</td>
                        <td class="px-4 py-3 text-sm text-slate-700">${c.telefone ?? ''}</td>
                        <td class="px-4 py-3 text-sm text-slate-700">${c.email ?? ''}</td>
                      </tr>
                    `)}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </main>
      </div>
    `;
  }
}
