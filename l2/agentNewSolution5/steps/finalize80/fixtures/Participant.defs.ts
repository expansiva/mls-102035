/// <mls fileReference="_102047_/l4/inscricaoEvento/ontology/Participant.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const inscricaoEventoEntityParticipant = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "inscricaoEvento",
  "entityId": "Participant",
  "title": "Participante",
  "description": "Pessoa que realiza ou cancela uma inscrição em um evento.",
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
    "mdmType": "inscricaoEvento.Participant"
  },
  "writer": "crud"
} as const satisfies Ns5OntologyEntityArtifact;

export type InscricaoEventoEntityParticipantType = typeof inscricaoEventoEntityParticipant;

export default inscricaoEventoEntityParticipant;
