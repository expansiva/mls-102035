/// <mls fileReference="_102047_/l4/locacaoEquipamentos/ontology/Atendente.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const locacaoEquipamentosEntityAtendente = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "locacaoEquipamentos",
  "entityId": "Atendente",
  "title": "Atendente",
  "description": "Profissional da locadora responsável pelos contratos que cria e pelas devoluções que registra.",
  "kind": "mdm",
  "party": "person",
  "mdmSubtype": "Person",
  "displayField": "name",
  "fields": [],
  "fieldsBase": [
    { "fieldId": "name", "title": "Nome completo", "type": "string", "required": true, "description": "Nome completo do atendente." }
  ],
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "mdm",
    "scope": "organization",
    "idField": "id",
    "mdmType": "locacaoEquipamentos.Atendente"
  },
  "writer": "crud"
} as const satisfies Ns5OntologyEntityArtifact;

export type LocacaoEquipamentosEntityAtendenteType = typeof locacaoEquipamentosEntityAtendente;

export default locacaoEquipamentosEntityAtendente;
