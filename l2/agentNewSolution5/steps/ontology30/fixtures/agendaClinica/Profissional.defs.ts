/// <mls fileReference="_102047_/l4/agendaClinica/ontology/Profissional.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const agendaClinicaEntityProfissional = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "agendaClinica",
  "entityId": "Profissional",
  "title": "Profissional",
  "description": "Médico ou terapeuta da clínica que realiza consultas e acessa a própria agenda.",
  "kind": "mdm",
  "party": "person",
  "mdmSubtype": "Person",
  "displayField": "name",
  "fields": [],
  "fieldsBase": [
    { "fieldId": "name", "title": "Nome completo", "type": "string", "required": true, "description": "Nome completo do profissional." },
    { "fieldId": "docType", "title": "Tipo de documento", "type": "string", "required": true, "enum": [{ "value": "CPF", "title": "CPF" }], "description": "Tipo de documento de identificação do profissional." },
    { "fieldId": "docId", "title": "CPF", "type": "string", "required": true, "description": "Número do CPF do profissional." },
    { "fieldId": "contacts", "title": "Contatos", "type": "json", "required": true, "description": "Contatos do profissional (telefone, e-mail)." }
  ],
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "mdm",
    "scope": "organization",
    "idField": "id",
    "mdmType": "agendaClinica.Profissional"
  },
  "writer": "crud"
} as const satisfies Ns5OntologyEntityArtifact;

export type AgendaClinicaEntityProfissionalType = typeof agendaClinicaEntityProfissional;

export default agendaClinicaEntityProfissional;
