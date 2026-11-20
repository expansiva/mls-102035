/// <mls fileReference="_102035_/l2/newRelease/widgets/integration/integration.ts" enhancement="_102027_/l2/enhancementLit" />

import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import type { Ns5SiblingModule } from '/_102035_/l2/solution/ns5Siblings.js';
import {
  type Ns5IntegrationArtifact,
  type Ns5IntegrationItem,
  type Ns5IntegrationPlugin,
  type Ns5IntegrationExternalSystem,
  type Ns5IntegrationConnection,
  type Ns5OntologyEntityArtifact,
  type Ns5OntologyEntityV3,
} from '/_102035_/l2/solution/types.js';
import type { NewReleaseVersion } from '/_102035_/l2/newRelease/helpers/context.js';
import type { NewReleaseModuleData } from '/_102035_/l2/newRelease/helpers/l4Reader.js';
import type { NewReleaseTranslate } from '/_102035_/l2/newRelease/helpers/i18n.js';
import { hasItemDiff, hasPluginDiff, hasConnectionDiff, hasExternalSystemDiff, idScope } from '/_102035_/l2/newRelease/helpers/itemDiffs.js';
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
  patchExternalSystem,
  patchExternalSetting,
  patchExternalOperation,
  type IntegrationPluginView,
} from '/_102035_/l2/newRelease/widgets/integration/integrationModel.js';

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
  @state() private workspace: IntegrationWorkspace = { siblings: [], siblingSystems: [], received: [], sent: [], errors: [] };
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

  private updateSystem(id: string, patch: Partial<Pick<Ns5IntegrationExternalSystem, 'title' | 'description'>>) {
    if (this.draft) this.updateDraft(patchExternalSystem(this.draft, id, patch));
  }
  private updateSetting(systemId: string, id: string, patch: Partial<Ns5IntegrationExternalSystem['settings'][number]>) {
    if (this.draft) this.updateDraft(patchExternalSetting(this.draft, systemId, id, patch));
  }
  private updateOperation(systemId: string, id: string, patch: Partial<Ns5IntegrationExternalSystem['operations'][number]>) {
    if (this.draft) this.updateDraft(patchExternalOperation(this.draft, systemId, id, patch));
  }
  private changedSystem(id: string) {
    return hasExternalSystemDiff(this.data?.diffs || [], id) || this.view().connections.some(connection =>
      connection.connectionId === id && hasConnectionDiff(this.data?.diffs || [], connection.connectionId, connection.operationId));
  }
  private systemConnections(system: Ns5IntegrationExternalSystem, operationId: string) {
    return this.view().connections.filter(connection => connection.connectionId === system.id && connection.operationId === operationId);
  }
  private otherConnections() {
    const systems = this.view().externalSystems;
    return this.view().connections.filter(connection => !systems.some(system => system.id === connection.connectionId && system.operations.some(operation => operation.operationId === connection.operationId)));
  }
  private renderConnection(connection: Ns5IntegrationConnection) {
    return html`<article class="nr-integration__connection"><button type="button" @click=${() => this.select(`connection:${connection.connectionId}:${connection.operationId}`)}>${connection.connectionId}.${connection.operationId}${changedDot(hasConnectionDiff(this.data?.diffs || [], connection.connectionId, connection.operationId), this.t)}</button><p>${connection.description}</p></article>`;
  }
  private renderSystem(system: Ns5IntegrationExternalSystem) {
    return html`<article class="nr-integration__system"><button type="button" @click=${() => this.select(`system:${system.id}`)}><strong>${system.title || system.id}</strong>${changedDot(this.changedSystem(system.id), this.t)}</button><p>${system.description}</p><small>${this.t('integration.externalSystemSettingsCount', {count: system.settings.length})} · ${this.t('integration.externalSystemOperationsCount', {count: system.operations.length})}</small></article>`;
  }
  private renderSystemDetail(system: Ns5IntegrationExternalSystem) {
    const editing = this.mode === 'edit' && !!this.draft;
    return html`<div class="nr-integration__system-detail"><label><span>${this.t('integration.externalSystemId')}</span><input readonly .value=${system.id}></label><label><span>${this.t('integration.externalSystemTitle')}</span><input ?readonly=${!editing} .value=${system.title} @input=${(event: Event) => this.updateSystem(system.id, {title: (event.currentTarget as HTMLInputElement).value})}></label><label><span>${this.t('integration.externalSystemDescription')}</span><textarea ?readonly=${!editing} .value=${system.description} @input=${(event: Event) => this.updateSystem(system.id, {description: (event.currentTarget as HTMLTextAreaElement).value})}></textarea></label><section class="nr-integration__settings"><h3>${this.t('integration.settings')}</h3>${system.settings.map(setting => html`<article><label><span>${this.t('integration.settingId')}</span><input readonly .value=${setting.id}></label><label><span>${this.t('integration.settingTitle')}</span><input ?readonly=${!editing} .value=${setting.title} @input=${(event: Event) => this.updateSetting(system.id, setting.id, {title: (event.currentTarget as HTMLInputElement).value})}></label><label><span>${this.t('integration.settingDescription')}</span><textarea ?readonly=${!editing} .value=${setting.description} @input=${(event: Event) => this.updateSetting(system.id, setting.id, {description: (event.currentTarget as HTMLTextAreaElement).value})}></textarea></label><label class="nr-integration__secret"><span>${this.t('integration.settingSecret')}</span><input type="checkbox" ?disabled=${!editing} .checked=${setting.secret} @change=${(event: Event) => this.updateSetting(system.id, setting.id, {secret: (event.currentTarget as HTMLInputElement).checked})}></label></article>`)}</section><section class="nr-integration__operations"><h3>${this.t('integration.operations')}</h3>${system.operations.map(operation => html`<article><label><span>${this.t('integration.operationId')}</span><input readonly .value=${operation.operationId}></label><label><span>${this.t('integration.operationDirection')}</span><select ?disabled=${!editing} @change=${(event: Event) => this.updateOperation(system.id, operation.operationId, {direction: (event.currentTarget as HTMLSelectElement).value as 'call' | 'serve'})}><option value="call" ?selected=${operation.direction === 'call'}>${this.t('integration.operationCall')}</option><option value="serve" ?selected=${operation.direction === 'serve'}>${this.t('integration.operationServe')}</option></select></label><label><span>${this.t('integration.operationDescription')}</span><textarea ?readonly=${!editing} .value=${operation.description} @input=${(event: Event) => this.updateOperation(system.id, operation.operationId, {description: (event.currentTarget as HTMLTextAreaElement).value})}></textarea></label>${this.systemConnections(system, operation.operationId).map(connection => this.renderConnection(connection))}</article>`)}</section></div>`;
  }
  private renderConnectionDetail(connection: Ns5IntegrationConnection) {
    return html`<dl>${Object.entries(connection).map(([key, value]) => html`<div><dt>${this.t(`integration.connection${key[0].toUpperCase()}${key.slice(1)}`)}</dt><dd>${key === 'direction' ? this.t(`integration.operation${connection.direction === 'call' ? 'Call' : 'Serve'}`) : key === 'effect' ? this.t(`integration.connectionEffect.${connection.effect}`) : Array.isArray(value) ? value.join(', ') : String(value)}</dd></div>`)}</dl>`;
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
      if (this.loadingWorkspace || this.workspace.errors.length) throw new Error(this.workspace.errors.map(error => `${error.path}: ${error.message}`).join('\n') || 'Integration workspace is loading');
      const gate = await import('/_102035_/l2/solution/gates/integration70/gate.js');
      const result = gate.validateNs5Integration(this.draft.inbound, this.draft.outbound, this.draft.plugins, {
        moduleName: this.moduleName,
        actors: this.actors(),
        entities: this.entities().map(ns5OntologyEntityView),
        registryModuleNames: [this.moduleName, ...this.workspace.siblings.map(sibling => sibling.moduleName)],
        siblings: this.siblingsForGate(),
        siblingSystems: this.workspace.siblingSystems,
        sourcePrompt: this.data?.module?.sourcePrompt || '',
        journeySteps: this.journeys().map(journey => ({ journeyId: journey.journeyId, stepIds: journey.business.steps.map(step => step.stepId) })),
        processTasks: this.workflows()?.processes.map(process => ({ processId: process.processId, taskIds: process.tasks.map(task => task.taskId) })) || [],
      }, this.draft.connections || [], this.draft.externalSystems || []);
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
            <label><span>${this.t('integration.effect')}</span><select @change=${(event: Event) => {
              const value = (event.currentTarget as HTMLSelectElement).value;
              this.updateItem(lane, index, value
                ? { effect: value as Ns5IntegrationItem['effect'], transitionRef: undefined }
                : { effect: undefined, transitionRef: undefined });
            }}><option value="" ?selected=${!item.effect}>${this.t('integration.choose')}</option>${INTEGRATION_EFFECTS.map(effect => html`<option value=${effect} ?selected=${item.effect === effect}>${this.t(`integration.effect.${effect}`)}</option>`)}</select></label>
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
      nodes: [
        ...(['inbound', 'outbound', 'plugins'] as const).map(lane => ({id: lane, label: this.t(`integration.${lane}`), value: '', children: view[lane].map((item, index) => ({id: `${lane}:${index}`, label: 'pluginId' in item ? item.pluginId : item.id, value: '', searchText: `${'event' in item ? item.event || '' : ''} ${item.description}`, changed: this.changedItem(lane, 'pluginId' in item ? item.pluginId : item.id), children: []}))})),
        {id: 'systems', label: this.t('integration.externalSystems'), value: '', children: view.externalSystems.map(system => ({id: `system:${system.id}`, label: system.title || system.id, value: system.description, searchText: `${system.id} ${system.title} ${system.description}`, changed: this.changedSystem(system.id), children: [
          {id: `settings:${system.id}`, label: this.t('integration.settings'), value: '', children: system.settings.map(setting => ({id: `setting:${system.id}:${setting.id}`, label: setting.title || setting.id, value: '', searchText: setting.description, changed: this.changedSystem(system.id), children: []}))},
          {id: `operations:${system.id}`, label: this.t('integration.operations'), value: '', children: system.operations.map(operation => {
            const connections = this.systemConnections(system, operation.operationId).map(connection => ({id: `connection:${connection.connectionId}:${connection.operationId}`, label: connection.connectionId, value: '', searchText: connection.description, changed: hasConnectionDiff(this.data?.diffs || [], connection.connectionId, connection.operationId), children: []}));
            return {id: `operation:${system.id}:${operation.operationId}`, label: operation.operationId, value: connections.length ? operation.description : '', searchText: operation.description, changed: this.changedSystem(system.id), children: connections};
          })},
        ]}))},
        {id: 'otherConnections', label: this.t('integration.otherConnections'), value: '', children: this.otherConnections().map(connection => ({id: `connection:${connection.connectionId}:${connection.operationId}`, label: connection.connectionId, value: '', searchText: connection.description, changed: hasConnectionDiff(this.data?.diffs || [], connection.connectionId, connection.operationId), children: []}))},
      ],
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
    const system = lane === 'system' ? view.externalSystems.find(value => value.id === position) : null;
    const connection = lane === 'connection' ? view.connections.find(value => value.connectionId === position && value.operationId === this.selected.split(':')[2]) : null;
    const detailSystem = system || (lane === 'setting' || lane === 'operation' ? view.externalSystems.find(value => value.id === position) : null);
    return html`<section class="nr-integration">
      ${this.selected ? html`<section class="nr-integration__detail"><header><h2>${detailSystem?.title || connection?.connectionId || plugin?.pluginId || item?.event || item?.id}</h2>${view.schema === 'v2' && this.mode === 'view' && !this.version.startsWith('release:') && !connection ? html`<button type="button" @click=${this.beginEdit}>${this.t('integration.edit')}</button>` : nothing}</header>
        <fieldset ?disabled=${this.saving}>${item && (lane === 'inbound' || lane === 'outbound') ? (this.mode === 'edit' ? this.renderItem(item, lane, index) : html`<dl>${Object.entries(item).map(([key, value]) => html`<div><dt>${this.t(INTEGRATION_ITEM_LABELS[key as keyof Ns5IntegrationItem])}</dt><dd>${Array.isArray(value) ? value.join(', ') : value}</dd></div>`)}</dl>`) : plugin ? this.renderPlugin(plugin, index) : detailSystem ? this.renderSystemDetail(detailSystem) : connection ? this.renderConnectionDetail(connection) : nothing}</fieldset>
        ${this.mode === 'edit' ? html`<footer class="nr-integration__edit-footer"><span>${this.t(this.dirty ? 'integration.unsaved' : 'integration.noChanges')}</span><div><button type="button" ?disabled=${this.saving} @click=${() => {if (canDiscardNewReleaseDraft(this)) this.cancelEdit();}}>${this.t('integration.cancel')}</button><button class="is-primary" type="button" ?disabled=${!this.dirty || this.saving} @click=${this.saveEdit}>${this.t('integration.save')}</button></div></footer>` : nothing}
      </section>` : html`<div class="nr-integration__lanes">${this.renderLane('inbound', view.inbound)}${this.renderLane('outbound', view.outbound)}</div><section class="nr-integration__plugins"><header><span>${this.t('integration.plugins')}</span><strong>${view.plugins.length}</strong></header><div>${view.plugins.map((plugin, index) => this.renderPlugin(plugin, index))}${!view.plugins.length ? html`<p>${this.t('integration.pluginsEmpty')}</p>` : nothing}</div></section><section class="nr-integration__systems"><header><span>${this.t('integration.externalSystems')}</span><strong>${view.externalSystems.length}</strong></header><p>${this.t('integration.externalSystemsDescription')}</p><div class="nr-integration__system-list">${view.externalSystems.map(system => this.renderSystem(system))}${!view.externalSystems.length ? html`<p>${this.t('integration.externalSystemsEmpty')}</p>` : nothing}</div></section><section class="nr-integration__connections"><h3>${this.t('integration.otherConnections')}</h3>${this.otherConnections().map(connection => this.renderConnection(connection))}${!this.otherConnections().length ? html`<p>${this.t('integration.connectionsEmpty')}</p>` : nothing}</section>${this.renderRequests()}`}
      ${this.renderIssues()}
    </section>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'new-release--widgets--integration-102035': NewReleaseIntegration102035; } }
