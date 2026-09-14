/// <mls fileReference="_102035_/l2/newRelease/widgets/workflows.ts" enhancement="_102027_/l2/enhancementLit" />

import { html, nothing, svg, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import type {
  Ns5OntologyEntityArtifact,
  Ns5WorkflowProcess,
  Ns5WorkflowTask,
  Ns5WorkflowsArtifact,
} from '/_102035_/l2/solution/types.js';
import type { NewReleaseVersion } from '/_102035_/l2/newRelease/helpers/context.js';
import type { NewReleaseModuleData } from '/_102035_/l2/newRelease/helpers/l4Reader.js';
import type { NewReleaseTranslate } from '/_102035_/l2/newRelease/helpers/i18n.js';
import {
  announceNewReleaseChange,
  type NewReleaseEditableTab,
  type NewReleaseEditMode,
} from '/_102035_/l2/newRelease/editContract.js';
import type { NewReleaseValidationIssue } from '/_102035_/l2/newRelease/tobe.js';
import {
  nextMemberId,
  normalizeWorkflows,
  workflowNextLabels,
  workflowOracleIssues,
  workflowStartTaskIds,
  workflowTaskCount,
  type WorkflowProcessView,
  type WorkflowTaskView,
} from '/_102035_/l2/newRelease/widgets/workflowsModel.js';

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
  @state() private draft: Ns5WorkflowsArtifact | null = null;
  @state() private gateIssues: WorkflowIssueView[] = [];
  @state() private suppliedIssues: NewReleaseValidationIssue[] = [];
  @state() private editMessage = '';

  createRenderRoot() { return this; }

  updated(changed: PropertyValues) {
    if (!changed.has('data') || this.mode === 'edit') return;
    const processes = this.view().processes;
    if (!processes.some(process => process.processId === this.selectedProcessId)) {
      this.selectedProcessId = processes[0]?.processId || '';
    }
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
    return view.schema === 'v2' ? view.raw as Ns5WorkflowsArtifact : null;
  }

  private view() { return normalizeWorkflows(this.mode === 'edit' && this.draft ? this.draft : this.sourceValue()); }

  private actors() { return this.data?.artifacts.access.value?.actors || []; }
  private journeys() { return this.data?.artifacts.journeys.map(item => item.value).filter((item): item is NonNullable<typeof item> => !!item) || []; }
  private entities(): Ns5OntologyEntityArtifact[] { return this.data?.artifacts.entities.map(item => item.value).filter((item): item is Ns5OntologyEntityArtifact => !!item) || []; }
  private process(): WorkflowProcessView | null { return this.view().processes.find(item => item.processId === this.selectedProcessId) || null; }

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

  private updateDraft(next: Ns5WorkflowsArtifact) {
    this.draft = next;
    this.dirty = true;
    this.gateIssues = [];
    this.editMessage = '';
  }

  private updateProcess(patch: Partial<Ns5WorkflowProcess>) {
    if (!this.draft) return;
    this.updateDraft({ ...this.draft, processes: this.draft.processes.map(process => process.processId === this.selectedProcessId ? { ...process, ...patch } : process) });
  }

  private addProcess() {
    const artifact = this.currentArtifact();
    if (!artifact) return;
    if (this.mode !== 'edit') this.beginEdit();
    const source = this.draft || artifact;
    const processId = nextMemberId('process', source.processes.map(process => process.processId));
    const process: Ns5WorkflowProcess = {
      processId,
      title: this.t('workflows.newProcessTitle'),
      description: this.t('workflows.newProcessDescription'),
      trigger: { kind: 'manual', actorRef: this.actors()[0]?.actorId || '' },
      tasks: [],
    };
    this.selectedProcessId = processId;
    this.updateDraft({ ...source, processes: [...source.processes, process] });
  }

  private removeProcess() {
    if (!this.draft) return;
    const processes = this.draft.processes.filter(process => process.processId !== this.selectedProcessId);
    const journeyDecisions = this.draft.journeyDecisions.map(decision => decision.processId === this.selectedProcessId
      ? { journeyId: decision.journeyId, inProcess: false }
      : decision);
    this.selectedProcessId = processes[0]?.processId || '';
    this.updateDraft({ ...this.draft, processes, journeyDecisions });
  }

  private addTask() {
    if (!this.draft) return;
    const process = this.draft.processes.find(item => item.processId === this.selectedProcessId);
    if (!process) return;
    const taskId = nextMemberId('task', process.tasks.map(task => task.taskId));
    const task: Ns5WorkflowTask = { taskId, kind: 'wait', description: this.t('workflows.newTaskDescription'), next: [] };
    this.updateProcess({ tasks: [...process.tasks, task] });
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
    const base: Ns5WorkflowTask = { taskId: task.taskId, kind, description: task.description, next: task.next };
    if (kind === 'human') {
      base.actorRef = this.actors()[0]?.actorId || '';
      base.journeyRef = this.journeys()[0]?.journeyId || '';
    } else if (kind === 'mechanical' || kind === 'llm') {
      base.entityRef = this.entities()[0]?.entityId || '';
      base.effect = 'update';
    }
    this.replaceTask(task.taskId, base);
  }

  private removeTask(taskId: string) {
    if (!this.draft) return;
    const process = this.draft.processes.find(item => item.processId === this.selectedProcessId);
    if (!process) return;
    this.updateProcess({ tasks: process.tasks.filter(task => task.taskId !== taskId).map(task => ({ ...task, next: task.next.filter(next => next !== taskId) })) });
  }

  private async saveEdit() {
    if (!this.draft || !this.dirty) return;
    try {
      const gate = await import('/_102035_/l2/agentNewSolution5/steps/workflows50/gate.js');
      const result = gate.validateNs5Workflows(this.draft.processes, {
        moduleName: this.moduleName,
        actorIds: this.actors().map(actor => actor.actorId),
        journeys: this.journeys(),
        entities: this.entities(),
        journeyDecisions: this.draft.journeyDecisions,
      });
      this.gateIssues = result.issues;
      if (!result.ok) {
        this.editMessage = this.t('workflows.gateBlocked');
        return;
      }
      announceNewReleaseChange(this, { path: 'workflows.defs.ts', jsonPath: '$', value: structuredClone(this.draft) });
      this.cancelEdit();
    } catch (error) {
      this.editMessage = this.t('workflows.gateUnavailable', { message: error instanceof Error ? error.message : String(error) });
    }
  }

  private taskIcon(kind: WorkflowTaskView['kind']) {
    if (kind === 'human') return svg`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="3"/><path d="M6 20c.5-4 2.5-6 6-6s5.5 2 6 6"/></svg>`;
    if (kind === 'llm') return svg`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v3M4.2 7.5l2.6 1.4M19.8 7.5l-2.6 1.4M5 17h14v-6H5Z"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/></svg>`;
    if (kind === 'wait') return svg`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>`;
    return svg`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2 3.5 4-.2-.2 4 3.2 2.2-3.2 2.2.2 4-4-.2-2 3.5-2-3.5-4 .2.2-4L3 12.5l3.2-2.2-.2-4 4 .2Z"/><circle cx="12" cy="12.5" r="2.5"/></svg>`;
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
    const title = task.journeyRef || task.entityRef || task.taskId;
    if (this.mode === 'edit' && this.draft) {
      const draftProcess = this.draft.processes.find(item => item.processId === process.processId);
      const draftTask = draftProcess?.tasks.find(item => item.taskId === task.taskId);
      if (!draftTask) return nothing;
      const transitions = this.entities().find(entity => entity.entityId === draftTask.entityRef)?.transitions || [];
      return html`<article class=${`nr-workflows__task kind-${draftTask.kind}`}>
        <header><i>${this.taskIcon(draftTask.kind)}</i><div><span>${isStart ? this.t('workflows.start') : this.t('workflows.step', { number: index + 1 })}</span><code>${draftTask.taskId}</code></div><button type="button" title=${this.t('workflows.removeTask')} @click=${() => this.removeTask(draftTask.taskId)}>×</button></header>
        <div class="nr-workflows__task-form">
          <label><span>${this.t('workflows.taskKind')}</span><select @change=${(event: Event) => this.updateTaskKind(draftTask, (event.currentTarget as HTMLSelectElement).value as Ns5WorkflowTask['kind'])}>${['human', 'mechanical', 'llm', 'wait'].map(kind => html`<option value=${kind} ?selected=${draftTask.kind === kind}>${this.t(`workflows.kind.${kind}`)}</option>`)}</select></label>
          ${draftTask.kind === 'human' ? html`
            <label><span>${this.t('workflows.actor')}</span><select @change=${(event: Event) => this.updateTask(draftTask.taskId, { actorRef: (event.currentTarget as HTMLSelectElement).value })}>${this.actors().map(actor => html`<option value=${actor.actorId} ?selected=${draftTask.actorRef === actor.actorId}>${actor.title} · ${actor.actorId}</option>`)}</select></label>
            <label><span>${this.t('workflows.journey')}</span><select @change=${(event: Event) => this.updateTask(draftTask.taskId, { journeyRef: (event.currentTarget as HTMLSelectElement).value })}>${this.journeys().map(journey => html`<option value=${journey.journeyId} ?selected=${draftTask.journeyRef === journey.journeyId}>${journey.business.title}</option>`)}</select></label>
          ` : nothing}
          ${draftTask.kind === 'mechanical' || draftTask.kind === 'llm' ? html`
            <label><span>${this.t('workflows.entity')}</span><select @change=${(event: Event) => this.updateTask(draftTask.taskId, { entityRef: (event.currentTarget as HTMLSelectElement).value, transitionRef: undefined })}>${this.entities().map(entity => html`<option value=${entity.entityId} ?selected=${draftTask.entityRef === entity.entityId}>${entity.title}</option>`)}</select></label>
            <label><span>${this.t('workflows.effect')}</span><select @change=${(event: Event) => this.updateTask(draftTask.taskId, { effect: (event.currentTarget as HTMLSelectElement).value as Ns5WorkflowTask['effect'], transitionRef: undefined })}>${['create', 'update', 'transition'].map(effect => html`<option value=${effect} ?selected=${draftTask.effect === effect}>${this.t(`workflows.effect.${effect}`)}</option>`)}</select></label>
            ${draftTask.effect === 'transition' ? html`<label><span>${this.t('workflows.transition')}</span><select @change=${(event: Event) => this.updateTask(draftTask.taskId, { transitionRef: (event.currentTarget as HTMLSelectElement).value })}><option value="" ?selected=${!draftTask.transitionRef}>${this.t('workflows.choose')}</option>${transitions.map(transition => html`<option value=${transition.transitionId} ?selected=${draftTask.transitionRef === transition.transitionId}>${transition.transitionId}</option>`)}</select></label>` : nothing}
          ` : nothing}
          <label class="is-wide"><span>${this.t('workflows.taskDescription')}</span><textarea .value=${draftTask.description} @input=${(event: Event) => this.updateTask(draftTask.taskId, { description: (event.currentTarget as HTMLTextAreaElement).value })}></textarea></label>
          <label class="is-wide"><span>${this.t('workflows.next')}</span><select multiple @change=${(event: Event) => this.updateTask(draftTask.taskId, { next: [...(event.currentTarget as HTMLSelectElement).selectedOptions].map(option => option.value) })}>${draftProcess?.tasks.filter(item => item.taskId !== draftTask.taskId).map(item => html`<option value=${item.taskId} ?selected=${draftTask.next.includes(item.taskId)}>${item.taskId}</option>`)}</select></label>
        </div>
      </article>`;
    }
    return html`<article class=${`nr-workflows__task kind-${task.kind}`}><header><i>${this.taskIcon(task.kind)}</i><div><span>${isStart ? this.t('workflows.start') : this.t('workflows.step', { number: index + 1 })}</span><code>${task.taskId}</code></div><b>${this.t(`workflows.kind.${task.kind}`)}</b></header><h4>${title}</h4><p>${task.description}</p><div class="nr-workflows__task-meta">${task.actorRef ? html`<span>${this.t('workflows.actor')}: <strong>${task.actorRef}</strong></span>` : nothing}${task.effect ? html`<span>${this.t('workflows.effect')}: <strong>${this.t(`workflows.effect.${task.effect}`)}</strong></span>` : nothing}${task.transitionRef ? html`<code>${task.transitionRef}</code>` : nothing}</div><footer><span>${this.t('workflows.next')}</span>${next.length ? next.map(label => html`<code>${label}</code>`) : html`<strong>${this.t('workflows.end')}</strong>`}</footer></article>`;
  }

  private renderProcess(process: WorkflowProcessView) {
    const editable = this.mode === 'edit' && this.draft;
    const draftProcess = editable ? this.draft!.processes.find(item => item.processId === process.processId) : null;
    const trigger = draftProcess?.trigger;
    return html`<main class="nr-workflows__detail"><header><div><span>${this.t('workflows.selected')}</span>${editable ? html`<input class="nr-workflows__title-input" .value=${draftProcess!.title} @input=${(event: Event) => this.updateProcess({ title: (event.currentTarget as HTMLInputElement).value })}>` : html`<h3>${process.title}</h3>`}<code>${process.processId}</code></div>${this.mode === 'view' ? html`<button class="nr-button" type="button" @click=${() => this.beginEdit()}>${this.t('workflows.edit')}</button>` : html`<button class="nr-danger" type="button" @click=${() => this.removeProcess()}>${this.t('workflows.removeProcess')}</button>`}</header>${editable ? html`<label class="nr-workflows__description"><span>${this.t('workflows.processDescription')}</span><textarea .value=${draftProcess!.description} @input=${(event: Event) => this.updateProcess({ description: (event.currentTarget as HTMLTextAreaElement).value })}></textarea></label><section class="nr-workflows__trigger is-edit"><div><span>${this.t('workflows.trigger')}</span><select @change=${(event: Event) => { const kind = (event.currentTarget as HTMLSelectElement).value as Ns5WorkflowProcess['trigger']['kind']; this.updateProcess({ trigger: kind === 'manual' ? { kind, actorRef: this.actors()[0]?.actorId || '' } : kind === 'event' ? { kind, event: '' } : { kind, schedule: '' } }); }}>${['manual', 'event', 'scheduled'].map(kind => html`<option value=${kind} ?selected=${trigger!.kind === kind}>${this.t(`workflows.trigger.${kind}`)}</option>`)}</select></div>${trigger!.kind === 'manual' ? html`<label><span>${this.t('workflows.actor')}</span><select @change=${(event: Event) => this.updateProcess({ trigger: { kind: 'manual', actorRef: (event.currentTarget as HTMLSelectElement).value } })}>${this.actors().map(actor => html`<option value=${actor.actorId} ?selected=${trigger!.actorRef === actor.actorId}>${actor.title}</option>`)}</select></label>` : html`<label><span>${trigger!.kind === 'event' ? this.t('workflows.event') : this.t('workflows.schedule')}</span><input .value=${trigger!.kind === 'event' ? trigger!.event || '' : trigger!.schedule || ''} @input=${(event: Event) => this.updateProcess({ trigger: trigger!.kind === 'event' ? { kind: 'event', event: (event.currentTarget as HTMLInputElement).value } : { kind: 'scheduled', schedule: (event.currentTarget as HTMLInputElement).value } })}></label>`}</section>` : html`<p class="nr-workflows__process-description">${process.description}</p><section class="nr-workflows__trigger"><i></i><div><span>${this.t('workflows.trigger')}</span><strong>${process.trigger ? this.t(`workflows.trigger.${process.trigger.kind}`) : this.t('workflows.trigger.undeclared')}</strong><code>${this.triggerSummary(process)}</code></div></section>`}${this.renderIssues()}<section class="nr-workflows__flow"><header><div><span>${this.t('workflows.flow')}</span><p>${this.t('workflows.flowDescription')}</p></div><strong>${this.t('workflows.taskCount', { count: process.tasks.length })}</strong></header><div>${process.tasks.map((task, index) => this.renderTask(process, task, index))}${editable ? html`<button class="nr-workflows__add-task" type="button" @click=${() => this.addTask()}>+ ${this.t('workflows.addTask')}</button>` : nothing}</div></section></main>`;
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
    return html`<section class="nr-workflows"><header class="nr-workflows__hero"><div><span>${this.t('workflows.eyebrow')}</span><h2>${this.t('workflows.title')}</h2><p>${this.t('workflows.description')}</p><small class=${`schema-${view.schema}`}>${this.t(`workflows.schema.${view.schema}`)}</small></div><dl><div><dt>${this.t('workflows.processes')}</dt><dd>${view.processes.length}</dd></div><div><dt>${this.t('workflows.tasks')}</dt><dd>${workflowTaskCount(view.processes)}</dd></div><div><dt>${this.t('workflows.decisions')}</dt><dd>${view.journeyDecisions.length}</dd></div></dl></header><div class="nr-workflows__workspace"><aside class="nr-workflows__catalog"><header><span>${this.t('workflows.catalog')}</span>${view.schema === 'v2' ? html`<button type="button" @click=${() => this.addProcess()}>+ ${this.t('workflows.addProcess')}</button>` : nothing}</header>${view.processes.map(item => html`<button type="button" class=${item.processId === this.selectedProcessId ? 'is-active' : ''} @click=${() => { this.selectedProcessId = item.processId; }}><i>${this.taskIcon(item.tasks[0]?.kind || 'wait')}</i><span><strong>${item.title}</strong><small>${this.triggerSummary(item)}</small></span><b>${item.tasks.length}</b></button>`)}${!view.processes.length ? html`<p>${this.t('workflows.noProcesses')}</p>` : nothing}</aside>${process ? this.renderProcess(process) : html`<section class="nr-workflows__empty-detail"><h3>${this.t('workflows.noSelection')}</h3><p>${this.t('workflows.noSelectionDescription')}</p>${view.schema === 'v2' ? html`<button type="button" @click=${() => this.addProcess()}>+ ${this.t('workflows.addProcess')}</button>` : nothing}</section>`}</div>${this.renderDecisions()}${this.mode === 'edit' ? html`<footer class="nr-workflows__edit-footer"><span>${this.dirty ? this.t('workflows.unsaved') : this.t('workflows.noChanges')}</span><div><button type="button" @click=${() => this.cancelEdit()}>${this.t('workflows.cancel')}</button><button class="is-primary" type="button" ?disabled=${!this.dirty} @click=${() => void this.saveEdit()}>${this.t('workflows.save')}</button></div></footer>` : nothing}</section>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'new-release--widgets--workflows-102035': NewReleaseWorkflows102035; } }
