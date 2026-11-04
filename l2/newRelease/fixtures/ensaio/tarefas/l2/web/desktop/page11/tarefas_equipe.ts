/// <mls fileReference="_102047_/l2/tarefas/web/desktop/page11/tarefas_equipe.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { TarefasTarefas_equipeShared } from '/_102047_/l2/tarefas/web/shared/tarefas_equipe.js';
import type { Situacao, TarefaResumo } from '/_102047_/l2/tarefas/web/shared/tarefas_equipe.js';
import '/_102020_/l2/molecules/ml-scenary.js';
import '/_102040_/l2/molecules/groupenterdateinterval/ml-date-interval-presets.js';
import '/_102040_/l2/molecules/groupnotifyuser/ml-contextual-feedback.js';
import '/_102040_/l2/molecules/groupselectone/ml-select-one-autocomplete.js';
import '/_102040_/l2/molecules/groupshowprogress/ml-linear-progress.js';
import '/_102040_/l2/molecules/grouptriggeraction/ml-button-standard.js';
import '/_102040_/l2/molecules/groupviewcard/ml-view-card-horizontal.js';
import '/_102040_/l2/molecules/groupviewdata/ml-timeline-view.js';
import '/_102040_/l2/molecules/groupviewtable/ml-advanced-data-table.js';

/// **collab_i18n_start**
const pageMessage_pt_br = {
  pageTitle: 'Tarefas da equipe', queueTitle: 'Fila de tarefas', panelTitle: 'Tarefa selecionada',
  list: 'Lista', board: 'Quadro', filters: 'Filtros', listFilter: 'Lista', responsibleFilter: 'Responsável',
  priorityFilter: 'Prioridade', duePeriod: 'Período do prazo', allLists: 'Todas as listas', everyone: 'Todas as pessoas',
  anyPriority: 'Qualquer prioridade', anyStatus: 'Qualquer situação', searchResponsible: 'Buscar responsável pelo nome',
  status: 'Situação', priority: 'Prioridade', dueDate: 'Prazo', actingNow: 'Quem age agora', checklist: 'Checklist',
  task: 'Tarefa', responsible: 'Responsável', createdBy: 'Quem criou', createdAt: 'Criada em', subtasks: 'Subtarefas',
  description: 'Descrição', noDescription: 'Sem descrição', noDueDate: 'Sem prazo', noOne: 'Ninguém',
  selectTask: 'Selecione uma tarefa na fila para conferir os detalhes e agir.', loading: 'Carregando tarefas…',
  loadingTask: 'Carregando tarefa…', emptyQueue: 'Nenhuma tarefa corresponde aos filtros aplicados.',
  loadMore: 'Carregar mais', retry: 'Tentar novamente', queueError: 'Não foi possível carregar a fila de tarefas.',
  taskError: 'Não foi possível abrir esta tarefa.', reassign: 'Trocar responsável', newResponsible: 'Novo responsável',
  chooseResponsible: 'Escolha pelo nome', reassignHint: 'Somente participantes ativos que aceitam tarefas podem ser escolhidos.',
  cancelTask: 'Cancelar tarefa', cancelHint: 'O cancelamento só está disponível enquanto a tarefa estiver aberta; quem age agora será avisado.',
  reassignSuccess: 'Responsável alterado.', cancelSuccess: 'Tarefa cancelada.', actionError: 'Não foi possível concluir a ação.',
  history: 'Histórico', event: 'Evento', moment: 'Momento', returnReason: 'Motivo da devolução',
  noHistory: 'Ainda não há eventos nesta tarefa.', noChecklist: 'Não há itens na checklist.', item: 'Item da checklist', completed: 'Concluído',
  overdue: 'Atrasada', dueToday: 'Vence hoje', progress: 'Progresso da checklist',
  aFazer: 'A fazer', emAndamento: 'Em andamento', emRevisao: 'Em revisão', concluida: 'Concluída', cancelada: 'Cancelada',
  baixa: 'Baixa', media: 'Média', alta: 'Alta', boardEmpty: 'Não há tarefas nesta situação.',
  precondition: 'Abra esta tela a partir do módulo de tarefas para acompanhar a equipe.', goTasks: 'Ir para tarefas'
};
type PageMessageType = typeof pageMessage_pt_br;
const pageMessages: Record<string, PageMessageType> = { 'pt-br': pageMessage_pt_br };
/// **collab_i18n_end**

const STATUS_KEY: Record<Situacao, keyof PageMessageType> = {
  aFazer: 'aFazer', emAndamento: 'emAndamento', emRevisao: 'emRevisao', concluida: 'concluida', cancelada: 'cancelada'
};
const PRIORITY_KEY: Record<TarefaResumo['prioridade'], keyof PageMessageType> = { baixa: 'baixa', media: 'media', alta: 'alta' };
const formatDate = (value: string) => new Intl.DateTimeFormat(document.documentElement.lang || undefined, { dateStyle: 'medium' }).format(new Date(value));
const formatDateTime = (value: string) => new Intl.DateTimeFormat(document.documentElement.lang || undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const boardColumn = (status: Situacao) => ({ aFazer: 'col-start-1', emAndamento: 'col-start-2', emRevisao: 'col-start-3', concluida: 'col-start-4', cancelada: 'col-start-5' })[status];

@customElement('tarefas--web--desktop--page11--tarefas_equipe-102047')
export class TarefasDesktopPage11Tarefas_equipePage extends TarefasTarefas_equipeShared {
  private msg: PageMessageType = pageMessage_pt_br;

  private renderFilters() {
    const loading = this.carregarFiltrosEquipeStatus === 'loading';
    return html`<div class="grid grid-cols-2 gap-3 border-b border-[var(--border-subtle,currentColor)] p-4">
      <groupselectone--ml-select-one-autocomplete .value=${this.listaTarefasId} name="lista" .loading=${loading} clearable
        @change=${(e: CustomEvent<{value:string|null}>) => this.setListaTarefasId(e.detail.value)}>
        <Label>${this.msg.listFilter}</Label><Trigger>${this.msg.allLists}</Trigger>
        ${this.listas.map((row) => html`<Item value=${row.id}>${row.nome}</Item>`)}
      </groupselectone--ml-select-one-autocomplete>
      <groupselectone--ml-select-one-autocomplete .value=${this.filtroResponsavelId} name="responsavel" .loading=${loading} clearable
        @change=${(e: CustomEvent<{value:string|null}>) => this.setFiltroResponsavelId(e.detail.value)}>
        <Label>${this.msg.responsibleFilter}</Label><Trigger>${this.msg.everyone}</Trigger>
        ${this.carregarFiltrosEquipeParticipantes.map((row) => html`<Item value=${row.id}>${row.details.identification.name}</Item>`)}
      </groupselectone--ml-select-one-autocomplete>
      <label class="flex flex-col gap-1 text-sm font-medium text-[var(--text-default,currentColor)]">${this.msg.priorityFilter}
        <select class="h-10 rounded border border-[var(--border-default,currentColor)] bg-[var(--input-bg,transparent)] px-2" .value=${this.filtroPrioridade ?? ''}
          @change=${(e: Event) => this.setFiltroPrioridade(((e.target as HTMLSelectElement).value || null) as TarefaResumo['prioridade'] | null)}>
          <option value="">${this.msg.anyPriority}</option><option value="baixa">${this.msg.baixa}</option><option value="media">${this.msg.media}</option><option value="alta">${this.msg.alta}</option>
        </select>
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium text-[var(--text-default,currentColor)]">${this.msg.status}
        <select class="h-10 rounded border border-[var(--border-default,currentColor)] bg-[var(--input-bg,transparent)] px-2" .value=${this.filtroStatus ?? ''}
          @change=${(e: Event) => this.setFiltroStatus(((e.target as HTMLSelectElement).value || null) as Situacao | null)}>
          <option value="">${this.msg.anyStatus}</option>${(Object.keys(STATUS_KEY) as Situacao[]).map((status) => html`<option value=${status}>${this.msg[STATUS_KEY[status]]}</option>`)}
        </select>
      </label>
      <groupenterdateinterval--ml-date-interval-presets class="col-span-2" .startDate=${this.filtroPrazoDe} .endDate=${this.filtroPrazoAte} name="prazo" locale="pt-BR"
        @startChange=${(e: CustomEvent<{value:string|null}>) => this.setFiltroPrazoDe(e.detail.value)} @endChange=${(e: CustomEvent<{value:string|null}>) => this.setFiltroPrazoAte(e.detail.value)}>
        <Label>${this.msg.duePeriod}</Label><LabelStart>${this.msg.dueDate}</LabelStart><LabelEnd>${this.msg.dueDate}</LabelEnd>
      </groupenterdateinterval--ml-date-interval-presets>
    </div>`;
  }

  private renderQueueRow(row: TarefaResumo) {
    return html`<div class="flex items-center justify-between gap-3"><div><div class="font-medium text-[var(--text-strong,currentColor)]">${row.titulo}</div><div class="text-xs text-[var(--text-muted,currentColor)]">${row.listaTarefas.nome} · ${row.participante.details.identification.name}</div></div><div class="text-right text-xs"><span class="rounded-full bg-[var(--status-neutral-bg,transparent)] px-2 py-1 text-[var(--status-neutral-text,currentColor)]">${this.msg[STATUS_KEY[row.status]]}</span><div class="mt-2 text-[var(--text-muted,currentColor)]">${row.prazo ? formatDate(row.prazo) : this.msg.noDueDate}</div></div></div>`;
  }

  private renderPanel() {
    const task = this.tarefa;
    if (this.obterTarefaEquipeStatus === 'loading') return html`<p class="p-6 text-[var(--text-muted,currentColor)]">${this.msg.loadingTask}</p>`;
    if (this.obterTarefaEquipeError) return html`<div class="p-6"><p class="text-[var(--text-default,currentColor)]">${this.msg.taskError}</p><grouptriggeraction--ml-button-standard data-variant="secondary" size="sm" @action=${() => this.selectedTarefa && this.obterTarefaEquipe(this.selectedTarefa)}><Label>${this.msg.retry}</Label></grouptriggeraction--ml-button-standard></div>`;
    if (!task) return html`<p class="p-6 text-sm text-[var(--text-muted,currentColor)]">${this.msg.selectTask}</p>`;
    const busy = this.trocarResponsavelTarefaStatus === 'loading' || this.cancelarTarefaEquipeStatus === 'loading';
    return html`<div class="space-y-5 p-5">
      <div data-organism-id="tarefaDetalhe">
        <groupviewcard--ml-view-card-horizontal>
          <CardHeader><CardTitle>${task.titulo}</CardTitle><CardDescription>${task.details.descricao || this.msg.noDescription}</CardDescription></CardHeader>
          <CardContent><span class="rounded-full bg-[var(--status-neutral-bg,transparent)] px-2 py-1 text-xs text-[var(--status-neutral-text,currentColor)]">${this.msg[STATUS_KEY[task.status]]}</span></CardContent>
          <CardFooter><dl class="grid grid-cols-2 gap-x-5 gap-y-3 text-sm"><dt>${this.msg.priority}</dt><dd>${this.msg[PRIORITY_KEY[task.prioridade]]}</dd><dt>${this.msg.responsible}</dt><dd>${task.participante.details.identification.name}</dd><dt>${this.msg.actingNow}</dt><dd>${task.quemAgeAgoraNome || this.msg.noOne}</dd><dt>${this.msg.dueDate}</dt><dd>${task.prazo ? formatDate(task.prazo) : this.msg.noDueDate}</dd><dt>${this.msg.createdBy}</dt><dd>${task.criadorNome}</dd><dt>${this.msg.createdAt}</dt><dd>${formatDateTime(task.criadaEm)}</dd><dt>${this.msg.subtasks}</dt><dd>${task.details.quantidadeSubtarefas}</dd></dl></CardFooter>
        </groupviewcard--ml-view-card-horizontal>
        <div class="mt-4"><div class="mb-2 flex justify-between text-sm"><span>${this.msg.checklist}</span><span>${task.details.progressoChecklist}</span></div><groupshowprogress--ml-linear-progress .value=${null} size="xs" .label=${this.msg.progress}></groupshowprogress--ml-linear-progress>
          <ul class="mt-3 space-y-2 text-sm">${task.checklist.length ? task.checklist.map((line) => html`<li class="flex gap-2"><span>${line.details.concluido ? '✓' : '○'}</span><span>${line.details.descricao}</span></li>`) : html`<li class="text-[var(--text-muted,currentColor)]">${this.msg.noChecklist}</li>`}</ul>
        </div>
      </div>
      <div data-organism-id="tarefaAcoes" class="border-t border-[var(--border-subtle,currentColor)] pt-5">
        ${this.trocarResponsavelTarefaError || this.cancelarTarefaEquipeError ? html`<groupnotifyuser--ml-contextual-feedback type="error" .visible=${true} .dismissible=${false}><Message>${this.msg.actionError}</Message></groupnotifyuser--ml-contextual-feedback>` : ''}
        ${this.trocarResponsavelTarefaStatus === 'success' ? html`<groupnotifyuser--ml-contextual-feedback type="success" .visible=${true} .dismissible=${false}><Message>${this.msg.reassignSuccess}</Message></groupnotifyuser--ml-contextual-feedback>` : ''}
        ${this.cancelarTarefaEquipeStatus === 'success' ? html`<groupnotifyuser--ml-contextual-feedback type="success" .visible=${true} .dismissible=${false}><Message>${this.msg.cancelSuccess}</Message></groupnotifyuser--ml-contextual-feedback>` : ''}
        ${task.details.aberta ? html`<groupselectone--ml-select-one-autocomplete .value=${this.trocarResponsavelTarefaDraft.responsavelId} name="novoResponsavel" clearable .loading=${this.buscarResponsaveisDisponiveisStatus === 'loading'} @focus=${() => this.buscarResponsaveisDisponiveis()} @change=${(e: CustomEvent<{value:string|null}>) => this.setTrocarResponsavelTarefaDraft({ responsavelId: e.detail.value })}><Label>${this.msg.newResponsible}</Label><Trigger>${this.msg.chooseResponsible}</Trigger>${this.buscarResponsaveisDisponiveisParticipantes.map((row) => html`<Item value=${row.id}>${row.details.identification.name}</Item>`)}</groupselectone--ml-select-one-autocomplete><p class="mt-2 text-xs text-[var(--text-muted,currentColor)]">${this.msg.reassignHint}</p><div class="mt-3 flex gap-2"><grouptriggeraction--ml-button-standard data-variant="primary" size="sm" .disabled=${busy || !this.trocarResponsavelTarefaDraft.responsavelId} .loading=${this.trocarResponsavelTarefaStatus === 'loading'} @action=${() => this.trocarResponsavelTarefa()}><Label>${this.msg.reassign}</Label></grouptriggeraction--ml-button-standard><grouptriggeraction--ml-button-standard data-variant="danger" size="sm" .disabled=${busy} .loading=${this.cancelarTarefaEquipeStatus === 'loading'} @action=${() => this.cancelarTarefaEquipe()}><Label>${this.msg.cancelTask}</Label></grouptriggeraction--ml-button-standard></div><p class="mt-2 text-xs text-[var(--text-muted,currentColor)]">${this.msg.cancelHint}</p>` : ''}
      </div>
      <div data-organism-id="tarefaHistorico" class="border-t border-[var(--border-subtle,currentColor)] pt-5"><h2 class="mb-3 text-sm font-semibold text-[var(--text-strong,currentColor)]">${this.msg.history}</h2><groupviewdata--ml-timeline-view .loading=${false}><Columns><Column field="evento" header=${this.msg.event}></Column><Column field="momento" header=${this.msg.moment}></Column></Columns><Rows>${task.historico.map((entry) => html`<Row><Cell>${entry.tipo}${entry.details.motivoDevolucao ? html` · ${entry.details.motivoDevolucao}` : ''}</Cell><Cell>${formatDateTime(entry.momento)}</Cell></Row>`)}</Rows><Empty>${this.msg.noHistory}</Empty></groupviewdata--ml-timeline-view></div>
    </div>`;
  }

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];
    const tasks = this.tarefas?.items ?? [];
    const selectedIndex = tasks.findIndex((row) => row.id === this.selectedTarefa);
    if (this.pageStatus === 'error') return html`<main class="min-h-full bg-[var(--page-bg,transparent)] p-8"><h1 class="text-2xl font-semibold text-[var(--text-strong,currentColor)]">${this.msg.pageTitle}</h1><p class="mt-3 text-[var(--text-default,currentColor)]">${this.msg.precondition}</p></main>`;
    return html`<main class="min-h-full bg-[var(--page-bg,transparent)] p-6"><h1 class="mb-5 text-2xl font-semibold text-[var(--text-strong,currentColor)]">${this.msg.pageTitle}</h1><div class="grid min-h-[720px] grid-cols-[minmax(0,1.45fr)_minmax(420px,0.85fr)] gap-5"><section data-organism-id="tarefasEquipe" class="overflow-hidden rounded-lg border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)]"><div class="flex items-center justify-between px-4 pt-4"><h2 class="text-base font-semibold text-[var(--text-strong,currentColor)]">${this.msg.queueTitle}</h2></div>${this.renderFilters()}<molecules--ml-scenary-102020 mode="tabs" .value=${this.scenary || 'lista'} @change=${(e: CustomEvent<{value:string}>) => { if (e.target === e.currentTarget) this.setScenario(e.detail.value); }}><Scene value="lista" title=${this.msg.list}><groupviewtable--ml-advanced-data-table .value=${selectedIndex >= 0 ? String(selectedIndex) : ''} .loading=${this.listarTarefasEquipeStatus === 'loading'} error=${this.listarTarefasEquipeError?.message || ''} @rowClick=${(e: CustomEvent<{index:number}>) => { const row = tasks[e.detail.index]; if (row) this.selectTarefa(row.id); }}><TableHeader><TableRow><TableHead key="tarefa">${this.msg.task}</TableHead><TableHead key="situacao">${this.msg.status}</TableHead><TableHead key="prazo">${this.msg.dueDate}</TableHead></TableRow></TableHeader><TableBody>${tasks.map((row) => html`<TableRow key=${row.id}><TableCell>${row.titulo}<div class="text-xs text-[var(--text-muted,currentColor)]">${row.listaTarefas.nome} · ${row.participante.details.identification.name}</div></TableCell><TableCell>${this.msg[STATUS_KEY[row.status]]}</TableCell><TableCell>${row.prazo ? formatDate(row.prazo) : this.msg.noDueDate}</TableCell></TableRow>`)}</TableBody><Loading>${this.msg.loading}</Loading><Empty>${this.msg.emptyQueue}</Empty></groupviewtable--ml-advanced-data-table></Scene><Scene value="quadro" title=${this.msg.board}><div class="grid grid-cols-5 gap-3 p-4">${(Object.keys(STATUS_KEY) as Situacao[]).map((status) => html`<div class="rounded border border-[var(--border-subtle,currentColor)] bg-[var(--surface-alt-bg,transparent)] p-2"><div class="mb-3 flex justify-between text-xs font-semibold"><span>${this.msg[STATUS_KEY[status]]}</span><span>${this.contagemPorSituacao.find((count) => count.status === status)?.quantidade ?? ''}</span></div>${tasks.map((row) => row.status === status ? html`<groupviewcard--ml-view-card-horizontal class="mb-2" clickable ?selected=${row.id === this.selectedTarefa} @cardClick=${() => this.selectTarefa(row.id)}><CardHeader><CardTitle>${row.titulo}</CardTitle><CardDescription>${row.quemAgeAgoraNome || this.msg.noOne}</CardDescription></CardHeader><CardFooter>${row.prazo ? formatDate(row.prazo) : this.msg.noDueDate}</CardFooter></groupviewcard--ml-view-card-horizontal>` : '')}</div>`)}</div></Scene></molecules--ml-scenary-102020></section><aside class="rounded-lg border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)]"><h2 class="border-b border-[var(--border-subtle,currentColor)] px-5 py-4 text-base font-semibold text-[var(--text-strong,currentColor)]">${this.msg.panelTitle}</h2>${this.renderPanel()}</aside></div></main>`;
  }
}
