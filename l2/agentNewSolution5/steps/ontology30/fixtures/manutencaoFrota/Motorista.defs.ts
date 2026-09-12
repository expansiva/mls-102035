/// <mls fileReference="_102047_/l4/manutencaoFrota/ontology/Motorista.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaEntityMotorista = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "manutencaoFrota",
  "entityId": "Motorista",
  "title": "Motorista",
  "description": "Papel de motorista da transportadora, usado para registrar quem realizou abastecimentos e quais veículos lhe estão atribuídos.",
  "kind": "mdm",
  "party": "person",
  "mdmSubtype": "Person",
  "displayField": "name",
  "fields": [],
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "mdm",
    "scope": "organization",
    "idField": "id",
    "mdmType": "manutencaoFrota.Motorista"
  },
  "writer": "crud"
} as const satisfies Ns5OntologyEntityArtifact;

export type ManutencaoFrotaEntityMotoristaType = typeof manutencaoFrotaEntityMotorista;

export default manutencaoFrotaEntityMotorista;
