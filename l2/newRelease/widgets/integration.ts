/// <mls fileReference="_102035_/l2/newRelease/widgets/integration.ts" enhancement="_102027_/l2/enhancementLit" />

import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import type { Ns5SiblingModule } from '/_102035_/l2/solution/ns5Siblings.js';
import {
  type Ns5IntegrationArtifact,
  type Ns5IntegrationItem,
  type Ns5IntegrationPlugin,
  type Ns5OntologyEntityArtifact,
  type Ns5OntologyEntityV3,
} from '/_102035_/l2/solution/types.js';
import type { NewReleaseVersion } from '/_102035_/l2/newRelease/helpers/context.js';
import type { NewReleaseModuleData } from '/_102035_/l2/newRelease/helpers/l4Reader.js';
import type { NewReleaseTranslate } from '/_102035_/l2/newRelease/helpers/i18n.js';
import { hasItemDiff, hasPluginDiff, idScope } from '/_102035_/l2/newRelease/helpers/itemDiffs.js';
import { changedDot } from '/_102035_/l2/newRelease/helpers/changedDot.js';
import {
  readIntegrationWorkspace,
  type IntegrationWorkspace,
} from '/_102035_/l2/newRelease/integrationRequests.js';
import {
  announceNewReleaseChange,
  canDiscardNewReleaseDraft,
  requestNewReleasePresentation,
  requestNewReleaseEdit,
  type NewReleaseTabPresentation,
  type NewReleaseEditableTab,
  type NewReleaseEditMode,
} from '/_102035_/l2/newRelease/editContract.js';
import type { NewReleaseValidationIssue } from '/_102035_/l2/solution/candidate/tobePaths.js';
import { ns5OntologyEntityView } from '/_102035_/l2/solution/ontologyView.js';
import {
  INTEGRATION_ITEM_LABELS,
  integrationOracleIssues,
  normalizeIntegration,
  patchIntegrationItem,
  type IntegrationPluginView,
} from '/_102035_/l2/newRelease/widgets/integrationModel.js';

interface IntegrationIssueView { severity: 'error' | 'warning'; code: string; message: string; }
type IntegrationLane = 'inbound' | 'outbound';

// Keep the Studio widget independent from the generator/runtime graph: solution/types.js
// re-exports level-1 values that are intentionally unavailable in the browser.
const INTEGRATION_KINDS: readonly Ns5IntegrationItem['kind'][] = ['event', 'moduleEndpoint', 'external'];
const INTEGRATION_EFFECTS: readonly NonNullable<Ns5IntegrationItem['effect']>[] = ['create', 'update', 'transition'];

@customElement('new-release--widgets--integration-102035')
export class NewReleaseIntegration102035 extends StateLitElement implements NewReleaseEditableTab<Ns5IntegrationArtifact | null> {
  @property({ type: Number }) project = 0;
  @property({ type: String, attribute: 'module-name' }) moduleName = '';
  @property({ type: String }) version: NewReleaseVersion = 'asis';
  @property({ attribute: false }) data: NewReleaseModuleData | null = null;
  @property({ attribute: false }) t: NewReleaseTranslate = key => key;
  @property({ type: String }) mode: NewReleaseEditMode = 'view';
  @property({ type: Boolean }) dirty = false;

  @state() private selected = '';
  @state() private saving = false;
  private snapshot = '';
  @state() private draft: Ns5IntegrationArtifact | null = null;
  @state() private workspace: IntegrationWorkspace = { siblings: [], received: [], sent: [], errors: [] };
  @state() private loadingWorkspace = false;
  @state() private gateIssues: IntegrationIssueView[] = [];
  @state() private suppliedIssues: NewReleaseValidationIssue[] = [];
  @state() private editMessage = '';

  createRenderRoot() { return this; }

  updated(changed: PropertyValues) {
    if (changed.has('project') || changed.has('moduleName')) void this.loadWorkspace();
    if (changed.has('data') || changed.has('version') || changed.has('moduleName') || changed.has('project')) { this.cancelEdit(); this.selected = ''; }
    if (changed.has('data') || changed.has('selected') || changed.has('mode') || changed.has('t')) this.present();
  }

  getDraft(): Ns5IntegrationArtifact | null {
    const artifact = this.currentArtifact();
    return artifact ? structuredClone(artifact) : null;
  }

  setIssues(issues: NewReleaseValidationIssue[]) { this.suppliedIssues = integrationOracleIssues(issues); }

  private sourceValue(): unknown { return this.data?.artifacts.integration.value || null; }
  private changedItem(lane: 'inbound' | 'outbound' | 'plugins', id: string) {
    if (!id) return false;
    if (lane === 'plugins') return hasPluginDiff(this.data?.diffs || [], this.view().plugins, id);
    return hasItemDiff(this.data?.diffs || [], 'integration.defs.ts', idScope(lane, 'id', id));
  }
  private view() { return normalizeIntegration(this.mode === 'edit' && this.draft ? this.draft : this.sourceValue()); }
  private currentArtifact(): Ns5IntegrationArtifact | null {
    if (this.mode === 'edit' && this.draft) return this.draft;
    const view = normalizeIntegration(this.sourceValue());
    return view.schema === 'v2' ? view.raw as Ns5IntegrationArtifact : null;
  }
  private entities(): (Ns5OntologyEntityArtifact | Ns5OntologyEntityV3)[] { return this.data?.artifacts.entities.flatMap(item => item.value ? [item.value] : []) || []; }
  private journeys() { return this.data?.artifacts.journeys.map(item => item.value).filter((item): item is NonNullable<typeof item> => !!item) || []; }
  private workflows() { return this.data?.artifacts.workflows.value; }
  private actors() { return this.data?.artifacts.access.value?.actors || []; }

  private async loadWorkspace() {
    if (!this.project || !this.moduleName) return;
    this.loadingWorkspace = true;
    this.workspace = await readIntegrationWorkspace(this.project, this.moduleName);
    this.loadingWorkspace = false;
  }

  private beginEdit() {
    const artifact = this.currentArtifact();
    if (!artifact || this.version.startsWith('release:')) return;
    this.draft = structuredClone(artifact);
    this.snapshot = JSON.stringify(this.draft);
    this.mode = 'edit';
    this.dirty = false;
    this.gateIssues = [];
    this.editMessage = '';
  }

  private cancelEdit() {
    this.draft = null;
    this.mode = 'view';
    this.dirty = false;
    this.gateIssues = [];
    this.editMessage = '';
  }

  private updateDraft(next: Ns5IntegrationArtifact) {
    this.draft = next;
    this.dirty = JSON.stringify(next) !== this.snapshot;
    this.gateIssues = [];
    this.editMessage = '';
  }

  private updateItem(lane: IntegrationLane, index: number, patch: Partial<Omit<Ns5IntegrationItem, 'id' | 'event'>>) {
    if (!this.draft) return;
    this.updateDraft(patchIntegrationItem(this.draft, lane, index, patch));
  }

  private updatePlugin(index: number, patch: Partial<Pick<Ns5IntegrationPlugin, 'description' | 'usedBy'>>) {
    if (!this.draft) return;
    this.updateDraft({ ...this.draft, plugins: this.draft.plugins.map((plugin, position) => position === index ? { ...plugin, ...patch } : plugin) });
  }

  private transitionOptions() { return this.entities().flatMap(entity => ['create', ...ns5OntologyEntityView(entity).transitions.map(transition => transition.transitionId)].map(transition => `${entity.entityId}.${transition}`)); }
  private usedByOptions() {
    const journeys = this.journeys().flatMap(journey => journey.business.steps.map(step => `${journey.journeyId}.${step.stepId}`));
    const processes = this.workflows()?.processes.flatMap(process => process.tasks.map(task => `${process.processId}.${task.taskId}`)) || [];
    return [...journeys, ...processes];
  }

  private siblingsForGate(): Ns5SiblingModule[] { return this.workspace.siblings; }

  private async saveEdit() {
    if (!this.draft || !this.dirty || this.saving || this.version.startsWith('release:')) return;
    this.saving = true;
    try {
      const gate = await import('/_102035_/l2/solution/gates/integration70/gate.js');
      const result = gate.validateNs5Integration(this.draft.inbound, this.draft.outbound, this.draft.plugins, {
        moduleName: this.moduleName,
        actors: this.actors(),
        entities: this.entities().map(ns5OntologyEntityView),
        registryModuleNames: [this.moduleName, ...this.workspace.siblings.map(sibling => sibling.moduleName)],
        siblings: this.siblingsForGate(),
        sourcePrompt: this.data?.module?.sourcePrompt || '',
        journeySteps: this.journeys().map(journey => ({ journeyId: journey.journeyId, stepIds: journey.business.steps.map(step => step.stepId) })),
        processTasks: this.workflows()?.processes.map(process => ({ processId: process.processId, taskIds: process.tasks.map(task => task.taskId) })) || [],
      });
      this.gateIssues = result.issues;
      if (!result.ok) {
        this.editMessage = this.t('integration.gateBlocked');
        return;
      }
      await announceNewReleaseChange(this, { path: 'integration.defs.ts', jsonPath: '$', value: structuredClone(this.draft) });
      this.cancelEdit();
    } catch (error) {
      this.editMessage = this.t('integration.gateUnavailable', { message: error instanceof Error ? error.message : String(error) });
    } finally { this.saving = false; }
  }

  private renderIssues() {
    const oracle = integrationOracleIssues([...(this.data?.validation.issues || []), ...this.suppliedIssues]);
    const issues = [...new Map([...oracle, ...this.gateIssues].map(issue => [`${issue.code}:${issue.message}`, issue])).values()];
    if (!issues.length && !this.editMessage) return this.renderIntegrity();
    return html`${this.renderIntegrity()}<section class="nr-integration__issues" role="alert"><strong>${this.t('integration.issues')}</strong>${this.editMessage ? html`<p>${this.editMessage}</p>` : nothing}${issues.map(issue => html`<div class=${`is-${issue.severity}`}><code>${issue.code}</code><p>${issue.message}</p></div>`)}</section>`;
  }

  private renderIntegrity() {
    const checks = (this.data?.finalizeReport?.checks || []).filter(item => item.checkId === 'I11' || item.checkId === 'I12');
    if (!checks.length) return nothing;
    return html`<section class="nr-integration__integrity">${checks.map(check => html`<article class=${`is-${check.status}`}><span>${check.checkId}</span><strong>${this.t(`oracle.${check.checkId}`)}</strong><p>${this.t(`oracle.status.${check.status}`)}</p><small>${this.t('general.oracleCounts', { errors: check.errorCount, warnings: check.warningCount })}</small></article>`)}</section>`;
  }

  private renderItem(item: Ns5IntegrationItem, lane: IntegrationLane, index: number) {
    if (this.mode === 'edit' && this.draft) {
      const peer = lane === 'inbound' ? item.from || '' : item.to || '';

      const transitions = item.writes?.length === 1 ? this.entities().filter(entity => entity.entityId === item.writes![0]).flatMap(entity => ns5OntologyEntityView(entity).transitions) : [];
      return html`<article class="nr-integration__item is-edit">
        <header><div><span>${this.t(`integration.${lane}.singular`)}</span><code>${item.id}</code></div></header>
        <div class="nr-integration__form">
          <label><span>${this.t('integration.kind')}</span><select @change=${(event: Event) => this.updateItem(lane, index, { kind: (event.currentTarget as HTMLSelectElement).value as Ns5IntegrationItem['kind'] })}>${INTEGRATION_KINDS.map(kind => html`<option value=${kind} ?selected=${item.kind === kind}>${this.t(`integration.kind.${kind}`)}</option>`)}</select></label>
          <label><span>${lane === 'inbound' ? this.t('integration.from') : this.t('integration.to')}</span>${item.kind === 'external' ? html`<input .value=${peer} @input=${(event: Event) => this.updateItem(lane, index, lane === 'inbound' ? { from: (event.currentTarget as HTMLInputElement).value } : { to: (event.currentTarget as HTMLInputElement).value })}>` : html`<select @change=${(event: Event) => this.updateItem(lane, index, lane === 'inbound' ? { from: (event.currentTarget as HTMLSelectElement).value } : { to: (event.currentTarget as HTMLSelectElement).value })}>${lane === 'inbound' ? html`<option value="organization" ?selected=${peer === 'organization'}>${this.t('integration.organization')}</option>` : html`<option value="any" ?selected=${peer === 'any'}>${this.t('integration.any')}</option>`}${[...new Set([peer, ...this.workspace.siblings.map(sibling => sibling.moduleName)])].filter(value => value && value !== "any" && value !== "organization").map(value => html`<option value=${value} ?selected=${peer === value}>${value}</option>`)}</select>`}</label>
          <label><span>${this.t('integration.id')}</span><input readonly .value=${item.id}></label>
          <label><span>${this.t('integration.event')}</span><input readonly .value=${item.event || ''}></label>
          ${lane === 'inbound' ? html`
            <label><span>${this.t('integration.effect')}</span><select @change=${(event: Event) => this.updateItem(lane, index, { effect: (event.currentTarget as HTMLSelectElement).value as Ns5IntegrationItem['effect'], transitionRef: undefined })}>${INTEGRATION_EFFECTS.map(effect => html`<option value=${effect} ?selected=${item.effect === effect}>${this.t(`integration.effect.${effect}`)}</option>`)}</select></label>
            <label><span>${this.t('integration.writes')}</span><select multiple @change=${(event: Event) => this.updateItem(lane, index, { writes: [...(event.currentTarget as HTMLSelectElement).selectedOptions].map(option => option.value) })}>${[...new Set([...(item.writes || []), ...this.entities().map(entity => entity.entityId)])].map(id => html`<option value=${id} ?selected=${item.writes?.includes(id)}>${this.entities().find(entity => entity.entityId === id)?.title || id}</option>`)}</select></label>
            ${item.effect === 'transition' ? html`<label><span>${this.t('integration.transition')}</span><select @change=${(event: Event) => this.updateItem(lane, index, { transitionRef: (event.currentTarget as HTMLSelectElement).value })}><option value="" ?selected=${!item.transitionRef}>${this.t('integration.choose')}</option>${[...new Set([...(item.transitionRef ? [item.transitionRef] : []), ...transitions.map(transition => transition.transitionId)])].map(id => html`<option value=${id} ?selected=${item.transitionRef === id}>${id}</option>`)}</select></label>` : nothing}
          ` : html`
            <label><span>${this.t('integration.on')}</span><select @change=${(event: Event) => this.updateItem(lane, index, { on: (event.currentTarget as HTMLSelectElement).value })}><option value="" ?selected=${!item.on}>${this.t('integration.choose')}</option>${[...new Set([...(item.on ? [item.on] : []), ...this.transitionOptions()])].map(option => html`<option value=${option} ?selected=${item.on === option}>${option}</option>`)}</select></label>
          `}
            <label><span>${this.t('integration.entities')}</span><select multiple @change=${(event: Event) => this.updateItem(lane, index, { entityRefs: [...(event.currentTarget as HTMLSelectElement).selectedOptions].map(option => option.value) })}>${[...new Set([...item.entityRefs, ...this.entities().map(entity => entity.entityId)])].map(id => html`<option value=${id} ?selected=${item.entityRefs.includes(id)}>${this.entities().find(entity => entity.entityId === id)?.title || id}</option>`)}</select></label>
          <label class="is-wide"><span>${this.t('integration.itemDescription')}</span><textarea .value=${item.description} @input=${(event: Event) => this.updateItem(lane, index, { description: (event.currentTarget as HTMLTextAreaElement).value })}></textarea></label>
        </div>
      </article>`;
    }
    const trigger = lane === 'inbound' ? item.from : item.on;
    const destination = lane === 'inbound' ? (item.writes || item.entityRefs).join(', ') : item.to;
    return html`<article class="nr-integration__flow"><span>${trigger || this.t('integration.notDeclared')}</span><span aria-hidden="true">→</span><button type="button" @click=${() => this.select(`${lane}:${index}`)}>${item.event || item.id}${changedDot(this.changedItem(lane, item.id), this.t)}</button><span aria-hidden="true">→</span><span>${destination === 'any' ? this.t('integration.any') : destination || this.t('integration.notDeclared')}</span></article>`;
  }

  private renderLane(lane: IntegrationLane, items: Ns5IntegrationItem[]) {
    return html`<section class=${`nr-integration__lane lane-${lane}`}><header><span>${this.t(`integration.${lane}`)}</span><strong>${items.length}</strong></header><div>${items.map((item, index) => this.renderItem(item, lane, index))}${!items.length ? html`<p class="nr-integration__lane-empty">${this.t(`integration.${lane}Empty`)}</p>` : nothing}</div></section>`;
  }

  private renderPlugin(plugin: IntegrationPluginView, index: number) {
    if (this.mode === 'edit' && this.draft) {
      const current = this.draft.plugins[index];
      if (!current) return nothing;
      const options = [...new Set([...current.usedBy, ...this.usedByOptions()])];
      return html`<article class="nr-integration__plugin is-edit"><header><label>${this.t('integration.plugin')}<input readonly .value=${current.pluginId}></label></header><label>${this.t('integration.usedBy')}<select multiple @change=${(event: Event) => this.updatePlugin(index, {usedBy: [...(event.currentTarget as HTMLSelectElement).selectedOptions].map(option => option.value)})}>${options.map(value => html`<option value=${value} ?selected=${current.usedBy.includes(value)}>${value}</option>`)}</select></label><label>${this.t('integration.itemDescription')}<textarea .value=${current.description} @input=${(event: Event) => this.updatePlugin(index, {description: (event.currentTarget as HTMLTextAreaElement).value})}></textarea></label></article>`;
    }
    return html`<article class="nr-integration__plugin"><button type="button" @click=${() => this.select(`plugins:${index}`)}>${plugin.pluginId}${changedDot(this.changedItem('plugins', plugin.pluginId), this.t)}</button><p>${plugin.description}</p>${(plugin.usedBy.length ? plugin.usedBy : plugin.legacyEntityRefs).map(value => html`<code>${value}</code>`)}</article>`;
  }

  private select(id: string) {
    if (this.saving || !canDiscardNewReleaseDraft(this)) return;
    if (this.version === 'asis' && this.currentArtifact()) { requestNewReleaseEdit(this, id); return; }
    this.cancelEdit(); this.selected = id;
    if (!this.version.startsWith('release:')) this.beginEdit();
    this.present();
  }
  private back() {
    if (this.saving || !canDiscardNewReleaseDraft(this)) return;
    this.cancelEdit(); this.selected = ''; requestNewReleasePresentation(this, 'graph'); this.present();
  }
  private present() {
    const view = this.view();
    const presentation: NewReleaseTabPresentation = {
      detail: !!this.selected, back: () => this.back(), select: id => { if (id.includes(':')) this.select(id); },
      nodes: (['inbound', 'outbound', 'plugins'] as const).map(lane => ({id: lane, label: this.t(`integration.${lane}`), value: '', children: view[lane].map((item, index) => ({id: `${lane}:${index}`, label: 'pluginId' in item ? item.pluginId : item.event || item.id, value: item.description, changed: this.changedItem(lane, 'pluginId' in item ? item.pluginId : item.id), children: []}))})),
    };
    this.dispatchEvent(new CustomEvent('nr-view-state', {bubbles: true, composed: true, detail: presentation}));
  }

  private renderRequests() {
    const requests = [...this.workspace.received.map(item => ({ ...item, direction: 'received' as const })), ...this.workspace.sent.map(item => ({ ...item, direction: 'sent' as const }))];
    return html`<section class="nr-integration__requests"><header><div><span>${this.t('integration.requests')}</span><p>${this.t('integration.requestsDescription')}</p></div><strong>${requests.length}</strong></header><div class="nr-integration__request-list">${this.loadingWorkspace ? html`<p>${this.t('integration.requestsLoading')}</p>` : requests.map(request => html`<article class=${`is-${request.direction}`}><i></i><div><span>${request.direction === 'sent' ? this.t('integration.requestSent') : this.t('integration.requestReceived')}</span><strong>${request.value.eventId}</strong><p>${request.value.description}</p><code>${request.value.requestedBy} → ${request.targetModule === 'organization' ? request.value.to : request.targetModule}</code></div><b>${this.t('integration.requested')}</b></article>`)}${!this.loadingWorkspace && !requests.length ? html`<p>${this.t('integration.requestsEmpty')}</p>` : nothing}</div></section>`;
  }

  render() {
    const view = this.view();
    if (!this.sourceValue()) return html`<section class="nr-integration__empty"><h2>${this.t('integration.emptyTitle')}</h2><p>${this.t('integration.emptyBody')}</p>${this.renderIssues()}${this.renderRequests()}</section>`;
    if (view.schema === 'unknown') return html`<section class="nr-integration__unknown" role="alert"><h2>${this.t('integration.unknownTitle')}</h2><p>${this.t('integration.unknownBody', { version: view.schemaVersion || this.t('integration.notRecorded') })}</p><pre>${JSON.stringify(view.raw, null, 2)}</pre></section>`;
    const [lane, position] = this.selected.split(':');
    const index = Number(position);
    const item = lane === 'inbound' || lane === 'outbound' ? view[lane][index] : null;
    const plugin = lane === 'plugins' ? view.plugins[index] : null;
    return html`<section class="nr-integration">
      ${this.selected ? html`<section class="nr-integration__detail"><header><h2>${plugin?.pluginId || item?.event || item?.id}</h2>${view.schema === 'v2' && this.mode === 'view' && !this.version.startsWith('release:') ? html`<button type="button" @click=${this.beginEdit}>${this.t('integration.edit')}</button>` : nothing}</header>
        <fieldset ?disabled=${this.saving}>${item && (lane === 'inbound' || lane === 'outbound') ? (this.mode === 'edit' ? this.renderItem(item, lane, index) : html`<dl>${Object.entries(item).map(([key, value]) => html`<div><dt>${this.t(INTEGRATION_ITEM_LABELS[key as keyof Ns5IntegrationItem])}</dt><dd>${Array.isArray(value) ? value.join(', ') : value}</dd></div>`)}</dl>`) : plugin ? this.renderPlugin(plugin, index) : nothing}</fieldset>
        ${this.mode === 'edit' ? html`<footer class="nr-integration__edit-footer"><span>${this.t(this.dirty ? 'integration.unsaved' : 'integration.noChanges')}</span><div><button type="button" ?disabled=${this.saving} @click=${() => {if (canDiscardNewReleaseDraft(this)) this.cancelEdit();}}>${this.t('integration.cancel')}</button><button class="is-primary" type="button" ?disabled=${!this.dirty || this.saving} @click=${this.saveEdit}>${this.t('integration.save')}</button></div></footer>` : nothing}
      </section>` : html`<div class="nr-integration__lanes">${this.renderLane('inbound', view.inbound)}${this.renderLane('outbound', view.outbound)}</div><section class="nr-integration__plugins"><header><span>${this.t('integration.plugins')}</span><strong>${view.plugins.length}</strong></header><div>${view.plugins.map((plugin, index) => this.renderPlugin(plugin, index))}${!view.plugins.length ? html`<p>${this.t('integration.pluginsEmpty')}</p>` : nothing}</div></section>${this.renderRequests()}`}
      ${this.renderIssues()}
    </section>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'new-release--widgets--integration-102035': NewReleaseIntegration102035; } }
