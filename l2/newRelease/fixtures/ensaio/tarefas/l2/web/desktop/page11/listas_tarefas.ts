/// <mls fileReference="_102047_/l2/tarefas/web/desktop/page11/listas_tarefas.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { TarefasListas_tarefasShared } from '/_102047_/l2/tarefas/web/shared/listas_tarefas.js';
import '/_102040_/l2/molecules/groupentertext/ml-enter-text.js';
import '/_102040_/l2/molecules/groupentertext/ml-multiline-text.js';
import '/_102040_/l2/molecules/groupnotifyuser/ml-contextual-feedback.js';
import '/_102040_/l2/molecules/groupsearchcontent/ml-search-bar.js';
import '/_102040_/l2/molecules/grouptriggeraction/ml-button-standard.js';
import '/_102040_/l2/molecules/grouptriggeraction/ml-pagination-control.js';
import '/_102040_/l2/molecules/groupviewtable/ml-data-table.js';
import '/_102020_/l2/molecules/ml-scenary.js';
const formatNumber = (value: number) => new Intl.NumberFormat(document.documentElement.lang || undefined).format(value);
/// **collab_i18n_start**
const pageMessage_pt_br = {
pageTitle: 'Listas de tarefas',
tableTitle: 'Listas cadastradas',
searchLabel: 'Buscar por nome',
searchPlaceholder: 'Busque uma lista',
searchHelper: 'Encontre listas por projeto ou área.',
createList: 'Criar lista',
name: 'Nome',
namePlaceholder: 'Ex.: Projeto Aurora',
description: 'Descrição',
descriptionPlaceholder: 'Descreva o projeto ou a área',
openTasks: 'Tarefas abertas',
noDescription: 'Sem descrição',
emptyTitle: 'Nenhuma lista cadastrada',
emptyMessage: 'Crie a primeira lista para organizar as tarefas da equipe.',
loading: 'Carregando listas…',
queryError: 'Não foi possível carregar as listas agora. Tente novamente.',
retry: 'Tentar novamente',
createTitle: 'Nova lista',
editTitle: 'Editar lista',
panelTitle: 'Selecione uma lista',
panelMessage: 'Escolha uma lista na tabela para ajustar seus dados ou crie uma nova lista.',
createPanelMessage: 'Informe como a equipe reconhecerá esta lista.',
editPanelMessage: 'Atualize os dados que identificam esta lista.',
nameHelper: 'O nome é obrigatório e não pode repetir o de outra lista.',
saveNew: 'Registrar lista',
saveChanges: 'Salvar alterações',
createError: 'Não foi possível registrar a lista. Revise o nome e tente novamente.',
saveError: 'Não foi possível salvar as alterações. Revise o nome e tente novamente.',
requiredName: 'Informe o nome da lista.',
loadMore: 'Mais listas',
created: 'Lista registrada.',
saved: 'Alterações salvas.'
};
type PageMessageType = typeof pageMessage_pt_br;
const pageMessages: Record<string, PageMessageType> = { 'pt-br': pageMessage_pt_br };
/// **collab_i18n_end**
@customElement('tarefas--web--desktop--page11--listas_tarefas-102047')
export class TarefasDesktopPage11Listas_tarefasPage extends TarefasListas_tarefasShared {
private msg: PageMessageType = pageMessage_pt_br;
private renderCreateForm() {
const draft = this.cmdCriarListaDraft;
const loading = this.cmdCriarListaStatus === 'loading';
const error = this.cmdCriarListaError ? this.msg.createError : '';
return html`
<section data-organism-id="formularioLista" class="flex h-full flex-col gap-6" aria-busy=${loading}>
<p class="text-sm leading-6 text-[var(--text-muted,currentColor)]">${this.msg.createPanelMessage}</p>
<div class="space-y-5">
<groupentertext--ml-enter-text
.value=${draft.nome ?? ''}
.error=${error}
name="nome"
.placeholder=${this.msg.namePlaceholder}
autocomplete="off"
?required=${true}
?loading=${loading}
@input=${(e: CustomEvent<{ value: string }>) => this.setCmdCriarListaDraft({ ...this.cmdCriarListaDraft, nome: e.detail.value || null })}>
<Label>${this.msg.name}</Label>
<Helper>${this.msg.nameHelper}</Helper>
</groupentertext--ml-enter-text>
<groupentertext--ml-multiline-text
.value=${draft.details.descricao ?? ''}
name="descricao"
.placeholder=${this.msg.descriptionPlaceholder}
.rows=${4}
?loading=${loading}
@input=${(e: CustomEvent<{ value: string }>) => this.setCmdCriarListaDraft({ ...this.cmdCriarListaDraft, details: { descricao: e.detail.value || null } })}>
<Label>${this.msg.description}</Label>
</groupentertext--ml-multiline-text>
</div>
<groupnotifyuser--ml-contextual-feedback type="error" ?visible=${this.cmdCriarListaError !== null} ?dismissible=${false}>
<Message>${this.msg.createError}</Message>
</groupnotifyuser--ml-contextual-feedback>
<div class="mt-auto pt-2">
<grouptriggeraction--ml-button-standard
data-variant="primary"
size="md"
type="button"
data-class="w-full"
?loading=${loading}
@action=${() => this.cmdCriarLista().then(() => { if (this.cmdCriarListaStatus === 'success') { this.setScenario('instrucoes'); this.selectListaTarefas(null); } })}>
<Label>${this.msg.saveNew}</Label>
</grouptriggeraction--ml-button-standard>
</div>
</section>
`;
}
private renderEditForm() {
const draft = this.cmdSalvarListaDraft;
const loading = this.cmdSalvarListaStatus === 'loading';
const error = this.cmdSalvarListaError ? this.msg.saveError : '';
return html`
<section data-organism-id="formularioLista" class="flex h-full flex-col gap-6" aria-busy=${loading}>
<p class="text-sm leading-6 text-[var(--text-muted,currentColor)]">${this.msg.editPanelMessage}</p>
<div class="space-y-5">
<groupentertext--ml-enter-text
.value=${draft.nome ?? ''}
.error=${error}
name="nome"
.placeholder=${this.msg.namePlaceholder}
autocomplete="off"
?required=${true}
?loading=${loading}
@input=${(e: CustomEvent<{ value: string }>) => this.setCmdSalvarListaDraft({ ...this.cmdSalvarListaDraft, nome: e.detail.value || null })}>
<Label>${this.msg.name}</Label>
<Helper>${this.msg.nameHelper}</Helper>
</groupentertext--ml-enter-text>
<groupentertext--ml-multiline-text
.value=${draft.details.descricao ?? ''}
name="descricao"
.placeholder=${this.msg.descriptionPlaceholder}
.rows=${4}
?loading=${loading}
@input=${(e: CustomEvent<{ value: string }>) => this.setCmdSalvarListaDraft({ ...this.cmdSalvarListaDraft, details: { descricao: e.detail.value || null } })}>
<Label>${this.msg.description}</Label>
</groupentertext--ml-multiline-text>
</div>
<groupnotifyuser--ml-contextual-feedback type="error" ?visible=${this.cmdSalvarListaError !== null} ?dismissible=${false}>
<Message>${this.msg.saveError}</Message>
</groupnotifyuser--ml-contextual-feedback>
<div class="mt-auto pt-2">
<grouptriggeraction--ml-button-standard
data-variant="primary"
size="md"
type="button"
data-class="w-full"
?loading=${loading}
@action=${() => this.cmdSalvarLista().then(() => { if (this.cmdSalvarListaStatus === 'success') { this.setScenario('instrucoes'); this.selectListaTarefas(null); } })}>
<Label>${this.msg.saveChanges}</Label>
</grouptriggeraction--ml-button-standard>
</div>
</section>
`;
}
render() {
this.msg = pageMessages[this.getMessageKey(pageMessages)];
const listas = this.listas;
const loading = this.qryListasTarefasStatus === 'loading';
const queryError = this.qryListasTarefasError !== null ? this.msg.queryError : '';
const selectedTitle = this.formularioLista?.nome ?? this.msg.editTitle;
return html`
<main class="min-h-full bg-[var(--page-bg,transparent)] px-8 py-8 text-[var(--text-default,currentColor)]">
<header class="mx-auto mb-7 flex max-w-[1440px] items-center justify-between gap-6">
<h1 class="text-2xl font-semibold tracking-tight text-[var(--text-strong,currentColor)]">${this.msg.pageTitle}</h1>
<grouptriggeraction--ml-button-standard
data-variant="primary"
size="md"
type="button"
@action=${() => { this.selectListaTarefas(null); this.setScenario('criar'); }}>
<Label>${this.msg.createList}</Label>
</grouptriggeraction--ml-button-standard>
</header>
<div class="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)_380px] gap-6">
<section data-organism-id="listasCadastradas" class="min-w-0 rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-6 shadow-sm">
<div class="mb-5 max-w-md">
<groupsearchcontent--ml-search-bar
.value=${this.texto}
name="texto"
.placeholder=${this.msg.searchPlaceholder}
.debounce=${350}
?loading=${loading}
@search=${(e: CustomEvent<{ query: string }>) => this.qryListasTarefas(e.detail.query || null)}
@clear=${() => this.qryListasTarefas(null)}>
<Label>${this.msg.searchLabel}</Label>
<Helper>${this.msg.searchHelper}</Helper>
</groupsearchcontent--ml-search-bar>
</div>
<groupnotifyuser--ml-contextual-feedback type="error" ?visible=${this.qryListasTarefasError !== null} ?dismissible=${false}>
<Message>${this.msg.queryError}</Message>
<Action>
<button type="button" class="font-medium underline focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]" @click=${() => this.qryListasTarefas(this.texto)}>${this.msg.retry}</button>
</Action>
</groupnotifyuser--ml-contextual-feedback>
<groupviewtable--ml-data-table
data-class="w-full"
.value=${listas ? listas.items.map((lista, index) => lista.id === this.selectedListaTarefas ? String(index) : '').filter((value) => value !== '').join(',') : ''}
.selectable=${false}
.error=${queryError}
?loading=${loading}
@rowClick=${(e: CustomEvent<{ index: number }>) => { const lista = this.listas?.items[e.detail.index]; if (lista) { this.selectListaTarefas(lista.id); this.setScenario('editar'); } }}>
<TableCaption>${this.msg.tableTitle}</TableCaption>
<TableHeader>
<TableRow>
<TableHead key="nome" sortable>${this.msg.name}</TableHead>
<TableHead key="descricao">${this.msg.description}</TableHead>
<TableHead key="tarefasAbertas" sortable>${this.msg.openTasks}</TableHead>
</TableRow>
</TableHeader>
<TableBody>
${(listas?.items ?? []).map((lista) => html`
<TableRow key=${lista.id}>
<TableCell>${lista.nome}</TableCell>
<TableCell>${lista.details.descricao || this.msg.noDescription}</TableCell>
<TableCell sort-value=${String(lista.details.quantidadeTarefasAbertas)}>${formatNumber(lista.details.quantidadeTarefasAbertas)}</TableCell>
</TableRow>
`)}
</TableBody>
<Empty>
<div class="py-10 text-center">
<p class="font-medium text-[var(--text-strong,currentColor)]">${this.msg.emptyTitle}</p>
<p class="mt-2 text-sm text-[var(--text-muted,currentColor)]">${this.msg.emptyMessage}</p>
</div>
</Empty>
<Loading><span>${this.msg.loading}</span></Loading>
</groupviewtable--ml-data-table>
${listas?.hasMore ? html`
<div class="mt-5 flex justify-center">
<grouptriggeraction--ml-pagination-control
size="sm"
.currentPage=${listas.page}
.totalPages=${listas.page + 1}
.visiblePages=${3}
?loading=${loading}
@action=${(e: CustomEvent<{ page: number }>) => this.qryListasTarefas(undefined, e.detail.page, e.detail.page > listas.page)}>
</grouptriggeraction--ml-pagination-control>
</div>
` : ''}
</section>
<aside class="min-h-[620px] rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-alt-bg,transparent)] p-6">
<molecules--ml-scenary-102020
mode="scenary"
.value=${this.scenary || (this.selectedListaTarefas !== null ? 'editar' : 'instrucoes')}
.backLabel=${this.msg.panelTitle}
@change=${(e: CustomEvent<{ value: string }>) => { if (e.target === e.currentTarget) { this.setScenario(e.detail.value); if (e.detail.value !== 'editar') this.selectListaTarefas(null); } }}>
<Scene value="instrucoes" title=${this.msg.panelTitle}>
<section data-organism-id="formularioLista" class="flex h-full min-h-[520px] flex-col justify-center text-center">
<p class="mx-auto max-w-xs text-sm leading-6 text-[var(--text-muted,currentColor)]">${this.msg.panelMessage}</p>
<grouptriggeraction--ml-button-standard data-variant="secondary" size="md" type="button" data-class="mx-auto mt-6" @action=${() => { this.selectListaTarefas(null); this.setScenario('criar'); }}>
<Label>${this.msg.createList}</Label>
</grouptriggeraction--ml-button-standard>
</section>
</Scene>
<Scene value="criar" title=${this.msg.createTitle} nav="back" backTo="instrucoes">
${this.renderCreateForm()}
</Scene>
<Scene value="editar" title=${selectedTitle} nav="back" backTo="instrucoes">
${this.renderEditForm()}
</Scene>
</molecules--ml-scenary-102020>
</aside>
</div>
</main>
`;
}
}
