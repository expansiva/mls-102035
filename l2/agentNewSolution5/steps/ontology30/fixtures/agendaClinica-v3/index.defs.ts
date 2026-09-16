/// <mls fileReference="_102047_/l4/agendaClinica/ontology/index.defs.ts" enhancement="_blank"/>
// ESCRITO À MÃO (planner, 15/09/2026) na forma nova — experimento. Lista canônica de entidades e vínculos do módulo;
// cada entidade repete os seus vínculos para leitura, este índice é a fonte.

export const agendaClinicaOntologyIndex = {
  "schemaVersion": "2026-09-15-ns5-ontology-v3",
  "moduleName": "agendaClinica",
  "businessDomain": "Agendamento e registro de consultas clínicas",
  "platformOntology": "/_102034_/l4/ontology/mdm.defs.ts",
  "moduleNamespace": {
    "key": "agendaClinica",
    "description": "Ramo details.agendaClinica dos registros mestres com papel deste módulo; só este módulo escreve."
  },
  "entities": [
    {
      "entityId": "Paciente",
      "kind": "role",
      "subtype": "Person"
    },
    {
      "entityId": "Profissional",
      "kind": "role",
      "subtype": "Person"
    },
    {
      "entityId": "Consulta",
      "kind": "entity",
      "class": "core"
    }
  ],
  "relationships": [
    {
      "relationshipId": "consultaPaciente",
      "from": "Consulta",
      "to": "Paciente",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "field": "Consulta.pacienteId",
      "description": "Cada consulta é agendada para um paciente."
    },
    {
      "relationshipId": "consultaProfissional",
      "from": "Consulta",
      "to": "Profissional",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "field": "Consulta.profissionalId",
      "description": "Cada consulta é realizada por um profissional."
    },
    {
      "relationshipId": "pacienteContatos",
      "from": "Paciente",
      "to": "ContactChannel",
      "type": "oneToMany",
      "required": false,
      "mode": "mdmRelationship",
      "catalogType": "HasContact",
      "description": "Telefones, WhatsApp e e-mail do paciente."
    },
    {
      "relationshipId": "pacienteResponsavel",
      "from": "Person",
      "to": "Paciente",
      "type": "oneToMany",
      "required": false,
      "mode": "mdmRelationship",
      "catalogType": "GuardianOf",
      "roles": [
        "parent",
        "guardian"
      ],
      "description": "Responsável legal (Person) de um ou mais pacientes menores; obrigatório quando menor (regra menorExigeResponsavel)."
    },
    {
      "relationshipId": "pacienteContatoEmergencia",
      "from": "Paciente",
      "to": "Person",
      "type": "manyToMany",
      "required": false,
      "mode": "mdmRelationship",
      "catalogType": "Family",
      "roles": [
        "emergency"
      ],
      "description": "Pessoas a avisar em emergência."
    },
    {
      "relationshipId": "pacienteProfissionais",
      "from": "Paciente",
      "to": "Profissional",
      "type": "manyToMany",
      "required": false,
      "mode": "throughTable",
      "through": "Consulta",
      "path": "Consulta.pacienteId = Paciente.id → Consulta.profissionalId",
      "derived": true,
      "description": "Profissionais que atenderam o paciente (consultas attended)."
    },
    {
      "relationshipId": "profissionalPacientes",
      "from": "Profissional",
      "to": "Paciente",
      "type": "manyToMany",
      "required": false,
      "mode": "throughTable",
      "through": "Consulta",
      "path": "Consulta.profissionalId = Profissional.id → Consulta.pacienteId",
      "derived": true,
      "description": "Pacientes atendidos pelo profissional."
    }
  ]
} as const;

export default agendaClinicaOntologyIndex;
