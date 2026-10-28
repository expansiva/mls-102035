/// <mls fileReference="_102035_/l2/newRelease/widgets/rules.ts" enhancement="_102027_/l2/enhancementLit" />
import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { ns5RuleRecord } from '/_102035_/l2/solution/rulesView.js';
import type { Ns5RulesAny } from '/_102035_/l2/solution/types.js';
import type { NewReleaseVersion } from '/_102035_/l2/newRelease/helpers/context.js';
import type { NewReleaseModuleData } from '/_102035_/l2/newRelease/helpers/l4Reader.js';
import type { NewReleaseTranslate } from '/_102035_/l2/newRelease/helpers/i18n.js';
import { announceNewReleaseChange, canDiscardNewReleaseDraft, requestNewReleaseEdit, type NewReleaseEditMode, type NewReleaseEditableTab, type NewReleaseTabPresentation } from '/_102035_/l2/newRelease/editContract.js';
import type { NewReleaseValidationIssue } from '/_102035_/l2/solution/candidate/tobePaths.js';
import { patchRuleText, humanizeRuleKey, ontologyRuleCitations, rulePresentationGroups, ruleEntityIds, citationsForRule, rulesOracleIssues } from '/_102035_/l2/newRelease/widgets/rulesModel.js';

@customElement('new-release--widgets--rules-102035')
export class NewReleaseRules102035 extends StateLitElement implements NewReleaseEditableTab<Ns5RulesAny | null> {
  @property({type: Number}) project = 0;
  @property({type: String, attribute: 'module-name'}) moduleName = '';
  @property({type: String}) version: NewReleaseVersion = 'asis';
  @property({attribute: false}) data: NewReleaseModuleData | null = null;
  @property({attribute: false}) t: NewReleaseTranslate = key => key;
  @property({type: String}) mode: NewReleaseEditMode = 'view';
  @property({type: Boolean}) dirty = false;
  @state() private selected = '';
  @state() private draft: Ns5RulesAny | null = null;
  @state() private saving = false;
  @state() private message = '';
  @state() private issues: NewReleaseValidationIssue[] = [];
  private snapshot = '';
  createRenderRoot() { return this; }
  private artifact(): Ns5RulesAny | null { return this.draft || this.data?.artifacts.rules.value || null; }
  private entities() { return (this.data?.artifacts.entities || []).flatMap(item => item.value ? [item.value] : []); }
  private rules() { const artifact = this.artifact(); return artifact ? Object.entries(ns5RuleRecord(artifact)).map(([ruleId, description]) => ({ruleId, description})) : []; }
  private citations() { return ontologyRuleCitations(this.rules(), this.entities()); }
  private groups() { return rulePresentationGroups(this.rules(), this.citations(), this.entities(), this.t('rules.orphanGroup')); }
  getDraft() { return this.artifact() ? structuredClone(this.artifact()) : null; }
  setIssues(issues: NewReleaseValidationIssue[]) { this.issues = rulesOracleIssues(issues); }
  updated(changed: PropertyValues) {
    if (changed.has('data') || changed.has('version') || changed.has('moduleName') || changed.has('project')) this.reset();
    if (changed.has('data') || changed.has('selected') || changed.has('mode') || changed.has('t') || changed.has('draft')) this.present();
  }
  private present() {
    const citations = this.citations();
    const presentation: NewReleaseTabPresentation = {
      detail: !!this.selected,
      nodes: this.groups().map(group => ({id: `group:${group.entityId || ''}`, label: `${group.title} (${group.rules.length})`, value: '', children: group.rules.map(rule => ({id: `rule:${rule.ruleId}`, label: humanizeRuleKey(rule.ruleId), suffix: this.ruleSuffix(rule.ruleId, citations), value: rule.description, children: []}))})),
      select: id => { if (id.startsWith('rule:')) this.select(id.slice(5)); }, back: () => this.back(),
    };
    this.dispatchEvent(new CustomEvent('nr-view-state', {bubbles: true, composed: true, detail: presentation}));
  }
  private ruleSuffix(id: string, citations = this.citations()) { const count = ruleEntityIds(citations, id).length; return count > 1 ? `(${count})` : ''; }
  private select(id: string) {
    if (this.saving || !canDiscardNewReleaseDraft(this)) return;
    if (this.version === 'asis') { requestNewReleaseEdit(this, `rule:${id}`); return; }
    this.reset(); this.selected = id;
    if (!this.version.startsWith('release:')) this.edit();
  }
  private reset() { this.draft = null; this.snapshot = ''; this.mode = 'view'; this.dirty = false; this.message = ''; this.issues = []; }
  private back() { if (this.saving || !canDiscardNewReleaseDraft(this)) return; this.reset(); this.selected = ''; this.present(); }
  private edit() { if (this.version.startsWith('release:')) return; this.draft = this.getDraft(); this.snapshot = JSON.stringify(this.draft); this.mode = 'edit'; }
  private updateText(text: string) {
    if (!this.draft) return;
    this.draft = patchRuleText(this.draft, this.selected, text);
    this.dirty = JSON.stringify(this.draft) !== this.snapshot; this.message = '';
  }
  private async save() {
    if (!this.draft || !this.dirty || this.saving || this.version.startsWith('release:')) return;
    this.saving = true;
    try { await announceNewReleaseChange(this, {path: 'rules.defs.ts', jsonPath: '$', value: structuredClone(this.draft)}); this.reset(); }
    catch (error) { this.message = this.t('rules.gateUnavailable', {message: error instanceof Error ? error.message : String(error)}); }
    finally { this.saving = false; }
  }
  render() {
    const rule = this.rules().find(rule => rule.ruleId === this.selected);
    const citations = this.citations();
    return html`<section class="nr-rules" aria-label=${this.t('rules.title')}>
      ${rule ? html`<article class="nr-rules__detail"><header><h2>${humanizeRuleKey(rule.ruleId)}</h2>${this.mode === 'view' && !this.version.startsWith('release:') ? html`<button type="button" @click=${this.edit}>${this.t('rules.edit')}</button>` : nothing}</header>
        <label>${this.t('rules.key')}<input readonly .value=${rule.ruleId}></label>
        <label>${this.t('rules.businessStatement')}${this.mode === 'edit' ? html`<textarea ?disabled=${this.saving} .value=${rule.description} @input=${(event: Event) => this.updateText((event.currentTarget as HTMLTextAreaElement).value)}></textarea>` : html`<p>${rule.description}</p>`}</label>
        <section><h3>${this.t('rules.usedIn')}</h3>${citationsForRule(citations, rule.ruleId).map(citation => html`<p>${this.entities().find(entity => entity.entityId === citation.entityId)?.title || citation.entityId}${citation.transitionId ? html` — ${citation.label} <code>(${citation.transitionId})</code>` : nothing}</p>`)}${!citationsForRule(citations, rule.ruleId).length ? html`<p>${this.t('rules.orphanGroup')}</p>` : nothing}</section>
        ${this.mode === 'edit' ? html`<footer><span>${this.t(this.dirty ? 'rules.unsaved' : 'rules.noChanges')}</span><button type="button" ?disabled=${this.saving} @click=${() => {if (canDiscardNewReleaseDraft(this)) this.reset();}}>${this.t('rules.cancel')}</button><button type="button" ?disabled=${!this.dirty || this.saving} @click=${this.save}>${this.t('rules.save')}</button></footer>` : nothing}
      </article>` : html`<div class="nr-rules__panels">${this.groups().map(group => html`<section class="nr-rules__group"><h2>${group.title} (${group.rules.length})</h2><div>${group.rules.map(rule => html`<button type="button" @click=${() => this.select(rule.ruleId)}><span class="nr-rules__name">${humanizeRuleKey(rule.ruleId)}</span><span class="nr-rules__count">${this.ruleSuffix(rule.ruleId, citations)}</span></button>`)}</div></section>`)}</div>`}
      ${this.message || this.issues.length ? html`<div role="alert">${this.message}${this.issues.map(issue => html`<p>${issue.message}</p>`)}</div>` : nothing}
    </section>`;
  }
}
declare global { interface HTMLElementTagNameMap { 'new-release--widgets--rules-102035': NewReleaseRules102035; } }
