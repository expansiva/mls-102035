/// <mls fileReference="_102047_/l4/agendaClinica/ontology/Profissional.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const agendaClinicaEntityProfissional = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "agendaClinica",
  "entityId": "Profissional",
  "title": "Profissional",
  "description": "Médico ou terapeuta da clínica que realiza consultas.",
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
    "mdmType": "agendaClinica.Profissional"
  },
  "maintenance": "crud"
} as const satisfies Ns5OntologyEntityArtifact;

export type AgendaClinicaEntityProfissionalType = typeof agendaClinicaEntityProfissional;

export default agendaClinicaEntityProfissional;
