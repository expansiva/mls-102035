/// <mls fileReference="_102035_/l2/newRelease/widgets/integration.ts" enhancement="_102027_/l2/enhancementLit" />

import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import type { Ns5SiblingModule } from '/_102035_/l2/agentNewSolution5/helpers/ns5Siblings.js';
import {
  type Ns5IntegrationArtifact,
  type Ns5IntegrationItem,
  type Ns5IntegrationPlugin,
  type Ns5OntologyEntityArtifact,
} from '/_102035_/l2/solution/types.js';
import type { NewReleaseVersion } from '/_102035_/l2/newRelease/helpers/context.js';
import type { NewReleaseModuleData } from '/_102035_/l2/newRelease/helpers/l4Reader.js';
import type { NewReleaseTranslate } from '/_102035_/l2/newRelease/helpers/i18n.js';
import {
  readIntegrationWorkspace,
  writeIntegrationRequest,
  type IntegrationWorkspace,
} from '/_102035_/l2/newRelease/integrationRequests.js';
import {
  announceNewReleaseChange,
  type NewReleaseEditableTab,
  type NewReleaseEditMode,
} from '/_102035_/l2/newRelease/editContract.js';
import type { NewReleaseValidationIssue } from '/_102035_/l2/newRelease/tobe.js';
import { nextMemberId } from '/_102035_/l2/newRelease/widgets/workflowsModel.js';
import {
  integrationOracleIssues,
  normalizeIntegration,
  type IntegrationPluginView,
} from '/_102035_/l2/newRelease/widgets/integrationModel.js';

interface IntegrationIssueView { severity: 'error' | 'warning'; code: string; message: string; }
type IntegrationLane = 'inbound' | 'outbound';

// Keep the Studio widget independent from the generator/runtime graph: solution/types.js
// re-exports level-1 values that are intentionally unavailable in the browser.
const NS5_INTEGRATION_REQUEST_SCHEMA_VERSION = '2026-09-12-ns5-integration-request-v1';
const NS5_PLUGIN_IDS: readonly string[] = ['stripe', 'cardPayment'];

@customElement('new-release--widgets--integration-102035')
export class NewReleaseIntegration102035 extends StateLitElement implements NewReleaseEditableTab<Ns5IntegrationArtifact | null> {
  @property({ type: Number }) project = 0;
  @property({ type: String, attribute: 'module-name' }) moduleName = '';
  @property({ type: String }) version: NewReleaseVersion = 'asis';
  @property({ attribute: false }) data: NewReleaseModuleData | null = null;
  @property({ attribute: false }) t: NewReleaseTranslate = key => key;
  @property({ type: String }) mode: NewReleaseEditMode = 'view';
  @property({ type: Boolean }) dirty = false;

  @state() private draft: Ns5IntegrationArtifact | null = null;
  @state() private workspace: IntegrationWorkspace = { siblings: [], received: [], sent: [], errors: [] };
  @state() private loadingWorkspace = false;
  @state() private gateIssues: IntegrationIssueView[] = [];
  @state() private suppliedIssues: NewReleaseValidationIssue[] = [];
  @state() private editMessage = '';
  @state() private requestTarget = '';
  @state() private requestEvent = '';
  @state() private requestOn = '';
  @state() private requestDescription = '';
  @state() private requestEntities: string[] = [];
  @state() private requestMessage = '';

  createRenderRoot() { return this; }

  updated(changed: PropertyValues) {
    if (changed.has('project') || changed.has('moduleName')) void this.loadWorkspace();
  }

  getDraft(): Ns5IntegrationArtifact | null {
    const artifact = this.currentArtifact();
    return artifact ? structuredClone(artifact) : null;
  }

  setIssues(issues: NewReleaseValidationIssue[]) { this.suppliedIssues = integrationOracleIssues(issues); }

  private sourceValue(): unknown { return this.data?.artifacts.integration.value || null; }
  private view() { return normalizeIntegration(this.mode === 'edit' && this.draft ? this.draft : this.sourceValue()); }
  private currentArtifact(): Ns5IntegrationArtifact | null {
    if (this.mode === 'edit' && this.draft) return this.draft;
    const view = normalizeIntegration(this.sourceValue());
    return view.schema === 'v2' ? view.raw as Ns5IntegrationArtifact : null;
  }
  private entities(): Ns5OntologyEntityArtifact[] { return this.data?.artifacts.entities.map(item => item.value).filter((item): item is Ns5OntologyEntityArtifact => !!item) || []; }
  private journeys() { return this.data?.artifacts.journeys.map(item => item.value).filter((item): item is NonNullable<typeof item> => !!item) || []; }
  private workflows() { return this.data?.artifacts.workflows.value; }
  private actors() { return this.data?.artifacts.access.value?.actors || []; }

  private async loadWorkspace() {
    if (!this.project || !this.moduleName) return;
    this.loadingWorkspace = true;
    this.workspace = await readIntegrationWorkspace(this.project, this.moduleName);
    this.loadingWorkspace = false;
    if (!this.requestTarget) this.requestTarget = this.workspace.siblings[0]?.moduleName || '';
  }

  private beginEdit() {
    const artifact = this.currentArtifact();
    if (!artifact) return;
    this.draft = structuredClone(artifact);
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
    this.dirty = true;
    this.gateIssues = [];
    this.editMessage = '';
  }

  private updateItem(lane: IntegrationLane, index: number, patch: Partial<Ns5IntegrationItem>) {
    if (!this.draft) return;
    this.updateDraft({ ...this.draft, [lane]: this.draft[lane].map((item, position) => position === index ? { ...item, ...patch } : item) });
  }

  private addItem(lane: IntegrationLane) {
    if (!this.draft) return;
    const ids = [...this.draft.inbound, ...this.draft.outbound].map(item => item.id);
    const id = nextMemberId(lane === 'inbound' ? 'inbound' : 'outbound', ids);
    const item: Ns5IntegrationItem = lane === 'inbound'
      ? { id, kind: 'event', from: this.workspace.siblings[0]?.moduleName || 'organization', event: '', writes: [], effect: 'create', description: this.t('integration.newInboundDescription'), entityRefs: [] }
      : { id, kind: 'event', to: 'any', event: id, on: '', description: this.t('integration.newOutboundDescription'), entityRefs: [] };
    this.updateDraft({ ...this.draft, [lane]: [...this.draft[lane], item] });
  }

  private removeItem(lane: IntegrationLane, index: number) {
    if (!this.draft) return;
    this.updateDraft({ ...this.draft, [lane]: this.draft[lane].filter((_, position) => position !== index) });
  }

  private addPlugin() {
    if (!this.draft) return;
    const unused = NS5_PLUGIN_IDS.find(id => !this.draft!.plugins.some(plugin => plugin.pluginId === id)) || NS5_PLUGIN_IDS[0] || '';
    this.updateDraft({ ...this.draft, plugins: [...this.draft.plugins, { pluginId: unused, description: this.t('integration.newPluginDescription'), usedBy: [] }] });
  }

  private updatePlugin(index: number, patch: Partial<Ns5IntegrationPlugin>) {
    if (!this.draft) return;
    this.updateDraft({ ...this.draft, plugins: this.draft.plugins.map((plugin, position) => position === index ? { ...plugin, ...patch } : plugin) });
  }

  private removePlugin(index: number) {
    if (!this.draft) return;
    this.updateDraft({ ...this.draft, plugins: this.draft.plugins.filter((_, position) => position !== index) });
  }

  private peerEvents(peer: string) { return this.workspace.siblings.find(item => item.moduleName === peer)?.events || []; }
  private transitionOptions() { return this.entities().flatMap(entity => ['create', ...entity.transitions.map(transition => transition.transitionId)].map(transition => `${entity.entityId}.${transition}`)); }
  private usedByOptions() {
    const journeys = this.journeys().flatMap(journey => journey.business.steps.map(step => `${journey.journeyId}.${step.stepId}`));
    const processes = this.workflows()?.processes.flatMap(process => process.tasks.map(task => `${process.processId}.${task.taskId}`)) || [];
    return [...journeys, ...processes];
  }

  private siblingsForGate(): Ns5SiblingModule[] { return this.workspace.siblings; }

  private async saveEdit() {
    if (!this.draft || !this.dirty) return;
    try {
      const gate = await import('/_102035_/l2/agentNewSolution5/steps/integration70/gate.js');
      const result = gate.validateNs5Integration(this.draft.inbound, this.draft.outbound, this.draft.plugins, {
        moduleName: this.moduleName,
        actors: this.actors(),
        entities: this.entities(),
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
      announceNewReleaseChange(this, { path: 'integration.defs.ts', jsonPath: '$', value: structuredClone(this.draft) });
      this.cancelEdit();
    } catch (error) {
      this.editMessage = this.t('integration.gateUnavailable', { message: error instanceof Error ? error.message : String(error) });
    }
  }

  private async createRequest() {
    const eventId = this.requestEvent.trim();
    const description = this.requestDescription.trim();
    if (!this.requestTarget || !eventId || !description) {
      this.requestMessage = this.t('integration.requestRequired');
      return;
    }
    try {
      await writeIntegrationRequest(this.project, this.requestTarget, {
        schemaVersion: NS5_INTEGRATION_REQUEST_SCHEMA_VERSION,
        requestedBy: this.moduleName,
        eventId,
        ...(this.requestOn ? { on: this.requestOn } : {}),
        entityRefs: [...this.requestEntities],
        description,
        status: 'requested',
      });
      this.requestEvent = '';
      this.requestOn = '';
      this.requestDescription = '';
      this.requestEntities = [];
      this.requestMessage = this.t('integration.requestSaved');
      await this.loadWorkspace();
    } catch (error) {
      this.requestMessage = this.t('integration.requestFailed', { message: error instanceof Error ? error.message : String(error) });
    }
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

  private renderEntityRefs(values: string[]) {
    return values.length ? html`<div class="nr-integration__chips">${values.map(value => html`<span>${this.entities().find(entity => entity.entityId === value)?.title || value}<code>${value}</code></span>`)}</div>` : html`<small>${this.t('integration.none')}</small>`;
  }

  private renderItem(item: Ns5IntegrationItem, lane: IntegrationLane, index: number) {
    if (this.mode === 'edit' && this.draft) {
      const peer = lane === 'inbound' ? item.from || '' : item.to || '';
      const eventOptions = this.peerEvents(peer);
      const transitions = item.writes?.length === 1 ? this.entities().find(entity => entity.entityId === item.writes![0])?.transitions || [] : [];
      return html`<article class="nr-integration__item is-edit">
        <header><div><span>${this.t(`integration.${lane}.singular`)}</span><code>${item.id}</code></div><button type="button" @click=${() => this.removeItem(lane, index)}>×</button></header>
        <div class="nr-integration__form">
          <label><span>${this.t('integration.kind')}</span><select @change=${(event: Event) => this.updateItem(lane, index, { kind: (event.currentTarget as HTMLSelectElement).value as Ns5IntegrationItem['kind'] })}>${['event', 'moduleEndpoint', 'external'].map(kind => html`<option value=${kind} ?selected=${item.kind === kind}>${this.t(`integration.kind.${kind}`)}</option>`)}</select></label>
          <label><span>${lane === 'inbound' ? this.t('integration.from') : this.t('integration.to')}</span>${item.kind === 'external' ? html`<input .value=${peer} @input=${(event: Event) => this.updateItem(lane, index, lane === 'inbound' ? { from: (event.currentTarget as HTMLInputElement).value } : { to: (event.currentTarget as HTMLInputElement).value })}>` : html`<select @change=${(event: Event) => this.updateItem(lane, index, lane === 'inbound' ? { from: (event.currentTarget as HTMLSelectElement).value, event: '' } : { to: (event.currentTarget as HTMLSelectElement).value })}>${lane === 'inbound' ? html`<option value="organization" ?selected=${peer === 'organization'}>${this.t('integration.organization')}</option>` : html`<option value="any" ?selected=${peer === 'any'}>${this.t('integration.any')}</option>`}${this.workspace.siblings.map(sibling => html`<option value=${sibling.moduleName} ?selected=${peer === sibling.moduleName}>${sibling.moduleName}</option>`)}</select>`}</label>
          <label><span>${this.t('integration.event')}</span>${lane === 'inbound' && eventOptions.length ? html`<select @change=${(event: Event) => this.updateItem(lane, index, { event: (event.currentTarget as HTMLSelectElement).value })}><option value="" ?selected=${!item.event}>${this.t('integration.choose')}</option>${eventOptions.map(event => html`<option value=${event.eventId} ?selected=${item.event === event.eventId}>${event.eventId} · ${event.on}</option>`)}</select>` : html`<input .value=${item.event || ''} @input=${(event: Event) => this.updateItem(lane, index, { event: (event.currentTarget as HTMLInputElement).value })}>`}</label>
          ${lane === 'inbound' ? html`
            <label><span>${this.t('integration.effect')}</span><select @change=${(event: Event) => this.updateItem(lane, index, { effect: (event.currentTarget as HTMLSelectElement).value as Ns5IntegrationItem['effect'], transitionRef: undefined })}>${['create', 'update', 'transition'].map(effect => html`<option value=${effect} ?selected=${item.effect === effect}>${this.t(`integration.effect.${effect}`)}</option>`)}</select></label>
            <label><span>${this.t('integration.writes')}</span><select multiple @change=${(event: Event) => this.updateItem(lane, index, { writes: [...(event.currentTarget as HTMLSelectElement).selectedOptions].map(option => option.value) })}>${this.entities().map(entity => html`<option value=${entity.entityId} ?selected=${item.writes?.includes(entity.entityId)}>${entity.title}</option>`)}</select></label>
            ${item.effect === 'transition' ? html`<label><span>${this.t('integration.transition')}</span><select @change=${(event: Event) => this.updateItem(lane, index, { transitionRef: (event.currentTarget as HTMLSelectElement).value })}><option value="" ?selected=${!item.transitionRef}>${this.t('integration.choose')}</option>${transitions.map(transition => html`<option value=${transition.transitionId} ?selected=${item.transitionRef === transition.transitionId}>${transition.transitionId}</option>`)}</select></label>` : nothing}
          ` : html`
            <label><span>${this.t('integration.on')}</span><select @change=${(event: Event) => this.updateItem(lane, index, { on: (event.currentTarget as HTMLSelectElement).value })}><option value="" ?selected=${!item.on}>${this.t('integration.choose')}</option>${this.transitionOptions().map(option => html`<option value=${option} ?selected=${item.on === option}>${option}</option>`)}</select></label>
            <label><span>${this.t('integration.entities')}</span><select multiple @change=${(event: Event) => this.updateItem(lane, index, { entityRefs: [...(event.currentTarget as HTMLSelectElement).selectedOptions].map(option => option.value) })}>${this.entities().map(entity => html`<option value=${entity.entityId} ?selected=${item.entityRefs.includes(entity.entityId)}>${entity.title}</option>`)}</select></label>
          `}
          <label class="is-wide"><span>${this.t('integration.itemDescription')}</span><textarea .value=${item.description} @input=${(event: Event) => this.updateItem(lane, index, { description: (event.currentTarget as HTMLTextAreaElement).value })}></textarea></label>
        </div>
      </article>`;
    }
    return html`<article class="nr-integration__item"><header><div><span>${this.t(`integration.${lane}.singular`)}</span><h4>${item.id}</h4></div><b>${this.t(`integration.kind.${item.kind}`)}</b></header><p>${item.description}</p><dl><div><dt>${lane === 'inbound' ? this.t('integration.from') : this.t('integration.to')}</dt><dd>${lane === 'inbound' ? item.from : item.to}</dd></div><div><dt>${this.t('integration.event')}</dt><dd>${item.event || item.id}</dd></div>${lane === 'inbound' ? html`<div><dt>${this.t('integration.effect')}</dt><dd>${item.effect ? this.t(`integration.effect.${item.effect}`) : this.t('integration.notDeclared')}</dd></div>` : html`<div><dt>${this.t('integration.on')}</dt><dd>${item.on || this.t('integration.notDeclared')}</dd></div>`}</dl><section><span>${lane === 'inbound' ? this.t('integration.writes') : this.t('integration.entities')}</span>${this.renderEntityRefs(lane === 'inbound' ? item.writes || item.entityRefs : item.entityRefs)}</section></article>`;
  }

  private renderLane(lane: IntegrationLane, items: Ns5IntegrationItem[]) {
    return html`<section class=${`nr-integration__lane lane-${lane}`}><header><div><span>${this.t(`integration.${lane}`)}</span><p>${this.t(`integration.${lane}Description`)}</p></div><strong>${items.length}</strong></header><div>${items.map((item, index) => this.renderItem(item, lane, index))}${this.mode === 'edit' ? html`<button class="nr-integration__add" type="button" @click=${() => this.addItem(lane)}>+ ${this.t(`integration.add.${lane}`)}</button>` : nothing}${!items.length && this.mode === 'view' ? html`<p class="nr-integration__lane-empty">${this.t(`integration.${lane}Empty`)}</p>` : nothing}</div></section>`;
  }

  private renderPlugin(plugin: IntegrationPluginView, index: number) {
    if (this.mode === 'edit' && this.draft) {
      const current = this.draft.plugins[index];
      if (!current) return nothing;
      return html`<article class="nr-integration__plugin is-edit"><header><label><span>${this.t('integration.plugin')}</span><select @change=${(event: Event) => this.updatePlugin(index, { pluginId: (event.currentTarget as HTMLSelectElement).value })}>${NS5_PLUGIN_IDS.map(id => html`<option value=${id} ?selected=${current.pluginId === id}>${id}</option>`)}</select></label><button type="button" @click=${() => this.removePlugin(index)}>×</button></header><label><span>${this.t('integration.usedBy')}</span><select multiple @change=${(event: Event) => this.updatePlugin(index, { usedBy: [...(event.currentTarget as HTMLSelectElement).selectedOptions].map(option => option.value) })}>${this.usedByOptions().map(option => html`<option value=${option} ?selected=${current.usedBy.includes(option)}>${option}</option>`)}</select></label><label><span>${this.t('integration.itemDescription')}</span><textarea .value=${current.description} @input=${(event: Event) => this.updatePlugin(index, { description: (event.currentTarget as HTMLTextAreaElement).value })}></textarea></label></article>`;
    }
    const refs = plugin.usedBy.length ? plugin.usedBy : plugin.legacyEntityRefs;
    return html`<article class="nr-integration__plugin"><header><span>${this.t('integration.plugin')}</span><h4>${plugin.pluginId}</h4></header><p>${plugin.description}</p><div><span>${plugin.usedBy.length ? this.t('integration.usedBy') : this.t('integration.legacyEntities')}</span>${refs.length ? refs.map(ref => html`<code>${ref}</code>`) : html`<small>${this.t('integration.none')}</small>`}</div></article>`;
  }

  private renderRequests() {
    const requests = [...this.workspace.received.map(item => ({ ...item, direction: 'received' as const })), ...this.workspace.sent.map(item => ({ ...item, direction: 'sent' as const }))];
    return html`<section class="nr-integration__requests"><header><div><span>${this.t('integration.requests')}</span><p>${this.t('integration.requestsDescription')}</p></div><strong>${requests.length}</strong></header><div class="nr-integration__request-list">${this.loadingWorkspace ? html`<p>${this.t('integration.requestsLoading')}</p>` : requests.map(request => html`<article class=${`is-${request.direction}`}><i></i><div><span>${request.direction === 'sent' ? this.t('integration.requestSent') : this.t('integration.requestReceived')}</span><strong>${request.value.eventId}</strong><p>${request.value.description}</p><code>${request.value.requestedBy} → ${request.targetModule === 'organization' ? request.value.to : request.targetModule}</code></div><b>${this.t('integration.requested')}</b></article>`)}${!this.loadingWorkspace && !requests.length ? html`<p>${this.t('integration.requestsEmpty')}</p>` : nothing}</div><details><summary>${this.t('integration.createRequest')}</summary><div class="nr-integration__request-form"><label><span>${this.t('integration.requestTarget')}</span><select @change=${(event: Event) => { this.requestTarget = (event.currentTarget as HTMLSelectElement).value; }}><option value="" ?selected=${!this.requestTarget}>${this.t('integration.choose')}</option>${this.workspace.siblings.map(sibling => html`<option value=${sibling.moduleName} ?selected=${this.requestTarget === sibling.moduleName}>${sibling.moduleName}</option>`)}</select></label><label><span>${this.t('integration.event')}</span><input .value=${this.requestEvent} @input=${(event: Event) => { this.requestEvent = (event.currentTarget as HTMLInputElement).value; }}></label><label><span>${this.t('integration.onSuggestion')}</span><select @change=${(event: Event) => { this.requestOn = (event.currentTarget as HTMLSelectElement).value; }}><option value="" ?selected=${!this.requestOn}>${this.t('integration.noSuggestion')}</option>${this.workspace.siblings.find(sibling => sibling.moduleName === this.requestTarget)?.entities.flatMap(entity => [`${entity.entityId}.create`]).map(option => html`<option value=${option} ?selected=${this.requestOn === option}>${option}</option>`)}</select></label><label><span>${this.t('integration.requestEntities')}</span><select multiple @change=${(event: Event) => { this.requestEntities = [...(event.currentTarget as HTMLSelectElement).selectedOptions].map(option => option.value); }}>${this.entities().map(entity => html`<option value=${entity.entityId} ?selected=${this.requestEntities.includes(entity.entityId)}>${entity.title}</option>`)}</select></label><label class="is-wide"><span>${this.t('integration.itemDescription')}</span><textarea .value=${this.requestDescription} @input=${(event: Event) => { this.requestDescription = (event.currentTarget as HTMLTextAreaElement).value; }}></textarea></label><footer>${this.requestMessage ? html`<span>${this.requestMessage}</span>` : html`<span></span>`}<button type="button" @click=${() => void this.createRequest()}>${this.t('integration.saveRequest')}</button></footer></div></details></section>`;
  }

  render() {
    const view = this.view();
    if (!this.sourceValue()) return html`<section class="nr-integration__empty"><h2>${this.t('integration.emptyTitle')}</h2><p>${this.t('integration.emptyBody')}</p>${this.renderIssues()}${this.renderRequests()}</section>`;
    if (view.schema === 'unknown') return html`<section class="nr-integration__unknown" role="alert"><h2>${this.t('integration.unknownTitle')}</h2><p>${this.t('integration.unknownBody', { version: view.schemaVersion || this.t('integration.notRecorded') })}</p><pre>${JSON.stringify(view.raw, null, 2)}</pre></section>`;
    return html`<section class="nr-integration"><header class="nr-integration__hero"><div><span>${this.t('integration.eyebrow')}</span><h2>${this.t('integration.title')}</h2><p>${this.t('integration.description')}</p><small class=${`schema-${view.schema}`}>${this.t(`integration.schema.${view.schema}`)}</small></div><dl><div><dt>${this.t('integration.inbound')}</dt><dd>${view.inbound.length}</dd></div><div><dt>${this.t('integration.outbound')}</dt><dd>${view.outbound.length}</dd></div><div><dt>${this.t('integration.plugins')}</dt><dd>${view.plugins.length}</dd></div></dl></header><div class="nr-integration__toolbar">${view.schema === 'v2' && this.mode === 'view' ? html`<button type="button" @click=${() => this.beginEdit()}>${this.t('integration.edit')}</button>` : view.schema === 'v1' ? html`<span>${this.t('integration.legacyReadOnly')}</span>` : nothing}</div>${this.renderIssues()}<div class="nr-integration__lanes">${this.renderLane('inbound', view.inbound)}${this.renderLane('outbound', view.outbound)}</div><section class="nr-integration__plugins"><header><div><span>${this.t('integration.plugins')}</span><p>${this.t('integration.pluginsDescription')}</p></div><strong>${view.plugins.length}</strong></header><div>${view.plugins.map((plugin, index) => this.renderPlugin(plugin, index))}${this.mode === 'edit' ? html`<button class="nr-integration__add" type="button" @click=${() => this.addPlugin()}>+ ${this.t('integration.add.plugin')}</button>` : nothing}${!view.plugins.length && this.mode === 'view' ? html`<p class="nr-integration__lane-empty">${this.t('integration.pluginsEmpty')}</p>` : nothing}</div></section>${this.renderRequests()}${this.mode === 'edit' ? html`<footer class="nr-integration__edit-footer"><span>${this.dirty ? this.t('integration.unsaved') : this.t('integration.noChanges')}</span><div><button type="button" @click=${() => this.cancelEdit()}>${this.t('integration.cancel')}</button><button class="is-primary" type="button" ?disabled=${!this.dirty} @click=${() => void this.saveEdit()}>${this.t('integration.save')}</button></div></footer>` : nothing}</section>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'new-release--widgets--integration-102035': NewReleaseIntegration102035; } }
