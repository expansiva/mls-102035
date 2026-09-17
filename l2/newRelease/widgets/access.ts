/// <mls fileReference="_102035_/l2/newRelease/widgets/access.ts" enhancement="_102027_/l2/enhancementLit" />

import { html, nothing, svg, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import type {
  Ns5AccessArtifact,
  Ns5AccessGrant,
  Ns5ModuleActor,
  Ns5OntologyEntityArtifact,
  Ns5OntologyIndexArtifact,
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
  accessAnchorPaths,
  accessFieldLabel,
  accessFieldRefs,
  accessGrantsForActor,
  accessJourneyCount,
  accessOracleIssues,
  bestAccessGrant,
  newAccessGrant,
  reachablePersonAnchors,
} from '/_102035_/l2/newRelease/widgets/accessModel.js';

const SCOPE_MODES: Ns5AccessGrant['dataScope']['mode'][] = ['own', 'assigned', 'related', 'public', 'organization', 'custom'];
const DISCLOSURE_MODES: Ns5AccessGrant['disclosure']['mode'][] = ['fullRecord', 'fieldsOnly', 'summaryOnly', 'aggregateOnly'];
const PERSON_SCOPE_MODES: Ns5AccessGrant['dataScope']['mode'][] = ['own', 'assigned', 'related'];
const LIMITED_DISCLOSURE_MODES: Ns5AccessGrant['disclosure']['mode'][] = ['fieldsOnly', 'summaryOnly'];
const ACTOR_KINDS: Ns5ModuleActor['kind'][] = ['internal', 'external', 'system'];

interface AccessIssueView {
  severity: 'error' | 'warning';
  code: string;
  message: string;
}

@customElement('new-release--widgets--access-102035')
export class NewReleaseAccess102035 extends StateLitElement implements NewReleaseEditableTab<Ns5AccessArtifact | null> {
  @property({ type: Number }) project = 0;
  @property({ type: String, attribute: 'module-name' }) moduleName = '';
  @property({ type: String }) version: NewReleaseVersion = 'asis';
  @property({ attribute: false }) data: NewReleaseModuleData | null = null;
  @property({ attribute: false }) t: NewReleaseTranslate = key => key;
  @property({ type: String }) mode: NewReleaseEditMode = 'view';
  @property({ type: Boolean }) dirty = false;

  @state() private selectedActorId = '';
  @state() private selectedGrantId = '';
  @state() private accessDraft: Ns5AccessArtifact | null = null;
  @state() private suppliedIssues: NewReleaseValidationIssue[] = [];
  @state() private gateIssues: AccessIssueView[] = [];
  @state() private editMessage = '';

  createRenderRoot() { return this; }

  updated(changed: PropertyValues) {
    if (!changed.has('data') || this.mode === 'edit') return;
    const access = this.currentAccess();
    if (!access) return;
    if (!access.actors.some(actor => actor.actorId === this.selectedActorId)) {
      this.selectedActorId = access.actors[0]?.actorId || '';
    }
    const grants = accessGrantsForActor(access, this.selectedActorId);
    if (!grants.some(grant => grant.grantId === this.selectedGrantId)) {
      this.selectedGrantId = grants[0]?.grantId || '';
    }
  }

  getDraft(): Ns5AccessArtifact | null {
    const access = this.currentAccess();
    return access ? structuredClone(access) : null;
  }

  setIssues(issues: NewReleaseValidationIssue[]) {
    this.suppliedIssues = accessOracleIssues(issues);
  }

  private currentAccess(): Ns5AccessArtifact | null {
    return this.mode === 'edit' && this.accessDraft
      ? this.accessDraft
      : this.data?.artifacts.access.value || null;
  }

  private entities(): Ns5OntologyEntityArtifact[] {
    return this.data?.artifacts.entities.map(item => item.value)
      .filter((item): item is Ns5OntologyEntityArtifact => item?.schemaVersion === '2026-09-11-ns5-ontology-v2') || [];
  }

  private index(): Ns5OntologyIndexArtifact | null {
    const value = this.data?.artifacts.ontologyIndex.value;
    return value?.schemaVersion === '2026-09-11-ns5-ontology-v2' ? value : null;
  }

  private journeys() {
    return this.data?.artifacts.journeys.map(item => item.value)
      .filter((item): item is NonNullable<typeof item> => !!item) || [];
  }

  private actor(): Ns5ModuleActor | null {
    return this.currentAccess()?.actors.find(actor => actor.actorId === this.selectedActorId) || null;
  }

  private grant(): Ns5AccessGrant | null {
    return this.currentAccess()?.grants.find(grant => grant.grantId === this.selectedGrantId) || null;
  }

  private entityTitle(entityId: string): string {
    return this.entities().find(entity => entity.entityId === entityId)?.title || entityId;
  }

  private selectActor(actorId: string) {
    this.selectedActorId = actorId;
    this.selectedGrantId = accessGrantsForActor(this.currentAccess()!, actorId)[0]?.grantId || '';
  }

  private selectGrant(grantId: string) {
    const grant = this.currentAccess()?.grants.find(item => item.grantId === grantId);
    if (!grant) return;
    this.selectedActorId = grant.actorRef;
    this.selectedGrantId = grantId;
  }

  private beginEdit() {
    const access = this.currentAccess();
    if (!access) return;
    this.accessDraft = structuredClone(access);
    this.mode = 'edit';
    this.dirty = false;
    this.gateIssues = [];
    this.editMessage = '';
  }

  private cancelEdit() {
    this.accessDraft = null;
    this.mode = 'view';
    this.dirty = false;
    this.gateIssues = [];
    this.editMessage = '';
    const access = this.currentAccess();
    const grants = access ? accessGrantsForActor(access, this.selectedActorId) : [];
    if (!grants.some(grant => grant.grantId === this.selectedGrantId)) this.selectedGrantId = grants[0]?.grantId || '';
  }

  private updateAccess(next: Ns5AccessArtifact) {
    this.accessDraft = next;
    this.dirty = true;
    this.gateIssues = [];
    this.editMessage = '';
  }

  private updateActor(patch: Partial<Pick<Ns5ModuleActor, 'title' | 'description' | 'kind'>>) {
    if (!this.accessDraft) return;
    this.updateAccess({
      ...this.accessDraft,
      actors: this.accessDraft.actors.map(actor => actor.actorId === this.selectedActorId ? { ...actor, ...patch } : actor),
    });
  }

  private updateGrant(patch: Partial<Ns5AccessGrant>) {
    if (!this.accessDraft) return;
    this.updateAccess({
      ...this.accessDraft,
      grants: this.accessDraft.grants.map(grant => grant.grantId === this.selectedGrantId ? { ...grant, ...patch } : grant),
    });
  }

  private updateScope(patch: Partial<Ns5AccessGrant['dataScope']>) {
    const grant = this.grant();
    if (!grant) return;
    const dataScope = { ...grant.dataScope, ...patch };
    if (patch.mode && !PERSON_SCOPE_MODES.includes(patch.mode)) delete dataScope.anchorEntity;
    if (patch.mode && PERSON_SCOPE_MODES.includes(patch.mode)) {
      const anchors = reachablePersonAnchors(grant.entityRefs, this.entities(), this.index());
      if (!anchors.some(anchor => anchor.entityId === dataScope.anchorEntity)) dataScope.anchorEntity = anchors[0]?.entityId;
    }
    this.updateGrant({ dataScope });
  }

  private updateDisclosure(patch: Partial<Ns5AccessGrant['disclosure']>) {
    const grant = this.grant();
    if (!grant) return;
    const disclosure = { ...grant.disclosure, ...patch };
    if (patch.mode && !LIMITED_DISCLOSURE_MODES.includes(patch.mode)) {
      delete disclosure.allowedFields;
      delete disclosure.deniedFields;
    }
    this.updateGrant({ disclosure });
  }

  private multiValues(event: Event): string[] {
    return [...(event.currentTarget as HTMLSelectElement).selectedOptions].map(option => option.value);
  }

  private updateEntities(entityRefs: string[]) {
    const grant = this.grant();
    if (!grant) return;
    const validFieldPrefixes = new Set(entityRefs.map(entityId => `${entityId}.`));
    const disclosure = {
      ...grant.disclosure,
      ...(grant.disclosure.allowedFields
        ? { allowedFields: grant.disclosure.allowedFields.filter(ref => [...validFieldPrefixes].some(prefix => ref.startsWith(prefix))) }
        : {}),
      ...(grant.disclosure.deniedFields
        ? { deniedFields: grant.disclosure.deniedFields.filter(ref => [...validFieldPrefixes].some(prefix => ref.startsWith(prefix))) }
        : {}),
    };
    const anchors = reachablePersonAnchors(entityRefs, this.entities(), this.index());
    const dataScope = { ...grant.dataScope };
    if (dataScope.anchorEntity && !anchors.some(anchor => anchor.entityId === dataScope.anchorEntity)) delete dataScope.anchorEntity;
    if (PERSON_SCOPE_MODES.includes(dataScope.mode) && !dataScope.anchorEntity) dataScope.anchorEntity = anchors[0]?.entityId;
    this.updateGrant({ entityRefs, dataScope, disclosure });
  }

  private addGrant(entityId = '') {
    const access = this.currentAccess();
    const actor = this.actor();
    if (!access || !actor) return;
    if (this.mode !== 'edit') this.beginEdit();
    const draft = this.accessDraft!;
    const grant = newAccessGrant(draft, actor, entityId || this.entities()[0]?.entityId || '', {
      title: this.t('access.newGrantTitle'),
      description: this.t('access.newGrantDescription'),
      scopeDescription: this.t('access.newScopeDescription'),
      disclosureDescription: this.t('access.newDisclosureDescription'),
    });
    this.selectedGrantId = grant.grantId;
    this.updateAccess({ ...draft, grants: [...draft.grants, grant] });
  }

  private removeGrant() {
    if (!this.accessDraft || !this.selectedGrantId) return;
    const grants = this.accessDraft.grants.filter(grant => grant.grantId !== this.selectedGrantId);
    const next = { ...this.accessDraft, grants };
    this.selectedGrantId = accessGrantsForActor(next, this.selectedActorId)[0]?.grantId || '';
    this.updateAccess(next);
  }

  private clickMatrix(actor: Ns5ModuleActor, entityId: string, grant: Ns5AccessGrant | null) {
    if (grant) {
      this.selectGrant(grant.grantId);
      return;
    }
    this.selectedActorId = actor.actorId;
    this.addGrant(entityId);
  }

  private async saveEdit() {
    if (!this.accessDraft || !this.dirty) return;
    try {
      const gate = await import('/_102035_/l2/agentNewSolution5/steps/access60/gate.js');
      const result = gate.validateNs5Access(this.accessDraft.grants, {
        moduleName: this.moduleName,
        actors: this.accessDraft.actors,
        entities: this.entities(),
        relationships: this.index()?.relationships || [],
        journeys: this.journeys(),
      });
      this.gateIssues = result.issues.map(issue => ({ severity: issue.severity, code: issue.code, message: issue.message }));
      if (!result.ok) {
        this.editMessage = this.t('access.gateBlocked');
        return;
      }
      announceNewReleaseChange(this, { path: 'access.defs.ts', jsonPath: '$', value: structuredClone(this.accessDraft) });
      this.cancelEdit();
    } catch (error) {
      this.editMessage = this.t('access.gateUnavailable', { message: error instanceof Error ? error.message : String(error) });
    }
  }

  private disclosureIcon(mode: Ns5AccessGrant['disclosure']['mode']) {
    if (mode === 'fullRecord') return svg`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4z"/><path d="M8 10h8M8 14h8"/></svg>`;
    if (mode === 'aggregateOnly') return svg`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18V9M12 18V5M19 18v-6"/></svg>`;
    return svg`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14M5 12h9M5 18h6"/><path d="m17 15 2 2 3-4"/></svg>`;
  }

  private renderMatrix(access: Ns5AccessArtifact) {
    const entities = this.entities();
    return html`<section class="nr-access__matrix"><header><div><span>${this.t('access.matrix')}</span><p>${this.t('access.matrixDescription')}</p></div><small>${this.t('access.matrixHint')}</small></header><div class="nr-access__matrix-scroll"><table><thead><tr><th>${this.t('access.actor')}</th>${entities.map(entity => html`<th title=${entity.entityId}>${entity.title}</th>`)}</tr></thead><tbody>${access.actors.map(actor => html`<tr class=${actor.actorId === this.selectedActorId ? 'is-selected' : ''}><th><button type="button" @click=${() => this.selectActor(actor.actorId)}><strong>${actor.title}</strong><code>${actor.actorId}</code></button></th>${entities.map(entity => {
      const grant = bestAccessGrant(access.grants, actor.actorId, entity.entityId);
      const accessLabel = grant
        ? `${this.t(`access.scope.${grant.dataScope.mode}`)} · ${this.t(`access.disclosure.${grant.disclosure.mode}`)}`
        : this.t('access.none');
      return html`<td><button type="button" class=${grant ? `has-grant scope-${grant.dataScope.mode}` : 'is-empty'} title=${grant ? `${grant.title} · ${accessLabel}` : this.t('access.matrixCreate')} aria-label=${this.t('access.matrixCell', { actor: actor.title, entity: entity.title, access: accessLabel })} @click=${() => this.clickMatrix(actor, entity.entityId, grant)}>${grant ? html`<span>${this.t(`access.scope.${grant.dataScope.mode}`)}</span><i title=${this.t(`access.disclosure.${grant.disclosure.mode}`)}>${this.disclosureIcon(grant.disclosure.mode)}</i>` : html`<span aria-hidden="true">+</span><small>${this.t('access.none')}</small>`}</button></td>`;
    })}</tr>`)}</tbody></table></div></section>`;
  }

  private renderActor(access: Ns5AccessArtifact, actor: Ns5ModuleActor) {
    const grants = accessGrantsForActor(access, actor.actorId);
    const journeyCount = accessJourneyCount(this.journeys(), actor.actorId);
    return html`<aside class="nr-access__actor"><header><span>${this.t('access.selectedActor')}</span><code>${actor.actorId}</code></header><div class="nr-access__actor-title">${this.mode === 'edit' ? html`<input .value=${actor.title} @input=${(event: Event) => this.updateActor({ title: (event.currentTarget as HTMLInputElement).value })}>` : html`<h2>${actor.title}</h2>`}<span class=${`kind-${actor.kind}`}>${this.t(`access.kind.${actor.kind}`)}</span></div>${this.mode === 'edit' ? html`<label><span>${this.t('access.kind')}</span><select .value=${actor.kind} @change=${(event: Event) => this.updateActor({ kind: (event.currentTarget as HTMLSelectElement).value as Ns5ModuleActor['kind'] })}>${ACTOR_KINDS.map(kind => html`<option value=${kind} ?selected=${actor.kind === kind}>${this.t(`access.kind.${kind}`)}</option>`)}</select></label><label><span>${this.t('access.actorDescription')}</span><textarea .value=${actor.description} @input=${(event: Event) => this.updateActor({ description: (event.currentTarget as HTMLTextAreaElement).value })}></textarea></label>` : html`<p>${actor.description}</p>`}<dl><div><dt>${this.t('access.origin')}</dt><dd>${this.t(`access.origin.${actor.origin}`)}</dd></div><div><dt>${this.t('access.journeys')}</dt><dd>${journeyCount}</dd></div><div><dt>${this.t('access.grants')}</dt><dd>${grants.length}</dd></div></dl><section class="nr-access__grant-list"><header><strong>${this.t('access.actorGrants')}</strong><button type="button" @click=${() => this.addGrant()}>+ ${this.t('access.addGrant')}</button></header>${grants.length ? grants.map(grant => html`<button type="button" class=${grant.grantId === this.selectedGrantId ? 'is-active' : ''} @click=${() => this.selectGrant(grant.grantId)}><span><strong>${grant.title}</strong><code>${grant.grantId}</code></span><i>${this.t(`access.scope.${grant.dataScope.mode}`)}</i></button>`) : html`<p class="nr-access__no-grants">${this.t('access.noGrants')}</p>`}</section></aside>`;
  }

  private renderGrantView(grant: Ns5AccessGrant) {
    const paths = accessAnchorPaths(grant, this.index());
    const allowed = grant.disclosure.allowedFields || [];
    const denied = grant.disclosure.deniedFields || [];
    const fieldChip = (ref: string) => html`<span class="nr-access__field-chip"><strong>${accessFieldLabel(ref, this.entities())}</strong><code>${ref}</code></span>`;
    return html`<article class="nr-access__grant-detail"><header><div><span>${this.t('access.selectedGrant')}</span><h2>${grant.title}</h2><code>${grant.grantId}</code></div><button class="nr-button" type="button" @click=${() => this.beginEdit()}>${this.t('access.edit')}</button></header><p class="nr-access__lead">${grant.description}</p><div class="nr-access__entities"><strong>${this.t('access.entities')}</strong>${grant.entityRefs.map(entityId => html`<button type="button" @click=${() => this.dispatchEvent(new CustomEvent('nr-navigate', { bubbles: true, composed: true, detail: { tab: 'ontology', entityId } }))}>${this.entityTitle(entityId)}</button>`)}</div><div class="nr-access__boundary"><section><span>${this.t('access.scope')}</span><h3>${this.t(`access.scope.${grant.dataScope.mode}`)}</h3><p>${grant.dataScope.description}</p>${grant.dataScope.anchorEntity ? html`<div class="nr-access__anchor"><strong>${this.t('access.anchor')}</strong><code>${grant.dataScope.anchorEntity}</code>${paths.map(path => html`<p><span>${path.entities.join(' → ')}</span><small>${path.relationships.length ? path.relationships.join(' · ') : this.t('access.sameEntity')}</small></p>`)}</div>` : nothing}</section><section><span>${this.t('access.disclosure')}</span><h3>${this.t(`access.disclosure.${grant.disclosure.mode}`)}</h3><p>${grant.disclosure.description}</p>${allowed.length || denied.length ? html`<div class="nr-access__field-groups">${allowed.length ? html`<div><strong>${this.t('access.allowedFields')}</strong>${allowed.map(fieldChip)}</div>` : nothing}${denied.length ? html`<div class="is-denied"><strong>${this.t('access.deniedFields')}</strong>${denied.map(fieldChip)}</div>` : nothing}</div>` : nothing}</section></div></article>`;
  }

  private renderGrantEdit(grant: Ns5AccessGrant) {
    const anchors = reachablePersonAnchors(grant.entityRefs, this.entities(), this.index());
    const fields = accessFieldRefs(grant, this.entities());
    const fieldOption = (ref: string) => `${accessFieldLabel(ref, this.entities())} — ${ref}`;
    return html`<article class="nr-access__grant-detail is-editing"><header><div><span>${this.t('access.editing')}</span><input class="nr-access__title-input" .value=${grant.title} @input=${(event: Event) => this.updateGrant({ title: (event.currentTarget as HTMLInputElement).value })}><code>${grant.grantId}</code></div><button class="nr-button is-danger" type="button" @click=${() => this.removeGrant()}>${this.t('access.removeGrant')}</button></header><label class="is-wide"><span>${this.t('access.grantDescription')}</span><textarea .value=${grant.description} @input=${(event: Event) => this.updateGrant({ description: (event.currentTarget as HTMLTextAreaElement).value })}></textarea></label><div class="nr-access__edit-grid"><label><span>${this.t('access.entities')}</span><select multiple @change=${(event: Event) => this.updateEntities(this.multiValues(event))}>${this.entities().map(entity => html`<option value=${entity.entityId} ?selected=${grant.entityRefs.includes(entity.entityId)}>${entity.title}</option>`)}</select></label><label><span>${this.t('access.scope')}</span><select .value=${grant.dataScope.mode} @change=${(event: Event) => this.updateScope({ mode: (event.currentTarget as HTMLSelectElement).value as Ns5AccessGrant['dataScope']['mode'] })}>${SCOPE_MODES.map(mode => html`<option value=${mode} ?selected=${grant.dataScope.mode === mode} ?disabled=${this.actor()?.kind === 'external' && mode !== 'own'}>${this.t(`access.scope.${mode}`)}</option>`)}</select></label>${PERSON_SCOPE_MODES.includes(grant.dataScope.mode) ? html`<label><span>${this.t('access.anchor')}</span><select .value=${grant.dataScope.anchorEntity || ''} @change=${(event: Event) => this.updateScope({ anchorEntity: (event.currentTarget as HTMLSelectElement).value || undefined })}><option value="" ?selected=${!grant.dataScope.anchorEntity}>${this.t('access.chooseAnchor')}</option>${anchors.map(anchor => html`<option value=${anchor.entityId} ?selected=${grant.dataScope.anchorEntity === anchor.entityId}>${anchor.title}</option>`)}</select><small>${anchors.length ? this.t('access.anchorReachable') : this.t('access.anchorUnavailable')}</small></label>` : nothing}<label class="is-wide"><span>${this.t('access.scopeDescription')}</span><textarea .value=${grant.dataScope.description} @input=${(event: Event) => this.updateScope({ description: (event.currentTarget as HTMLTextAreaElement).value })}></textarea></label><label><span>${this.t('access.disclosure')}</span><select .value=${grant.disclosure.mode} @change=${(event: Event) => this.updateDisclosure({ mode: (event.currentTarget as HTMLSelectElement).value as Ns5AccessGrant['disclosure']['mode'] })}>${DISCLOSURE_MODES.map(mode => html`<option value=${mode} ?selected=${grant.disclosure.mode === mode}>${this.t(`access.disclosure.${mode}`)}</option>`)}</select></label><label class="is-wide"><span>${this.t('access.disclosureDescription')}</span><textarea .value=${grant.disclosure.description} @input=${(event: Event) => this.updateDisclosure({ description: (event.currentTarget as HTMLTextAreaElement).value })}></textarea></label>${LIMITED_DISCLOSURE_MODES.includes(grant.disclosure.mode) ? html`<label><span>${this.t('access.allowedFields')}</span><select multiple @change=${(event: Event) => this.updateDisclosure({ allowedFields: this.multiValues(event) })}>${fields.map(ref => html`<option value=${ref} ?selected=${grant.disclosure.allowedFields?.includes(ref)}>${fieldOption(ref)}</option>`)}</select></label><label><span>${this.t('access.deniedFields')}</span><select multiple @change=${(event: Event) => this.updateDisclosure({ deniedFields: this.multiValues(event) })}>${fields.map(ref => html`<option value=${ref} ?selected=${grant.disclosure.deniedFields?.includes(ref)}>${fieldOption(ref)}</option>`)}</select></label>` : nothing}</div></article>`;
  }

  private issues(): AccessIssueView[] {
    const source = [...(this.data?.validation.issues || []), ...this.suppliedIssues];
    const mapped = accessOracleIssues(source).map(issue => ({ severity: issue.severity, code: issue.code, message: issue.message }));
    return [...new Map([...mapped, ...this.gateIssues].map(issue => [`${issue.code}:${issue.message}`, issue])).values()];
  }

  private renderIssues() {
    const issues = this.issues();
    if (!issues.length && !this.editMessage) return nothing;
    return html`<section class="nr-access__issues" role="alert"><header><strong>${this.t('access.issues')}</strong><span>${this.t('access.issueCount', { count: issues.length })}</span></header>${this.editMessage ? html`<p>${this.editMessage}</p>` : nothing}<div>${issues.map(issue => html`<article class=${`is-${issue.severity}`}><code>${issue.code}</code><p>${issue.message}</p></article>`)}</div></section>`;
  }

  render() {
    const access = this.currentAccess();
    const actor = this.actor();
    if (!access || !actor) return html`<section class="nr-access__empty"><h2>${this.t('access.emptyTitle')}</h2><p>${this.t('access.emptyBody')}</p></section>`;
    const grant = this.grant();
    return html`<section class="nr-access"><header class="nr-access__hero"><div><span>${this.t('access.eyebrow')}</span><h2>${this.t('access.title')}</h2><p>${this.t('access.description')}</p></div><dl><div><dt>${this.t('access.actors')}</dt><dd>${access.actors.length}</dd></div><div><dt>${this.t('access.grants')}</dt><dd>${access.grants.length}</dd></div><div><dt>${this.t('access.entities')}</dt><dd>${this.entities().length}</dd></div></dl></header>${this.renderMatrix(access)}${this.renderIssues()}<div class="nr-access__workspace">${this.renderActor(access, actor)}${grant ? (this.mode === 'edit' ? this.renderGrantEdit(grant) : this.renderGrantView(grant)) : html`<section class="nr-access__grant-empty"><span aria-hidden="true">+</span><h2>${this.t('access.noGrantTitle')}</h2><p>${this.t('access.noGrantBody')}</p><button type="button" @click=${() => this.addGrant()}>${this.t('access.addGrant')}</button></section>`}</div>${this.mode === 'edit' ? html`<footer class="nr-access__edit-footer"><span>${this.dirty ? this.t('access.unsaved') : this.t('access.noChanges')}</span><div><button type="button" @click=${() => this.cancelEdit()}>${this.t('access.cancel')}</button><button class="is-primary" type="button" ?disabled=${!this.dirty} @click=${() => void this.saveEdit()}>${this.t('access.save')}</button></div></footer>` : nothing}</section>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'new-release--widgets--access-102035': NewReleaseAccess102035;
  }
}
