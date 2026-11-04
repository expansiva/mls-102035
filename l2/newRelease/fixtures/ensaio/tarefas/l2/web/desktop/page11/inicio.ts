/// <mls fileReference="_102047_/l2/tarefas/web/desktop/page11/inicio.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { TarefasInicioShared } from '/_102047_/l2/tarefas/web/shared/inicio.js';
import '/_102040_/l2/molecules/groupnavigatesection/ml-navigate-pills.js';
import '/_102040_/l2/molecules/groupnotifyuser/ml-notify-banner.js';
import '/_102040_/l2/molecules/grouptriggeraction/ml-button-group.js';
import '/_102040_/l2/molecules/groupviewdata/ml-vertical-record-list.js';
import '/_102040_/l2/molecules/groupviewmetric/ml-metric-card.js';

function formatDate(value: string) {
  return new Intl.DateTimeFormat(document.documentElement.lang || undefined, {
    dateStyle: 'medium',
  }).format(new Date(`${value}T00:00:00`));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(document.documentElement.lang || undefined).format(value);
}

/// **collab_i18n_start**
const pageMessage_pt_br = {
  pageTitle: 'Tarefas',
  dailySummary: 'Resumo das 8h',
  dailySummaryMessage: 'Tarefas abertas que vencem hoje ou estão atrasadas.',
  dueTasks: 'Tarefas com prazo',
  task: 'Tarefa',
  dueDate: 'Prazo',
  situation: 'Situação',
  openTask: 'Abrir tarefa',
  noDueTasks: 'Nenhuma tarefa com prazo para abrir agora.',
  loading: 'Carregando tarefas…',
  dependsOnYou: 'O que depende de você agora',
  actionGuide: 'Escolha a próxima ação pela situação da tarefa.',
  execute: 'Executar',
  review: 'Revisar',
  resume: 'Retomar',
  taskTitle: 'Tarefa',
  priority: 'Prioridade',
  list: 'Lista',
  checklistProgress: 'Progresso da checklist',
  createdBy: 'Quem criou',
  assignee: 'Responsável',
  actionNow: 'Quem age agora',
  returnReason: 'Motivo da devolução',
  returnReasonPlaceholder: 'Explique o que precisa ser corrigido',
  startTask: 'Iniciar tarefa',
  sendForReview: 'Enviar para revisão',
  acceptTask: 'Aceitar tarefa',
  returnTask: 'Devolver tarefa',
  resumeTask: 'Retomar tarefa',
  noPendingTasks: 'Não há tarefas que dependam de você agora.',
  statusAFazer: 'A fazer',
  statusEmAndamento: 'Em andamento',
  statusEmRevisao: 'Em revisão',
  statusConcluida: 'Concluída',
  statusCancelada: 'Cancelada',
  priorityBaixa: 'Baixa',
  priorityMedia: 'Média',
  priorityAlta: 'Alta',
  today: 'Vence hoje',
  late: 'Atrasada',
  returnedAwaiting: 'Devolvida aguardando retomada',
  commandCompleted: 'A ação foi concluída.',
  taskOverview: 'Panorama das minhas tarefas',
  openTasks: 'Tarefas abertas',
  dueToday: 'Vencem hoje',
  lateTasks: 'Atrasadas',
  returnedTasks: 'Devolvidas aguardando retomada',
  viewMyTasks: 'Ver minhas tarefas',
  yourPermissions: 'Suas permissões',
  participant: 'Participante',
  acceptsTasks: 'Aceita tarefas',
  canCreateTasks: 'Pode criar tarefas',
  yes: 'Sim',
  no: 'Não',
  unavailable: 'Não disponível',
  pageEmpty: 'Não há tarefas pendentes nem alertas de prazo agora.',
  reload: 'Tentar novamente',
  missingContext: 'Não foi possível abrir este início porque faltam informações da sua sessão.',
  loadError: 'Não foi possível carregar suas tarefas.',
  commandError: 'Não foi possível concluir esta ação. Tente novamente.',
  backToTasks: 'Ir para minhas tarefas',
};
type PageMessageType = typeof pageMessage_pt_br;
const pageMessages: Record<string, PageMessageType> = { 'pt-br': pageMessage_pt_br };
/// **collab_i18n_end**

const STATUS_KEY: Record<'aFazer' | 'emAndamento' | 'emRevisao' | 'concluida' | 'cancelada', keyof PageMessageType> = {
  aFazer: 'statusAFazer',
  emAndamento: 'statusEmAndamento',
  emRevisao: 'statusEmRevisao',
  concluida: 'statusConcluida',
  cancelada: 'statusCancelada',
};

const PRIORITY_KEY: Record<'baixa' | 'media' | 'alta', keyof PageMessageType> = {
  baixa: 'priorityBaixa',
  media: 'priorityMedia',
  alta: 'priorityAlta',
};

@customElement('tarefas--web--desktop--page11--inicio-102047')
export class TarefasDesktopPage11InicioPage extends TarefasInicioShared {
  private msg: PageMessageType = pageMessage_pt_br;

  renderPendingTasks() {
    const loading = this.carregarInicioStatus === 'loading';
    return html`
      <section data-organism-id="pendenciasAgora" class="rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-5">
        <groupnavigatesection--ml-navigate-pills
          .value=${null}
          .loading=${loading}
          @change=${() => undefined}>
          <Label>${this.msg.actionGuide}</Label>
          <Tab value="execute" title=${this.msg.execute}>
            <groupviewdata--ml-vertical-record-list
              .loading=${loading}
              .hoverable=${true}
              @row-click=${(e: CustomEvent<{ index: number }>) => {
                const task = this.pendencias[e.detail.index];
                this.abrirTarefa(task ? task.id : null);
              }}>
              <Columns>
                <Column field="task" header=${this.msg.taskTitle}></Column>
                <Column field="details" header=${this.msg.checklistProgress}></Column>
                <Column field="actions" header=${this.msg.actionNow}></Column>
              </Columns>
              <Rows>
                ${this.pendencias.map((task) => html`
                  <Row>
                    <Cell>
                      <div class="flex min-w-0 flex-col gap-1">
                        <span class="font-semibold text-[var(--text-strong,currentColor)]">${task.titulo}</span>
                        <span class="text-sm text-[var(--text-muted,currentColor)]">${this.msg.list}: ${task.listaTarefas.nome}</span>
                        <div class="flex flex-wrap gap-2 text-xs text-[var(--text-muted,currentColor)]">
                          <span>${this.msg.situation}: ${this.msg[STATUS_KEY[task.status]]}</span>
                          <span>${this.msg.priority}: ${this.msg[PRIORITY_KEY[task.prioridade]]}</span>
                          ${task.prazo ? html`<span>${this.msg.dueDate}: ${formatDate(task.prazo)}</span>` : ''}
                          ${task.details.venceHoje ? html`<span class="font-medium text-[var(--status-warning-text,currentColor)]">${this.msg.today}</span>` : ''}
                          ${task.details.atrasada ? html`<span class="font-medium text-[var(--status-error-text,currentColor)]">${this.msg.late}</span>` : ''}
                        </div>
                      </div>
                    </Cell>
                    <Cell><span class="text-sm text-[var(--text-default,currentColor)]">${task.details.progressoChecklist}</span></Cell>
                    <Cell>
                      <div class="flex min-w-[250px] flex-col items-start gap-2" @click=${(event: Event) => event.stopPropagation()}>
                        <span class="text-sm text-[var(--text-muted,currentColor)]">${this.msg.actionNow}: ${task.details.quemAgeAgora ?? this.msg.unavailable}</span>
                        ${task.status === 'aFazer' ? html`
                          <grouptriggeraction--ml-button-group data-variant="primary" size="sm" type="button" .loading=${this.iniciarTarefaStatus === 'loading'} @action=${() => this.iniciarTarefa(task.id)}>
                            <Label>${this.msg.startTask}</Label>
                          </grouptriggeraction--ml-button-group>
                          ${this.iniciarTarefaError ? html`<p class="text-sm text-[var(--status-error-text,currentColor)]" aria-live="polite">${this.iniciarTarefaError.message || this.msg.commandError}</p>` : ''}
                          ${this.iniciarTarefaStatus === 'success' ? html`<p class="text-sm text-[var(--status-success-text,currentColor)]" aria-live="polite">${this.msg.commandCompleted}</p>` : ''}
                        ` : ''}
                        ${task.status === 'emAndamento' && !task.details.devolvidaPendente ? html`
                          <grouptriggeraction--ml-button-group data-variant="primary" size="sm" type="button" .loading=${this.enviarRevisaoStatus === 'loading'} @action=${() => this.enviarRevisao(task.id)}>
                            <Label>${this.msg.sendForReview}</Label>
                          </grouptriggeraction--ml-button-group>
                          ${this.enviarRevisaoError ? html`<p class="text-sm text-[var(--status-error-text,currentColor)]" aria-live="polite">${this.enviarRevisaoError.message || this.msg.commandError}</p>` : ''}
                          ${this.enviarRevisaoStatus === 'success' ? html`<p class="text-sm text-[var(--status-success-text,currentColor)]" aria-live="polite">${this.msg.commandCompleted}</p>` : ''}
                        ` : ''}
                        ${task.status === 'emAndamento' && task.details.devolvidaPendente ? html`
                          <span class="font-medium text-sm text-[var(--status-warning-text,currentColor)]">${this.msg.returnedAwaiting}</span>
                          ${task.details.motivoDevolucao ? html`<p class="max-w-xs text-sm text-[var(--text-default,currentColor)]"><span class="font-medium">${this.msg.returnReason}:</span> ${task.details.motivoDevolucao}</p>` : ''}
                          <grouptriggeraction--ml-button-group data-variant="primary" size="sm" type="button" .loading=${this.retomarTarefaStatus === 'loading'} @action=${() => this.retomarTarefa(task.id)}>
                            <Label>${this.msg.resumeTask}</Label>
                          </grouptriggeraction--ml-button-group>
                          ${this.retomarTarefaError ? html`<p class="text-sm text-[var(--status-error-text,currentColor)]" aria-live="polite">${this.retomarTarefaError.message || this.msg.commandError}</p>` : ''}
                          ${this.retomarTarefaStatus === 'success' ? html`<p class="text-sm text-[var(--status-success-text,currentColor)]" aria-live="polite">${this.msg.commandCompleted}</p>` : ''}
                        ` : ''}
                        ${task.status === 'emRevisao' ? html`
                          <div class="flex flex-wrap gap-2">
                            <grouptriggeraction--ml-button-group data-variant="primary" size="sm" type="button" .loading=${this.aceitarTarefaStatus === 'loading'} @action=${() => this.aceitarTarefa(task.id)}>
                              <Label>${this.msg.acceptTask}</Label>
                            </grouptriggeraction--ml-button-group>
                            <grouptriggeraction--ml-button-group data-variant="secondary" size="sm" type="button" .loading=${this.devolverTarefaStatus === 'loading'} @action=${() => {
                              this.setDevolverTarefaDraft({ id: task.id, version: task.version, details: { motivoDevolucao: this.devolverTarefaDraft.details.motivoDevolucao } });
                              this.devolverTarefa(task.id);
                            }}>
                              <Label>${this.msg.returnTask}</Label>
                            </grouptriggeraction--ml-button-group>
                          </div>
                          <label class="flex w-full flex-col gap-1 text-sm font-medium text-[var(--text-default,currentColor)]">
                            ${this.msg.returnReason}
                            <input
                              class="min-h-10 rounded-md border border-[var(--border-default,currentColor)] bg-[var(--input-bg,transparent)] px-3 text-[var(--text-strong,currentColor)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]"
                              placeholder=${this.msg.returnReasonPlaceholder}
                              .value=${this.devolverTarefaDraft.id === task.id ? (this.devolverTarefaDraft.details.motivoDevolucao ?? '') : ''}
                              @input=${(e: Event) => this.setDevolverTarefaDraft({ id: task.id, version: task.version, details: { motivoDevolucao: (e.target as HTMLInputElement).value || null } })}>
                          </label>
                          ${this.aceitarTarefaError ? html`<p class="text-sm text-[var(--status-error-text,currentColor)]" aria-live="polite">${this.aceitarTarefaError.message || this.msg.commandError}</p>` : ''}
                          ${this.devolverTarefaError ? html`<p class="text-sm text-[var(--status-error-text,currentColor)]" aria-live="polite">${this.devolverTarefaError.message || this.msg.commandError}</p>` : ''}
                          ${this.aceitarTarefaStatus === 'success' || this.devolverTarefaStatus === 'success' ? html`<p class="text-sm text-[var(--status-success-text,currentColor)]" aria-live="polite">${this.msg.commandCompleted}</p>` : ''}
                        ` : ''}
                      </div>
                    </Cell>
                  </Row>
                `)}
              </Rows>
              <Loading><p class="py-10 text-center text-[var(--text-muted,currentColor)]">${this.msg.loading}</p></Loading>
              <Empty><p class="py-10 text-center text-[var(--text-muted,currentColor)]">${this.msg.noPendingTasks}</p></Empty>
            </groupviewdata--ml-vertical-record-list>
          </Tab>
          <Tab value="review" title=${this.msg.review}><p class="px-1 py-3 text-sm text-[var(--text-muted,currentColor)]">${this.msg.actionGuide}</p></Tab>
          <Tab value="resume" title=${this.msg.resume}><p class="px-1 py-3 text-sm text-[var(--text-muted,currentColor)]">${this.msg.actionGuide}</p></Tab>
        </groupnavigatesection--ml-navigate-pills>
      </section>
    `;
  }

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];
    const loading = this.carregarInicioStatus === 'loading';
    const errorMessage = this.carregarInicioError?.code === 'client.preconditionMissing'
      ? this.msg.missingContext
      : (this.carregarInicioError?.message || this.msg.loadError);
    return html`
      <main class="min-h-full bg-[var(--page-bg,transparent)] px-8 py-7 text-[var(--text-default,currentColor)]">
        <header class="mx-auto mb-6 flex max-w-7xl items-center justify-between">
          <h1 class="text-2xl font-semibold tracking-tight text-[var(--text-strong,currentColor)]">${this.msg.pageTitle}</h1>
          <button type="button" class="min-h-10 rounded-md border border-[var(--button-secondary-border,currentColor)] bg-[var(--button-secondary-bg,transparent)] px-4 text-sm font-medium text-[var(--button-secondary-text,currentColor)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]" @click=${() => this.carregarInicio()} ?disabled=${loading} aria-busy=${loading}>${this.msg.reload}</button>
        </header>
        <div class="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_280px] gap-6">
          <div class="flex min-w-0 flex-col gap-5">
            ${this.carregarInicioError ? html`
              <groupnotifyuser--ml-notify-banner type="error" .visible=${true} .dismissible=${false}>
                <Title>${this.msg.loadError}</Title>
                <Message>${errorMessage}</Message>
                <Action><button type="button" @click=${() => this.verMinhasTarefas()}>${this.msg.backToTasks}</button></Action>
              </groupnotifyuser--ml-notify-banner>
            ` : ''}
            <section data-organism-id="alertasPrazo" class="rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-5">
              <groupnotifyuser--ml-notify-banner type="warning" .visible=${this.alertas.length > 0} .dismissible=${false}>
                <Title>${this.msg.dailySummary}</Title>
                <Message>${this.msg.dailySummaryMessage}</Message>
              </groupnotifyuser--ml-notify-banner>
              <div class="mt-4">
                <groupviewdata--ml-vertical-record-list .loading=${loading} .hoverable=${true} @row-click=${(e: CustomEvent<{ index: number }>) => { const alert = this.alertas[e.detail.index]; this.abrirTarefaVencendo(alert ? alert.id : null); }}>
                  <Columns><Column field="task" header=${this.msg.task}></Column><Column field="due" header=${this.msg.dueDate}></Column><Column field="status" header=${this.msg.situation}></Column></Columns>
                  <Rows>${this.alertas.map((alert) => html`<Row><Cell><span class="font-medium text-[var(--text-strong,currentColor)]">${alert.titulo}</span></Cell><Cell>${formatDate(alert.prazo)}</Cell><Cell>${this.msg[STATUS_KEY[alert.status]]}</Cell></Row>`)}</Rows>
                  <Loading><p class="py-8 text-center text-[var(--text-muted,currentColor)]">${this.msg.loading}</p></Loading>
                  <Empty><p class="py-8 text-center text-[var(--text-muted,currentColor)]">${this.msg.noDueTasks}</p></Empty>
                </groupviewdata--ml-vertical-record-list>
              </div>
            </section>
            ${this.pageStatus === 'empty' ? html`<p class="rounded-xl border border-[var(--border-subtle,currentColor)] bg-[var(--surface-alt-bg,transparent)] p-6 text-center text-[var(--text-muted,currentColor)]">${this.msg.pageEmpty}</p>` : ''}
            ${this.renderPendingTasks()}
          </div>
          <aside class="flex flex-col gap-5">
            <section data-organism-id="indicadoresTarefas" class="rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-4">
              <h2 class="mb-3 text-base font-semibold text-[var(--text-strong,currentColor)]">${this.msg.taskOverview}</h2>
              <div class="grid grid-cols-2 gap-3">
                <groupviewmetric--ml-metric-card .loading=${loading}><Label>${this.msg.openTasks}</Label><Value>${this.indicadores ? formatNumber(this.indicadores.abertas) : '—'}</Value></groupviewmetric--ml-metric-card>
                <groupviewmetric--ml-metric-card .loading=${loading}><Label>${this.msg.dueToday}</Label><Value>${this.indicadores ? formatNumber(this.indicadores.vencemHoje) : '—'}</Value></groupviewmetric--ml-metric-card>
                <groupviewmetric--ml-metric-card .loading=${loading}><Label>${this.msg.lateTasks}</Label><Value>${this.indicadores ? formatNumber(this.indicadores.atrasadas) : '—'}</Value></groupviewmetric--ml-metric-card>
                <groupviewmetric--ml-metric-card .loading=${loading}><Label>${this.msg.returnedTasks}</Label><Value>${this.indicadores ? formatNumber(this.indicadores.devolvidasPendentes) : '—'}</Value></groupviewmetric--ml-metric-card>
              </div>
              <button type="button" class="mt-4 min-h-10 w-full rounded-md border border-[var(--button-secondary-border,currentColor)] bg-[var(--button-secondary-bg,transparent)] px-3 text-sm font-medium text-[var(--button-secondary-text,currentColor)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]" @click=${() => this.verMinhasTarefas()}>${this.msg.viewMyTasks}</button>
            </section>
            <section data-organism-id="minhasPermissoes" class="rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-alt-bg,transparent)] p-4">
              <h2 class="mb-3 text-base font-semibold text-[var(--text-strong,currentColor)]">${this.msg.yourPermissions}</h2>
              <dl class="space-y-3 text-sm"><div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.participant}</dt><dd class="font-medium text-[var(--text-strong,currentColor)]">${this.permissoes?.details.identification.name ?? this.msg.unavailable}</dd></div><div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.acceptsTasks}</dt><dd class="font-medium text-[var(--text-strong,currentColor)]">${this.permissoes ? (this.permissoes.details.tarefas.aceitaTarefasEfetivo ? this.msg.yes : this.msg.no) : this.msg.unavailable}</dd></div><div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.canCreateTasks}</dt><dd class="font-medium text-[var(--text-strong,currentColor)]">${this.permissoes ? (this.permissoes.details.tarefas.podeCriarTarefasEfetivo ? this.msg.yes : this.msg.no) : this.msg.unavailable}</dd></div></dl>
            </section>
          </aside>
        </div>
      </main>
    `;
  }
}
