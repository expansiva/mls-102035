/// <mls fileReference="_102047_/l2/tarefas/web/desktop/page11/painel_tarefas.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { TarefasPainel_tarefasShared } from '/_102047_/l2/tarefas/web/shared/painel_tarefas.js';
import '/_102040_/l2/molecules/groupviewmetric/ml-metric-big-number.js';

/// **collab_i18n_start**
const pageMessage_pt_br = {
  pageTitle: 'Painel de tarefas',
  pageDescription: 'Acompanhe onde as tarefas abertas precisam de atenção.',
  triageTitle: 'Priorize as listas com trabalho em aberto',
  triageDescription: 'Abra uma lista para acompanhar as tarefas da equipe.',
  allTasks: 'Ver todas as tarefas',
  manageLists: 'Gerenciar listas',
  openTasks: 'tarefas abertas',
  checklist: 'Checklist',
  checklistProgress: 'itens concluídos de itens',
  noListsTitle: 'Não há listas com tarefas abertas',
  noListsDescription: 'Quando houver trabalho aberto em uma lista, ele aparecerá aqui.',
  healthTitle: 'Panorama geral',
  openTasksLabel: 'Tarefas abertas',
  dueTodayLabel: 'Vencem hoje',
  overdueLabel: 'Atrasadas',
  returnedLabel: 'Devolvidas aguardando retomada',
  loadingLists: 'Carregando listas com tarefas abertas',
  loadingPanel: 'Carregando painel de tarefas',
  errorTitle: 'Não foi possível carregar o painel',
  errorDescription: 'Tente carregar novamente para ver as tarefas da organização.',
  reload: 'Tentar novamente',
  missingInformationTitle: 'Faltam informações para abrir o painel',
  missingInformationDescription: 'Volte para Tarefas da equipe e abra o painel novamente.',
  backToTasks: 'Voltar para Tarefas da equipe',
  noAttention: 'Nada precisa de atenção agora'
};
type PageMessageType = typeof pageMessage_pt_br;
const pageMessages: Record<string, PageMessageType> = {
  'pt-br': pageMessage_pt_br
};
/// **collab_i18n_end**

function formatNumber(value: number): string {
  return new Intl.NumberFormat(document.documentElement.lang || undefined).format(value);
}

@customElement('tarefas--web--desktop--page11--painel_tarefas-102047')
export class TarefasDesktopPage11Painel_tarefasPage extends TarefasPainel_tarefasShared {
  private msg: PageMessageType = pageMessage_pt_br;

  private renderIndicators() {
    const loading = this.carregarPainelTarefasStatus === 'loading';
    const indicadores = this.indicadores;
    return html`
      <section data-organism-id="indicadoresTarefas" aria-labelledby="panorama-heading" class="border-t border-[var(--border-subtle,currentColor)] pt-7">
        <h2 id="panorama-heading" class="mb-4 text-sm font-semibold text-[var(--text-strong,currentColor)]">${this.msg.healthTitle}</h2>
        <div class="grid grid-cols-4 divide-x divide-[var(--border-subtle,currentColor)]">
          <groupviewmetric--ml-metric-big-number .loading=${loading} data-class="px-5 first:pl-0 last:pr-0">
            <Label>${this.msg.openTasksLabel}</Label>
            <Value>${indicadores ? formatNumber(indicadores.tarefasAbertas) : ''}</Value>
          </groupviewmetric--ml-metric-big-number>
          <groupviewmetric--ml-metric-big-number .loading=${loading} data-class="px-5">
            <Label>${this.msg.dueTodayLabel}</Label>
            <Value>${indicadores ? formatNumber(indicadores.vencemHoje) : ''}</Value>
          </groupviewmetric--ml-metric-big-number>
          <groupviewmetric--ml-metric-big-number .loading=${loading} data-class="px-5">
            <Label>${this.msg.overdueLabel}</Label>
            <Value>${indicadores ? formatNumber(indicadores.atrasadas) : ''}</Value>
          </groupviewmetric--ml-metric-big-number>
          <groupviewmetric--ml-metric-big-number .loading=${loading} data-class="px-5 last:pr-0">
            <Label>${this.msg.returnedLabel}</Label>
            <Value>${indicadores ? formatNumber(indicadores.devolvidasPendentes) : ''}</Value>
          </groupviewmetric--ml-metric-big-number>
        </div>
      </section>
    `;
  }

  private renderLists() {
    const loading = this.carregarPainelTarefasStatus === 'loading';
    if (loading) {
      return html`
        <div class="space-y-3" aria-busy="true" aria-label="${this.msg.loadingLists}">
          <div class="h-20 animate-pulse rounded-lg bg-[var(--surface-alt-bg,transparent)]"></div>
          <div class="h-20 animate-pulse rounded-lg bg-[var(--surface-alt-bg,transparent)]"></div>
          <div class="h-20 animate-pulse rounded-lg bg-[var(--surface-alt-bg,transparent)]"></div>
        </div>
      `;
    }
    if (this.pageStatus === 'empty') {
      return html`
        <div class="rounded-lg border border-dashed border-[var(--border-default,currentColor)] px-6 py-10 text-center">
          <p class="text-base font-semibold text-[var(--text-strong,currentColor)]">${this.msg.noListsTitle}</p>
          <p class="mt-2 text-sm text-[var(--text-muted,currentColor)]">${this.msg.noListsDescription}</p>
        </div>
      `;
    }
    return html`
      <ul class="divide-y divide-[var(--border-subtle,currentColor)] border-y border-[var(--border-subtle,currentColor)]">
        ${this.listas.map((lista) => html`
          <li>
            <button
              type="button"
              class="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-8 px-5 py-5 text-left transition hover:bg-[var(--surface-alt-bg,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]"
              aria-label="${lista.nome}"
              @click=${() => this.verTarefasDaLista(lista.id)}>
              <span class="min-w-0">
                <span class="block truncate text-base font-semibold text-[var(--link-text,currentColor)]">${lista.nome}</span>
                <span class="mt-1 block text-sm text-[var(--text-muted,currentColor)]">
                  ${this.msg.checklist}: ${formatNumber(lista.itensChecklistConcluidos)} ${this.msg.checklistProgress.replace('itens concluídos de itens', 'de')} ${formatNumber(lista.itensChecklistTotal)}
                </span>
              </span>
              <span class="text-right tabular-nums">
                <span class="block text-xl font-semibold text-[var(--text-strong,currentColor)]">${formatNumber(lista.details.quantidadeTarefasAbertas)}</span>
                <span class="block text-xs text-[var(--text-muted,currentColor)]">${this.msg.openTasks}</span>
              </span>
            </button>
          </li>
        `)}
      </ul>
    `;
  }

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];
    const requestError = this.carregarPainelTarefasError;
    const preconditionMissing = requestError?.code === 'client.preconditionMissing';
    return html`
      <main class="min-h-full bg-[var(--page-bg,transparent)] px-10 py-9 text-[var(--text-default,currentColor)]">
        <div class="mx-auto max-w-6xl">
          <header class="flex items-start justify-between gap-8 border-b border-[var(--border-default,currentColor)] pb-7">
            <div>
              <h1 class="text-2xl font-semibold tracking-tight text-[var(--text-strong,currentColor)]">${this.msg.pageTitle}</h1>
              <p class="mt-2 text-sm text-[var(--text-muted,currentColor)]">${this.msg.pageDescription}</p>
            </div>
            <button type="button" class="shrink-0 rounded-md border border-[var(--button-secondary-border,currentColor)] bg-[var(--button-secondary-bg,transparent)] px-4 py-2 text-sm font-medium text-[var(--button-secondary-text,currentColor)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]" @click=${() => this.verTodasTarefas()}>${this.msg.allTasks}</button>
          </header>

          ${this.pageStatus === 'error' ? html`
            <section class="py-14" aria-live="polite">
              <div class="max-w-xl rounded-lg border border-[var(--status-error-text,currentColor)] bg-[var(--surface-bg,transparent)] p-6">
                <h2 class="text-lg font-semibold text-[var(--text-strong,currentColor)]">${preconditionMissing ? this.msg.missingInformationTitle : this.msg.errorTitle}</h2>
                <p class="mt-2 text-sm text-[var(--text-muted,currentColor)]">${preconditionMissing ? this.msg.missingInformationDescription : requestError?.message || this.msg.errorDescription}</p>
                <button type="button" class="mt-5 rounded-md bg-[var(--button-primary-bg,transparent)] px-4 py-2 text-sm font-medium text-[var(--button-primary-text,currentColor)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]" @click=${() => this.carregarPainelTarefas()}>${this.msg.reload}</button>
              </div>
            </section>
          ` : html`
            <section data-organism-id="tarefasPorLista" aria-labelledby="triagem-heading" class="py-8">
              <div class="mb-5 flex items-end justify-between gap-6">
                <div>
                  <h2 id="triagem-heading" class="text-lg font-semibold text-[var(--text-strong,currentColor)]">${this.msg.triageTitle}</h2>
                  <p class="mt-1 text-sm text-[var(--text-muted,currentColor)]">${this.msg.triageDescription}</p>
                </div>
                <button type="button" class="shrink-0 text-sm font-medium text-[var(--link-text,currentColor)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]" @click=${() => this.abrirListas()}>${this.msg.manageLists}</button>
              </div>
              ${this.renderLists()}
            </section>
            ${this.renderIndicators()}
          `}
        </div>
      </main>
    `;
  }
}
