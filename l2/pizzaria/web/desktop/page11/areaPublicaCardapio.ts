/// <mls fileReference="_102035_/l2/pizzaria/web/desktop/page11/areaPublicaCardapio.ts" enhancement="_102027_/l2/enhancementLit.ts" />

import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { PizzariaAreaPublicaCardapioBase } from '/_102035_/l2/pizzaria/web/shared/areaPublicaCardapio.js';

@customElement('pizzaria--web--desktop--page11--area-publica-cardapio-102035')
export class PizzariaWebDesktopAreaPublicaCardapioPage extends PizzariaAreaPublicaCardapioBase {
  render() {
    const produtos = this.produto ?? [];
    const combos = this.combo ?? [];
    const cartItens = this.cartItens ?? [];

    const categorias = Array.from(
      new Set((this.produto ?? []).map((p: any) => (p?.categoria ?? '')).filter((c: string) => !!c)),
    );

    const moeda = (v: any) => {
      const n = Number(v ?? 0);
      try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'BRL' }).format(n);
      } catch {
        return String(n);
      }
    };

    const subtotal = cartItens.reduce((acc: number, it: any) => {
      const qtd = Number(it?.quantidade ?? it?.qtd ?? 1);
      const preco = Number(it?.preco ?? 0);
      return acc + qtd * preco;
    }, 0);

    const total = subtotal;

    return html`
      <div class="min-h-screen bg-slate-50 text-slate-900">
        <div class="mx-auto max-w-7xl px-6 py-6">
          <header class="flex flex-col gap-4 border-b border-slate-200 pb-5">
            <div class="flex items-start justify-between gap-6">
              <div class="min-w-0">
                <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">${this.msg.brand}</div>
                <h1 class="mt-1 text-2xl font-semibold tracking-tight text-slate-900">${this.msg.pageTitle}</h1>
                <p class="mt-1 max-w-3xl text-sm text-slate-600">${this.msg.pageSubtitle}</p>
              </div>

              <div class="flex shrink-0 items-center gap-3">
                <div class="hidden max-w-xs items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm lg:flex">
                  <span class="truncate">${this.status ?? ''}</span>
                </div>
                <button
                  class="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
                  @click=${() => this.loadInitialData(undefined, { mode: 'blocking' })}
                  type="button"
                >
                  ${this.msg.reload}
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-3 lg:hidden">
              <div class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                ${this.status ?? ''}
              </div>
            </div>
          </header>

          <div class="mt-6 grid grid-cols-12 gap-6">
            <main class="col-span-12 lg:col-span-8">
              <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div class="flex flex-col gap-4">
                  <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <label class="block">
                      <div class="text-xs font-semibold text-slate-600">${this.msg.busca}</div>
                      <input
                        class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-slate-300"
                        .value=${this.filterBusca ?? ''}
                        @input=${(e: Event) => {
                          const v = (e.target as HTMLInputElement).value;
                          this.filterBusca = v;
                          void this.loadListProdutosPublicos({ termo: v, categoria: this.filterCategoria, somenteDisponiveis: true }, { mode: 'silent' });
                        }}
                      />
                    </label>

                    <label class="block">
                      <div class="text-xs font-semibold text-slate-600">${this.msg.categoria}</div>
                      <select
                        class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                        .value=${this.filterCategoria ?? ''}
                        @change=${(e: Event) => {
                          const v = (e.target as HTMLSelectElement).value;
                          this.filterCategoria = v;
                          void this.loadListProdutosPublicos({ termo: this.filterBusca, categoria: v, somenteDisponiveis: true }, { mode: 'silent' });
                        }}
                      >
                        <option value=""></option>
                        ${(categorias ?? []).map(
                          (c: string) => html`<option value=${c}>${c}</option>`,
                        )}
                      </select>
                    </label>

                    <label class="block">
                      <div class="text-xs font-semibold text-slate-600">${this.msg.ordenacao}</div>
                      <select
                        class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                        .value=${this.filterSort ?? 'relevancia'}
                        @change=${(e: Event) => {
                          const v = (e.target as HTMLSelectElement).value;
                          this.filterSort = v;
                        }}
                      >
                        <option value="relevancia">relevancia</option>
                        <option value="preco_asc">preco_asc</option>
                        <option value="preco_desc">preco_desc</option>
                      </select>
                    </label>
                  </div>

                  <div class="flex flex-wrap gap-2">
                    <button
                      class=${
                        (this.filterCategoria ?? '') === ''
                          ? 'rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white'
                          : 'rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50'
                      }
                      type="button"
                      @click=${() => {
                        this.filterCategoria = '';
                        void this.loadListProdutosPublicos({ termo: this.filterBusca, categoria: '', somenteDisponiveis: true }, { mode: 'silent' });
                      }}
                    >
                      ${this.msg.categoria}
                    </button>
                    ${(categorias ?? []).map(
                      (c: string) => html`
                        <button
                          class=${
                            (this.filterCategoria ?? '') === c
                              ? 'rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white'
                              : 'rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50'
                          }
                          type="button"
                          @click=${() => {
                            this.filterCategoria = c;
                            void this.loadListProdutosPublicos({ termo: this.filterBusca, categoria: c, somenteDisponiveis: true }, { mode: 'silent' });
                          }}
                        >
                          ${c}
                        </button>
                      `,
                    )}
                  </div>
                </div>
              </section>

              <section class="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
                <div class="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
                  <h2 class="text-sm font-semibold text-slate-900">${this.msg.produto}</h2>
                  <div class="text-xs text-slate-500">${(produtos ?? []).length} ${this.msg.itemsAvailable}</div>
                </div>

                <div class="divide-y divide-slate-100">
                  ${(produtos ?? []).map((p: any) => {
                    const indisponivel = !p?.disponivel;
                    return html`
                      <div class="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                        <div class="min-w-0">
                          <div class="flex items-center gap-2">
                            <div class="truncate text-sm font-semibold text-slate-900">${p?.nome ?? ''}</div>
                            <div class="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                              ${p?.categoria ?? ''}
                            </div>
                            <div
                              class=${
                                indisponivel
                                  ? 'shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700'
                                  : 'shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700'
                              }
                            >
                              ${this.msg.disponivel}
                            </div>
                          </div>
                          ${p?.descricao
                            ? html`<div class="mt-1 line-clamp-2 text-sm text-slate-600">${p?.descricao ?? ''}</div>`
                            : html``}
                          <div class="mt-2 text-sm font-semibold text-slate-900">${moeda(p?.preco)}</div>
                        </div>

                        <div class="flex shrink-0 items-center gap-2">
                          <input
                            class="w-20 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                            type="number"
                            min="1"
                            value="1"
                          />
                          <button
                            class=${
                              indisponivel
                                ? 'inline-flex items-center justify-center rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-500'
                                : 'inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800'
                            }
                            type="button"
                            ?disabled=${indisponivel}
                            @click=${(e: Event) => {
                              const host = (e.currentTarget as HTMLElement).parentElement;
                              const input = host?.querySelector('input[type=number]') as HTMLInputElement | null;
                              const qtd = Number(input?.value ?? 1);
                              this.cartItens = [
                                ...(this.cartItens ?? []),
                                {
                                  produtoId: p?.id,
                                  quantidade: Number.isFinite(qtd) && qtd > 0 ? qtd : 1,
                                  observacoes: '',
                                  preco: p?.preco,
                                  nome: p?.nome,
                                  itemId: `${p?.id}-${Date.now()}`,
                                },
                              ];
                            }}
                          >
                            ${this.msg.confirm}
                          </button>
                        </div>
                      </div>
                    `;
                  })}
                </div>
              </section>

              <section class="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
                <div class="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
                  <h2 class="text-sm font-semibold text-slate-900">${this.msg.itemsAvailable}</h2>
                  <div class="text-xs text-slate-500">${(combos ?? []).length} ${this.msg.itemsAvailable}</div>
                </div>

                <div class="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                  ${(combos ?? []).map(
                    (c: any) => html`
                      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div class="flex items-start justify-between gap-4">
                          <div class="min-w-0">
                            <div class="truncate text-sm font-semibold text-slate-900">${c?.nome ?? ''}</div>
                            ${c?.descricao
                              ? html`<div class="mt-1 text-sm text-slate-600">${c?.descricao ?? ''}</div>`
                              : html``}
                          </div>
                          <div class="shrink-0 text-sm font-semibold text-slate-900">${moeda(c?.preco)}</div>
                        </div>

                        <div class="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                          <div class="font-semibold text-slate-800">${this.msg.descricao}</div>
                          <div class="mt-1 whitespace-pre-wrap">${JSON.stringify(c?.itens ?? [])}</div>
                        </div>

                        <div class="mt-4 flex justify-end">
                          <button
                            class="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                            type="button"
                            @click=${() => {
                              this.cartItens = [
                                ...(this.cartItens ?? []),
                                {
                                  comboId: c?.id,
                                  quantidade: 1,
                                  observacoes: '',
                                  preco: c?.preco,
                                  nome: c?.nome,
                                  itemId: `${c?.id}-${Date.now()}`,
                                },
                              ];
                            }}
                          >
                            ${this.msg.confirm}
                          </button>
                        </div>
                      </div>
                    `,
                  )}
                </div>
              </section>
            </main>

            <aside class="col-span-12 lg:col-span-4">
              <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div class="border-b border-slate-200 px-5 py-4">
                  <h2 class="text-sm font-semibold text-slate-900">${this.msg.itensCarrinho}</h2>
                </div>

                <div class="p-5">
                  <div class="grid grid-cols-1 gap-4">
                    <label class="block">
                      <div class="text-xs font-semibold text-slate-600">${this.msg.orderType}</div>
                      <select
                        class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                        .value=${this.orderType ?? 'delivery'}
                        @change=${(e: Event) => {
                          this.orderType = (e.target as HTMLSelectElement).value;
                        }}
                      >
                        <option value="delivery">delivery</option>
                        <option value="pickup">pickup</option>
                      </select>
                    </label>

                    <div class="rounded-xl border border-slate-200">
                      <div class="max-h-[360px] overflow-auto divide-y divide-slate-100">
                        ${(cartItens ?? []).length
                          ? (cartItens ?? []).map(
                              (it: any, idx: number) => html`
                                <div class="px-4 py-3">
                                  <div class="flex items-start justify-between gap-3">
                                    <div class="min-w-0">
                                      <div class="truncate text-sm font-semibold text-slate-900">${it?.nome ?? ''}</div>
                                      <div class="mt-1 text-xs text-slate-600">${moeda(it?.preco)}</div>
                                    </div>
                                    <button
                                      class="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                      type="button"
                                      @click=${() => {
                                        const next = [...(this.cartItens ?? [])];
                                        next.splice(idx, 1);
                                        this.cartItens = next;
                                      }}
                                    >
                                      ${this.msg.reload}
                                    </button>
                                  </div>

                                  <div class="mt-3 flex items-center gap-2">
                                    <button
                                      class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50"
                                      type="button"
                                      @click=${() => {
                                        const next = [...(this.cartItens ?? [])];
                                        const current = next[idx] ?? {};
                                        const q = Number(current?.quantidade ?? current?.qtd ?? 1);
                                        const newQ = Math.max(1, q - 1);
                                        next[idx] = { ...current, quantidade: newQ };
                                        this.cartItens = next;
                                      }}
                                    >
                                      -
                                    </button>
                                    <input
                                      class="h-9 w-20 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                      type="number"
                                      min="1"
                                      .value=${String(it?.quantidade ?? it?.qtd ?? 1)}
                                      @change=${(e: Event) => {
                                        const v = Number((e.target as HTMLInputElement).value);
                                        const next = [...(this.cartItens ?? [])];
                                        const current = next[idx] ?? {};
                                        next[idx] = { ...current, quantidade: Number.isFinite(v) && v > 0 ? v : 1 };
                                        this.cartItens = next;
                                      }}
                                    />
                                    <button
                                      class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50"
                                      type="button"
                                      @click=${() => {
                                        const next = [...(this.cartItens ?? [])];
                                        const current = next[idx] ?? {};
                                        const q = Number(current?.quantidade ?? current?.qtd ?? 1);
                                        next[idx] = { ...current, quantidade: q + 1 };
                                        this.cartItens = next;
                                      }}
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              `,
                            )
                          : html`
                              <div class="px-4 py-10 text-center text-sm text-slate-600">
                                ${this.msg.itensCarrinho}
                              </div>
                            `}
                      </div>

                      <div class="border-t border-slate-200 p-4">
                        <div class="flex items-center justify-between text-sm">
                          <div class="text-slate-600">${this.msg.subtotal}</div>
                          <div class="font-semibold text-slate-900">${moeda(subtotal)}</div>
                        </div>
                        <div class="mt-2 flex items-center justify-between text-sm">
                          <div class="text-slate-600">${this.msg.total}</div>
                          <div class="text-base font-semibold text-slate-900">${moeda(total)}</div>
                        </div>

                        <form class="mt-4" @submit=${this.handleCreateOrderSubmit}>
                          <button
                            class="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                            type="submit"
                          >
                            ${this.msg.confirm}
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section class="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
                <div class="border-b border-slate-200 px-5 py-4">
                  <h2 class="text-sm font-semibold text-slate-900">${this.msg.politicaCancelamento}</h2>
                </div>
                <div class="p-5">
                  <div class="grid grid-cols-1 gap-3">
                    <div class="text-xs font-semibold text-slate-600">${this.msg.condicoes}</div>
                    <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      ${this.politicaCancelamento?.condicoes ?? ''}
                    </div>
                  </div>
                </div>
              </section>

              <section class="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
                <div class="border-b border-slate-200 px-5 py-4">
                  <h2 class="text-sm font-semibold text-slate-900">${this.msg.whatsApp}</h2>
                </div>
                <div class="p-5">
                  <div class="text-xs font-semibold text-slate-600">${this.msg.numeroTelefone}</div>
                  <div class="mt-1 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800">
                    ${this.configuracaoWhatsApp?.numeroTelefone ?? ''}
                  </div>

                  <a
                    class="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                    href=${`https://wa.me/${this.configuracaoWhatsApp?.numeroTelefone ?? ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ${this.msg.confirm}
                  </a>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    `;
  }
}
