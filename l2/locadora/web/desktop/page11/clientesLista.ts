/// <mls fileReference="_102035_/l2/locadora/web/desktop/page11/clientesLista.ts" enhancement="_102027_/l2/enhancementLit.ts" />

import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { LocadoraClientesListaBase } from '/_102035_/l2/locadora/web/shared/clientesLista.js';

@customElement('locadora--web--desktop--page11--clientes-lista-102035')
export class LocadoraWebDesktopClientesListaPage extends LocadoraClientesListaBase {
  render() {
    const clientes = this.cliente ?? [];
    const isBusy = this.loadingList === 'loading' || this.loadingSearch === 'loading';

    return html`
      <div class="min-h-screen bg-slate-50 text-slate-900">
        <header class="border-b border-slate-200 bg-white">
          <div class="mx-auto max-w-7xl px-6 py-5">
            <div class="flex items-start justify-between gap-6">
              <div>
                <div class="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  ${this.msg.brand}
                </div>
                <h1 class="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                  ${this.msg.pageTitle}
                </h1>
                <p class="mt-1 text-sm text-slate-600">${this.msg.pageSubtitle}</p>
              </div>

              <div class="flex items-center gap-3">
                <button
                  class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  ?disabled=${isBusy}
                  @click=${() => this.loadListarClientes()}
                >
                  ${this.msg.reload}
                </button>
              </div>
            </div>

            <div class="mt-4 flex flex-wrap items-center gap-3">
              <div
                class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${isBusy
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : this.error === 'error'
                    ? 'border-rose-200 bg-rose-50 text-rose-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'}"
              >
                <span class="h-1.5 w-1.5 rounded-full ${isBusy
                  ? 'bg-amber-500'
                  : this.error === 'error'
                    ? 'bg-rose-500'
                    : 'bg-emerald-500'}"></span>
                <span>${this.status}</span>
              </div>

              <div class="text-xs text-slate-500">
                ${this.msg.page}: ${String(this.page)} · ${this.msg.pageSize}: ${String(this.pageSize)} · ${this.msg.sortBy}:
                ${String(this.by)} · ${this.msg.sortDir}: ${String(this.dir)}
              </div>
            </div>
          </div>
        </header>

        <main class="mx-auto max-w-7xl px-6 py-6">
          <div class="grid grid-cols-12 gap-6">
            <section class="col-span-12 lg:col-span-4">
              <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div class="border-b border-slate-200 px-5 py-4">
                  <div class="flex items-center justify-between gap-4">
                    <h2 class="text-sm font-semibold text-slate-900">${this.msg.pageSubtitle}</h2>
                    <div class="text-xs text-slate-500">${clientes.length} ${this.msg.itemsAvailable}</div>
                  </div>
                </div>

                <div class="px-5 py-5">
                  <div class="grid grid-cols-1 gap-4">
                    <label class="grid gap-1">
                      <span class="text-xs font-medium text-slate-700">${this.msg.nome}</span>
                      <input
                        class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        .value=${this.filterNome}
                        @input=${(e: Event) => (this.filterNome = (e.target as HTMLInputElement).value)}
                      />
                    </label>

                    <label class="grid gap-1">
                      <span class="text-xs font-medium text-slate-700">${this.msg.cpf}</span>
                      <input
                        class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        .value=${this.filterCpf}
                        @input=${(e: Event) => (this.filterCpf = (e.target as HTMLInputElement).value)}
                      />
                    </label>

                    <label class="grid gap-1">
                      <span class="text-xs font-medium text-slate-700">${this.msg.cnh}</span>
                      <input
                        class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        .value=${this.filterCnh}
                        @input=${(e: Event) => (this.filterCnh = (e.target as HTMLInputElement).value)}
                      />
                    </label>

                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label class="grid gap-1">
                        <span class="text-xs font-medium text-slate-700">${this.msg.telefone}</span>
                        <input
                          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                          .value=${this.filterTelefone}
                          @input=${(e: Event) => (this.filterTelefone = (e.target as HTMLInputElement).value)}
                        />
                      </label>

                      <label class="grid gap-1">
                        <span class="text-xs font-medium text-slate-700">${this.msg.email}</span>
                        <input
                          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                          .value=${this.filterEmail}
                          @input=${(e: Event) => (this.filterEmail = (e.target as HTMLInputElement).value)}
                        />
                      </label>
                    </div>

                    <label class="grid gap-1">
                      <span class="text-xs font-medium text-slate-700">${this.msg.statusValidacao}</span>
                      <select
                        class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        .value=${this.statusValidacao}
                        @change=${(e: Event) => (this.statusValidacao = (e.target as HTMLSelectElement).value)}
                      >
                        <option value="todos">todos</option>
                        <option value="validos">validos</option>
                        <option value="invalidos">invalidos</option>
                      </select>
                    </label>

                    <div class="mt-2 flex flex-wrap gap-3">
                      <button
                        class="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        ?disabled=${this.loadingSearch === 'loading' || this.loadingList === 'loading'}
                        @click=${this.handleBuscarClick}
                      >
                        ${this.loadingSearch === 'loading' ? this.msg.confirming : this.msg.confirm}
                      </button>

                      <button
                        class="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        ?disabled=${isBusy}
                        @click=${this.handleLimparFiltrosClick}
                      >
                        ${this.msg.reload}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section class="col-span-12 lg:col-span-8">
              <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div class="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
                  <div class="flex items-center gap-3">
                    <h2 class="text-sm font-semibold text-slate-900">${this.msg.pageTitle}</h2>
                    <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      ${clientes.length} ${this.msg.itemsAvailable}
                    </span>
                  </div>

                  <div class="text-xs text-slate-500">
                    ${this.loadingList === 'loading' ? this.msg.loadingListarClientes : ''}
                  </div>
                </div>

                <div class="overflow-x-auto">
                  <table class="min-w-full border-separate border-spacing-0">
                    <thead>
                      <tr class="bg-slate-50 text-left">
                        <th class="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-700">
                          ${this.msg.nome}
                        </th>
                        <th class="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-700">
                          ${this.msg.cpf}
                        </th>
                        <th class="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-700">
                          ${this.msg.cnh}
                        </th>
                        <th class="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-700">
                          ${this.msg.telefone}
                        </th>
                        <th class="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-700">
                          ${this.msg.email}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      ${(clientes ?? []).map((c) => {
                        const selected = (c as any)?.id ? String((c as any).id) === String(this.clienteId) : false;
                        return html`
                          <tr
                            class="cursor-pointer border-b border-slate-100 hover:bg-slate-50 ${selected
                              ? 'bg-slate-100'
                              : ''}"
                            @click=${() => {
                              const id = String((c as any)?.id ?? '');
                              if (id) this.clienteId = id;
                            }}
                          >
                            <td class="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                              ${c?.nome ?? ''}
                            </td>
                            <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                              ${c?.cpf ?? ''}
                            </td>
                            <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                              ${c?.cnh ?? ''}
                            </td>
                            <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                              ${c?.telefone ?? ''}
                            </td>
                            <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                              ${c?.email ?? ''}
                            </td>
                          </tr>
                        `;
                      })}
                    </tbody>
                  </table>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
                  <div class="text-xs text-slate-500">${this.status}</div>

                  <div class="flex items-center gap-2">
                    <button
                      class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      ?disabled=${isBusy || this.page <= 1}
                      @click=${() => {
                        const next = Math.max(1, (this.page ?? 1) - 1);
                        this.page = next;
                        void this.loadListarClientes({ page: next });
                      }}
                    >
                      ${this.msg.page} -
                    </button>
                    <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      ${this.msg.page}: ${String(this.page)}
                    </div>
                    <button
                      class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      ?disabled=${isBusy}
                      @click=${() => {
                        const next = (this.page ?? 1) + 1;
                        this.page = next;
                        void this.loadListarClientes({ page: next });
                      }}
                    >
                      ${this.msg.page} +
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    `;
  }
}
