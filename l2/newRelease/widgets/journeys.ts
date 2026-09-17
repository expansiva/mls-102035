/// <mls fileReference="_102035_/l2/newRelease/widgets/journeys.ts" enhancement="_102027_/l2/enhancementLit" />

import { html, nothing, svg, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import type {
  Ns5JourneyArtifact,
  Ns5JourneyIndexArtifact,
  Ns5JourneyStep,
  Ns5ModuleActor,
  Ns5OntologyEntityArtifact,
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
  JOURNEY_ENTRY_MODES,
  JOURNEY_STEP_KINDS,
  journeyIssues,
  journeyPath,
  journeyTransitions,
  moveJourney,
  moveJourneyStep,
  nextJourneyStepId,
  orderedJourneys,
  syncJourneyIndex,
} from '/_102035_/l2/newRelease/widgets/journeysModel.js';

type JourneyView = 'cards' | 'table';

@customElement('new-release--widgets--journeys-102035')
export class NewReleaseJourneys102035 extends StateLitElement implements NewReleaseEditableTab<Ns5JourneyArtifact | null> {
  @property({ type: Number }) project = 0;
  @property({ type: String, attribute: 'module-name' }) moduleName = '';
  @property({ type: String }) version: NewReleaseVersion = 'asis';
  @property({ attribute: false }) data: NewReleaseModuleData | null = null;
  @property({ attribute: false }) t: NewReleaseTranslate = key => key;
  @property({ type: String }) mode: NewReleaseEditMode = 'view';
  @property({ type: Boolean }) dirty = false;

  @state() private selectedJourneyId = '';
  @state() private actorFilter = 'all';
  @state() private view: JourneyView = 'cards';
  @state() private journeyDraft: Ns5JourneyArtifact | null = null;
  @state() private indexDraft: Ns5JourneyIndexArtifact | null = null;
  @state() private suppliedIssues: NewReleaseValidationIssue[] = [];
  @state() private gateIssues: Array<{ severity: 'error' | 'warning'; message: string }> = [];
  @state() private editMessage = '';

  private journeyDirty = false;
  private indexDirty = false;
  private draggedJourneyId = '';
  private draggedStepId = '';

  createRenderRoot() { return this; }

  updated(changed: PropertyValues) {
    if (!changed.has('data')) return;
    const journeys = this.journeys();
    if (!journeys.some(journey => journey.journeyId === this.selectedJourneyId)) {
      this.selectedJourneyId = journeys[0]?.journeyId || '';
    }
    if (journeys.length >= 6 && this.view === 'cards') this.view = 'table';
  }

  getDraft(): Ns5JourneyArtifact | null {
    const journey = this.currentJourney();
    return journey ? structuredClone(journey) : null;
  }

  setIssues(issues: NewReleaseValidationIssue[]) {
    this.suppliedIssues = issues.filter(issue => String(issue.artifact).startsWith('journeys/'));
  }

  private actors(): Ns5ModuleActor[] {
    return this.data?.artifacts.access.value?.actors
      || this.data?.pipeline?.steps.module10?.actors
      || [];
  }

  private entities(): Ns5OntologyEntityArtifact[] {
    return this.data?.artifacts.entities.map(item => item.value)
      .filter((item): item is Ns5OntologyEntityArtifact => !!item) || [];
  }

  private sourceJourneys(): Ns5JourneyArtifact[] {
    return this.data?.artifacts.journeys.map(item => item.value)
      .filter((item): item is Ns5JourneyArtifact => !!item) || [];
  }

  private currentIndex(): Ns5JourneyIndexArtifact | null {
    return this.mode === 'edit' && this.indexDraft
      ? this.indexDraft
      : this.data?.artifacts.journeyIndex.value || null;
  }

  private journeys(): Ns5JourneyArtifact[] {
    const values = this.sourceJourneys().map(item => this.mode === 'edit' && this.journeyDraft?.journeyId === item.journeyId
      ? this.journeyDraft
      : item);
    return orderedJourneys(this.currentIndex(), values);
  }

  private visibleJourneys(): Ns5JourneyArtifact[] {
    return this.journeys().filter(journey => this.actorFilter === 'all' || journey.business.actorRef === this.actorFilter);
  }

  private currentJourney(): Ns5JourneyArtifact | null {
    return this.journeys().find(item => item.journeyId === this.selectedJourneyId) || null;
  }

  private actorTitle(actorId: string): string {
    return this.actors().find(actor => actor.actorId === actorId)?.title || actorId;
  }

  private entityTitle(entityId: string): string {
    return this.entities().find(entity => entity.entityId === entityId)?.title || entityId;
  }

  private selectJourney(journeyId: string) {
    if (journeyId === this.selectedJourneyId) return;
    this.cancelEdit();
    this.selectedJourneyId = journeyId;
  }

  private beginEdit() {
    const journey = this.currentJourney();
    const index = this.currentIndex();
    if (!journey || !index) return;
    this.journeyDraft = structuredClone(journey);
    this.indexDraft = structuredClone(index);
    this.mode = 'edit';
    this.dirty = false;
    this.journeyDirty = false;
    this.indexDirty = false;
    this.gateIssues = [];
    this.editMessage = '';
  }

  private cancelEdit() {
    this.journeyDraft = null;
    this.indexDraft = null;
    this.mode = 'view';
    this.dirty = false;
    this.journeyDirty = false;
    this.indexDirty = false;
    this.gateIssues = [];
    this.editMessage = '';
    this.draggedJourneyId = '';
    this.draggedStepId = '';
  }

  private updateJourney(next: Ns5JourneyArtifact) {
    this.journeyDraft = next;
    this.journeyDirty = true;
    this.dirty = true;
    this.gateIssues = [];
    this.editMessage = '';
    if (this.indexDraft) {
      this.indexDraft = syncJourneyIndex(this.indexDraft, next);
      this.indexDirty = true;
    }
  }

  private updateBusiness(patch: Partial<Ns5JourneyArtifact['business']>) {
    if (!this.journeyDraft) return;
    this.updateJourney({ ...this.journeyDraft, business: { ...this.journeyDraft.business, ...patch } });
  }

  private updateStep(stepId: string, patch: Partial<Ns5JourneyStep>) {
    if (!this.journeyDraft) return;
    const steps = this.journeyDraft.business.steps.map(step => {
      if (step.stepId !== stepId) return step;
      const next: Ns5JourneyStep = { ...step, ...patch };
      if (patch.kind) {
        if (next.kind !== 'act') {
          delete next.effect;
          delete next.transitionRef;
          delete next.affects;
        } else if (!next.effect) next.effect = 'update';
        if (next.kind !== 'handoff') delete next.handoffTo;
        else if (!next.handoffTo) next.handoffTo = this.actors()[0]?.actorId || '';
      }
      if (patch.entity && next.transitionRef) {
        const valid = journeyTransitions(this.entities(), next.entity, this.journeyDraft!.business.actorRef)
          .some(option => option.transitionId === next.transitionRef && option.eligible);
        if (!valid) delete next.transitionRef;
      }
      if (patch.effect && next.effect !== 'transition') delete next.transitionRef;
      return next;
    });
    this.updateBusiness({ steps });
  }

  private multiValues(event: Event): string[] {
    return [...(event.currentTarget as HTMLSelectElement).selectedOptions].map(option => option.value);
  }

  private addStep() {
    if (!this.journeyDraft) return;
    const entity = this.entities()[0]?.entityId || '';
    const steps = [...this.journeyDraft.business.steps, {
      stepId: nextJourneyStepId(this.journeyDraft), kind: 'locate' as const, entity,
      title: this.t('journeys.newStepTitle'), description: this.t('journeys.newStepDescription'),
    }];
    this.updateBusiness({ steps });
  }

  private removeStep(stepId: string) {
    if (this.journeyDraft) this.updateBusiness({ steps: this.journeyDraft.business.steps.filter(step => step.stepId !== stepId) });
  }

  private moveStep(stepId: string, targetStepId: string) {
    if (this.journeyDraft) this.updateJourney(moveJourneyStep(this.journeyDraft, stepId, targetStepId));
  }

  private moveStepBy(stepId: string, offset: -1 | 1) {
    if (!this.journeyDraft) return;
    const position = this.journeyDraft.business.steps.findIndex(step => step.stepId === stepId);
    const target = this.journeyDraft.business.steps[position + offset];
    if (target) this.moveStep(stepId, target.stepId);
  }

  private addEvidence() {
    if (!this.journeyDraft) return;
    const evidence = [...this.journeyDraft.business.outcome.evidence, this.t('journeys.newEvidence')];
    this.updateBusiness({ outcome: { ...this.journeyDraft.business.outcome, evidence } });
  }

  private updateEvidence(index: number, value: string) {
    if (!this.journeyDraft) return;
    const evidence = this.journeyDraft.business.outcome.evidence.map((item, position) => position === index ? value : item);
    this.updateBusiness({ outcome: { ...this.journeyDraft.business.outcome, evidence } });
  }

  private removeEvidence(index: number) {
    if (!this.journeyDraft) return;
    const evidence = this.journeyDraft.business.outcome.evidence.filter((_, position) => position !== index);
    this.updateBusiness({ outcome: { ...this.journeyDraft.business.outcome, evidence } });
  }

  private reorderJourney(journeyId: string, targetJourneyId: string) {
    if (!this.indexDraft || this.actorFilter !== 'all') return;
    this.indexDraft = moveJourney(this.indexDraft, journeyId, targetJourneyId);
    this.indexDirty = true;
    this.dirty = true;
  }

  private async saveEdit() {
    if (!this.journeyDraft || !this.indexDraft || !this.dirty) return;
    try {
      const [gate, contracts] = await Promise.all([
        import('/_102035_/l2/agentNewSolution5/steps/journeys20/gate.js'),
        import('/_102035_/l2/agentNewSolution5/steps/journeys20/contracts.js'),
      ]);
      const journeys = this.journeys();
      const result = gate.validateNs5Journeys(
        journeys.map(journey => ({ journeyId: journey.journeyId, business: journey.business })),
        { actors: this.actors(), moduleName: this.moduleName },
      );
      this.gateIssues = result.issues.map(issue => ({ severity: issue.severity, message: issue.message }));
      if (!result.ok) {
        this.editMessage = this.t('journeys.gateBlocked');
        return;
      }
      const hashed = await contracts.hashNs5Journey({
        journeyId: this.journeyDraft.journeyId,
        business: structuredClone(this.journeyDraft.business),
      });
      const index = syncJourneyIndex(this.indexDraft, hashed);
      if (this.journeyDirty) announceNewReleaseChange(this, { path: journeyPath(hashed.journeyId), jsonPath: '$', value: hashed });
      if (this.indexDirty) announceNewReleaseChange(this, { path: 'journeys/index.defs.ts', jsonPath: '$', value: index });
      this.cancelEdit();
    } catch (error) {
      this.editMessage = this.t('journeys.gateUnavailable', { message: error instanceof Error ? error.message : String(error) });
    }
  }

  private icon(kind: Ns5JourneyStep['kind']) {
    const common = (content: unknown) => svg`<svg viewBox="0 0 24 24" aria-hidden="true">${content}</svg>`;
    if (kind === 'locate') return common(svg`<circle cx="10" cy="10" r="5"/><path d="m14 14 5 5"/>`);
    if (kind === 'inspect') return common(svg`<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z"/><circle cx="12" cy="12" r="2.5"/>`);
    if (kind === 'act') return common(svg`<path d="m5 13 4 4L19 7"/>`);
    if (kind === 'decide') return common(svg`<path d="M12 3v5m0 0-5 5m5-5 5 5M7 13v5m10-5v5"/>`);
    return common(svg`<path d="M4 7h10m0 0-3-3m3 3-3 3M20 17H10m0 0 3-3m-3 3 3 3"/>`);
  }

  private openEntity(entityId: string) {
    this.dispatchEvent(new CustomEvent('nr-navigate', { bubbles: true, composed: true, detail: { tab: 'ontology', entityId } }));
  }

  private renderFilters() {
    const journeys = this.visibleJourneys();
    return html`<div class="nr-journeys__filters">
      <label><span>${this.t('journeys.actorFilter')}</span><select .value=${this.actorFilter} @change=${(event: Event) => { this.actorFilter = (event.currentTarget as HTMLSelectElement).value; const first = this.visibleJourneys()[0]; if (first) this.selectJourney(first.journeyId); }}><option value="all" ?selected=${this.actorFilter === 'all'}>${this.t('journeys.allActors')}</option>${this.actors().map(actor => html`<option value=${actor.actorId} ?selected=${this.actorFilter === actor.actorId}>${actor.title}</option>`)}</select></label>
      <span>${this.t('journeys.visibleCount', { count: journeys.length })}</span>
      ${this.journeys().length >= 6 ? html`<div class="nr-journeys__toggle" role="group" aria-label=${this.t('journeys.view')}><button class=${this.view === 'cards' ? 'is-active' : ''} type="button" @click=${() => { this.view = 'cards'; }}>${this.t('journeys.view.cards')}</button><button class=${this.view === 'table' ? 'is-active' : ''} type="button" @click=${() => { this.view = 'table'; }}>${this.t('journeys.view.table')}</button></div>` : nothing}
    </div>`;
  }

  private renderJourneyList() {
    const journeys = this.visibleJourneys();
    if (this.view === 'table' && this.journeys().length >= 6) return html`<div class="nr-journeys__table-wrap"><table><thead><tr><th>${this.t('journeys.order')}</th><th>${this.t('journeys.journey')}</th><th>${this.t('journeys.actor')}</th><th>${this.t('journeys.entry')}</th><th>${this.t('journeys.steps')}</th></tr></thead><tbody>${journeys.map((journey, position) => html`<tr class=${journey.journeyId === this.selectedJourneyId ? 'is-active' : ''} draggable=${this.mode === 'edit' && this.actorFilter === 'all' ? 'true' : 'false'} @dragstart=${() => { this.draggedJourneyId = journey.journeyId; }} @dragover=${(event: DragEvent) => event.preventDefault()} @drop=${() => this.reorderJourney(this.draggedJourneyId, journey.journeyId)} @click=${() => this.selectJourney(journey.journeyId)}><td>${String(position + 1).padStart(2, '0')}</td><td><strong>${journey.business.title}</strong><small>${journey.business.goal}</small></td><td>${this.actorTitle(journey.business.actorRef)}</td><td>${this.t(`journeys.entry.${journey.business.entry.mode}`)}</td><td>${journey.business.steps.length}</td></tr>`)}</tbody></table></div>`;
    return html`<div class="nr-journeys__cards">${journeys.map((journey, position) => html`<button type="button" class=${journey.journeyId === this.selectedJourneyId ? 'is-active' : ''} draggable=${this.mode === 'edit' && this.actorFilter === 'all' ? 'true' : 'false'} @dragstart=${() => { this.draggedJourneyId = journey.journeyId; }} @dragover=${(event: DragEvent) => event.preventDefault()} @drop=${() => this.reorderJourney(this.draggedJourneyId, journey.journeyId)} @click=${() => this.selectJourney(journey.journeyId)}><span>${String(position + 1).padStart(2, '0')}</span><div><strong>${journey.business.title}</strong><small>${this.actorTitle(journey.business.actorRef)}</small><p>${journey.business.goal}</p></div><i title=${this.t(`journeys.entry.${journey.business.entry.mode}`)}>${journey.business.entry.mode === 'coldStart' ? '↗' : journey.business.entry.mode === 'fromNotification' ? '◉' : '⌕'}</i></button>`)}</div>`;
  }

  private renderTransitions(step: Ns5JourneyStep, journey: Ns5JourneyArtifact) {
    const options = journeyTransitions(this.entities(), step.entity, journey.business.actorRef);
    if (!options.length) return nothing;
    return html`<div class="nr-step__exits"><span>${this.t('journeys.decisionExits')}</span>${options.map(option => html`<div class=${option.eligible ? '' : 'is-disabled'}><code>${option.from.join(' · ')}</code><b>→</b><code>${option.to}</code><small>${option.description}</small></div>`)}</div>`;
  }

  private renderStepEdit(step: Ns5JourneyStep) {
    const transitions = journeyTransitions(this.entities(), step.entity, this.journeyDraft?.business.actorRef || '');
    return html`<div class="nr-step__edit">
      <label><span>${this.t('journeys.stepTitle')}</span><input .value=${step.title} @input=${(event: Event) => this.updateStep(step.stepId, { title: (event.currentTarget as HTMLInputElement).value })}></label>
      <label><span>${this.t('journeys.kind')}</span><select .value=${step.kind} @change=${(event: Event) => this.updateStep(step.stepId, { kind: (event.currentTarget as HTMLSelectElement).value as Ns5JourneyStep['kind'] })}>${JOURNEY_STEP_KINDS.map(kind => html`<option value=${kind} ?selected=${step.kind === kind}>${this.t(`journeys.kind.${kind}`)}</option>`)}</select></label>
      <label><span>${this.t('journeys.entity')}</span><select .value=${step.entity} @change=${(event: Event) => this.updateStep(step.stepId, { entity: (event.currentTarget as HTMLSelectElement).value })}>${this.entities().map(entity => html`<option value=${entity.entityId} ?selected=${step.entity === entity.entityId}>${entity.title}</option>`)}</select></label>
      <label class="is-wide"><span>${this.t('journeys.stepDescription')}</span><textarea .value=${step.description} @input=${(event: Event) => this.updateStep(step.stepId, { description: (event.currentTarget as HTMLTextAreaElement).value })}></textarea></label>
      ${step.kind === 'act' ? html`<label><span>${this.t('journeys.effect')}</span><select .value=${step.effect || 'update'} @change=${(event: Event) => this.updateStep(step.stepId, { effect: (event.currentTarget as HTMLSelectElement).value as Ns5JourneyStep['effect'] })}><option value="create" ?selected=${step.effect === 'create'}>${this.t('journeys.effect.create')}</option><option value="update" ?selected=${!step.effect || step.effect === 'update'}>${this.t('journeys.effect.update')}</option><option value="transition" ?selected=${step.effect === 'transition'}>${this.t('journeys.effect.transition')}</option></select></label>
      <label><span>${this.t('journeys.affects')}</span><select multiple @change=${(event: Event) => this.updateStep(step.stepId, { affects: this.multiValues(event) })}>${this.entities().filter(entity => entity.entityId !== step.entity).map(entity => html`<option value=${entity.entityId} ?selected=${step.affects?.includes(entity.entityId)}>${entity.title}</option>`)}</select></label>
      ${step.effect === 'transition' ? html`<label class="is-wide"><span>${this.t('journeys.transition')}</span><select .value=${step.transitionRef || ''} @change=${(event: Event) => this.updateStep(step.stepId, { transitionRef: (event.currentTarget as HTMLSelectElement).value })}><option value="" ?selected=${!step.transitionRef}>${this.t('journeys.chooseTransition')}</option>${transitions.map(option => html`<option value=${option.transitionId} ?selected=${step.transitionRef === option.transitionId} ?disabled=${!option.eligible}>${option.transitionId} · ${option.from.join(', ')} → ${option.to}${option.eligible ? '' : ` · ${this.t('journeys.notAllowed')}`}</option>`)}</select></label>` : nothing}` : nothing}
      ${step.kind === 'handoff' ? html`<label><span>${this.t('journeys.handoffTo')}</span><select .value=${step.handoffTo || ''} @change=${(event: Event) => this.updateStep(step.stepId, { handoffTo: (event.currentTarget as HTMLSelectElement).value })}>${this.actors().map(actor => html`<option value=${actor.actorId} ?selected=${step.handoffTo === actor.actorId}>${actor.title}</option>`)}</select></label>` : nothing}
    </div>`;
  }

  private renderTimeline(journey: Ns5JourneyArtifact) {
    return html`<ol class="nr-journeys__timeline" aria-label=${this.t('journeys.path')}>${journey.business.steps.map((step, position) => html`<li draggable=${this.mode === 'edit' ? 'true' : 'false'} @dragstart=${() => { this.draggedStepId = step.stepId; }} @dragover=${(event: DragEvent) => event.preventDefault()} @drop=${() => this.moveStep(this.draggedStepId, step.stepId)}><div class="nr-step__rail"><span>${this.icon(step.kind)}</span><i></i></div><article><header><div><small>${String(position + 1).padStart(2, '0')} · ${this.t(`journeys.kind.${step.kind}`)}</small><h3>${step.title}</h3></div>${this.mode === 'edit' ? html`<div class="nr-step__actions"><button type="button" ?disabled=${position === 0} title=${this.t('journeys.moveUp')} aria-label=${this.t('journeys.moveUp')} @click=${() => this.moveStepBy(step.stepId, -1)}>↑</button><button type="button" ?disabled=${position === journey.business.steps.length - 1} title=${this.t('journeys.moveDown')} aria-label=${this.t('journeys.moveDown')} @click=${() => this.moveStepBy(step.stepId, 1)}>↓</button><button class="is-remove" type="button" title=${this.t('journeys.removeStep')} aria-label=${this.t('journeys.removeStep')} @click=${() => this.removeStep(step.stepId)}>×</button></div>` : nothing}</header>${this.mode === 'edit' ? this.renderStepEdit(step) : html`<p>${step.description}</p>`}<div class="nr-step__meta"><button type="button" @click=${() => this.openEntity(step.entity)}>${this.entityTitle(step.entity)}</button>${step.effect ? html`<span class="is-effect">${this.t(`journeys.effect.${step.effect}`)}${step.transitionRef ? ` → ${step.transitionRef}` : ''}</span>` : nothing}${(step.affects || []).map(entity => html`<span>${this.t('journeys.affectsOne')} ${this.entityTitle(entity)}</span>`)}${step.handoffTo ? html`<span class="is-handoff">${this.t('journeys.handoff')} ${this.actorTitle(step.handoffTo)}</span>` : nothing}</div>${step.kind === 'decide' ? this.renderTransitions(step, journey) : nothing}</article></li>`)}</ol>`;
  }

  private renderIssues(journey: Ns5JourneyArtifact) {
    const source = [...(this.data?.validation.issues || []), ...this.suppliedIssues];
    const issues = [...new Map(journeyIssues(source, journey.journeyId).map(issue => [`${issue.code}:${issue.message}`, issue])).values()];
    const all = [...issues.map(issue => ({ severity: issue.severity, message: issue.message, code: issue.code })), ...this.gateIssues.map(issue => ({ ...issue, code: 'gate' }))];
    if (!all.length && !this.editMessage) return nothing;
    return html`<section class="nr-journeys__issues" role="alert"><strong>${this.t('journeys.issues')}</strong>${this.editMessage ? html`<p>${this.editMessage}</p>` : nothing}${all.map(issue => html`<div class=${`is-${issue.severity}`}><span>${issue.code}</span><p>${issue.message}</p></div>`)}</section>`;
  }

  private renderDetail(journey: Ns5JourneyArtifact) {
    const business = journey.business;
    return html`<main class="nr-journeys__detail"><header><div><span>${this.t('journeys.selected')}</span>${this.mode === 'edit' ? html`<input class="nr-journeys__title-input" .value=${business.title} @input=${(event: Event) => this.updateBusiness({ title: (event.currentTarget as HTMLInputElement).value })}>` : html`<h2>${business.title}</h2>`}<code>${journey.journeyId}</code></div>${this.mode === 'view' ? html`<button class="nr-button" type="button" @click=${() => this.beginEdit()}>${this.t('journeys.edit')}</button>` : html`<span class="nr-journeys__editing">${this.t('journeys.editing')}</span>`}</header>
      <section class="nr-journeys__intent"><label><span>${this.t('journeys.actor')}</span>${this.mode === 'edit' ? html`<select .value=${business.actorRef} @change=${(event: Event) => this.updateBusiness({ actorRef: (event.currentTarget as HTMLSelectElement).value })}>${this.actors().map(actor => html`<option value=${actor.actorId} ?selected=${business.actorRef === actor.actorId}>${actor.title}</option>`)}</select>` : html`<strong>${this.actorTitle(business.actorRef)}</strong>`}</label><label><span>${this.t('journeys.entry')}</span>${this.mode === 'edit' ? html`<select .value=${business.entry.mode} @change=${(event: Event) => this.updateBusiness({ entry: { mode: (event.currentTarget as HTMLSelectElement).value as Ns5JourneyArtifact['business']['entry']['mode'] } })}>${JOURNEY_ENTRY_MODES.map(mode => html`<option value=${mode} ?selected=${business.entry.mode === mode}>${this.t(`journeys.entry.${mode}`)}</option>`)}</select>` : html`<strong>${this.t(`journeys.entry.${business.entry.mode}`)}</strong>`}</label><label class="is-wide"><span>${this.t('journeys.goal')}</span>${this.mode === 'edit' ? html`<textarea .value=${business.goal} @input=${(event: Event) => this.updateBusiness({ goal: (event.currentTarget as HTMLTextAreaElement).value })}></textarea>` : html`<p>${business.goal}</p>`}</label></section>
      ${this.renderIssues(journey)}
      <section class="nr-journeys__path"><header><div><span>${this.t('journeys.path')}</span><p>${this.t('journeys.pathDescription')}</p></div><strong>${this.t('journeys.stepCount', { count: business.steps.length })}</strong></header>${this.renderTimeline(journey)}${this.mode === 'edit' ? html`<button class="nr-journeys__add" type="button" @click=${() => this.addStep()}>+ ${this.t('journeys.addStep')}</button>` : nothing}</section>
      <section class="nr-journeys__outcome"><header><span>✓</span><div><small>${this.t('journeys.outcome')}</small>${this.mode === 'edit' ? html`<textarea .value=${business.outcome.statement} @input=${(event: Event) => this.updateBusiness({ outcome: { ...business.outcome, statement: (event.currentTarget as HTMLTextAreaElement).value } })}></textarea>` : html`<h3>${business.outcome.statement}</h3>`}</div></header><div><strong>${this.t('journeys.evidence')}</strong>${business.outcome.evidence.map((evidence, index) => this.mode === 'edit' ? html`<label><input .value=${evidence} @input=${(event: Event) => this.updateEvidence(index, (event.currentTarget as HTMLInputElement).value)}><button type="button" @click=${() => this.removeEvidence(index)}>×</button></label>` : html`<p><i>✓</i>${evidence}</p>`)}${this.mode === 'edit' ? html`<button class="nr-journeys__add-evidence" type="button" @click=${() => this.addEvidence()}>+ ${this.t('journeys.addEvidence')}</button>` : nothing}</div></section>
    </main>`;
  }

  render() {
    const journey = this.currentJourney();
    const index = this.currentIndex();
    if (!journey || !index) return html`<section class="nr-journeys__empty"><h2>${this.t('journeys.emptyTitle')}</h2><p>${this.t('journeys.emptyBody')}</p></section>`;
    return html`<section class="nr-journeys"><header class="nr-journeys__hero"><div><span>${this.t('journeys.eyebrow')}</span><h2>${this.t('journeys.title')}</h2><p>${this.t('journeys.description')}</p></div><div><strong>${index.journeys.length}</strong><span>${this.t('journeys.plural')}</span></div></header>${this.renderFilters()}${this.renderJourneyList()}${this.renderDetail(journey)}${this.mode === 'edit' ? html`<footer class="nr-journeys__edit-footer"><span>${this.dirty ? this.t('journeys.unsaved') : this.t('journeys.noChanges')}</span><div><button type="button" @click=${() => this.cancelEdit()}>${this.t('journeys.cancel')}</button><button class="is-primary" type="button" ?disabled=${!this.dirty} @click=${() => void this.saveEdit()}>${this.t('journeys.save')}</button></div></footer>` : nothing}</section>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'new-release--widgets--journeys-102035': NewReleaseJourneys102035;
  }
}
