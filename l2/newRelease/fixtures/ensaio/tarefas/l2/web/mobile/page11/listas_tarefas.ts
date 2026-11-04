/// <mls fileReference="_102047_/l2/tarefas/web/mobile/page11/listas_tarefas.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { TarefasListas_tarefasShared } from '/_102047_/l2/tarefas/web/shared/listas_tarefas.js';
import '/_102040_/l2/molecules/groupentertext/ml-floating-text-input.js';
import '/_102040_/l2/molecules/groupentertext/ml-multiline-text.js';
import '/_102040_/l2/molecules/groupnotifyuser/ml-contextual-feedback.js';
import '/_102040_/l2/molecules/groupsearchcontent/ml-search-bar.js';
import '/_102040_/l2/molecules/grouptriggeraction/ml-button-standard.js';
import '/_102040_/l2/molecules/groupviewdata/ml-vertical-record-list.js';
import '/_102020_/l2/molecules/ml-scenary.js';

function formatNumber(value: number) {
  return new Intl.NumberFormat(document.documentElement.lang || undefined).format(value);
}

/// **collab_i18n_start**
const pageMessage_pt_br = {
  pageTitle: 'Listas de tarefas',
  listSceneTitle: 'Listas de tarefas',
  createSceneTitle: 'Nova lista',
  editSceneTitle: 'Editar lista',
  back: 'Voltar',
  searchLabel: 'Buscar lista',
  searchPlaceholder: 'Buscar por nome',
  createList: 'Criar lista',
  listName: 'Nome',
  openTasks: 'Tarefas abertas',
  noLists: 'Nenhuma lista encontrada',
  noListsHint: 'Crie uma lista para agrupar as tarefas por projeto ou área.',
  loadingLists: 'Carregando listas…',
  loadMore: 'Carregar mais listas',
  listErrorTitle: 'Não foi possível carregar as listas',
  tryAgain: 'Tentar novamente',
  namePlaceholder: 'Ex.: Lançamento do produto',
  nameHelper: 'O nome é obrigatório e não pode repetir outra lista.',
  description: 'Descrição',
  descriptionPlaceholder: 'Descreva o projeto ou a área que esta lista agrupa',
  descriptionHelper: 'Opcional',
  createOutcome: 'Criar lista',
  saveOutcome: 'Salvar alterações',
  savingErrorTitle: 'Não foi possível salvar a lista',
  selectedListUnavailable: 'Esta lista não está disponível na coleção carregada.',
  returnToLists: 'Voltar para listas',
  tasksOpenSingular: 'tarefa aberta',
  tasksOpenPlural: 'tarefas abertas'
};
type PageMessageType = typeof pageMessage_pt_br;
const pageMessages: Record<string, PageMessageType> = { 'pt-br': pageMessage_pt_br };
/// **collab_i18n_end**

@customElement('tarefas--web--mobile--page11--listas_tarefas-102047')
export class TarefasMobilePage11Listas_tarefasPage extends TarefasListas_tarefasShared {
  private msg: PageMessageType = pageMessage_pt_br;

  private renderList() {
    const rows = this.listas?.items ?? [];
    const loading = this.qryListasTarefasStatus === 'loading';
    const error = this.qryListasTarefasError;

    return html`
      <section class="flex min-h-full flex-col gap-5 px-4 pb-6 pt-4 bg-[var(--page-bg,transparent)]" data-organism-id="listasCadastradas">
        <div class="flex items-end gap-3">
          <groupsearchcontent--ml-search-bar
            class="min-w-0 flex-1"
            .value=${this.texto}
            .name=${'texto'}
            .placeholder=${this.msg.searchPlaceholder}
            .debounce=${350}
            .disabled=${loading}
            .loading=${loading}
            @search=${(e: CustomEvent<{ query: string }>) => this.qryListasTarefas(e.detail.query, 1)}
            @clear=${() => this.qryListasTarefas(null, 1)}>
            <Label>${this.msg.searchLabel}</Label>
          </groupsearchcontent--ml-search-bar>
          <grouptriggeraction--ml-button-standard
            data-variant="primary"
            size="md"
            @action=${() => { this.selectListaTarefas(null); this.setScenario('nova'); }}>
            <Label>${this.msg.createList}</Label>
          </grouptriggeraction--ml-button-standard>
        </div>

        ${error ? html`
          <div class="rounded-lg border border-[var(--status-error-text,currentColor)] bg-[var(--status-error-bg,transparent)] p-4" role="alert">
            <p class="font-semibold text-[var(--text-strong,currentColor)]">${this.msg.listErrorTitle}</p>
            <p class="mt-1 text-sm text-[var(--text-default,currentColor)]">${error.message}</p>
            <grouptriggeraction--ml-button-standard
              class="mt-3"
              data-variant="secondary"
              size="sm"
              .loading=${loading}
              @action=${() => this.qryListasTarefas(this.texto, 1)}>
              <Label>${this.msg.tryAgain}</Label>
            </grouptriggeraction--ml-button-standard>
          </div>
        ` : html`
          <groupviewdata--ml-vertical-record-list
            .loading=${loading}
            .hoverable=${true}
            @row-click=${(e: CustomEvent<{ index: number }>) => {
              const list = rows[e.detail.index];
              if (list) {
                this.selectListaTarefas(list.id);
                this.setScenario('editar');
              }
            }}>
            <Columns>
              <Column field="nome" header=${this.msg.listName}></Column>
              <Column field="tarefasAbertas" header=${this.msg.openTasks}></Column>
            </Columns>
            <Rows>
              ${rows.map((list) => html`
                <Row ?selected=${list.id === this.selectedListaTarefas}>
                  <Cell>
                    <span class="block text-base font-semibold text-[var(--text-strong,currentColor)]">${list.nome}</span>
                  </Cell>
                  <Cell>
                    <span class="text-sm text-[var(--text-muted,currentColor)]">
                      ${formatNumber(list.details.quantidadeTarefasAbertas)}
                      ${list.details.quantidadeTarefasAbertas === 1 ? this.msg.tasksOpenSingular : this.msg.tasksOpenPlural}
                    </span>
                  </Cell>
                </Row>
              `)}
            </Rows>
            <Loading><p class="py-10 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.loadingLists}</p></Loading>
            <Empty>
              <div class="px-5 py-12 text-center">
                <p class="font-semibold text-[var(--text-strong,currentColor)]">${this.msg.noLists}</p>
                <p class="mt-2 text-sm text-[var(--text-muted,currentColor)]">${this.msg.noListsHint}</p>
              </div>
            </Empty>
          </groupviewdata--ml-vertical-record-list>
        `}

        ${this.listas?.hasMore ? html`
          <grouptriggeraction--ml-button-standard
            class="self-center"
            data-variant="secondary"
            size="md"
            .loading=${loading}
            @action=${() => this.qryListasTarefas(this.texto, (this.listas?.page ?? 0) + 1, true)}>
            <Label>${this.msg.loadMore}</Label>
          </grouptriggeraction--ml-button-standard>
        ` : ''}
      </section>
    `;
  }

  private renderCreateForm() {
    const draft = this.cmdCriarListaDraft;
    const saving = this.cmdCriarListaStatus === 'loading';
    const error = this.cmdCriarListaError;
    return html`
      <form class="flex min-h-full flex-col gap-5 px-4 pb-8 pt-4 bg-[var(--page-bg,transparent)]" data-organism-id="formularioLista" @submit=${(e: SubmitEvent) => { e.preventDefault(); this.cmdCriarLista().then(() => { if (this.cmdCriarListaStatus === 'success') { this.selectListaTarefas(null); this.setScenario('listas'); } }); }}>
        <groupentertext--ml-floating-text-input
          .value=${draft.nome ?? ''}
          .error=${error?.message ?? ''}
          .name=${'nome'}
          .placeholder=${this.msg.namePlaceholder}
          .required=${true}
          .disabled=${saving}
          .loading=${saving}
          @input=${(e: CustomEvent<{ value: string }>) => this.setCmdCriarListaDraft({ ...draft, nome: e.detail.value || null })}>
          <Label>${this.msg.listName}</Label>
          <Helper>${this.msg.nameHelper}</Helper>
        </groupentertext--ml-floating-text-input>
        <groupentertext--ml-multiline-text
          .value=${draft.details.descricao ?? ''}
          .name=${'descricao'}
          .placeholder=${this.msg.descriptionPlaceholder}
          .rows=${4}
          .disabled=${saving}
          @input=${(e: CustomEvent<{ value: string }>) => this.setCmdCriarListaDraft({ ...draft, details: { ...draft.details, descricao: e.detail.value || null } })}>
          <Label>${this.msg.description}</Label>
          <Helper>${this.msg.descriptionHelper}</Helper>
        </groupentertext--ml-multiline-text>
        <groupnotifyuser--ml-contextual-feedback .type=${'error'} .visible=${error !== null} .dismissible=${false}>
          <Title>${this.msg.savingErrorTitle}</Title>
          <Message>${error?.message ?? ''}</Message>
        </groupnotifyuser--ml-contextual-feedback>
        <grouptriggeraction--ml-button-standard class="mt-auto" data-variant="primary" size="lg" type="submit" .disabled=${!draft.nome || saving} .loading=${saving}>
          <Label>${this.msg.createOutcome}</Label>
        </grouptriggeraction--ml-button-standard>
      </form>
    `;
  }

  private renderEditForm() {
    const draft = this.cmdSalvarListaDraft;
    const saving = this.cmdSalvarListaStatus === 'loading';
    const error = this.cmdSalvarListaError;
    if (!this.formularioLista) {
      return html`
        <section class="flex min-h-full flex-col gap-5 px-4 pb-8 pt-4 bg-[var(--page-bg,transparent)]" data-organism-id="formularioLista">
          <p class="text-sm text-[var(--text-default,currentColor)]">${this.msg.selectedListUnavailable}</p>
          <grouptriggeraction--ml-button-standard data-variant="secondary" size="md" @action=${() => { this.selectListaTarefas(null); this.setScenario('listas'); }}>
            <Label>${this.msg.returnToLists}</Label>
          </grouptriggeraction--ml-button-standard>
        </section>
      `;
    }
    return html`
      <form class="flex min-h-full flex-col gap-5 px-4 pb-8 pt-4 bg-[var(--page-bg,transparent)]" data-organism-id="formularioLista" @submit=${(e: SubmitEvent) => { e.preventDefault(); this.cmdSalvarLista().then(() => { if (this.cmdSalvarListaStatus === 'success') { this.selectListaTarefas(null); this.setScenario('listas'); } }); }}>
        <groupentertext--ml-floating-text-input
          .value=${draft.nome ?? ''}
          .error=${error?.message ?? ''}
          .name=${'nome'}
          .placeholder=${this.msg.namePlaceholder}
          .required=${true}
          .disabled=${saving}
          .loading=${saving}
          @input=${(e: CustomEvent<{ value: string }>) => this.setCmdSalvarListaDraft({ ...draft, nome: e.detail.value || null })}>
          <Label>${this.msg.listName}</Label>
          <Helper>${this.msg.nameHelper}</Helper>
        </groupentertext--ml-floating-text-input>
        <groupentertext--ml-multiline-text
          .value=${draft.details.descricao ?? ''}
          .name=${'descricao'}
          .placeholder=${this.msg.descriptionPlaceholder}
          .rows=${4}
          .disabled=${saving}
          @input=${(e: CustomEvent<{ value: string }>) => this.setCmdSalvarListaDraft({ ...draft, details: { ...draft.details, descricao: e.detail.value || null } })}>
          <Label>${this.msg.description}</Label>
          <Helper>${this.msg.descriptionHelper}</Helper>
        </groupentertext--ml-multiline-text>
        <groupnotifyuser--ml-contextual-feedback .type=${'error'} .visible=${error !== null} .dismissible=${false}>
          <Title>${this.msg.savingErrorTitle}</Title>
          <Message>${error?.message ?? ''}</Message>
        </groupnotifyuser--ml-contextual-feedback>
        <grouptriggeraction--ml-button-standard class="mt-auto" data-variant="primary" size="lg" type="submit" .disabled=${!draft.nome || saving} .loading=${saving}>
          <Label>${this.msg.saveOutcome}</Label>
        </grouptriggeraction--ml-button-standard>
      </form>
    `;
  }

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];
    return html`
      <molecules--ml-scenary-102020
        mode="scenary"
        .value=${this.scenary || (this.selectedListaTarefas !== null ? 'editar' : 'listas')}
        .backLabel=${this.msg.back}
        @change=${(e: CustomEvent<{ value: string }>) => {
          if (e.target === e.currentTarget) {
            this.setScenario(e.detail.value);
            if (e.detail.value !== 'editar') this.selectListaTarefas(null);
          }
        }}>
        <Scene value="listas" title=${this.msg.listSceneTitle}>${this.renderList()}</Scene>
        <Scene value="nova" title=${this.msg.createSceneTitle} nav="back" backTo="listas">${this.renderCreateForm()}</Scene>
        <Scene value="editar" title=${this.msg.editSceneTitle} nav="back" backTo="listas">${this.renderEditForm()}</Scene>
      </molecules--ml-scenary-102020>
    `;
  }
}
