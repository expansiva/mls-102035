/// <mls fileReference="_102047_/l4/manutencaoFrota/ontology/Oficina.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaEntityOficina = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "manutencaoFrota",
  "entityId": "Oficina",
  "title": "Oficina",
  "description": "Empresa prestadora de serviços de manutenção utilizada nas ordens de manutenção.",
  "kind": "mdm",
  "party": "organization",
  "mdmSubtype": "Company",
  "displayField": "name",
  "fields": [],
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "mdm",
    "scope": "organization",
    "idField": "id",
    "mdmType": "manutencaoFrota.Oficina"
  },
  "writer": "crud"
} as const satisfies Ns5OntologyEntityArtifact;

export type ManutencaoFrotaEntityOficinaType = typeof manutencaoFrotaEntityOficina;

export default manutencaoFrotaEntityOficina;
