/// <mls fileReference="_102047_/l4/inscricaoEvento/ontology/Participante.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const inscricaoEventoEntityParticipante = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "inscricaoEvento",
  "entityId": "Participante",
  "title": "Participante",
  "description": "Pessoa inscrita ou em lista de espera para eventos deste módulo.",
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
    "mdmType": "inscricaoEvento.Participante"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type InscricaoEventoEntityParticipanteType = typeof inscricaoEventoEntityParticipante;

export default inscricaoEventoEntityParticipante;
