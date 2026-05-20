/// <mls fileReference="_102035_/l2/pizzaria/web/desktop/page11/customerEditor.ts" enhancement="_102027_/l2/enhancementLit.ts" />

import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { PizzariaCustomerEditorBase } from '/_102035_/l2/pizzaria/web/shared/customerEditor.js';

@customElement('pizzaria--web--desktop--page11--customer-editor-102035')
export class PizzariaWebDesktopCustomerEditorPage extends PizzariaCustomerEditorBase {
  render() {
    const customer = this.customerDetail;
    const addresses = this.addresses ?? [];

    return html`
      <div class="min-h-screen bg-slate-50 text-slate-900">
        <div class="mx-auto max-w-6xl px-6 py-6">
          <header class="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div class="min-w-0">
                <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">${this.msg.brand}</div>
                <div class="mt-1 flex items-baseline gap-3">
                  <h1 class="truncate text-2xl font-semibold text-slate-900">${this.msg.pageTitle}</h1>
                  ${customer?.status
                    ? html`<span class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">${customer.status}</span>`
                    : html``}
                </div>
                <p class="mt-2 text-sm text-slate-600">${this.msg.pageSubtitle}</p>

                <dl class="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                  <div class="flex gap-2">
                    <dt class="text-xs font-semibold text-slate-500">${this.msg.fieldId}</dt>
                    <dd class="text-xs text-slate-700">${customer?.id ?? ''}</dd>
                  </div>
                  <div class="flex gap-2">
                    <dt class="text-xs font-semibold text-slate-500">${this.msg.fieldFullName}</dt>
                    <dd class="text-xs text-slate-700">${customer?.fullName ?? ''}</dd>
                  </div>
                  <div class="flex gap-2">
                    <dt class="text-xs font-semibold text-slate-500">${this.msg.fieldUpdatedAt}</dt>
                    <dd class="text-xs text-slate-700">${customer?.updatedAt ?? ''}</dd>
                  </div>
                  <div class="flex gap-2">
                    <dt class="text-xs font-semibold text-slate-500">${this.msg.fieldUpdatedBy}</dt>
                    <dd class="text-xs text-slate-700">${customer?.updatedBy ?? ''}</dd>
                  </div>
                </dl>
              </div>

              <div class="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  class="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  @click=${() => this.loadInitialData({ customerId: customer?.id }, { mode: 'blocking' })}
                >
                  ${this.msg.reload}
                </button>

                <form class="contents" @submit=${this.handleSaveSubmit}>
                  <input type="hidden" name="customerId" .value=${customer?.id ?? ''} />
                  <input type="hidden" name="name" .value=${customer?.fullName ?? ''} />
                  <input type="hidden" name="phone" .value=${customer?.phone ?? ''} />
                  <input type="hidden" name="notes" .value=${customer?.notes ?? ''} />
                  <button
                    type="submit"
                    class="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                  >
                    ${this.msg.save}
                  </button>
                </form>

                <button
                  class="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50"
                  @click=${() => this.handleDeleteClick(customer?.id ?? '')}
                >
                  ${this.msg.fieldStatus}
                </button>
              </div>
            </div>

            ${this.status
              ? html`
                  <div class="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    ${this.status}
                  </div>
                `
              : html``}
          </header>

          <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <main class="lg:col-span-2">
              <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <h2 class="text-base font-semibold text-slate-900">${this.msg.pageTitle}</h2>
                    <p class="mt-1 text-sm text-slate-600">${this.msg.pageSubtitle}</p>
                  </div>
                </div>

                <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <div class="text-xs font-semibold text-slate-500">${this.msg.fieldFullName}</div>
                    <div class="mt-1 text-sm text-slate-900">${customer?.fullName ?? ''}</div>
                  </div>
                  <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <div class="text-xs font-semibold text-slate-500">${this.msg.fieldPhone}</div>
                    <div class="mt-1 text-sm text-slate-900">${customer?.phone ?? ''}</div>
                  </div>
                  <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <div class="text-xs font-semibold text-slate-500">${this.msg.fieldEmail}</div>
                    <div class="mt-1 text-sm text-slate-900">${customer?.email ?? ''}</div>
                  </div>
                  <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <div class="text-xs font-semibold text-slate-500">${this.msg.fieldDocumentId}</div>
                    <div class="mt-1 text-sm text-slate-900">${customer?.documentId ?? ''}</div>
                  </div>
                  <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <div class="text-xs font-semibold text-slate-500">${this.msg.fieldBirthDate}</div>
                    <div class="mt-1 text-sm text-slate-900">${customer?.birthDate ?? ''}</div>
                  </div>
                  <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <div class="text-xs font-semibold text-slate-500">${this.msg.fieldPreferredPaymentMethod}</div>
                    <div class="mt-1 text-sm text-slate-900">${customer?.preferredPaymentMethod ?? ''}</div>
                  </div>
                  <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <div class="text-xs font-semibold text-slate-500">${this.msg.fieldMarketingOptIn}</div>
                    <div class="mt-1 text-sm text-slate-900">${customer?.marketingOptIn ?? ''}</div>
                  </div>
                  <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <div class="text-xs font-semibold text-slate-500">${this.msg.fieldCreatedAt}</div>
                    <div class="mt-1 text-sm text-slate-900">${customer?.createdAt ?? ''}</div>
                  </div>
                </div>

                <div class="mt-4 grid grid-cols-1 gap-4">
                  <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <div class="text-xs font-semibold text-slate-500">${this.msg.fieldDeliveryInstructions}</div>
                    <div class="mt-1 whitespace-pre-wrap text-sm text-slate-900">${customer?.deliveryInstructions ?? ''}</div>
                  </div>
                  <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <div class="text-xs font-semibold text-slate-500">${this.msg.fieldNotes}</div>
                    <div class="mt-1 whitespace-pre-wrap text-sm text-slate-900">${customer?.notes ?? ''}</div>
                  </div>
                </div>
              </section>
            </main>

            <aside class="lg:col-span-1">
              <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <h2 class="text-base font-semibold text-slate-900">${this.msg.loadingListAddresses}</h2>
                    <p class="mt-1 text-sm text-slate-600">${this.msg.addressIsDefault}</p>
                  </div>
                  <button
                    class="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                    @click=${() => this.loadListAddresses({ customerId: customer?.id }, { mode: 'blocking' })}
                  >
                    ${this.msg.reload}
                  </button>
                </div>

                <div class="mt-5 overflow-hidden rounded-lg border border-slate-200">
                  <div class="divide-y divide-slate-200">
                    ${(addresses ?? []).map((a) => html`
                      <div class="px-4 py-3 hover:bg-slate-50">
                        <div class="flex items-start justify-between gap-3">
                          <div class="min-w-0">
                            <div class="flex items-center gap-2">
                              <div class="truncate text-sm font-semibold text-slate-900">${a.label ?? ''}</div>
                              ${a.isDefault
                                ? html`<span class="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">${this.msg.addressIsDefault}</span>`
                                : html``}
                            </div>
                            <div class="mt-1 text-xs text-slate-600">
                              <span class="font-semibold">${this.msg.addressStreet}:</span> ${a.street}
                              <span class="font-semibold">${this.msg.addressNumber}:</span> ${a.number}
                              ${a.complement ? html` · <span class="font-semibold">${this.msg.addressComplement}:</span> ${a.complement}` : html``}
                            </div>
                            <div class="mt-1 text-xs text-slate-600">
                              <span class="font-semibold">${this.msg.addressDistrict}:</span> ${a.district}
                              · <span class="font-semibold">${this.msg.addressCity}:</span> ${a.city}
                              · <span class="font-semibold">${this.msg.addressState}:</span> ${a.state}
                            </div>
                            <div class="mt-1 text-xs text-slate-600">
                              <span class="font-semibold">${this.msg.addressPostalCode}:</span> ${a.postalCode}
                            </div>
                            <div class="mt-2 text-[11px] text-slate-500">
                              <span class="font-semibold">${this.msg.fieldId}:</span> ${a.id}
                            </div>
                          </div>
                        </div>
                      </div>
                    `)}
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    `;
  }
}
