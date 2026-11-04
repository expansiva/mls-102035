/// <mls fileReference="_102035_/l2/solution/testing/providerEdgeCases.ts" enhancement="_blank" />

/**
 * Test helper. A provider in strict mode does not enforce `minLength`, `maxLength`, `pattern`, `format`,
 * `minItems` or `maxItems`: a tool answer can carry values the schema "forbids". From a tool schema and one
 * valid example, this lists those values, one restriction at a time, each with the path of the field.
 */

export type ProviderEdgeRule = 'minLength' | 'maxLength' | 'pattern' | 'format' | 'minItems' | 'maxItems';

export interface ProviderEdgeCase {
  /** Field path in the example, such as `items[0].name`. */
  path: string;
  rule: ProviderEdgeRule;
  /** Short label of the value, for the test title. */
  variant: string;
  /** A copy of the example with only that field changed. */
  value: unknown;
}

type Schema = Record<string, unknown>;
type Step = string | number;

const FORMAT_BREAKERS: Record<string, string> = {
  'date-time': 'not a date', date: 'not a date', time: 'not a time', email: 'not an email', uri: 'not a uri',
  uuid: 'not-a-uuid', ipv4: '999.1.1.1',
};

function record(value: unknown): Schema | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Schema : null;
}

function render(path: readonly Step[]): string {
  return path.reduce<string>((text, step) => typeof step === 'number' ? `${text}[${step}]` : text ? `${text}.${step}` : step, '');
}

function replaceAt(root: unknown, path: readonly Step[], value: unknown): unknown {
  if (!path.length) return value;
  const copy = structuredClone(root);
  let node = copy as Record<string | number, unknown>;
  for (const step of path.slice(0, -1)) node = node[step] as Record<string | number, unknown>;
  node[path[path.length - 1]] = value;
  return copy;
}

function resolve(schema: Schema, root: Schema): Schema {
  const ref = schema.$ref;
  if (typeof ref !== 'string' || !ref.startsWith('#/')) return schema;
  let node: unknown = root;
  for (const part of ref.slice(2).split('/')) node = record(node)?.[part];
  return record(node) ?? schema;
}

/** A string that does not match the pattern, or null when no simple candidate breaks it. */
function breakPattern(pattern: string): string | null {
  let regex: RegExp;
  try { regex = new RegExp(pattern, 'u'); } catch { return null; }
  return ['', ' ', '!', '###', '0', 'Z', '\n', 'a b c'].find(candidate => !regex.test(candidate)) ?? null;
}

function walk(node: unknown, schemaIn: unknown, root: Schema, example: unknown, path: Step[], out: ProviderEdgeCase[]): void {
  const raw = record(schemaIn);
  if (!raw) return;
  const schema = resolve(raw, root);
  const branches = Array.isArray(schema.anyOf) ? schema.anyOf : Array.isArray(schema.oneOf) ? schema.oneOf : [];
  for (const branch of branches) walk(node, branch, root, example, path, out);
  const add = (rule: ProviderEdgeRule, variant: string, value: unknown) => out.push({ path: render(path), rule, variant, value: replaceAt(example, path, value) });

  if (typeof node === 'string') {
    const min = schema.minLength;
    if (typeof min === 'number' && min >= 1) {
      add('minLength', 'empty text', '');
      add('minLength', 'only spaces', '   ');
    }
    const max = schema.maxLength;
    if (typeof max === 'number' && max >= 0) add('maxLength', 'one over the limit', 'x'.repeat(max + 1));
    if (typeof schema.pattern === 'string') {
      const broken = breakPattern(schema.pattern);
      if (broken !== null) add('pattern', `outside the pattern (${JSON.stringify(broken)})`, broken);
    }
    if (typeof schema.format === 'string' && FORMAT_BREAKERS[schema.format]) add('format', `not a ${schema.format}`, FORMAT_BREAKERS[schema.format]);
  }
  if (Array.isArray(node)) {
    const min = schema.minItems;
    if (typeof min === 'number' && min >= 1) add('minItems', 'empty list', []);
    const max = schema.maxItems;
    if (typeof max === 'number' && max >= 0 && node.length) add('maxItems', 'one over the limit', Array.from({ length: max + 1 }, () => structuredClone(node[0])));
    node.forEach((item, index) => walk(item, schema.items, root, example, [...path, index], out));
  }
  const properties = record(schema.properties);
  const object = record(node);
  if (properties && object) {
    for (const [key, child] of Object.entries(properties)) {
      if (key in object) walk(object[key], child, root, example, [...path, key], out);
    }
  }
}

/** The values the provider lets through for `schema`, each in a copy of `example` (which must already be valid). */
export function providerEdgeCases(schema: Schema, example: unknown): ProviderEdgeCase[] {
  const out: ProviderEdgeCase[] = [];
  walk(example, schema, schema, example, [], out);
  const seen = new Set<string>();
  return out.filter(item => {
    const key = `${item.path}|${item.rule}|${item.variant}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
