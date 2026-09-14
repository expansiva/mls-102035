/// <mls fileReference="_102047_/l4/agendaClinica/ontology/Paciente.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const agendaClinicaEntityPaciente = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "agendaClinica",
  "entityId": "Paciente",
  "title": "Paciente",
  "description": "Pessoa cadastrada ou vinculada à clínica para receber consultas.",
  "kind": "mdm",
  "party": "person",
  "mdmSubtype": "Person",
  "displayField": "name",
  "fields": [],
  "fieldsBase": [
    { "fieldId": "name", "title": "Nome completo", "type": "string", "required": true, "description": "Nome completo do paciente." },
    { "fieldId": "docType", "title": "Tipo de documento", "type": "string", "required": true, "enum": [{ "value": "CPF", "title": "CPF" }], "description": "Tipo de documento de identificação do paciente." },
    { "fieldId": "docId", "title": "CPF", "type": "string", "required": true, "description": "Número do CPF do paciente." },
    { "fieldId": "birthDate", "title": "Data de nascimento", "type": "date", "required": true, "description": "Data de nascimento do paciente." },
    { "fieldId": "contacts", "title": "Contatos", "type": "json", "required": true, "description": "Contatos do paciente (telefone, e-mail) para comunicação sobre consultas." }
  ],
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "mdm",
    "scope": "organization",
    "idField": "id",
    "mdmType": "agendaClinica.Paciente"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type AgendaClinicaEntityPacienteType = typeof agendaClinicaEntityPaciente;

export default agendaClinicaEntityPaciente;
