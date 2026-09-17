/// <mls fileReference="_102035_/l2/newRelease/widgets/rules.ts" enhancement="_102027_/l2/enhancementLit" />

import { html, nothing, svg, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { ns5RuleRecord } from '/_102035_/l2/solution/rulesView.js';
import type {
  Ns5JourneyArtifact,
  Ns5OntologyEntityArtifact,
  Ns5Rule,
  Ns5RulesArtifact,
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
  citationsForRule,
  collectRuleCitations,
  filterRules,
  groupRulesByEntity,
  isValidNewRuleId,
  ruleEntityIds,
  rulesOracleIssues,
  type RuleCitation,
} from '/_102035_/l2/newRelease/widgets/rulesModel.js';

interface RuleIssueView {
  severity: 'error' | 'warning';
  code: string;
  message: string;
}

@customElement('new-release--widgets--rules-102035')
export class NewReleaseRules102035 extends StateLitElement implements NewReleaseEditableTab<Ns5RulesArtifact | null> {
  @property({ type: Number }) project = 0;
  @property({ type: String, attribute: 'module-name' }) moduleName = '';
  @property({ type: String }) version: NewReleaseVersion = 'asis';
  @property({ attribute: false }) data: NewReleaseModuleData | null = null;
  @property({ attribute: false }) t: NewReleaseTranslate = key => key;
  @property({ type: String }) mode: NewReleaseEditMode = 'view';
  @property({ type: Boolean }) dirty = false;

  @state() private selectedRuleId = '';
  @state() private query = '';
  @state() private rulesDraft: Ns5RulesArtifact | null = null;
  @state() private newRuleId = '';
  @state() private suppliedIssues: NewReleaseValidationIssue[] = [];
  @state() private gateIssues: RuleIssueView[] = [];
  @state() private editMessage = '';

  createRenderRoot() { return this; }

  updated(changed: PropertyValues) {
    if (!changed.has('data') || this.mode === 'edit') return;
    const rules = this.currentRules()?.rules || [];
    if (!rules.some(rule => rule.ruleId === this.selectedRuleId)) this.selectedRuleId = rules[0]?.ruleId || '';
  }

  getDraft(): Ns5RulesArtifact | null {
    const rules = this.currentRules();
    return rules ? structuredClone(rules) : null;
  }

  setIssues(issues: NewReleaseValidationIssue[]) {
    this.suppliedIssues = rulesOracleIssues(issues);
  }

  private currentRules(): Ns5RulesArtifact | null {
    return this.mode === 'edit' && this.rulesDraft
      ? this.rulesDraft
      : this.data?.artifacts.rules.value || null;
  }

  private entities(): Ns5OntologyEntityArtifact[] {
    return this.data?.artifacts.entities.map(item => item.value)
      .filter((item): item is Ns5OntologyEntityArtifact => !!item) || [];
  }

  private journeys(): Ns5JourneyArtifact[] {
    return this.data?.artifacts.journeys.map(item => item.value)
      .filter((item): item is Ns5JourneyArtifact => !!item) || [];
  }

  private citations(): RuleCitation[] {
    return collectRuleCitations(this.currentRules()?.rules || [], this.entities(), this.journeys());
  }

  private rule(): Ns5Rule | null {
    return this.currentRules()?.rules.find(rule => rule.ruleId === this.selectedRuleId) || null;
  }

  private entityTitle(entityId: string): string {
    return this.entities().find(entity => entity.entityId === entityId)?.title || entityId;
  }

  private journeyTitle(journeyId: string): string {
    return this.journeys().find(journey => journey.journeyId === journeyId)?.business.title || journeyId;
  }

  private beginEdit() {
    const artifact = this.currentRules();
    if (!artifact) return;
    this.rulesDraft = structuredClone(artifact);
    this.mode = 'edit';
    this.dirty = false;
    this.gateIssues = [];
    this.editMessage = '';
  }

  private cancelEdit() {
    this.rulesDraft = null;
    this.mode = 'view';
    this.dirty = false;
    this.newRuleId = '';
    this.gateIssues = [];
    this.editMessage = '';
    const rules = this.currentRules()?.rules || [];
    if (!rules.some(rule => rule.ruleId === this.selectedRuleId)) this.selectedRuleId = rules[0]?.ruleId || '';
  }

  private updateRules(next: Ns5RulesArtifact) {
    this.rulesDraft = next;
    this.dirty = true;
    this.gateIssues = [];
    this.editMessage = '';
  }

  private updateDescription(description: string) {
    if (!this.rulesDraft) return;
    this.updateRules({
      ...this.rulesDraft,
      rules: this.rulesDraft.rules.map(rule => rule.ruleId === this.selectedRuleId ? { ...rule, description } : rule),
    });
  }

  private addRule() {
    const current = this.currentRules();
    const ruleId = this.newRuleId.trim();
    if (!current || !isValidNewRuleId(current, ruleId)) {
      this.editMessage = this.t('rules.newIdInvalid');
      return;
    }
    if (this.mode !== 'edit') this.beginEdit();
    const draft = this.rulesDraft!;
    const rule: Ns5Rule = { ruleId, description: this.t('rules.newDescription') };
    this.query = '';
    this.newRuleId = '';
    this.selectedRuleId = ruleId;
    this.updateRules({ ...draft, rules: [...draft.rules, rule] });
  }

  private removeRule() {
    if (!this.rulesDraft || citationsForRule(this.citations(), this.selectedRuleId).length) return;
    const rules = this.rulesDraft.rules.filter(rule => rule.ruleId !== this.selectedRuleId);
    this.selectedRuleId = rules[0]?.ruleId || '';
    this.updateRules({ ...this.rulesDraft, rules });
  }

  private navigate(citation: RuleCitation) {
    const detail = citation.kind === 'journey'
      ? { tab: 'journeys', journeyId: citation.journeyId }
      : { tab: 'ontology', entityId: citation.entityId };
    this.dispatchEvent(new CustomEvent('nr-navigate', { bubbles: true, composed: true, detail }));
  }

  private async saveEdit() {
    if (!this.rulesDraft || !this.dirty) return;
    try {
      const gate = await import('/_102035_/l2/agentNewSolution5/steps/rules40/gate.js');
      const result = gate.validateNs5Rules(ns5RuleRecord(this.rulesDraft), { moduleName: this.moduleName });
      this.gateIssues = result.issues.map(issue => ({ severity: issue.severity, code: issue.code, message: issue.message }));
      if (!result.ok) {
        this.editMessage = this.t('rules.gateBlocked');
        return;
      }
      announceNewReleaseChange(this, { path: 'rules.defs.ts', jsonPath: '$', value: structuredClone(this.rulesDraft) });
      this.cancelEdit();
    } catch (error) {
      this.editMessage = this.t('rules.gateUnavailable', { message: error instanceof Error ? error.message : String(error) });
    }
  }

  private ruleIcon(orphan: boolean) {
    return orphan
      ? svg`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 3.5 19h17Z"/><path d="M12 9v4m0 3h.01"/></svg>`
      : svg`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 12 2.2 2.2L16 8.5"/></svg>`;
  }

  private renderRuleList(artifact: Ns5RulesArtifact, citations: RuleCitation[]) {
    const filtered = filterRules(artifact.rules, citations, this.query);
    const groups = groupRulesByEntity(filtered, citations);
    return html`<aside class="nr-rules__catalog"><label class="nr-rules__search"><span>${this.t('rules.search')}</span><input type="search" .value=${this.query} placeholder=${this.t('rules.searchPlaceholder')} @input=${(event: Event) => { this.query = (event.currentTarget as HTMLInputElement).value; }}></label><div class="nr-rules__groups">${groups.map(group => html`<section><header><span>${group.entityId ? this.entityTitle(group.entityId) : this.t('rules.orphanGroup')}</span><small>${group.rules.length}</small></header>${group.rules.map(rule => {
      const count = citationsForRule(citations, rule.ruleId).length;
      return html`<button type="button" class=${rule.ruleId === this.selectedRuleId ? 'is-active' : ''} @click=${() => { this.selectedRuleId = rule.ruleId; }}><i class=${count ? '' : 'is-orphan'}>${this.ruleIcon(!count)}</i><span><strong>${rule.ruleId}</strong><small>${rule.description}</small></span><b title=${this.t('rules.citationCount', { count })}>${count}</b></button>`;
    })}</section>`)}</div>${!filtered.length ? html`<p class="nr-rules__no-results">${this.t('rules.noResults')}</p>` : nothing}<form @submit=${(event: SubmitEvent) => { event.preventDefault(); this.addRule(); }}><label><span>${this.t('rules.newRuleId')}</span><input .value=${this.newRuleId} placeholder=${this.t('rules.newRulePlaceholder')} @input=${(event: Event) => { this.newRuleId = (event.currentTarget as HTMLInputElement).value; this.editMessage = ''; }}></label><button type="submit">+ ${this.t('rules.addRule')}</button></form></aside>`;
  }

  private renderCitation(citation: RuleCitation) {
    const title = citation.kind === 'journey' && citation.journeyId
      ? this.journeyTitle(citation.journeyId)
      : this.entityTitle(citation.entityId);
    return html`<button type="button" class=${`kind-${citation.kind}`} @click=${() => this.navigate(citation)}><i>${citation.kind === 'transition' ? '↗' : citation.kind === 'journey' ? '→' : 'ƒ'}</i><span><strong>${this.t(`rules.citation.${citation.kind}`)}</strong><b>${title}</b><code>${citation.label}</code></span></button>`;
  }

  private renderIssues() {
    const source = [...(this.data?.validation.issues || []), ...this.suppliedIssues];
    const oracle = rulesOracleIssues(source).map(issue => ({ severity: issue.severity, code: issue.code, message: issue.message }));
    const issues = [...new Map([...oracle, ...this.gateIssues].map(issue => [`${issue.code}:${issue.message}`, issue])).values()];
    if (!issues.length && !this.editMessage) return nothing;
    return html`<section class="nr-rules__issues" role="alert"><strong>${this.t('rules.issues')}</strong>${this.editMessage ? html`<p>${this.editMessage}</p>` : nothing}${issues.map(issue => html`<div class=${`is-${issue.severity}`}><code>${issue.code}</code><p>${issue.message}</p></div>`)}</section>`;
  }

  private renderDetail(rule: Ns5Rule, citations: RuleCitation[]) {
    const ruleCitations = citationsForRule(citations, rule.ruleId);
    const entities = ruleEntityIds(citations, rule.ruleId);
    const removable = !ruleCitations.length;
    return html`<main class="nr-rules__detail"><header><div><span>${this.t('rules.selected')}</span><h2>${rule.ruleId}</h2>${entities.length ? html`<div>${entities.map(entityId => html`<button type="button" @click=${() => this.navigate({ ruleId: rule.ruleId, kind: 'transition', entityId, label: entityId })}>${this.entityTitle(entityId)}</button>`)}</div>` : html`<small>${this.t('rules.orphan')}</small>`}</div>${this.mode === 'view' ? html`<button class="nr-button" type="button" @click=${() => this.beginEdit()}>${this.t('rules.edit')}</button>` : html`<span class="nr-rules__editing">${this.t('rules.editing')}</span>`}</header><section class="nr-rules__statement"><span aria-hidden="true">§</span><div><strong>${this.t('rules.businessStatement')}</strong>${this.mode === 'edit' ? html`<textarea .value=${rule.description} @input=${(event: Event) => this.updateDescription((event.currentTarget as HTMLTextAreaElement).value)}></textarea>` : html`<p>${rule.description}</p>`}</div></section>${this.renderIssues()}<section class="nr-rules__citations"><header><div><span>${this.t('rules.citedBy')}</span><p>${this.t('rules.citedByDescription')}</p></div><strong>${this.t('rules.citationCount', { count: ruleCitations.length })}</strong></header>${ruleCitations.length ? html`<div>${ruleCitations.map(citation => this.renderCitation(citation))}</div>` : html`<div class="nr-rules__orphan"><i>${this.ruleIcon(true)}</i><div><strong>${this.t('rules.orphanTitle')}</strong><p>${this.t('rules.orphanDescription')}</p></div></div>`}</section>${this.mode === 'edit' ? html`<section class="nr-rules__remove"><div><strong>${removable ? this.t('rules.removeAvailable') : this.t('rules.removeBlocked')}</strong><p>${removable ? this.t('rules.removeAvailableDescription') : this.t('rules.removeBlockedDescription')}</p></div><button type="button" ?disabled=${!removable} @click=${() => this.removeRule()}>${this.t('rules.remove')}</button></section>` : nothing}</main>`;
  }

  render() {
    const artifact = this.currentRules();
    if (!artifact) return html`<section class="nr-rules__empty"><h2>${this.t('rules.emptyTitle')}</h2><p>${this.t('rules.emptyBody')}</p></section>`;
    const citations = this.citations();
    const orphanCount = artifact.rules.filter(rule => !citationsForRule(citations, rule.ruleId).length).length;
    const rule = this.rule();
    return html`<section class="nr-rules"><header class="nr-rules__hero"><div><span>${this.t('rules.eyebrow')}</span><h2>${this.t('rules.title')}</h2><p>${this.t('rules.description')}</p></div><dl><div><dt>${this.t('rules.plural')}</dt><dd>${artifact.rules.length}</dd></div><div><dt>${this.t('rules.citations')}</dt><dd>${citations.length}</dd></div><div><dt>${this.t('rules.orphans')}</dt><dd>${orphanCount}</dd></div></dl></header><div class="nr-rules__workspace">${this.renderRuleList(artifact, citations)}${rule ? this.renderDetail(rule, citations) : html`<section class="nr-rules__empty-detail"><h2>${this.t('rules.noSelection')}</h2><p>${this.t('rules.noSelectionDescription')}</p></section>`}</div>${this.mode === 'edit' ? html`<footer class="nr-rules__edit-footer"><span>${this.dirty ? this.t('rules.unsaved') : this.t('rules.noChanges')}</span><div><button type="button" @click=${() => this.cancelEdit()}>${this.t('rules.cancel')}</button><button class="is-primary" type="button" ?disabled=${!this.dirty} @click=${() => void this.saveEdit()}>${this.t('rules.save')}</button></div></footer>` : nothing}</section>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'new-release--widgets--rules-102035': NewReleaseRules102035;
  }
}
