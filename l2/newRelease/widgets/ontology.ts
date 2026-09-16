/// <mls fileReference="_102035_/l2/newRelease/widgets/ontology.ts" enhancement="_102027_/l2/enhancementLit" />

import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { chart, type EChartsCoreOption } from '/_102033_/l2/shared/chartRuntimeLocal.js';
import type {
  Ns5OntologyDetail,
  Ns5OntologyEntityArtifact,
  Ns5OntologyEntityV3,
  Ns5OntologyField,
  Ns5OntologyIndexArtifact,
  Ns5OntologyIndexV3,
  Ns5OntologyRelationship,
} from '/_102035_/l2/solution/types.js';
import type { MdmOntology, MdmSubtypeName } from '/_102034_/l1/mdm/defs/ontologyTypes.js';
import {
  resolveModuleEntity,
  resolvePlatformEntity,
  type OntologyCapabilityView,
  type OntologyNode,
  type OntologyRelationshipView,
  type OntologyRuleView,
  type OntologyTreeView,
} from '/_102034_/l2/mdm/resolveMdmEntity.js';
import type { NewReleaseVersion } from '/_102035_/l2/newRelease/helpers/context.js';
import type { NewReleaseModuleData } from '/_102035_/l2/newRelease/helpers/l4Reader.js';
import type { NewReleaseTranslate } from '/_102035_/l2/newRelease/helpers/i18n.js';
import {
  announceNewReleaseChange,
  type NewReleaseEditableTab,
  type NewReleaseEditMode,
} from '/_102035_/l2/newRelease/editContract.js';
import type { NewReleaseValidationIssue } from '/_102035_/l2/newRelease/tobe.js';
import { readDefsJson } from '/_102035_/l2/solution/fs.js';
import {
  ONTOLOGY_DETAIL_NAME,
  ONTOLOGY_ENUM_VALUE,
  ONTOLOGY_FIELD_TYPES,
  type OntologyGraphNode,
  buildOntologyGraph,
  ontologyCardinality,
  ontologyEntityIssues,
  ontologyEntityPath,
  ontologyFieldCounts,
  ontologyResolvableFields,
  removeOntologyState,
  updateOntologyField,
  updateOntologyRelationship,
} from '/_102035_/l2/newRelease/widgets/ontologyModel.js';
import {
  buildOntologyV3Graph,
  isOntologyV3Entity,
  isOntologyV3Index,
  ontologyNodeLeafCount,
  ontologyPlatformFile,
  ontologyV3FieldCount,
} from '/_102035_/l2/newRelease/widgets/ontologyV3Model.js';

type OntologyView = 'text' | 'graph';
type ReachedBy = Ns5OntologyEntityArtifact['lifecycleStates'][number]['reachedBy'];

@customElement('new-release--widgets--ontology-102035')
export class NewReleaseOntology102035 extends StateLitElement implements NewReleaseEditableTab<Ns5OntologyEntityArtifact | null> {
  @property({ type: Number }) project = 0;
  @property({ type: String, attribute: 'module-name' }) moduleName = '';
  @property({ type: String }) version: NewReleaseVersion = 'asis';
  @property({ attribute: false }) data: NewReleaseModuleData | null = null;
  @property({ attribute: false }) t: NewReleaseTranslate = key => key;
  @property({ type: String }) mode: NewReleaseEditMode = 'view';
  @property({ type: Boolean }) dirty = false;

  @state() private view: OntologyView = 'text';
  @state() private selectedEntityId = '';
  @state() private entityDraft: Ns5OntologyEntityArtifact | null = null;
  @state() private indexDraft: Ns5OntologyIndexArtifact | null = null;
  @state() private issues: NewReleaseValidationIssue[] = [];
  @state() private gateIssues: Array<{ severity: 'error' | 'warning'; message: string }> = [];
  @state() private editMessage = '';
  @state() private newUniqueFields: string[] = [];
  @state() private newDetailName = '';
  @state() private newDetailType: Ns5OntologyDetail['type'] = 'string';
  @state() private newStateName = '';
  @state() private newStateReachedBy: ReachedBy = 'actor';
  @state() private newTransitionId = '';
  @state() private v3Views: OntologyTreeView[] = [];
  @state() private v3PlatformView: OntologyTreeView | null = null;
  @state() private v3Loading = false;
  @state() private v3Error = '';

  private entityDirty = false;
  private indexDirty = false;
  private graphCacheSignature = '';
  private graphCache?: EChartsCoreOption;
  private v3GraphCacheSignature = '';
  private v3GraphCache?: EChartsCoreOption;
  private v3PlatformOntology: MdmOntology | null = null;
  private v3LoadToken = 0;
  private v3ScrollToken = 0;

  createRenderRoot() { return this; }

  updated(changed: PropertyValues) {
    if (changed.has('data')) {
      if (this.v3Index()) {
        void this.loadV3();
        return;
      }
      const entities = this.entities();
      if (!entities.some(entity => entity.entityId === this.selectedEntityId)) {
        this.selectedEntityId = entities[0]?.entityId || '';
      }
    }
  }

  getDraft(): Ns5OntologyEntityArtifact | null {
    const entity = this.currentEntity();
    return entity ? structuredClone(entity) : null;
  }

  setIssues(issues: NewReleaseValidationIssue[]) {
    this.issues = issues.filter(issue => String(issue.artifact).startsWith('ontology/'));
  }

  private entities(): Ns5OntologyEntityArtifact[] {
    return this.data?.artifacts.entities
      .map(artifact => artifact.value)
      .filter((entity): entity is Ns5OntologyEntityArtifact => !!entity && !isOntologyV3Entity(entity)) || [];
  }

  private v3Index(): Ns5OntologyIndexV3 | null {
    const value = this.data?.artifacts.ontologyIndex.value;
    return isOntologyV3Index(value) ? value : null;
  }

  private v3Entities(): Ns5OntologyEntityV3[] {
    return this.data?.artifacts.entities
      .map(artifact => artifact.value)
      .filter(isOntologyV3Entity) || [];
  }

  private async loadV3() {
    const index = this.v3Index();
    const rules = this.data?.artifacts.rules.value;
    if (!index || !rules) return;
    const token = ++this.v3LoadToken;
    this.v3Loading = true;
    this.v3Error = '';
    try {
      const platformFile = ontologyPlatformFile(index.platformOntology);
      await mls.stor.server.loadProjectInfoIfNeeded(platformFile.project);
      const mdm = await readDefsJson<MdmOntology>(platformFile);
      if (!mdm) throw new Error(this.t('ontology.v3.platformMissing'));
      const views = this.v3Entities().map(entity => resolveModuleEntity(entity, index, mdm, rules));
      if (token !== this.v3LoadToken) return;
      this.v3PlatformOntology = mdm;
      this.v3Views = views;
      this.v3PlatformView = null;
      if (!views.some(view => view.entityId === this.selectedEntityId)) this.selectedEntityId = views[0]?.entityId || '';
    } catch (error) {
      if (token === this.v3LoadToken) this.v3Error = error instanceof Error ? error.message : String(error);
    } finally {
      if (token === this.v3LoadToken) this.v3Loading = false;
    }
  }

  private v3SelectedView(): OntologyTreeView | null {
    if (this.v3PlatformView?.entityId === this.selectedEntityId) return this.v3PlatformView;
    return this.v3Views.find(view => view.entityId === this.selectedEntityId) || this.v3Views[0] || null;
  }

  private selectV3Entity(entityId: string) {
    const moduleView = this.v3Views.find(view => view.entityId === entityId);
    if (moduleView) {
      this.v3PlatformView = null;
      this.selectedEntityId = entityId;
      return;
    }
    const index = this.v3Index();
    if (!index || !this.v3PlatformOntology || !(entityId in this.v3PlatformOntology.subtypes)) return;
    this.v3PlatformView = resolvePlatformEntity(
      this.v3PlatformOntology,
      entityId as MdmSubtypeName,
      index.moduleNamespace.key,
    );
    this.selectedEntityId = entityId;
  }

  private async selectV3EntityAndScroll(entityId: string, summary: HTMLElement) {
    const token = ++this.v3ScrollToken;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.selectV3Entity(entityId);
    await this.updateComplete;
    if (!reduceMotion) await new Promise(resolve => window.setTimeout(resolve, 800));
    if (token !== this.v3ScrollToken || !summary.isConnected) return;
    summary.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
      inline: 'nearest',
    });
  }

  private currentIndex(): Ns5OntologyIndexArtifact | null {
    if (this.mode === 'edit' && this.indexDraft) return this.indexDraft;
    const value = this.data?.artifacts.ontologyIndex.value;
    return value && !isOntologyV3Index(value) ? value : null;
  }

  private currentEntity(): Ns5OntologyEntityArtifact | null {
    if (this.mode === 'edit' && this.entityDraft?.entityId === this.selectedEntityId) return this.entityDraft;
    return this.entities().find(entity => entity.entityId === this.selectedEntityId) || null;
  }

  private currentEntities(): Ns5OntologyEntityArtifact[] {
    return this.entities().map(entity =>
      this.mode === 'edit' && this.entityDraft?.entityId === entity.entityId ? this.entityDraft : entity,
    );
  }

  private selectEntity(entityId: string) {
    if (entityId === this.selectedEntityId) return;
    this.cancelEdit();
    this.selectedEntityId = entityId;
  }

  private beginEdit() {
    const entity = this.currentEntity();
    const index = this.currentIndex();
    if (!entity || !index) return;
    this.entityDraft = structuredClone(entity);
    this.indexDraft = structuredClone(index);
    this.mode = 'edit';
    this.dirty = false;
    this.entityDirty = false;
    this.indexDirty = false;
    this.gateIssues = [];
    this.editMessage = '';
  }

  private cancelEdit() {
    this.entityDraft = null;
    this.indexDraft = null;
    this.mode = 'view';
    this.dirty = false;
    this.entityDirty = false;
    this.indexDirty = false;
    this.gateIssues = [];
    this.editMessage = '';
    this.newUniqueFields = [];
    this.newDetailName = '';
    this.newStateName = '';
    this.newTransitionId = '';
  }

  private updateEntity(next: Ns5OntologyEntityArtifact) {
    this.entityDraft = next;
    this.entityDirty = true;
    this.dirty = true;
    this.gateIssues = [];
    this.editMessage = '';
  }

  private updateIndex(next: Ns5OntologyIndexArtifact) {
    this.indexDraft = next;
    this.indexDirty = true;
    this.dirty = true;
    this.gateIssues = [];
    this.editMessage = '';
  }

  private async saveEdit() {
    if (!this.entityDraft || !this.indexDraft || !this.dirty) return;
    try {
      const gate = await import('/_102035_/l2/agentNewSolution5/steps/ontology30/gate.js');
      const allEntities = this.currentEntities();
      const plan = {
        moduleName: this.moduleName,
        businessDomain: this.indexDraft.businessDomain,
        entities: allEntities.map(entity => ({
          entityId: entity.entityId,
          title: entity.title,
          description: entity.description,
          kind: entity.kind,
          party: entity.party,
          ...(entity.mdmSubtype ? { mdmSubtype: entity.mdmSubtype } : {}),
          displayField: entity.displayField,
          ...(entity.mutability ? { mutability: entity.mutability } : {}),
          ...(entity.writer ? { writer: entity.writer } : {}),
          storage: entity.storage,
        })),
        relationships: this.indexDraft.relationships.map(relationship => ({
          relationshipId: relationship.relationshipId,
          fromEntity: relationship.fromEntity,
          toEntity: relationship.toEntity,
          type: relationship.type,
          required: relationship.required,
          description: relationship.description,
          persistence: relationship.persistence,
        })),
      };
      const detail = {
        entityId: this.entityDraft.entityId,
        fields: this.entityDraft.fields,
        ...(this.entityDraft.uniqueKeys ? { uniqueKeys: this.entityDraft.uniqueKeys } : {}),
        ...(this.entityDraft.details ? { details: this.entityDraft.details } : {}),
        lifecycleStates: this.entityDraft.lifecycleStates,
        transitions: this.entityDraft.transitions,
      };
      const result = gate.validateNs5OntologyEntity(plan, detail, {
        moduleName: this.moduleName,
        actors: this.data?.artifacts.access.value?.actors || this.data?.pipeline?.steps.module10?.actors || [],
        journeys: this.data?.artifacts.journeys
          .map(artifact => artifact.value)
          .filter((journey): journey is NonNullable<typeof journey> => !!journey),
        writerPlan: plan,
      });
      this.gateIssues = result.issues.map(issue => ({ severity: issue.severity, message: issue.message }));
      if (!result.ok) {
        this.editMessage = this.t('ontology.gateBlocked');
        return;
      }
    } catch (error) {
      this.editMessage = this.t('ontology.gateUnavailable', { message: error instanceof Error ? error.message : String(error) });
      return;
    }

    if (this.entityDirty) {
      announceNewReleaseChange(this, {
        path: ontologyEntityPath(this.entityDraft.entityId),
        jsonPath: '$',
        value: structuredClone(this.entityDraft),
      });
    }
    if (this.indexDirty) {
      announceNewReleaseChange(this, {
        path: 'ontology/index.defs.ts',
        jsonPath: '$',
        value: structuredClone(this.indexDraft),
      });
    }
    this.cancelEdit();
  }

  private setField(fieldId: string, patch: Partial<Ns5OntologyField>) {
    if (!this.entityDraft) return;
    this.updateEntity(updateOntologyField(this.entityDraft, fieldId, patch));
  }

  private setConstraint(field: Ns5OntologyField, key: 'min' | 'max' | 'maxLength' | 'precision', value: string) {
    const constraints = { ...(field.constraints || {}) };
    if (value === '') delete constraints[key];
    else constraints[key] = Number(value);
    this.setField(field.fieldId, { constraints });
  }

  private setEnum(field: Ns5OntologyField, index: number, key: 'value' | 'title', value: string) {
    const values = [...(field.enum || [])];
    values[index] = { ...values[index], [key]: value };
    this.setField(field.fieldId, { enum: values });
  }

  private addEnum(field: Ns5OntologyField) {
    const values = [...(field.enum || [])];
    let index = values.length + 1;
    while (values.some(value => value.value === `option${index}`)) index += 1;
    values.push({ value: `option${index}`, title: this.t('ontology.enumNewTitle') });
    this.setField(field.fieldId, { enum: values });
  }

  private removeEnum(field: Ns5OntologyField, index: number) {
    const values = (field.enum || []).filter((_, itemIndex) => itemIndex !== index);
    this.setField(field.fieldId, { enum: values.length ? values : undefined });
  }

  private addUniqueKey() {
    if (!this.entityDraft || !this.newUniqueFields.length) return;
    const key = [...this.newUniqueFields];
    const duplicate = (this.entityDraft.uniqueKeys || []).some(current => current.join('|') === key.join('|'));
    if (duplicate) {
      this.editMessage = this.t('ontology.uniqueDuplicate');
      return;
    }
    this.updateEntity({ ...this.entityDraft, uniqueKeys: [...(this.entityDraft.uniqueKeys || []), key] });
    this.newUniqueFields = [];
  }

  private removeUniqueKey(index: number) {
    if (!this.entityDraft) return;
    const uniqueKeys = (this.entityDraft.uniqueKeys || []).filter((_, itemIndex) => itemIndex !== index);
    const next: Ns5OntologyEntityArtifact = { ...this.entityDraft, uniqueKeys };
    if (!uniqueKeys.length) delete next.uniqueKeys;
    this.updateEntity(next);
  }

  private addDetail() {
    if (!this.entityDraft) return;
    const name = this.newDetailName.trim();
    if (!ONTOLOGY_DETAIL_NAME.test(name) || this.entityDraft.details?.[name]) {
      this.editMessage = this.t('ontology.memberInvalid');
      return;
    }
    this.updateEntity({
      ...this.entityDraft,
      details: {
        ...(this.entityDraft.details || {}),
        [name]: { type: this.newDetailType, description: this.t('ontology.detailNewDescription') },
      },
    });
    this.newDetailName = '';
  }

  private updateDetail(name: string, patch: Partial<Ns5OntologyDetail>) {
    if (!this.entityDraft?.details?.[name]) return;
    this.updateEntity({
      ...this.entityDraft,
      details: { ...this.entityDraft.details, [name]: { ...this.entityDraft.details[name], ...patch } },
    });
  }

  private removeDetail(name: string) {
    if (!this.entityDraft?.details) return;
    const details = { ...this.entityDraft.details };
    delete details[name];
    const next: Ns5OntologyEntityArtifact = { ...this.entityDraft, details };
    if (!Object.keys(details).length) delete next.details;
    this.updateEntity(next);
  }

  private addState() {
    if (!this.entityDraft) return;
    const state = this.newStateName.trim();
    if (!ONTOLOGY_ENUM_VALUE.test(state) || this.entityDraft.lifecycleStates.some(item => item.state === state)) {
      this.editMessage = this.t('ontology.memberInvalid');
      return;
    }
    this.updateEntity({
      ...this.entityDraft,
      lifecycleStates: [...this.entityDraft.lifecycleStates, { state, reachedBy: this.newStateReachedBy }],
    });
    this.newStateName = '';
  }

  private removeState(state: string) {
    if (this.entityDraft) this.updateEntity(removeOntologyState(this.entityDraft, state));
  }

  private addTransition() {
    if (!this.entityDraft) return;
    const transitionId = this.newTransitionId.trim();
    const states = this.entityDraft.lifecycleStates.map(item => item.state);
    if (!ONTOLOGY_ENUM_VALUE.test(transitionId) || !states.length || this.entityDraft.transitions.some(item => item.transitionId === transitionId)) {
      this.editMessage = this.t('ontology.memberInvalid');
      return;
    }
    this.updateEntity({
      ...this.entityDraft,
      transitions: [...this.entityDraft.transitions, {
        transitionId,
        from: [states[0]],
        to: states[Math.min(1, states.length - 1)],
        by: 'system',
        description: this.t('ontology.transitionNewDescription'),
      }],
    });
    this.newTransitionId = '';
  }

  private updateTransition(index: number, patch: Partial<Ns5OntologyEntityArtifact['transitions'][number]>) {
    if (!this.entityDraft) return;
    this.updateEntity({
      ...this.entityDraft,
      transitions: this.entityDraft.transitions.map((transition, itemIndex) =>
        itemIndex === index ? { ...transition, ...patch } : transition,
      ),
    });
  }

  private relationship(relationshipId: string, patch: Partial<Pick<Ns5OntologyRelationship, 'description' | 'required' | 'type'>>) {
    if (this.indexDraft) this.updateIndex(updateOntologyRelationship(this.indexDraft, relationshipId, patch));
  }

  private multiValues(event: Event): string[] {
    return [...(event.currentTarget as HTMLSelectElement).selectedOptions].map(option => option.value);
  }

  private transitionBy(event: Event): Ns5OntologyEntityArtifact['transitions'][number]['by'] {
    const values = this.multiValues(event);
    if (values.includes('system')) return 'system';
    if (values.includes('time')) return 'time';
    return values;
  }

  private fieldConstraints(field: Ns5OntologyField) {
    const numeric = field.type === 'number' || field.type === 'integer' || field.type === 'money';
    const precision = field.type === 'number' || field.type === 'money';
    const length = field.type === 'string' || field.type === 'text';
    if (!numeric && !length) return nothing;
    return html`<div class="nr-ontology__constraints">
      ${numeric ? html`
        <label><span>${this.t('ontology.constraint.min')}</span><input type="number" .value=${String(field.constraints?.min ?? '')} @input=${(event: Event) => this.setConstraint(field, 'min', (event.currentTarget as HTMLInputElement).value)}></label>
        <label><span>${this.t('ontology.constraint.max')}</span><input type="number" .value=${String(field.constraints?.max ?? '')} @input=${(event: Event) => this.setConstraint(field, 'max', (event.currentTarget as HTMLInputElement).value)}></label>
      ` : nothing}
      ${precision ? html`<label><span>${this.t('ontology.constraint.precision')}</span><input type="number" min="0" .value=${String(field.constraints?.precision ?? '')} @input=${(event: Event) => this.setConstraint(field, 'precision', (event.currentTarget as HTMLInputElement).value)}></label>` : nothing}
      ${length ? html`<label><span>${this.t('ontology.constraint.maxLength')}</span><input type="number" min="1" .value=${String(field.constraints?.maxLength ?? '')} @input=${(event: Event) => this.setConstraint(field, 'maxLength', (event.currentTarget as HTMLInputElement).value)}></label>` : nothing}
    </div>`;
  }

  private renderFields(entity: Ns5OntologyEntityArtifact) {
    return html`
      <section class="nr-ontology__section">
        <header><div><h3>${this.t('ontology.namespaceFields')}</h3><p>${this.t('ontology.fieldsDescription')}</p></div><span>${this.t('ontology.count', { count: entity.fields.length })}</span></header>
        <div class="nr-ontology__fields">
          ${entity.fields.map(field => html`
            <article class="nr-field">
              <header><code>${field.fieldId}</code><div><span class="nr-chip">${field.type}</span><span class=${field.required ? 'nr-chip is-required' : 'nr-chip'}>${field.required ? this.t('ontology.required') : this.t('ontology.optional')}</span>${field.unique ? html`<span class="nr-chip is-unique">${this.t('ontology.unique')}</span>` : nothing}</div></header>
              ${this.mode === 'edit' ? html`
                <div class="nr-field__edit-grid">
                  <label><span>${this.t('ontology.title')}</span><input .value=${field.title} @input=${(event: Event) => this.setField(field.fieldId, { title: (event.currentTarget as HTMLInputElement).value })}></label>
                  <label><span>${this.t('ontology.type')}</span><select .value=${field.type} @change=${(event: Event) => this.setField(field.fieldId, { type: (event.currentTarget as HTMLSelectElement).value as Ns5OntologyField['type'] })}>${ONTOLOGY_FIELD_TYPES.map(type => html`<option value=${type} ?selected=${field.type === type}>${type}</option>`)}</select></label>
                  <label class="nr-field__description"><span>${this.t('ontology.description')}</span><textarea .value=${field.description} @input=${(event: Event) => this.setField(field.fieldId, { description: (event.currentTarget as HTMLTextAreaElement).value })}></textarea></label>
                  <label class="nr-check"><input type="checkbox" .checked=${field.required} @change=${(event: Event) => this.setField(field.fieldId, { required: (event.currentTarget as HTMLInputElement).checked })}><span>${this.t('ontology.required')}</span></label>
                  <label class="nr-check"><input type="checkbox" .checked=${!!field.unique} @change=${(event: Event) => this.setField(field.fieldId, { unique: (event.currentTarget as HTMLInputElement).checked })}><span>${this.t('ontology.unique')}</span></label>
                </div>
                ${this.fieldConstraints(field)}
                ${field.type === 'string' ? html`
                  <div class="nr-field__enum">
                    <strong>${this.t('ontology.enum')}</strong>
                    ${(field.enum || []).map((option, index) => html`<div><input aria-label=${this.t('ontology.enumValue')} class=${ONTOLOGY_ENUM_VALUE.test(option.value) ? '' : 'is-invalid'} .value=${option.value} @input=${(event: Event) => this.setEnum(field, index, 'value', (event.currentTarget as HTMLInputElement).value)}><input aria-label=${this.t('ontology.enumTitle')} .value=${option.title} @input=${(event: Event) => this.setEnum(field, index, 'title', (event.currentTarget as HTMLInputElement).value)}><button type="button" @click=${() => this.removeEnum(field, index)} aria-label=${this.t('ontology.removeEnum')}>${this.t('ontology.removeSymbol')}</button></div>`)}
                    <button class="nr-text-button" type="button" @click=${() => this.addEnum(field)}>${this.t('ontology.addEnum')}</button>
                  </div>
                ` : nothing}
              ` : html`
                <h4>${field.title}</h4><p>${field.description}</p>
                ${field.constraints && Object.keys(field.constraints).length ? html`<dl class="nr-field__constraints-view">${Object.entries(field.constraints).map(([key, value]) => html`<div><dt>${this.t(`ontology.constraint.${key}`)}</dt><dd>${value}</dd></div>`)}</dl>` : nothing}
                ${field.enum?.length ? html`<div class="nr-field__enum-view">${field.enum.map(option => html`<span><strong>${option.title}</strong><code>${option.value}</code></span>`)}</div>` : nothing}
              `}
            </article>
          `)}
        </div>
      </section>
    `;
  }

  private renderBaseFields(entity: Ns5OntologyEntityArtifact) {
    if (entity.kind !== 'mdm') return nothing;
    const fields = entity.fieldsBase || [];
    return html`
      <section class="nr-ontology__section nr-ontology__base-fields">
        <header><div><h3>${this.t('ontology.baseFields')}</h3><p>${this.t('ontology.baseFieldsDescription', { subtype: entity.mdmSubtype || '' })}</p></div><span>${this.t('ontology.count', { count: fields.length })}</span></header>
        ${this.mode === 'edit' ? html`<p class="nr-ontology__readonly-note">${this.t('ontology.baseFieldsReadOnly')}</p>` : nothing}
        ${fields.length ? html`<div class="nr-ontology__fields">${fields.map(field => html`
          <article class="nr-field is-platform">
            <header><code>${field.fieldId}</code><div><span class="nr-chip is-platform">${this.t('ontology.baseFieldOrigin')}</span><span class="nr-chip">${field.type}</span><span class=${field.required ? 'nr-chip is-required' : 'nr-chip'}>${field.required ? this.t('ontology.required') : this.t('ontology.optional')}</span></div></header>
            <h4>${field.title}</h4><p>${field.description}</p>
            ${field.constraints && Object.keys(field.constraints).length ? html`<dl class="nr-field__constraints-view">${Object.entries(field.constraints).map(([key, value]) => html`<div><dt>${this.t(`ontology.constraint.${key}`)}</dt><dd>${value}</dd></div>`)}</dl>` : nothing}
            ${field.enum?.length ? html`<div class="nr-field__enum-view">${field.enum.map(option => html`<span><strong>${option.title}</strong><code>${option.value}</code></span>`)}</div>` : nothing}
          </article>
        `)}</div>` : html`<p class="nr-ontology__empty-inline">${this.t('ontology.baseFieldsEmptyLegacy')}</p>`}
      </section>
    `;
  }

  private renderUniqueAndDetails(entity: Ns5OntologyEntityArtifact) {
    return html`
      <div class="nr-ontology__two-columns">
        <section class="nr-ontology__section">
          <header><div><h3>${this.t('ontology.uniqueKeys')}</h3><p>${this.t('ontology.uniqueKeysDescription')}</p></div></header>
          <div class="nr-ontology__key-list">${(entity.uniqueKeys || []).map((key, index) => html`<span>${key.map(field => html`<code>${field}</code>`)}${this.mode === 'edit' ? html`<button type="button" aria-label=${this.t('ontology.removeUnique')} @click=${() => this.removeUniqueKey(index)}>${this.t('ontology.removeSymbol')}</button>` : nothing}</span>`)}</div>
          ${!(entity.uniqueKeys || []).length ? html`<p class="nr-ontology__empty-inline">${this.t('ontology.uniqueEmpty')}</p>` : nothing}
          ${this.mode === 'edit' ? html`<div class="nr-ontology__adder"><select multiple @change=${(event: Event) => { this.newUniqueFields = this.multiValues(event); }}>${entity.fields.map(field => html`<option value=${field.fieldId}>${field.title}</option>`)}</select><button type="button" @click=${this.addUniqueKey}>${this.t('ontology.addUnique')}</button></div>` : nothing}
        </section>
        <section class="nr-ontology__section">
          <header><div><h3>${this.t('ontology.details')}</h3><p>${this.t('ontology.detailsDescription')}</p></div></header>
          <div class="nr-ontology__detail-list">${Object.entries(entity.details || {}).map(([name, detail]) => html`<article><code>${name}</code>${this.mode === 'edit' ? html`<select .value=${detail.type} @change=${(event: Event) => this.updateDetail(name, { type: (event.currentTarget as HTMLSelectElement).value as Ns5OntologyDetail['type'] })}>${ONTOLOGY_FIELD_TYPES.map(type => html`<option value=${type} ?selected=${detail.type === type}>${type}</option>`)}</select><textarea .value=${detail.description} @input=${(event: Event) => this.updateDetail(name, { description: (event.currentTarget as HTMLTextAreaElement).value })}></textarea><button type="button" @click=${() => this.removeDetail(name)}>${this.t('ontology.remove')}</button>` : html`<span>${detail.type}</span><p>${detail.description}</p>`}</article>`)}</div>
          ${!Object.keys(entity.details || {}).length ? html`<p class="nr-ontology__empty-inline">${this.t('ontology.detailsEmpty')}</p>` : nothing}
          ${this.mode === 'edit' ? html`<div class="nr-ontology__adder nr-ontology__adder--detail"><input placeholder=${this.t('ontology.detailName')} .value=${this.newDetailName} @input=${(event: Event) => { this.newDetailName = (event.currentTarget as HTMLInputElement).value; }}><select .value=${this.newDetailType} @change=${(event: Event) => { this.newDetailType = (event.currentTarget as HTMLSelectElement).value as Ns5OntologyDetail['type']; }}>${ONTOLOGY_FIELD_TYPES.map(type => html`<option value=${type}>${type}</option>`)}</select><button type="button" @click=${this.addDetail}>${this.t('ontology.addDetail')}</button></div>` : nothing}
        </section>
      </div>
    `;
  }

  private renderLifecycle(entity: Ns5OntologyEntityArtifact) {
    const states = entity.lifecycleStates.map(item => item.state);
    const actors = this.data?.artifacts.access.value?.actors || this.data?.pipeline?.steps.module10?.actors || [];
    const rules = this.data?.artifacts.rules.value?.rules || [];
    return html`
      <section class="nr-ontology__section nr-ontology__lifecycle">
        <header><div><h3>${this.t('ontology.lifecycle')}</h3><p>${this.t('ontology.lifecycleDescription')}</p></div></header>
        ${states.length ? html`<div class="nr-lifecycle__rail">${entity.lifecycleStates.map((item, index) => html`<span><strong>${item.state}</strong><small>${this.t(`ontology.reachedBy.${item.reachedBy}`)}</small>${this.mode === 'edit' ? html`<select .value=${item.reachedBy} @change=${(event: Event) => this.updateEntity({ ...entity, lifecycleStates: entity.lifecycleStates.map((state, stateIndex) => stateIndex === index ? { ...state, reachedBy: (event.currentTarget as HTMLSelectElement).value as ReachedBy } : state) })}><option value="actor" ?selected=${item.reachedBy === 'actor'}>${this.t('ontology.reachedBy.actor')}</option><option value="command" ?selected=${item.reachedBy === 'command'}>${this.t('ontology.reachedBy.command')}</option><option value="time" ?selected=${item.reachedBy === 'time'}>${this.t('ontology.reachedBy.time')}</option></select><button type="button" @click=${() => this.removeState(item.state)} aria-label=${this.t('ontology.removeState')}>${this.t('ontology.removeSymbol')}</button>` : nothing}</span>`)}</div>` : html`<p class="nr-ontology__empty-inline">${this.t('ontology.lifecycleEmpty')}</p>`}
        ${this.mode === 'edit' ? html`<div class="nr-ontology__adder"><input placeholder=${this.t('ontology.stateName')} .value=${this.newStateName} @input=${(event: Event) => { this.newStateName = (event.currentTarget as HTMLInputElement).value; }}><select .value=${this.newStateReachedBy} @change=${(event: Event) => { this.newStateReachedBy = (event.currentTarget as HTMLSelectElement).value as ReachedBy; }}><option value="actor">${this.t('ontology.reachedBy.actor')}</option><option value="command">${this.t('ontology.reachedBy.command')}</option><option value="time">${this.t('ontology.reachedBy.time')}</option></select><button type="button" @click=${this.addState}>${this.t('ontology.addState')}</button></div>` : nothing}
        <div class="nr-lifecycle__transitions">${entity.transitions.map((transition, index) => html`
          <article><header><code>${transition.transitionId}</code><span>${transition.from.join(', ')} → ${transition.to}</span></header>
          ${this.mode === 'edit' ? html`
            <div class="nr-transition__grid">
              <label><span>${this.t('ontology.from')}</span><select multiple @change=${(event: Event) => this.updateTransition(index, { from: this.multiValues(event) })}>${states.map(state => html`<option value=${state} ?selected=${transition.from.includes(state)}>${state}</option>`)}</select></label>
              <label><span>${this.t('ontology.to')}</span><select .value=${transition.to} @change=${(event: Event) => this.updateTransition(index, { to: (event.currentTarget as HTMLSelectElement).value })}>${states.map(state => html`<option value=${state} ?selected=${transition.to === state}>${state}</option>`)}</select></label>
              <label><span>${this.t('ontology.by')}</span><select multiple @change=${(event: Event) => this.updateTransition(index, { by: this.transitionBy(event) })}><option value="system" ?selected=${transition.by === 'system'}>${this.t('ontology.by.system')}</option><option value="time" ?selected=${transition.by === 'time'}>${this.t('ontology.by.time')}</option>${actors.map(actor => html`<option value=${actor.actorId} ?selected=${Array.isArray(transition.by) && transition.by.includes(actor.actorId)}>${actor.title}</option>`)}</select></label>
              <label><span>${this.t('ontology.ruleRefs')}</span><select multiple @change=${(event: Event) => { const ruleRefs = this.multiValues(event); this.updateTransition(index, { ruleRefs: ruleRefs.length ? ruleRefs : undefined }); }}>${rules.map(rule => html`<option value=${rule.ruleId} ?selected=${transition.ruleRefs?.includes(rule.ruleId) || false}>${rule.ruleId}</option>`)}</select></label>
              <label class="nr-transition__description"><span>${this.t('ontology.description')}</span><textarea .value=${transition.description} @input=${(event: Event) => this.updateTransition(index, { description: (event.currentTarget as HTMLTextAreaElement).value })}></textarea></label>
              <button type="button" @click=${() => this.updateEntity({ ...entity, transitions: entity.transitions.filter((_, itemIndex) => itemIndex !== index) })}>${this.t('ontology.remove')}</button>
            </div>
          ` : html`<p>${transition.description}</p><footer><span>${this.t('ontology.by')}: <strong>${Array.isArray(transition.by) ? transition.by.join(', ') : this.t(`ontology.by.${transition.by}`)}</strong></span>${transition.ruleRefs?.length ? html`<span>${this.t('ontology.ruleRefs')}: ${transition.ruleRefs.map(rule => html`<code>${rule}</code>`)}</span>` : nothing}</footer>`}
          </article>`)}
        </div>
        ${this.mode === 'edit' && states.length ? html`<div class="nr-ontology__adder"><input placeholder=${this.t('ontology.transitionName')} .value=${this.newTransitionId} @input=${(event: Event) => { this.newTransitionId = (event.currentTarget as HTMLInputElement).value; }}><button type="button" @click=${this.addTransition}>${this.t('ontology.addTransition')}</button></div>` : nothing}
      </section>
    `;
  }

  private renderRelationships(entity: Ns5OntologyEntityArtifact) {
    const relationships = (this.currentIndex()?.relationships || []).filter(item => item.fromEntity === entity.entityId || item.toEntity === entity.entityId);
    return html`
      <section class="nr-ontology__section">
        <header><div><h3>${this.t('ontology.relationships')}</h3><p>${this.t('ontology.relationshipsDescription')}</p></div><span>${this.t('ontology.count', { count: relationships.length })}</span></header>
        <div class="nr-ontology__relationships">${relationships.map(relationship => html`
          <article><header><strong>${relationship.fromEntity}<i>→</i>${relationship.toEntity}</strong><span>${ontologyCardinality(relationship.type)}</span></header>
            <code>${relationship.relationshipId} · ${relationship.persistence.mode}</code>
            ${this.mode === 'edit' ? html`<div class="nr-relationship__edit"><label><span>${this.t('ontology.relationshipType')}</span><select .value=${relationship.type} @change=${(event: Event) => this.relationship(relationship.relationshipId, { type: (event.currentTarget as HTMLSelectElement).value })}><option value="oneToOne" ?selected=${relationship.type === 'oneToOne'}>${this.t('ontology.cardinality.oneToOne')}</option><option value="oneToMany" ?selected=${relationship.type === 'oneToMany'}>${this.t('ontology.cardinality.oneToMany')}</option><option value="manyToOne" ?selected=${relationship.type === 'manyToOne'}>${this.t('ontology.cardinality.manyToOne')}</option><option value="manyToMany" ?selected=${relationship.type === 'manyToMany'}>${this.t('ontology.cardinality.manyToMany')}</option></select></label><label class="nr-check"><input type="checkbox" .checked=${relationship.required} @change=${(event: Event) => this.relationship(relationship.relationshipId, { required: (event.currentTarget as HTMLInputElement).checked })}><span>${this.t('ontology.required')}</span></label><label><span>${this.t('ontology.description')}</span><textarea .value=${relationship.description} @input=${(event: Event) => this.relationship(relationship.relationshipId, { description: (event.currentTarget as HTMLTextAreaElement).value })}></textarea></label></div>` : html`<p>${relationship.description}</p><span class=${relationship.required ? 'is-required' : ''}>${relationship.required ? this.t('ontology.required') : this.t('ontology.optional')}</span>`}
          </article>`)}
        </div>
        ${!relationships.length ? html`<p class="nr-ontology__empty-inline">${this.t('ontology.relationshipsEmpty')}</p>` : nothing}
      </section>
    `;
  }

  private renderIssues(entity: Ns5OntologyEntityArtifact) {
    const source = this.issues.length ? this.issues : this.data?.validation.issues || [];
    const issues = [...ontologyEntityIssues(source, entity.entityId), ...this.gateIssues.map(issue => ({ ...issue, code: '', path: '', artifact: ontologyEntityPath(entity.entityId), source: 'gate' as const }))];
    if (!issues.length && !this.editMessage) return nothing;
    return html`<section class="nr-ontology__issues" role="alert"><strong>${this.t('ontology.issues')}</strong>${this.editMessage ? html`<p>${this.editMessage}</p>` : nothing}${issues.map(issue => html`<p class=${issue.severity}><span>${this.t(`ontology.issue.${issue.severity}`)}</span>${issue.message}</p>`)}</section>`;
  }

  private renderText(entity: Ns5OntologyEntityArtifact) {
    const counts = ontologyFieldCounts(entity);
    return html`
      <div class="nr-ontology__workbench">
        <aside>${this.currentEntities().map(item => html`<button type="button" class=${item.entityId === entity.entityId ? 'is-active' : ''} @click=${() => this.selectEntity(item.entityId)}><strong>${item.title}</strong><code>${item.entityId}</code><span><i>${this.t(`ontology.kind.${item.kind}`)}</i><i>${this.t(`ontology.party.${item.party}`)}</i>${item.mdmSubtype ? html`<i>${item.mdmSubtype}</i>` : nothing}${item.writer ? html`<i>${this.t(`ontology.writer.${item.writer}`)}</i>` : nothing}</span></button>`)}</aside>
        <main>
          <section class="nr-ontology__identity">
            <div><span>${this.t('ontology.entity')}</span>${this.mode === 'edit' ? html`<input .value=${entity.title} @input=${(event: Event) => this.updateEntity({ ...entity, title: (event.currentTarget as HTMLInputElement).value })}>` : html`<h2>${entity.title}</h2>`}<code>${entity.entityId}</code></div>
            <div class="nr-ontology__badges"><span>${this.t(`ontology.kind.${entity.kind}`)}</span><span>${this.t(`ontology.party.${entity.party}`)}</span>${entity.mdmSubtype ? html`<span>${entity.mdmSubtype}</span>` : nothing}<span>${entity.writer ? this.t(`ontology.writer.${entity.writer}`) : entity.mutability ? entity.mutability : this.t('ontology.writer.journey')}</span></div>
            ${this.mode === 'edit' ? html`<label class="nr-ontology__description-edit"><span>${this.t('ontology.description')}</span><textarea .value=${entity.description} @input=${(event: Event) => this.updateEntity({ ...entity, description: (event.currentTarget as HTMLTextAreaElement).value })}></textarea></label>` : html`<p>${entity.description}</p>`}
            <dl><div><dt>${this.t('ontology.storage')}</dt><dd>${entity.storage.target} · ${entity.storage.scope}</dd></div><div><dt>${this.t('ontology.idField')}</dt><dd><code>${entity.storage.idField}</code></dd></div><div><dt>${this.t('ontology.displayField')}</dt><dd>${this.mode === 'edit' ? html`<select .value=${entity.displayField} @change=${(event: Event) => this.updateEntity({ ...entity, displayField: (event.currentTarget as HTMLSelectElement).value })}>${ontologyResolvableFields(entity).map(field => html`<option value=${field.fieldId} ?selected=${entity.displayField === field.fieldId}>${field.title}</option>`)}</select>` : html`<code>${entity.displayField}</code>`}</dd></div><div><dt>${this.t('ontology.writer')}</dt><dd>${this.mode === 'edit' ? html`<select .value=${entity.writer || 'journey'} @change=${(event: Event) => { const writer = (event.currentTarget as HTMLSelectElement).value as 'journey' | 'crud' | 'inbound'; const next: Ns5OntologyEntityArtifact = { ...entity, writer }; if (writer === 'journey') delete next.writer; this.updateEntity(next); }}><option value="journey" ?selected=${!entity.writer || entity.writer === 'journey'}>${this.t('ontology.writer.journey')}</option><option value="crud" ?selected=${entity.writer === 'crud'}>${this.t('ontology.writer.crud')}</option><option value="inbound" ?selected=${entity.writer === 'inbound'}>${this.t('ontology.writer.inbound')}</option></select>` : this.t(`ontology.writer.${entity.writer || 'journey'}`)}</dd></div></dl>
            <p class="nr-ontology__field-breakdown">${this.t('ontology.fieldCountBreakdown', { namespace: counts.namespace, base: counts.base })}</p>
          </section>
          ${this.renderIssues(entity)}
          ${this.renderFields(entity)}
          ${this.renderBaseFields(entity)}
          ${this.renderUniqueAndDetails(entity)}
          ${this.renderLifecycle(entity)}
          ${this.renderRelationships(entity)}
        </main>
      </div>
    `;
  }

  private graphOption() {
    const style = getComputedStyle(this);
    const colors = Array.from({ length: 6 }, (_, index) => style.getPropertyValue(`--chart-series-${index + 1}`).trim() || style.getPropertyValue(`--ds-chart-series-${index + 1}`).trim());
    const text = style.getPropertyValue('--text-default').trim() || '#2f3a48';
    const muted = style.getPropertyValue('--text-muted').trim() || '#5d6b7e';
    const surface = style.getPropertyValue('--surface-bg').trim() || '#fff';
    const index = this.currentIndex();
    const entities = this.currentEntities();
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    const signature = JSON.stringify({ index, entities, colors, text, muted, surface, reduceMotion, language: this.t('ontology.title') });
    if (signature === this.graphCacheSignature && this.graphCache) return this.graphCache;
    const graph = buildOntologyGraph(index, entities, colors);
    const nodeLabel = (node: OntologyGraphNode) => {
      const fields = node.namespaceFields.map(field =>
        `{${field === node.displayField ? 'fieldDisplay' : 'field'}|${field}}`,
      );
      const base = node.baseFields.map(field =>
        `{${field === node.displayField ? 'platformDisplay' : 'platform'}|${field}}`,
      );
      return [`{title|${node.title}}`, `{id|${node.id}}`, ...fields, ...base].join('\n');
    };
    this.graphCacheSignature = signature;
    this.graphCache = {
      animation: !reduceMotion,
      animationDurationUpdate: reduceMotion ? 0 : 450,
      aria: { enabled: true, decal: { show: true }, description: this.t('ontology.graphAria') },
      color: colors,
      tooltip: {
        trigger: 'item',
        formatter: (params: { dataType?: string; data?: { title?: string; name?: string; value?: string }; value?: string }) => params.dataType === 'edge'
          ? `${params.data?.name || ''} ${params.value || ''}`
          : `<strong>${params.data?.title || params.data?.name || ''}</strong><br>${params.data?.value || ''}`,
      },
      legend: [{ data: graph.categories.map(category => ({ name: this.t(`ontology.kind.${category.name}`), icon: 'circle' })), textStyle: { color: muted } }],
      toolbox: {
        right: 12,
        feature: {
          restore: { title: this.t('ontology.graphReset') },
          saveAsImage: { title: this.t('ontology.graphPng'), name: `${this.moduleName}-ontology`, pixelRatio: 2 },
        },
      },
      series: [{
        type: 'graph',
        layout: 'force',
        roam: true,
        draggable: true,
        data: graph.nodes.map(node => ({ ...node, category: node.category, label: { formatter: nodeLabel(node) } })),
        links: graph.links.map(link => ({ ...link, label: { formatter: link.value } })),
        categories: graph.categories.map(category => ({ ...category, name: this.t(`ontology.kind.${category.name}`) })),
        force: { repulsion: 310, edgeLength: [105, 180], gravity: .08 },
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: 9,
        label: {
          show: true,
          color: text,
          rich: {
            title: { fontSize: 12, fontWeight: 700, lineHeight: 18 },
            id: { fontSize: 10, color: muted, lineHeight: 14 },
            field: { fontSize: 9, color: muted, lineHeight: 14, padding: [0, 3] },
            platform: { fontSize: 9, color: colors[3] || muted, lineHeight: 14, padding: [0, 3], backgroundColor: surface, borderRadius: 2 },
            fieldDisplay: { fontSize: 9, fontWeight: 700, color: text, lineHeight: 15, padding: [1, 4], borderColor: colors[0] || text, borderWidth: 1, borderRadius: 3 },
            platformDisplay: { fontSize: 9, fontWeight: 700, color: colors[3] || text, lineHeight: 15, padding: [1, 4], backgroundColor: surface, borderColor: colors[3] || text, borderWidth: 1, borderRadius: 3 },
          },
        },
        edgeLabel: { show: true, color: muted, fontSize: 10, backgroundColor: surface, padding: [2, 4], borderRadius: 3 },
        lineStyle: { curveness: .12 },
        emphasis: { focus: 'adjacency', lineStyle: { width: 3 } },
      }],
    };
    return this.graphCache;
  }

  private renderGraph(entity: Ns5OntologyEntityArtifact) {
    const relationships = this.currentIndex()?.relationships || [];
    const related = relationships.filter(item => item.fromEntity === entity.entityId || item.toEntity === entity.entityId).length;
    const counts = ontologyFieldCounts(entity);
    const titleOf = (entityId: string) => this.currentEntities().find(item => item.entityId === entityId)?.title || entityId;
    return html`<section class="nr-ontology__graph-view"><div class="nr-ontology__graph-layout"><div class="nr-ontology__graph" role="img" aria-label=${this.t('ontology.graphAria')} ${chart(this.graphOption(), { click: (params: unknown) => { const node = params as { dataType?: string; data?: { id?: string } }; if (node.dataType === 'node' && node.data?.id) this.selectEntity(node.data.id); } })}></div><aside><span>${this.t('ontology.selected')}</span><h2>${entity.title}</h2><code>${entity.entityId}</code><p>${entity.description}</p><dl><div title=${this.t('ontology.fieldCountBreakdown', { namespace: counts.namespace, base: counts.base })}><dt>${this.t('ontology.fields')}</dt><dd>${counts.total}</dd></div><div><dt>${this.t('ontology.relationships')}</dt><dd>${related}</dd></div><div><dt>${this.t('ontology.lifecycle')}</dt><dd>${entity.lifecycleStates.length}</dd></div></dl><p class="nr-ontology__graph-legend"><span></span>${this.t('ontology.baseFieldOrigin')} · <strong>${this.t('ontology.displayField')}</strong></p><button type="button" @click=${() => { this.view = 'text'; }}>${this.t('ontology.openDetails')}</button></aside></div><details class="nr-ontology__graph-alternative"><summary>${this.t('ontology.graphAlternative')}</summary><div><section><h3>${this.t('ontology.entities')}</h3><ul>${this.currentEntities().map(item => html`<li><button type="button" @click=${() => this.selectEntity(item.entityId)}><strong>${item.title}</strong><code>${item.entityId}</code></button></li>`)}</ul></section><section><h3>${this.t('ontology.relationships')}</h3>${relationships.length ? html`<ul>${relationships.map(item => html`<li><strong>${titleOf(item.fromEntity)}</strong><span>${ontologyCardinality(item.type)}</span><strong>${titleOf(item.toEntity)}</strong><code>${item.relationshipId}</code></li>`)}</ul>` : html`<p>${this.t('ontology.relationshipsEmpty')}</p>`}</section></div></details></section>`;
  }

  private v3NodeType(node: OntologyNode) {
    if (node.to?.length) return `${node.type} → ${node.to.join(', ')}`;
    if (node.of) return `${node.type} · ${node.of}`;
    return node.type;
  }

  private renderV3NodeChips(node: OntologyNode) {
    return html`
      <span class="nr-chip">${this.v3NodeType(node)}</span>
      <span class=${node.required ? 'nr-chip is-required' : 'nr-chip'}>${node.required ? this.t('ontology.required') : this.t('ontology.optional')}</span>
      ${node.origin ? html`<span class="nr-chip is-${node.origin}">${this.t(`ontology.v3.origin.${node.origin}`)}</span>` : nothing}
      ${node.indexed ? html`<span class="nr-chip is-indexed">${this.t('ontology.v3.indexedColumn')}</span>` : nothing}
      ${node.tightened ? html`<span class="nr-chip is-tightened">${this.t('ontology.v3.tightened')}</span>` : nothing}
      ${node.derived ? html`<span class="nr-chip is-derived">${this.t('ontology.v3.derived')}</span>` : nothing}
    `;
  }

  private renderV3Node(node: OntologyNode, depth = 0): unknown {
    const innerFieldCount = node.children ? ontologyNodeLeafCount(node.children) : 0;
    const body = html`
      ${node.description ? html`<p>${node.description}</p>` : nothing}
      ${node.conflict ? html`<p class="nr-v3__warning" role="alert">${this.t('ontology.v3.conflict')}</p>` : nothing}
      ${node.values?.length ? html`<div class="nr-v3__values">${node.values.map(value => html`<span><strong>${value.title}</strong><code>${value.value}</code></span>`)}</div>` : nothing}
      ${node.children?.length ? html`<div class="nr-v3__children">${node.children.map(child => this.renderV3Node(child, depth + 1))}</div>` : nothing}
      ${node.children && !node.children.length ? html`<p class="nr-v3__empty-branch">${node.description || this.t('ontology.v3.emptyBranch')}</p>` : nothing}
    `;
    if (node.children) return html`
      <details class="nr-v3__tree-node is-branch">
        <summary><span><strong>${node.title}</strong><code>${node.id}</code><small class="nr-v3__branch-count">${this.t('ontology.v3.innerFields', { count: innerFieldCount })}</small></span><span class="nr-v3__chips">${this.renderV3NodeChips(node)}</span></summary>
        <div class="nr-v3__node-body">${body}</div>
      </details>
    `;
    return html`
      <article class="nr-v3__tree-node is-leaf">
        <header><span><strong>${node.title}</strong><code>${node.id}</code></span><span class="nr-v3__chips">${this.renderV3NodeChips(node)}</span></header>
        <div class="nr-v3__node-body">${body}</div>
      </article>
    `;
  }

  private renderV3Relationships(relationships: OntologyRelationshipView[]) {
    return html`<details class="nr-ontology__section nr-v3__section nr-v3__collapsible-section">
      <summary class="nr-v3__section-summary"><div><div><h3>${this.t('ontology.relationships')}</h3><p>${this.t('ontology.v3.relationshipsDescription')}</p></div><span>${this.t('ontology.count', { count: relationships.length })}</span></div></summary>
      <div class="nr-v3__section-body"><div class="nr-v3__relationships">${relationships.map(relationship => html`
        <article class=${relationship.conflict ? 'has-conflict' : ''}>
          <header><div><strong>${relationship.title}</strong><code>${relationship.relationshipId || relationship.name}</code></div><span>${relationship.cardinality || '—'}</span></header>
          ${relationship.description ? html`<p>${relationship.description}</p>` : nothing}
          <dl><div><dt>${this.t('ontology.v3.target')}</dt><dd>${relationship.to.map(target => html`<button type="button" @click=${() => this.selectV3Entity(target)}>${target}</button>`)}</dd></div><div><dt>${this.t('ontology.v3.via')}</dt><dd><code>${relationship.via}</code></dd></div>${relationship.roles?.length ? html`<div><dt>${this.t('ontology.v3.roles')}</dt><dd>${relationship.roles.join(', ')}</dd></div>` : nothing}</dl>
          <footer><span class="nr-chip">${this.t(`ontology.v3.mode.${relationship.mode}`)}</span>${relationship.required !== undefined ? html`<span class="nr-chip is-required">${relationship.required === true ? this.t('ontology.required') : relationship.required === false ? this.t('ontology.optional') : relationship.required}</span>` : nothing}${relationship.derived ? html`<span class="nr-chip is-derived">${this.t('ontology.v3.derived')}</span>` : nothing}</footer>
          ${relationship.path ? html`<p class="nr-v3__path"><code>${relationship.path}</code></p>` : nothing}
          ${relationship.conflict ? html`<p class="nr-v3__warning" role="alert">${relationship.conflict}</p>` : nothing}
        </article>
      `)}</div></div>
    </details>`;
  }

  private renderV3Capabilities(capabilities: OntologyCapabilityView[]) {
    const group = (origin: 'platform' | 'module') => capabilities.filter(item => item.origin === origin);
    return html`<details class="nr-ontology__section nr-v3__section nr-v3__collapsible-section">
      <summary class="nr-v3__section-summary"><div><div><h3>${this.t('ontology.v3.capabilities')}</h3><p>${this.t('ontology.v3.capabilitiesDescription')}</p></div><span>${this.t('ontology.count', { count: capabilities.length })}</span></div></summary>
      <div class="nr-v3__section-body"><div class="nr-v3__split">${(['platform', 'module'] as const).map(origin => html`<section><h4>${this.t(`ontology.v3.group.${origin}`)}</h4><div class="nr-v3__catalog">${group(origin).map(capability => html`
        <article class=${capability.unresolved ? 'is-unresolved' : ''}><header><code>${capability.id}</code>${capability.platform ? html`<span class="nr-chip is-${capability.platform}">${this.t(`ontology.v3.status.${capability.platform}`)}</span>` : nothing}</header>
          <p>${capability.moduleSentence || capability.sentence || this.t('ontology.v3.unresolved')}</p>
          ${capability.moduleSentence ? html`<small>${capability.sentence}</small>` : nothing}
        </article>`)}${!group(origin).length ? html`<p class="nr-ontology__empty-inline">${this.t('ontology.v3.none')}</p>` : nothing}</div></section>`)}</div></div>
    </details>`;
  }

  private renderV3Rules(rules: OntologyRuleView[]) {
    const group = (origin: 'platform' | 'module') => rules.filter(item => item.origin === origin);
    return html`<details class="nr-ontology__section nr-v3__section nr-v3__collapsible-section">
      <summary class="nr-v3__section-summary"><div><div><h3>${this.t('ontology.rules')}</h3><p>${this.t('ontology.v3.rulesDescription')}</p></div><span>${this.t('ontology.count', { count: rules.length })}</span></div></summary>
      <div class="nr-v3__section-body"><div class="nr-v3__split">${(['platform', 'module'] as const).map(origin => html`<section><h4>${this.t(`ontology.v3.group.${origin}`)}</h4><div class="nr-v3__catalog">${group(origin).map(rule => html`<article class=${rule.unresolved ? 'is-unresolved' : ''}><header><code>${rule.id}</code>${rule.platform ? html`<span class="nr-chip is-${rule.platform}">${this.t(`ontology.v3.status.${rule.platform}`)}</span>` : nothing}</header><p>${rule.text || this.t('ontology.v3.unresolved')}</p></article>`)}${!group(origin).length ? html`<p class="nr-ontology__empty-inline">${this.t('ontology.v3.none')}</p>` : nothing}</div></section>`)}</div></div>
    </details>`;
  }

  private renderV3Lifecycle(entity: Ns5OntologyEntityV3 | undefined) {
    if (!entity) return nothing;
    const states = entity.lifecycleStates || [];
    const transitions = entity.transitions || [];
    const uniqueKeys = entity.uniqueKeys || [];
    if (!states.length && !transitions.length && !uniqueKeys.length) return nothing;
    return html`<details class="nr-ontology__section nr-v3__section nr-v3__collapsible-section">
      <summary class="nr-v3__section-summary"><div><div><h3>${this.t('ontology.v3.lifecycleAndKeys')}</h3><p>${this.t('ontology.v3.lifecycleDescription')}</p></div><span>${this.t('ontology.v3.lifecycleCount', { states: states.length, transitions: transitions.length })}</span></div></summary>
      <div class="nr-v3__section-body">
        ${uniqueKeys.length ? html`<div class="nr-v3__unique"><strong>${this.t('ontology.uniqueKeys')}</strong>${uniqueKeys.map(key => html`<span>${key.map(field => html`<code>${field}</code>`)}</span>`)}</div>` : nothing}
        ${states.length ? html`<div class="nr-lifecycle__rail">${states.map(state => html`<span><strong>${state.state}</strong><small>${this.t(`ontology.reachedBy.${state.reachedBy}`)}</small></span>`)}</div>` : nothing}
        ${transitions.length ? html`<div class="nr-lifecycle__transitions">${transitions.map(transition => html`<article><header><code>${transition.transitionId}</code><span>${transition.from.join(', ')} → ${transition.to}</span></header><p>${transition.description}</p><footer><span>${this.t('ontology.by')}: <strong>${Array.isArray(transition.by) ? transition.by.join(', ') : transition.by}</strong></span>${transition.ruleRefs?.length ? html`<span>${this.t('ontology.ruleRefs')}: ${transition.ruleRefs.map(rule => html`<code>${rule}</code>`)}</span>` : nothing}</footer></article>`)}</div>` : nothing}
      </div>
    </details>`;
  }

  private v3GraphOption(index: Ns5OntologyIndexV3) {
    const style = getComputedStyle(this);
    const colors = Array.from({ length: 6 }, (_, item) => style.getPropertyValue(`--chart-series-${item + 1}`).trim() || style.getPropertyValue(`--ds-chart-series-${item + 1}`).trim());
    const text = style.getPropertyValue('--text-default').trim() || '#2f3a48';
    const muted = style.getPropertyValue('--text-muted').trim() || '#5d6b7e';
    const surface = style.getPropertyValue('--surface-bg').trim() || '#fff';
    const graph = buildOntologyV3Graph(index, this.v3Views, colors);
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    const signature = JSON.stringify({ index, graph, colors, text, muted, surface, reduceMotion });
    if (signature === this.v3GraphCacheSignature && this.v3GraphCache) return this.v3GraphCache;
    this.v3GraphCacheSignature = signature;
    this.v3GraphCache = {
      animation: !reduceMotion,
      aria: { enabled: true, decal: { show: true }, description: this.t('ontology.v3.graphAria') },
      tooltip: { trigger: 'item' },
      legend: [{ data: graph.categories.map(category => ({ name: this.t(`ontology.kind.${category.name}`), icon: 'circle' })), textStyle: { color: muted } }],
      toolbox: { right: 12, feature: { restore: { title: this.t('ontology.graphReset') }, saveAsImage: { title: this.t('ontology.graphPng'), name: `${this.moduleName}-ontology-v3`, pixelRatio: 2 } } },
      series: [{
        type: 'graph', layout: 'force', roam: true, draggable: true,
        data: graph.nodes.map(node => ({ ...node, label: { formatter: [`{title|${node.title}}`, `{id|${node.id}}`, ...node.detailBranches.map(branch => `{branch|details.${branch}}`)].join('\n') } })),
        links: graph.links.map(link => ({ ...link, label: { formatter: link.value } })),
        categories: graph.categories.map(category => ({ ...category, name: this.t(`ontology.kind.${category.name}`) })),
        force: { repulsion: 360, edgeLength: [120, 210], gravity: .07 }, edgeSymbol: ['none', 'arrow'], edgeSymbolSize: 9,
        label: { show: true, color: text, rich: { title: { fontSize: 12, fontWeight: 700, lineHeight: 18 }, id: { fontSize: 10, color: muted, lineHeight: 14 }, branch: { fontSize: 9, color: muted, lineHeight: 13, backgroundColor: surface, padding: [0, 3], borderRadius: 2 } } },
        edgeLabel: { show: true, color: muted, fontSize: 9, backgroundColor: surface, padding: [2, 4], borderRadius: 3 }, lineStyle: { curveness: .1 }, emphasis: { focus: 'adjacency' },
      }],
    };
    return this.v3GraphCache;
  }

  private renderV3Graph(index: Ns5OntologyIndexV3, selected: OntologyTreeView) {
    const graph = buildOntologyV3Graph(index, this.v3Views, []);
    return html`<section class="nr-ontology__graph-view"><div class="nr-ontology__graph-layout"><div class="nr-ontology__graph" role="img" aria-label=${this.t('ontology.v3.graphAria')} ${chart(this.v3GraphOption(index), { click: (params: unknown) => { const node = params as { dataType?: string; data?: { id?: string } }; if (node.dataType === 'node' && node.data?.id) this.selectV3Entity(node.data.id); } })}></div><aside><span>${this.t('ontology.selected')}</span><h2>${selected.title}</h2><code>${selected.entityId}</code><p>${selected.description}</p><dl><div><dt>${this.t('ontology.fields')}</dt><dd>${ontologyV3FieldCount(selected)}</dd></div><div><dt>${this.t('ontology.relationships')}</dt><dd>${selected.relationships.length}</dd></div><div><dt>${this.t('ontology.v3.branches')}</dt><dd>${selected.details.length}</dd></div></dl><button type="button" @click=${() => { this.view = 'text'; }}>${this.t('ontology.openDetails')}</button></aside></div><details class="nr-ontology__graph-alternative"><summary>${this.t('ontology.graphAlternative')}</summary><div><section><h3>${this.t('ontology.entities')}</h3><ul>${graph.nodes.map(node => html`<li><button type="button" @click=${() => this.selectV3Entity(node.id)}><strong>${node.title}</strong><code>${node.ghost ? this.t('ontology.v3.platformGhost') : node.id}</code></button></li>`)}</ul></section><section><h3>${this.t('ontology.relationships')}</h3><ul>${index.relationships.map(link => html`<li><strong>${link.from}</strong><span>${link.mode}</span><strong>${link.to}</strong><code>${link.catalogType || link.through || link.field || link.relationshipId}</code></li>`)}</ul></section></div></details></section>`;
  }

  private renderV3EntityContent(index: Ns5OntologyIndexV3, entity: OntologyTreeView) {
    const raw = this.v3Entities().find(item => item.entityId === entity.entityId);
    return html`<div class="nr-v3__entity-content">
      <section class="nr-ontology__identity nr-v3__identity"><div><span>${this.t('ontology.entity')}</span><h2>${entity.title}</h2><code>${entity.entityId}</code></div><div class="nr-ontology__badges"><span>${this.t(`ontology.kind.${entity.kind}`)}</span>${entity.subtype ? html`<span>${entity.subtype}</span>` : nothing}<span>${this.t('ontology.v3.readOnly')}</span></div><p>${entity.description}</p><dl><div><dt>${this.t('ontology.displayField')}</dt><dd><code>${entity.displayField}</code></dd></div><div><dt>${this.t('ontology.v3.namespace')}</dt><dd><code>${index.moduleNamespace.key}</code></dd></div><div><dt>${this.t('ontology.v3.schema')}</dt><dd><code>${this.t('ontology.v3.contractName')}</code></dd></div></dl></section>
      <section class="nr-ontology__section nr-v3__section"><header><div><h3>${this.t('ontology.v3.record')}</h3><p>${this.t('ontology.v3.recordDescription')}</p></div><span>${this.t('ontology.count', { count: entity.columns.length + 1 })}</span></header><div class="nr-v3__record">${entity.columns.map(column => html`<article><header><strong>${column.title || column.id}</strong><code>${column.id}</code></header><div class="nr-v3__chips">${this.renderV3NodeChips(column)}</div>${column.description ? html`<p>${column.description}</p>` : nothing}</article>`)}<article class="is-details"><header><strong>${this.t('ontology.v3.details')}</strong><code>${this.t('ontology.v3.details')}</code></header><div class="nr-v3__chips"><span class="nr-chip">${this.t('ontology.v3.object')}</span><span class="nr-chip is-required">${this.t('ontology.required')}</span></div><p>${this.t('ontology.v3.detailsSummary', { count: entity.details.length })}</p></article></div></section>
      <section class="nr-ontology__section nr-v3__section"><header><div><h3>${this.t('ontology.v3.details')}</h3><p>${this.t('ontology.v3.treeDescription')}</p></div><span title=${this.t('ontology.v3.leafCountHelp')} >${this.t('ontology.v3.leafCount', { count: ontologyNodeLeafCount(entity.details) })}</span></header><div class="nr-v3__tree">${entity.details.map(node => this.renderV3Node(node))}</div></section>
      ${this.renderV3Relationships(entity.relationships)}
      ${this.renderV3Capabilities(entity.capabilities)}
      ${this.renderV3Rules(entity.rules)}
      ${this.renderV3Lifecycle(raw)}
    </div>`;
  }

  private renderV3EntityPanel(index: Ns5OntologyIndexV3, entity: OntologyTreeView, selected: OntologyTreeView) {
    const isOpen = entity.entityId === selected.entityId;
    const className = entity.kind === 'platform' ? 'nr-v3__entity-panel is-platform' : 'nr-v3__entity-panel';
    return html`<details class=${className} ?open=${isOpen}>
      <summary @click=${(event: MouseEvent) => {
        event.preventDefault();
        void this.selectV3EntityAndScroll(entity.entityId, event.currentTarget as HTMLElement);
      }}>
        <span><strong>${entity.title}</strong><code>${entity.entityId}</code></span>
        <span class="nr-v3__entity-meta"><i>${this.t(`ontology.kind.${entity.kind}`)}</i>${entity.subtype ? html`<i>${entity.subtype}</i>` : nothing}<i>${ontologyV3FieldCount(entity)} ${this.t('ontology.fields')}</i></span>
      </summary>
      <div class="nr-v3__entity-reveal"><div>${this.renderV3EntityContent(index, entity)}</div></div>
    </details>`;
  }

  private renderV3Text(index: Ns5OntologyIndexV3, selected: OntologyTreeView) {
    const entities = selected.kind === 'platform' ? [...this.v3Views, selected] : this.v3Views;
    return html`<div class="nr-v3__entity-accordion">${entities.map(entity => this.renderV3EntityPanel(index, entity, selected))}</div>`;
  }

  private renderV3(index: Ns5OntologyIndexV3) {
    if (this.v3Loading && !this.v3Views.length) return html`<section class="nr-ontology__empty"><h2>${this.t('ontology.v3.loading')}</h2></section>`;
    if (this.v3Error) return html`<section class="nr-ontology__empty"><h2>${this.t('ontology.v3.error')}</h2><p>${this.v3Error}</p></section>`;
    const selected = this.v3SelectedView();
    if (!selected) return html`<section class="nr-ontology__empty"><h2>${this.t('ontology.emptyTitle')}</h2><p>${this.t('ontology.emptyBody')}</p></section>`;
    const fields = this.v3Views.reduce((count, view) => count + ontologyV3FieldCount(view), 0);
    return html`<section class="nr-ontology nr-v3"><header class="nr-ontology__hero"><div><span>${this.t('ontology.v3.eyebrow')}</span><h2>${this.t('ontology.title')}</h2><p>${index.businessDomain}</p></div><div class="nr-ontology__actions"><div class="nr-ontology__toggle" role="group" aria-label=${this.t('ontology.view')}><button type="button" class=${this.view === 'text' ? 'is-active' : ''} @click=${() => { this.view = 'text'; }}>${this.t('ontology.view.text')}</button><button type="button" class=${this.view === 'graph' ? 'is-active' : ''} @click=${() => { this.view = 'graph'; }}>${this.t('ontology.view.graph')}</button></div><span class="nr-v3__edit-note">${this.t('ontology.v3.editNote')}</span><button class="nr-button nr-button--secondary" type="button" disabled title=${this.t('ontology.v3.editNote')}>${this.t('ontology.edit')}</button></div></header><div class="nr-ontology__summary"><span><strong>${this.v3Views.length}</strong>${this.t('ontology.entities')}</span><span><strong>${index.relationships.length}</strong>${this.t('ontology.relationships')}</span><span title=${this.t('ontology.v3.fieldCountHelp')}><strong>${fields}</strong>${this.t('ontology.fields')}</span></div>${this.view === 'graph' ? this.renderV3Graph(index, selected) : this.renderV3Text(index, selected)}</section>`;
  }

  render() {
    const v3Index = this.v3Index();
    if (v3Index) return this.renderV3(v3Index);
    const entity = this.currentEntity();
    const index = this.currentIndex();
    if (!entity || !index) return html`<section class="nr-ontology__empty"><h2>${this.t('ontology.emptyTitle')}</h2><p>${this.t('ontology.emptyBody')}</p></section>`;
    const counts = this.currentEntities().reduce((result, item) => {
      const current = ontologyFieldCounts(item);
      return { namespace: result.namespace + current.namespace, base: result.base + current.base, total: result.total + current.total };
    }, { namespace: 0, base: 0, total: 0 });
    return html`
      <section class="nr-ontology">
        <header class="nr-ontology__hero"><div><span>${this.t('ontology.eyebrow')}</span><h2>${this.t('ontology.title')}</h2><p>${index.businessDomain}</p></div><div class="nr-ontology__actions"><div class="nr-ontology__toggle" role="group" aria-label=${this.t('ontology.view')}><button type="button" class=${this.view === 'text' ? 'is-active' : ''} @click=${() => { this.view = 'text'; }}>${this.t('ontology.view.text')}</button><button type="button" class=${this.view === 'graph' ? 'is-active' : ''} @click=${() => { this.view = 'graph'; }}>${this.t('ontology.view.graph')}</button></div>${this.mode === 'view' ? html`<button class="nr-button nr-button--secondary" type="button" @click=${() => { this.view = 'text'; this.beginEdit(); }}>${this.t('ontology.edit')}</button>` : html`<span>${this.t('ontology.editing')}</span>`}</div></header>
        <div class="nr-ontology__summary"><span><strong>${this.currentEntities().length}</strong>${this.t('ontology.entities')}</span><span><strong>${index.relationships.length}</strong>${this.t('ontology.relationships')}</span><span title=${this.t('ontology.fieldCountBreakdown', { namespace: counts.namespace, base: counts.base })}><strong>${counts.total}</strong>${this.t('ontology.fields')}</span></div>
        ${this.view === 'graph' ? this.renderGraph(entity) : this.renderText(entity)}
        ${this.mode === 'edit' ? html`<footer class="nr-ontology__edit-footer"><span>${this.dirty ? this.t('ontology.unsaved') : this.t('ontology.noChanges')}</span><div><button type="button" @click=${this.cancelEdit}>${this.t('ontology.cancel')}</button><button class="is-primary" type="button" ?disabled=${!this.dirty} @click=${() => void this.saveEdit()}>${this.t('ontology.save')}</button></div></footer>` : nothing}
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'new-release--widgets--ontology-102035': NewReleaseOntology102035;
  }
}
