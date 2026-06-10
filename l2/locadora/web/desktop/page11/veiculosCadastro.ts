/// <mls fileReference="_102035_/l2/locadora/web/desktop/page11/veiculosCadastro.ts" enhancement="_102027_/l2/enhancementLit.ts" />
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { LocadoraVeiculosCadastroBase } from '/_102035_/l2/locadora/web/shared/veiculosCadastro.js';
import '/_102040_/l2/molecules/groupentertext/ml-floating-text-input.js';
import '/_102040_/l2/molecules/groupenternumber/ml-number-input.js';
import '/_102040_/l2/molecules/groupselectone/ml-select.js';
import '/_102040_/l2/molecules/grouptriggeraction/ml-button-standard.js';
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
<grouptriggeraction--ml-button-standard
type="button"
class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
@click=${() => this.loadGetStatusVeiculoOptions(undefined, { mode: 'blocking' })}
>
<Label>${this.msg.reload}</Label>
</grouptriggeraction--ml-button-standard>
</div>
</div>
<form class="px-6 py-5" @submit=${this.handleSaveVeiculoSubmit}>
<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
<div>
<groupentertext--ml-floating-text-input
id="placa"
class="mt-1 w-full"
.value=${this.placa ?? ''}
.error=${this.formErrors?.['placa'] ?? ''}
@input=${(e: Event) => {
        const v = (e.target as HTMLInputElement).value;
        this.placa = v;
      }}
>
<Label>${this.msg.placa}</Label>
</groupentertext--ml-floating-text-input>
</div>
<div>
<groupentertext--ml-floating-text-input
id="modelo"
class="mt-1 w-full"
.value=${this.modelo ?? ''}
.error=${this.formErrors?.['modelo'] ?? ''}
@input=${(e: Event) => {
        const v = (e.target as HTMLInputElement).value;
        this.modelo = v;
      }}
>
<Label>${this.msg.modelo}</Label>
</groupentertext--ml-floating-text-input>
</div>
<div>
<groupenternumber--ml-number-input
id="ano"
class="mt-1 w-full"
.value=${String(this.ano ?? 0)}
.error=${this.formErrors?.['ano'] ?? ''}
@input=${(e: Event) => {
        const raw = (e.target as HTMLInputElement).value;
        this.ano = Number(raw);
      }}
>
<Label>${this.msg.ano}</Label>
</groupenternumber--ml-number-input>
</div>
<div>
<groupentertext--ml-floating-text-input
id="categoria"
class="mt-1 w-full"
.value=${this.categoria ?? ''}
.error=${this.formErrors?.['categoria'] ?? ''}
@input=${(e: Event) => {
        const v = (e.target as HTMLInputElement).value;
        this.categoria = v;
      }}
>
<Label>${this.msg.categoria}</Label>
</groupentertext--ml-floating-text-input>
</div>
<div>
<groupselectone--ml-select
id="status"
class="mt-1 w-full"
.value=${this.statusVeiculo ?? ''}
.error=${this.formErrors?.['status'] ?? ''}
@change=${(e: Event) => {
        const v = (e.target as HTMLSelectElement).value;
        this.statusVeiculo = v;
      }}
>
<Label>${this.msg.status}</Label>
<option value=""></option>
${(statusOptions || []).map(
        (opt) => html`<option value=${String(opt)}>${String(opt)}</option>`,
      )}
</groupselectone--ml-select>
</div>
<div>
<groupenternumber--ml-number-input
id="quilometragem"
class="mt-1 w-full"
.value=${String(this.quilometragem ?? 0)}
.error=${this.formErrors?.['quilometragem'] ?? ''}
@input=${(e: Event) => {
        const raw = (e.target as HTMLInputElement).value;
        this.quilometragem = Number(raw);
      }}
>
<Label>${this.msg.quilometragem}</Label>
</groupenternumber--ml-number-input>
</div>
</div>
<div class="mt-6 flex flex-wrap items-center justify-between gap-3">
<div class="flex items-center gap-2">
${this.formDirty
        ? html`<span class="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">${this.status || this.msg.status}</span>`
        : html``}
</div>
<grouptriggeraction--ml-button-standard
type="submit"
class="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
?disabled=${this.saveVeiculo === 'loading'}
>
<Label>${this.saveVeiculo === 'loading' ? this.msg.saving : this.msg.save}</Label>
</grouptriggeraction--ml-button-standard>
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

