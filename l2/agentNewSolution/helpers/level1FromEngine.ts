/// <mls fileReference="_102035_/l2/agentNewSolution/helpers/level1FromEngine.ts" enhancement="_blank"/>

import {
  NS4_LEVEL1_SCHEMA_VERSION,
  type Ns4Level1AllowedRelationship,
  type Ns4Level1EntityArtifact,
  type Ns4Level1Field,
  type Ns4Level1IndexArtifact,
  type Ns4Level1RelationshipRef,
  type Ns4Level1Subtype,
} from '/_102035_/l2/agentNewSolution/helpers/organizationTypes.js';

/** Indexed identification columns the platform owns. Must stay aligned with BaseMdmDetailRecord. */
export const NS4_LEVEL1_IDENTIFICATION_FIELD_IDS = [
  'name', 'docType', 'docId', 'countryCode', 'tags',
] as const;

/** Shared document keys of the platform base (inside the jsonb, typed by the engine). */
export const NS4_LEVEL1_SHARED_BASE_FIELD_IDS = [
  'aliases', 'contacts', 'addresses', 'relationshipRefs',
] as const;

export function parseEngineTypeUnion(source: string, typeName: string): string[] {
  const match = source.match(new RegExp(`export type ${typeName}\\s*=([\\s\\S]*?);`));
  if (!match) throw new Error(`engine type ${typeName} not found`);
  const values = [...match[1].matchAll(/'([A-Za-z][A-Za-z0-9]*)'/g)].map(item => item[1]);
  if (values.length === 0) throw new Error(`engine type ${typeName} has no literals`);
  return values;
}

export function parseEngineInterfaceFields(source: string, interfaceName: string): Ns4Level1Field[] {
  const header = source.match(new RegExp(`export interface ${interfaceName}\\b[^{]*\\{`));
  if (!header || header.index === undefined) throw new Error(`engine interface ${interfaceName} not found`);
  const body = braceBlock(source, header.index + header[0].length - 1);
  const fields: Ns4Level1Field[] = [];
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('[')) continue;
    const parsed = trimmed.match(/^([A-Za-z][A-Za-z0-9]*)(\?)?:\s*(.+?);?\s*$/);
    if (!parsed) continue;
    fields.push({
      fieldId: parsed[1],
      type: parsed[3].replace(/;\s*$/, '').trim(),
      required: !parsed[2],
    });
  }
  if (fields.length === 0) throw new Error(`engine interface ${interfaceName} has no fields`);
  return fields;
}

export function parseEngineDetailFields(ontologySource: string, detailConstName: string): Ns4Level1Field[] {
  const header = ontologySource.match(new RegExp(`export const ${detailConstName}\\s*=\\s*\\{`));
  if (!header || header.index === undefined) throw new Error(`engine const ${detailConstName} not found`);
  const detailBody = braceBlock(ontologySource, header.index + header[0].length - 1);
  const fieldsHeader = detailBody.match(/fields:\s*\{/);
  if (!fieldsHeader || fieldsHeader.index === undefined) {
    throw new Error(`engine const ${detailConstName} has no fields object`);
  }
  const fieldsBody = braceBlock(detailBody, fieldsHeader.index + fieldsHeader[0].length - 1);
  return parseObjectFieldEntries(fieldsBody);
}

export function parseEngineRelationshipCatalog(
  ontologySource: string,
  subtypes: readonly string[],
): Ns4Level1RelationshipRef[] {
  const header = ontologySource.match(/export const RelationshipCatalog\s*=\s*\{/);
  if (!header || header.index === undefined) throw new Error('engine RelationshipCatalog not found');
  const catalogBody = braceBlock(ontologySource, header.index + header[0].length - 1);
  const entries: Ns4Level1RelationshipRef[] = [];
  const row = /\{\s*type:\s*'([^']+)'\s*,\s*from:\s*'([^']+)'\s*,\s*to:\s*'([^']+)'\s*,\s*bidirectional:\s*(true|false)/g;
  let match: RegExpExecArray | null;
  while ((match = row.exec(catalogBody))) {
    entries.push({
      type: match[1],
      from: splitSubtypeList(match[2], subtypes),
      to: splitSubtypeList(match[3], subtypes),
      bidirectional: match[4] === 'true',
    });
  }
  if (entries.length === 0) throw new Error('engine RelationshipCatalog has no entries');
  return entries;
}

export function buildNs4Level1Artifacts(input: {
  ontologySource: string;
  moduleSource: string;
}): { index: Ns4Level1IndexArtifact; entities: Ns4Level1EntityArtifact[] } {
  const subtypes = parseEngineTypeUnion(input.ontologySource, 'MdmSubtype') as Ns4Level1Subtype[];
  const docTypes = parseEngineTypeUnion(input.ontologySource, 'DocType');
  const mdmStatuses = parseEngineTypeUnion(input.ontologySource, 'MdmStatus');
  const relationshipTypes = parseEngineRelationshipCatalog(input.ontologySource, subtypes);
  const baseFields = parseEngineInterfaceFields(input.moduleSource, 'BaseMdmDetailRecord');
  const identification = pickFields(baseFields, NS4_LEVEL1_IDENTIFICATION_FIELD_IDS);
  const sharedBase = pickFields(baseFields, NS4_LEVEL1_SHARED_BASE_FIELD_IDS);
  const entities = subtypes.map(subtype => {
    const extra = parseEngineDetailFields(input.ontologySource, `${subtype}Detail`);
    return {
      schemaVersion: NS4_LEVEL1_SCHEMA_VERSION,
      subtype,
      identification,
      baseFields: [...sharedBase, ...extra],
      allowedRelationships: allowedForSubtype(subtype, relationshipTypes),
    } satisfies Ns4Level1EntityArtifact;
  });
  return {
    index: {
      schemaVersion: NS4_LEVEL1_SCHEMA_VERSION,
      level1SchemaVersion: NS4_LEVEL1_SCHEMA_VERSION,
      subtypes,
      docTypes,
      mdmStatuses,
      relationshipTypes,
    },
    entities,
  };
}

function pickFields(fields: Ns4Level1Field[], ids: readonly string[]): Ns4Level1Field[] {
  return ids.map(fieldId => {
    const found = fields.find(field => field.fieldId === fieldId);
    if (!found) throw new Error(`engine BaseMdmDetailRecord is missing identification/base field ${fieldId}`);
    return found;
  });
}

function allowedForSubtype(
  subtype: string,
  catalog: readonly Ns4Level1RelationshipRef[],
): Ns4Level1AllowedRelationship[] {
  const allowed: Ns4Level1AllowedRelationship[] = [];
  for (const entry of catalog) {
    const isFrom = entry.from.includes(subtype);
    const isTo = entry.to.includes(subtype);
    if (!isFrom && !isTo) continue;
    const as = isFrom && isTo ? 'both' : isFrom ? 'from' : 'to';
    const otherSubtypes = as === 'from' ? entry.to : as === 'to' ? entry.from : unique([...entry.from, ...entry.to]);
    allowed.push({ type: entry.type, as, otherSubtypes });
  }
  return allowed;
}

function splitSubtypeList(value: string, subtypes: readonly string[]): string[] {
  const trimmed = value.trim();
  if (trimmed === 'any') return [...subtypes];
  return trimmed.split('|').map(part => part.trim()).filter(Boolean);
}

function parseObjectFieldEntries(body: string): Ns4Level1Field[] {
  const fields: Ns4Level1Field[] = [];
  let index = 0;
  while (index < body.length) {
    const rest = body.slice(index);
    const nameMatch = rest.match(/^\s*([A-Za-z][A-Za-z0-9]*)\s*:\s*/);
    if (!nameMatch) {
      index += 1;
      continue;
    }
    index += nameMatch[0].length;
    if (body[index] !== '{') {
      const comma = body.indexOf(',', index);
      index = comma < 0 ? body.length : comma + 1;
      continue;
    }
    const inner = braceBlock(body, index);
    const typeMatch = inner.match(/type:\s*(?:'((?:\\'|[^'])*)'|"((?:\\"|[^"])*)")/);
    const typeText = typeMatch?.[1] ?? typeMatch?.[2];
    if (!typeText) throw new Error(`engine field ${nameMatch[1]} has no type`);
    fields.push({
      fieldId: nameMatch[1],
      type: typeText.replace(/\\'/g, "'").replace(/\\"/g, '"'),
      required: !/required:\s*false/.test(inner),
    });
    index += inner.length + 2;
  }
  if (fields.length === 0) throw new Error('engine detail fields object is empty');
  return fields;
}

function braceBlock(source: string, openIndex: number): string {
  if (source[openIndex] !== '{') throw new Error('expected {');
  let depth = 0;
  let inString: string | null = null;
  let escaped = false;
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === inString) inString = null;
      continue;
    }
    if (char === '"' || char === "'") { inString = char; continue; }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex + 1, index);
    }
  }
  throw new Error('unclosed {');
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
