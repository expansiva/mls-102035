/// <mls fileReference="_102047_/l2/tarefas/web/mobile/page11/painel_tarefas.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { TarefasPainel_tarefasShared } from '/_102047_/l2/tarefas/web/shared/painel_tarefas.js';
import '/_102040_/l2/molecules/groupviewmetric/ml-metric-big-number.js';
import '/_102040_/l2/molecules/groupviewtable/ml-responsive-table.js';

const formatNumber = (value: number) => new Intl.NumberFormat(document.documentElement.lang || undefined).format(value);

/// **collab_i18n_start**
const pageMessage_pt_br = {
  pageTitle: 'Painel de tarefas',
  triageTitle: 'O que precisa de acompanhamento',
  triageDescription: 'Veja os sinais que pedem atenção e abra as tarefas para agir.',
  overdue: 'Atrasadas',
  dueToday: 'Vencem hoje',
  returned: 'Devolvidas aguardando retomada',
  openTasks: 'Tarefas abertas',
  openTasksHelper: 'Em toda a organização',
  viewTasks: 'Ver tarefas',
  listCaption: 'Tarefas abertas por lista',
  listName: 'Lista',
  taskCount: 'Tarefas abertas',
  checklistProgress: 'Checklist',
  checklistProgressValue: 'itens concluídos de',
  noLists: 'Não há listas com tarefas abertas no momento.',
  loadingTriage: 'Carregando acompanhamento das tarefas',
  loadingLists: 'Carregando listas',
  loadErrorTitle: 'Não foi possível carregar o painel',
  retry: 'Tentar novamente',
  browseLists: 'Abrir listas de tarefas',
  emptyTitle: 'Nada para acompanhar agora',
  emptyDescription: 'Não há listas com tarefas abertas no momento.',
  listRowAction: 'Ver tarefas desta lista'
};
type PageMessageType = typeof pageMessage_pt_br;
const pageMessages: Record<string, PageMessageType> = { 'pt-br': pageMessage_pt_br };
/// **collab_i18n_end**

@customElement('tarefas--web--mobile--page11--painel_tarefas-102047')
export class TarefasMobilePage11Painel_tarefasPage extends TarefasPainel_tarefasShared {
  private msg: PageMessageType = pageMessage_pt_br;

  private renderAttention(label: string, value: number, danger = false) {
    return html`
      <button
        type="button"
        class="flex min-h-11 w-full items-center justify-between gap-4 rounded-lg border border-[var(--border-subtle,currentColor)] bg-[var(--surface-bg,transparent)] px-4 py-3 text-left focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]"
        aria-label="${label}: ${formatNumber(value)}. ${this.msg.viewTasks}"
        @click=${() => this.verTodasTarefas()}>
        <span class="text-sm font-medium text-[var(--text-strong,currentColor)]">${label}</span>
        <span class="flex shrink-0 items-center gap-3">
          <span class="text-lg font-semibold tabular-nums ${danger ? 'text-[var(--status-error-text,currentColor)]' : 'text-[var(--text-strong,currentColor)]'}">${formatNumber(value)}</span>
          <span class="text-sm text-[var(--link-text,currentColor)]">${this.msg.viewTasks}</span>
        </span>
      </button>
    `;
  }

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];
    const loading = this.pageStatus === 'loading' || this.carregarPainelTarefasStatus === 'loading';
    const failed = this.pageStatus === 'error';
    const indicators = this.indicadores;

    return html`
      <main class="min-h-full bg-[var(--page-bg,transparent)] px-4 py-5 text-[var(--text-default,currentColor)]">
        <header class="mb-5">
          <h1 class="text-xl font-semibold text-[var(--text-strong,currentColor)]">${this.msg.pageTitle}</h1>
        </header>

        <section data-organism-id="indicadoresTarefas" aria-labelledby="triage-heading">
          <div class="mb-3">
            <h2 id="triage-heading" class="text-base font-semibold text-[var(--text-strong,currentColor)]">${this.msg.triageTitle}</h2>
            <p class="mt-1 text-sm text-[var(--text-muted,currentColor)]">${this.msg.triageDescription}</p>
          </div>

          ${failed ? html`
            <div class="rounded-lg border border-[var(--status-error-text,currentColor)] bg-[var(--status-error-bg,transparent)] p-4" role="alert">
              <p class="font-medium text-[var(--status-error-text,currentColor)]">${this.msg.loadErrorTitle}</p>
              <p class="mt-1 text-sm text-[var(--text-default,currentColor)]">${this.carregarPainelTarefasError?.message}</p>
              <button type="button" class="mt-3 min-h-11 rounded-md border border-[var(--button-secondary-border,currentColor)] bg-[var(--button-secondary-bg,transparent)] px-4 text-sm font-medium text-[var(--button-secondary-text,currentColor)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]" @click=${() => this.carregarPainelTarefas()}>${this.msg.retry}</button>
            </div>
          ` : loading ? html`
            <div class="space-y-2" aria-busy="true" aria-label="${this.msg.loadingTriage}">
              ${[1, 2, 3].map(() => html`<div class="h-14 animate-pulse rounded-lg bg-[var(--surface-alt-bg,transparent)]"></div>`)}
            </div>
          ` : indicators ? html`
            <div class="space-y-2">
              ${this.renderAttention(this.msg.overdue, indicators.atrasadas, true)}
              ${this.renderAttention(this.msg.dueToday, indicators.vencemHoje)}
              ${this.renderAttention(this.msg.returned, indicators.devolvidasPendentes)}
            </div>
            <div class="mt-4 border-y border-[var(--border-subtle,currentColor)] py-3">
              <groupviewmetric--ml-metric-big-number .loading=${false}>
                <Label>${this.msg.openTasks}</Label>
                <Value>${formatNumber(indicators.tarefasAbertas)}</Value>
                <Helper>${this.msg.openTasksHelper}</Helper>
              </groupviewmetric--ml-metric-big-number>
            </div>
          ` : html`
            <div class="rounded-lg border border-[var(--border-subtle,currentColor)] bg-[var(--surface-bg,transparent)] p-4">
              <p class="font-medium text-[var(--text-strong,currentColor)]">${this.msg.emptyTitle}</p>
              <p class="mt-1 text-sm text-[var(--text-muted,currentColor)]">${this.msg.emptyDescription}</p>
            </div>
          `}
        </section>

        <section data-organism-id="tarefasPorLista" class="mt-6">
          <groupviewtable--ml-responsive-table
            .loading=${loading}
            .error=${failed ? (this.carregarPainelTarefasError?.message ?? this.msg.loadErrorTitle) : ''}
            value=""
            page="1"
            page-size="0"
            total-items="0"
            aria-label="${this.msg.listCaption}"
            @rowClick=${(e: CustomEvent<{ index: number }>) => this.verTarefasDaLista(this.listas[e.detail.index]?.id ?? null)}>
            <TableCaption>${this.msg.listCaption}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead key="nome">${this.msg.listName}</TableHead>
                <TableHead key="quantidade">${this.msg.taskCount}</TableHead>
                <TableHead key="checklist">${this.msg.checklistProgress}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              ${this.listas.map((lista) => html`
                <TableRow key="${lista.id}" aria-label="${this.msg.listRowAction}">
                  <TableCell>${lista.nome}</TableCell>
                  <TableCell>${formatNumber(lista.details.quantidadeTarefasAbertas)}</TableCell>
                  <TableCell>${formatNumber(lista.itensChecklistConcluidos)} ${this.msg.checklistProgressValue} ${formatNumber(lista.itensChecklistTotal)}</TableCell>
                </TableRow>
              `)}
            </TableBody>
            <Loading>${this.msg.loadingLists}</Loading>
            <Empty>${this.msg.noLists}</Empty>
          </groupviewtable--ml-responsive-table>

          <button type="button" class="mt-3 min-h-11 w-full rounded-md border border-[var(--button-secondary-border,currentColor)] bg-[var(--button-secondary-bg,transparent)] px-4 text-sm font-medium text-[var(--button-secondary-text,currentColor)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]" @click=${() => this.abrirListas()}>${this.msg.browseLists}</button>
        </section>
      </main>
    `;
  }
}
