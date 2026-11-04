/// <mls fileReference="_102047_/l2/tarefas/web/desktop/page11/participantes.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { TarefasParticipantesShared } from '/_102047_/l2/tarefas/web/shared/participantes.js';
import '/_102040_/l2/molecules/groupenterboolean/ml-toggle-switch.js';
import '/_102040_/l2/molecules/groupnotifyuser/ml-contextual-feedback.js';
import '/_102040_/l2/molecules/groupsearchcontent/ml-search-bar.js';
import '/_102040_/l2/molecules/groupselectone/ml-combobox.js';
import '/_102040_/l2/molecules/grouptriggeraction/ml-button-standard.js';
import '/_102040_/l2/molecules/groupviewtable/ml-data-table.js';
import '/_102020_/l2/molecules/ml-scenary.js';

/// **collab_i18n_start**
const pageMessage_pt_br = {
  pageTitle: 'Participantes',
  directoryTitle: 'Participantes do módulo',
  searchLabel: 'Buscar participante',
  searchPlaceholder: 'Buscar por nome',
  searchHelper: 'Localize uma pessoa para conferir ou ajustar as marcas.',
  addParticipant: 'Incluir participante',
  name: 'Nome',
  status: 'Situação',
  acceptsTasksEffective: 'Aceita tarefas',
  canCreateTasksEffective: 'Pode criar tarefas',
  roles: 'Papéis',
  noParticipants: 'Nenhum participante encontrado.',
  loadingParticipants: 'Carregando participantes…',
  selectParticipant: 'Escolha um participante',
  selectParticipantText: 'Selecione uma pessoa na lista para ver e ajustar as marcas.',
  selectedParticipant: 'Participante',
  statusActive: 'Ativo',
  statusInactive: 'Inativo',
  statusMerged: 'Mesclado',
  statusBlocked: 'Bloqueado',
  yes: 'Sim',
  no: 'Não',
  configuredMarks: 'Marcas do gestor',
  acceptsTasks: 'Aceita tarefas',
  canCreateTasks: 'Pode criar tarefas',
  defaultMarksHelper: 'Sem uma escolha do gestor, esta marca vale como sim.',
  saveMarks: 'Salvar marcas',
  savingMarks: 'Salvando marcas…',
  saveMarksSuccessTitle: 'Marcas salvas',
  saveMarksSuccessText: 'As marcas deste participante foram atualizadas.',
  saveMarksErrorTitle: 'Não foi possível salvar as marcas',
  includeViewTitle: 'Incluir participante',
  includeIntro: 'Escolha um usuário ativo da organização. Nenhum dado pessoal é cadastrado aqui.',
  userLabel: 'Usuário da organização',
  userPlaceholder: 'Digite um nome para buscar',
  noUsers: 'Nenhum usuário disponível com esse nome.',
  includeParticipant: 'Incluir participante',
  includingParticipant: 'Incluindo participante…',
  includeSuccessTitle: 'Participante incluído',
  includeSuccessText: 'A pessoa agora participa do módulo de tarefas.',
  includeErrorTitle: 'Não foi possível incluir o participante',
  searchUsersErrorTitle: 'Não foi possível buscar usuários',
  listErrorTitle: 'Não foi possível carregar participantes',
  preconditionMissing: 'Não foi possível abrir esta lista porque falta o contexto do módulo de tarefas.',
  retry: 'Tentar novamente',
  back: 'Voltar',
  effectiveMarks: 'Marcas efetivas',
  selectedStatus: 'Situação no MDM'
};
type PageMessageType = typeof pageMessage_pt_br;
const pageMessages: Record<string, PageMessageType> = { 'pt-br': pageMessage_pt_br };
/// **collab_i18n_end**

type ParticipantStatus = 'Active' | 'Inactive' | 'Merged' | 'Blocked';
const STATUS_KEY: Record<ParticipantStatus, keyof PageMessageType> = {
  Active: 'statusActive',
  Inactive: 'statusInactive',
  Merged: 'statusMerged',
  Blocked: 'statusBlocked'
};

@customElement('tarefas--web--desktop--page11--participantes-102047')
export class TarefasDesktopPage11ParticipantesPage extends TarefasParticipantesShared {
  private msg: PageMessageType = pageMessage_pt_br;

  private renderList() {
    const rows = this.participantes?.items ?? [];
    const selectedIndex = rows.findIndex((row) => row.id === this.selectedParticipante);
    const listError = this.listarParticipantesError?.message ?? '';
    return html`
      <section data-organism-id="listaParticipantes" class="flex min-w-0 flex-1 flex-col rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-6">
        <div class="mb-5 flex items-end justify-between gap-4">
          <div>
            <h1 class="text-xl font-semibold text-[var(--text-strong,currentColor)]">${this.msg.pageTitle}</h1>
            <p class="mt-1 text-sm text-[var(--text-muted,currentColor)]">${this.msg.directoryTitle}</p>
          </div>
          <grouptriggeraction--ml-button-standard
            data-variant="primary"
            size="md"
            @action=${() => { this.selectParticipante(null); this.setScenario('incluir'); }}>
            <Label>${this.msg.addParticipant}</Label>
          </grouptriggeraction--ml-button-standard>
        </div>
        <div class="mb-5 max-w-xl">
          <groupsearchcontent--ml-search-bar
            .value=${this.busca}
            .error=${listError}
            .placeholder=${this.msg.searchPlaceholder}
            .debounce=${300}
            .loading=${this.listarParticipantesStatus === 'loading'}
            @search=${(e: CustomEvent<{ query: string }>) => this.listarParticipantes(e.detail.query)}
            @clear=${() => this.listarParticipantes(null)}>
            <Label>${this.msg.searchLabel}</Label>
            <Helper>${this.msg.searchHelper}</Helper>
          </groupsearchcontent--ml-search-bar>
        </div>
        ${this.pageStatus === 'error' && this.listarParticipantesError?.code === 'client.preconditionMissing' ? html`
          <groupnotifyuser--ml-contextual-feedback type="error" .visible=${true} .dismissible=${false}>
            <Title>${this.msg.listErrorTitle}</Title>
            <Message>${this.msg.preconditionMissing}</Message>
          </groupnotifyuser--ml-contextual-feedback>
        ` : html`
          <groupviewtable--ml-data-table
            data-class="min-h-0 flex-1"
            .value=${selectedIndex >= 0 ? String(selectedIndex) : ''}
            .selectable=${false}
            .loading=${this.listarParticipantesStatus === 'loading'}
            .error=${listError}
            @rowClick=${(e: CustomEvent<{ index: number }>) => { const participant = rows[e.detail.index]; if (participant) { this.selectParticipante(participant.id); this.setScenario('participante'); } }}>
            <TableCaption>${this.msg.directoryTitle}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead key="name" sortable>${this.msg.name}</TableHead>
                <TableHead key="status">${this.msg.status}</TableHead>
                <TableHead key="accepts">${this.msg.acceptsTasksEffective}</TableHead>
                <TableHead key="creates">${this.msg.canCreateTasksEffective}</TableHead>
                <TableHead key="roles">${this.msg.roles}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              ${rows.map((row) => html`
                <TableRow key=${row.id}>
                  <TableCell>${row.details.identification.name}</TableCell>
                  <TableCell>${this.msg[STATUS_KEY[row.details.identification.status]]}</TableCell>
                  <TableCell>${row.details.tarefas.aceitaTarefasEfetivo ? this.msg.yes : this.msg.no}</TableCell>
                  <TableCell>${row.details.tarefas.podeCriarTarefasEfetivo ? this.msg.yes : this.msg.no}</TableCell>
                  <TableCell>${row.details.identification.tags}</TableCell>
                </TableRow>
              `)}
            </TableBody>
            <Loading>${this.msg.loadingParticipants}</Loading>
            <Empty>${this.msg.noParticipants}</Empty>
          </groupviewtable--ml-data-table>
        `}
      </section>
    `;
  }

  private renderPanel() {
    const participant = this.formParticipante;
    const saveDraft = this.salvarMarcasDraft;
    const includeDraft = this.incluirParticipanteDraft;
    const saveBusy = this.salvarMarcasStatus === 'loading';
    const includeBusy = this.incluirParticipanteStatus === 'loading';
    return html`
      <aside data-organism-id="formParticipante" class="w-[25rem] shrink-0 rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-6">
        <molecules--ml-scenary-102020
          mode="scenary"
          .value=${this.scenary || (this.selectedParticipante !== null ? 'participante' : 'orientacao')}
          .backLabel=${this.msg.back}
          @change=${(e: CustomEvent<{ value: string }>) => { if (e.target === e.currentTarget) { this.setScenario(e.detail.value); if (e.detail.value === 'orientacao' || e.detail.value === 'incluir') this.selectParticipante(null); } }}>
          <Scene value="orientacao" .title=${this.msg.selectParticipant}>
            <p class="text-sm leading-6 text-[var(--text-muted,currentColor)]">${this.msg.selectParticipantText}</p>
            <div class="mt-6">
              <grouptriggeraction--ml-button-standard data-variant="secondary" size="md" @action=${() => this.setScenario('incluir')}>
                <Label>${this.msg.addParticipant}</Label>
              </grouptriggeraction--ml-button-standard>
            </div>
          </Scene>
          <Scene value="participante" .title=${participant?.details.identification.name ?? this.msg.selectedParticipant} nav="back" backTo="orientacao">
            ${participant ? html`
              <dl class="grid grid-cols-2 gap-x-4 gap-y-5 text-sm">
                <div class="col-span-2 border-b border-[var(--border-subtle,currentColor)] pb-4">
                  <dt class="text-[var(--text-muted,currentColor)]">${this.msg.selectedStatus}</dt>
                  <dd class="mt-1 font-medium text-[var(--text-strong,currentColor)]">${this.msg[STATUS_KEY[participant.details.identification.status]]}</dd>
                </div>
                <div>
                  <dt class="text-[var(--text-muted,currentColor)]">${this.msg.acceptsTasksEffective}</dt>
                  <dd class="mt-1 font-medium text-[var(--text-strong,currentColor)]">${participant.details.tarefas.aceitaTarefasEfetivo ? this.msg.yes : this.msg.no}</dd>
                </div>
                <div>
                  <dt class="text-[var(--text-muted,currentColor)]">${this.msg.canCreateTasksEffective}</dt>
                  <dd class="mt-1 font-medium text-[var(--text-strong,currentColor)]">${participant.details.tarefas.podeCriarTarefasEfetivo ? this.msg.yes : this.msg.no}</dd>
                </div>
              </dl>
              <div class="mt-7 border-t border-[var(--border-subtle,currentColor)] pt-5">
                <p class="mb-4 text-sm font-semibold text-[var(--text-strong,currentColor)]">${this.msg.configuredMarks}</p>
                <div class="space-y-5">
                  <groupenterboolean--ml-toggle-switch
                    .value=${saveDraft.details.tarefas.aceitaTarefas ?? true}
                    .isEditing=${true}
                    .disabled=${saveBusy}
                    @change=${(e: CustomEvent<{ value: boolean }>) => this.setSalvarMarcasDraft({ ...saveDraft, details: { tarefas: { ...saveDraft.details.tarefas, aceitaTarefas: e.detail.value } } })}>
                    <Label>${this.msg.acceptsTasks}</Label>
                    <Helper>${this.msg.defaultMarksHelper}</Helper>
                  </groupenterboolean--ml-toggle-switch>
                  <groupenterboolean--ml-toggle-switch
                    .value=${saveDraft.details.tarefas.podeCriarTarefas ?? true}
                    .isEditing=${true}
                    .disabled=${saveBusy}
                    @change=${(e: CustomEvent<{ value: boolean }>) => this.setSalvarMarcasDraft({ ...saveDraft, details: { tarefas: { ...saveDraft.details.tarefas, podeCriarTarefas: e.detail.value } } })}>
                    <Label>${this.msg.canCreateTasks}</Label>
                    <Helper>${this.msg.defaultMarksHelper}</Helper>
                  </groupenterboolean--ml-toggle-switch>
                </div>
                ${this.salvarMarcasStatus === 'error' ? html`<groupnotifyuser--ml-contextual-feedback class="mt-5" type="error" .visible=${true} .dismissible=${false}><Title>${this.msg.saveMarksErrorTitle}</Title><Message>${this.salvarMarcasError?.message ?? ''}</Message></groupnotifyuser--ml-contextual-feedback>` : ''}
                ${this.salvarMarcasStatus === 'success' ? html`<groupnotifyuser--ml-contextual-feedback class="mt-5" type="success" .visible=${true} .dismissible=${false}><Title>${this.msg.saveMarksSuccessTitle}</Title><Message>${this.msg.saveMarksSuccessText}</Message></groupnotifyuser--ml-contextual-feedback>` : ''}
                <div class="mt-6"><grouptriggeraction--ml-button-standard data-variant="primary" size="md" .loading=${saveBusy} .disabled=${saveBusy} @action=${() => this.salvarMarcas()}><Label>${saveBusy ? this.msg.savingMarks : this.msg.saveMarks}</Label></grouptriggeraction--ml-button-standard></div>
              </div>
            ` : html`<p class="text-sm text-[var(--text-muted,currentColor)]">${this.msg.selectParticipantText}</p>`}
          </Scene>
          <Scene value="incluir" .title=${this.msg.includeViewTitle} nav="back" backTo="orientacao">
            <p class="mb-5 text-sm leading-6 text-[var(--text-muted,currentColor)]">${this.msg.includeIntro}</p>
            <groupselectone--ml-combobox
              .value=${includeDraft.id}
              .placeholder=${this.msg.userPlaceholder}
              .searchable=${true}
              .clearable=${true}
              .required=${true}
              .loading=${this.buscarUsuariosStatus === 'loading'}
              .error=${this.buscarUsuariosError?.message ?? ''}
              .disabled=${includeBusy}
              @input=${(e: CustomEvent<{ value: string }>) => this.buscarUsuarios(e.detail.value)}
              @change=${(e: CustomEvent<{ value: string | null }>) => this.setIncluirParticipanteDraft({ ...includeDraft, id: e.detail.value })}>
              <Label>${this.msg.userLabel}</Label>
              ${this.usuarios.map((user) => html`<Item value=${user.id}>${user.details.identification.name}</Item>`)}
              <Empty>${this.msg.noUsers}</Empty>
            </groupselectone--ml-combobox>
            <div class="mt-6 space-y-5 border-t border-[var(--border-subtle,currentColor)] pt-5">
              <groupenterboolean--ml-toggle-switch .value=${includeDraft.details.tarefas.aceitaTarefas ?? true} .isEditing=${true} .disabled=${includeBusy} @change=${(e: CustomEvent<{ value: boolean }>) => this.setIncluirParticipanteDraft({ ...includeDraft, details: { tarefas: { ...includeDraft.details.tarefas, aceitaTarefas: e.detail.value } } })}><Label>${this.msg.acceptsTasks}</Label><Helper>${this.msg.defaultMarksHelper}</Helper></groupenterboolean--ml-toggle-switch>
              <groupenterboolean--ml-toggle-switch .value=${includeDraft.details.tarefas.podeCriarTarefas ?? true} .isEditing=${true} .disabled=${includeBusy} @change=${(e: CustomEvent<{ value: boolean }>) => this.setIncluirParticipanteDraft({ ...includeDraft, details: { tarefas: { ...includeDraft.details.tarefas, podeCriarTarefas: e.detail.value } } })}><Label>${this.msg.canCreateTasks}</Label><Helper>${this.msg.defaultMarksHelper}</Helper></groupenterboolean--ml-toggle-switch>
            </div>
            ${this.incluirParticipanteStatus === 'error' ? html`<groupnotifyuser--ml-contextual-feedback class="mt-5" type="error" .visible=${true} .dismissible=${false}><Title>${this.msg.includeErrorTitle}</Title><Message>${this.incluirParticipanteError?.message ?? ''}</Message></groupnotifyuser--ml-contextual-feedback>` : ''}
            ${this.incluirParticipanteStatus === 'success' ? html`<groupnotifyuser--ml-contextual-feedback class="mt-5" type="success" .visible=${true} .dismissible=${false}><Title>${this.msg.includeSuccessTitle}</Title><Message>${this.msg.includeSuccessText}</Message></groupnotifyuser--ml-contextual-feedback>` : ''}
            <div class="mt-6"><grouptriggeraction--ml-button-standard data-variant="primary" size="md" .loading=${includeBusy} .disabled=${includeBusy} @action=${() => this.incluirParticipante()}><Label>${includeBusy ? this.msg.includingParticipant : this.msg.includeParticipant}</Label></grouptriggeraction--ml-button-standard></div>
          </Scene>
        </molecules--ml-scenary-102020>
      </aside>
    `;
  }

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];
    return html`<main class="min-h-full bg-[var(--page-bg,transparent)] p-8 text-[var(--text-default,currentColor)]"><div class="mx-auto flex max-w-7xl gap-6">${this.renderList()}${this.renderPanel()}</div></main>`;
  }
}
