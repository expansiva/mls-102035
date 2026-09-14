/// <mls fileReference="_102035_/l2/newRelease/widgets/generalModel.ts" enhancement="_blank" />

import type { Ns5ModuleArtifact, Ns5OntologyDetail } from '/_102035_/l2/solution/types.js';
import type { NewReleaseTabId } from '/_102035_/l2/newRelease/editContract.js';

export const GENERAL_DETAIL_TYPES = [
  'uuid', 'string', 'text', 'number', 'integer', 'boolean', 'money', 'date', 'datetime', 'json',
] as const satisfies readonly Ns5OntologyDetail['type'][];

export const GENERAL_DETAIL_NAME = /^[a-z][A-Za-z0-9]*$/;

export function generalOracleTab(checkId: string): NewReleaseTabId {
  if (checkId === 'I2') return 'journeys';
  if (checkId === 'I3' || checkId === 'I5' || checkId === 'I8' || checkId === 'I13') return 'access';
  if (checkId === 'I4') return 'rules';
  if (checkId === 'I6') return 'workflows';
  if (checkId === 'I11' || checkId === 'I12') return 'integration';
  return 'ontology';
}

export function humanizeGeneralDetail(name: string): string {
  return name
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/^./u, value => value.toUpperCase());
}

export function initialGeneralDetailDescription(name: string, userLanguage: string): string {
  const label = humanizeGeneralDetail(name);
  if (userLanguage.toLowerCase().startsWith('es')) return `Resumen de ${label} para este módulo.`;
  if (userLanguage.toLowerCase().startsWith('pt')) return `Resumo de ${label} para este módulo.`;
  return `Module-level summary for ${label}.`;
}

export function setGeneralLanguages(
  module: Ns5ModuleArtifact,
  productLanguages: string[],
  defaultLanguage?: string,
): Ns5ModuleArtifact {
  const unique = [...new Set(productLanguages.filter(Boolean))];
  if (!unique.length) return module;
  return {
    ...module,
    productLanguages: unique,
    defaultLanguage: defaultLanguage && unique.includes(defaultLanguage) ? defaultLanguage : unique[0],
  };
}

export function addGeneralDetail(
  module: Ns5ModuleArtifact,
  name: string,
  type: Ns5OntologyDetail['type'],
): Ns5ModuleArtifact {
  if (!GENERAL_DETAIL_NAME.test(name) || module.details?.[name]) return module;
  return {
    ...module,
    details: {
      ...(module.details || {}),
      [name]: { type, description: initialGeneralDetailDescription(name, module.userLanguage) },
    },
  };
}

export function removeGeneralDetail(module: Ns5ModuleArtifact, name: string): Ns5ModuleArtifact {
  if (!module.details?.[name]) return module;
  const details = { ...module.details };
  delete details[name];
  return Object.keys(details).length ? { ...module, details } : (({ details: _removed, ...rest }) => rest)(module);
}
