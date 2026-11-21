/// <mls fileReference="_102035_/l2/solution/gates/externalEntity/contracts.ts" enhancement="_blank"/>

export interface ExternalEntityCheckInput {
  entities: ExternalEntityRow[];
  connections: ExternalEntityConnectionRow[];
  catalogs: Record<string, ExternalEntityCatalog>;
}

export interface ExternalEntityRow {
  entityId: string;
  kind: string;
  connectionId?: string;
  requiredFields: string[];
  /** Fields the entity declares without `required`; a field the connection does not deliver is still a gap, as a warning. */
  optionalFields?: string[];
}

export interface ExternalEntityConnectionRow {
  connectionId: string;
  operationId: string;
  direction: string;
  entityRefs: string[];
}

export interface ExternalEntityCatalog {
  operations: Array<{ operationId: string; outputType?: string }>;
  fieldsByType: Record<string, string[]>;
}

export interface ExternalEntityIssue {
  code: 'EXTERNAL_ENTITY_NO_OPERATION' | 'EXTERNAL_FIELD_NOT_DELIVERED';
  entityId: string;
  message: string;
  path: string;
}

export interface ExternalEntityCheckResult {
  errors: ExternalEntityIssue[];
  warnings: ExternalEntityIssue[];
}

interface ParsedField {
  name: string;
  typeText: string;
}

interface ParsedInterface {
  parents: string[];
  fields: ParsedField[];
}

export function parseCatalogOutputFields(sourceText: string): Record<string, string[]> {
  const interfaces = new Map<string, ParsedInterface>();
  const typeNames: string[] = [];
  const scanner = new SourceScanner(sourceText);
  while (!scanner.done) {
    scanner.skipTrivia();
    if (scanner.done) break;
    if (scanner.atTopLevel() && scanner.peekIdent() === 'export') {
      scanner.readIdent();
      scanner.skipTrivia();
      const keyword = scanner.peekIdent();
      if (keyword === 'interface') {
        scanner.readIdent();
        readInterface(scanner, interfaces);
        continue;
      }
      if (keyword === 'type') {
        scanner.readIdent();
        scanner.skipTrivia();
        const name = scanner.readIdent();
        if (name) typeNames.push(name);
        scanner.skipTypeAliasRest();
        continue;
      }
    }
    scanner.stepTopLevel();
  }

  const fieldsByType: Record<string, string[]> = {};
  for (const name of interfaces.keys()) fieldsByType[name] = resolveFields(name, interfaces, new Set(), true);
  for (const name of typeNames) {
    if (fieldsByType[name] === undefined) fieldsByType[name] = [];
  }
  return fieldsByType;
}

export function checkExternalEntities(input: ExternalEntityCheckInput): ExternalEntityCheckResult {
  const errors: ExternalEntityIssue[] = [];
  const warnings: ExternalEntityIssue[] = [];
  for (const entity of input.entities) {
    if (entity.kind !== 'external') continue;
    const connectionId = entity.connectionId;
    if (!connectionId || input.catalogs[connectionId] === undefined) continue;
    const catalog = input.catalogs[connectionId];
    const cited = input.connections.filter(row =>
      row.connectionId === connectionId
      && row.direction === 'call'
      && row.entityRefs.includes(entity.entityId));
    if (cited.length === 0) {
      errors.push({
        code: 'EXTERNAL_ENTITY_NO_OPERATION',
        entityId: entity.entityId,
        path: `ontology.${entity.entityId}`,
        message: `External entity ${entity.entityId} on connection ${connectionId} is cited by no call operation.`,
      });
    }
    const fieldsToCheck = [
      ...entity.requiredFields.map(field => ({ field, label: 'Required' })),
      ...(entity.optionalFields ?? []).map(field => ({ field, label: 'Optional' })),
    ];
    for (const { field, label } of fieldsToCheck) {
      const considered: string[] = [];
      let delivered = false;
      for (const row of cited) {
        const operation = catalog.operations.find(item => item.operationId === row.operationId);
        if (!operation?.outputType) continue;
        const typeName = unwrapOutputType(operation.outputType);
        const fields = catalog.fieldsByType[typeName];
        if (!fields) continue;
        considered.push(row.operationId);
        if (fields.includes(field)) delivered = true;
      }
      if (considered.length === 0 || delivered) continue;
      warnings.push({
        code: 'EXTERNAL_FIELD_NOT_DELIVERED',
        entityId: entity.entityId,
        path: `ontology.${entity.entityId}.${field}`,
        message: `${label} field ${field} of external entity ${entity.entityId} is not in the output of connection ${connectionId} (operations: ${considered.join(', ')}).`,
      });
    }
  }
  return { errors, warnings };
}

function unwrapOutputType(outputType: string): string {
  let name = outputType.trim();
  let previous = '';
  while (name !== previous) {
    previous = name;
    while (name.endsWith('[]')) name = name.slice(0, -2).trim();
    if (name.startsWith('Promise<') && name.endsWith('>')) name = name.slice('Promise<'.length, -1).trim();
  }
  return name;
}

function resolveFields(
  name: string,
  interfaces: Map<string, ParsedInterface>,
  seen: Set<string>,
  followRefs: boolean,
): string[] {
  const item = interfaces.get(name);
  if (!item || seen.has(name)) return [];
  seen.add(name);
  const names: string[] = [];
  for (const parent of item.parents) {
    for (const field of resolveFields(parent, interfaces, seen, followRefs)) pushUnique(names, field);
  }
  for (const field of item.fields) {
    pushUnique(names, field.name);
    if (!followRefs) continue;
    const ref = referencedType(field.typeText);
    if (!ref || ref === name) continue;
    for (const nested of resolveFields(ref, interfaces, new Set(), false)) pushUnique(names, nested);
  }
  return names;
}

/** `X` or `X[]` (one or more). Anything else, including an object literal, is not a type in this text. */
function referencedType(typeText: string): string {
  let name = typeText.trim();
  if (name.endsWith(';') || name.endsWith(',')) name = name.slice(0, -1).trim();
  name = name.replace(/\[\]/g, '').trim();
  if (!/^[A-Za-z_$][\w$]*$/u.test(name)) return '';
  return name;
}

function pushUnique(names: string[], field: string): void {
  if (!names.includes(field)) names.push(field);
}

function readInterface(scanner: SourceScanner, interfaces: Map<string, ParsedInterface>): void {
  scanner.skipTrivia();
  const name = scanner.readIdent();
  if (!name) return;
  const parents: string[] = [];
  scanner.skipTrivia();
  if (scanner.peekIdent() === 'extends') {
    scanner.readIdent();
    for (;;) {
      scanner.skipTrivia();
      const parent = scanner.readIdent();
      if (parent) parents.push(parent);
      scanner.skipTrivia();
      if (scanner.peek() === '<') scanner.skipBalanced('<', '>');
      scanner.skipTrivia();
      if (scanner.peek() === ',') {
        scanner.advance();
        continue;
      }
      break;
    }
  }
  scanner.skipTrivia();
  if (scanner.peek() !== '{') return;
  scanner.advance();
  interfaces.set(name, { parents, fields: scanner.readInterfaceFields() });
}

class SourceScanner {
  private index = 0;
  private curly = 0;

  constructor(private readonly source: string) {}

  get done(): boolean {
    return this.index >= this.source.length;
  }

  peek(): string {
    return this.source[this.index] ?? '';
  }

  advance(): void {
    this.index += 1;
  }

  atTopLevel(): boolean {
    return this.curly === 0;
  }

  skipTrivia(): void {
    for (;;) {
      const char = this.peek();
      if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
        this.advance();
        continue;
      }
      if (char === '/' && this.source[this.index + 1] === '/') {
        this.advance();
        this.advance();
        while (!this.done && this.peek() !== '\n') this.advance();
        continue;
      }
      if (char === '/' && this.source[this.index + 1] === '*') {
        this.advance();
        this.advance();
        while (!this.done && !(this.peek() === '*' && this.source[this.index + 1] === '/')) this.advance();
        if (!this.done) {
          this.advance();
          this.advance();
        }
        continue;
      }
      return;
    }
  }

  peekIdent(): string {
    const start = this.index;
    const name = this.readIdent();
    this.index = start;
    return name;
  }

  readIdent(): string {
    const start = this.index;
    if (!isIdentStart(this.peek())) return '';
    this.advance();
    while (isIdentPart(this.peek())) this.advance();
    return this.source.slice(start, this.index);
  }

  stepTopLevel(): void {
    const char = this.peek();
    if (char === "'" || char === '"' || char === '`') {
      this.skipString();
      return;
    }
    if (isIdentStart(char)) {
      this.readIdent();
      return;
    }
    if (char === '{') this.curly += 1;
    else if (char === '}') this.curly = Math.max(0, this.curly - 1);
    this.advance();
  }

  skipTypeAliasRest(): void {
    let curly = 0;
    let paren = 0;
    let bracket = 0;
    let angle = 0;
    while (!this.done) {
      this.skipTrivia();
      if (this.done) return;
      const char = this.peek();
      if (char === "'" || char === '"' || char === '`') {
        this.skipString();
        continue;
      }
      if (char === '{') curly += 1;
      else if (char === '}') curly = Math.max(0, curly - 1);
      else if (char === '(') paren += 1;
      else if (char === ')') paren = Math.max(0, paren - 1);
      else if (char === '[') bracket += 1;
      else if (char === ']') bracket = Math.max(0, bracket - 1);
      else if (char === '<') angle += 1;
      else if (char === '>') angle = Math.max(0, angle - 1);
      else if (char === ';' && curly === 0 && paren === 0 && bracket === 0 && angle === 0) {
        this.advance();
        return;
      }
      this.advance();
    }
  }

  readInterfaceFields(): ParsedField[] {
    const fields: ParsedField[] = [];
    let depth = 1;
    while (!this.done && depth > 0) {
      this.skipTrivia();
      if (this.done) break;
      const char = this.peek();
      if (char === "'" || char === '"' || char === '`') {
        this.skipString();
        continue;
      }
      if (char === '{') {
        depth += 1;
        this.advance();
        continue;
      }
      if (char === '}') {
        depth -= 1;
        this.advance();
        continue;
      }
      if (depth > 1) {
        this.advance();
        continue;
      }
      if (char === '[') {
        this.skipMemberTail();
        continue;
      }
      if (!isIdentStart(char)) {
        this.advance();
        continue;
      }
      let name = this.readIdent();
      this.skipTrivia();
      while (isIdentStart(this.peek())) {
        name = this.readIdent();
        this.skipTrivia();
      }
      if (this.peek() === '?') {
        this.advance();
        this.skipTrivia();
      }
      if (this.peek() === ':') {
        this.advance();
        fields.push({ name, typeText: this.takeMemberType() });
        continue;
      }
      if (this.peek() === '(') this.skipMemberTail();
    }
    return fields;
  }

  private takeMemberType(): string {
    const start = this.index;
    this.skipMemberType();
    return this.source.slice(start, this.index);
  }

  private skipMemberType(): void {
    let curly = 0;
    let paren = 0;
    let bracket = 0;
    let angle = 0;
    while (!this.done) {
      this.skipTrivia();
      if (this.done) return;
      const char = this.peek();
      if (char === "'" || char === '"' || char === '`') {
        this.skipString();
        continue;
      }
      if (char === '{') curly += 1;
      else if (char === '}') {
        if (curly === 0 && paren === 0 && bracket === 0 && angle === 0) return;
        curly -= 1;
      } else if (char === '(') paren += 1;
      else if (char === ')') paren = Math.max(0, paren - 1);
      else if (char === '[') bracket += 1;
      else if (char === ']') bracket = Math.max(0, bracket - 1);
      else if (char === '<') angle += 1;
      else if (char === '>') angle = Math.max(0, angle - 1);
      else if ((char === ';' || char === ',') && curly === 0 && paren === 0 && bracket === 0 && angle === 0) {
        this.advance();
        return;
      }
      this.advance();
    }
  }

  private skipMemberTail(): void {
    let curly = 0;
    let paren = 0;
    let bracket = 0;
    while (!this.done) {
      this.skipTrivia();
      if (this.done) return;
      const char = this.peek();
      if (char === "'" || char === '"' || char === '`') {
        this.skipString();
        continue;
      }
      if (char === '{') curly += 1;
      else if (char === '}') {
        if (curly === 0 && paren === 0 && bracket === 0) return;
        curly -= 1;
      } else if (char === '(') paren += 1;
      else if (char === ')') paren = Math.max(0, paren - 1);
      else if (char === '[') bracket += 1;
      else if (char === ']') bracket = Math.max(0, bracket - 1);
      else if (char === ';' && curly === 0 && paren === 0 && bracket === 0) {
        this.advance();
        return;
      }
      this.advance();
    }
  }

  skipBalanced(open: string, close: string): void {
    if (this.peek() !== open) return;
    let depth = 0;
    while (!this.done) {
      const char = this.peek();
      if (char === "'" || char === '"' || char === '`') {
        this.skipString();
        continue;
      }
      if (char === open) depth += 1;
      else if (char === close) {
        depth -= 1;
        this.advance();
        if (depth === 0) return;
        continue;
      }
      this.advance();
    }
  }

  private skipString(): void {
    const quote = this.peek();
    this.advance();
    if (quote === '`') {
      while (!this.done) {
        if (this.peek() === '\\') {
          this.advance();
          this.advance();
          continue;
        }
        if (this.peek() === '`') {
          this.advance();
          return;
        }
        if (this.peek() === '$' && this.source[this.index + 1] === '{') {
          this.advance();
          this.skipBalanced('{', '}');
          continue;
        }
        this.advance();
      }
      return;
    }
    while (!this.done) {
      if (this.peek() === '\\') {
        this.advance();
        this.advance();
        continue;
      }
      if (this.peek() === quote) {
        this.advance();
        return;
      }
      this.advance();
    }
  }
}

function isIdentStart(char: string): boolean {
  return (char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z') || char === '_' || char === '$';
}

function isIdentPart(char: string): boolean {
  return isIdentStart(char) || (char >= '0' && char <= '9');
}

