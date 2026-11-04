/// <mls fileReference="_102047_/l2/tarefas/web/desktop/page11/minhas_tarefas.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { TarefasMinhas_tarefasShared } from '/_102047_/l2/tarefas/web/shared/minhas_tarefas.js';
import type { GrupoTarefas, ItemChecklistAjusteDraft, Prioridade, TarefaCompleta } from '/_102047_/l2/tarefas/web/shared/minhas_tarefas.js';
import '/_102040_/l2/molecules/groupnavigatesection/ml-navigate-pills.js';
import '/_102040_/l2/molecules/groupviewtable/ml-grouping-table.js';
import '/_102040_/l2/molecules/groupviewtable/ml-view-table.js';
import '/_102040_/l2/molecules/groupviewcard/ml-vertical-card.js';
import '/_102040_/l2/molecules/groupentertext/ml-enter-text.js';
import '/_102040_/l2/molecules/groupentertext/ml-multiline-text.js';
import '/_102040_/l2/molecules/groupentertext/ml-tag-input.js';
import '/_102040_/l2/molecules/groupenterdate/ml-date-picker.js';
import '/_102040_/l2/molecules/groupselectone/ml-select-one-autocomplete.js';
import '/_102040_/l2/molecules/groupselectone/ml-combobox.js';
import '/_102040_/l2/molecules/groupselectone/ml-segmented-control.js';
import '/_102040_/l2/molecules/grouptriggeraction/ml-button-standard.js';
import '/_102040_/l2/molecules/grouptriggeraction/ml-button-group.js';
import '/_102040_/l2/molecules/groupnotifyuser/ml-notify-banner.js';
import '/_102040_/l2/molecules/groupviewdata/ml-timeline-view.js';
import '/_102020_/l2/molecules/ml-scenary.js';

/// **collab_i18n_start**
const pageMessage_pt_br = {
  pageTitle: 'Minhas tarefas', newTask: 'Nova tarefa', back: 'Voltar para tarefas',
  responsible: 'Responsável', created: 'Criadas', dependsOnMe: 'Depende de mim',
  responsibleCount: 'Responsável: {0}', createdCount: 'Criadas: {0}', dependsCount: 'Depende de mim: {0}', dueTodayCount: 'Vencem hoje: {0}', lateCount: 'Atrasadas: {0}',
  task: 'Tarefa', dueDate: 'Prazo', priority: 'Prioridade', list: 'Lista', assignee: 'Responsável', status: 'Situação', whoActs: 'Quem age agora', checklist: 'Checklist',
  progress: 'Progresso da checklist', overdue: 'Atrasada', dueToday: 'Vence hoje', returned: 'Devolvida aguardando retomada', noOne: 'Ninguém',
  statusAFazer: 'A fazer', statusEmAndamento: 'Em andamento', statusEmRevisao: 'Em revisão', statusConcluida: 'Concluída', statusCancelada: 'Cancelada',
  priorityBaixa: 'Baixa', priorityMedia: 'Média', priorityAlta: 'Alta',
  loadingTasks: 'Carregando tarefas…', emptyTasks: 'Não há tarefas neste grupo.', loadError: 'Não foi possível carregar as tarefas.', loadMore: 'Carregar mais',
  selectTask: 'Selecione uma tarefa na fila para conferir o trabalho e agir.', taskDetails: 'Detalhes da tarefa', createTask: 'Criar tarefa',
  description: 'Descrição', labels: 'Etiquetas', createdBy: 'Quem criou', createdAt: 'Criada em', parentTask: 'Tarefa pai', subtasks: 'Subtarefas', none: '—',
  returnReason: 'Motivo da devolução', completed: 'Concluído', completedAt: 'Concluído em', order: 'Ordem', addChecklistItem: 'Adicionar item à checklist', itemDescription: 'Descrição do item',
  saveChanges: 'Salvar alterações', addItems: 'Adicionar itens', registerTask: 'Registrar tarefa',
  titlePlaceholder: 'Escreva um título curto', descriptionPlaceholder: 'Descreva o que deve ser feito', labelsPlaceholder: 'Separe as etiquetas por vírgula', duePlaceholder: 'Escolha uma data',
  listPlaceholder: 'Escolha uma lista', assigneePlaceholder: 'Busque pelo nome', parentPlaceholder: 'Escolha a tarefa pai', priorityPlaceholder: 'Escolha a prioridade',
  noLists: 'Nenhuma lista encontrada.', noParticipants: 'Nenhum participante encontrado.',
  start: 'Iniciar', sendForReview: 'Enviar para revisão', accept: 'Aceitar entrega', returnForCorrection: 'Devolver para correção', resume: 'Retomar', cancel: 'Cancelar tarefa',
  returnPlaceholder: 'Explique o que precisa ser corrigido', actions: 'Ações da tarefa', history: 'Histórico', event: 'Evento', moment: 'Momento',
  formError: 'Não foi possível concluir esta ação.', detailsError: 'Não foi possível carregar esta tarefa.', creatingDisabled: 'Você não tem permissão para criar tarefas.',
  taskForm: 'Dados da tarefa', saveSuccess: 'Alterações salvas.', createdSuccess: 'Tarefa registrada.',
  historyEmpty: 'Ainda não há eventos nesta tarefa.', checklistEmpty: 'Ainda não há itens na checklist.', retry: 'Tentar novamente'
};
type PageMessageType = typeof pageMessage_pt_br;
const pageMessages: Record<string, PageMessageType> = { 'pt-br': pageMessage_pt_br };
/// **collab_i18n_end**

const STATUS_KEY: Record<TarefaCompleta['status'], keyof PageMessageType> = {
  aFazer: 'statusAFazer', emAndamento: 'statusEmAndamento', emRevisao: 'statusEmRevisao', concluida: 'statusConcluida', cancelada: 'statusCancelada'
};
const PRIORITY_KEY: Record<Prioridade, keyof PageMessageType> = { baixa: 'priorityBaixa', media: 'priorityMedia', alta: 'priorityAlta' };
const formatDate = (value: string | undefined) => value ? new Intl.DateTimeFormat(document.documentElement.lang || undefined, { dateStyle: 'medium' }).format(new Date(value)) : '—';
const formatMoment = (value: string) => new Intl.DateTimeFormat(document.documentElement.lang || undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const changedChecklist = (draft: ItemChecklistAjusteDraft[], id: string, version: number, concluido: boolean): ItemChecklistAjusteDraft[] => {
  const current = draft.find((item) => item.id === id);
  const next: ItemChecklistAjusteDraft = { id, version, ordem: current?.ordem ?? null, details: { descricao: current?.details.descricao ?? null, concluido } };
  return current ? draft.map((item) => item.id === id ? next : item) : [...draft, next];
};

@customElement('tarefas--web--desktop--page11--minhas_tarefas-102047')
export class TarefasDesktopPage11Minhas_tarefasPage extends TarefasMinhas_tarefasShared {
  private msg: PageMessageType = pageMessage_pt_br;

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];
    const list = this.tarefas;
    return html`
      <main class="min-h-full bg-[var(--page-bg,transparent)] p-6 text-[var(--text-default,currentColor)]">
        <header class="mb-6 flex items-start justify-between gap-6">
          <div>
            <h1 class="text-2xl font-semibold text-[var(--text-strong,currentColor)]">${this.msg.pageTitle}</h1>
            <div class="mt-3 flex flex-wrap gap-2 text-sm text-[var(--text-muted,currentColor)]">
              <span>${this.msg.responsibleCount.replace('{0}', String(this.quantidadeResponsavel))}</span>
              <span>${this.msg.createdCount.replace('{0}', String(this.quantidadeCriadas))}</span>
              <span>${this.msg.dependsCount.replace('{0}', String(this.quantidadeDependeDeMim))}</span>
              <span>${this.msg.dueTodayCount.replace('{0}', String(this.quantidadeVenceHoje))}</span>
              <span>${this.msg.lateCount.replace('{0}', String(this.quantidadeAtrasadas))}</span>
            </div>
          </div>
          ${this.podeCriarTarefasEfetivo ? html`
            <grouptriggeraction--ml-button-standard data-variant="primary" size="md" @action=${() => { this.qryTarefa(null); this.setScenario('nova'); }}>
              <Label>${this.msg.newTask}</Label>
            </grouptriggeraction--ml-button-standard>` : html`<span class="text-sm text-[var(--text-muted,currentColor)]">${this.msg.creatingDisabled}</span>`}
        </header>
        <div class="grid min-h-[620px] grid-cols-[minmax(0,1fr)_minmax(380px,42%)] gap-6">
          <section data-organism-id="tarefasLista" class="overflow-hidden rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)]">
            <groupnavigatesection--ml-navigate-pills .value=${this.grupoTarefas} ?loading=${this.qryTarefasDoGrupoStatus === 'loading'} @change=${(e: CustomEvent<{value: string}>) => this.qryTarefasDoGrupo(e.detail.value as GrupoTarefas)}>
              <Tab value="dependeDeMim" title=${this.msg.dependsOnMe}></Tab>
              <Tab value="responsavel" title=${this.msg.responsible}></Tab>
              <Tab value="criadas" title=${this.msg.created}></Tab>
            </groupnavigatesection--ml-navigate-pills>
            <groupviewtable--ml-grouping-table
              .value=${list ? String(list.items.findIndex((row) => row.id === this.selectedTarefa)) : ''}
              .page=${list?.page ?? 1} .pageSize=${list?.pageSize ?? 0} .totalItems=${0}
              ?loading=${this.pageStatus === 'loading' || this.qryTarefasDoGrupoStatus === 'loading'}
              .error=${this.qryMinhasTarefasError?.message ?? this.qryTarefasDoGrupoError?.message ?? ''}
              @rowClick=${(e: CustomEvent<{index: number}>) => { const row = list?.items[e.detail.index]; if (row) { this.qryTarefa(row.id); this.setScenario('detalhe'); } }}
              @pageChange=${(e: CustomEvent<{page: number}>) => this.qryTarefasDoGrupo(this.grupoTarefas, e.detail.page)}>
              <TableCaption>${this.msg.task}</TableCaption>
              <TableHeader><TableRow>
                <TableHead key="titulo" sortable>${this.msg.task}</TableHead><TableHead key="prazo" sortable>${this.msg.dueDate}</TableHead><TableHead key="responsavel" groupable>${this.msg.assignee}</TableHead><TableHead key="status">${this.msg.status}</TableHead>
              </TableRow></TableHeader>
              <TableBody>${list?.items.map((row) => html`<TableRow key=${row.id}>
                <TableCell><div class="font-medium text-[var(--text-strong,currentColor)]">${row.titulo}</div><div class="mt-1 flex flex-wrap gap-2 text-xs text-[var(--text-muted,currentColor)]"><span>${row.listaTarefas.nome}</span><span>${this.msg.progress}: ${row.details.progressoChecklist}</span>${row.details.devolvidaPendente ? html`<span>${this.msg.returned}</span>` : ''}</div></TableCell>
                <TableCell sort-value=${row.prazo ?? ''}><span class=${row.details.atrasada ? 'font-semibold text-[var(--status-error-text,currentColor)]' : ''}>${formatDate(row.prazo)}</span>${row.details.venceHoje ? html`<div class="text-xs text-[var(--status-warning-text,currentColor)]">${this.msg.dueToday}</div>` : ''}</TableCell>
                <TableCell>${row.responsavel.details.identification.name}<div class="text-xs text-[var(--text-muted,currentColor)]">${this.msg.whoActs}: ${row.quemAgeAgoraNome ?? this.msg.noOne}</div></TableCell>
                <TableCell><span class="rounded-full bg-[var(--status-neutral-bg,transparent)] px-2 py-1 text-xs text-[var(--status-neutral-text,currentColor)]">${this.msg[STATUS_KEY[row.status]]}</span></TableCell>
              </TableRow>`)}</TableBody>
              <Loading><div class="p-8 text-center text-[var(--text-muted,currentColor)]">${this.msg.loadingTasks}</div></Loading>
              <Empty><div class="p-10 text-center text-[var(--text-muted,currentColor)]">${this.pageStatus === 'error' ? this.msg.loadError : this.msg.emptyTasks}</div></Empty>
            </groupviewtable--ml-grouping-table>
            ${list?.hasMore ? html`<div class="border-t border-[var(--border-subtle,currentColor)] p-3 text-right"><grouptriggeraction--ml-button-standard data-variant="secondary" size="sm" @action=${() => this.qryTarefasDoGrupo(this.grupoTarefas, list.page + 1, true)}><Label>${this.msg.loadMore}</Label></grouptriggeraction--ml-button-standard></div>` : ''}
          </section>
          <aside class="overflow-hidden rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)]">
            <molecules--ml-scenary-102020 mode="scenary" backLabel=${this.msg.back} .value=${this.scenary || (this.selectedTarefa !== null ? 'detalhe' : 'vazio')} @change=${(e: CustomEvent<{value: string}>) => { if (e.target === e.currentTarget) { this.setScenario(e.detail.value); if (e.detail.value === 'vazio' || e.detail.value === 'nova') this.qryTarefa(null); } }}>
              <Scene value="vazio" title=${this.msg.pageTitle}> <div class="p-10 text-center text-[var(--text-muted,currentColor)]">${this.msg.selectTask}</div> </Scene>
              <Scene value="detalhe" title=${this.msg.taskDetails} nav="back" backTo="vazio">${this.renderDetail()}</Scene>
              <Scene value="nova" title=${this.msg.createTask} nav="back" backTo="vazio">${this.renderForm(true)}</Scene>
            </molecules--ml-scenary-102020>
          </aside>
        </div>
      </main>`;
  }

  private renderDetail() {
    const tarefa = this.tarefa;
    if (!tarefa) return html`<div class="p-6 text-[var(--status-error-text,currentColor)]">${this.qryTarefaError?.message ?? this.msg.detailsError}</div>`;
    const draft = this.cmdSalvarAlteracoesDraft;
    const checklistDraft = this.cmdAjustarChecklistDraft;
    return html`
      <div data-organism-id="tarefaDetalhe" class="space-y-5 p-5">
        <groupviewcard--ml-vertical-card>
          <CardHeader><CardTitle>${tarefa.titulo}</CardTitle><CardDescription>${this.msg[STATUS_KEY[tarefa.status]]}</CardDescription></CardHeader>
          <CardContent><dl class="grid grid-cols-2 gap-x-5 gap-y-3 text-sm"><div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.assignee}</dt><dd>${tarefa.responsavel.details.identification.name}</dd></div><div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.createdBy}</dt><dd>${tarefa.criador.details.identification.name}</dd></div><div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.dueDate}</dt><dd>${formatDate(tarefa.prazo)}</dd></div><div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.list}</dt><dd>${tarefa.listaTarefas.nome}</dd></div><div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.priority}</dt><dd>${this.msg[PRIORITY_KEY[tarefa.prioridade]]}</dd></div><div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.subtasks}</dt><dd>${tarefa.details.quantidadeSubtarefas}</dd></div><div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.parentTask}</dt><dd>${tarefa.tarefaPai?.titulo ?? this.msg.none}</dd></div><div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.createdAt}</dt><dd>${formatMoment(tarefa.criadaEm)}</dd></div></dl></CardContent>
        </groupviewcard--ml-vertical-card>
        ${tarefa.details.motivoDevolucao ? html`<groupnotifyuser--ml-notify-banner type="warning" .visible=${true} .dismissible=${false}><Title>${this.msg.returnReason}</Title><Message>${tarefa.details.motivoDevolucao}</Message></groupnotifyuser--ml-notify-banner>` : ''}
        <div data-organism-id="tarefaForm">${this.renderForm(false)}</div>
        <section><h2 class="mb-3 text-sm font-semibold text-[var(--text-strong,currentColor)]">${this.msg.checklist}</h2>
          <groupviewtable--ml-view-table .page=${1} .pageSize=${0} .totalItems=${0}><TableHeader><TableRow><TableHead key="ordem">${this.msg.order}</TableHead><TableHead key="descricao">${this.msg.itemDescription}</TableHead><TableHead key="concluido">${this.msg.completed}</TableHead></TableRow></TableHeader><TableBody>${tarefa.itens.map((item) => html`<TableRow key=${item.id}><TableCell>${item.ordem}</TableCell><TableCell>${item.details.descricao}${item.details.concluidoEm ? html`<div class="text-xs text-[var(--text-muted,currentColor)]">${this.msg.completedAt}: ${formatMoment(item.details.concluidoEm)}</div>` : ''}</TableCell><TableCell><input type="checkbox" .checked=${item.details.concluido} ?disabled=${!tarefa.details.aberta} aria-label=${this.msg.completed} @change=${(e: Event) => this.setCmdAjustarChecklistDraft({ itens: changedChecklist(checklistDraft.itens, item.id, item.version, (e.target as HTMLInputElement).checked) })}></TableCell></TableRow>`)}</TableBody><Empty><div class="p-4 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.checklistEmpty}</div></Empty></groupviewtable--ml-view-table>
          ${tarefa.details.aberta ? html`<div class="mt-3 flex gap-2"><groupentertext--ml-enter-text class="flex-1" .value=${this.cmdAdicionarItensChecklistDraft.itens[0]?.details.descricao ?? ''} name=${this.msg.itemDescription} placeholder=${this.msg.itemDescription} @input=${(e: CustomEvent<{value: string}>) => this.setCmdAdicionarItensChecklistDraft({ itens: [{ ordem: tarefa.itens.length + 1, details: { descricao: e.detail.value || null, concluido: false } }] })}><Label>${this.msg.addChecklistItem}</Label></groupentertext--ml-enter-text><grouptriggeraction--ml-button-standard data-variant="secondary" size="sm" ?loading=${this.cmdAdicionarItensChecklistStatus === 'loading'} @action=${() => this.cmdAdicionarItensChecklist()}><Label>${this.msg.addItems}</Label></grouptriggeraction--ml-button-standard></div><div class="mt-2"><grouptriggeraction--ml-button-standard data-variant="secondary" size="sm" ?loading=${this.cmdAjustarChecklistStatus === 'loading'} @action=${() => this.cmdAjustarChecklist()}><Label>${this.msg.saveChanges}</Label></grouptriggeraction--ml-button-standard></div>` : ''}
        </section>
        <div data-organism-id="tarefaAcoes">${this.renderActions(tarefa)}</div>
        <div data-organism-id="tarefaHistorico"><h2 class="mb-3 text-sm font-semibold text-[var(--text-strong,currentColor)]">${this.msg.history}</h2><groupviewdata--ml-timeline-view ?loading=${this.qryTarefaStatus === 'loading'}><Columns><Column field="evento" header=${this.msg.event}></Column><Column field="momento" header=${this.msg.moment}></Column></Columns><Rows>${this.historico.map((event) => html`<Row><Cell>${event.tipo}${event.details.motivoDevolucao ? html` — ${event.details.motivoDevolucao}` : ''}</Cell><Cell>${formatMoment(event.momento)}</Cell></Row>`)}</Rows><Empty><div class="p-4 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.historyEmpty}</div></Empty></groupviewdata--ml-timeline-view></div>
      </div>`;
  }

  private renderForm(create: boolean) {
    const draft = create ? this.cmdCriarTarefaDraft : this.cmdSalvarAlteracoesDraft;
    const loading = create ? this.cmdCriarTarefaStatus === 'loading' : this.cmdSalvarAlteracoesStatus === 'loading';
    const error = create ? this.cmdCriarTarefaError : this.cmdSalvarAlteracoesError;
    const setDraft = (value: typeof draft) => create ? this.setCmdCriarTarefaDraft(value) : this.setCmdSalvarAlteracoesDraft(value);
    return html`<div class="space-y-4 ${create ? 'p-5' : ''}">
      <groupentertext--ml-enter-text .value=${draft.titulo ?? ''} name=${this.msg.task} placeholder=${this.msg.titlePlaceholder} required @input=${(e: CustomEvent<{value: string}>) => setDraft({ ...draft, titulo: e.detail.value || null })}><Label>${this.msg.task}</Label></groupentertext--ml-enter-text>
      <groupentertext--ml-multiline-text .value=${draft.details.descricao ?? ''} name=${this.msg.description} placeholder=${this.msg.descriptionPlaceholder} .rows=${3} @input=${(e: CustomEvent<{value: string}>) => setDraft({ ...draft, details: { ...draft.details, descricao: e.detail.value || null } })}><Label>${this.msg.description}</Label></groupentertext--ml-multiline-text>
      <div class="grid grid-cols-2 gap-3"><groupselectone--ml-segmented-control .value=${draft.prioridade} name=${this.msg.priority} placeholder=${this.msg.priorityPlaceholder} @change=${(e: CustomEvent<{value: string | null}>) => setDraft({ ...draft, prioridade: e.detail.value as Prioridade | null })}><Label>${this.msg.priority}</Label><Item value="baixa">${this.msg.priorityBaixa}</Item><Item value="media">${this.msg.priorityMedia}</Item><Item value="alta">${this.msg.priorityAlta}</Item></groupselectone--ml-segmented-control><groupenterdate--ml-date-picker .value=${draft.prazo} name=${this.msg.dueDate} locale="pt-BR" placeholder=${this.msg.duePlaceholder} @change=${(e: CustomEvent<{value: string | null}>) => setDraft({ ...draft, prazo: e.detail.value })}><Label>${this.msg.dueDate}</Label></groupenterdate--ml-date-picker></div>
      <groupselectone--ml-combobox .value=${draft.listaId} name=${this.msg.list} placeholder=${this.msg.listPlaceholder} ?loading=${this.qryListasStatus === 'loading'} @focus=${() => this.qryListas()} @input=${(e: CustomEvent<{value: string}>) => this.qryListas(e.detail.value)} @change=${(e: CustomEvent<{value: string | null}>) => setDraft({ ...draft, listaId: e.detail.value })}><Label>${this.msg.list}</Label>${this.listas.map((item) => html`<Item value=${item.id}>${item.nome}</Item>`)}<Empty>${this.msg.noLists}</Empty></groupselectone--ml-combobox>
      <groupselectone--ml-select-one-autocomplete .value=${draft.responsavelId} name=${this.msg.assignee} placeholder=${this.msg.assigneePlaceholder} ?loading=${this.qryResponsaveisStatus === 'loading'} @focus=${() => this.qryResponsaveis()} @change=${(e: CustomEvent<{value: string | null}>) => setDraft({ ...draft, responsavelId: e.detail.value })}><Label>${this.msg.assignee}</Label>${this.participantes.map((item) => html`<Item value=${item.id}>${item.details.identification.name}</Item>`)}<Empty>${this.msg.noParticipants}</Empty></groupselectone--ml-select-one-autocomplete>
      <groupselectone--ml-combobox .value=${draft.tarefaPaiId ?? null} name=${this.msg.parentTask} placeholder=${this.msg.parentPlaceholder} clearable @change=${(e: CustomEvent<{value: string | null}>) => setDraft({ ...draft, tarefaPaiId: e.detail.value })}><Label>${this.msg.parentTask}</Label></groupselectone--ml-combobox>
      <groupentertext--ml-tag-input .value=${draft.details.etiquetas ?? ''} name=${this.msg.labels} placeholder=${this.msg.labelsPlaceholder} @input=${(e: CustomEvent<{value: string}>) => setDraft({ ...draft, details: { ...draft.details, etiquetas: e.detail.value || null } })}><Label>${this.msg.labels}</Label></groupentertext--ml-tag-input>
      ${error ? html`<p class="text-sm text-[var(--status-error-text,currentColor)]" aria-live="polite">${error.message || this.msg.formError}</p>` : ''}
      <grouptriggeraction--ml-button-standard data-variant="primary" size="md" ?loading=${loading} @action=${() => create ? this.cmdCriarTarefa() : this.cmdSalvarAlteracoes()}><Label>${create ? this.msg.registerTask : this.msg.saveChanges}</Label></grouptriggeraction--ml-button-standard>
    </div>`;
  }

  private renderActions(tarefa: TarefaCompleta) {
    const returnDraft = this.cmdDevolverDraft;
    return html`<section class="rounded-lg bg-[var(--surface-alt-bg,transparent)] p-4"><h2 class="mb-3 text-sm font-semibold text-[var(--text-strong,currentColor)]">${this.msg.actions}</h2>
      ${tarefa.status === 'emRevisao' && tarefa.souCriador ? html`<groupentertext--ml-multiline-text .value=${returnDraft.details.motivoDevolucao ?? ''} name=${this.msg.returnReason} placeholder=${this.msg.returnPlaceholder} .rows=${2} @input=${(e: CustomEvent<{value: string}>) => this.setCmdDevolverDraft({ details: { motivoDevolucao: e.detail.value || null } })}><Label>${this.msg.returnReason}</Label></groupentertext--ml-multiline-text>` : ''}
      <div class="mt-3 flex flex-wrap gap-2">
        ${tarefa.souResponsavel && tarefa.status === 'aFazer' ? html`<grouptriggeraction--ml-button-standard data-variant="primary" size="sm" ?loading=${this.cmdIniciarStatus === 'loading'} @action=${() => this.cmdIniciar()}><Label>${this.msg.start}</Label></grouptriggeraction--ml-button-standard>` : ''}
        ${tarefa.souResponsavel && tarefa.status === 'emAndamento' && !tarefa.details.devolvidaPendente ? html`<grouptriggeraction--ml-button-standard data-variant="primary" size="sm" ?loading=${this.cmdEnviarParaRevisaoStatus === 'loading'} @action=${() => this.cmdEnviarParaRevisao()}><Label>${this.msg.sendForReview}</Label></grouptriggeraction--ml-button-standard>` : ''}
        ${tarefa.souResponsavel && tarefa.status === 'emAndamento' && tarefa.details.devolvidaPendente ? html`<grouptriggeraction--ml-button-standard data-variant="primary" size="sm" ?loading=${this.cmdRetomarStatus === 'loading'} @action=${() => this.cmdRetomar()}><Label>${this.msg.resume}</Label></grouptriggeraction--ml-button-standard>` : ''}
        ${tarefa.souCriador && tarefa.status === 'emRevisao' ? html`<grouptriggeraction--ml-button-group size="sm" type="button"><Label>${this.msg.accept}</Label><Label>${this.msg.returnForCorrection}</Label></grouptriggeraction--ml-button-group><div class="flex gap-2"><grouptriggeraction--ml-button-standard data-variant="primary" size="sm" ?loading=${this.cmdAceitarStatus === 'loading'} @action=${() => this.cmdAceitar()}><Label>${this.msg.accept}</Label></grouptriggeraction--ml-button-standard><grouptriggeraction--ml-button-standard data-variant="secondary" size="sm" ?loading=${this.cmdDevolverStatus === 'loading'} @action=${() => this.cmdDevolver()}><Label>${this.msg.returnForCorrection}</Label></grouptriggeraction--ml-button-standard></div>` : ''}
        ${tarefa.souCriador && tarefa.details.aberta ? html`<grouptriggeraction--ml-button-standard data-variant="danger" size="sm" ?loading=${this.cmdCancelarStatus === 'loading'} @action=${() => this.cmdCancelar()}><Label>${this.msg.cancel}</Label></grouptriggeraction--ml-button-standard>` : ''}
      </div>
    </section>`;
  }
}
