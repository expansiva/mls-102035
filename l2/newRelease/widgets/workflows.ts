/// <mls fileReference="_102035_/l2/newRelease/widgets/workflows.ts" enhancement="_102027_/l2/enhancementLit" />

import { html, nothing, svg, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import type {
  Ns5OntologyAnyEntity,
  Ns5WorkflowProcess,
  Ns5WorkflowTask,
  Ns5WorkflowsArtifact,
} from '/_102035_/l2/solution/types.js';
import { ns5OntologyEntityViews } from '/_102035_/l2/solution/ontologyView.js';
import type { NewReleaseVersion } from '/_102035_/l2/newRelease/helpers/context.js';
import type { NewReleaseModuleData } from '/_102035_/l2/newRelease/helpers/l4Reader.js';
import type { NewReleaseTranslate } from '/_102035_/l2/newRelease/helpers/i18n.js';
import { hasItemDiff, idScope } from '/_102035_/l2/newRelease/helpers/itemDiffs.js';
import { changedDot } from '/_102035_/l2/newRelease/helpers/changedDot.js';
import {
  announceNewReleaseChange,
  requestNewReleasePresentation,
  requestNewReleaseEdit,
  canDiscardNewReleaseDraft,
  type NewReleaseEditableTab,
  type NewReleaseEditMode,
  type NewReleaseTabPresentation,
} from '/_102035_/l2/newRelease/editContract.js';
import type { NewReleaseValidationIssue } from '/_102035_/l2/solution/candidate/tobePaths.js';
import {
  isEditableWorkflowSchema,
  isRecurringDuty,
  workflowEdges,
  appendWorkflowTask,
  workflowNewTaskError,
  WORKFLOW_TASK_KINDS,
  normalizeWorkflows,
  workflowNextLabels,
  workflowOracleIssues,
  workflowStartTaskIds,
  workflowTaskCount,
  type WorkflowProcessView,
  type WorkflowTaskView,
} from '/_102035_/l2/newRelease/widgets/workflowsModel.js';

import { renderNewReleaseIcon } from '/_102035_/l2/newRelease/widgets/iconPicker.js';
import { WORKFLOW_ICON_DEFAULTS, iconNeedsFallback, withNewReleaseIcon } from '/_102035_/l2/newRelease/widgets/iconModel.js';

interface WorkflowIssueView { severity: 'error' | 'warning'; code: string; message: string; }

@customElement('new-release--widgets--workflows-102035')
export class NewReleaseWorkflows102035 extends StateLitElement implements NewReleaseEditableTab<Ns5WorkflowsArtifact | null> {
  @property({ type: Number }) project = 0;
  @property({ type: String, attribute: 'module-name' }) moduleName = '';
  @property({ type: String }) version: NewReleaseVersion = 'asis';
  @property({ attribute: false }) data: NewReleaseModuleData | null = null;
  @property({ attribute: false }) t: NewReleaseTranslate = key => key;
  @property({ type: String }) mode: NewReleaseEditMode = 'view';
  @property({ type: Boolean }) dirty = false;

  @state() private selectedProcessId = '';
  @state() private selectedTaskId = '';
  @state() private adding = false;
  @state() private newId = '';
  @state() private saving = false;
  private snapshot = '';
  @state() private draft: Ns5WorkflowsArtifact | null = null;
  @state() private gateIssues: WorkflowIssueView[] = [];
  @state() private suppliedIssues: NewReleaseValidationIssue[] = [];
  @state() private editMessage = '';

  createRenderRoot() { return this; }

  updated(changed: PropertyValues) {
    if (changed.has('data') || changed.has('version') || changed.has('moduleName')) {
      this.cancelEdit(); this.selectedProcessId = ''; this.selectedTaskId = '';
    }
    if (['data', 'selectedProcessId', 'selectedTaskId', 'mode', 'draft', 'adding', 't'].some(key => changed.has(key))) this.present();
  }
  private taskTitle(task: WorkflowTaskView) {
    return task.title || this.journeys().find(item => item.journeyId === task.journeyRef)?.business.title || task.taskId;
  }
  private present() {
    const presentation: NewReleaseTabPresentation = {
      detail: !!this.selectedTaskId || this.adding,
      canBack: !!this.selectedProcessId,
      filters: (['manual', 'scheduled', 'event'] as const).map(kind => ({id: kind, label: this.t(`workflows.trigger.${kind}`), rootIds: this.view().processes.filter(process => process.trigger?.kind === kind).map(process => JSON.stringify([process.processId]))})),
      nodes: this.view().processes.map(process => ({id: JSON.stringify([process.processId]), label: process.title, value: `${process.trigger?.kind || ''} ${process.description}`, changed: this.changedProcess(process.processId), children: process.tasks.map(task => ({id: JSON.stringify([process.processId, task.taskId]), label: this.taskTitle(task), value: `${task.taskId} ${task.description}`, changed: this.changedTask(process.processId, task.taskId), children: []}))})),
      select: id => { const [processId, taskId = '', action] = JSON.parse(id) as string[]; if (action === 'new') { this.select(processId); this.openNewTask(); } else this.select(processId, taskId); },
      back: () => this.back(),
    };
    this.dispatchEvent(new CustomEvent('nr-view-state', {bubbles: true, composed: true, detail: presentation}));
  }
  private select(processId: string, taskId = '') {
    if (this.saving || !canDiscardNewReleaseDraft(this)) return;
    if (taskId && this.version === 'asis' && this.currentArtifact()) { requestNewReleaseEdit(this, JSON.stringify([processId, taskId])); return; }
    this.cancelEdit(); this.selectedProcessId = processId; this.selectedTaskId = taskId;
    if (taskId && !this.version.startsWith('release:')) this.beginEdit();
    requestNewReleasePresentation(this, 'graph');
  }
  private openNewTask() {
    if (this.version === 'asis') { requestNewReleaseEdit(this, JSON.stringify([this.selectedProcessId, '', 'new'])); return; }
    this.adding = true; this.newId = ''; this.beginEdit();
  }
  private back() {
    if (this.saving || !canDiscardNewReleaseDraft(this)) return;
    const task = !!this.selectedTaskId || this.adding;
    this.cancelEdit(); this.selectedTaskId = ''; if (!task) this.selectedProcessId = '';
    requestNewReleasePresentation(this, 'graph');
    this.present();
  }

  private changedProcess(id: string) { return hasItemDiff(this.data?.diffs || [], 'workflows.defs.ts', idScope('processes', 'processId', id)); }
  private changedTask(processId: string, taskId: string) {
    return hasItemDiff(this.data?.diffs || [], 'workflows.defs.ts', `${idScope('processes', 'processId', processId)}.tasks[taskId=${encodeURIComponent(taskId)}]`);
  }

  getDraft(): Ns5WorkflowsArtifact | null {
    const artifact = this.currentArtifact();
    return artifact ? structuredClone(artifact) : null;
  }

  setIssues(issues: NewReleaseValidationIssue[]) { this.suppliedIssues = workflowOracleIssues(issues); }

  private sourceValue(): unknown { return this.data?.artifacts.workflows.value || null; }

  private currentArtifact(): Ns5WorkflowsArtifact | null {
    if (this.mode === 'edit' && this.draft) return this.draft;
    const view = normalizeWorkflows(this.sourceValue());
    return isEditableWorkflowSchema(view.schema) ? view.raw as Ns5WorkflowsArtifact : null;
  }

  private view() { return normalizeWorkflows(this.mode === 'edit' && this.draft ? this.draft : this.sourceValue()); }

  private actors() { return this.data?.artifacts.access.value?.actors || []; }
  private journeys() { return this.data?.artifacts.journeys.map(item => item.value).filter((item): item is NonNullable<typeof item> => !!item) || []; }
  private entities(): Ns5OntologyAnyEntity[] { return this.data?.artifacts.entities.map(item => item.value).filter((item): item is Ns5OntologyAnyEntity => !!item) || []; }
  private process(): WorkflowProcessView | null { return this.view().processes.find(item => item.processId === this.selectedProcessId) || null; }

  private beginEdit() {
    const artifact = this.currentArtifact();
    if (!artifact) return;
    if (this.version.startsWith('release:')) return;
    this.draft = structuredClone(artifact);
    this.snapshot = JSON.stringify(artifact);
    this.mode = 'edit';
    this.dirty = false;
    this.gateIssues = [];
    this.editMessage = '';
  }

  private cancelEdit() {
    this.adding = false;
    if (!normalizeWorkflows(this.sourceValue()).processes.find(process => process.processId === this.selectedProcessId)?.tasks.some(task => task.taskId === this.selectedTaskId)) this.selectedTaskId = '';
    this.draft = null;
    this.mode = 'view';
    this.dirty = false;
    this.gateIssues = [];
    this.editMessage = '';
  }

  private updateDraft(next: Ns5WorkflowsArtifact) {
    this.draft = next;
    this.dirty = JSON.stringify(next) !== this.snapshot;
    this.gateIssues = [];
    this.editMessage = '';
  }

  private updateProcess(patch: Partial<Ns5WorkflowProcess>) {
    if (!this.draft) return;
    this.updateDraft({ ...this.draft, processes: this.draft.processes.map(process => process.processId === this.selectedProcessId ? { ...process, ...patch } : process) });
  }

  private addTask() {
    if (!this.draft) this.beginEdit();
    if (!this.draft) return;
    const process = this.draft.processes.find(item => item.processId === this.selectedProcessId);
    if (!process) return;
    const error = workflowNewTaskError(this.newId, process.tasks.map(task => task.taskId));
    if (error) { this.editMessage = this.t(`workflows.newId.${error}`); return; }
    this.updateDraft(appendWorkflowTask(this.draft, process.processId, this.newId));
    this.selectedTaskId = this.newId; this.adding = false; this.newId = '';
  }

  private updateTask(taskId: string, patch: Partial<Ns5WorkflowTask>) {
    if (!this.draft) return;
    const process = this.draft.processes.find(item => item.processId === this.selectedProcessId);
    if (!process) return;
    this.updateProcess({ tasks: process.tasks.map(task => task.taskId === taskId ? { ...task, ...patch } : task) });
  }

  private replaceTask(taskId: string, next: Ns5WorkflowTask) {
    if (!this.draft) return;
    const process = this.draft.processes.find(item => item.processId === this.selectedProcessId);
    if (!process) return;
    this.updateProcess({ tasks: process.tasks.map(task => task.taskId === taskId ? next : task) });
  }

  private updateTaskKind(task: Ns5WorkflowTask, kind: Ns5WorkflowTask['kind']) {
    const {actorRef, journeyRef, entityRef, effect, transitionRef, wake, ...rest} = task;
    const base: Ns5WorkflowTask = { ...rest, kind };
    if (kind === 'wait') base.wake = {mode: 'none'};
    if (kind === 'human') {
      base.actorRef = this.actors()[0]?.actorId || '';
      base.journeyRef = this.journeys()[0]?.journeyId || '';
    } else if (kind === 'mechanical' || kind === 'llm') {
      base.entityRef = this.entities()[0]?.entityId || '';
      base.effect = 'update';
    } else if (kind === 'alert') {
      base.actorRef = this.actors()[0]?.actorId || '';
    }
    this.replaceTask(task.taskId, base);
  }

  private async saveEdit() {
    if (!this.draft || !this.dirty || this.saving || this.version.startsWith('release:')) return;
    if (this.draft.processes.some(process => process.tasks.some(task => !task.description.trim()))) { this.editMessage = this.t('workflows.descriptionRequired'); return; }
    this.saving = true;
    try {
      const gate = await import('/_102035_/l2/solution/gates/workflows50/gate.js');
      const result = gate.validateNs5Workflows(this.draft.processes, {
        moduleName: this.moduleName,
        actorIds: this.actors().map(actor => actor.actorId),
        journeys: this.journeys(),
        entities: ns5OntologyEntityViews(this.entities()),
        journeyDecisions: this.draft.journeyDecisions,
      });
      this.gateIssues = result.issues;
      if (!result.ok) {
        this.editMessage = this.t('workflows.gateBlocked');
        return;
      }
      await announceNewReleaseChange(this, { path: 'workflows.defs.ts', jsonPath: '$', value: structuredClone(this.draft) });
      this.cancelEdit();
    } catch (error) {
      this.editMessage = this.t('workflows.gateUnavailable', { message: error instanceof Error ? error.message : String(error) });
    } finally { this.saving = false; }
  }

  /** ns5_48: derived, never written — "Recurring duty · <schedule> · <actor>". */
  private recurringDutyLabel(process: WorkflowProcessView): string {
    const schedule = process.trigger?.schedule?.trim() || this.t('workflows.notRecorded');
    const actor = process.tasks.find(task => task.actorRef)?.actorRef || this.t('workflows.notRecorded');
    return `${this.t('workflows.recurringDuty')} · ${schedule} · ${actor}`;
  }

  private triggerSummary(process: WorkflowProcessView) {
    const trigger = process.trigger;
    if (!trigger) return this.t('workflows.trigger.undeclared');
    if (trigger.kind === 'scheduled') return trigger.schedule || this.t('workflows.notRecorded');
    if (trigger.kind === 'event') return trigger.event || this.t('workflows.notRecorded');
    return trigger.actorRef || this.t('workflows.notRecorded');
  }

  private renderIssues() {
    const oracle = workflowOracleIssues([...(this.data?.validation.issues || []), ...this.suppliedIssues]);
    const issues = [...new Map([...oracle, ...this.gateIssues].map(issue => [`${issue.code}:${issue.message}`, issue])).values()];
    if (!issues.length && !this.editMessage) return this.renderI6();
    return html`${this.renderI6()}<section class="nr-workflows__issues" role="alert"><strong>${this.t('workflows.issues')}</strong>${this.editMessage ? html`<p>${this.editMessage}</p>` : nothing}${issues.map(issue => html`<div class=${`is-${issue.severity}`}><code>${issue.code}</code><p>${issue.message}</p></div>`)}</section>`;
  }

  private renderI6() {
    const check = this.data?.finalizeReport?.checks.find(item => item.checkId === 'I6');
    if (!check) return nothing;
    return html`<section class=${`nr-workflows__check is-${check.status}`}><div><span>${this.t('workflows.i6')}</span><strong>${this.t('oracle.I6')}</strong></div><p>${this.t(`oracle.status.${check.status}`)}</p><small>${this.t('general.oracleCounts', { errors: check.errorCount, warnings: check.warningCount })}</small></section>`;
  }

  private renderTask(process: WorkflowProcessView, task: WorkflowTaskView, index: number) {
    const isStart = workflowStartTaskIds(process).includes(task.taskId);
    const next = workflowNextLabels(process, task);
    const title = this.taskTitle(task);
    if (this.mode === 'edit' && this.draft) {
      const draftProcess = this.draft.processes.find(item => item.processId === process.processId);
      const draftTask = draftProcess?.tasks.find(item => item.taskId === task.taskId);
      if (!draftTask) return nothing;
      const transitions = this.entities().find(entity => entity.entityId === draftTask.entityRef)?.transitions || [];
      return html`<article class=${`nr-workflows__task kind-${draftTask.kind}`}>
        <header><i>${renderNewReleaseIcon(draftTask.icon, WORKFLOW_ICON_DEFAULTS[draftTask.kind])}</i><div><span>${isStart ? this.t('workflows.start') : this.t('workflows.step', { number: index + 1 })}</span><code>${draftTask.taskId}</code></div><input readonly aria-label=${this.t('workflows.taskId')} .value=${draftTask.taskId}></header>
        <div class="nr-workflows__task-form">
          <new-release--widgets--icon-picker-102035 .value=${draftTask.icon || ''} .fallback=${WORKFLOW_ICON_DEFAULTS[draftTask.kind]} .t=${this.t} @nr-icon-selected=${(event: CustomEvent<string>) => this.replaceTask(draftTask.taskId, withNewReleaseIcon(draftTask, event.detail))}></new-release--widgets--icon-picker-102035>
          <label><span>${this.t('workflows.taskKind')}</span><select @change=${(event: Event) => this.updateTaskKind(draftTask, (event.currentTarget as HTMLSelectElement).value as Ns5WorkflowTask['kind'])}>${WORKFLOW_TASK_KINDS.map(kind => html`<option value=${kind} ?selected=${draftTask.kind === kind}>${this.t(`workflows.kind.${kind}`)}</option>`)}</select></label>
          ${draftTask.kind === 'human' ? html`
            <label><span>${this.t('workflows.actor')}</span><select @change=${(event: Event) => this.updateTask(draftTask.taskId, { actorRef: (event.currentTarget as HTMLSelectElement).value })}>${this.actors().map(actor => html`<option value=${actor.actorId} ?selected=${draftTask.actorRef === actor.actorId}>${actor.title} · ${actor.actorId}</option>`)}</select></label>
            <label><span>${this.t('workflows.journey')}</span><select @change=${(event: Event) => this.updateTask(draftTask.taskId, { journeyRef: (event.currentTarget as HTMLSelectElement).value })}>${this.journeys().map(journey => html`<option value=${journey.journeyId} ?selected=${draftTask.journeyRef === journey.journeyId}>${journey.business.title}</option>`)}</select></label>
          ` : nothing}
          ${draftTask.kind === 'alert' ? html`
            <label><span>${this.t('workflows.actor')}</span><select @change=${(event: Event) => this.updateTask(draftTask.taskId, { actorRef: (event.currentTarget as HTMLSelectElement).value })}>${this.actors().map(actor => html`<option value=${actor.actorId} ?selected=${draftTask.actorRef === actor.actorId}>${actor.title} · ${actor.actorId}</option>`)}</select></label>
          ` : nothing}
          ${draftTask.kind === 'mechanical' || draftTask.kind === 'llm' ? html`
            <label><span>${this.t('workflows.entity')}</span><select @change=${(event: Event) => this.updateTask(draftTask.taskId, { entityRef: (event.currentTarget as HTMLSelectElement).value, transitionRef: undefined })}>${this.entities().map(entity => html`<option value=${entity.entityId} ?selected=${draftTask.entityRef === entity.entityId}>${entity.title}</option>`)}</select></label>
            <label><span>${this.t('workflows.effect')}</span><select @change=${(event: Event) => this.updateTask(draftTask.taskId, { effect: (event.currentTarget as HTMLSelectElement).value as Ns5WorkflowTask['effect'], transitionRef: undefined })}>${['create', 'update', 'transition'].map(effect => html`<option value=${effect} ?selected=${draftTask.effect === effect}>${this.t(`workflows.effect.${effect}`)}</option>`)}</select></label>
            ${draftTask.effect === 'transition' ? html`<label><span>${this.t('workflows.transition')}</span><select @change=${(event: Event) => this.updateTask(draftTask.taskId, { transitionRef: (event.currentTarget as HTMLSelectElement).value })}><option value="" ?selected=${!draftTask.transitionRef}>${this.t('workflows.choose')}</option>${transitions.map(transition => html`<option value=${transition.transitionId} ?selected=${draftTask.transitionRef === transition.transitionId}>${transition.transitionId}</option>`)}</select></label>` : nothing}
          ` : nothing}
          ${draftTask.kind === 'wait' ? html`<label><span>${this.t('workflows.wakeMode')}</span><select @change=${(event: Event) => this.updateTask(draftTask.taskId, {wake: (event.currentTarget as HTMLSelectElement).value === 'periodic' ? {mode: 'periodic', every: draftTask.wake?.every || ''} : {mode: 'none'}})}>${(['none', 'periodic'] as const).map(mode => html`<option value=${mode} ?selected=${(draftTask.wake?.mode || 'none') === mode}>${this.t(`workflows.wake.${mode}`)}</option>`)}</select></label>${draftTask.wake?.mode === 'periodic' ? html`<label><span>${this.t('workflows.wakeEvery')}</span><input .value=${draftTask.wake.every || ''} @input=${(event: Event) => this.updateTask(draftTask.taskId, {wake: {mode: 'periodic', every: (event.currentTarget as HTMLInputElement).value}})}></label>` : nothing}` : nothing}
          <label class="is-wide"><span>${this.t('workflows.taskDescription')}</span><textarea .value=${draftTask.description} @input=${(event: Event) => this.updateTask(draftTask.taskId, { description: (event.currentTarget as HTMLTextAreaElement).value })}></textarea></label>
          <label class="is-wide"><span>${this.t('workflows.next')}</span><select multiple @change=${(event: Event) => this.updateTask(draftTask.taskId, { next: [...(event.currentTarget as HTMLSelectElement).selectedOptions].map(option => option.value) })}>${draftProcess?.tasks.map(item => html`<option value=${item.taskId} ?selected=${draftTask.next.includes(item.taskId)}>${item.taskId}</option>`)}</select></label>
        </div>
      </article>`;
    }
    const wake = task.kind === 'wait' && task.wake?.mode === 'periodic' && task.wake.every
      ? html`<span>${this.t('workflows.wakePeriodic', { every: task.wake.every })}</span>`
      : nothing;
    return html`<article class=${`nr-workflows__task kind-${task.kind}`}><header><i>${renderNewReleaseIcon(task.icon, WORKFLOW_ICON_DEFAULTS[task.kind])}</i><div><span>${isStart ? this.t('workflows.start') : this.t('workflows.step', { number: index + 1 })}</span><code>${task.taskId}</code></div><b>${this.t(`workflows.kind.${task.kind}`)}</b></header><h4>${title}</h4><p>${task.description}</p><div class="nr-workflows__task-meta">${task.actorRef ? html`<span>${this.t('workflows.actor')}: <strong>${task.actorRef}</strong></span>` : nothing}${task.effect ? html`<span>${this.t('workflows.effect')}: <strong>${this.t(`workflows.effect.${task.effect}`)}</strong></span>` : nothing}${task.transitionRef ? html`<code>${task.transitionRef}</code>` : nothing}${wake}</div><footer><span>${this.t('workflows.next')}</span>${next.length ? next.map(label => html`<code>${label}</code>`) : html`<strong>${this.t('workflows.end')}</strong>`}</footer></article>`;
  }

  private renderFunctions(process: WorkflowProcessView) {
    const functions = process.functions;
    return html`<section class="nr-workflows__functions"><header><div><span>${this.t('workflows.functions')}</span></div><strong>${this.t('workflows.functionCount', { count: functions.length })}</strong></header><div>${functions.map(item => html`<article><header><code>${item.functionId}</code></header><p>${item.description}</p></article>`)}</div></section>`;
  }

  private renderProcess(process: WorkflowProcessView) {
    const task = process.tasks.find(item => item.taskId === this.selectedTaskId);
    if (this.adding) return html`<section class="nr-workflows__detail"><label>${this.t('workflows.taskId')}<input .value=${this.newId} @input=${(event: Event) => {this.newId = (event.currentTarget as HTMLInputElement).value;}}></label><button class="nr-button" @click=${() => this.addTask()}>${this.t('workflows.addTask')}</button>${this.renderIssues()}</section>`;
    if (task) return html`<main class="nr-workflows__detail">${this.mode === 'view' && !this.version.startsWith('release:') && isEditableWorkflowSchema(this.view().schema) ? html`<button class="nr-button" @click=${() => this.beginEdit()}>${this.t('workflows.edit')}</button>` : nothing}${this.renderTask(process, task, process.tasks.indexOf(task))}${this.renderIssues()}</main>`;
    const edges = workflowEdges(process);
    const width = Math.max(400, process.tasks.length * 260);
    const nodeHeight = 125;
    return html`<main class="nr-workflows__detail"><header><div><h3>${process.title}</h3><code>${process.processId}</code><p>${process.description}</p><p>${this.t('workflows.trigger')}: ${this.triggerSummary(process)}</p><p>${this.t('workflows.room')}: ${this.t(`workflows.room.${process.room}`)}</p></div>${!this.version.startsWith('release:') && isEditableWorkflowSchema(this.view().schema) ? html`<button class="nr-button" @click=${this.openNewTask}>${this.t('workflows.addTask')}</button>` : nothing}</header>
      <section class="nr-workflows__graph" style=${`width:${width}px;min-height:${220 + edges.length * 22}px`}>
      <svg class="nr-workflows__edges" width=${width} height=${220 + edges.length * 22} aria-label=${this.t('workflows.connections')} role="img"><defs><marker id="nr-workflow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/></marker></defs>${edges.map((edge, index) => {const x1 = edge.from * 260 + 115; const x2 = edge.to * 260 + 130; const y = 190 + index * 22; return svg`<path d=${`M ${x1} ${nodeHeight} C ${x1} ${y}, ${x2} ${y}, ${x2} ${nodeHeight}`} marker-end="url(#nr-workflow-arrow)"/><title>${process.tasks[edge.from].taskId} → ${edge.id}</title>`;})}</svg>
      ${process.tasks.map((item, index) => html`<button class=${`nr-workflows__node kind-${item.kind}`} style=${`left:${index * 260}px;height:${nodeHeight}px`} aria-label=${this.taskTitle(item)} @click=${() => this.select(process.processId, item.taskId)}><i>${renderNewReleaseIcon(item.icon, WORKFLOW_ICON_DEFAULTS[item.kind])}</i><strong>${this.taskTitle(item)}</strong>${changedDot(this.changedTask(process.processId, item.taskId), this.t)}<code>${item.taskId}</code><span>${this.t(`workflows.kind.${item.kind}`)}</span></button>`)}</section>${this.renderFunctions(process)}${this.renderIssues()}</main>`;
  }

  private renderDecisions() {
    const decisions = this.view().journeyDecisions;
    if (!decisions.length) return nothing;
    return html`<section class="nr-workflows__decisions"><header><div><span>${this.t('workflows.decisions')}</span><p>${this.t('workflows.decisionsDescription')}</p></div><strong>${decisions.length}</strong></header><div>${decisions.map(decision => html`<article class=${decision.inProcess ? 'is-in' : 'is-out'}><i></i><div><strong>${this.journeys().find(journey => journey.journeyId === decision.journeyId)?.business.title || decision.journeyId}</strong><code>${decision.journeyId}</code></div><span>${decision.inProcess ? this.t('workflows.inProcess') : this.t('workflows.outProcess')}</span></article>`)}</div></section>`;
  }

  render() {
    const view = this.view();
    if (!this.sourceValue()) return html`<section class="nr-workflows__empty"><h2>${this.t('workflows.emptyTitle')}</h2><p>${this.t('workflows.emptyBody')}</p></section>`;
    if (view.schema === 'unknown') return html`<section class="nr-workflows__unknown" role="alert"><h2>${this.t('workflows.unknownTitle')}</h2><p>${this.t('workflows.unknownBody', { version: view.schemaVersion || this.t('workflows.notRecorded') })}</p><pre>${JSON.stringify(view.raw, null, 2)}</pre></section>`;
    const process = this.process();
    return html`<section class="nr-workflows">${view.processes.some(item => item.tasks.some(task => iconNeedsFallback(task.icon))) ? html`<p role="status">${this.t('icons.fallbackNotice')}</p>` : nothing}${process ? this.renderProcess(process) : html`<div class="nr-workflows__cards">${view.processes.map(item => html`<button class="nr-workflows__card" @click=${() => this.select(item.processId)}><h3>${item.title}${changedDot(this.changedProcess(item.processId), this.t)}</h3><code>${item.processId}</code><p>${item.description}</p><span>${this.t('workflows.trigger')}: ${item.trigger ? this.t(`workflows.trigger.${item.trigger.kind}`) : this.t('workflows.trigger.undeclared')} · ${this.triggerSummary(item)}</span><strong>${this.t('workflows.taskCount', {count: item.tasks.length})}</strong></button>`)}</div>${this.renderDecisions()}`}${this.mode === 'edit' ? html`<footer class="nr-workflows__edit-footer"><span>${this.dirty ? this.t('workflows.unsaved') : this.t('workflows.noChanges')}</span><div><button ?disabled=${this.saving} @click=${() => {if (canDiscardNewReleaseDraft(this)) this.cancelEdit();}}>${this.t('workflows.cancel')}</button><button class="is-primary" ?disabled=${!this.dirty || this.saving || this.adding} @click=${() => void this.saveEdit()}>${this.t('workflows.save')}</button></div></footer>` : nothing}</section>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'new-release--widgets--workflows-102035': NewReleaseWorkflows102035; } }
