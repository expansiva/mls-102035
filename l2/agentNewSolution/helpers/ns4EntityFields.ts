/// <mls fileReference="_102035_/l2/agentNewSolution/helpers/ns4EntityFields.ts" enhancement="_blank"/>

/**
 * Fields an NS artifact may name on an entity: declared `fields[]` plus the logical identity
 * `storage.idField` when that id is absent from the list (mdm after n04 is namespace-only).
 * Structural: never inferred from a field name.
 */

import type { Ns4OntologyField } from '/_102035_/l2/agentNewSolution/steps/e4/contracts.js';

export const NS4_IDENTITY_FIELD_DESCRIPTION =
  'Logical record identity. Required uuid named by storage.idField.';

export type Ns4EntityFieldsSource = {
  entityId?: string;
  kind?: string;
  fields?: ReadonlyArray<{
    fieldId: string;
    type?: Ns4OntologyField['type'];
    required?: boolean;
    description?: string;
    title?: string;
    constraints?: Ns4OntologyField['constraints'];
    enum?: string[];
    enumLabels?: Ns4OntologyField['enumLabels'];
  }>;
  storage?: { idField?: string } | null;
};

export function ns4EntityIdField(entity: Ns4EntityFieldsSource | undefined | null): string {
  return entity?.storage?.idField || '';
}

export function ns4ResolvableFields(entity: Ns4EntityFieldsSource | undefined | null): Ns4OntologyField[] {
  const declared = [...(entity?.fields ?? [])] as Ns4OntologyField[];
  const idField = ns4EntityIdField(entity);
  if (!idField || declared.some(field => field.fieldId === idField)) return declared;
  return [...declared, {
    fieldId: idField,
    title: idField,
    type: 'uuid',
    required: true,
    description: NS4_IDENTITY_FIELD_DESCRIPTION,
    constraints: [],
  }];
}

export function ns4ResolvableFieldIds(entity: Ns4EntityFieldsSource | undefined | null): Set<string> {
  return new Set(ns4ResolvableFields(entity).map(field => field.fieldId));
}

export function ns4ResolvableFieldOf(
  entity: Ns4EntityFieldsSource | undefined | null,
  fieldId: string,
): Ns4OntologyField | undefined {
  return ns4ResolvableFields(entity).find(field => field.fieldId === fieldId);
}

/** Compact entity payload for the E4 relationship-binding prompt: exact available fields. */
export function ns4BindingPromptEntity(entity: Ns4EntityFieldsSource & { entityId: string }): {
  entityId: string;
  kind?: string;
  storage: Ns4EntityFieldsSource['storage'];
  fields: Array<{ fieldId: string; type: Ns4OntologyField['type']; required: boolean; description: string }>;
} {
  return {
    entityId: entity.entityId,
    kind: entity.kind,
    storage: entity.storage,
    fields: ns4ResolvableFields(entity).map(field => ({
      fieldId: field.fieldId,
      type: field.type,
      required: field.required,
      description: field.description,
    })),
  };
}
