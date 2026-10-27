/// <mls fileReference="_102035_/l2/newRelease/widgets/journeys.ts" enhancement="_102027_/l2/enhancementLit" />

import { html, nothing, type PropertyValues } from 'lit';
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
  canDiscardNewReleaseDraft,
  type NewReleaseEditableTab,
  type NewReleaseTabPresentation,
  type NewReleaseEditMode,
} from '/_102035_/l2/newRelease/editContract.js';
import type { NewReleaseValidationIssue } from '/_102035_/l2/solution/candidate/tobePaths.js';
import {
  validNewJourneyStepId,
  journeyStepGroups,
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

import { renderNewReleaseIcon } from '/_102035_/l2/newRelease/widgets/iconPicker.js';
import { JOURNEY_ICON_DEFAULTS, iconNeedsFallback, withNewReleaseIcon } from '/_102035_/l2/newRelease/widgets/iconModel.js';

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
  @state() private opened = false;
  @state() private selectedStepId = '';
  @state() private newStepId = '';
  @state() private creatingStep = false;
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
    if (changed.has('data') && !this.journeys().some(j => j.journeyId === this.selectedJourneyId)) {
      this.selectedJourneyId = ''; this.opened = false; this.selectedStepId = '';
    }
    if (['data', 'opened', 'mode', 'selectedStepId', 'creatingStep', 'journeyDraft'].some(key => changed.has(key))) {
      const presentation: NewReleaseTabPresentation = {
        filters: this.actors().map(actor => ({id: actor.actorId, label: actor.title, rootIds: this.journeys().filter(journey => journey.business.actorRef === actor.actorId).map(journey => journey.journeyId)})),
        nodes: this.journeys().map(journey => ({ id: journey.journeyId, label: journey.business.title, value: journey.journeyId,
          children: journey.business.steps.map(step => ({ id: `${journey.journeyId}/${step.stepId}`, label: step.title, value: step.stepId, children: [] })) })),
        detail: this.mode === 'edit' || !!this.selectedStepId || this.creatingStep,
        select: id => { const [journeyId, stepId] = id.split('/'); this.selectJourney(journeyId); this.selectedStepId = stepId || ''; },
        back: () => { if (!canDiscardNewReleaseDraft(this)) return; this.cancelEdit(); if (this.selectedStepId) this.selectedStepId = ''; else this.opened = false; },
      };
      this.dispatchEvent(new CustomEvent('nr-view-state', { bubbles: true, composed: true, detail: presentation }));
    }
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
    if (!canDiscardNewReleaseDraft(this)) return;
    this.cancelEdit(); this.selectedJourneyId = journeyId; this.selectedStepId = ''; this.opened = true;
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
    this.creatingStep = false;
  }

  private updateJourney(next: Ns5JourneyArtifact) {
    this.journeyDraft = next;
    this.journeyDirty = JSON.stringify(next) !== JSON.stringify(this.sourceJourneys().find(item => item.journeyId === next.journeyId));
    this.gateIssues = [];
    this.editMessage = '';
    if (this.indexDraft) {
      this.indexDraft = syncJourneyIndex(this.indexDraft, next);
      this.indexDirty = JSON.stringify(this.indexDraft) !== JSON.stringify(this.data?.artifacts.journeyIndex.value);
    }
    this.dirty = this.journeyDirty || this.indexDirty;
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
    const id = this.newStepId.trim();
    if (!validNewJourneyStepId(this.journeyDraft, id)) {
      this.editMessage = this.t('journeys.invalidStepId'); return;
    }
    const entity = this.entities()[0]?.entityId || '';
    const steps = [...this.journeyDraft.business.steps, {
      stepId: id, kind: 'locate' as const, entity,
      title: this.t('journeys.newStepTitle'), description: this.t('journeys.newStepDescription'),
    }];
    this.updateBusiness({ steps });
    this.selectedStepId = id; this.creatingStep = false;
  }

  private removeStep(stepId: string) {
    if (!globalThis.confirm(this.t('journeys.confirmRemoveStep'))) return;
    if (this.journeyDraft) this.updateBusiness({ steps: this.journeyDraft.business.steps.filter(step => step.stepId !== stepId) });
    this.selectedStepId = '';
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
    if (!this.indexDraft) return;
    this.indexDraft = moveJourney(this.indexDraft, journeyId, targetJourneyId);
    this.indexDirty = true;
    this.dirty = true;
  }

  private async saveEdit() {
    if (!this.journeyDraft || !this.indexDraft || !this.dirty) return;
    try {
      const [gate, contracts] = await Promise.all([
        import('/_102035_/l2/solution/gates/journeys20/gate.js'),
        import('/_102035_/l2/solution/gates/journeys20/contracts.js'),
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
      if (this.journeyDirty) await announceNewReleaseChange(this, { path: journeyPath(hashed.journeyId), jsonPath: '$', value: hashed });
      if (this.indexDirty) await announceNewReleaseChange(this, { path: 'journeys/index.defs.ts', jsonPath: '$', value: index });
      this.cancelEdit();
    } catch (error) {
      this.editMessage = this.t('journeys.gateUnavailable', { message: error instanceof Error ? error.message : String(error) });
    }
  }

  private openEntity(entityId: string) {
    this.dispatchEvent(new CustomEvent('nr-navigate', { bubbles: true, composed: true, detail: { tab: 'ontology', entityId } }));
  }

  private renderJourneyList() {
    const journeys = this.opened ? this.journeys().filter(j => j.journeyId === this.selectedJourneyId) : this.journeys();
    const actors = [...new Set(journeys.map(j => j.business.actorRef))];
    return html`${actors.map(actor => html`<section class="nr-journeys__group"><h3>${this.actorTitle(actor)}</h3><div class="nr-journeys__cards">${journeys.filter(j => j.business.actorRef === actor).map(journey => html`<button type="button" class=${this.opened ? 'is-active' : ''} @click=${() => this.selectJourney(journey.journeyId)}><span>${renderNewReleaseIcon(journey.business.icon, 'route')}</span><div><strong>${journey.business.title}</strong></div></button>`)}</div></section>`)}`;
  }

  private renderTransitions(step: Ns5JourneyStep, journey: Ns5JourneyArtifact) {
    const options = journeyTransitions(this.entities(), step.entity, journey.business.actorRef);
    if (!options.length) return nothing;
    return html`<div class="nr-step__exits"><span>${this.t('journeys.decisionExits')}</span>${options.map(option => html`<div class=${option.eligible ? '' : 'is-disabled'}><code>${option.from.join(' · ')}</code><b>→</b><code>${option.to}</code><small>${option.description}</small></div>`)}</div>`;
  }

  private renderStepEdit(step: Ns5JourneyStep) {
    const transitions = journeyTransitions(this.entities(), step.entity, this.journeyDraft?.business.actorRef || '');
    return html`<div class="nr-step__edit"><label><span>${this.t('journeys.stepId')}</span><input readonly .value=${step.stepId}></label>
      <new-release--widgets--icon-picker-102035 .value=${step.icon || ''} .fallback=${JOURNEY_ICON_DEFAULTS[step.kind]} .t=${this.t} @nr-icon-selected=${(event: CustomEvent<string>) => {
        if (!this.journeyDraft) return;
        this.updateBusiness({steps: this.journeyDraft.business.steps.map(item => item.stepId === step.stepId ? withNewReleaseIcon(item, event.detail) : item)});
      }}></new-release--widgets--icon-picker-102035>
      <label><span>${this.t('journeys.decisionRef')}</span><select .value=${step.decisionRef || ''} @change=${(event: Event) => this.updateStep(step.stepId, { decisionRef: (event.currentTarget as HTMLSelectElement).value || undefined })}><option value="" ?selected=${!step.decisionRef}>${this.t('journeys.noDecisionRef')}</option>${(this.journeyDraft?.business.steps || []).filter(item => item.kind === 'decide' && item.stepId !== step.stepId).map(item => html`<option value=${item.stepId} ?selected=${step.decisionRef === item.stepId}>${item.title}</option>`)}</select></label>
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

  private renderStepCard(step: Ns5JourneyStep) {
    return html`<button class=${`nr-step__open ${step.kind === 'decide' ? 'is-decision' : ''}`} type="button" @click=${() => { this.selectedStepId = step.stepId; }}><span>${renderNewReleaseIcon(step.icon, JOURNEY_ICON_DEFAULTS[step.kind])}</span><strong>${step.title}</strong></button>`;
  }

  private renderTimeline(journey: Ns5JourneyArtifact) {
    return html`<ol class="nr-journeys__timeline" aria-label=${this.t('journeys.path')}>${journeyStepGroups(journey).map(({ step, branches }) => {
      return html`<li>${this.renderStepCard(step)}${branches.length ? html`<ol class="nr-journeys__branches">${branches.map(branch => html`<li>${this.renderStepCard(branch)}</li>`)}</ol>` : nothing}</li>`;
    })}</ol>`;
  }

  private renderIssues(journey: Ns5JourneyArtifact) {
    const source = [...(this.data?.validation.issues || []), ...this.suppliedIssues];
    const issues = [...new Map(journeyIssues(source, journey.journeyId).map(issue => [`${issue.code}:${issue.message}`, issue])).values()];
    const all = [...issues.map(issue => ({ severity: issue.severity, message: issue.message, code: issue.code })), ...this.gateIssues.map(issue => ({ ...issue, code: 'gate' }))];
    if (!all.length && !this.editMessage) return nothing;
    return html`<section class="nr-journeys__issues" role="alert"><strong>${this.t('journeys.issues')}</strong>${this.editMessage ? html`<p>${this.editMessage}</p>` : nothing}${all.map(issue => html`<div class=${`is-${issue.severity}`}><span>${issue.code}</span><p>${issue.message}</p></div>`)}</section>`;
  }

  private renderDetail(journey: Ns5JourneyArtifact) {
    const step = journey.business.steps.find(item => item.stepId === this.selectedStepId);
    return html`<main class="nr-journeys__detail">
      ${this.renderIssues(journey)}
      ${this.creatingStep ? html`<label>${this.t('journeys.stepId')}<input .value=${this.newStepId} @input=${(e: Event) => { this.newStepId = (e.currentTarget as HTMLInputElement).value; }}></label><button class="nr-button" @click=${() => this.addStep()}>${this.t('journeys.addStep')}</button>`
      : step ? html`<h2>${step.title}</h2>${this.mode === 'edit' ? this.renderStepEdit(step) : html`<code>${step.stepId}</code><p>${step.description}</p><p>${this.entityTitle(step.entity)} · ${this.t(`journeys.kind.${step.kind}`)}</p><button class="nr-button" @click=${() => this.beginEdit()}>${this.t('journeys.edit')}</button>`}${this.mode === 'edit' ? html`<button class="nr-button" @click=${() => this.removeStep(step.stepId)}>${this.t('journeys.removeStep')}</button>` : nothing}`
      : this.mode === 'edit' ? html`<new-release--widgets--icon-picker-102035 .value=${journey.business.icon || ''} fallback="route" .t=${this.t} @nr-icon-selected=${(event: CustomEvent<string>) => {if (this.journeyDraft) this.updateJourney({...this.journeyDraft, business: withNewReleaseIcon(this.journeyDraft.business, event.detail)});}}></new-release--widgets--icon-picker-102035><label>${this.t('journeys.journey')}<input .value=${journey.business.title} @input=${(e: Event) => this.updateBusiness({ title: (e.currentTarget as HTMLInputElement).value })}></label><label>${this.t('journeys.goal')}<textarea .value=${journey.business.goal} @input=${(e: Event) => this.updateBusiness({ goal: (e.currentTarget as HTMLTextAreaElement).value })}></textarea></label><code>${journey.journeyId}</code>`
      : html`<p>${journey.business.goal}</p><button class="nr-button" @click=${() => this.beginEdit()}>${this.t('journeys.edit')}</button><button class="nr-button" @click=${() => { this.beginEdit(); this.creatingStep = true; this.newStepId = ''; }}>${this.t('journeys.addStep')}</button>${this.renderTimeline(journey)}<section class="nr-journeys__outcome"><h3>${journey.business.outcome.statement}</h3><div>${journey.business.outcome.evidence.map(e => html`<p>${e}</p>`)}</div></section>`}
    </main>`;
  }

  render() {
    const journey = this.currentJourney();
    return html`<section class="nr-journeys">${this.journeys().some(item => iconNeedsFallback(item.business.icon) || item.business.steps.some(step => iconNeedsFallback(step.icon))) ? html`<p role="status">${this.t('icons.fallbackNotice')}</p>` : nothing}${this.opened && !this.selectedStepId && this.mode !== 'edit' ? html`<button class="nr-button" @click=${() => { this.opened = false; }}>${this.t('common.back')}</button>` : nothing}${this.renderJourneyList()}${this.opened && journey ? this.renderDetail(journey) : nothing}${this.mode === 'edit' ? html`<footer class="nr-journeys__edit-footer"><span>${this.dirty ? this.t('journeys.unsaved') : this.t('journeys.noChanges')}</span><div><button @click=${() => { if (canDiscardNewReleaseDraft(this)) this.cancelEdit(); }}>${this.t('journeys.cancel')}</button><button class="is-primary" ?disabled=${!this.dirty} @click=${() => void this.saveEdit()}>${this.t('journeys.save')}</button></div></footer>` : nothing}</section>`;
  }

}

declare global {
  interface HTMLElementTagNameMap {
    'new-release--widgets--journeys-102035': NewReleaseJourneys102035;
  }
}
