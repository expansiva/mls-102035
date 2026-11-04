/// <mls fileReference="_102047_/l2/tarefas/web/mobile/page11/inicio.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { TarefasInicioShared } from '/_102047_/l2/tarefas/web/shared/inicio.js';
import type { AlertaPrazo, PendenciaTarefa } from '/_102047_/l2/tarefas/web/contracts/inicio.defs.js';
import '/_102040_/l2/molecules/groupnavigatesection/ml-navigate-pills.js';
import '/_102040_/l2/molecules/groupnotifyuser/ml-notify-banner.js';
import '/_102040_/l2/molecules/grouptriggeraction/ml-split-button.js';
import '/_102040_/l2/molecules/groupviewdata/ml-vertical-record-list.js';
import '/_102040_/l2/molecules/groupviewmetric/ml-metric-big-number.js';

/// **collab_i18n_start**
const pageMessage_pt_br = {
  pageTitle: 'Início',
  pageIntro: 'Veja primeiro o que vence agora e resolva o que depende de você.',
  loading: 'Carregando suas tarefas',
  loadErrorTitle: 'Não foi possível abrir o início',
  loadErrorMessage: 'Falta uma informação para carregar suas tarefas ou ocorreu um problema ao carregar.',
  reload: 'Tentar novamente',
  dueHeading: 'Prazos para olhar agora',
  dueSummary: 'Tarefas abertas que vencem hoje ou estão atrasadas.',
  dueToday: 'Vence hoje',
  overdue: 'Atrasada',
  deadline: 'Prazo',
  status: 'Situação',
  openTask: 'Abrir tarefa',
  noDueTasks: 'Nenhuma tarefa vence hoje ou está atrasada.',
  pendingHeading: 'O que depende de mim agora',
  pendingDescription: 'Escolha uma tarefa para executar, revisar ou retomar.',
  executeTab: 'Executar',
  reviewTab: 'Revisar',
  resumeTab: 'Retomar',
  toDo: 'A fazer',
  inProgress: 'Em andamento',
  inReview: 'Em revisão',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  priority: 'Prioridade',
  checklistProgress: 'Progresso da checklist',
  list: 'Lista',
  assignee: 'Responsável',
  creator: 'Quem criou',
  actingNow: 'Quem age agora',
  returnReason: 'Motivo da devolução',
  returnReasonPlaceholder: 'Explique o que precisa ser ajustado',
  startTask: 'Iniciar tarefa',
  sendReview: 'Enviar para revisão',
  acceptTask: 'Aceitar tarefa',
  returnTask: 'Devolver tarefa',
  resumeTask: 'Retomar tarefa',
  commandError: 'Não foi possível concluir esta ação. Tente novamente.',
  commandSuccess: 'Ação concluída. A tarefa foi atualizada.',
  noExecuteTasks: 'Não há tarefas para iniciar ou enviar para revisão.',
  noReviewTasks: 'Não há tarefas aguardando sua revisão.',
  noResumeTasks: 'Não há tarefas devolvidas para retomar.',
  overviewHeading: 'Meu panorama',
  openTasks: 'Abertas',
  dueTodayMetric: 'Vencem hoje',
  overdueMetric: 'Atrasadas',
  returnedMetric: 'Devolvidas aguardando retomada',
  viewMyTasks: 'Ver minhas tarefas',
  permissionsHeading: 'Minhas permissões',
  member: 'Participante',
  acceptsTasks: 'Aceita tarefas',
  canCreateTasks: 'Pode criar tarefas',
  yes: 'Sim',
  no: 'Não',
  noPermissions: 'Suas permissões não estão disponíveis agora.'
};
type PageMessageType = typeof pageMessage_pt_br;
const pageMessages: Record<string, PageMessageType> = { 'pt-br': pageMessage_pt_br };
/// **collab_i18n_end**

type TaskStatus = PendenciaTarefa['status'];
type TaskPriority = PendenciaTarefa['prioridade'];

const STATUS_KEY: Record<TaskStatus, keyof PageMessageType> = {
  aFazer: 'toDo',
  emAndamento: 'inProgress',
  emRevisao: 'inReview',
  concluida: 'completed',
  cancelada: 'cancelled'
};

const PRIORITY_KEY: Record<TaskPriority, keyof PageMessageType> = {
  baixa: 'low',
  media: 'medium',
  alta: 'high'
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(document.documentElement.lang || undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function dueLabel(alert: AlertaPrazo, msg: PageMessageType) {
  return alert.details.atrasada ? msg.overdue : msg.dueToday;
}

@customElement('tarefas--web--mobile--page11--inicio-102047')
export class TarefasMobilePage11InicioPage extends TarefasInicioShared {
  private msg: PageMessageType = pageMessage_pt_br;

  renderMetric(label: keyof PageMessageType, value: number | undefined) {
    return html`
      <groupviewmetric--ml-metric-big-number .loading=${this.carregarInicioStatus === 'loading'}>
        <Label>${this.msg[label]}</Label>
        <Value>${value ?? 0}</Value>
      </groupviewmetric--ml-metric-big-number>
    `;
  }

  renderTaskCard(task: PendenciaTarefa) {
    const commandLoading = this.iniciarTarefaStatus === 'loading' || this.enviarRevisaoStatus === 'loading' || this.aceitarTarefaStatus === 'loading' || this.devolverTarefaStatus === 'loading' || this.retomarTarefaStatus === 'loading';
    const commandError = this.iniciarTarefaError || this.enviarRevisaoError || this.aceitarTarefaError || this.devolverTarefaError || this.retomarTarefaError;
    const commandSuccess = this.iniciarTarefaStatus === 'success' || this.enviarRevisaoStatus === 'success' || this.aceitarTarefaStatus === 'success' || this.devolverTarefaStatus === 'success' || this.retomarTarefaStatus === 'success';
    return html`
      <article class="space-y-3 py-1">
        <div class="space-y-1">
          <p class="font-semibold text-[var(--text-strong,currentColor)]">${task.titulo}</p>
          <p class="text-sm text-[var(--text-muted,currentColor)]">${this.msg[STATUS_KEY[task.status]]} · ${this.msg[PRIORITY_KEY[task.prioridade]]}</p>
        </div>
        <dl class="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          ${task.prazo ? html`<div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.deadline}</dt><dd class="font-medium text-[var(--text-default,currentColor)]">${formatDate(task.prazo)}</dd></div>` : ''}
          <div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.checklistProgress}</dt><dd class="font-medium text-[var(--text-default,currentColor)]">${task.details.progressoChecklist}</dd></div>
          <div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.list}</dt><dd class="font-medium text-[var(--text-default,currentColor)]">${task.listaTarefas.nome}</dd></div>
          <div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.actingNow}</dt><dd class="font-medium text-[var(--text-default,currentColor)]">${task.details.quemAgeAgora ?? '—'}</dd></div>
        </dl>
        ${task.details.motivoDevolucao ? html`<div class="rounded-lg bg-[var(--status-warning-bg,transparent)] p-3 text-sm text-[var(--status-warning-text,currentColor)]"><p class="font-semibold">${this.msg.returnReason}</p><p>${task.details.motivoDevolucao}</p></div>` : ''}
        ${commandError ? html`<p class="text-sm text-[var(--status-error-text,currentColor)]" aria-live="polite">${this.msg.commandError}</p>` : ''}
        ${commandSuccess ? html`<p class="text-sm text-[var(--status-success-text,currentColor)]" aria-live="polite">${this.msg.commandSuccess}</p>` : ''}
        <div class="flex flex-wrap gap-2">
          ${task.status === 'aFazer' ? html`
            <grouptriggeraction--ml-split-button size="md" type="button" .loading=${this.iniciarTarefaStatus === 'loading'} .disabled=${commandLoading && this.iniciarTarefaStatus !== 'loading'} @action=${() => this.iniciarTarefa(task.id)}>
              <Label>${this.msg.startTask}</Label>
            </grouptriggeraction--ml-split-button>
          ` : ''}
          ${task.status === 'emAndamento' && !task.details.devolvidaPendente ? html`
            <grouptriggeraction--ml-split-button size="md" type="button" .loading=${this.enviarRevisaoStatus === 'loading'} .disabled=${commandLoading && this.enviarRevisaoStatus !== 'loading'} @action=${() => this.enviarRevisao(task.id)}>
              <Label>${this.msg.sendReview}</Label>
            </grouptriggeraction--ml-split-button>
          ` : ''}
          ${task.status === 'emAndamento' && task.details.devolvidaPendente ? html`
            <grouptriggeraction--ml-split-button size="md" type="button" .loading=${this.retomarTarefaStatus === 'loading'} .disabled=${commandLoading && this.retomarTarefaStatus !== 'loading'} @action=${() => this.retomarTarefa(task.id)}>
              <Label>${this.msg.resumeTask}</Label>
            </grouptriggeraction--ml-split-button>
          ` : ''}
          ${task.status === 'emRevisao' ? html`
            <grouptriggeraction--ml-split-button size="md" type="button" .loading=${this.aceitarTarefaStatus === 'loading'} .disabled=${commandLoading && this.aceitarTarefaStatus !== 'loading'} @action=${() => this.aceitarTarefa(task.id)}>
              <Label>${this.msg.acceptTask}</Label>
            </grouptriggeraction--ml-split-button>
          ` : ''}
          <button type="button" class="min-h-11 rounded-lg border border-[var(--button-secondary-border,currentColor)] bg-[var(--button-secondary-bg,transparent)] px-3 text-sm font-semibold text-[var(--button-secondary-text,currentColor)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]" @click=${() => this.abrirTarefa(task.id)}>${this.msg.openTask}</button>
        </div>
        ${task.status === 'emRevisao' ? html`
          <div class="space-y-2 border-t border-[var(--border-subtle,currentColor)] pt-3">
            <label class="block text-sm font-medium text-[var(--text-default,currentColor)]" for="return-${task.id}">${this.msg.returnReason}</label>
            <textarea id="return-${task.id}" class="min-h-24 w-full rounded-lg border border-[var(--border-default,currentColor)] bg-[var(--input-bg,transparent)] p-3 text-[var(--text-default,currentColor)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]" placeholder="${this.msg.returnReasonPlaceholder}" .value=${this.devolverTarefaDraft.details.motivoDevolucao ?? ''} @input=${(e: Event) => this.setDevolverTarefaDraft({ id: task.id, version: task.version, details: { motivoDevolucao: (e.target as HTMLTextAreaElement).value || null } })}></textarea>
            <button type="button" class="min-h-11 rounded-lg bg-[var(--button-secondary-bg,transparent)] px-4 text-sm font-semibold text-[var(--button-secondary-text,currentColor)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)] disabled:opacity-50" ?disabled=${commandLoading} @click=${() => this.devolverTarefa(task.id)}>${this.msg.returnTask}</button>
          </div>
        ` : ''}
      </article>
    `;
  }

  renderPendingList(tasks: PendenciaTarefa[], emptyKey: keyof PageMessageType) {
    return html`
      <groupviewdata--ml-vertical-record-list .loading=${this.carregarInicioStatus === 'loading'} .hoverable=${true}>
        <Columns><Column field="tarefa" header="${this.msg.pendingHeading}"></Column></Columns>
        <Rows>${tasks.map((task) => html`<Row><Cell>${this.renderTaskCard(task)}</Cell></Row>`)}</Rows>
        <Empty><p class="py-8 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg[emptyKey]}</p></Empty>
        <Loading><p class="py-8 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.loading}</p></Loading>
      </groupviewdata--ml-vertical-record-list>
    `;
  }

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];
    const execute = this.pendencias.filter((task) => task.status === 'aFazer' || (task.status === 'emAndamento' && !task.details.devolvidaPendente));
    const review = this.pendencias.filter((task) => task.status === 'emRevisao');
    const resume = this.pendencias.filter((task) => task.status === 'emAndamento' && task.details.devolvidaPendente);
    return html`
      <main class="min-h-full bg-[var(--page-bg,transparent)] px-4 py-5 text-[var(--text-default,currentColor)]">
        <header class="mb-5 space-y-1">
          <h1 class="text-2xl font-bold text-[var(--text-strong,currentColor)]">${this.msg.pageTitle}</h1>
          <p class="text-sm text-[var(--text-muted,currentColor)]">${this.msg.pageIntro}</p>
        </header>
        ${this.pageStatus === 'error' ? html`
          <groupnotifyuser--ml-notify-banner type="error" .visible=${true} .dismissible=${false}>
            <Title>${this.msg.loadErrorTitle}</Title><Message>${this.msg.loadErrorMessage}</Message>
            <Action><button type="button" class="min-h-11 font-semibold underline" @click=${() => this.carregarInicio()}>${this.msg.reload}</button></Action>
          </groupnotifyuser--ml-notify-banner>
        ` : ''}
        <section class="mb-7" data-organism-id="alertasPrazo">
          <div class="mb-3 flex items-start justify-between gap-3"><div><h2 class="font-bold text-[var(--text-strong,currentColor)]">${this.msg.dueHeading}</h2><p class="text-sm text-[var(--text-muted,currentColor)]">${this.msg.dueSummary}</p></div></div>
          <groupviewdata--ml-vertical-record-list .loading=${this.carregarInicioStatus === 'loading'} .hoverable=${true} @row-click=${(e: CustomEvent<{ index: number; data: Element }>) => this.abrirTarefaVencendo(this.alertas[e.detail.index]?.id ?? null)}>
            <Columns><Column field="tarefa" header="${this.msg.dueHeading}"></Column></Columns>
            <Rows>${this.alertas.map((alert) => html`<Row><Cell><div class="flex min-h-11 items-center justify-between gap-3"><div><p class="font-semibold text-[var(--text-strong,currentColor)]">${alert.titulo}</p><p class="text-sm text-[var(--text-muted,currentColor)]">${formatDate(alert.prazo)} · ${this.msg[STATUS_KEY[alert.status]]}</p></div><span class="shrink-0 rounded-full bg-[var(--status-warning-bg,transparent)] px-2 py-1 text-xs font-semibold text-[var(--status-warning-text,currentColor)]">${dueLabel(alert, this.msg)}</span></div></Cell></Row>`)}</Rows>
            <Empty><p class="py-8 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.noDueTasks}</p></Empty>
            <Loading><p class="py-8 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.loading}</p></Loading>
          </groupviewdata--ml-vertical-record-list>
        </section>
        <section class="mb-7" data-organism-id="pendenciasAgora">
          <h2 class="mb-1 font-bold text-[var(--text-strong,currentColor)]">${this.msg.pendingHeading}</h2><p class="mb-3 text-sm text-[var(--text-muted,currentColor)]">${this.msg.pendingDescription}</p>
          <groupnavigatesection--ml-navigate-pills value="executar" .loading=${this.carregarInicioStatus === 'loading'}>
            <Tab value="executar" title="${this.msg.executeTab}">${this.renderPendingList(execute, 'noExecuteTasks')}</Tab>
            <Tab value="revisar" title="${this.msg.reviewTab}">${this.renderPendingList(review, 'noReviewTasks')}</Tab>
            <Tab value="retomar" title="${this.msg.resumeTab}">${this.renderPendingList(resume, 'noResumeTasks')}</Tab>
          </groupnavigatesection--ml-navigate-pills>
        </section>
        <section class="mb-7" data-organism-id="indicadoresTarefas">
          <div class="mb-3 flex items-center justify-between gap-3"><h2 class="font-bold text-[var(--text-strong,currentColor)]">${this.msg.overviewHeading}</h2><button type="button" class="min-h-11 text-sm font-semibold text-[var(--link-text,currentColor)] underline focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]" @click=${() => this.verMinhasTarefas()}>${this.msg.viewMyTasks}</button></div>
          <div class="grid grid-cols-2 gap-3">${this.renderMetric('openTasks', this.indicadores?.abertas)}${this.renderMetric('dueTodayMetric', this.indicadores?.vencemHoje)}${this.renderMetric('overdueMetric', this.indicadores?.atrasadas)}${this.renderMetric('returnedMetric', this.indicadores?.devolvidasPendentes)}</div>
        </section>
        <section data-organism-id="minhasPermissoes" class="rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-4">
          <h2 class="mb-3 font-bold text-[var(--text-strong,currentColor)]">${this.msg.permissionsHeading}</h2>
          ${this.permissoes ? html`<dl class="space-y-3 text-sm"><div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.member}</dt><dd class="font-medium">${this.permissoes.details.identification.name}</dd></div><div class="flex justify-between gap-3"><dt>${this.msg.acceptsTasks}</dt><dd class="font-semibold">${this.permissoes.details.tarefas.aceitaTarefasEfetivo ? this.msg.yes : this.msg.no}</dd></div><div class="flex justify-between gap-3"><dt>${this.msg.canCreateTasks}</dt><dd class="font-semibold">${this.permissoes.details.tarefas.podeCriarTarefasEfetivo ? this.msg.yes : this.msg.no}</dd></div></dl>` : html`<p class="text-sm text-[var(--text-muted,currentColor)]">${this.msg.noPermissions}</p>`}
        </section>
      </main>
    `;
  }
}
