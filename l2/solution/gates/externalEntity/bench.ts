/// <mls fileReference="_102035_/l2/solution/gates/externalEntity/bench.ts" enhancement="_blank"/>
/**
 * Bench fora da suíte (l4_p4_140 s1b). Lê o disco e imprime a tabela.
 * Uso: pnpm exec tsx l2/solution/gates/externalEntity/bench.ts
 * (cwd: mls-102035)
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkExternalEntities, parseCatalogOutputFields } from './contracts.js';
import type { ExternalEntityCatalog, ExternalEntityCheckInput } from './contracts.js';

const here = dirname(fileURLToPath(import.meta.url));
const mlsBase = join(here, '..', '..', '..', '..', '..');
const l4Root = join(mlsBase, 'mls-102047', 'l4');
const connectionsDir = join(mlsBase, 'mls-102034', 'l2', 'shared', 'contracts', 'connections');

function objectLiteral(source: string): unknown {
  const eq = source.indexOf('= {');
  if (eq < 0) throw new Error('object literal not found');
  let index = eq + 2;
  let depth = 0;
  const start = index;
  for (; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return JSON.parse(source.slice(start, index + 1));
    }
  }
  throw new Error('object literal not closed');
}

function loadCatalog(connectionId: string): ExternalEntityCatalog {
  const source = readFileSync(join(connectionsDir, `${connectionId}.ts`), 'utf8');
  const parsed = objectLiteral(source) as {
    operations: Array<{ operationId: string; outputType?: string }>;
  };
  return {
    operations: parsed.operations.map(operation => ({
      operationId: operation.operationId,
      outputType: operation.outputType,
    })),
    fieldsByType: parseCatalogOutputFields(source),
  };
}

function optionalFieldsOf(entity: { record?: { fields?: Record<string, { required?: boolean }> } }): string[] {
  const fields = entity.record?.fields ?? {};
  return Object.entries(fields).filter(([, field]) => field.required !== true).map(([name]) => name);
}

function requiredFieldsOf(entity: { record?: { fields?: Record<string, { required?: boolean }> } }): string[] {
  const fields = entity.record?.fields ?? {};
  return Object.entries(fields).filter(([, field]) => field.required === true).map(([name]) => name);
}

function main(): void {
  const catalogs: ExternalEntityCheckInput['catalogs'] = {
    cm: loadCatalog('cm'),
    platform: loadCatalog('platform'),
  };
  const modules = readdirSync(l4Root, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name !== 'organization')
    .map(entry => entry.name)
    .sort();
  const rows: string[] = [];
  const errorCount = new Map<string, number>();
  for (const moduleName of modules) {
    const ontologyDir = join(l4Root, moduleName, 'ontology');
    if (!existsSync(ontologyDir)) {
      rows.push(`${moduleName}\t(sem ontology)\t\t`);
      continue;
    }
    const entityFiles = readdirSync(ontologyDir).filter(name => name.endsWith('.defs.ts') && name !== 'index.defs.ts');
    const entities = entityFiles.map(name => {
      const entity = objectLiteral(readFileSync(join(ontologyDir, name), 'utf8')) as {
        entityId: string;
        kind: string;
        connectionId?: string;
        record?: { fields?: Record<string, { required?: boolean }> };
      };
      return {
        entityId: entity.entityId,
        kind: entity.kind,
        connectionId: entity.connectionId,
        requiredFields: requiredFieldsOf(entity),
        optionalFields: optionalFieldsOf(entity),
      };
    });
    const integrationPath = join(l4Root, moduleName, 'integration.defs.ts');
    const integration = objectLiteral(readFileSync(integrationPath, 'utf8')) as {
      connections?: Array<{ connectionId: string; operationId: string; direction: string; entityRefs?: string[] }>;
    };
    const connections = (integration.connections ?? []).map(row => ({
      connectionId: row.connectionId,
      operationId: row.operationId,
      direction: row.direction,
      entityRefs: row.entityRefs ?? [],
    }));
    const result = checkExternalEntities({ entities, connections, catalogs });
    errorCount.set(moduleName, result.errors.length);
    const issues = [
      ...result.errors.map(issue => ({ level: 'erro', issue })),
      ...result.warnings.map(issue => ({ level: 'aviso', issue })),
    ];
    if (issues.length === 0) {
      rows.push(`${moduleName}\t—\t—\t`);
      continue;
    }
    for (const { level, issue } of issues) {
      rows.push(`${moduleName}\t${issue.entityId}\t${level} ${issue.code}\t${issue.message}`);
    }
  }
  console.log('módulo\tentidade\terro/aviso\tmotivo');
  for (const row of rows) console.log(row);
  console.log('---');
  for (const moduleName of modules) {
    console.log(`${moduleName}: ${errorCount.get(moduleName) ?? 0} erro(s)`);
  }
}

main();
