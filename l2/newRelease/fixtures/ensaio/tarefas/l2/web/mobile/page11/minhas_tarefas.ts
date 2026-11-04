/// <mls fileReference="_102047_/l2/tarefas/web/mobile/page11/minhas_tarefas.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { TarefasMinhas_tarefasShared } from '/_102047_/l2/tarefas/web/shared/minhas_tarefas.js';
import '/_102020_/l2/molecules/ml-scenary.js';
import '/_102040_/l2/molecules/groupnavigatesection/ml-navigate-pills.js';
import '/_102040_/l2/molecules/groupviewtable/ml-responsive-table.js';
import '/_102040_/l2/molecules/groupviewcard/ml-vertical-card.js';
import '/_102040_/l2/molecules/groupnotifyuser/ml-notify-banner.js';
import '/_102040_/l2/molecules/groupentertext/ml-floating-text-input.js';
import '/_102040_/l2/molecules/groupentertext/ml-multiline-text.js';
import '/_102040_/l2/molecules/groupentertext/ml-tag-input.js';
import '/_102040_/l2/molecules/groupenterdate/ml-date-shortcut-picker.js';
import '/_102040_/l2/molecules/groupselectone/ml-select-one-autocomplete.js';
import '/_102040_/l2/molecules/groupselectone/ml-segmented-control.js';
import '/_102040_/l2/molecules/groupselectone/ml-select.js';
import '/_102040_/l2/molecules/grouptriggeraction/ml-button-standard.js';
import '/_102040_/l2/molecules/grouptriggeraction/ml-kebab-action-trigger.js';
import '/_102040_/l2/molecules/groupviewdata/ml-timeline-view.js';

function dateOnly(value: string | undefined) {
  return value ? new Intl.DateTimeFormat(document.documentElement.lang || undefined, { dateStyle: 'short' }).format(new Date(`${value}T12:00:00`)) : '—';
}
function dateTime(value: string) {
  return new Intl.DateTimeFormat(document.documentElement.lang || undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
type TaskStatus = 'aFazer' | 'emAndamento' | 'emRevisao' | 'concluida' | 'cancelada';
type Priority = 'baixa' | 'media' | 'alta';
const STATUS_KEY: Record<TaskStatus, keyof PageMessageType> = { aFazer: 'statusAFazer', emAndamento: 'statusEmAndamento', emRevisao: 'statusEmRevisao', concluida: 'statusConcluida', cancelada: 'statusCancelada' };
const PRIORITY_KEY: Record<Priority, keyof PageMessageType> = { baixa: 'prioridadeBaixa', media: 'prioridadeMedia', alta: 'prioridadeAlta' };

/// **collab_i18n_start**
const pageMessage_pt_br = {
  pageTitle: 'Minhas tarefas', back: 'Voltar', newTask: 'Nova tarefa', dependeDeMim: 'Depende de mim', responsavel: 'Responsável', criadas: 'Criadas',
  dependeCount: 'dependem de mim', responsavelCount: 'sob minha responsabilidade', criadasCount: 'criadas por mim', dueTodayCount: 'vencem hoje', lateCount: 'atrasadas',
  task: 'Tarefa', dueDate: 'Prazo', priority: 'Prioridade', list: 'Lista', whoActs: 'Quem age agora', checklistProgress: 'Progresso da checklist',
  dueToday: 'Vence hoje', overdue: 'Atrasada', returned: 'Devolvida', statusAFazer: 'A fazer', statusEmAndamento: 'Em andamento', statusEmRevisao: 'Em revisão', statusConcluida: 'Concluída', statusCancelada: 'Cancelada',
  prioridadeBaixa: 'Baixa', prioridadeMedia: 'Média', prioridadeAlta: 'Alta', openTask: 'Abrir tarefa', loadingTasks: 'Carregando tarefas', noTasks: 'Nenhuma tarefa neste recorte.', loadError: 'Não foi possível carregar as tarefas.', missingContext: 'Falta o contexto necessário para abrir estas tarefas.', backToTasks: 'Voltar às tarefas', retry: 'Tentar novamente', loadMore: 'Carregar mais',
  taskDetails: 'Detalhes da tarefa', returnReason: 'Motivo da devolução', createdBy: 'Quem criou', createdAt: 'Criada em', description: 'Descrição', labels: 'Etiquetas', subtasks: 'Subtarefas', parentTask: 'Tarefa pai', checklist: 'Checklist', completed: 'Concluído', completedAt: 'Concluído em', noChecklist: 'Ainda não há itens na checklist.',
  actions: 'Ações', start: 'Iniciar tarefa', sendReview: 'Enviar para revisão', accept: 'Aceitar entrega', returnTask: 'Devolver tarefa', resume: 'Retomar tarefa', cancel: 'Cancelar tarefa', editTask: 'Ajustar tarefa', returnReasonPlaceholder: 'Explique o que precisa ser corrigido', actionError: 'Não foi possível concluir esta ação.', actionSuccess: 'Ação concluída.', cancelConfirm: 'Cancelar esta tarefa?',
  history: 'Histórico', event: 'Evento', when: 'Quando', person: 'Responsável', noHistory: 'Ainda não há eventos.',
  newTaskTitle: 'Nova tarefa', editTaskTitle: 'Ajustar tarefa', title: 'Título', titlePlaceholder: 'Descreva a tarefa', descriptionPlaceholder: 'Descreva o que deve ser feito', labelsPlaceholder: 'Adicione etiquetas', datePlaceholder: 'Escolha uma data', choosePriority: 'Escolha a prioridade', chooseList: 'Escolha uma lista', chooseResponsible: 'Escolha pelo nome', noPeople: 'Nenhum responsável disponível.', noLists: 'Nenhuma lista disponível.', saveTask: 'Salvar alterações', createTask: 'Registrar tarefa', saving: 'Salvando', createError: 'Não foi possível registrar a tarefa.', saveError: 'Não foi possível salvar as alterações.', titleRequired: 'Informe o título da tarefa.',
  addChecklist: 'Adicionar item', newChecklistItem: 'Novo item da checklist', itemPlaceholder: 'Descreva o item', saveChecklist: 'Salvar checklist', checklistError: 'Não foi possível salvar a checklist.', editingChecklist: 'Ajustar checklist', noTask: 'A tarefa não está disponível.',
  status: 'Situação', empty: '—'
};
type PageMessageType = typeof pageMessage_pt_br;
const pageMessages: Record<string, PageMessageType> = { 'pt-br': pageMessage_pt_br };
/// **collab_i18n_end**

@customElement('tarefas--web--mobile--page11--minhas_tarefas-102047')
export class TarefasMobilePage11Minhas_tarefasPage extends TarefasMinhas_tarefasShared {
  private msg: PageMessageType = pageMessage_pt_br;

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];
    return html`
      <main class="min-h-full bg-[var(--page-bg,transparent)] text-[var(--text-default,currentColor)]">
        <molecules--ml-scenary-102020 mode="scenary" .value=${this.scenary || (this.selectedTarefa !== null ? 'detalhe' : 'lista')} .backLabel=${this.msg.back}
          @change=${(e: CustomEvent<{ value: string }>) => { if (e.target === e.currentTarget) { this.setScenario(e.detail.value); if (e.detail.value === 'lista') this.qryTarefa(null); } }}>
          <Scene value="lista" title=${this.msg.pageTitle}>${this.renderList()}</Scene>
          <Scene value="detalhe" title=${this.msg.taskDetails} nav="back" backTo="lista">${this.renderDetail()}</Scene>
          <Scene value="criar" title=${this.msg.newTaskTitle} nav="back" backTo="lista">${this.renderCreate()}</Scene>
          <Scene value="editar" title=${this.msg.editTaskTitle} nav="back" backTo="detalhe">${this.renderEdit()}</Scene>
        </molecules--ml-scenary-102020>
      </main>`;
  }

  private renderList() {
    const tasks = this.tarefas?.items ?? [];
    const error = this.qryMinhasTarefasError ?? this.qryTarefasDoGrupoError;
    return html`<section data-organism-id="tarefasLista" class="mx-auto w-full max-w-[430px] px-4 pb-8 pt-4">
      <div class="mb-4 flex items-start justify-between gap-3">
        <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[var(--text-muted,currentColor)]">
          <span>${this.quantidadeDependeDeMim} ${this.msg.dependeCount}</span><span>${this.quantidadeResponsavel} ${this.msg.responsavelCount}</span>
          <span>${this.quantidadeCriadas} ${this.msg.criadasCount}</span><span>${this.quantidadeVenceHoje} ${this.msg.dueTodayCount}</span>
          <span class="text-[var(--status-error-text,currentColor)]">${this.quantidadeAtrasadas} ${this.msg.lateCount}</span>
        </div>
        ${this.podeCriarTarefasEfetivo ? html`<grouptriggeraction--ml-button-standard size="sm" data-variant="primary" @action=${() => { this.qryResponsaveis(); this.qryListas(); this.setScenario('criar'); }}><Label>${this.msg.newTask}</Label></grouptriggeraction--ml-button-standard>` : ''}
      </div>
      ${error ? html`<div class="mb-3 rounded-lg border border-[var(--border-default,currentColor)] bg-[var(--surface-alt-bg,transparent)] p-3" aria-live="polite"><p class="text-sm">${error.code === 'client.preconditionMissing' ? this.msg.missingContext : this.msg.loadError}</p><grouptriggeraction--ml-button-standard class="mt-2" size="sm" data-variant="secondary" @action=${() => this.qryMinhasTarefas()}><Label>${error.code === 'client.preconditionMissing' ? this.msg.backToTasks : this.msg.retry}</Label></grouptriggeraction--ml-button-standard></div>` : ''}
      <groupnavigatesection--ml-navigate-pills .value=${this.grupoTarefas} .loading=${this.qryTarefasDoGrupoStatus === 'loading'}
        @change=${(e: CustomEvent<{ value: string }>) => { const group = e.detail.value as 'responsavel' | 'criadas' | 'dependeDeMim'; this.qryTarefasDoGrupo(group); }}>
        <Tab value="dependeDeMim" title=${this.msg.dependeDeMim}>${this.renderTaskTable(tasks)}</Tab>
        <Tab value="responsavel" title=${this.msg.responsavel}>${this.renderTaskTable(tasks)}</Tab>
        <Tab value="criadas" title=${this.msg.criadas}>${this.renderTaskTable(tasks)}</Tab>
      </groupnavigatesection--ml-navigate-pills>
    </section>`;
  }

  private renderTaskTable(tasks: NonNullable<typeof this.tarefas>['items']) {
    return html`<groupviewtable--ml-responsive-table .value=${tasks.findIndex((task) => task.id === this.selectedTarefa) >= 0 ? String(tasks.findIndex((task) => task.id === this.selectedTarefa)) : ''} .loading=${this.pageStatus === 'loading'}
      @rowClick=${(e: CustomEvent<{ index: number }>) => { const task = tasks[e.detail.index]; if (task) { this.qryTarefa(task.id); this.setScenario('detalhe'); } }}>
      <TableHeader><TableRow><TableHead key="tarefa">${this.msg.task}</TableHead><TableHead key="prazo">${this.msg.dueDate}</TableHead><TableHead key="situacao">${this.msg.status}</TableHead></TableRow></TableHeader>
      <TableBody>${tasks.map((task) => html`<TableRow key=${task.id}>
        <TableCell><div class="font-semibold text-[var(--text-strong,currentColor)]">${task.titulo}</div><div class="mt-1 flex flex-wrap gap-1 text-xs text-[var(--text-muted,currentColor)]"><span>${task.listaTarefas.nome}</span><span>·</span><span>${task.responsavel.details.identification.name}</span>${task.quemAgeAgoraNome ? html`<span>· ${this.msg.whoActs}: ${task.quemAgeAgoraNome}</span>` : ''}</div></TableCell>
        <TableCell sort-value=${task.prazo ?? ''}><span class=${task.details.atrasada ? 'font-semibold text-[var(--status-error-text,currentColor)]' : ''}>${dateOnly(task.prazo)}</span>${task.details.venceHoje ? html`<div class="mt-1 text-xs text-[var(--status-warning-text,currentColor)]">${this.msg.dueToday}</div>` : ''}</TableCell>
        <TableCell><span class="rounded-full bg-[var(--status-neutral-bg,transparent)] px-2 py-1 text-xs text-[var(--status-neutral-text,currentColor)]">${this.msg[STATUS_KEY[task.status]]}</span><div class="mt-2 text-xs text-[var(--text-muted,currentColor)]">${this.msg.checklistProgress}: ${task.details.progressoChecklist}</div>${task.details.devolvidaPendente ? html`<div class="mt-1 text-xs text-[var(--status-warning-text,currentColor)]">${this.msg.returned}</div>` : ''}</TableCell>
      </TableRow>`)}</TableBody>
      <Empty><p class="py-10 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.noTasks}</p></Empty><Loading><p class="py-10 text-center text-sm">${this.msg.loadingTasks}</p></Loading>
    </groupviewtable--ml-responsive-table>
    ${this.tarefas?.hasMore ? html`<grouptriggeraction--ml-button-standard class="mt-4" size="md" data-variant="secondary" @action=${() => this.qryTarefasDoGrupo(this.grupoTarefas, (this.tarefas?.page ?? 1) + 1, true)}><Label>${this.msg.loadMore}</Label></grouptriggeraction--ml-button-standard>` : ''}`;
  }

  private renderDetail() {
    const task = this.tarefa;
    if (!task) return html`<section data-organism-id="tarefaDetalhe" class="p-4"><p>${this.msg.noTask}</p></section>`;
    return html`<div class="mx-auto w-full max-w-[430px] space-y-5 px-4 pb-8 pt-4">
      <section data-organism-id="tarefaDetalhe">${task.details.motivoDevolucao ? html`<groupnotifyuser--ml-notify-banner type="warning" .visible=${true} .dismissible=${false}><Title>${this.msg.returnReason}</Title><Message>${task.details.motivoDevolucao}</Message></groupnotifyuser--ml-notify-banner>` : ''}
        <groupviewcard--ml-vertical-card><CardHeader><CardTitle>${task.titulo}</CardTitle><CardDescription>${this.msg[STATUS_KEY[task.status]]}</CardDescription></CardHeader><CardContent>
          <dl class="grid grid-cols-2 gap-x-3 gap-y-4 text-sm"><div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.responsavel}</dt><dd>${task.responsavel.details.identification.name}</dd></div><div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.createdBy}</dt><dd>${task.criador.details.identification.name}</dd></div><div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.dueDate}</dt><dd>${dateOnly(task.prazo)}</dd></div><div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.priority}</dt><dd>${this.msg[PRIORITY_KEY[task.prioridade]]}</dd></div><div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.list}</dt><dd>${task.listaTarefas.nome}</dd></div><div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.createdAt}</dt><dd>${dateTime(task.criadaEm)}</dd></div><div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.subtasks}</dt><dd>${task.details.quantidadeSubtarefas}</dd></div>${task.tarefaPai ? html`<div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.parentTask}</dt><dd>${task.tarefaPai.titulo}</dd></div>` : ''}</dl>
          <div class="mt-4 border-t border-[var(--border-subtle,currentColor)] pt-4"><p class="text-xs text-[var(--text-muted,currentColor)]">${this.msg.description}</p><p class="mt-1 whitespace-pre-wrap">${task.details.descricao ?? this.msg.empty}</p><p class="mt-3 text-xs text-[var(--text-muted,currentColor)]">${this.msg.labels}</p><p class="mt-1">${task.details.etiquetas ?? this.msg.empty}</p></div>
        </CardContent></groupviewcard--ml-vertical-card>
        <div class="mt-5"><h2 class="text-base font-semibold text-[var(--text-strong,currentColor)]">${this.msg.checklist}</h2><ul class="mt-2 divide-y divide-[var(--border-subtle,currentColor)]">${task.itens.map((item) => html`<li class="flex items-start gap-3 py-3"><span class=${item.details.concluido ? 'text-[var(--status-success-text,currentColor)]' : 'text-[var(--text-muted,currentColor)]'}>${item.details.concluido ? '✓' : '○'}</span><div><p class=${item.details.concluido ? 'line-through text-[var(--text-muted,currentColor)]' : ''}>${item.details.descricao}</p>${item.details.concluidoEm ? html`<p class="text-xs text-[var(--text-muted,currentColor)]">${this.msg.completedAt}: ${dateTime(item.details.concluidoEm)}</p>` : ''}</div></li>`)}</ul>${task.itens.length === 0 ? html`<p class="py-4 text-sm text-[var(--text-muted,currentColor)]">${this.msg.noChecklist}</p>` : ''}</div>
      </section>
      ${this.renderActions(task)}
      <section data-organism-id="tarefaHistorico"><h2 class="text-base font-semibold text-[var(--text-strong,currentColor)]">${this.msg.history}</h2><groupviewdata--ml-timeline-view class="mt-3" .loading=${this.qryTarefaStatus === 'loading'}><Columns><Column field="evento" header=${this.msg.event}></Column><Column field="quando" header=${this.msg.when}></Column></Columns><Rows>${this.historico.map((event) => html`<Row><Cell><p>${event.tipo}</p>${event.status ? html`<p class="text-xs text-[var(--text-muted,currentColor)]">${this.msg[STATUS_KEY[event.status]]}</p>` : ''}${event.details.motivoDevolucao ? html`<p class="text-xs">${event.details.motivoDevolucao}</p>` : ''}</Cell><Cell><p>${dateTime(event.momento)}</p>${event.responsavelNome ? html`<p class="text-xs text-[var(--text-muted,currentColor)]">${event.responsavelNome}</p>` : ''}</Cell></Row>`)}</Rows><Empty><p class="py-5 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.noHistory}</p></Empty></groupviewdata--ml-timeline-view></section>
    </div>`;
  }

  private renderActions(task: NonNullable<typeof this.tarefa>) {
    const busy = this.cmdIniciarStatus === 'loading' || this.cmdEnviarParaRevisaoStatus === 'loading' || this.cmdAceitarStatus === 'loading' || this.cmdDevolverStatus === 'loading' || this.cmdRetomarStatus === 'loading' || this.cmdCancelarStatus === 'loading';
    const error = this.cmdIniciarError ?? this.cmdEnviarParaRevisaoError ?? this.cmdAceitarError ?? this.cmdDevolverError ?? this.cmdRetomarError ?? this.cmdCancelarError;
    return html`<section data-organism-id="tarefaAcoes" class="rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-4"><h2 class="text-base font-semibold text-[var(--text-strong,currentColor)]">${this.msg.actions}</h2>${error ? html`<p class="mt-2 text-sm text-[var(--status-error-text,currentColor)]" aria-live="polite">${this.msg.actionError}</p>` : ''}
      <div class="mt-3 space-y-3">
      ${task.souResponsavel && task.status === 'aFazer' ? html`<grouptriggeraction--ml-button-standard class="w-full" size="lg" data-variant="primary" .loading=${this.cmdIniciarStatus === 'loading'} @action=${() => this.cmdIniciar()}><Label>${this.msg.start}</Label></grouptriggeraction--ml-button-standard>` : ''}
      ${task.souResponsavel && task.status === 'emAndamento' && task.details.devolvidaPendente ? html`<grouptriggeraction--ml-button-standard class="w-full" size="lg" data-variant="primary" .loading=${this.cmdRetomarStatus === 'loading'} @action=${() => this.cmdRetomar()}><Label>${this.msg.resume}</Label></grouptriggeraction--ml-button-standard>` : ''}
      ${task.souResponsavel && task.status === 'emAndamento' && !task.details.devolvidaPendente ? html`<grouptriggeraction--ml-button-standard class="w-full" size="lg" data-variant="primary" .loading=${this.cmdEnviarParaRevisaoStatus === 'loading'} @action=${() => this.cmdEnviarParaRevisao()}><Label>${this.msg.sendReview}</Label></grouptriggeraction--ml-button-standard>` : ''}
      ${task.souCriador && task.status === 'emRevisao' ? html`<grouptriggeraction--ml-button-standard class="w-full" size="lg" data-variant="primary" .loading=${this.cmdAceitarStatus === 'loading'} @action=${() => this.cmdAceitar()}><Label>${this.msg.accept}</Label></grouptriggeraction--ml-button-standard><groupentertext--ml-multiline-text .value=${this.cmdDevolverDraft.details.motivoDevolucao ?? ''} name="motivo" rows="3" .placeholder=${this.msg.returnReasonPlaceholder} @input=${(e: CustomEvent<{ value: string }>) => this.setCmdDevolverDraft({ details: { motivoDevolucao: e.detail.value || null } })}><Label>${this.msg.returnReason}</Label></groupentertext--ml-multiline-text><grouptriggeraction--ml-button-standard class="w-full" size="lg" data-variant="secondary" .disabled=${!(this.cmdDevolverDraft.details.motivoDevolucao)} .loading=${this.cmdDevolverStatus === 'loading'} @action=${() => this.cmdDevolver()}><Label>${this.msg.returnTask}</Label></grouptriggeraction--ml-button-standard>` : ''}
      ${task.details.aberta ? html`<grouptriggeraction--ml-button-standard class="w-full" size="md" data-variant="secondary" .disabled=${busy} @action=${() => { this.qryResponsaveis(); this.qryListas(); this.setScenario('editar'); }}><Label>${this.msg.editTask}</Label></grouptriggeraction--ml-button-standard>` : ''}
      ${task.souCriador && task.details.aberta ? html`<grouptriggeraction--ml-kebab-action-trigger size="md" data-variant="danger" .loading=${this.cmdCancelarStatus === 'loading'} @action=${() => { if (window.confirm(this.msg.cancelConfirm)) this.cmdCancelar(); }}><Label>${this.msg.cancel}</Label></grouptriggeraction--ml-kebab-action-trigger>` : ''}
      </div></section>`;
  }

  private renderCreate() {
    const draft = this.cmdCriarTarefaDraft;
    const saving = this.cmdCriarTarefaStatus === 'loading';
    return html`<section data-organism-id="tarefaForm" class="mx-auto w-full max-w-[430px] space-y-4 px-4 pb-8 pt-4">${this.renderFields(draft, (value) => this.setCmdCriarTarefaDraft(value), saving)}${this.renderNewChecklist(saving)}${this.cmdCriarTarefaError ? html`<p class="text-sm text-[var(--status-error-text,currentColor)]" aria-live="polite">${this.msg.createError}</p>` : ''}<grouptriggeraction--ml-button-standard class="w-full" size="lg" data-variant="primary" .disabled=${!draft.titulo} .loading=${saving} @action=${() => this.cmdCriarTarefa().then(() => { this.qryMinhasTarefas(); this.qryTarefa(null); this.setScenario('lista'); })}><Label>${this.msg.createTask}</Label></grouptriggeraction--ml-button-standard></section>`;
  }

  private renderEdit() {
    const draft = this.cmdSalvarAlteracoesDraft;
    const saving = this.cmdSalvarAlteracoesStatus === 'loading';
    const task = this.tarefa;
    return html`<section data-organism-id="tarefaForm" class="mx-auto w-full max-w-[430px] space-y-4 px-4 pb-8 pt-4">${this.renderFields(draft, (value) => this.setCmdSalvarAlteracoesDraft(value), saving)}${task?.details.aberta ? this.renderExistingChecklist(task, saving) : ''}${this.cmdSalvarAlteracoesError ? html`<p class="text-sm text-[var(--status-error-text,currentColor)]" aria-live="polite">${this.msg.saveError}</p>` : ''}<grouptriggeraction--ml-button-standard class="w-full" size="lg" data-variant="primary" .disabled=${!draft.titulo} .loading=${saving} @action=${() => this.cmdSalvarAlteracoes().then(() => this.setScenario('detalhe'))}><Label>${this.msg.saveTask}</Label></grouptriggeraction--ml-button-standard></section>`;
  }

  private renderFields(draft: typeof this.cmdCriarTarefaDraft, setDraft: (value: typeof this.cmdCriarTarefaDraft) => void, saving: boolean) {
    return html`<groupentertext--ml-floating-text-input .value=${draft.titulo ?? ''} name="titulo" .required=${true} .error=${draft.titulo ? '' : this.msg.titleRequired} .placeholder=${this.msg.titlePlaceholder} .disabled=${saving} @input=${(e: CustomEvent<{ value: string }>) => setDraft({ ...draft, titulo: e.detail.value || null })}><Label>${this.msg.title}</Label></groupentertext--ml-floating-text-input>
      <groupentertext--ml-multiline-text .value=${draft.details.descricao ?? ''} name="descricao" rows="4" .placeholder=${this.msg.descriptionPlaceholder} .disabled=${saving} @input=${(e: CustomEvent<{ value: string }>) => setDraft({ ...draft, details: { ...draft.details, descricao: e.detail.value || null } })}><Label>${this.msg.description}</Label></groupentertext--ml-multiline-text>
      <groupselectone--ml-segmented-control .value=${draft.prioridade} name="prioridade" .placeholder=${this.msg.choosePriority} .disabled=${saving} @change=${(e: CustomEvent<{ value: string | null }>) => setDraft({ ...draft, prioridade: e.detail.value as Priority | null })}><Label>${this.msg.priority}</Label><Item value="baixa">${this.msg.prioridadeBaixa}</Item><Item value="media">${this.msg.prioridadeMedia}</Item><Item value="alta">${this.msg.prioridadeAlta}</Item></groupselectone--ml-segmented-control>
      <groupenterdate--ml-date-shortcut-picker .value=${draft.prazo} name="prazo" locale="pt-BR" .placeholder=${this.msg.datePlaceholder} .disabled=${saving} @change=${(e: CustomEvent<{ value: string | null }>) => setDraft({ ...draft, prazo: e.detail.value })}><Label>${this.msg.dueDate}</Label></groupenterdate--ml-date-shortcut-picker>
      <groupselectone--ml-select .value=${draft.listaId} name="lista" .placeholder=${this.msg.chooseList} .loading=${this.qryListasStatus === 'loading'} .disabled=${saving} @focus=${() => this.qryListas()} @change=${(e: CustomEvent<{ value: string | null }>) => setDraft({ ...draft, listaId: e.detail.value })}><Label>${this.msg.list}</Label>${this.listas.map((list) => html`<Item value=${list.id}>${list.nome}</Item>`)}<Empty>${this.msg.noLists}</Empty></groupselectone--ml-select>
      <groupselectone--ml-select-one-autocomplete .value=${draft.responsavelId} name="responsavel" .placeholder=${this.msg.chooseResponsible} .searchable=${true} .loading=${this.qryResponsaveisStatus === 'loading'} .disabled=${saving} @focus=${() => this.qryResponsaveis()} @change=${(e: CustomEvent<{ value: string | null }>) => setDraft({ ...draft, responsavelId: e.detail.value })}><Label>${this.msg.responsavel}</Label>${this.participantes.filter((person) => person.details.tarefas.aceitaTarefasEfetivo).map((person) => html`<Item value=${person.id}>${person.details.identification.name}</Item>`)}<Empty>${this.msg.noPeople}</Empty></groupselectone--ml-select-one-autocomplete>
      <groupentertext--ml-tag-input .value=${draft.details.etiquetas ?? ''} name="etiquetas" .placeholder=${this.msg.labelsPlaceholder} .disabled=${saving} @input=${(e: CustomEvent<{ value: string }>) => setDraft({ ...draft, details: { ...draft.details, etiquetas: e.detail.value || null } })}><Label>${this.msg.labels}</Label></groupentertext--ml-tag-input>`;
  }

  private renderNewChecklist(saving: boolean) {
    const draft = this.cmdAdicionarItensChecklistDraft;
    return html`<div class="border-t border-[var(--border-subtle,currentColor)] pt-4"><h2 class="text-base font-semibold">${this.msg.checklist}</h2>${draft.itens.map((item, index) => html`<groupentertext--ml-floating-text-input class="mt-3" .value=${item.details.descricao ?? ''} name=${`item-${index}`} .placeholder=${this.msg.itemPlaceholder} .disabled=${saving} @input=${(e: CustomEvent<{ value: string }>) => this.setCmdAdicionarItensChecklistDraft({ itens: draft.itens.map((current, position) => position === index ? { ...current, ordem: index + 1, details: { ...current.details, descricao: e.detail.value || null } } : current) })}><Label>${this.msg.newChecklistItem}</Label></groupentertext--ml-floating-text-input>`) }<grouptriggeraction--ml-button-standard class="mt-3" size="sm" data-variant="secondary" .disabled=${saving} @action=${() => this.setCmdAdicionarItensChecklistDraft({ itens: [...draft.itens, { ordem: draft.itens.length + 1, details: { descricao: null, concluido: false } }] })}><Label>${this.msg.addChecklist}</Label></grouptriggeraction--ml-button-standard>${draft.itens.length ? html`<grouptriggeraction--ml-button-standard class="ml-2" size="sm" data-variant="secondary" .loading=${this.cmdAdicionarItensChecklistStatus === 'loading'} @action=${() => this.cmdAdicionarItensChecklist()}><Label>${this.msg.saveChecklist}</Label></grouptriggeraction--ml-button-standard>` : ''}</div>`;
  }

  private renderExistingChecklist(task: NonNullable<typeof this.tarefa>, saving: boolean) {
    const changes = this.cmdAjustarChecklistDraft;
    return html`<div class="border-t border-[var(--border-subtle,currentColor)] pt-4"><h2 class="text-base font-semibold">${this.msg.editingChecklist}</h2>${task.itens.map((item) => html`<label class="mt-3 flex min-h-11 items-center gap-3"><input type="checkbox" .checked=${item.details.concluido} .disabled=${saving} @change=${(e: Event) => this.setCmdAjustarChecklistDraft({ itens: [...changes.itens.filter((current) => current.id !== item.id), { id: item.id, version: item.version, ordem: null, details: { descricao: null, concluido: (e.target as HTMLInputElement).checked } }] })}><span>${item.details.descricao}</span></label>`)}${changes.itens.length ? html`<grouptriggeraction--ml-button-standard class="mt-3" size="md" data-variant="secondary" .loading=${this.cmdAjustarChecklistStatus === 'loading'} @action=${() => this.cmdAjustarChecklist()}><Label>${this.msg.saveChecklist}</Label></grouptriggeraction--ml-button-standard>` : ''}</div>`;
  }
}
